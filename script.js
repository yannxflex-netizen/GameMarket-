const ADMIN_PHONE = "2250759779178";
const WA_GROUP = "https://chat.whatsapp.com/Kb89Biufbg76DuNm2ml5Mj";
const WA_HELLO = "Bonjour Yanox, j'ai besoin de poster mon compte, mais comment m'y prendre sur ton site ?";
const $ = s => document.querySelector(s);
const fmt = n => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const GC = { "Free Fire": ["#e8590c", "#6b1a00"], "eFootball": ["#0ea5e9", "#0b2a5a"], "Blood Strike": ["#c1121f", "#2a0206"], "Autre": ["#2b3a6e", "#142046"] };
const bg = g => { const c = GC[g] || GC.Autre; return `background:linear-gradient(135deg,${c[0]},${c[1]})`; };
const avg = a => (a.rCount ? a.rSum / a.rCount : 0);
const ts = a => a.createdAt?.toMillis?.() ?? Date.now();
const starsOf = v => "★".repeat(Math.round(v)) + "☆".repeat(5 - Math.round(v));
const mine = a => !!me && (a.uid === me.uid || gmAuth.isAdmin);

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

let ads = [], tab = "", imgs = [], me = null, loaded = false, failed = "", started = false, cur = null, onlyMine = false;

function toast(m, ms = 2800) {
  const t = document.createElement("div");
  t.className = "toast"; t.setAttribute("role", "status"); t.textContent = m;
  document.body.append(t); setTimeout(() => t.remove(), ms);
}

function emptyMsg() {
  if (!loaded) return "Chargement des annonces…";
  if (failed) return `Impossible de charger les annonces (${esc(failed)}). Vérifiez que Firestore est créé et que les règles sont publiées.`;
  return ads.length ? "Aucune annonce ne correspond. Modifiez vos filtres." : "Aucune annonce pour le moment. Soyez le premier à publier !";
}

function card(a) {
  const pic = a.thumb || COVERS[a.game];
  return `
  <button class="card${a.sold ? " is-sold" : ""}" data-id="${a.id}">
    <div class="thumb"${pic ? "" : ` style="${bg(a.game)}"`}>${pic ? `<img src="${pic}" alt="" loading="lazy">` : esc(a.game)}<span class="tag ${a.sold ? "sold" : a.type === "echange" ? "ex" : ""}">${a.sold ? "Vendu" : a.type === "vente" ? "À vendre" : "Échange"}</span></div>
    <div class="cb"><h3>${esc(a.title)}</h3>
      <div class="meta">${esc(a.game)} · Niveau ${a.lvl}${a.rank ? " · " + esc(a.rank) : ""}</div>
      <div class="meta"><span class="stars">${starsOf(avg(a))}</span> ${a.rCount ? avg(a).toFixed(1) + " (" + a.rCount + ")" : "Pas encore noté"}</div>
      <div class="price">${a.type === "vente" ? fmt(a.price) : "Échange"}</div></div>
  </button>`;
}

const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function syncChips() {
  const g = $("#game").value;
  document.querySelectorAll("#gameChips .chip").forEach(c => c.setAttribute("aria-pressed", c.dataset.g === g));
}

function filtersActive() {
  return ($("#pmin").value ? 1 : 0) + ($("#pmax").value ? 1 : 0) + (+$("#lvl").value ? 1 : 0) + ($("#sort").value !== "new" ? 1 : 0);
}

function resetFilters() {
  $("#q").value = ""; $("#pmin").value = ""; $("#pmax").value = ""; $("#lvl").value = "0"; $("#sort").value = "new";
  $("#game").value = ""; tab = ""; onlyMine = false;
  document.querySelectorAll(".tab[data-t]").forEach(x => x.setAttribute("aria-pressed", x.dataset.t === ""));
  syncChips(); setHero(HERO); render();
}

