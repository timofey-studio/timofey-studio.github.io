// CHESH — скрипты сайта. Каждая часть запускается, только если её блок есть на странице.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isLight = () => document.documentElement.getAttribute("data-theme") === "light";

// Медиа кейсов: видео (тёмная и светлая версии) и листалка карточек.
// Тексты кейсов — на страницах case-*.html, их собирает site-tools/build_pages.py.
const CASES_DATA = [
  {
    id: "fadepoint-bot",
    video: {
      dark: { src: "video/fadepoint-bot.mp4", poster: "video/fadepoint-bot-poster.jpg" },
      light: { src: "video/fadepoint-bot-light.mp4", poster: "video/fadepoint-bot-light-poster.jpg" }
    }
  },
  {
    id: "zerno-redesign",
    video: {
      dark: { src: "video/zerno-demo.mp4", poster: "video/zerno-demo-poster.jpg" },
      light: { src: "video/zerno-demo-light.mp4", poster: "video/zerno-demo-light-poster.jpg" }
    }
  },
  {
    id: "marketplace-cards",
    // картинки: img/cards/<id>-0.jpg — «было», -1…-3 — слайды «стало» (исходники — Cowork/cards)
    gallery: {
      products: [
        { id: "mug", name: "Кружка" },
        { id: "coffee", name: "Кофе" },
        { id: "sneakers", name: "Кроссовки" },
        { id: "serum", name: "Сыворотка" }
      ]
    }
  }
];

let currentActiveIndex = 0;

// Карточка-перевёртыш
const flipCard = document.getElementById("profileFlipCard");
function toggleProfileCard() {
  const flipped = flipCard.classList.toggle("flipped");
  flipCard.setAttribute("aria-pressed", String(flipped));
}
if (flipCard) {
  flipCard.addEventListener("click", toggleProfileCard);
  flipCard.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleProfileCard(); }
  });
}

// Превью кейсов на главной: на телефоне ряд листается вбок, подсказка «листай →» — под рядом, пока справа есть ещё
function initCasePreviews() {
  document.querySelectorAll(".pv-scroll").forEach((box) => {
    const row = box.querySelector(".pv-row, .flow");
    if (!row) return;
    const more = () => box.classList.toggle("more", row.scrollWidth - row.clientWidth - row.scrollLeft > 8);
    row.addEventListener("scroll", more, { passive: true });
    addEventListener("resize", more);
    if (document.fonts) document.fonts.ready.then(more);
    more();
  });
}

// Страница кейса: оживляем видео или листалку карточек
function initCasePage() {
  const id = document.body.dataset.case;
  const i = CASES_DATA.findIndex((c) => c.id === id);
  if (i < 0) return;
  currentActiveIndex = i;
  if (document.getElementById("caseVideo")) { initCaseVideo(); syncCaseVideo(); }
  if (CASES_DATA[i].gallery && document.getElementById("cardsView")) initCardsView(CASES_DATA[i].gallery);
}

