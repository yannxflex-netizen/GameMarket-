(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("js-anim");

  /* Effet de clic : une vague part du doigt */
  document.addEventListener("pointerdown", e => {
    const b = e.target.closest(".btn:not(.adminfab),.tab,.gbtn,.atab,.vn-btn");
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2;
    const sp = document.createElement("span");
    sp.className = "rpl";
    sp.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    b.append(sp);
    sp.addEventListener("animationend", () => sp.remove());
  }, { passive: true });

  // Titre : chaque mot monte tour à tour
  const h1 = document.querySelector(".hero h1");
  if (h1) {
    const txt = h1.textContent.trim();
    h1.setAttribute("aria-label", txt);
    h1.innerHTML = txt
      .split(/\s+/)
      .map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`)
      .join(" ");
  }

  const opts = { threshold: 0.12, rootMargin: "0px 0px -6% 0px" };

  // Blocs de la page : apparition douce quand ils entrent à l'écran (pas tous les éléments)
  const rvIo = new IntersectionObserver(entries => {
    entries.filter(e => e.isIntersecting).forEach((e, i) => {
      e.target.style.setProperty("--d", i * 80 + "ms");
      e.target.classList.add("in");
      rvIo.unobserve(e.target);
    });
  }, opts);
  document.querySelectorAll(".notice,.tools,.tabs,.stats,.fcol,.foot-bot,.trust h2,.trust-item").forEach(el => {
    el.classList.add("rv");
    rvIo.observe(el);
  });

  // Annonces : chaque carte apparaît quand elle entre à l'écran
  const list = document.querySelector("#list");
  if (!list) return;

  const io = new IntersectionObserver(entries => {
    entries.filter(e => e.isIntersecting).forEach((e, i) => {
      e.target.style.setProperty("--d", i * 70 + "ms");
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
  }, opts);

  const watch = () => {
    list.querySelectorAll(".card:not([data-seen])").forEach(c => {
      c.dataset.seen = "1";
      io.observe(c);
    });
    // Photos : fondu une fois chargées
    list.querySelectorAll(".thumb img:not([data-ld])").forEach(img => {
      img.dataset.ld = "1";
      const ok = () => requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add("ld")));
      if (img.complete && img.naturalWidth) ok();
      else {
        img.addEventListener("load", ok, { once: true });
        img.addEventListener("error", ok, { once: true });
        setTimeout(() => img.classList.add("ld"), 4000);
      }
    });
  };

  watch();
  // les cartes sont recréées à chaque filtre ou recherche
  new MutationObserver(watch).observe(list, { childList: true });
})();
