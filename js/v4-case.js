// Страница кейса: фото открываются крупно. Группы по data-lb, номер в группе — data-i.
// Стрелки на экране и клавиатуре, Esc и клик по фону закрывают, на телефоне листается свайпом.
"use strict";
(function () {
  const lb = document.getElementById("lb");
  if (!lb) return;
  const img = lb.querySelector("img"), cap = lb.querySelector(".lb-cap"), num = lb.querySelector(".lb-n");
  // собираем группы: одна и та же картинка может стоять на странице дважды (верх и сетка), берём по data-i
  const groups = {};
  document.querySelectorAll("[data-lb]").forEach((b) => {
    const g = (groups[b.dataset.lb] = groups[b.dataset.lb] || []), i = +b.dataset.i, im = b.querySelector("img");
    if (!g[i]) g[i] = { src: im.currentSrc || im.src, alt: im.alt };
  });
  let list = [], at = 0, last = null;
  const show = (i) => {
    at = (i + list.length) % list.length;
    img.style.opacity = 0;
    const it = list[at], pre = new Image();
    pre.onload = pre.onerror = () => { img.src = it.src; img.alt = it.alt; img.style.opacity = 1; };
    pre.src = it.src;
    cap.textContent = it.alt; num.textContent = at + 1 + " / " + list.length;
    lb.querySelector(".lb-prev").hidden = lb.querySelector(".lb-next").hidden = list.length < 2;
  };
  const open = (b) => {
    last = b; list = groups[b.dataset.lb].filter(Boolean);
    lb.hidden = false; document.body.style.overflow = "hidden";
    show(+b.dataset.i);
    requestAnimationFrame(() => lb.classList.add("open"));
    lb.querySelector(".lb-x").focus();
  };
  const close = () => {
    lb.classList.remove("open"); document.body.style.overflow = "";
    setTimeout(() => { lb.hidden = true; }, 300);
    if (last) last.focus();
  };
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-lb]"); if (b) open(b); });
  lb.querySelector(".lb-x").addEventListener("click", close);
  lb.querySelector(".lb-prev").addEventListener("click", () => show(at - 1));
  lb.querySelector(".lb-next").addEventListener("click", () => show(at + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  document.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(at - 1);
    if (e.key === "ArrowRight") show(at + 1);
  });
  let x0 = null;
  lb.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
  });
})();
