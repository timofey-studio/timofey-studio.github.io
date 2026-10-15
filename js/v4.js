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
  const pics = Array.from(document.querySelectorAll(".sp-media > img:not(.me-photo)"));
  if (pics.length && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const vis = new Set();
    const po = new IntersectionObserver((list) => list.forEach((e) => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target))));
    pics.forEach((p) => { p.style.scale = "1.08"; po.observe(p); });
    let busy = false;
    const move = () => {
      busy = false;
      vis.forEach((p) => { const r = p.parentElement.getBoundingClientRect(); const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; p.style.translate = "0 " + (k * -26).toFixed(1) + "px"; });
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
  cards.forEach((c, k) => {
    c.style.setProperty("--k", Math.abs(idx[k]));
    // номер карточки: центр 01, по бокам 02 и 03, по краям 04 и 05 (referens/Расположение.png)
    if (c.dataset.n) { const s = document.createElement("span"); s.className = "num"; s.textContent = c.dataset.n; c.querySelector(".card-in").appendChild(s); }
  });

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
    now.textContent = cards[k].dataset.n || pad(k + 1);
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
  // сайт на компьютере уменьшен (zoom 0.9): координаты мыши переводим в пиксели страницы, чтобы карточки шли ровно за пальцем
  const zk = () => parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
  const toDeg = (px) => (px / R) * 180 / Math.PI;
  area.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    down = true; moved = 0; x0 = lastX = (e.clientX / zk()); t0 = target; lastT = performance.now(); v = 0;
  });
  area.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = (e.clientX / zk()) - x0;
    moved = Math.max(moved, Math.abs(dx));
    if (moved < 6) return; // пока это нажатие, а не перетаскивание
    if (!dragging) { dragging = true; area.setPointerCapture(e.pointerId); }
    const t = performance.now();
    v = 0.8 * v + 0.2 * (((e.clientX / zk()) - lastX) / Math.max(1, t - lastT));
    lastX = (e.clientX / zk()); lastT = t;
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

// Меню на телефоне и планшете: кнопка открывает список разделов, заявку, Telegram и канал
(function () {
  const btn = document.getElementById("burger"), nav = document.getElementById("mnav");
  if (!btn || !nav) return;
  const set = (open) => {
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    document.body.classList.toggle("menu-open", open);
    if (open) { nav.hidden = false; requestAnimationFrame(() => nav.classList.add("open")); }
    else { nav.classList.remove("open"); setTimeout(() => { if (btn.getAttribute("aria-expanded") === "false") nav.hidden = true; }, 350); }
  };
  btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") set(false); });
  addEventListener("resize", () => { if (innerWidth > 1100 && btn.getAttribute("aria-expanded") === "true") set(false); });
})();

// Главный экран: строки направлений подсвечиваются по очереди (наведение: сразу нужная строка и пауза)
(function () {
  const list = document.getElementById("offer");
  if (!list) return;
  const li = Array.from(list.children), T = 3200;
  let at = -1, paused = false;
  list.style.setProperty("--t", T / 1000 + "s");
  const show = (k) => { at = k; li.forEach((x, n) => x.classList.toggle("on", n === k)); };
  const next = () => { if (!paused) show((at + 1) % li.length); setTimeout(next, T); };
  setTimeout(next, 1700); // после появления текста
  li.forEach((x, k) => {
    x.addEventListener("mouseenter", () => { paused = true; show(k); });
    x.addEventListener("mouseleave", () => { paused = false; });
  });
})();

