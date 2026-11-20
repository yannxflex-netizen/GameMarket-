import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, updateProfile, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, collection, doc, query, orderBy, limit, where, onSnapshot,
  getDocs, getDoc, setDoc, updateDoc, writeBatch, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCypAzQ4cTYh3x8YphzOJ_7hHcBCA5TJHk",
  authDomain: "gamemarket-d4e87.firebaseapp.com",
  projectId: "gamemarket-d4e87",
  storageBucket: "gamemarket-d4e87.firebasestorage.app",
  messagingSenderId: "633768064403",
  appId: "1:633768064403:web:e4cf0ad992814572f6e466",
  measurementId: "G-SJBPLEBE9M"
};

// ⚠️ Mets ici TON email d'administrateur (celui de ton compte Google).
// Il doit être le même que dans les règles Firestore (fichier firestore.rules).
const ADMIN_EMAIL = "yannloba3@gmail.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = "fr";
const db = getFirestore(app);

const gm = { user: null, ready: false, configured: true, isAdmin: false };
window.gmAuth = gm;

gm.google = () => signInWithPopup(auth, new GoogleAuthProvider());
gm.login = (mail, pass) => signInWithEmailAndPassword(auth, mail, pass);
gm.signup = async (name, mail, pass) => {
  const c = await createUserWithEmailAndPassword(auth, mail, pass);
  if (name) await updateProfile(c.user, { displayName: name });
  return c;
};
gm.reset = mail => sendPasswordResetEmail(auth, mail);
gm.logout = () => signOut(auth);

onAuthStateChanged(auth, u => {
  gm.user = u;
  gm.ready = true;
  gm.isAdmin = !!ADMIN_EMAIL && !!u && u.emailVerified && u.email === ADMIN_EMAIL;
  document.dispatchEvent(new CustomEvent("gm-auth", { detail: u }));
});

/* ---------- Base de données ---------- */
const ads = collection(db, "ads");
const uid = () => auth.currentUser.uid;

window.gmDB = {
  // annonces en temps réel (les 80 plus récentes)
  watch(ok, ko) {
    return onSnapshot(
      query(ads, orderBy("createdAt", "desc"), limit(80)),
      s => ok(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      ko
    );
  },
  // photos complètes d'une annonce (chargées à l'ouverture)
  async pics(id) {
    const s = await getDocs(query(collection(db, "ads", id, "pics"), orderBy("i")));
    return s.docs.map(d => d.data().d);
  },
  // annonce + photos en une seule écriture.
  // Une annonce d'un client est « en attente » jusqu'à l'approbation de l'admin.
  async add(ad, pics) {
    const ref = doc(ads);
    const b = writeBatch(db);
    b.set(ref, {
      ...ad, uid: uid(), sold: false, rSum: 0, rCount: 0,
      status: gm.isAdmin ? "approved" : "pending",
      createdAt: serverTimestamp()
    });
    pics.forEach((d, i) => b.set(doc(db, "ads", ref.id, "pics", String(i)), { i, d }));
    await b.commit();
    return ref.id;
  },
  update: (id, data) => updateDoc(doc(db, "ads", id), data),
  async remove(id) {
    const s = await getDocs(collection(db, "ads", id, "pics"));
    const b = writeBatch(db);
    s.docs.forEach(d => b.delete(d.ref));
    b.delete(doc(db, "ads", id));
    await b.commit();
  },
  // une seule note par personne et par annonce
  async myRate(id) {
    const s = await getDoc(doc(db, "ads", id, "ratings", uid()));
    return s.exists() ? s.data().n : 0;
  },
  async rate(id, n) {
    const b = writeBatch(db);
    b.set(doc(db, "ads", id, "ratings", uid()), { n });
    b.update(doc(db, "ads", id), { rSum: increment(n), rCount: increment(1) });
    await b.commit();
  },
  report: (id, reason, detail) => setDoc(doc(db, "reports", id + "_" + uid()), { adId: id, uid: uid(), reason: reason || "", detail: detail || "", at: serverTimestamp() }),

  /* ----- Administration (réservé à l'admin par les règles Firestore) ----- */
  async reports() {
    const s = await getDocs(collection(db, "reports"));
    return s.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  // efface tous les signalements d'une annonce
  async dismiss(adId) {
    const s = await getDocs(query(collection(db, "reports"), where("adId", "==", adId)));
    const b = writeBatch(db);
    s.docs.forEach(d => b.delete(d.ref));
    await b.commit();
  }
};