// ===== Кейс 03: листалка карточек — товар, «было / стало», слайды =====
// При первом показе и при смене товара сначала видно «было», через секунду полоса «пересобирает» карточку в «стало».
let cardsWatch = null;
function initCardsView(g) {
  const root = document.getElementById("cardsView");
  const stage = document.getElementById("cvStage"), frame = document.getElementById("cvFrame");
  const track = document.getElementById("cvTrack"), before = document.getElementById("cvBefore");
  const imgs = Array.from(track.querySelectorAll("img")), dots = Array.from(document.querySelectorAll("#cvDots i"));
  const tabs = Array.from(root.querySelectorAll(".cv-prod button")), toggle = document.getElementById("cvToggle");
  const badge = document.getElementById("cvBadge"), prev = document.getElementById("cvPrev"), next = document.getElementById("cvNext");
  const src = (id, n) => `img/cards/${id}-${n}.jpg?v=3`; // ?v= — новая версия карточек, чтобы браузер не показал старые из кэша
  let p = 0, slide = 0, after = false, autoTimer = null, seen = false, token = 0;
  const HOLD = 2200; // столько «было» стоит на экране, прежде чем карточка пересоберётся

  const setAfter = (on, animate = true) => {
    after = on;
    stage.classList.toggle("after", on);
    frame.classList.toggle("is-after", on);
    toggle.classList.toggle("is-before", !on);
    toggle.classList.toggle("is-after", on);
    toggle.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.v === "after") === on)));
    badge.textContent = on ? "стало" : "было";
    if (animate && !reduceMotion) { stage.classList.add("moving"); setTimeout(() => stage.classList.remove("moving"), 850); }
  };
  const go = (n) => {
    slide = Math.max(0, Math.min(imgs.length - 1, n));
    track.style.transform = `translateX(${-slide * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle("on", i === slide));
    prev.disabled = slide === 0;
    next.disabled = slide === imgs.length - 1;
  };
  // показать товар: сначала спокойно стоит «было», потом полоса пересобирает его в «стало»
  const load = (url) => { const im = new Image(); im.src = url; return (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => url); };
  const show = async (i, demo) => {
    const my = ++token;
    p = i;
    const id = g.products[i].id;
    tabs.forEach((t, k) => t.setAttribute("aria-selected", String(k === i)));
    clearTimeout(autoTimer);
    await load(src(id, 0)); // пока грузится «было» нового товара, на экране остаётся прежняя картинка
    if (my !== token) return;
    stage.classList.add("instant"); // мгновенно, без полосы: сразу «было» нового товара
    setAfter(false, false);
    before.src = src(id, 0);
    before.alt = `${g.products[i].name}: как было`;
    imgs.forEach((im, k) => { im.src = src(id, k + 1); im.alt = `${g.products[i].name}: карточка, слайд ${k + 1}`; });
    go(0);
    void stage.offsetWidth;
    stage.classList.remove("instant");
    if (demo) autoTimer = setTimeout(async () => {
      await load(src(id, 1));
      if (my === token && !after) setAfter(true);
    }, reduceMotion ? 0 : HOLD);
    // заранее подгружаем следующий товар, чтобы переключение было мгновенным
    const nx = g.products[(i + 1) % g.products.length].id;
    [0, 1, 2, 3].forEach((n) => load(src(nx, n)));
  };

  tabs.forEach((t, i) => t.addEventListener("click", () => show(i, true)));
  toggle.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { clearTimeout(autoTimer); setAfter(b.dataset.v === "after"); }));
  prev.addEventListener("click", () => go(slide - 1));
  next.addEventListener("click", () => go(slide + 1));
  root.addEventListener("keydown", (e) => {
    if (!after) return;
    if (e.key === "ArrowLeft") go(slide - 1);
    if (e.key === "ArrowRight") go(slide + 1);
  });

  // свайп пальцем или мышкой: влево/вправо — листать; в режиме «было» свайп показывает «стало»
  let x0 = null, y0 = 0, dx = 0;
  stage.addEventListener("pointerdown", (e) => { x0 = e.clientX; y0 = e.clientY; dx = 0; });
  stage.addEventListener("pointermove", (e) => { if (x0 !== null) dx = e.clientX - x0; });
  const end = (e) => {
    if (x0 === null) return;
    const dy = Math.abs(e.clientY - y0);
    x0 = null;
    if (Math.abs(dx) < 40 || dy > Math.abs(dx)) return;
    if (!after) { clearTimeout(autoTimer); setAfter(true); return; }
    go(slide + (dx < 0 ? 1 : -1));
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", () => { x0 = null; });
  stage.addEventListener("click", () => { if (!after && Math.abs(dx) < 5) { clearTimeout(autoTimer); setAfter(true); } });

  // картинки первого товара ставим сразу, а «пересборку» запускаем, когда листалку видно
  show(0, false);
  if (cardsWatch) cardsWatch.disconnect();
  if ("IntersectionObserver" in window && !reduceMotion) {
    cardsWatch = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !seen) { seen = true; autoTimer = setTimeout(() => { if (!after) setAfter(true); }, HOLD); }
    }, { threshold: 0.5 });
    cardsWatch.observe(stage);
  } else setAfter(true, false);
}

let caseVideoWatch = null;
function initCaseVideo() {
  const video = document.getElementById("caseVideo");
  // видео загружается и играет, только пока его видно на экране, — иначе зря тратит трафик и батарею
  if (caseVideoWatch) caseVideoWatch.disconnect();
  if (video && !reduceMotion) {
    if ("IntersectionObserver" in window) {
      caseVideoWatch = new IntersectionObserver(([e]) => { if (e.isIntersecting) video.play().catch(() => {}); else video.pause(); }, { threshold: 0.2 });
      caseVideoWatch.observe(video);
    } else video.play().catch(() => {});
  }
  const btn = document.getElementById("soundBtn");
  const media = document.getElementById("caseMedia");
  const setSound = (on) => {
    video.muted = !on;
    if (on) video.play().catch(() => {});
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", on ? "Выключить звук" : "Включить звук");
  };
  btn.addEventListener("click", () => setSound(video.muted));
  video.addEventListener("click", () => { if (!document.fullscreenElement) setSound(video.muted); });
  // «Развернуть»: видео на весь экран и сразу со звуком (на iPhone — встроенный плеер)
  document.getElementById("expandBtn").addEventListener("click", () => {
    setSound(true);
    if (video.requestFullscreen) video.requestFullscreen().catch(() => {});
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  });
  video.addEventListener("fullscreenchange", () => { video.controls = document.fullscreenElement === video; });
  // Наклон за мышкой
  if (!reduceMotion) {
    const glass = media.querySelector(".phone-glass");
    media.addEventListener("pointermove", (e) => {
      const r = glass.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      glass.style.setProperty("--tx", `${x * 12}deg`);
      glass.style.setProperty("--ty", `${-y * 10}deg`);
    });
    media.addEventListener("pointerleave", () => {
      glass.style.setProperty("--tx", "0deg");
      glass.style.setProperty("--ty", "0deg");
    });
  }
}

// При смене темы — видео другой темы с того же момента, звук сохраняется
function syncCaseVideo() {
  const video = document.getElementById("caseVideo");
  const data = CASES_DATA[currentActiveIndex];
  if (!video || !data.video) return;
  const v = data.video[isLight() ? "light" : "dark"];
  if ((video.getAttribute("src") || "").split("#")[0] === v.src) return;
  const t = video.currentTime, playing = !video.paused;
  video.poster = v.poster;
  video.src = v.src + "#t=" + t.toFixed(2); // сразу с того же момента
  video.addEventListener("canplay", () => {
    if (Math.abs(video.currentTime - t) > 0.5) video.currentTime = t;
    if (playing) video.play().catch(() => {});
  }, { once: true });
}

// Часы на экране ноутбука (по Москве)
function updateClock() {
  const now = new Date();
  const msk = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 3 * 3600000);
  const p = (n) => String(n).padStart(2, "0");
  document.querySelectorAll("[data-clock]").forEach((el) => { el.textContent = `${p(msk.getHours())}:${p(msk.getMinutes())}`; });
}
setInterval(updateClock, 10000);
updateClock();

// ===== Открытие сайта: ноутбук → крышка → экран → печать → телефон с перепиской =====
function initHero() {
  const hero = document.querySelector(".hero");
  const laptop = document.getElementById("laptop");
  const more = document.getElementById("heroMore");
  const winBody = more.parentElement;
  const slot = document.getElementById("heroMoreSlot");
  // На телефоне описание и кнопки — под ноутбуком (на маленьком экране их не прочитать)
  const narrow = window.matchMedia("(max-width: 700px)");
  const place = () => (narrow.matches ? slot : winBody).appendChild(more);
  place();
  narrow.addEventListener ? narrow.addEventListener("change", place) : narrow.addListener(place);

  if (reduceMotion) {
    hero.classList.add("shown", "phone-in", "phone-ready");
    document.querySelector(".p-splash").classList.add("gone");
    laptop.classList.add("open", "on");
    syncPhoneAd(); // без движения — только картинка-постер
    initTyping();
    typePhoneHint();
    return;
  }
  requestAnimationFrame(() => hero.classList.add("shown"));
  setTimeout(() => laptop.classList.add("open"), 350);
  setTimeout(() => hero.classList.add("phone-in"), 550);
  setTimeout(() => laptop.classList.add("on"), 1350);
  setTimeout(() => initTyping().then(startPhoneAd), 1900);
  setTimeout(typePhoneHint, 2100); // подсказка у телефона печатается вместе с заголовком на ноутбуке

  // Лёгкий наклон сцены за мышкой
  const stage = document.getElementById("stage");
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      stage.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      stage.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
    hero.addEventListener("pointerleave", () => { stage.style.setProperty("--px", 0); stage.style.setProperty("--py", 0); });
  }
}

// Подсказка «нажми на телефон — там реклама»: печатается по строчкам, потом рисуется стрелка к телефону
function typePhoneHint() {
  const hint = document.getElementById("phoneHint");
  const l1 = document.getElementById("hintL1"), l2 = document.getElementById("hintL2");
  const caretOff = (el) => el.querySelector(".tw-caret")?.classList.add("off");
  typeText(l1, 45).then(caretOff).then(() => typeText(l2, 45)).then(() => {
    setTimeout(() => caretOff(l2), 700);
    hint.classList.add("drawn");
  });
}

// Реклама в телефоне: когда на ноутбуке допечатался заголовок, заставка с эмблемой уходит и идёт ролик.
// Ролик играет, только пока шапка на экране, — чтобы зря не нагружать компьютер.
function syncPhoneAd(start) {
  const ad = document.getElementById("phoneAd");
  if (!ad) return;
  const sfx = isLight() ? "-light" : "";
  const src = "video/chesh-ad" + sfx + ".mp4";
  const cur = ad.getAttribute("src");
  ad.poster = "video/chesh-ad" + sfx + "-poster.jpg";
  if ((!start && !cur) || cur === src) return; // ещё не запускали — хватит постера
  const t = ad.currentTime, playing = !!cur && !ad.paused;
  ad.preload = "auto";
  ad.src = src;
  if (cur) ad.addEventListener("loadedmetadata", () => { ad.currentTime = t; }, { once: true }); // та же секунда ролика
  if (playing) ad.play().catch(() => {});
}
function startPhoneAd() {
  const hero = document.querySelector(".hero");
  const ad = document.getElementById("phoneAd");
  let shown = false;
  const reveal = () => {
    if (shown) return;
    shown = true;
    hero.classList.add("phone-in", "phone-ready");
    setTimeout(() => document.querySelector(".p-splash").classList.add("gone"), 900);
  };
  syncPhoneAd(true);
  ad.addEventListener("playing", reveal, { once: true });
  setTimeout(reveal, 2500); // если браузер не дал запустить видео — останется постер
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { if (e.isIntersecting) ad.play().catch(() => {}); else ad.pause(); }).observe(hero);
  } else ad.play().catch(() => {});
}

// Копирование контакта (пригодится, когда появятся настоящие контакты)
let toastTimer = null;
function copyContact(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    const toast = document.getElementById("copyToast");
    document.getElementById("toastMsg").textContent = `${label} скопирован: ${text}`;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }).catch(() => alert("Контакт: " + text));
}

// Переключатель темы: запоминаем выбор (если браузер разрешает)
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#f4f1ec" : "#07070a");
  syncCaseVideo();
  syncPhoneAd();
}
document.getElementById("themeToggle").addEventListener("click", () => {
  const next = isLight() ? "dark" : "light";
  applyTheme(next);
  try { localStorage.setItem("theme", next); } catch (e) {}
});

// ===== Печать текста «как с клавиатуры» =====
// Под текстом остаётся невидимая копия — место занято заранее, страница не прыгает.
function typeText(el, speed) {
  return new Promise((resolve) => {
    if (reduceMotion || el.classList.contains("tw") || el.classList.contains("tw-done")) {
      el.classList.add("tw-done");
      return resolve();
    }
    const segments = Array.from(el.childNodes).map((n) => ({ wrap: n.nodeType === 1 ? n.cloneNode(false) : null, text: n.textContent }));
    const full = el.textContent.replace(/\s+/g, " ").trim();
    const ghost = document.createElement("span");
    ghost.className = "tw-ghost";
    ghost.setAttribute("aria-hidden", "true");
    ghost.innerHTML = el.innerHTML;
    const live = document.createElement("span");
    live.className = "tw-live";
    live.setAttribute("aria-hidden", "true");
    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = full;
    const caret = document.createElement("span");
    caret.className = "tw-caret";
    el.innerHTML = "";
    el.append(sr, ghost, live);
    el.classList.add("tw");
    live.appendChild(caret);

    let s = 0, i = 0, node = null;
    const step = () => {
      if (s >= segments.length) { resolve(); return; }
      const seg = segments[s];
      if (!node) {
        node = document.createTextNode("");
        if (seg.wrap) { seg.wrap.appendChild(node); live.insertBefore(seg.wrap, caret); }
        else live.insertBefore(node, caret);
      }
      const ch = seg.text[i];
      node.data += ch;
      i++;
      if (i >= seg.text.length) { s++; i = 0; node = null; }
      // живой ритм: небольшой разброс и паузы после знаков препинания
      let d = speed * (0.6 + Math.random() * 0.8);
      if (/[,.:;—!?]/.test(ch)) d += speed * 3;
      setTimeout(step, d);
    };
    step();
  }).then(() => el);
}

function initTyping() {
  const kicker = document.getElementById("heroKicker");
  const title = document.getElementById("heroTitle");
  const done = () => document.documentElement.classList.add("hero-typed");
  setTimeout(done, 3000); // страховка: остальной текст появится в любом случае

  // Подписи разделов печатаются, когда до них докрутили
  const scrollTyped = document.querySelectorAll('[data-type="scroll"]');
  if (!("IntersectionObserver" in window)) scrollTyped.forEach((el) => el.classList.add("tw-done"));
  else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        typeText(en.target, 28).then((el) => setTimeout(() => el.querySelector(".tw-caret")?.classList.add("off"), 1200));
      });
    }, { threshold: 0.8 });
    scrollTyped.forEach((el) => io.observe(el));
  }

  return typeText(kicker, 15).then((k) => {
    k.querySelector(".tw-caret")?.classList.add("off");
    return new Promise((r) => setTimeout(r, reduceMotion ? 0 : 100));
  }).then(() => typeText(title, 20)).then(done);
}


// ===== Планета: в начале — под ноутбуком; при прокрутке плавно уезжает вправо и уменьшается до среднего размера =====
// Путь растянут на всю страницу. Где браузер умеет анимации по прокрутке — двигает он сам (CSS),
// иначе — скрипт, напрямую от прокрутки, без «догонялок».
function initWorld() {
  const hero = document.querySelector(".hero");
  const world = document.getElementById("world");
  const scene = document.querySelector(".scene");
  const laptop = document.getElementById("laptop");
  const cssTimeline = !!(window.CSS && CSS.supports("animation-timeline: scroll()"));
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const pageTop = (el) => { let t = 0; for (; el; el = el.offsetParent) t += el.offsetTop; return t; };
  let path = null, lastW = 0;

  const measure = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const narrow = vw < 700;
    lastW = vw;
    const D = Math.round(narrow ? vw * 1.5 : Math.min(1150, vw * 0.8));            // размер в начале
    const d1 = narrow ? vw * 0.5 : Math.min(380, vw * 0.27);                       // в конце — средний
    const top0 = pageTop(scene) + scene.offsetHeight * (narrow ? 0.95 : 0.86);     // верх планеты — за низом ноутбука
    const cx1 = vw - d1 * 0.12, cy1 = vh * (narrow ? 0.8 : 0.72);                  // в конце — справа, чуть за краем
    path = { x0: vw / 2 - D / 2, y0: top0, x1: cx1 - D / 2, y1: cy1 - D / 2, s1: d1 / D };
    world.style.width = world.style.height = D + "px";
    world.style.setProperty("--wx0", path.x0.toFixed(1) + "px");
    world.style.setProperty("--wy0", path.y0.toFixed(1) + "px");
    world.style.setProperty("--wx1", path.x1.toFixed(1) + "px");
    world.style.setProperty("--wy1", path.y1.toFixed(1) + "px");
    world.style.setProperty("--ws1", path.s1.toFixed(4));
  };
  const render = () => {
    const y = window.scrollY, vh = window.innerHeight;
    const t = clamp(y / Math.max(1, document.documentElement.scrollHeight - vh));
    const x = path.x0 + (path.x1 - path.x0) * t, yy = path.y0 + (path.y1 - path.y0) * t, sc = 1 + (path.s1 - 1) * t;
    world.style.transform = `translate3d(${x.toFixed(1)}px, ${yy.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
    laptop.style.setProperty("--g", clamp(y / (vh * 0.7)).toFixed(3));   // подсветка контура гаснет сверху вниз
    hero.style.setProperty("--sp", clamp(y / (vh * 0.8)).toFixed(3));
  };
  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; render(); }); } };

  measure();
  if (!cssTimeline) { render(); window.addEventListener("scroll", onScroll, { passive: true }); }
  window.addEventListener("resize", () => {
    // на телефоне при прокрутке прячется адресная строка — меняется только высота; пересчёт не нужен (иначе планета дёрнется)
    if (window.innerWidth === lastW && window.matchMedia("(pointer: coarse)").matches) return;
    measure();
    if (!cssTimeline) render();
  });
  // после загрузки шрифтов и появления ноутбука — пересчитать и показать планету
  setTimeout(() => { measure(); if (!cssTimeline) render(); world.classList.add("ready"); }, reduceMotion ? 0 : 900);
}

