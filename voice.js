/* Message « À savoir » en vocal : fichier audio s'il existe (mp3, m4a, ogg, opus), sinon voix du téléphone, sinon texte ouvert */
(() => {
  const btn = document.querySelector("#vnBtn");
  if (!btn) return;
  const wave = document.querySelector("#vnWave"), timeEl = document.querySelector("#vnTime");
  const H = [40, 70, 55, 90, 60, 35, 80, 65, 45, 85, 50, 30, 75, 95, 55, 40, 70, 60, 35, 80, 50, 65, 90, 45, 60, 30, 75, 55, 85, 40, 65, 50];
  wave.innerHTML = H.map(h => `<i style="height:${h}%"></i>`).join("");
  const bars = [...wave.children];

  const text = document.querySelector("#vnText").textContent
    .replace(/[()]/g, ",").replace(/…/g, "").replace(/\s+/g, " ").trim();
  const est = Math.max(8, Math.round(text.length / 14));
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

  let mode = "tts", playing = false, total = est, timer = null, t0 = 0, run = 0;
  timeEl.textContent = fmt(total);

  /* Essaie plusieurs formats, dans l'ordre, jusqu'à en trouver un qui existe */
  const FILES = ["a-savoir.mp3", "a-savoir.m4a", "a-savoir.ogg", "a-savoir.opus", "a-savoir.wav"];
  const audio = new Audio();
  audio.preload = "auto";
  let fi = 0;
  function nextFile() {
    if (fi >= FILES.length) return;
    audio.src = FILES[fi++];
    audio.load();
  }
  audio.addEventListener("error", nextFile);
  audio.addEventListener("loadedmetadata", () => {
    if (isFinite(audio.duration) && audio.duration > 0) {
      mode = "file"; total = audio.duration;
      if (!playing) timeEl.textContent = fmt(total);
    }
  });
  audio.addEventListener("timeupdate", () => progress(audio.currentTime / total));
  audio.addEventListener("ended", () => stop());
  nextFile();

  function progress(p) {
    p = Math.min(1, Math.max(0, p));
    bars.forEach((b, i) => b.classList.toggle("on", i < Math.round(p * bars.length)));
    timeEl.textContent = playing ? fmt(p * total) : fmt(total);
  }
  function setPlaying(v) { playing = v; btn.setAttribute("aria-pressed", String(v)); }

  function stop() {
    run++;
    clearInterval(timer);
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    audio.pause();
    try { audio.currentTime = 0; } catch (e) {}
    setPlaying(false);
    progress(0);
  }

  function noAudio() {
    setPlaying(false);
    const d = document.querySelector(".vn-text");
    if (d) d.open = true;
    if (typeof toast === "function") toast("Audio indisponible sur cet appareil. Lisez le texte.");
  }

  function speak() {
    if (!("speechSynthesis" in window)) return noAudio();
    const id = ++run;
    speechSynthesis.cancel();
    const voice = speechSynthesis.getVoices().find(v => /^fr/i.test(v.lang));
    const parts = text.split(/(?<=[.!?:])\s+/).filter(Boolean);
    let started = false;
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = "fr-FR"; u.rate = 1;
      if (voice) u.voice = voice;
      u.onstart = () => { started = true; };
      u.onend = () => { if (id === run && i === parts.length - 1) stop(); };
      u.onerror = () => { if (id === run) { stop(); if (!started) noAudio(); } };
      speechSynthesis.speak(u);
    });
    t0 = Date.now();
    clearInterval(timer);
    timer = setInterval(() => progress(Math.min(0.97, (Date.now() - t0) / 1000 / total)), 200);
    /* si rien ne démarre en 2,5 s : pas de voix sur cet appareil */
    setTimeout(() => { if (id === run && playing && !started) { stop(); noAudio(); } }, 2500);
  }

  btn.onclick = async () => {
    if (playing) return stop();
    setPlaying(true);
    if (mode === "file") {
      try { await audio.play(); return; }
      catch (e) { mode = "tts"; total = est; }
    }
    speak();
  };

  document.addEventListener("visibilitychange", () => { if (document.hidden && playing) stop(); });
})();
