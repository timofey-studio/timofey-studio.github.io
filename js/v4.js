// CHESH v4 (макет): фон главного экрана, вход на сайт, шапка при прокрутке, ролики, появление блоков.
"use strict";
(function () {
  const bg = document.getElementById("heroBg");
  if (bg) bg.style.backgroundImage = "url(" + (window.HERO_BG || "img/v4/bg-2.jpg") + ")";
  // вход: когда ролик на экране ноутбука загрузился (или через 1,2 с) — запускаем появление
  const hero = document.getElementById("hero");
  const go = () => hero && hero.classList.add("loaded");
  const vid = document.querySelector(".laptop video");
  if (vid && vid.readyState < 2) { vid.addEventListener("loadeddata", go, { once: true }); setTimeout(go, 1200); } else requestAnimationFrame(go);

  // шапка темнеет, когда страницу прокрутили
  const top = document.getElementById("top");
  let ticking = false;
  const tick = () => { ticking = false; if (top) top.classList.toggle("scrolled", scrollY > 60); };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });
  tick();

  // фото в блоках чуть «плывут» при прокрутке (параллакс), считаем только для видимых
  const pics = Array.from(document.querySelectorAll(".sp-media > img"));
  if (pics.length && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const vis = new Set();
    const po = new IntersectionObserver((list) => list.forEach((e) => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target))));
    pics.forEach((p) => { p.style.scale = "1.1"; po.observe(p); });
    let busy = false;
    const move = () => {
      busy = false;
      vis.forEach((p) => { const r = p.parentElement.getBoundingClientRect(); const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; p.style.translate = "0 " + (k * -40).toFixed(1) + "px"; });
    };
    addEventListener("scroll", () => { if (!busy) { busy = true; requestAnimationFrame(move); } }, { passive: true });
    move();
  }

  // ролики в шагах играют, только когда их видно
  const vids = Array.from(document.querySelectorAll(".panel video"));
  if ("IntersectionObserver" in window) {
    const vo = new IntersectionObserver((list) => list.forEach((e) => { if (e.isIntersecting) e.target.play().catch(() => {}); else e.target.pause(); }), { threshold: 0.3 });
    vids.forEach((v) => vo.observe(v));
  }

  // появление при прокрутке + запуск анимаций шагов
  const items = Array.from(document.querySelectorAll("[data-rv], .steps, .step, .cases"));
  if (!("IntersectionObserver" in window)) { items.forEach((e) => e.classList.add("in")); return; }
  // у «clip» элемент обрезан целиком, наблюдатель его не видит, поэтому следим за родителем
  const io = new IntersectionObserver((list) => list.forEach((e) => {
    if (!e.isIntersecting) return;
    (e.target.rvChild || e.target).classList.add("in");
    io.unobserve(e.target);
  }), { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
  items.forEach((e) => {
    if (e.dataset.rv === "clip") { const w = e.parentElement; w.rvChild = e; io.observe(w); } else io.observe(e);
  });
})();