// Звёзды на холсте: 90 точек. Дальние — мелкие и медленные, ближние — крупнее и быстрее (глубина).
// Каждая плывёт справа налево и мерцает в своём ритме. В светлой теме — белые, с лёгкой тенью.
function initStars() {
  const cv = document.getElementById("starCanvas");
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext("2d");
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const cool = document.documentElement.getAttribute("data-sky") === "cool";
  const stars = Array.from({ length: document.documentElement.classList.contains("lite") ? 55 : 90 }, (_, k) => {
    const near = k < 24;
    return {
      x: rnd(), y: rnd(),
      r: near ? 0.95 + rnd() * 0.55 : 0.45 + rnd() * 0.4,           // радиус, px
      t: near ? 70 + rnd() * 50 : 170 + rnd() * 110,                 // секунд на пролёт через экран
      c: ((p) => (cool ? (p < 0.15 ? "255, 216, 184" : p < 0.65 ? "176, 204, 255" : "238, 241, 255") : (p < 0.25 ? "255, 216, 184" : "238, 241, 255")))(rnd()),
      glow: near && rnd() < 0.5,
      tw: 2.8 + rnd() * 4.5, ph: rnd() * Math.PI * 2,
    };
  });
  let W = 0, H = 0;
  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  let last = performance.now();
  const draw = (now) => {
    if (!reduceMotion) requestAnimationFrame(draw);
    if (!reduceMotion && now - last < 32) return; // ~30 кадров в секунду — вдвое меньше работы
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, W, H);
    const light = isLight();
    {
      for (const s of stars) {
        if (!reduceMotion) {
          s.x -= dt / s.t;
          if (s.x < -0.02) { s.x = 1.02; s.y = rnd(); }
        }
        const a = reduceMotion ? 0.7 : 0.18 + 0.82 * (0.5 + 0.5 * Math.sin((now / 1000) * (Math.PI * 2 / s.tw) + s.ph));
        const col = light ? "255, 255, 255" : s.c;
        const x = s.x * W, y = s.y * H, r = light ? s.r * 1.25 : s.r;
        // ореол рисуем полупрозрачным кружком побольше — это намного дешевле тени (shadowBlur)
        if (light || s.glow) {
          ctx.fillStyle = light ? `rgba(90, 70, 80, ${(a * 0.22).toFixed(3)})` : `rgba(${col}, ${(a * 0.18).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, light ? r + 1.2 : r * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${col}, ${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  resize();
  window.addEventListener("resize", () => { resize(); if (reduceMotion) draw(performance.now()); });
  requestAnimationFrame(draw);
}

// Карточки «01 / 02 / 03» в «Обо мне»: по нажатию плавно раскрываются (открыта одна за раз)
function initFeatures() {
  const cards = Array.from(document.querySelectorAll(".feature"));
  const setOpen = (card, open) => {
    card.classList.toggle("open", open);
    card.querySelector(".ft-head").setAttribute("aria-expanded", String(open));
    card.querySelector(".ft-more").toggleAttribute("inert", !open);
  };
  cards.forEach((card) => {
    card.querySelector(".ft-head").addEventListener("click", () => {
      const open = !card.classList.contains("open");
      cards.forEach((c) => { if (c !== card) setOpen(c, false); });
      setOpen(card, open);
    });
  });
}

// Спокойное появление блоков при прокрутке
function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) { items.forEach((el) => el.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add("in");
      io.unobserve(el);
      setTimeout(() => { el.style.transitionDelay = ""; }, 1300);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  items.forEach((el, i) => {
    el.style.transitionDelay = (el.classList.contains("feature") ? (i % 3) * 0.1 : 0) + "s";
    io.observe(el);
  });
}

// Подсветка стеклянных карточек под курсором
document.addEventListener("pointermove", (e) => {
  const card = e.target.closest && e.target.closest(".glow");
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty("--mx", `${e.clientX - r.left}px`);
  card.style.setProperty("--my", `${e.clientY - r.top}px`);
});

// ===== Свой курсор: только для мыши, не для телефонов и не при «уменьшении движения» =====
function initCursor() {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!fine || reduceMotion) return;
  const root = document.documentElement;
  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  const label = ring.querySelector(".cursor-label");
  let x = -100, y = -100, rx = -100, ry = -100, started = false;

  document.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    x = e.clientX; y = e.clientY;
    if (!started) { started = true; rx = x; ry = y; root.classList.add("has-cursor"); requestAnimationFrame(loop); }
    root.classList.remove("cursor-out");
    const t = e.target;
    const video = t.closest && t.closest('[data-cursor="video"]');
    const opener = !video && t.closest && t.closest('[data-cursor="open"], [data-cursor="drag"]');
    const isLink = !video && !opener && !!(t.closest && t.closest('a, button, [role="button"], .tab-btn, .glow, .services .chip'));
    if (video) label.textContent = video.muted ? "🔊 звук" : "🔇 тише";
    else if (opener) label.textContent = opener.dataset.cursor === "drag" ? "← листать →" : "открыть ↗";
    root.classList.toggle("cursor-video", !!(video || opener));
    root.classList.toggle("cursor-hover", isLink);
  });
  document.addEventListener("pointerdown", () => root.classList.add("cursor-down"));
  document.addEventListener("pointerup", () => root.classList.remove("cursor-down"));
  document.documentElement.addEventListener("mouseleave", () => root.classList.add("cursor-out"));

  function loop() {
    rx += (x - rx) * 0.18;
    ry += (y - ry) * 0.18;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(loop);
  }
}

// ===== Меню в шапке: подсветка-капсула =====
function initNav() {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  const links = Array.from(nav.querySelectorAll("a"));
  const sections = links.map((a) => { const h = a.getAttribute("href"); return h.startsWith("#") ? document.querySelector(h) : null; });
  const fixed = nav.querySelector('a[aria-current="page"]'); // на странице кейса — «Кейсы»
  const ind = document.createElement("span");
  ind.className = "nav-ind";
  ind.setAttribute("aria-hidden", "true");
  nav.prepend(ind);
  let current = null;
  const moveTo = (a) => {
    if (!a) { ind.style.opacity = 0; return; }
    if (ind.style.opacity !== "1") ind.style.transition = "opacity 0.3s ease"; // первый раз — без «приезда» слева
    ind.style.width = a.offsetWidth + "px";
    ind.style.transform = `translateX(${a.offsetLeft}px)`;
    ind.style.opacity = 1;
    requestAnimationFrame(() => (ind.style.transition = ""));
  };
  links.forEach((a) => a.addEventListener("mouseenter", () => moveTo(a)));
  nav.addEventListener("mouseleave", () => moveTo(current));
  const update = () => {
    const y = innerHeight * 0.4;
    let found = null;
    sections.forEach((sec, i) => { if (!sec) return; const r = sec.getBoundingClientRect(); if (r.top <= y && r.bottom > y) found = links[i]; });
    found = found || fixed;
    if (found === current) return;
    current = found;
    links.forEach((a) => a.classList.toggle("on", a === found));
    if (!nav.matches(":hover")) moveTo(found);
  };
  let queued = false;
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; update(); }); } }, { passive: true });
  addEventListener("resize", () => moveTo(current));
  if (document.fonts) document.fonts.ready.then(() => moveTo(current));
  update();
}

// ===== Меню на телефоне: кнопка ≡ открывает панель со всеми разделами и кейсами =====
function initMobileMenu() {
  const btn = document.getElementById("menuBtn"), panel = document.getElementById("mnav");
  if (!btn || !panel) return;
  const root = document.documentElement;
  let timer = null;
  const set = (open) => {
    clearTimeout(timer);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    if (open) { panel.hidden = false; requestAnimationFrame(() => root.classList.add("menu-open")); }
    else { root.classList.remove("menu-open"); timer = setTimeout(() => { panel.hidden = true; }, reduceMotion ? 0 : 350); }
  };
  btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
  panel.addEventListener("click", (e) => { if (e.target.closest("a") || e.target === panel) set(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") { set(false); btn.focus(); } });
  window.matchMedia("(min-width: 981px)").addEventListener?.("change", (m) => { if (m.matches) set(false); });
}

// ===== Частые вопросы: открывается один ответ за раз =====
function initFaq() {
  const items = Array.from(document.querySelectorAll(".faq-item"));
  items.forEach((it) => it.addEventListener("toggle", () => { if (it.open) items.forEach((o) => { if (o !== it) o.open = false; }); }));
}

// ===== Нажал на телефон — он крутится вокруг своей оси и встаёт по центру, в нём идёт ролик =====
// (на мобильных под ноутбуком подсказка со стрелкой, на компьютере курсор над телефоном пишет «открыть»)
function initPhoneZoom() {
  const wrap = document.querySelector(".phone-wrap");
  const overlay = document.getElementById("adOverlay");
  const fly = document.getElementById("adFly");
  const hint = document.getElementById("phoneHint");
  let anim = null, isOpen = false;
  wrap.classList.add("zoomable");
  wrap.setAttribute("role", "button");
  wrap.setAttribute("tabindex", "0");
  wrap.setAttribute("aria-label", "Открыть рекламу в телефоне крупно");

  // как сейчас повёрнут маленький телефон (на компьютере он ещё чуть наклоняется за мышкой)
  const tilt = () => {
    if (window.matchMedia("(max-width: 1100px)").matches) return [-18, 4];
    const st = getComputedStyle(document.getElementById("stage"));
    const px = parseFloat(st.getPropertyValue("--px")) || 0, py = parseFloat(st.getPropertyValue("--py")) || 0;
    return [-18 + px * 3, 4 - py * 2];
  };
  // из маленького телефона — в большой по центру, с оборотом вокруг своей оси.
  // Перспектива та же, что у телефона на месте, поэтому в начале и в конце он совпадает с ним без рывка.
  const frames = () => {
    const a = wrap.getBoundingClientRect(), b = fly.getBoundingClientRect();
    const k = a.width / b.width;
    const dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2);
    const persp = (parseFloat(getComputedStyle(wrap).perspective) || 1400) / k;
    const [ry, rx] = tilt();
    const from = `translate(${dx}px, ${dy}px) scale(${k}) perspective(${persp}px) rotateY(${ry}deg) rotateX(${rx}deg)`;
    const to = (spin) => `translate(0px, 0px) scale(1) perspective(1600px) rotateY(${spin}deg) rotateX(0deg)`;
    if (reduceMotion) return [{ transform: from, opacity: 0 }, { transform: to(0), opacity: 1 }];
    return [{ transform: from }, { transform: to(360) }];
  };
  // задняя крышка телефона с логотипом — её видно, пока он крутится
  const back = () => {
    const el = document.createElement("div");
    el.className = "ad-back";
    el.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><use href="#logo"/></svg>';
    return el;
  };
  function open() {
    if (isOpen) return;
    isOpen = true;
    const src = document.getElementById("phoneAd");
    const phone = wrap.querySelector(".phone").cloneNode(true);
    const splash = phone.querySelector(".p-splash");
    if (splash) splash.remove();
    const v = phone.querySelector("video");
    v.removeAttribute("id");
    if (anim) anim.cancel();
    fly.replaceChildren(phone, back());
    overlay.hidden = false;
    document.documentElement.classList.add("ad-open");
    document.documentElement.classList.remove("cursor-video"); // кружок «открыть» больше не нужен
    if (hint) hint.classList.add("seen");
    if (v.getAttribute("src")) {
      const t = src.currentTime;
      v.preload = "auto";
      v.muted = true;
      v.addEventListener("loadedmetadata", () => { v.currentTime = t; }, { once: true });
      v.play().catch(() => {});
      src.pause();
    }
    wrap.style.visibility = "hidden";
    anim = fly.animate(frames(), { duration: reduceMotion ? 300 : 1300, easing: "cubic-bezier(0.6, 0, 0.2, 1)", fill: "both" });
    requestAnimationFrame(() => overlay.classList.add("open"));
  }
  function close() {
    if (!isOpen || !anim) return;
    isOpen = false;
    const src = document.getElementById("phoneAd");
    const v = fly.querySelector("video");
    // маленький телефон (пока скрыт) сразу идёт в ногу с большим — в момент подмены картинка совпадает
    if (v && src.getAttribute("src")) { src.currentTime = v.currentTime; src.play().catch(() => {}); }
    overlay.classList.remove("open");
    anim.reverse();
    anim.onfinish = () => {
      if (isOpen) return;
      overlay.hidden = true;
      fly.replaceChildren();
      wrap.style.visibility = "";
      document.documentElement.classList.remove("ad-open");
      if (src.getAttribute("src")) src.play().catch(() => {});
    };
  }
  // пока телефон открыт, страница под ним не прокручивается (без отключения полосы прокрутки — иначе экран дёргается)
  const stop = (e) => e.preventDefault();
  overlay.addEventListener("wheel", stop, { passive: false });
  overlay.addEventListener("touchmove", stop, { passive: false });
  wrap.addEventListener("click", open);
  wrap.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  overlay.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

// ===== Вкладка: ушёл на другую — ниндзя зовёт обратно, вернулся — «С возвращением!» =====
function initTabTitle() {
  const base = document.title;
  let timer = null;
  document.addEventListener("visibilitychange", () => {
    clearTimeout(timer);
    if (document.hidden) { document.title = "🥷 Не прячьтесь, вернитесь!"; return; }
    document.title = "👋 С возвращением!";
    timer = setTimeout(() => (document.title = base), 2000);
  });
}

// ===== Заявка: форма → посредник на Cloudflare (worker/chesh-leads.js) → сообщение Тимофею в Telegram =====
// Если посредник недоступен — запасной путь: открываем Telegram с готовым текстом заявки.
const LEAD_ENDPOINT = "https://chesh-leads.chesh.workers.dev"; // посредник на Cloudflare
const TG_USER = "Tim_HellRide"; // Telegram Тимофея без @
function initLead() {
  const box = document.getElementById("lead");
  const form = document.getElementById("leadForm");
  const msg = document.getElementById("leadMsg");
  const send = document.getElementById("leadSend");
  const tgBtn = document.getElementById("tgBtn");
  const field = (n) => form.querySelector(`[name="${n}"]`);
  const pick = Array.from(document.querySelectorAll("#leadPick button"));
  const opened = Date.now();

  document.querySelectorAll("[data-lead-msg]").forEach((a) => a.addEventListener("click", () => {
    const m = field("message");
    if (!m.value.trim()) m.value = a.dataset.leadMsg;
  }));
  if (TG_USER) { tgBtn.href = "https://t.me/" + TG_USER; document.getElementById("tgUser").textContent = "@" + TG_USER; }
  else tgBtn.hidden = true;
  pick.forEach((b) => b.addEventListener("click", () => b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"))));
  form.addEventListener("input", (e) => { const c = e.target.closest(".consent"); if (c) c.classList.remove("bad"); msg.textContent = ""; });

  // Проверка полей прямо при вводе: под полем подсказка, что не так; зелёная рамка — всё верно.
  // То же самое ещё раз проверяет посредник на сервере, так что обойти проверку на странице бесполезно.
  const RULES = {
    name: (v) => v.length < 2 ? "Напишите имя — хотя бы 2 буквы"
      : /[^A-Za-zА-Яа-яЁё\s'’-]/.test(v) ? "В имени — только буквы, пробел и дефис" : "",
    contact: (v) => {
      if (v.length < 3) return "Напишите, как с вами связаться: @ник, телефон или почту";
      const tg = /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(v);
      const digits = v.replace(/\D/g, "");
      const phone = /^\+?[\d\s()-]{7,}$/.test(v) && digits.length >= 10 && digits.length <= 12;
      const mail = /^[^\s@<>]+@[^\s@<>]+\.[A-Za-zА-Яа-я]{2,}$/.test(v);
      return tg || phone || mail ? "" : "Похоже на опечатку. Например: @anna_coffee, +7 900 123-45-67 или anna@mail.ru";
    },
    message: (v) => /https?:\/\/|www\./i.test(v) ? "Ссылки здесь не нужны — пришлёте их потом в переписке"
      : /[<>]/.test(v) ? "Символы < и > здесь не нужны" : "",
  };
  const check = (n, live) => {
    const el = field(n), f = el.closest(".field"), v = el.value.trim();
    if ((live || n === "message") && !v) { f.classList.remove("bad", "ok"); return true; } // пустое поле во время ввода не ругаем
    const err = RULES[n](v);
    f.classList.toggle("bad", !!err);
    f.classList.toggle("ok", !err);
    f.querySelector(".err").textContent = err;
    return !err;
  };
  ["name", "contact", "message"].forEach((n) => {
    const el = field(n);
    el.addEventListener("blur", () => check(n, true));
    el.addEventListener("input", () => { if (el.closest(".field").classList.contains("bad")) check(n, true); });
  });
  const count = form.querySelector(".count");
  field("message").addEventListener("input", (e) => { const l = e.target.value.length; count.textContent = l > 700 ? l + " / 1000" : ""; });

  const state = (name) => { box.classList.remove("sent", "fallback"); if (name) box.classList.add(name); };
  const textOf = (d) => [
    "Здравствуйте! Заявка с сайта CHESH",
    "Имя: " + d.name,
    "Связь: " + d.contact,
    d.services.length ? "Нужно: " + d.services.join(", ") : "",
    d.message ? "Задача: " + d.message : "",
  ].filter(Boolean).join("\n");
  const fallback = (d) => {
    const text = textOf(d);
    document.getElementById("leadFbBtn").href = "https://t.me/" + TG_USER + "?text=" + encodeURIComponent(text);
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {}); // на всякий случай текст и в буфере
    state("fallback");
  };
  document.getElementById("leadBack").addEventListener("click", () => state(null));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = {
      name: field("name").value.trim(),
      contact: field("contact").value.trim(),
      services: pick.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.textContent),
      message: field("message").value.trim(),
      website: field("website").value, // ловушка для ботов: человек это поле не видит
    };
    const okAll = [check("name"), check("contact"), check("message")].every(Boolean);
    if (!okAll) { msg.textContent = "Проверьте поля, отмеченные красным, — под ними подсказка"; form.querySelector(".field.bad input, .field.bad textarea").focus(); return; }
    if (!field("agree").checked) { document.getElementById("leadConsent").classList.add("bad"); msg.textContent = "Поставьте галочку согласия — без неё не могу принять заявку"; return; }
    msg.textContent = "";
    if (d.website || Date.now() - opened < 2500) { state("sent"); return; } // это бот — делаем вид, что всё хорошо
    if (!LEAD_ENDPOINT) { fallback(d); return; }

    send.disabled = true;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const r = await fetch(LEAD_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d), signal: ctrl.signal });
      clearTimeout(timer);
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || r.status);
      document.getElementById("leadWho").textContent = d.contact;
      form.reset();
      pick.forEach((b) => b.setAttribute("aria-pressed", "false"));
      state("sent");
    } catch (err) {
      fallback(d);
    } finally {
      send.disabled = false;
    }
  });
}

// ===== Если компьютер не тянет (меньше ~45 кадров в секунду) — сами включаем облегчённый режим =====
function initAutoLite() {
  const root = document.documentElement;
  if (root.classList.contains("lite") || /[?&]lite=0/.test(location.search) || reduceMotion) return;
  const sample = (again) => {
    if (document.hidden) { setTimeout(() => sample(again), 3000); return; }
    let n = 0;
    const t0 = performance.now();
    const tick = (now) => {
      n++;
      if (now - t0 < 2000) { requestAnimationFrame(tick); return; }
      if (document.hidden) return;
      if (n / ((now - t0) / 1000) < 45) root.classList.add("lite");
      else if (again) setTimeout(() => sample(false), 15000); // ещё одна проверка чуть позже — на всякий случай
    };
    requestAnimationFrame(tick);
  };
  setTimeout(() => sample(true), 6000); // когда ноутбук уже открылся и заголовок напечатался
}

// ===== Отзывы на главной: берём одобренные у посредника; пока их нет — остаётся «станьте первым» =====
const plural = (n, one, few, many) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);
async function initReviews() {
  const box = document.querySelector(".reviews"), list = document.getElementById("rvList");
  if (!box || !list || !LEAD_ENDPOINT) return;
  let items = [];
  try {
    const r = await fetch(LEAD_ENDPOINT + "/reviews");
    items = (await r.json()).reviews || [];
  } catch (e) { return; }
  if (!items.length) return;
  const month = (d) => { try { return new Date(d).toLocaleDateString("ru-RU", { month: "long", year: "numeric" }); } catch (e) { return ""; } };
  // всё, что написал клиент, вставляем только как текст — никакой HTML из отзыва не выполнится
  items.slice(0, 6).forEach((it) => {
    const card = document.createElement("figure");
    card.className = "rv-card";
    const stars = document.createElement("div");
    stars.className = "rv-stars";
    stars.setAttribute("aria-label", `Оценка ${it.rating} из 5`);
    stars.textContent = "★".repeat(it.rating);
    const empty = document.createElement("span");
    empty.textContent = "★".repeat(5 - it.rating);
    stars.append(empty);
    const q = document.createElement("blockquote");
    q.textContent = it.text;
    const who = document.createElement("figcaption");
    who.className = "rv-who";
    who.innerHTML = '<span class="rv-ava" aria-hidden="true"></span><span><b></b><span></span></span>';
    who.querySelector(".rv-ava").textContent = (it.name || "?").trim().charAt(0).toUpperCase();
    who.querySelector("b").textContent = it.name;
    who.querySelector("span > span").textContent = [it.business, month(it.date)].filter(Boolean).join(" · ");
    card.append(stars, q, who);
    list.append(card);
  });
  list.hidden = false;
  box.querySelector(".rv-honest").hidden = false;
  box.classList.add("has");
  document.getElementById("rvTitle").textContent = `Что говорят клиенты · ${items.length} ${plural(items.length, "отзыв", "отзыва", "отзывов")}`;
  document.getElementById("rvBtnText").textContent = "Хочу так же";
}

// ===== Страница отзыва по личной ссылке (review.html?c=…) =====
async function initReviewPage() {
  const form = document.getElementById("reviewForm"), box = document.getElementById("reviewBox");
  const code = new URLSearchParams(location.search).get("c") || "";
  const state = (name) => box.setAttribute("data-state", name);
  const f = (n) => form.querySelector(`[name="${n}"]`);
  const msg = document.getElementById("rvMsg");
  if (!/^[a-z0-9]{10}$/.test(code)) { state("bad"); return; }
  try {
    const r = await fetch(LEAD_ENDPOINT + "/invite?c=" + code);
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    f("name").value = j.name || "";
    f("business").value = j.business || "";
    document.getElementById("rvHello").textContent = j.name ? `${j.name}, спасибо, что выбрали меня!` : "Спасибо, что выбрали меня!";
    state("form");
  } catch (e) { state("bad"); return; }

  const count = form.querySelector(".count");
  f("text").addEventListener("input", () => { const l = f("text").value.trim().length; count.textContent = l < 20 ? `ещё ${20 - l} ${plural(20 - l, "символ", "символа", "символов")}` : `${l} / 1000`; });
  const ERR = { name: "Имя — только буквами", business: "В названии бизнеса не нужны ссылки и символы < >", rating: "Поставьте оценку звёздами", short: "Напишите хотя бы пару предложений", text: "Ссылки и символы < > в отзыве не нужны", invite: "Ссылка уже использована или устарела — напишите мне в Telegram", too_many: "Слишком много попыток — попробуйте через 10 минут" };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = { code, name: f("name").value.trim(), business: f("business").value.trim(), text: f("text").value.trim(), rating: Number((form.querySelector('[name="rating"]:checked') || {}).value || 0), website: f("website").value };
    let err = "";
    if (!d.rating) err = ERR.rating;
    else if (d.name.length < 2 || /[^A-Za-zА-Яа-яЁё\s'’-]/.test(d.name)) err = ERR.name;
    else if (d.text.length < 20) err = ERR.short;
    else if (/https?:\/\/|www\.|[<>]/i.test(d.text)) err = ERR.text;
    else if (!f("agree").checked) err = "Поставьте галочку — без неё не могу опубликовать отзыв";
    msg.textContent = err;
    if (err) return;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const r = await fetch(LEAD_ENDPOINT + "/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { msg.textContent = ERR[j.error] || "Не получилось отправить — попробуйте ещё раз или напишите мне в Telegram"; return; }
      state("sent");
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    } catch (e2) { msg.textContent = "Нет связи — проверьте интернет и попробуйте ещё раз"; }
    finally { btn.disabled = false; }
  });
}

// ===== Плавные переходы между страницами =====
// Уходим со страницы: та карточка кейса, на которую нажали, раскроется в страницу кейса
addEventListener("pageswap", (e) => {
  if (!e.viewTransition || !e.activation || !e.activation.entry) return;
  const to = new URL(e.activation.entry.url);
  const pv = Array.from(document.querySelectorAll("a.pv")).find((a) => a.pathname === to.pathname);
  if (!pv) return;
  const art = document.getElementById("caseArt");
  if (art) art.style.viewTransitionName = "none"; // на странице кейса имя занято самим кейсом — отдаём его карточке
  pv.style.viewTransitionName = "case-hero";
});
// Вернулись кнопкой «назад» (страница из памяти браузера) — убираем временные метки и затухание
addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  document.body.classList.remove("leaving");
  document.querySelectorAll("a.pv, #caseArt").forEach((el) => (el.style.viewTransitionName = ""));
});
// Браузеры без переходов (Firefox): страница сначала мягко гаснет, потом открывается новая
if (document.documentElement.classList.contains("no-vt") && !reduceMotion) {
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === "_blank" || a.hasAttribute("download") || a.origin !== location.origin) return;
    if (a.pathname === location.pathname) return; // переход внутри страницы — без затухания
    e.preventDefault();
    document.body.classList.add("leaving");
    setTimeout(() => { location.href = a.href; }, 220);
  });
}

const has = (sel) => !!document.querySelector(sel);
if (has(".pv-scroll")) initCasePreviews();
if (document.body.dataset.case) initCasePage();
if (has(".hero")) initHero();
initReveal();
if (has(".cursor-dot")) initCursor();
if (has("#world")) initWorld();
initStars();
initFeatures();
initNav();
if (has(".phone-wrap")) initPhoneZoom();
initTabTitle();
initMobileMenu();
if (has(".faq-item")) initFaq();
initAutoLite();
if (has("#lead")) initLead();
if (has("#rvList")) initReviews();
if (has("#reviewForm")) initReviewPage();
