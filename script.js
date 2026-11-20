const ADMIN_PHONE = "2250759779178";
const WA_GROUP = "https://chat.whatsapp.com/Kb89Biufbg76DuNm2ml5Mj";
const WA_HELLO = "Bonjour Yanox, j'ai besoin de poster mon compte, mais comment m'y prendre sur ton site ?";
const $ = s => document.querySelector(s);
const fmt = n => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
/* Images : seules de vraies images « data: » sont acceptées (évite toute injection de code) */
const safeImg = s => (typeof s === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(s)) ? s : "";
/* Lien WhatsApp (phone vide = l'utilisateur choisit le contact) */
const waUrl = (text, phone = ADMIN_PHONE) => "https://wa.me/" + phone + (text ? "?text=" + encodeURIComponent(text) : "");
if (!/^\d{8,15}$/.test(ADMIN_PHONE)) console.error("ADMIN_PHONE invalide : chiffres seulement, avec l'indicatif pays.");
/* Erreurs : jamais d'échec silencieux */
window.addEventListener("error", e => console.error(e.error || e.message));
window.addEventListener("unhandledrejection", e => {
  console.error(e.reason);
  if (e.reason?.name !== "AbortError") toast("Une erreur est survenue. Réessayez.");
});
window.addEventListener("offline", () => toast("Pas de connexion internet.", 5000));
window.addEventListener("online", () => toast("Connexion rétablie."));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const GC = { "Free Fire": ["#e8590c", "#6b1a00"], "eFootball": ["#0ea5e9", "#0b2a5a"], "Blood Strike": ["#c1121f", "#2a0206"], "Autre": ["#2b3a6e", "#142046"] };
const bg = g => { const c = GC[g] || GC.Autre; return `background:linear-gradient(135deg,${c[0]},${c[1]})`; };
const avg = a => (a.rCount ? a.rSum / a.rCount : 0);
const ts = a => a.createdAt?.toMillis?.() ?? Date.now();
const starsOf = v => "★".repeat(Math.round(v)) + "☆".repeat(5 - Math.round(v));
const mine = a => !!me && (a.uid === me.uid || gmAuth.isAdmin);
/* Ligne « Jeu · Niveau · Rang » (pas de niveau pour eFootball) */
const metaOf = a => esc(a.game) + (a.game === "eFootball" ? "" : " · Niveau " + esc(a.lvl)) + (a.rank ? " · " + esc(a.rank) : "");

/* Statut d'une annonce : en attente d'approbation, approuvée (ou ancienne annonce sans statut), refusée */
const stOf = a => a.status || "approved";
const tagOf = a => stOf(a) === "pending" ? ["wait", "En attente"] : stOf(a) === "rejected" ? ["sold", "Refusée"]
  : a.sold ? ["sold", "Vendu"] : a.type === "vente" ? ["", "À vendre"] : ["ex", "Échange"];
/* Ce que le client voit sur SES annonces : en attente, validée ou refusée */
const ownTag = a => (!me || a.uid !== me.uid || !a.status) ? "" :
  `<div class="own ${a.status}">${a.status === "pending" ? "⏳ En attente de validation" : a.status === "approved" ? "✓ Validée par l’admin" : "✕ Refusée par l’admin"}</div>`;

/* Quand l'admin valide ou refuse une annonce, le client est prévenu (une seule fois) */
function notifyOwner(list) {
  if (!me || window.gmAuth?.isAdmin) return;
  const key = "gm-seen-" + me.uid;
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) { seen = {}; }
  const msgs = [];
  list.filter(a => a.uid === me.uid && a.status).forEach(a => {
    if (seen[a.id] !== a.status) {
      if (a.status === "approved") msgs.push(`Votre annonce « ${a.title} » a été validée ✓`);
      if (a.status === "rejected") msgs.push(`Votre annonce « ${a.title} » a été refusée`);
      seen[a.id] = a.status;
    }
  });
  try { localStorage.setItem(key, JSON.stringify(seen)); } catch (e) { /* stockage indisponible */ }
  if (msgs.length) toast(msgs[0] + (msgs.length > 1 ? ` (+${msgs.length - 1} autre${msgs.length > 2 ? "s" : ""})` : ""), 7000);
}

/* Visible par tous si approuvée ; l'auteur voit les siennes, l'admin voit tout */
const visible = a => stOf(a) === "approved" || (!!me && a.uid === me.uid) || !!window.gmAuth?.isAdmin;

/* Règles de photos par jeu */
const RULES = {
  "Free Fire": { min: 5, max: 8 },
  "Blood Strike": { min: 5, max: 8 },
  "eFootball": { min: 1, max: 3 }
};

/* Photo d'en-tête : bannière d'accueil, ou affiche du jeu choisi */
const HERO = "hero.jpg";
const COVERS = { "Free Fire": "cover-freefire.jpg", "eFootball": "cover-efootball.jpg", "Blood Strike": "cover-bloodstrike.jpg" };
const hbg = document.createElement("div");
hbg.className = "hbg"; hbg.setAttribute("aria-hidden", "true"); hbg.innerHTML = "<div></div><div></div>";
document.querySelector("header").prepend(hbg);
let hl = 0;
function setHero(src) {
  const next = hbg.children[hl ^ 1], prev = hbg.children[hl];
  next.style.backgroundImage = `url(${src})`;
  next.classList.toggle("ban", src === HERO);
  next.classList.add("on"); prev.classList.remove("on");
  hl ^= 1;
  document.querySelector("header").classList.toggle("is-ban", src === HERO);
}
setHero(HERO);
window.addEventListener("load", () => Object.values(COVERS).forEach(s => { new Image().src = s; }));

let ads = [], tab = "", imgs = [], me = null, loaded = false, failed = "", started = false, cur = null;

/* Onglet « Mes annonces » : le client suit ses annonces (en attente, validées…) */
const mineTab = document.createElement("button");
mineTab.className = "tab"; mineTab.dataset.t = "mine"; mineTab.type = "button";
mineTab.setAttribute("aria-pressed", "false"); mineTab.textContent = "Mes annonces"; mineTab.hidden = true;
document.querySelector(".tabs").append(mineTab);

