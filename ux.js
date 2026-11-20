/* Navigation du bas, menu compte, confort de recherche */
(() => {
  const $ = s => document.querySelector(s);
  const bnav = $("#bnav");
  if (!bnav) return;
  const toMain = () => window.scrollTo({ top: $("main").getBoundingClientRect().top + window.scrollY - 4, behavior: "smooth" });

  function openAccount() {
    $("#accWho").textContent = "Connecté : " + (me.displayName || me.email);
    $("#accMine").textContent = onlyMine ? "Voir toutes les annonces" : "Voir mes annonces";
    $("#dAcc").showModal();
  }

  bnav.addEventListener("click", e => {
    const b = e.target.closest("[data-go]");
    if (!b) return;
    const go = b.dataset.go;
    if (go === "top") window.scrollTo({ top: 0, behavior: "smooth" });
    if (go === "search") { toMain(); setTimeout(() => $("#q").focus({ preventScroll: true }), 450); }
    if (go === "post") $("#openPost").click();
    if (go === "help") $("#waOpen").click();
    if (go === "account") { if (!me) location.href = "login.html"; else openAccount(); }
  });

  $("#accMine").onclick = () => {
    onlyMine = !onlyMine; render(); $("#dAcc").close(); toMain();
    toast(onlyMine ? "Vos annonces uniquement" : "Toutes les annonces");
  };
  $("#accPost").onclick = () => { $("#dAcc").close(); $("#openPost").click(); };
  $("#accOut").onclick = () => {
    $("#dAcc").close();
    gmAuth.logout().then(() => { onlyMine = false; render(); toast("Vous êtes déconnecté"); });
  };

  // le menu se cache quand on descend, revient quand on remonte ou qu'on écrit
  let last = window.scrollY;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (Math.abs(y - last) < 8) return;
    bnav.classList.toggle("hide", y > last && y > 120);
    last = y;
  }, { passive: true });
  document.addEventListener("focusin", e => { if (e.target.matches("input,textarea,select")) bnav.classList.add("hide"); });
  document.addEventListener("focusout", () => bnav.classList.remove("hide"));

  // compte : le libellé suit la connexion
  document.addEventListener("gm-auth", e => {
    const u = e.detail;
    $("#bnAcc").textContent = u ? ((u.displayName || "Compte").split(" ")[0].slice(0, 9)) : "Connexion";
    if (!u && onlyMine) { onlyMine = false; render(); }
  });

  // recherche : bouton effacer, Entrée ferme le clavier
  $("#qClear").onclick = () => { $("#q").value = ""; render(); $("#q").focus(); };
  $("#q").addEventListener("keydown", e => { if (e.key === "Enter") e.target.blur(); });
})();