function render() {
  const words = norm($("#q").value).split(/\s+/).filter(Boolean);
  const g = $("#game").value, lv = +$("#lvl").value, so = $("#sort").value;
  const pmin = +$("#pmin").value || 0, pmax = +$("#pmax").value || 0;
  const r = ads.filter(a => {
    if (tab && a.type !== tab) return false;
    if (g && a.game !== g) return false;
    if (a.lvl < lv) return false;
    if ((pmin || pmax) && a.type !== "vente") return false;
    if (pmin && a.price < pmin) return false;
    if (pmax && a.price > pmax) return false;
    if (onlyMine && !(me && a.uid === me.uid)) return false;
    if (words.length) {
      const h = norm(a.title + " " + a.desc + " " + a.rank + " " + a.game + " " + (a.type === "vente" ? "vente" : "echange"));
      return words.every(w => h.includes(w));
    }
    return true;
  });
  r.sort((a, b) => so === "pa" ? a.price - b.price : so === "pd" ? b.price - a.price : so === "note" ? avg(b) - avg(a) : ts(b) - ts(a));
  const n = filtersActive();
  $("#qClear").hidden = !$("#q").value;
  $("#fBadge").hidden = !n; $("#fBadge").textContent = n;
  const any = words.length || g || tab || n || onlyMine;
  $("#count").innerHTML = loaded && !failed
    ? `<span>${r.length} annonce${r.length > 1 ? "s" : ""}${onlyMine ? " (les miennes)" : ""}</span>${any ? ` <button class="linkbtn" id="clearAll" type="button">Tout effacer</button>` : ""}` : "";
  $("#fCount").textContent = `Voir ${r.length} annonce${r.length > 1 ? "s" : ""}`;
  $("#list").innerHTML = r.length ? r.map(card).join("") : `<div class="empty" style="grid-column:1/-1">${emptyMsg()}</div>`;
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
  const shots = pics && pics.length ? pics : a.thumb ? [a.thumb] : [];
  const wa = encodeURIComponent(`Bonjour Yanox, je suis intéressé par « ${a.title} » (${a.type === "vente" ? fmt(a.price) : "échange"}), réf. ${a.id.slice(0, 6)}, sur Market Game. Est-il toujours disponible ?`);
  const rate = !me ? `<p class="sm">Connectez-vous pour noter ce compte.</p>`
    : my === null ? ""
    : my ? `<p class="sm">Votre note : <span class="stars">${starsOf(my)}</span></p>`
    : `<p class="sm" style="margin-bottom:4px">Noter ce compte :</p><div class="rate" role="group" aria-label="Note">${[1, 2, 3, 4, 5].map(n => `<button data-n="${n}" aria-label="${n} sur 5">★</button>`).join("")}</div>`;
  const cta = a.sold
    ? `<div class="cta-bar"><span class="sm">Cette annonce est vendue.</span></div>`
    : `<div class="cta-bar"><div><div class="cta-p">${a.type === "vente" ? fmt(a.price) : "Échange"}</div><div class="sm">Réponse rapide sur WhatsApp</div></div><a class="btn ok" target="_blank" rel="noopener" href="https://wa.me/${ADMIN_PHONE}?text=${wa}"><svg class="wa" aria-hidden="true"><use href="#i-wa"/></svg>${a.type === "vente" ? "Acheter" : "Proposer l’échange"}</a></div>`;
  $("#vBody").innerHTML = `
    ${shots.length ? `<div class="gal">${shots.map(s => `<img src="${s}" alt="Capture du compte">`).join("")}</div>` : `<div class="thumb" style="border-radius:8px;${bg(a.game)}">${esc(a.game)}</div>`}
    <div><span class="tag${a.sold ? " sold" : ""}" style="position:static;display:inline-block">${a.sold ? "Vendu" : a.type === "vente" ? "À vendre" : "Échange"}</span></div>
    <div class="price" style="padding:0">${a.type === "vente" ? fmt(a.price) : "Contre : " + esc(a.swap || "à discuter")}</div>
    <div class="meta">${esc(a.game)} · Niveau ${a.lvl}${a.rank ? " · " + esc(a.rank) : ""} · Publié par ${esc(a.name)}</div>
    <p>${esc(a.desc).replace(/\n/g, "<br>")}</p>
    <div class="stars">${starsOf(avg(a))} <span class="sm">${a.rCount ? avg(a).toFixed(1) + "/5 · " + a.rCount + " avis" : "Pas encore noté"}</span></div>
    <div>${rate}</div>
    <ol class="steps"><li><span><b>Contactez</b> le vendeur sur WhatsApp</span></li><li><span><b>Vérifiez</b> le compte avant de payer</span></li><li><span><b>Payez</b> en sécurité, puis changez les accès</span></li></ol>
    ${mine(a) ? `<button class="btn alt" id="sold">${a.sold ? "Remettre en vente" : "Marquer comme vendu"}</button><button class="btn alt" id="del">Supprimer cette annonce</button>` : ""}
    <button class="btn alt" id="rep">Signaler cette annonce</button>
    ${cta}`;

  $("#vBody").querySelectorAll(".rate button").forEach(b => b.onclick = async () => {
    const n = +b.dataset.n;
    try {
      await gmDB.rate(a.id, n);
      toast("Merci pour votre note");
      if (cur === a.id) draw(ads.find(x => x.id === a.id) || a, pics, n);
    } catch (e) { toast("Note refusée."); }
  });
  $("#rep").onclick = async () => {
    if (!me) { location.href = "login.html"; return; }
    try { await gmDB.report(a.id); toast("Annonce signalée. Merci."); }
    catch (e) { toast("Vous avez déjà signalé cette annonce."); }
    $("#rep").disabled = true;
  };
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
          return c.toDataURL("image/jpeg", q);
        };
        const fit = (m, q, max) => { let r = draw(m, q); while (r.length > max && q > .3) { q -= .08; m = Math.round(m * .9); r = draw(m, q); } return r; };
        res({ full: fit(800, .68, 300000), thumb: fit(420, .6, 45000) });
      };
      im.onerror = () => res(null); im.src = fr.result;
    };
    fr.onerror = () => res(null); fr.readAsDataURL(file);
  });
}