/* Finitions : icône d'onglet, couleur de la barre du navigateur, description */
(() => {
  const add = (tag, attrs) => { const el = document.createElement(tag); Object.assign(el, attrs); document.head.append(el); };
  if (!document.querySelector("link[rel~=icon]")) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='#142046'/><text x='32' y='44' font-size='32' font-weight='800' text-anchor='middle' fill='#e8590c' font-family='Arial,sans-serif'>GM</text></svg>`;
    add("link", { rel: "icon", href: "data:image/svg+xml," + encodeURIComponent(svg) });
  }
  if (!document.querySelector("meta[name=theme-color]")) add("meta", { name: "theme-color", content: "#142046" });
  if (!document.querySelector("meta[name=description]")) add("meta", { name: "description", content: "GameMarket : achetez, vendez ou échangez des comptes Free Fire, eFootball et Blood Strike. Annonces validées avec vraies captures d’écran." });
})();

/* Bandeau de confiance au-dessus de la recherche */
const stats = document.createElement("div");
stats.className = "stats"; stats.hidden = true;
document.querySelector(".tools").before(stats);

/* Conditions d'utilisation (lien dans le pied de page) */
const dT = document.createElement("dialog");
dT.innerHTML = `<div class="dh"><h2>Conditions et sécurité</h2><button class="x" type="button" data-close aria-label="Fermer">×</button></div>
  <div class="db terms">
    <h3>Le rôle de GameMarket</h3><p>GameMarket met en relation des acheteurs et des vendeurs de comptes de jeux. Le site ne possède pas les comptes et n’est affilié à aucun éditeur (Garena, Konami, NetEase).</p>
    <h3>Annonces validées</h3><p>Chaque annonce est vérifiée par l’administrateur avant d’être publiée, sous 24 h. Une annonce douteuse, en double ou signalée peut être refusée ou supprimée.</p>
    <h3>Ce qui est interdit</h3><p>Publier ses identifiants, utiliser des captures volées, donner de fausses informations ou tenter d’arnaquer un acheteur.</p>
    <h3>Vos données</h3><p>Votre email sert uniquement à vous connecter et n’est jamais affiché. Seuls votre pseudo, vos captures et la description de votre annonce sont visibles. Pour supprimer votre compte ou vos annonces, écrivez-nous sur WhatsApp.</p>
    <h3>Acheter en sécurité</h3><p>Vérifiez les captures, ne payez jamais avant d’avoir testé le compte, payez uniquement sur WhatsApp et changez tous les accès juste après l’achat.</p>
    <h3>Un risque à connaître</h3><p>La plupart des éditeurs interdisent la vente de comptes. Chaque utilisateur agit sous sa propre responsabilité.</p>
    <h3>Un problème ?</h3><p>Utilisez le bouton « Signaler cette annonce », ou écrivez au service client sur WhatsApp.</p>
  </div>`;
document.body.append(dT);
const termsBtn = document.createElement("button");
termsBtn.className = "flink"; termsBtn.type = "button"; termsBtn.textContent = "Conditions et sécurité";
termsBtn.onclick = () => dT.showModal();
document.querySelector("#toTop").before(termsBtn);

/* Section « Pourquoi nous faire confiance » sous la liste des annonces */
(() => {
  const I = {
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    headset: '<path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
    zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
  };
  const items = [
    ["shield", "Paiement sécurisé", "Les paiements se font uniquement sur WhatsApp, pour plus de fiabilité."],
    ["headset", "Assistance client", "Une question ou un souci ? Le service client vous répond sur WhatsApp."],
    ["check", "Vérification des comptes", "Chaque annonce est contrôlée par l’administrateur avant d’être publiée."],
    ["zap", "Livraison rapide", "Accès remis rapidement, lorsque l’annonce le garantit."],
    ["star", "Avis clients authentiques", "Seuls les clients connectés peuvent noter, une seule fois par annonce."]
  ];
  const sec = document.createElement("section");
  sec.className = "trust";
  sec.setAttribute("aria-labelledby", "trustT");
  sec.innerHTML = `<h2 id="trustT">Pourquoi nous faire confiance ?</h2><div class="trust-grid">${items.map(([ic, t, d]) =>
    `<div class="trust-item"><div class="trust-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${I[ic]}</svg></div><div><strong>${t}</strong><span>${d}</span></div></div>`).join("")}</div>`;
  document.querySelector("#list").after(sec);
})();

function toast(m, ms = 2800) {
  const t = document.createElement("div");
  t.className = "toast"; t.setAttribute("role", "status"); t.textContent = m;
  document.body.append(t); setTimeout(() => t.remove(), ms);
}

/* Styles ajoutés par le script : formulaire sans débordement, retrait de photo, visionneuse */
const st = document.createElement("style");
st.textContent = `
.db{grid-template-columns:minmax(0,1fr)}
.row{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.f{min-width:0}
.prev{padding-top:6px}
.pv{position:relative}
.pvx{position:absolute;top:-6px;right:-6px;width:24px;height:24px;border-radius:50%;border:0;background:#c1121f;color:#fff;font-size:1rem;line-height:1;cursor:pointer;display:grid;place-items:center;padding:0}
.gal img{cursor:zoom-in}
dialog.lb{width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;border-radius:0;background:#000;color:#fff;margin:0;overflow:hidden}
dialog.lb[open]{display:flex;flex-direction:column}
.lb-top{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;font-weight:700}
.lb-x{border:0;background:none;color:#fff;font-size:2.2rem;line-height:1;cursor:pointer;padding:4px 10px}
.lb-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;touch-action:pan-y}
.lb-stage img{max-width:100%;max-height:100%;object-fit:contain}
.lb-nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:64px;border:0;background:rgba(255,255,255,.18);color:#fff;font-size:2.2rem;cursor:pointer;border-radius:8px}
.lb-prev{left:8px}.lb-next{right:8px}
.tag.wait{background:#b7791f}
.own{align-self:flex-start;font-size:.8rem;font-weight:700;border-radius:6px;padding:3px 8px;margin-top:4px}
.own.pending{background:#fff4e8;color:#9a5b00}
.own.approved{background:#e8f6ef;color:#14583a}
.own.rejected{background:#fdecec;color:#8a1f1f}
.reasons{display:grid;gap:8px}
.sk{pointer-events:none;cursor:default}
.sk .thumb{background:linear-gradient(90deg,#e6e9f2 25%,#f3f5fa 50%,#e6e9f2 75%);background-size:200% 100%;animation:shine 1.3s linear infinite}
.sk i{display:block;height:12px;border-radius:6px;background:#e6e9f2;margin-top:6px}
.sk i:nth-child(1){width:80%;height:16px}.sk i:nth-child(2){width:55%}.sk i:nth-child(3){width:35%}
@keyframes shine{to{background-position:-200% 0}}
.stats{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 20px;font-size:.88rem;color:var(--mut);margin-bottom:14px}
.stats b{color:var(--ink);font-size:1.05rem}
.terms h3{font-size:.95rem;margin-top:4px}
.terms p{font-size:.9rem;color:var(--mut)}
.trust{margin-top:34px}
.trust h2{font-size:1.25rem;letter-spacing:-.02em;margin-bottom:12px}
.trust-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.trust-item{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:14px;display:flex;gap:12px;align-items:flex-start}
.trust-ico{flex:none;width:40px;height:40px;border-radius:10px;background:#fff4e8;color:var(--fire);display:grid;place-items:center}
.trust-ico svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.trust-item strong{display:block;font-size:.95rem}
.trust-item span{display:block;color:var(--mut);font-size:.85rem;line-height:1.4;margin-top:2px}
.rsn{border:1.5px solid var(--line);border-radius:8px;padding:11px 12px;font-weight:600;cursor:pointer}
.rsn input{display:none}
.rsn:has(input:checked){border-color:var(--fire);background:#fff4e8;color:var(--fire)}
.card.is-wait{opacity:.85}
html{-webkit-tap-highlight-color:transparent}
button,.btn,.tab,.card,select,summary{touch-action:manipulation}
body:has(dialog[open]){overflow:hidden}
dialog{overscroll-behavior:contain}
.toast{bottom:calc(22px + env(safe-area-inset-bottom,0px))}
.adminfab{position:fixed;right:14px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:60;box-shadow:0 6px 18px rgba(0,0,0,.35)}
.atab{border:1px solid var(--line);background:#fff;border-radius:99px;padding:7px 14px;font-weight:600;cursor:pointer}
.atab[aria-pressed=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
#aList{display:grid;gap:10px}
.arow{display:grid;grid-template-columns:64px minmax(0,1fr);gap:10px;border:1px solid var(--line);border-radius:10px;padding:10px;background:#fff}
.arow img,.arow .ph{width:64px;height:64px;border-radius:8px;object-fit:cover;background:var(--ink2)}
.arow h4{font-size:.95rem;line-height:1.3}
.acts2{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.acts2 .btn{padding:7px 12px;font-size:.85rem}
.btn.red{background:#c1121f}
.agrp{display:grid;gap:8px;border:1.5px dashed var(--line);border-radius:12px;padding:8px}
.abadge{display:inline-block;background:#fdecec;color:#8a1f1f;border-radius:99px;padding:1px 8px;font-size:.78rem;font-weight:700}
`;
document.head.append(st);

/* Visionneuse : toucher une photo de l'annonce l'ouvre en grand, on passe de l'une à l'autre */
const lb = document.createElement("dialog");
lb.className = "lb";
lb.innerHTML = `<div class="lb-top"><span id="lbN"></span><button class="lb-x" type="button" aria-label="Fermer">×</button></div>
  <div class="lb-stage"><img id="lbImg" alt="Capture du compte"></div>
  <button class="lb-nav lb-prev" type="button" aria-label="Photo précédente">‹</button>
  <button class="lb-nav lb-next" type="button" aria-label="Photo suivante">›</button>`;
document.body.append(lb);
let lbList = [], lbI = 0, lbX = null;
function lbShow(i) {
  lbI = (i + lbList.length) % lbList.length;
  lb.querySelector("#lbImg").src = lbList[lbI];
  lb.querySelector("#lbN").textContent = `${lbI + 1} / ${lbList.length}`;
}
function lbOpen(list, i) {
  lbList = list; lbShow(i);
  lb.querySelectorAll(".lb-nav").forEach(b => { b.hidden = list.length < 2; });
  lb.showModal();
}
lb.querySelector(".lb-x").onclick = () => lb.close();
lb.querySelector(".lb-prev").onclick = () => lbShow(lbI - 1);
lb.querySelector(".lb-next").onclick = () => lbShow(lbI + 1);
lb.addEventListener("click", e => { if (e.target === lb || e.target.classList.contains("lb-stage")) lb.close(); });
lb.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") lbShow(lbI - 1);
  if (e.key === "ArrowRight") lbShow(lbI + 1);
});
lb.addEventListener("touchstart", e => { lbX = e.touches[0].clientX; }, { passive: true });
lb.addEventListener("touchend", e => {
  if (lbX === null || lbList.length < 2) return;
  const dx = e.changedTouches[0].clientX - lbX; lbX = null;
  if (Math.abs(dx) > 50) lbShow(lbI + (dx < 0 ? 1 : -1));
}, { passive: true });

function emptyMsg() {
  if (!loaded) return "Chargement des annonces…";
  if (tab === "mine" && loaded && !failed) return "Vous n’avez pas encore publié d’annonce.";
  if (failed) return `Impossible de charger les annonces (${esc(failed)}). Vérifiez que Firestore est créé et que les règles sont publiées.`;
  return ads.length ? "Aucune annonce ne correspond. Modifiez vos filtres." : "Aucune annonce pour le moment. Soyez le premier à publier !";
}

function card(a) {
  const pic = safeImg(a.thumb) || COVERS[a.game];
  return `
  <button class="card${a.sold || stOf(a) === "rejected" ? " is-sold" : stOf(a) === "pending" ? " is-wait" : ""}" data-id="${a.id}">
    <div class="thumb"${pic ? "" : ` style="${bg(a.game)}"`}>${pic ? `<img src="${pic}" alt="" loading="lazy" decoding="async">` : esc(a.game)}<span class="tag ${tagOf(a)[0]}">${tagOf(a)[1]}</span></div>
    <div class="cb"><h3>${esc(a.title)}</h3>
      <div class="meta">${metaOf(a)}</div>
      <div class="meta"><span class="stars">${starsOf(avg(a))}</span> ${a.rCount ? avg(a).toFixed(1) + " (" + a.rCount + ")" : "Pas encore noté"}</div>
      ${ownTag(a)}<div class="price">${a.type === "vente" ? fmt(a.price) : "Échange"}</div></div>
  </button>`;
}

function render() {
  if (!loaded) {
    $("#list").innerHTML = Array(6).fill(`<div class="card sk" aria-hidden="true"><div class="thumb"></div><div class="cb"><i></i><i></i><i></i></div></div>`).join("");
    return;
  }
  const q = $("#q").value.trim().toLowerCase(), g = $("#game").value, lv = +$("#lvl").value, so = $("#sort").value;
  const r = ads.filter(a => visible(a) && (!tab || (tab === "mine" ? !!me && a.uid === me.uid : a.type === tab)) && (!g || a.game === g) && a.lvl >= lv &&
    (!q || (a.title + " " + a.desc + " " + a.rank + " " + a.game).toLowerCase().includes(q)));
  r.sort((a, b) => so === "pa" ? a.price - b.price : so === "pd" ? b.price - a.price : so === "note" ? avg(b) - avg(a) : ts(b) - ts(a));
  $("#list").innerHTML = r.length ? r.map(card).join("") : `<div class="empty" style="grid-column:1/-1">${emptyMsg()}</div>`;
  const ok = ads.filter(a => stOf(a) === "approved");
  stats.hidden = failed || !ok.length;
  stats.innerHTML = `<span><b>${ok.filter(a => !a.sold).length}</b> annonces actives</span><span><b>${ok.filter(a => a.sold).length}</b> comptes vendus</span><span>✓ Annonces validées</span>`;
}

async function openAd(id) {
  const a = ads.find(x => x.id === id);
  if (!a) return;
  cur = id;
  $("#vTitle").textContent = a.title;
  draw(a, null, null);
  if (!$("#dView").open) $("#dView").showModal();
  try {
    const [pics, my] = await Promise.all([gmDB.pics(id), me ? gmDB.myRate(id) : 0]);
    if (cur === id) draw(ads.find(x => x.id === id) || a, pics, my);
  } catch (e) { /* on garde l'aperçu */ }
}

function draw(a, pics, my) {
  const shots = (pics && pics.length ? pics : a.thumb ? [a.thumb] : []).map(safeImg).filter(Boolean);
  const wa = waUrl(`Bonjour, je suis intéressé par l'annonce « ${a.title} » (réf. ${a.id.slice(0, 6)}) sur GameMarket.`);
  const rate = !me ? `<p class="sm">Connectez-vous pour noter ce compte.</p>`
    : my === null ? ""
    : my ? `<p class="sm">Votre note : <span class="stars">${starsOf(my)}</span></p>`
    : `<p class="sm" style="margin-bottom:4px">Noter ce compte :</p><div class="rate" role="group" aria-label="Note">${[1, 2, 3, 4, 5].map(n => `<button data-n="${n}" aria-label="${n} sur 5">★</button>`).join("")}</div>`;
  $("#vBody").innerHTML = `
    ${shots.length ? `<div class="gal">${shots.map(s => `<img src="${s}" alt="Capture du compte" decoding="async">`).join("")}</div>` : `<div class="thumb" style="border-radius:8px;${bg(a.game)}">${esc(a.game)}</div>`}
    <div><span class="tag ${tagOf(a)[0]}" style="position:static;display:inline-block">${tagOf(a)[1]}</span></div>
    <div class="price" style="padding:0">${a.type === "vente" ? fmt(a.price) : "Contre : " + esc(a.swap || "à discuter")}</div>
    <div class="meta">${metaOf(a)} · Publié par ${esc(a.name)}</div>
    <p>${esc(a.desc).replace(/\n/g, "<br>")}</p>
    <div class="stars">${starsOf(avg(a))} <span class="sm">${a.rCount ? avg(a).toFixed(1) + "/5 · " + a.rCount + " avis" : "Pas encore noté"}</span></div>
    <div>${rate}</div>
    <a class="btn ok" target="_blank" rel="noopener" href="${wa}">Contacter sur WhatsApp</a>
    ${stOf(a) === "approved" ? `<button class="btn alt" id="shr" type="button">Partager cette annonce</button>` : ""}
    ${me && a.uid === me.uid && a.status === "approved" ? `<div class="amsg ok">✓ Votre annonce a été validée par l’administrateur. Elle est visible par tous les clients.</div>` : ""}
    ${stOf(a) !== "approved" ? `<div class="notice" style="margin:0">${stOf(a) === "pending" ? "Cette annonce est en attente de validation (sous 24 h). Les autres clients ne la voient pas encore." : "Cette annonce a été refusée par l’administrateur."}</div>` : ""}
    ${window.gmAuth?.isAdmin && stOf(a) !== "approved" ? `<button class="btn ok" id="appr">Approuver cette annonce</button>` : ""}
    ${window.gmAuth?.isAdmin && stOf(a) === "pending" ? `<button class="btn alt" id="refu">Refuser cette annonce</button>` : ""}
    ${mine(a) ? `<button class="btn alt" id="sold">${a.sold ? "Remettre en vente" : "Marquer comme vendu"}</button><button class="btn alt" id="del">Supprimer cette annonce</button>` : ""}
    <button class="btn alt" id="rep">Signaler cette annonce</button>`;

  $("#vBody").querySelectorAll(".gal img").forEach((im, i) => { im.onclick = () => lbOpen(shots, i); });
  $("#vBody").querySelectorAll(".rate button").forEach(b => b.onclick = async () => {
    const n = +b.dataset.n;
    try {
      await gmDB.rate(a.id, n);
      toast("Merci pour votre note");
      if (cur === a.id) draw(ads.find(x => x.id === a.id) || a, pics, n);
    } catch (e) { toast("Note refusée."); }
  });
  $("#rep").onclick = () => {
    if (!me) { location.href = "login.html"; return; }
    openReport(a.id, () => { $("#rep").disabled = true; });
  };
  if ($("#shr")) $("#shr").onclick = async () => {
    const url = location.origin + location.pathname + "?ad=" + a.id;
    const text = `${a.title} · ${a.type === "vente" ? fmt(a.price) : "Échange"} sur GameMarket`;
    try {
      if (navigator.share) await navigator.share({ title: a.title, text, url });
      else window.open(waUrl(text + "\n" + url, ""), "_blank", "noopener");
    } catch (e) { /* partage annulé */ }
  };
  const setStatus = (status, msg) => async () => {
    try { await gmDB.update(a.id, { status }); toast(msg); if (cur === a.id) draw({ ...a, status }, pics, my); }
    catch (e) { toast("Action refusée."); }
  };
  if ($("#appr")) $("#appr").onclick = setStatus("approved", "Annonce approuvée");
  if ($("#refu")) $("#refu").onclick = setStatus("rejected", "Annonce refusée");
  if ($("#sold")) $("#sold").onclick = async () => {
    try { await gmDB.update(a.id, { sold: !a.sold }); toast(a.sold ? "Remise en vente" : "Marquée comme vendue"); if (cur === a.id) draw(ads.find(x => x.id === a.id) || a, pics, my); }
    catch (e) { toast("Action refusée."); }
  };
  if ($("#del")) $("#del").onclick = async () => {
    if (!confirm("Supprimer cette annonce ?")) return;
    try { await gmDB.remove(a.id); $("#dView").close(); toast("Annonce supprimée"); }
    catch (e) { toast("Suppression refusée."); }
  };
}
/* ---------- Publication ---------- */

/* Formulaire : les champs changent selon le jeu choisi (data-g = jeux concernés) */
$("#dPost .db").innerHTML = `
  <div class="seg" role="radiogroup" aria-label="Type d’annonce">
    <label><input type="radio" name="type" value="vente" checked>À vendre</label>
    <label><input type="radio" name="type" value="echange">À échanger</label>
  </div>
  <label class="f"><span>Jeu</span><select id="pGame"><option>Free Fire</option><option>eFootball</option><option>Blood Strike</option></select></label>

  <div class="row">
    <label class="f" data-g="Free Fire,Blood Strike"><span>Niveau du compte</span><input id="pLvl" type="number" inputmode="numeric" min="1" max="100" placeholder="72"></label>
    <label class="f" data-g="Free Fire,Blood Strike"><span>Liaison du compte</span>
      <select id="pLink"><option>Facebook</option><option>Google</option><option>Apple</option><option>Twitter (X)</option><option>VK</option><option>Huawei</option><option>Autre</option></select></label>
  </div>
  <div class="row">
    <label class="f" data-g="Free Fire,Blood Strike"><span>Nombre de skins</span><input id="pSkins" type="number" inputmode="numeric" min="0" placeholder="12"></label>
    <label class="f" data-g="Free Fire"><span>Nombre de primes</span><input id="pPrimes" type="number" inputmode="numeric" min="0" placeholder="3"></label>
  </div>

  <div class="row">
    <label class="f" data-g="eFootball"><span>Joueurs dans l’effectif</span><input id="pSquad" type="number" inputmode="numeric" min="1" placeholder="40"></label>
    <label class="f" data-g="eFootball"><span>Note du meilleur joueur</span><input id="pOvr" type="number" inputmode="numeric" min="1" max="130" placeholder="99"></label>
  </div>
  <label class="f" data-g="eFootball"><span>Meilleur joueur</span><input id="pStar" maxlength="40" placeholder="Ex. Messi"></label>

  <label class="f" id="fPrice"><span>Prix (FCFA)</span><input id="pPrice" type="number" inputmode="numeric" min="0" step="500" placeholder="25000"></label>
  <label class="f" id="fSwap" hidden><span>Échange contre</span><input id="pSwap" maxlength="80" placeholder="Ex. Compte niveau 60+ avec Elite Pass"></label>
  <label class="f"><span>Détails en plus (facultatif)</span><textarea id="pDesc" rows="3" maxlength="600" placeholder="Armes, personnages, diamants, autres infos…"></textarea></label>
  <label class="f"><span id="pHint">Captures d’écran</span><input id="pImgs" type="file" accept="image/*" multiple></label>
  <div class="prev" id="prev"></div>
  <label class="f"><span>Votre pseudo</span><input id="pName" maxlength="30" placeholder="Pseudo affiché"></label>
  <p class="sm">Ne publiez jamais vos identifiants. Seules les captures et la description sont affichées.</p>
  <button class="btn" id="send">Publier l’annonce</button>`;

function syncForm() {
  const g = $("#pGame").value, ex = document.querySelector("[name=type]:checked").value === "echange", R = RULES[g];
  document.querySelectorAll("#dPost [data-g]").forEach(el => { el.hidden = !el.dataset.g.split(",").includes(g); });
  $("#fPrice").hidden = ex; $("#fSwap").hidden = !ex;
  if (imgs.length > R.max) imgs = imgs.slice(0, R.max);
  showPrev();
}

/* Aperçu des photos ajoutées, chacune avec sa croix pour la retirer */
function showPrev() {
  const R = RULES[$("#pGame").value];
  $("#pHint").textContent = (R.min === 1 ? `Captures d’écran (de 1 à ${R.max})` : `Captures d’écran (${R.min} minimum, ${R.max} maximum)`)
    + (imgs.length ? ` · ${imgs.length} ajoutée${imgs.length > 1 ? "s" : ""}` : "");
  $("#prev").innerHTML = imgs.map((i, n) => `<div class="pv"><img src="${i.thumb}" alt="Photo ${n + 1}"><button type="button" class="pvx" data-n="${n}" aria-label="Retirer la photo ${n + 1}">×</button></div>`).join("");
}
$("#prev").onclick = e => {
  const b = e.target.closest(".pvx");
  if (!b) return;
  imgs.splice(+b.dataset.n, 1);
  showPrev();
};

const WEBP = (() => { try { return document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp"); } catch (e) { return false; } })();
function shrink(file) {
  return new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const draw = (m, q) => {
          const k = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement("canvas");
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
          return c.toDataURL(WEBP ? "image/webp" : "image/jpeg", q);
        };
        const fit = (m, q, max) => { let r = draw(m, q); while (r.length > max && q > .3) { q -= .08; m = Math.round(m * .9); r = draw(m, q); } return r; };
        res({ full: fit(800, .68, 300000), thumb: fit(360, .6, 28000) });
      };
      im.onerror = () => res(null); im.src = fr.result;
    };
    fr.onerror = () => res(null); fr.readAsDataURL(file);
  });
}

$("#pImgs").onchange = async e => {
  const max = RULES[$("#pGame").value].max, room = Math.max(0, max - imgs.length);
  const files = [...e.target.files];
  if (files.length > room) toast(`Maximum ${max} photos.`);
  const add = (await Promise.all(files.slice(0, room).map(shrink))).filter(Boolean);
  imgs = imgs.concat(add);   /* on ajoute aux photos déjà choisies */
  e.target.value = "";
  showPrev();
};
document.querySelectorAll("[name=type]").forEach(r => r.onchange = syncForm);
$("#pGame").onchange = syncForm;
syncForm();

const dOk = document.createElement("dialog");
dOk.innerHTML = `<div class="dh"><h2>Annonce envoyée ✓</h2><button class="x" type="button" data-close aria-label="Fermer">×</button></div>
  <div class="db">
    <p>Votre annonce est <strong>en attente de validation</strong> (sous 24 h). Vous la retrouvez dans l’onglet « Mes annonces ».</p>
    <p class="sm">Pour aller plus vite, prévenez l’administrateur sur WhatsApp.</p>
    <a class="btn ok" id="okWa" target="_blank" rel="noopener"><svg class="wa" aria-hidden="true"><use href="#i-wa"/></svg>Prévenir l’admin sur WhatsApp</a>
    <button class="btn alt" type="button" data-close>Plus tard</button>
  </div>`;
document.body.append(dOk);

$("#send").onclick = async () => {
  if (!me) { location.href = "login.html"; return; }
  const type = document.querySelector("[name=type]:checked").value;
  const g = $("#pGame").value, R = RULES[g], isEf = g === "eFootball";
  const name = $("#pName").value.trim(), price = +$("#pPrice").value;
  const empty = s => $(s).value.trim() === "";
  if (!name) return toast("Indiquez votre pseudo.");

  let lvl = 1, rank = "";
  const L = [];
  if (isEf) {
    if (empty("#pSquad") || empty("#pStar") || empty("#pOvr")) return toast("Indiquez le nombre de joueurs, votre meilleur joueur et sa note.");
    const n = $("#pStar").value.trim(), o = +$("#pOvr").value;
    rank = n + " " + o;
    L.push(`Effectif : ${+$("#pSquad").value} joueurs`, `Meilleur joueur : ${n} (note ${o})`);
  } else {
    lvl = +$("#pLvl").value;
    if (!lvl || lvl < 1 || lvl > 100) return toast("Le niveau doit être entre 1 et 100.");
    if (empty("#pSkins")) return toast("Indiquez le nombre de skins.");
    L.push(`Liaison : ${$("#pLink").value}`, `Skins : ${+$("#pSkins").value}`);
    if (g === "Free Fire") {
      if (empty("#pPrimes")) return toast("Indiquez le nombre de primes.");
      L.push(`Primes : ${+$("#pPrimes").value}`);
    }
  }
  if (type === "vente" && !price) return toast("Indiquez un prix en FCFA.");
  if (imgs.length < R.min) return toast(R.min === 1 ? "Ajoutez au moins une capture d’écran." : `Ajoutez au moins ${R.min} captures d’écran (${imgs.length} pour le moment).`);

  /* Titre automatique : plus besoin de le saisir */
  const title = isEf ? `Compte eFootball · ${rank}` : `Compte ${g} niveau ${lvl}`;
  const extra = $("#pDesc").value.trim();
  const desc = L.join("\n") + (extra ? "\n\n" + extra : "");
  const btn = $("#send"); btn.disabled = true; btn.textContent = "Publication…";
  try {
    const newId = await gmDB.add({
      type, game: g, title, lvl, rank,
      price: type === "vente" ? price : 0, swap: type === "echange" ? $("#pSwap").value.trim() : "",
      desc, name, thumb: imgs[0].thumb, nPics: imgs.length
    }, imgs.map(i => i.full));
    $("#dPost").close();
    ["#pLvl", "#pSkins", "#pPrimes", "#pSquad", "#pStar", "#pOvr", "#pPrice", "#pSwap", "#pDesc", "#pImgs"].forEach(s => $(s).value = "");
    imgs = []; showPrev();
    if (window.gmAuth?.isAdmin) toast("Annonce publiée");
    else {
      const txt = `Bonjour, je viens de publier l'annonce « ${title} » (réf. ${newId.slice(0, 6)}) sur GameMarket. Pouvez-vous la valider ? Pseudo : ${name}`;
      $("#okWa").href = waUrl(txt);
      dOk.showModal();
    }
  } catch (e) {
    console.error(e);
    toast(e.code === "permission-denied" ? "Refusé par les règles Firestore (permission-denied). Vérifiez qu'elles sont publiées." : "Échec : " + (e.code || e.message || "erreur inconnue"), 7000);
  }
  btn.disabled = false; btn.textContent = "Publier l’annonce";
};

/* ---------- Signalement : le client choisit une raison ---------- */
const REASONS = ["Arnaque", "Vol d’images (captures volées)", "Compte déjà vendu", "Fausses informations (prix, niveau, skins…)", "Annonce postée en double", "Contenu inapproprié", "Autre"];
const dR = document.createElement("dialog");
dR.innerHTML = `<div class="dh"><h2>Signaler cette annonce</h2><button class="x" type="button" data-close aria-label="Fermer">×</button></div>
  <div class="db">
    <p><strong>Pour quelle raison signalez-vous ce compte ?</strong></p>
    <div class="reasons">${REASONS.map(r => `<label class="rsn"><input type="radio" name="reason" value="${esc(r)}"><span>${esc(r)}</span></label>`).join("")}</div>
    <label class="f" id="fDetail" hidden><span>Expliquez pourquoi</span><textarea id="rDetail" rows="4" maxlength="500" placeholder="Décrivez le problème avec cette annonce…"></textarea></label>
    <button class="btn" id="rSend" type="button">Envoyer le signalement</button>
  </div>`;
document.body.append(dR);
let repId = null, repDone = null;
function openReport(id, done) {
  repId = id; repDone = done;
  dR.querySelectorAll("[name=reason]").forEach(r => { r.checked = false; });
  $("#rDetail").value = ""; $("#fDetail").hidden = true;
  dR.showModal();
}
dR.addEventListener("change", e => {
  if (e.target.name === "reason") $("#fDetail").hidden = e.target.value !== "Autre";
});
$("#rSend").onclick = async () => {
  const r = dR.querySelector("[name=reason]:checked");
  if (!r) return toast("Choisissez une raison.");
  const detail = $("#rDetail").value.trim();
  if (r.value === "Autre" && detail.length < 5) return toast("Expliquez en quelques mots pourquoi vous signalez.");
  const btn = $("#rSend"); btn.disabled = true;
  try { await gmDB.report(repId, r.value, r.value === "Autre" ? detail : ""); toast("Annonce signalée. Merci."); }
  catch (e) { toast("Vous avez déjà signalé cette annonce."); }
  dR.close(); if (repDone) repDone();
  btn.disabled = false;
};

/* ---------- Administration (visible seulement pour l'admin) ---------- */
const adm = { tab: "wait", reps: [] };
const fab = document.createElement("button");
fab.className = "btn adminfab"; fab.type = "button"; fab.hidden = true; fab.textContent = "Admin";
document.body.append(fab);
const dA = document.createElement("dialog");
dA.innerHTML = `<div class="dh"><h2>Administration</h2><button class="x" type="button" data-close aria-label="Fermer">×</button></div>
  <div class="db">
    <div class="tabs" style="margin:0">
      <button class="atab" type="button" data-t="wait"></button>
      <button class="atab" type="button" data-t="rep"></button>
      <button class="atab" type="button" data-t="dup"></button>
    </div>
    <div id="aList"></div>
  </div>`;
document.body.append(dA);

const ago = ms => { const m = Math.max(1, Math.round((Date.now() - ms) / 60000)); return m < 60 ? m + " min" : m < 1440 ? Math.round(m / 60) + " h" : Math.round(m / 1440) + " j"; };
const pend = () => ads.filter(a => stOf(a) === "pending").sort((a, b) => ts(a) - ts(b));
function repGroups() {
  const m = {};
  adm.reps.forEach(r => { (m[r.adId] ||= []).push(r); });
  return ads.filter(a => m[a.id]).map(a => ({ a, n: m[a.id].length, list: m[a.id] })).sort((x, y) => y.n - x.n);
}
/* Résumé des raisons de signalement d'une annonce */
function repInfo(n, list) {
  const c = {};
  list.forEach(r => { const k = r.reason || "Sans raison"; c[k] = (c[k] || 0) + 1; });
  const det = list.filter(r => r.detail).map(r => `<div class="sm">« ${esc(r.detail)} »</div>`).join("");
  return `<span class="abadge">${n} signalement${n > 1 ? "s" : ""}</span> ` + Object.entries(c).map(([k, v]) => `${esc(k)} ×${v}`).join(", ") + det;
}
/* Doublons : même première photo, ou même vendeur + mêmes infos */
function dupGroups() {
  const maps = {};
  ads.filter(a => stOf(a) !== "rejected").forEach(a => {
    [a.thumb ? "t:" + a.thumb : null, `u:${a.uid}|${a.game}|${a.lvl}|${a.price}|${a.rank}`].filter(Boolean)
      .forEach(k => (maps[k] ||= []).push(a));
  });
  const seen = new Set(), out = [];
  Object.values(maps).filter(g => g.length > 1).forEach(g => {
    const key = g.map(a => a.id).sort().join(",");
    if (!seen.has(key)) { seen.add(key); out.push(g.slice().sort((x, y) => ts(x) - ts(y))); }
  });
  return out;
}
const btnA = (cls, act, id, label) => `<button class="btn ${cls}" type="button" data-act="${act}" data-id="${id}">${label}</button>`;
function arow(a, info, btns) {
  return `<div class="arow">${safeImg(a.thumb) ? `<img src="${safeImg(a.thumb)}" alt="">` : `<div class="ph"></div>`}
    <div><h4>${esc(a.title)}</h4>
      <div class="meta">${esc(a.game)} · ${a.type === "vente" ? fmt(a.price) : "Échange"} · par ${esc(a.name)}</div>
      <div class="meta">${info}</div>
      <div class="acts2">${btns}</div></div></div>`;
}
function renderAdmin() {
  const W = pend(), R = repGroups(), D = dupGroups();
  const lab = { wait: `À approuver (${W.length})`, rep: `Signalées (${R.length})`, dup: `Doublons (${D.length})` };
  dA.querySelectorAll(".atab").forEach(t => { t.textContent = lab[t.dataset.t]; t.setAttribute("aria-pressed", t.dataset.t === adm.tab); });
  const none = m => `<div class="empty">${m}</div>`;
  let h = "";
  if (adm.tab === "wait") {
    h = W.length ? W.map(a => arow(a, `Posté il y a ${ago(ts(a))}`,
      btnA("ok", "ok", a.id, "Approuver") + btnA("alt", "view", a.id, "Voir") + btnA("alt", "no", a.id, "Refuser"))).join("") : none("Aucune annonce en attente.");
  } else if (adm.tab === "rep") {
    h = R.length ? R.map(({ a, n, list }) => arow(a, repInfo(n, list),
      btnA("alt", "view", a.id, "Voir") + btnA("red", "del", a.id, "Supprimer") + btnA("alt", "ign", a.id, "Ignorer"))).join("") : none("Aucune annonce signalée.");
  } else {
    h = D.length ? D.map(g => `<div class="agrp">${g.map((a, i) => arow(a, i ? "Posté plus tard : probable doublon" : "Annonce d’origine",
      btnA("alt", "view", a.id, "Voir") + btnA("red", "del", a.id, "Supprimer"))).join("")}</div>`).join("") : none("Aucun doublon détecté.");
  }
  $("#aList").innerHTML = h;
}
async function loadReps() {
  try { adm.reps = await gmDB.reports(); } catch (e) { adm.reps = []; }
  renderAdmin();
}
function adminBadge() {
  const on = !!me && !!window.gmAuth?.isAdmin, n = pend().length;
  fab.hidden = !on;
  fab.textContent = "Admin" + (n ? ` (${n})` : "");
}
function adminSync() { adminBadge(); if (dA.open) renderAdmin(); }
fab.onclick = () => { adm.tab = "wait"; renderAdmin(); dA.showModal(); loadReps(); };
dA.querySelectorAll(".atab").forEach(t => t.onclick = () => { adm.tab = t.dataset.t; renderAdmin(); });
$("#aList").onclick = async e => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const id = b.dataset.id, act = b.dataset.act;
  try {
    if (act === "view") { openAd(id); return; }
    if (act === "ok") { await gmDB.update(id, { status: "approved" }); toast("Annonce approuvée"); }
    else if (act === "no") { if (!confirm("Refuser cette annonce ?")) return; await gmDB.update(id, { status: "rejected" }); toast("Annonce refusée"); }
    else if (act === "del") {
      if (!confirm("Supprimer définitivement cette annonce ?")) return;
      await gmDB.remove(id);
      try { await gmDB.dismiss(id); } catch (e2) { /* rien à effacer */ }
      toast("Annonce supprimée");
    } else if (act === "ign") { await gmDB.dismiss(id); toast("Signalements ignorés"); }
    if (act === "del" || act === "ign") await loadReps();
  } catch (err) { console.error(err); toast("Action refusée : " + (err.code || "erreur")); }
};

/* Lien partagé (?ad=...) : ouvre directement l'annonce */
let deep = new URLSearchParams(location.search).get("ad");
function openFromLink() {
  if (!deep) return;
  const a = ads.find(x => x.id === deep);
  if (a && visible(a)) { const id = deep; deep = null; openAd(id); }
  else if (ads.length) { deep = null; toast("Cette annonce n’est plus disponible."); }
}

/* ---------- Connexion et démarrage ---------- */
document.addEventListener("gm-auth", e => {
  me = e.detail;
  adminBadge();
  mineTab.hidden = !me;
  if (!me && tab === "mine") {
    tab = "";
    document.querySelectorAll(".tab").forEach(x => x.setAttribute("aria-pressed", x.dataset.t === ""));
    render();
  }
  const l = $("#authLink");
  if (me) {
    l.textContent = "Déconnexion"; l.href = "#";
    l.onclick = ev => { ev.preventDefault(); gmAuth.logout().then(() => toast("Vous êtes déconnecté")); };
    if (!$("#pName").value) $("#pName").value = me.displayName || "";
  } else {
    l.textContent = "Connexion"; l.href = "login.html"; l.onclick = null;
  }
  if (!started) {
    started = true;
    gmDB.watch(list => { ads = list; loaded = true; failed = ""; render(); adminSync(); notifyOwner(list); openFromLink(); }, err => { loaded = true; failed = err.code || "erreur"; render(); });
  }
});

$("#openPost").onclick = () => {
  if (!me) { location.href = "login.html"; return; }
  $("#dPost").showModal();
};
document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => b.closest("dialog").close());
document.querySelectorAll("dialog").forEach(d => d.addEventListener("click", e => { if (e.target === d) d.close(); }));
$("#dView").addEventListener("close", () => { cur = null; });
$("#list").onclick = e => { const c = e.target.closest(".card"); if (c) openAd(c.dataset.id); };
document.querySelectorAll(".tab").forEach(t => t.onclick = () => {
  tab = t.dataset.t;
  document.querySelectorAll(".tab").forEach(x => x.setAttribute("aria-pressed", x === t));
  render();
});
["#q", "#game", "#sort", "#lvl"].forEach(s => $(s).addEventListener("input", render));
$("#game").addEventListener("input", e => setHero(COVERS[e.target.value] || HERO));
document.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => {
  const g = $("#game");
  g.value = b.dataset.pick;
  g.dispatchEvent(new Event("input", { bubbles: true }));
  window.scrollTo({ top: 0, behavior: "smooth" });
});
$("#toTop").onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
$("#waWrite").href = waUrl(WA_HELLO);
$("#waGroup").href = WA_GROUP;
$("#waOpen").onclick = () => $("#dWa").showModal();
document.querySelectorAll("#dWa .opt").forEach(a => a.addEventListener("click", () => setTimeout(() => $("#dWa").close(), 200)));
$("#yr").textContent = new Date().getFullYear();
render();