// «Четыре направления»: строка списка и её сцена подсвечиваются вместе (по очереди сами, при наведении нужная)
(function () {
  const box = document.getElementById("scenes"), dirs = document.getElementById("dirs");
  if (!box || !dirs) return;
  const sc = Array.from(box.querySelectorAll(".sc")), rows = Array.from(dirs.querySelectorAll("li"));
  let at = -1, hold = false;
  const show = (k) => {
    at = k;
    box.classList.toggle("has-on", k >= 0);
    sc.forEach((s, n) => s.classList.toggle("on", n === k));
    rows.forEach((r, n) => r.classList.toggle("on", n === k));
  };
  [...sc, ...rows].forEach((el) => {
    el.addEventListener("mouseenter", () => { hold = true; show(+el.dataset.k); });
    el.addEventListener("mouseleave", () => { hold = false; });
  });
  setInterval(() => { if (!hold && !dirs.querySelector("li.open") && box.classList.contains("in")) show((at + 1) % sc.length); }, 2600);
  // лайки в сцене «Личный бренд» растут, когда сцену видно
  const cnt = box.querySelector(".cnt");
  if (cnt && "IntersectionObserver" in window) {
    let n = 0, run = 0;
    new IntersectionObserver(([e]) => {
      clearInterval(run);
      if (!e.isIntersecting) return;
      run = setInterval(() => { n = n >= +cnt.dataset.to ? 120 : n + 3; cnt.textContent = n; }, 60);
    }).observe(cnt);
  }
})();

// «Четыре направления»: по нажатию на строку её описание выезжает вбок (на компьютере) или раскрывается у строки (на телефоне).
// Открыли другое: прежнее плавно уезжает обратно. Закрывают крестик, повторное нажатие, Esc и клик мимо.
(function () {
  const dirs = document.getElementById("dirs"), tpl = document.getElementById("dirPop");
  if (!dirs || !tpl) return;
  const rows = Array.from(dirs.querySelectorAll("li"));
  let cur = null;
  const pops = rows.map((li) => {
    const p = tpl.cloneNode(true);
    p.removeAttribute("id"); p.removeAttribute("hidden");
    p.querySelector(".dp-t").textContent = li.querySelector("b").textContent;
    p.querySelector(".dp-p").innerHTML = li.dataset.about; // текст свой, из разметки сайта
    p.setAttribute("aria-label", li.querySelector("b").textContent);
    p.querySelector(".dp-x").addEventListener("click", (e) => { e.stopPropagation(); close(true); });
    p.querySelector(".dp-go").addEventListener("click", () => close());
    dirs.appendChild(p);
    return p;
  });
  tpl.remove();
  const place = (li, p) => {
    const k = rows.indexOf(li), side = innerWidth > 1100, low = k >= rows.length / 2;
    p.classList.toggle("side", side);
    p.classList.toggle("inline", !side);
    p.style.top = p.style.bottom = "";
    if (side) {
      if (p.parentNode !== dirs || p.previousElementSibling === li) dirs.appendChild(p);
      p.style.top = (low ? li.offsetTop + li.offsetHeight - p.offsetHeight : li.offsetTop) + "px";
    } else if (li.nextElementSibling !== p) li.after(p); // на телефоне окошко стоит прямо под своей строкой
  };
  function close(focus) {
    if (!cur) return;
    const li = cur; cur = null;
    li.classList.remove("open"); li.setAttribute("aria-expanded", "false");
    pops[rows.indexOf(li)].classList.remove("show");
    if (focus) li.focus();
  }
  const open = (li) => {
    if (cur === li) { close(true); return; }
    close();
    const p = pops[rows.indexOf(li)];
    place(li, p);
    cur = li;
    li.classList.add("open"); li.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => p.classList.add("show"));
  };
  rows.forEach((li) => {
    li.setAttribute("aria-expanded", "false");
    li.addEventListener("click", () => open(li));
    li.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(li); } });
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(true); });
  document.addEventListener("click", (e) => { if (cur && !pops.some((p) => p.contains(e.target)) && !cur.contains(e.target)) close(); });
  addEventListener("resize", () => { if (cur) place(cur, pops[rows.indexOf(cur)]); });
})();

