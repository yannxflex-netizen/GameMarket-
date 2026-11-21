/* Espace administrateur : visible seulement pour l'adresse admin connectée avec Google */
(() => {
  const $ = s => document.querySelector(s);
  const dlg = $("#dAdm");
  if (!dlg) return;

  async function load() {
    const nSold = ads.filter(a => a.sold).length;
    $("#admInfo").textContent = `${ads.length} annonce${ads.length > 1 ? "s" : ""} en ligne · ${nSold} vendue${nSold > 1 ? "s" : ""}`;
    const box = $("#admList");
    box.textContent = "Chargement…";
    try {
      const reps = await gmDB.reports();
      const by = {};
      reps.forEach(r => { by[r.adId] = (by[r.adId] || 0) + 1; });
      const ids = Object.keys(by).sort((a, b) => by[b] - by[a]);
      box.innerHTML = ids.length ? ids.map(id => {
        const a = ads.find(x => x.id === id);
        return `<div class="adm-row" data-id="${esc(id)}">
          <div><strong>${a ? esc(a.title) : "Annonce déjà supprimée"}</strong>
            <div class="sm">${by[id]} signalement${by[id] > 1 ? "s" : ""}${a ? " · par " + esc(a.name) : ""}</div></div>
          <div class="adm-b">${a ? `<button class="btn alt" data-act="view" type="button">Voir</button><button class="btn" data-act="del" type="button">Supprimer</button>` : ""}<button class="btn alt" data-act="ign" type="button">Ignorer</button></div>
        </div>`;
      }).join("") : `<p class="sm">Aucun signalement pour le moment.</p>`;
    } catch (e) {
      box.innerHTML = `<p class="sm">Impossible de charger (${esc(e.code || "erreur")}). Vérifiez que les règles Firestore sont publiées.</p>`;
    }
  }

  $("#admList").onclick = async e => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const id = b.closest(".adm-row").dataset.id, act = b.dataset.act;
    if (act === "view") { dlg.close(); openAd(id); return; }
    if (act === "del") {
      if (!confirm("Supprimer définitivement cette annonce ?")) return;
      try { await gmDB.remove(id); await gmDB.dismiss(id); toast("Annonce supprimée"); }
      catch (er) { toast("Suppression refusée."); }
    }
    if (act === "ign") {
      try { await gmDB.dismiss(id); toast("Signalements ignorés"); }
      catch (er) { toast("Action refusée."); }
    }
    load();
  };
  $("#admRefresh").onclick = load;

  function openAdmin() { if (gmAuth.isAdmin) { dlg.showModal(); load(); } }
  $("#admBtn").onclick = openAdmin;
  $("#accAdm").onclick = () => { $("#dAcc").close(); openAdmin(); };

  document.addEventListener("gm-auth", () => {
    const on = !!gmAuth.isAdmin;
    $("#admBtn").hidden = !on;
    $("#accAdm").hidden = !on;
  });
})();
