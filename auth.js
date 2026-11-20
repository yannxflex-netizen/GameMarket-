const $ = s => document.querySelector(s);
let mode = "login";

const ERR = {
  "auth/invalid-credential": "Email ou mot de passe incorrect.",
  "auth/wrong-password": "Email ou mot de passe incorrect.",
  "auth/user-not-found": "Email ou mot de passe incorrect.",
  "auth/email-already-in-use": "Cet email a déjà un compte. Connectez-vous.",
  "auth/weak-password": "Mot de passe trop court : 6 caractères minimum.",
  "auth/invalid-email": "Adresse email invalide.",
  "auth/missing-password": "Entrez votre mot de passe.",
  "auth/popup-closed-by-user": "Connexion Google annulée.",
  "auth/popup-blocked": "Le navigateur a bloqué la fenêtre Google. Autorisez-la et réessayez.",
  "auth/too-many-requests": "Trop d’essais. Réessayez dans quelques minutes.",
  "auth/network-request-failed": "Pas de connexion internet.",
  "auth/unauthorized-domain": "Ce domaine n’est pas autorisé dans Firebase (Authentication > Paramètres).",
  default: "Une erreur est survenue. Réessayez."
};

function msg(text, ok) {
  const m = $("#aMsg");
  m.textContent = text || "";
  m.hidden = !text;
  m.className = "amsg" + (ok ? " ok" : "");
}

function busy(on) {
  document.querySelectorAll(".auth-card button").forEach(b => (b.disabled = on));
}

function setMode(m) {
  mode = m;
  const s = m === "signup";
  $("#aTitle").textContent = s ? "Créer un compte" : "Connexion";
  $("#aSub").textContent = s
    ? "Un compte gratuit pour publier et gérer vos annonces."
    : "Connectez-vous pour publier et gérer vos annonces.";
  $("#fName").hidden = !s;
  $("#aGo").textContent = s ? "Créer mon compte" : "Se connecter";
  $("#aForgot").hidden = s;
  $("#aSwitchTxt").textContent = s ? "Déjà un compte ?" : "Pas encore de compte ?";
  $("#aSwitch").textContent = s ? "Se connecter" : "Créer un compte";
  $("#aPass").autocomplete = s ? "new-password" : "current-password";
  msg("");
}

function api() {
  if (!window.gmAuth || !gmAuth.configured) {
    msg("Firebase n’est pas encore configuré. Ajoutez vos clés dans firebase.js.");
    return null;
  }
  return gmAuth;
}

async function run(fn) {
  const a = api();
  if (!a) return;
  msg("");
  busy(true);
  try {
    await fn(a);
    location.href = "index.html";
  } catch (e) {
    msg(ERR[e.code] || ERR.default);
    busy(false);
  }
}

$("#gBtn").onclick = () => run(a => a.google());

$("#aForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("#aName").value.trim(), mail = $("#aMail").value.trim(), pass = $("#aPass").value;
  if (!mail || !pass) return msg("Entrez votre email et votre mot de passe.");
  if (mode === "signup" && !name) return msg("Choisissez un pseudo.");
  run(a => (mode === "signup" ? a.signup(name, mail, pass) : a.login(mail, pass)));
});

$("#aForgot").onclick = async () => {
  const a = api();
  if (!a) return;
  const mail = $("#aMail").value.trim();
  if (!mail) return msg("Entrez votre email puis cliquez sur « Mot de passe oublié ».");
  busy(true);
  try {
    await a.reset(mail);
    msg("Email envoyé. Vérifiez votre boîte de réception et vos spams.", true);
  } catch (e) {
    msg(ERR[e.code] || ERR.default);
  }
  busy(false);
};

$("#aSwitch").onclick = () => setMode(mode === "login" ? "signup" : "login");

document.addEventListener("gm-auth", e => {
  if (e.detail) location.href = "index.html";
});