// Вопросы: фото рядом ровно от строки «04 · Вопросы» до последней черты списка (считаем по закрытым вопросам, чтобы фото не прыгало)
(function () {
  const sec = document.getElementById("faq");
  if (!sec) return;
  const media = sec.querySelector(".sp-media"), meta = sec.querySelector(".sp-meta"), list = sec.querySelector(".faq-list");
  const top = (el) => { let y = 0; for (let e = el; e && e !== sec; e = e.offsetParent) y += e.offsetTop; return y; };
  const fit = () => {
    if (innerWidth <= 1100) { media.style.marginTop = media.style.height = ""; return; }
    const y0 = top(meta);
    let y1 = top(list);
    list.querySelectorAll("details").forEach((d) => { y1 += d.querySelector("summary").offsetHeight + 1; });
    media.style.marginTop = y0 + "px";
    media.style.height = Math.max(300, y1 - y0) + "px";
  };
  fit();
  addEventListener("load", fit);
  addEventListener("resize", fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();

// Вопросы: ответ раскрывается и сворачивается плавно; открыт только один
(function () {
  const all = Array.from(document.querySelectorAll(".faq-list details"));
  if (!all.length) return;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  all.forEach((d) => d.removeAttribute("name")); // за «один открытый» отвечаем сами — так можно анимировать закрытие
  const anim = new Map();
  const toggle = (d, open) => {
    const sum = d.querySelector("summary");
    if (anim.has(d)) anim.get(d).cancel();
    const from = d.offsetHeight;
    if (open) d.open = true;
    const to = open ? d.scrollHeight : sum.offsetHeight;
    if (calm) { if (!open) d.open = false; return; }
    d.style.overflow = "hidden";
    const a = d.animate({ height: [from + "px", to + "px"] }, { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
    anim.set(d, a);
    a.onfinish = () => { anim.delete(d); if (!open) { d.open = false; d.classList.remove("closing"); } d.style.overflow = ""; };
    a.oncancel = () => anim.delete(d);
  };
  all.forEach((d) => {
    d.querySelector("summary").addEventListener("click", (e) => {
      e.preventDefault();
      const willOpen = !d.open || d.classList.contains("closing");
      d.classList.toggle("closing", !willOpen);
      if (willOpen) all.forEach((x) => { if (x !== d && x.open) { x.classList.add("closing"); toggle(x, false); } });
      toggle(d, willOpen);
      if (willOpen) d.classList.remove("closing");
    });
  });
})();

// Отзывы: опубликованные (одобренные в Telegram-боте) берём у сервера заявок; пока их нет, остаётся «станьте первым»
(function () {
  const list = document.getElementById("rvList");
  if (!list || !window.fetch) return;
  const plural = (n, a, b, c) => (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
  const month = (d) => { try { return new Date(d).toLocaleDateString("ru-RU", { month: "long", year: "numeric" }); } catch (e) { return ""; } };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  fetch("https://chesh-leads.chesh.workers.dev/reviews").then((r) => r.json()).then((d) => {
    const items = (d && d.reviews) || [];
    if (!items.length) return;
    // всё, что написал клиент, вставляем только как текст: никакой HTML из отзыва не выполнится
    items.slice(0, 9).forEach((it) => {
      const card = el("figure", "rv-card");
      const st = el("div", "rv-stars", "★".repeat(it.rating)); st.setAttribute("aria-label", "Оценка " + it.rating + " из 5"); st.appendChild(el("span", null, "★".repeat(5 - it.rating)));
      const who = el("figcaption", "rv-who"), ava = el("span", "rv-ava", (it.name || "?").trim().charAt(0).toUpperCase()), t = el("span");
      ava.setAttribute("aria-hidden", "true"); t.appendChild(el("b", null, it.name)); t.appendChild(document.createTextNode([it.business, month(it.date)].filter(Boolean).join(" · ")));
      who.append(ava, t); card.append(st, el("blockquote", null, it.text), who);
      if (it.answer) { const a = el("div", "rv-answer"); a.append(el("b", null, "Ответ Тимофея"), el("p", null, it.answer)); card.appendChild(a); }
      list.appendChild(card);
    });
    list.hidden = false;
    document.getElementById("rvRules").hidden = false;
    document.getElementById("rvFirst").querySelector("h3").textContent = "Хотите так же? Уже " + items.length + " " + plural(items.length, "отзыв", "отзыва", "отзывов");
  }).catch(() => {});
})();
