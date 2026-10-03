// ===== Яндекс.Метрика — только с согласия посетителя =====
// Пока посетитель не нажал «Хорошо», счётчик не загружается и cookie не ставятся.
// «Без статистики» — Метрика не загрузится вообще. Выбор хранится в браузере (localStorage «ym-consent»);
// сбросить можно кнопкой на странице политики (#ymReset).
// Номер счётчика — ниже (если поставить 0, файл ничего не делает: нет ни баннера, ни счётчика).
(function () {
  var YM_ID = 113367211; // номер счётчика CHESH в metrika.yandex.ru

  var KEY = "ym-consent";
  var get = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  var set = function (v) { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {} };

  // кнопка «изменить выбор» в политике конфиденциальности
  var reset = document.getElementById("ymReset");
  if (reset) {
    var state = document.getElementById("ymState");
    var show = function () { if (state) state.textContent = get() === "yes" ? "сейчас статистика включена" : get() === "no" ? "сейчас статистика выключена" : "вы ещё не выбирали"; };
    show();
    reset.addEventListener("click", function () { set(null); show(); });
    return; // на странице политики счётчик не нужен — только кнопка выбора
  }

  if (!YM_ID) return;

  function load() {
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    window.ym(YM_ID, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
    goals();
  }

  // цели: создаются в Метрике как «JavaScript-событие» с этими же названиями
  function goals() {
    var reach = function (name) { if (window.ym) window.ym(YM_ID, "reachGoal", name); };
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a");
      if (!a) return;
      var href = a.getAttribute("href") || "";
      if (href.indexOf("t.me/chesh_leads_bot") !== -1) reach("tg_click");
      else if (href.indexOf("t.me/chesh_studio") !== -1) reach("channel_click");
      else if (a.classList.contains("pv") || a.classList.contains("win-work")) reach("case_open");
    }, true);
    var root = document.documentElement, lead = document.getElementById("lead");
    if ("MutationObserver" in window) {
      var adSeen = false;
      new MutationObserver(function () {
        if (!adSeen && root.classList.contains("ad-open")) { adSeen = true; reach("phone_ad"); }
      }).observe(root, { attributes: true, attributeFilter: ["class"] });
      if (lead) {
        var sent = false;
        new MutationObserver(function () {
          if (!sent && lead.classList.contains("sent")) { sent = true; reach("lead_sent"); }
        }).observe(lead, { attributes: true, attributeFilter: ["class"] });
      }
    }
  }

  function banner() {
    var box = document.createElement("div");
    box.className = "ym-bar";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Статистика посещений");
    box.innerHTML =
      '<p>Хочу понимать, что на&nbsp;сайте удобно, а&nbsp;что нет, поэтому считаю посещения. ' +
      'Для этого нужны cookie. <a href="privacy.html#stat">Подробнее</a></p>' +
      '<div class="ym-btns"><button type="button" class="btn btn-main" data-ym="yes">Хорошо</button>' +
      '<button type="button" class="btn btn-ghost" data-ym="no">Без статистики</button></div>';
    box.addEventListener("click", function (e) {
      var v = e.target.getAttribute && e.target.getAttribute("data-ym");
      if (!v) return;
      set(v);
      box.classList.add("gone");
      setTimeout(function () { box.remove(); }, 400);
      if (v === "yes") load();
    });
    document.body.appendChild(box);
    requestAnimationFrame(function () { box.classList.add("in"); });
  }

  var choice = get();
  if (choice === "yes") load();
  else if (choice !== "no") {
    // баннер — через пару секунд, чтобы не мешать первому впечатлению
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(banner, 2500); });
    else setTimeout(banner, 2500);
  }
})();