// Кейсы: дуга карточек. Колесо крутится одним transform в requestAnimationFrame и плавно догоняет цель,
// поэтому листание не дёргается. Тянуть мышкой/пальцем, стрелки на экране и клавиатуре, горизонтальное колесо мыши/тачпада.
(function () {
  const area = document.getElementById("wheelArea"), wheel = document.getElementById("wheel");
  if (!area || !wheel) return;
  const cards = Array.from(wheel.querySelectorAll(".card"));
  const idx = cards.map((c) => parseFloat(c.style.getPropertyValue("--i")));
  const lo = Math.min(...idx), hi = Math.max(...idx);
  const now = document.getElementById("cNow"), name = document.getElementById("cName"), bar = document.getElementById("cBar");
  const prev = document.getElementById("cPrev"), next = document.getElementById("cNext");
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = (n) => String(n).padStart(2, "0");
  document.getElementById("cAll").textContent = pad(cards.length);
  cards.forEach((c, k) => c.style.setProperty("--k", Math.abs(idx[k])));

  let R = 0, step = 0, cur = 0, target = 0, raf = 0, active = null;
  const measure = () => {
    const cs = getComputedStyle(area.parentElement);
    R = parseFloat(cs.getPropertyValue("--R"));
    step = ((parseFloat(cs.getPropertyValue("--w")) + parseFloat(cs.getPropertyValue("--gap"))) / R) * 180 / Math.PI;
    wheel.style.setProperty("--step", step + "deg");
  };
  // угол колеса → какая карточка по центру (i от lo до hi; повернуть на -i*step)
  const clampDeg = (d) => Math.max(-hi * step, Math.min(-lo * step, d));
  const pick = () => {
    const i = Math.max(lo, Math.min(hi, Math.round(-cur / step)));
    if (i === active) return;
    active = i;
    cards.forEach((c, k) => c.classList.toggle("on", idx[k] === i));
    const k = idx.indexOf(i);
    now.textContent = pad(k + 1);
    name.textContent = cards[k].querySelector("b").textContent;
    bar.style.transform = "translateX(" + k * 100 + "%)";
    prev.disabled = i === lo; next.disabled = i === hi;
  };
  const frame = () => {
    const d = target - cur;
    cur = calm || Math.abs(d) < 0.002 ? target : cur + d * (dragging ? 0.35 : 0.12);
    wheel.style.transform = "rotate(" + cur + "deg)";
    pick();
    raf = cur === target ? 0 : requestAnimationFrame(frame);
  };
  const run = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const go = (i) => { target = -Math.max(lo, Math.min(hi, i)) * step; run(); };
  const snap = (extra) => go(Math.round(-(target + (extra || 0)) / step));

  // считаем от цели, а не от текущего кадра: два быстрых нажатия = два шага
  const want = () => Math.round(-target / step);
  prev.addEventListener("click", () => go(want() - 1));
  next.addEventListener("click", () => go(want() + 1));
  area.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); go(want() - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); go(want() + 1); }
  });
  cards.forEach((c, k) => c.addEventListener("focus", () => go(idx[k])));

  // перетаскивание: карточки идут ровно за пальцем, после отпускания докатываются по инерции до ближайшей
  let dragging = false, down = false, x0 = 0, t0 = 0, moved = 0, lastX = 0, lastT = 0, v = 0;
  const toDeg = (px) => (px / R) * 180 / Math.PI;
  area.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    down = true; moved = 0; x0 = lastX = e.clientX; t0 = target; lastT = performance.now(); v = 0;
  });
  area.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - x0;
    moved = Math.max(moved, Math.abs(dx));
    if (moved < 6) return; // пока это нажатие, а не перетаскивание
    if (!dragging) { dragging = true; area.setPointerCapture(e.pointerId); }
    const t = performance.now();
    v = 0.8 * v + 0.2 * ((e.clientX - lastX) / Math.max(1, t - lastT));
    lastX = e.clientX; lastT = t;
    target = clampDeg(t0 + toDeg(dx)); run();
  });
  const up = () => {
    if (!down) return;
    down = false;
    if (dragging) { dragging = false; snap(toDeg(v * 220)); }
  };
  area.addEventListener("pointerup", up);
  area.addEventListener("pointercancel", up);
  // потянули — кейс не открываем
  wheel.addEventListener("click", (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

  // горизонтальная прокрутка тачпадом / Shift+колесо; вертикальную не трогаем — страница листается как обычно
  let wheelT = 0;
  area.addEventListener("wheel", (e) => {
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (!dx) return;
    e.preventDefault();
    target = clampDeg(target - toDeg(dx)); run();
    clearTimeout(wheelT); wheelT = setTimeout(() => snap(), 140);
  }, { passive: false });

  measure(); cur = target = 0; frame();
  let rw = 0;
  addEventListener("resize", () => { clearTimeout(rw); rw = setTimeout(() => { const i = active; measure(); active = null; cur = target = -i * step; frame(); }, 120); });
})();