$("#pImgs").onchange = async e => {
  imgs = (await Promise.all([...e.target.files].slice(0, 5).map(shrink))).filter(Boolean);
  $("#prev").innerHTML = imgs.map(i => `<img src="${i.thumb}" alt="">`).join("");
};
document.querySelectorAll("[name=type]").forEach(r => r.onchange = () => {
  const ex = document.querySelector("[name=type]:checked").value === "echange";
  $("#fPrice").hidden = ex; $("#fSwap").hidden = !ex;
});

$("#send").onclick = async () => {
  if (!me) { location.href = "login.html"; return; }
  const type = document.querySelector("[name=type]:checked").value;
  const title = $("#pTitle").value.trim(), lvl = +$("#pLvl").value, price = +$("#pPrice").value,
    desc = $("#pDesc").value.trim(), name = $("#pName").value.trim();
  if (!title || !lvl || !desc || !name) return toast("Remplissez le titre, le niveau, la description et votre pseudo.");
  if (lvl < 1 || lvl > 100) return toast("Le niveau doit être entre 1 et 100.");
  if (type === "vente" && !price) return toast("Indiquez un prix en FCFA.");
  if (!imgs.length) return toast("Ajoutez au moins une capture d’écran.");
  const btn = $("#send"); btn.disabled = true; btn.textContent = "Publication…";
  try {
    await gmDB.add({
      type, game: $("#pGame").value, title, lvl, rank: $("#pRank").value.trim(),
      price: type === "vente" ? price : 0, swap: type === "echange" ? $("#pSwap").value.trim() : "",
      desc, name, thumb: imgs[0].thumb, nPics: imgs.length
    }, imgs.map(i => i.full));
    $("#dPost").close();
    ["#pTitle", "#pRank", "#pLvl", "#pPrice", "#pSwap", "#pDesc", "#pImgs"].forEach(s => $(s).value = "");
    imgs = []; $("#prev").innerHTML = "";
    toast("Annonce publiée");
  } catch (e) {
    console.error(e);
    toast(e.code === "permission-denied" ? "Refusé par les règles Firestore (permission-denied). Vérifiez qu'elles sont publiées." : "Échec : " + (e.code || e.message || "erreur inconnue"), 7000);
  }
  btn.disabled = false; btn.textContent = "Publier l’annonce";
};

/* ---------- Connexion et démarrage ---------- */
document.addEventListener("gm-auth", e => {
  me = e.detail;
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
    gmDB.watch(list => { ads = list; loaded = true; failed = ""; render(); }, err => { loaded = true; failed = err.code || "erreur"; render(); });
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
["#q", "#game", "#sort", "#lvl", "#pmin", "#pmax"].forEach(s => $(s).addEventListener("input", render));
$("#game").addEventListener("input", e => { setHero(COVERS[e.target.value] || HERO); syncChips(); });
document.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => {
  const g = $("#game");
  g.value = b.dataset.pick;
  g.dispatchEvent(new Event("input", { bubbles: true }));
  window.scrollTo({ top: 0, behavior: "smooth" });
});
$("#toTop").onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
/* Filtres */
document.querySelectorAll("#gameChips .chip").forEach(c => c.onclick = () => {
  const g = $("#game"); g.value = c.dataset.g; g.dispatchEvent(new Event("input", { bubbles: true }));
});
$("#fBtn").onclick = () => $("#dFilt").showModal();
$("#fReset").onclick = resetFilters;
document.querySelectorAll("[data-pr]").forEach(b => b.onclick = () => {
  const [lo, hi] = b.dataset.pr.split("-");
  $("#pmin").value = lo === "0" ? "" : lo; $("#pmax").value = hi; render();
});
$("#count").onclick = e => { if (e.target.id === "clearAll") resetFilters(); };

$("#waWrite").href = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(WA_HELLO)}`;
$("#waGroup").href = WA_GROUP;
$("#waOpen").onclick = () => $("#dWa").showModal();
document.querySelectorAll("#dWa .opt").forEach(a => a.addEventListener("click", () => setTimeout(() => $("#dWa").close(), 200)));
$("#yr").textContent = new Date().getFullYear();
render();
                                                      
