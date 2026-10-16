// CHESH v4: страница отзыва по личной ссылке (review.html?c=…). Логика перенесена из js/main.js (initReviewPage) без изменений.
"use strict";
const LEAD_ENDPOINT = "https://chesh-leads.chesh.workers.dev"; // посредник на Cloudflare (worker/chesh-leads.js)
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const plural = (n, one, few, many) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);

async function initReviewPage() {
  const form = document.getElementById("reviewForm"), box = document.getElementById("reviewBox");
  const code = new URLSearchParams(location.search).get("c") || "";
  const state = (name) => box.setAttribute("data-state", name);
  const f = (n) => form.querySelector(`[name="${n}"]`);
  const msg = document.getElementById("rvMsg");
  if (!/^[a-z0-9]{10}$/.test(code)) { state("bad"); return; }
  const retry = document.getElementById("rvRetry");
  if (retry) retry.addEventListener("click", () => location.reload());
  let r;
  try { r = await fetch(LEAD_ENDPOINT + "/invite?c=" + code); } catch (e) { state("net"); return; } // нет связи с сервером
  if (r.status === 404) { state("bad"); return; } // ссылки правда нет: использована или устарела
  if (!r.ok) { state("net"); return; } // сервер занят или сбой: ссылка, скорее всего, в порядке
  try {
    const j = await r.json();
    f("name").value = j.name || "";
    f("business").value = j.business || "";
    document.getElementById("rvHello").textContent = j.name ? `${j.name}, спасибо, что выбрали меня!` : "Спасибо, что выбрали меня!";
    state("form");
  } catch (e) { state("bad"); return; }

  const count = form.querySelector(".count");
  f("text").addEventListener("input", () => { const l = f("text").value.trim().length; count.textContent = l < 20 ? `ещё ${20 - l} ${plural(20 - l, "символ", "символа", "символов")}` : `${l} / 1000`; });
  const ERR = { name: "Имя — только буквами", business: "В названии бизнеса не нужны ссылки и символы < >", rating: "Поставьте оценку звёздами", short: "Напишите хотя бы пару предложений", text: "Ссылки и символы < > в отзыве не нужны", invite: "Ссылка уже использована или устарела — напишите мне в Telegram", too_many: "Слишком много попыток — попробуйте через 10 минут" };
  let tried = false; // была попытка, оборвавшаяся без ответа: отзыв мог уже дойти
  const done = () => { state("sent"); window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = { code, name: f("name").value.trim(), business: f("business").value.trim(), text: f("text").value.trim(), rating: Number((form.querySelector('[name="rating"]:checked') || {}).value || 0), website: f("website").value };
    let err = "";
    if (!d.rating) err = ERR.rating;
    else if (d.name.length < 2 || /[^A-Za-zА-Яа-яЁё\s'’-]/.test(d.name)) err = ERR.name;
    else if (d.text.length < 20) err = ERR.short;
    else if (/https?:\/\/|www\.|[<>]/i.test(d.text)) err = ERR.text;
    else if (!f("agree").checked || !f("agree2").checked) err = "Поставьте обе галочки — без них отзыв нельзя опубликовать";
    msg.textContent = err;
    if (err) return;
    const btn = form.querySelector("button[type=submit]");
    const label = btn.innerHTML;
    btn.disabled = true; btn.classList.add("sending"); btn.textContent = "Отправляю…"; msg.textContent = "";
    try {
      const r = await fetch(LEAD_ENDPOINT + "/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        // прошлая попытка оборвалась, а ссылка уже использована: значит, отзыв тогда дошёл
        if (j.error === "invite" && tried) { done(); return; }
        msg.textContent = ERR[j.error] || "Не получилось отправить — попробуйте ещё раз или напишите мне в Telegram";
        return;
      }
      done();
    } catch (e2) { tried = true; msg.textContent = "Нет связи — проверьте интернет и попробуйте ещё раз"; }
    finally { btn.disabled = false; btn.classList.remove("sending"); btn.innerHTML = label; }
  });
}

if (document.getElementById("reviewForm")) initReviewPage();
