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

// кейс FadePoint: в iPhone сам проигрывается переписка с ботом (data-tg="client" или "owner").
// Идёт по кругу и только пока телефон виден на экране. При «меньше движения» показываем готовую переписку без анимации.
(function () {
  const phones = document.querySelectorAll(".tg-phone[data-tg]");
  if (!phones.length) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const I = {
    signal: '<svg viewBox="0 0 18 12" fill="currentColor"><rect y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" width="3" height="12" rx="1"/></svg>',
    wifi: '<svg viewBox="0 0 16 12" fill="currentColor"><path d="M8 11.6l2.3-2.7a3.4 3.4 0 0 0-4.6 0zM4.4 7.4a5.5 5.5 0 0 1 7.2 0l1.5-1.8a7.9 7.9 0 0 0-10.2 0zM1.5 4a10 10 0 0 1 13 0L16 2.2a12.4 12.4 0 0 0-16 0z"/></svg>',
    battery: '<svg viewBox="0 0 27 12"><rect x=".5" y=".5" width="22" height="11" rx="3.4" fill="none" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="19" height="8" rx="2.2" fill="currentColor"/><rect x="24" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".45"/></svg>',
    back: '<svg viewBox="0 0 12 20"><path d="M10 2L2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    menu: '<svg viewBox="0 0 14 12"><path d="M1 1h12M1 6h12M1 11h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    mic: '<svg viewBox="0 0 16 24"><rect x="4" y="1" width="8" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M1 11a7 7 0 0 0 14 0M8 18v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };
  // сценарии взяты из ролика-демо (Cowork/video/fadepoint-demo): tap = [строка, кнопка], которую «нажимает» человек
  const SCRIPTS = {
    client: [
      { me: "/start", t: "12:30" },
      { bot: "<b>💈 FadePoint Barbershop</b>\nПривет, Анна! Я помогу записаться к мастеру." },
      { bot: "<b>👥 Наша команда</b>\nАлексей · классика, борода\nМаксим · фейды, укладка\nДенис · быстрые стрижки", kb: [["Алексей", "Максим", "Денис"]], tap: [0, 1] },
      { bot: "Запись к мастеру <b>Максим</b>\nВыберите услугу:", kb: [["Мужская стрижка · 1500 ₽"], ["Стрижка + борода · 2200 ₽"], ["Оформление бороды · 1000 ₽"]], tap: [0, 0] },
      { bot: "<b>Мужская стрижка</b> · Максим\nВыберите день:", kb: [["Завтра, 01.10", "Пт, 02.10"], ["Сб, 03.10", "Вс, 04.10"]], tap: [0, 0] },
      { bot: "📅 Завтра, 01.10\nВыберите свободное время:", t: "12:31", kb: [["10:00", "11:00", "12:00", "13:00"], ["15:00", "16:00", "18:00", "19:00"]], tap: [1, 0] },
      { bot: "<b>Проверьте запись 👇</b>\n💈 Мужская стрижка · Максим\n📅 завтра · 🕐 15:00", kb: [["✅ Подтвердить", "✖ Отмена"]], tap: [0, 0] },
      { bot: "<b>✅ Вы записаны!</b> Запись №12\nМаксим · завтра, 01.10 · 15:00\n📍 ул. Примерная, 12, ждём вас!" },
    ],
    owner: [
      { push: "🆕 Новая запись №12: Анна, Максим, завтра в 15:00" },
      { bot: "<b>🆕 Новая запись №12</b>\nАнна · Максим · завтра, 15:00", t: "12:31" },
      { me: "/admin", t: "12:40" },
      { bot: "<b>🛠 Панель владельца</b>\nЗаписи, расписание и ручная запись", kb: [["📅 Сегодня", "🗓 Неделя"], ["📝 Запись вручную"]], tap: [1, 0] },
      { bot: "<b>📝 Запись вручную</b>\nДля какого мастера?", kb: [["Алексей", "Максим", "Денис"]], tap: [0, 1] },
      { bot: "Максим · 📅 Завтра, 01.10\nКакое время занять?", kb: [["10:00", "11:00", "12:00", "13:00"], ["16:00", "18:00", "19:00", "20:00"]], tap: [1, 0] },
      { bot: "Кто записан? Имя и телефон:", t: "12:41" },
      { me: "Иван, +7 900 123-45-67" },
      { bot: "<b>✅ Время занято</b> · запись №13\nМаксим · завтра, 16:00 · Иван\nКлиенты бота больше не смогут записаться на это время." },
    ],
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function build(ph) {
    ph.innerHTML = '<i class="side"></i><div class="tg-scr"><i class="tg-island"></i>' +
      `<div class="tg-status"><span class="tg-clock">12:30</span><span class="ic">${I.signal}${I.wifi}${I.battery}</span></div>` +
      `<div class="tg-head"><span class="tg-back">${I.back}Чаты</span><span class="tg-title"><b>FadePoint Barbershop</b><small>бот</small></span><span class="tg-ava">FP</span></div>` +
      '<div class="tg-chat tg-fade"></div>' +
      `<div class="tg-bar"><span class="tg-menu">${I.menu}Меню</span><span class="tg-input">Сообщение</span>${I.mic}</div>` +
      '<div class="tg-push"><span class="tg-ava">FP</span><span><b>FadePoint Barbershop <small>сейчас</small></b><span class="push-tx"></span></span></div>' +
      '<i class="tg-home"></i></div>';
  }
  function msg(chat, who, html, t) {
    const clock = chat.parentNode.querySelector(".tg-clock");
    if (clock) clock.textContent = t;
    const m = document.createElement("div");
    m.className = "tg-msg " + who;
    m.innerHTML = html + `<span class="tg-t">${t}${who === "me" ? " ✓✓" : ""}</span>`;
    chat.appendChild(m);
  }
  function keyboard(chat, rows) {
    const k = document.createElement("div");
    k.className = "tg-kb";
    k.innerHTML = rows.map((r) => '<div class="row">' + r.map((x) => `<span>${x}</span>`).join("") + "</div>").join("");
    chat.appendChild(k);
    return k;
  }
  const down = (chat) => chat.scrollTo({ top: chat.scrollHeight, behavior: reduce ? "auto" : "smooth" });

  // без анимации: вся переписка сразу, внизу последние сообщения
  function still(ph, steps) {
    const chat = ph.querySelector(".tg-chat");
    let t = "12:30";
    chat.innerHTML = '<div class="tg-day">Сегодня</div>';
    steps.forEach((s) => { if (s.push) return; if (s.t) t = s.t; msg(chat, s.me ? "me" : "bot", s.me || s.bot, t); if (s.kb) keyboard(chat, s.kb); });
    down(chat);
  }

  async function play(ph, steps, gate) {
    const chat = ph.querySelector(".tg-chat"), push = ph.querySelector(".tg-push");
    for (;;) {
      ph.querySelector(".tg-clock").textContent = steps[0].t || (steps[1] && steps[1].t) || "12:30";
      chat.innerHTML = '<div class="tg-day">Сегодня</div>';
      chat.classList.remove("out");
      let t = "12:30";
      for (const s of steps) {
        await gate();
        if (s.push) {
          push.querySelector(".push-tx").textContent = s.push;
          await sleep(700); push.classList.add("on");
          await sleep(2800); push.classList.remove("on");
          await sleep(500);
          continue;
        }
        if (s.t) t = s.t;
        await sleep(s.me ? 700 : 950);
        msg(chat, s.me ? "me" : "bot", s.me || s.bot, t);
        const k = s.kb ? keyboard(chat, s.kb) : null;
        down(chat);
        if (s.tap && k) {
          await sleep(1600);
          k.querySelectorAll(".row")[s.tap[0]].children[s.tap[1]].classList.add("tap");
          await sleep(550);
        } else await sleep(1300);
      }
      await sleep(4000);
      chat.classList.add("out");
      await sleep(700);
    }
  }

  phones.forEach((ph) => {
    const steps = SCRIPTS[ph.dataset.tg];
    if (!steps) return;
    build(ph);
    if (reduce || !("IntersectionObserver" in window)) { still(ph, steps); return; }
    let visible = false, wake = null;
    const gate = () => (visible ? Promise.resolve() : new Promise((r) => (wake = r)));
    new IntersectionObserver((es) => es.forEach((e) => { visible = e.isIntersecting; if (visible && wake) { wake(); wake = null; } }), { threshold: 0.2 }).observe(ph);
    play(ph, steps, gate);
  });
})();
