// CHESH v3 — собрано site-tools/build_v3.py. Колесо кейсов, смена фото, появление блоков, видео бота.
"use strict";
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // появление блоков
  const rv = Array.from(document.querySelectorAll(".c3-rv"));
  if (reduce || !("IntersectionObserver" in window)) rv.forEach((e) => e.classList.add("c3-in"));
  else {
    const io = new IntersectionObserver((list) => list.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("c3-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    rv.forEach((e, i) => { if (e.closest(".c3-hero")) e.style.transitionDelay = (i * 0.08) + "s"; io.observe(e); });
  }
  // меняющиеся фото: только пока блок на экране
  document.querySelectorAll(".c3-rot").forEach((box) => {
    const imgs = Array.from(box.querySelectorAll("img"));
    if (imgs.length < 2 || reduce) return;
    const every = +box.dataset.rot || 2500, off = +box.dataset.offset || 0;
    let k = 0, timer = null;
    const next = () => { imgs[k].classList.remove("on"); k = (k + 1) % imgs.length; imgs[k].classList.add("on"); };
    const start = () => { if (!timer) timer = setTimeout(function tick() { next(); timer = setTimeout(tick, every); }, every + off); };
    const stop = () => { clearTimeout(timer); timer = null; };
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(box); else start();
  });
  // видео бота: играет, пока видно
  document.querySelectorAll("video[data-autoplay]").forEach((v) => {
    if (reduce || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.3 }).observe(v);
  });
})();
// Колесо кейсов: тянуть мышкой/пальцем, стрелки, клавиши ← →. Прокрутка страницы крутит колесо через CSS (animation-timeline).
// Если карточку потянули, а не нажали, — переход по ссылке отменяется.

(function () {
  const area = document.getElementById("wheelArea");
  const wheel = document.getElementById("wheel");
  if (!area || !wheel) return;
  const cards = Array.from(wheel.querySelectorAll(".c3-card"));
  const step = () => (matchMedia("(max-width: 640px)").matches ? 11.5 : 11.5);
  const LIMIT = () => (cards.length / 2) * step();
  let drag = 0, startX = 0, startDrag = 0, moved = 0, active = false;

  const set = (deg) => {
    drag = Math.max(-LIMIT(), Math.min(LIMIT(), deg));
    wheel.style.setProperty("--drag", drag + "deg");
  };
  const snap = () => set(Math.round(drag / step()) * step());

  area.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest(".c3-cases-nav")) return;
    active = true; moved = 0; startX = e.clientX; startDrag = drag;
    area.dataset.pid = e.pointerId;
  });
  area.addEventListener("pointermove", (e) => {
    if (!active) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    if (moved < 6) return; // пока это нажатие, а не перетаскивание
    if (!area.classList.contains("c3-drag")) { area.classList.add("c3-drag"); area.setPointerCapture(e.pointerId); }
    set(startDrag + dx * 0.06);
  });
  const end = () => { if (!active) return; active = false; area.classList.remove("c3-drag"); snap(); };
  area.addEventListener("pointerup", end);
  area.addEventListener("pointercancel", end);
  // потянули — не открываем кейс
  wheel.addEventListener("click", (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

  document.getElementById("wheelPrev").addEventListener("click", () => set(drag + step()));
  document.getElementById("wheelNext").addEventListener("click", () => set(drag - step()));
  area.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") set(drag + step());
    if (e.key === "ArrowRight") set(drag - step());
  });
  // карточка получила фокус с клавиатуры — поворачиваем колесо к ней
  cards.forEach((c) => c.addEventListener("focus", () => set(-parseFloat(c.style.getPropertyValue("--i")) * step())));
})();
