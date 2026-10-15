// CHESH v4 (макет): форма заявки. Логика перенесена из js/main.js (initLead) без изменений,
// чтобы новая главная не тянула за собой старый большой скрипт.
"use strict";
// ===== Заявка: форма → посредник на Cloudflare (worker/chesh-leads.js) → сообщение Тимофею в Telegram =====
// Если посредник недоступен — запасной путь: открываем Telegram с готовым текстом заявки.
const LEAD_ENDPOINT = "https://chesh-leads.chesh.workers.dev"; // посредник на Cloudflare
const TG_BOT = "chesh_leads_bot"; // бот CHESH: люди пишут ему, сообщения приходят Тимофею, личный аккаунт скрыт
const TG_USER = "Tim_HellRide"; // личный Telegram — только запасной путь, если посредник недоступен
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
  tgBtn.href = "https://t.me/" + TG_BOT + "?start=site";
  document.getElementById("tgUser").textContent = "отвечу там же, обычно в течение дня";
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
    "Здравствуйте! Заявка с сайта",
    "Имя: " + d.name,
    "Связь: " + d.contact,
    d.services.length ? "Нужно: " + d.services.join(", ") : "",
    d.message ? "Задача: " + d.message : "",
  ].filter(Boolean).join("\n");
  // Почему не получилось — мелкой строкой под кнопкой, чтобы было понятно, что чинить
  const WHY = {
    network: "Сервер заявок недоступен из вашей сети — возможно, его блокирует провайдер или блокировщик рекламы.",
    timeout: "Сервер заявок слишком долго не отвечал.",
    too_many: "Слишком много попыток подряд — подождите 10 минут или отправьте через Telegram.",
    telegram: "Telegram временно не ответил.",
  };
  const fallback = (d, err) => {
    const text = textOf(d);
    document.getElementById("leadFbBtn").href = "https://t.me/" + TG_USER + "?text=" + encodeURIComponent(text);
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {}); // на всякий случай текст и в буфере
    const code = err ? err.message : "";
    document.getElementById("leadWhy").textContent = code ? "Причина: " + (WHY[code] || "сервер ответил «" + code + "».") : "";
    if (err) console.warn("Заявка не ушла:", code);
    state("fallback");
  };
  const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const post = async (d) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      return await fetch(LEAD_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d), signal: ctrl.signal });
    } catch (e) {
      throw new Error(e.name === "AbortError" ? "timeout" : "network");
    } finally {
      clearTimeout(timer);
    }
  };
  document.getElementById("leadBack").addEventListener("click", () => state(null));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = {
      name: field("name").value.trim(),
      contact: field("contact").value.trim(),
      services: pick.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.textContent),
      message: field("message").value.trim(),
      website: "", // посредник по-прежнему ждёт это поле — шлём пустым (ловушка теперь leadhp)
    };
    const trap = field("leadhp").value; // ловушка для ботов: человек это поле не видит, а браузеры не заполняют
    const fast = Date.now() - opened < 2500; // отправили быстрее, чем человек успевает
    const okAll = [check("name"), check("contact"), check("message")].every(Boolean);
    if (!okAll) { msg.textContent = "Проверьте поля, отмеченные красным, — под ними подсказка"; form.querySelector(".field.bad input, .field.bad textarea").focus(); return; }
    if (!field("agree").checked) { document.getElementById("leadConsent").classList.add("bad"); msg.textContent = "Поставьте галочку согласия — без неё не могу принять заявку"; return; }
    msg.textContent = "";
    // Раньше такую заявку молча выбрасывали. Теперь она приходит с пометкой — живой клиент не потеряется.
    if (trap || fast) d.message = "⚠️ Возможно, бот (" + (trap ? "заполнено скрытое поле" : "отправлено за 2 секунды") + ")\n" + d.message;
    if (!LEAD_ENDPOINT) { fallback(d); return; }

    send.disabled = true;
    try {
      // одна автоматическая повторная попытка, если связь сорвалась или сервер ответил ошибкой 5xx
      let r;
      try { r = await post(d); } catch (e) { await wait(1500); r = await post(d); }
      if (r.status >= 500) { await wait(1500); r = await post(d); }
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || r.status);
      document.getElementById("leadWho").textContent = d.contact;
      document.getElementById("leadWhy").textContent = "";
      form.reset();
      pick.forEach((b) => b.setAttribute("aria-pressed", "false"));
      state("sent");
    } catch (err) {
      fallback(d, err);
    } finally {
      send.disabled = false;
    }
  });
}

if (document.getElementById("lead")) initLead();
