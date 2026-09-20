/*
 * Retour feedback widget. One <script>, no dependencies.
 *   <script src="https://YOUR-HOST/widget.js" data-key="pk_..." defer></script>
 * Optional: data-lang="fr|en|ar", data-position="right|left", data-label="Feedback".
 *
 * Security: every string that comes from the network or from other users is inserted with
 * textContent / setAttribute on elements we create. innerHTML is never used with data. The UI lives in
 * a Shadow DOM so host-page CSS cannot break it and ours cannot leak out.
 */
(function () {
  "use strict";

  var T = {
    en: {
      label: "Feedback",
      title: "Your feedback",
      send: "Send",
      roadmap: "Roadmap",
      close: "Close",
      kind: "Type",
      idea: "Idea",
      bug: "Problem",
      other: "Other",
      message: "Message",
      email: "Email (optional, for a reply)",
      submit: "Send feedback",
      sending: "Sending...",
      thanks: "Thank you! We read every message.",
      again: "Send another",
      errShort: "Please write at least 3 characters.",
      errEmail: "That email address looks wrong.",
      errRate: "Too many messages. Try again in a few minutes.",
      errGeneric: "Could not send. Try again.",
      loading: "Loading...",
      empty: "Nothing on the roadmap yet.",
      loadErr: "Could not load the roadmap.",
      planned: "Planned",
      in_progress: "In progress",
      done: "Done",
      vote: "Vote for",
      votes: "votes",
    },
    fr: {
      label: "Avis",
      title: "Votre avis",
      send: "Envoyer",
      roadmap: "Roadmap",
      close: "Fermer",
      kind: "Type",
      idea: "Idée",
      bug: "Problème",
      other: "Autre",
      message: "Message",
      email: "Email (facultatif, pour vous répondre)",
      submit: "Envoyer",
      sending: "Envoi...",
      thanks: "Merci ! Nous lisons chaque message.",
      again: "Envoyer un autre",
      errShort: "Écrivez au moins 3 caractères.",
      errEmail: "Cette adresse email semble incorrecte.",
      errRate: "Trop de messages. Réessayez dans quelques minutes.",
      errGeneric: "Envoi impossible. Réessayez.",
      loading: "Chargement...",
      empty: "Rien sur la roadmap pour l'instant.",
      loadErr: "Impossible de charger la roadmap.",
      planned: "Prévu",
      in_progress: "En cours",
      done: "Terminé",
      vote: "Voter pour",
      votes: "votes",
    },
    ar: {
      label: "رأيك",
      title: "رأيك يهمنا",
      send: "إرسال",
      roadmap: "خارطة الطريق",
      close: "إغلاق",
      kind: "النوع",
      idea: "فكرة",
      bug: "مشكلة",
      other: "أخرى",
      message: "الرسالة",
      email: "البريد الإلكتروني (اختياري)",
      submit: "إرسال",
      sending: "جارٍ الإرسال...",
      thanks: "شكرًا! نقرأ كل رسالة.",
      again: "إرسال رسالة أخرى",
      errShort: "اكتب 3 أحرف على الأقل.",
      errEmail: "البريد الإلكتروني غير صحيح.",
      errRate: "رسائل كثيرة. حاول بعد قليل.",
      errGeneric: "تعذر الإرسال. حاول مرة أخرى.",
      loading: "جارٍ التحميل...",
      empty: "لا شيء في خارطة الطريق بعد.",
      loadErr: "تعذر تحميل خارطة الطريق.",
      planned: "مخطط",
      in_progress: "قيد التنفيذ",
      done: "منجز",
      vote: "صوّت لـ",
      votes: "أصوات",
    },
  };

  var CSS =
    ":host{all:initial}*{box-sizing:border-box}" +
    ".wrap{position:fixed;bottom:16px;z-index:2147483000;font:16px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;color:#111827}" +
    ".wrap.right{right:16px}.wrap.left{left:16px}" +
    "button,input,select,textarea{font:inherit;color:inherit}" +
    ".fab{min-height:48px;min-width:48px;padding:0 18px;border:2px solid #111827;border-radius:999px;background:var(--accent);color:var(--ink);font-weight:700;cursor:pointer;box-shadow:3px 3px 0 #111827}" +
    ".fab:hover{transform:translate(-1px,-1px);box-shadow:4px 4px 0 #111827}" +
    ".panel{position:absolute;bottom:60px;width:min(360px,calc(100vw - 32px));max-height:min(560px,calc(100vh - 100px));overflow:auto;background:#fff;border:2px solid #111827;box-shadow:5px 5px 0 #111827;border-radius:12px;padding:14px}" +
    ".right .panel{right:0}.left .panel{left:0}" +
    ".panel[hidden]{display:none}" +
    ".head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}" +
    ".head h2{margin:0;font-size:18px}" +
    ".x{min-height:44px;min-width:44px;border:0;background:none;font-size:20px;cursor:pointer}" +
    ".tabs{display:flex;gap:6px;margin-bottom:12px}" +
    ".tab{flex:1;min-height:44px;border:2px solid #111827;border-radius:8px;background:#fff;font-weight:600;cursor:pointer}" +
    ".tab[aria-pressed=true]{background:#111827;color:#fff}" +
    "label{display:block;margin:10px 0 4px;font-size:13px;font-weight:600;color:#374151}" +
    "select,textarea,input[type=email]{width:100%;min-height:44px;padding:8px 10px;border:2px solid #111827;border-radius:8px;background:#fff}" +
    "textarea{min-height:96px;resize:vertical}" +
    ".submit{margin-top:12px;width:100%;min-height:46px;border:2px solid #111827;border-radius:8px;background:var(--accent);color:var(--ink);font-weight:700;cursor:pointer}" +
    ".submit[disabled]{opacity:.6;cursor:wait}" +
    ".msg{margin:10px 0 0;font-size:14px}.err{color:#a3210b;font-weight:600}" +
    "h3{margin:14px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#4b5563}" +
    "ul{list-style:none;margin:0;padding:0}" +
    ".item{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid #d1d5db}" +
    ".vote{flex:none;min-width:52px;min-height:52px;border:2px solid #111827;border-radius:8px;background:#fff;font-weight:700;cursor:pointer;line-height:1.1}" +
    ".vote[aria-pressed=true]{background:var(--accent);color:var(--ink)}" +
    ".item b{display:block;overflow-wrap:anywhere}.item span{display:block;font-size:14px;color:#374151;overflow-wrap:anywhere}" +
    ":focus-visible{outline:3px solid #f59e0b;outline-offset:2px}" +
    "@media (prefers-reduced-motion:reduce){*{transition:none!important}}";

  /** Black or white text, whichever contrasts more with the accent colour. */
  function readableInk(hex) {
    var m = /^#([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return "#ffffff";
    var c = [0, 2, 4].map(function (i) {
      var v = parseInt(m[1].slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    var L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? "#ffffff" : "#111827";
  }

  function voterId(win) {
    try {
      var v = win.localStorage.getItem("retour_voter");
      if (v && /^[A-Za-z0-9_-]{8,64}$/.test(v)) return v;
      var a = new Uint8Array(16);
      win.crypto.getRandomValues(a);
      v = Array.prototype.map
        .call(a, function (b) {
          return (b + 256).toString(16).slice(1);
        })
        .join("");
      win.localStorage.setItem("retour_voter", v);
      return v;
    } catch {
      // storage blocked: votes still work for this page view
      return "anon" + Math.random().toString(36).slice(2, 12);
    }
  }

  function el(doc, tag, cls, text) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    return e;
  }

  function mount(opts) {
    var win = opts.window || window;
    var doc = win.document;
    var base = String(opts.base).replace(/\/$/, "");
    var lang = T[opts.lang] ? opts.lang : "en";
    var t = T[lang];
    var doFetch = opts.fetch || win.fetch.bind(win);
    var voter = voterId(win);
    var apiBase = base + "/api/public/" + encodeURIComponent(opts.key);

    function api(path, init) {
      return doFetch(apiBase + path, init).then(function (r) {
        return r.json().then(
          function (d) {
            return { ok: r.ok, status: r.status, data: d };
          },
          function () {
            return { ok: false, status: r.status, data: {} };
          },
        );
      });
    }

    var host = doc.createElement("div");
    host.setAttribute("data-retour", "");
    var root = host.attachShadow({ mode: "open" });
    var style = doc.createElement("style");
    style.textContent = CSS;
    root.appendChild(style);

    var wrap = el(doc, "div", "wrap " + (opts.position === "left" ? "left" : "right"));
    wrap.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    wrap.style.setProperty("--accent", "#5b3df5");
    wrap.style.setProperty("--ink", "#ffffff");

    var fab = el(doc, "button", "fab", opts.label || t.label);
    fab.type = "button";
    fab.setAttribute("aria-haspopup", "dialog");
    fab.setAttribute("aria-expanded", "false");

    var panel = el(doc, "div", "panel");
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", t.title);

    var head = el(doc, "div", "head");
    var h2 = el(doc, "h2", "", t.title);
    var closeBtn = el(doc, "button", "x", "×");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", t.close);
    head.append(h2, closeBtn);

    var tabs = el(doc, "div", "tabs");
    var tabSend = el(doc, "button", "tab", t.send);
    var tabMap = el(doc, "button", "tab", t.roadmap);
    tabSend.type = tabMap.type = "button";
    tabs.append(tabSend, tabMap);

    var body = el(doc, "div", "body");
    panel.append(head, tabs, body);
    wrap.append(panel, fab);
    root.appendChild(wrap);

    var tab = "send";
    var loadedRoadmap = false;

    function renderSendForm() {
      body.textContent = "";
      var form = doc.createElement("form");
      form.noValidate = true;

      var kl = el(doc, "label", "", t.kind);
      kl.setAttribute("for", "k");
      var sel = doc.createElement("select");
      sel.id = "k";
      ["idea", "bug", "other"].forEach(function (k) {
        var o = doc.createElement("option");
        o.value = k;
        o.textContent = t[k];
        sel.appendChild(o);
      });
      var ml = el(doc, "label", "", t.message);
      ml.setAttribute("for", "m");
      var ta = doc.createElement("textarea");
      ta.id = "m";
      ta.maxLength = 2000;
      ta.required = true;
      var el2 = el(doc, "label", "", t.email);
      el2.setAttribute("for", "e");
      var em = doc.createElement("input");
      em.type = "email";
      em.id = "e";
      em.maxLength = 200;
      em.autocomplete = "email";
      var btn = el(doc, "button", "submit", t.submit);
      btn.type = "submit";
      var msg = el(doc, "p", "msg");
      msg.setAttribute("aria-live", "polite");
      form.append(kl, sel, ml, ta, el2, em, btn, msg);

      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        msg.className = "msg err";
        if (ta.value.trim().length < 3) {
          msg.textContent = t.errShort;
          ta.focus();
          return;
        }
        if (em.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em.value)) {
          msg.textContent = t.errEmail;
          em.focus();
          return;
        }
        btn.disabled = true;
        msg.className = "msg";
        msg.textContent = t.sending;
        api("/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: sel.value,
            message: ta.value,
            email: em.value,
            pageUrl: String((win.location && win.location.href) || "").slice(0, 500),
          }),
        }).then(
          function (r) {
            if (r.ok) {
              body.textContent = "";
              var p = el(doc, "p", "msg", t.thanks);
              p.setAttribute("role", "status");
              var again = el(doc, "button", "tab", t.again);
              again.type = "button";
              again.addEventListener("click", renderSendForm);
              body.append(p, again);
              return;
            }
            btn.disabled = false;
            msg.className = "msg err";
            msg.textContent =
              r.status === 429 ? t.errRate : r.status === 400 ? t.errShort : t.errGeneric;
          },
          function () {
            btn.disabled = false;
            msg.className = "msg err";
            msg.textContent = t.errGeneric;
          },
        );
      });
      body.appendChild(form);
    }

    function renderRoadmap(items) {
      body.textContent = "";
      if (!items.length) {
        body.appendChild(el(doc, "p", "msg", t.empty));
        return;
      }
      ["in_progress", "planned", "done"].forEach(function (status) {
        var group = items.filter(function (i) {
          return i.status === status;
        });
        if (!group.length) return;
        body.appendChild(el(doc, "h3", "", t[status]));
        var ul = doc.createElement("ul");
        group.forEach(function (i) {
          var li = el(doc, "li", "item");
          var v = el(doc, "button", "vote");
          v.type = "button";
          v.setAttribute("aria-pressed", i.voted ? "true" : "false");
          v.setAttribute("aria-label", t.vote + " " + i.title);
          var count = el(doc, "span", "", "▲ " + i.votes);
          count.style.color = "inherit";
          count.style.fontSize = "14px";
          v.appendChild(count);
          v.addEventListener("click", function () {
            api("/vote", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId: i.id, voter: voter }),
            }).then(function (r) {
              if (!r.ok) return;
              i.voted = r.data.voted;
              i.votes = r.data.votes;
              v.setAttribute("aria-pressed", i.voted ? "true" : "false");
              count.textContent = "▲ " + i.votes;
            });
          });
          var text = el(doc, "div");
          text.appendChild(el(doc, "b", "", i.title));
          if (i.description) text.appendChild(el(doc, "span", "", i.description));
          li.append(v, text);
          ul.appendChild(li);
        });
        body.appendChild(ul);
      });
    }

    function loadRoadmap() {
      body.textContent = "";
      body.appendChild(el(doc, "p", "msg", t.loading));
      return api("/roadmap?voter=" + encodeURIComponent(voter)).then(
        function (r) {
          if (!r.ok) {
            body.textContent = "";
            body.appendChild(el(doc, "p", "msg err", t.loadErr));
            return;
          }
          loadedRoadmap = true;
          renderRoadmap(r.data.items || []);
        },
        function () {
          body.textContent = "";
          body.appendChild(el(doc, "p", "msg err", t.loadErr));
        },
      );
    }

    function setTab(next) {
      tab = next;
      tabSend.setAttribute("aria-pressed", next === "send" ? "true" : "false");
      tabMap.setAttribute("aria-pressed", next === "roadmap" ? "true" : "false");
      if (next === "send") renderSendForm();
      else return loadRoadmap();
    }

    function open() {
      panel.hidden = false;
      fab.setAttribute("aria-expanded", "true");
      setTab(tab);
      tabSend.focus();
    }
    function close() {
      panel.hidden = true;
      fab.setAttribute("aria-expanded", "false");
      fab.focus();
    }
    fab.addEventListener("click", function () {
      if (panel.hidden) open();
      else close();
    });
    closeBtn.addEventListener("click", close);
    tabSend.addEventListener("click", function () {
      setTab("send");
    });
    tabMap.addEventListener("click", function () {
      setTab("roadmap");
    });
    panel.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });

    setTab("send");
    panel.hidden = true;
    (doc.body || doc.documentElement).appendChild(host);

    // Pick up the project's accent colour; the widget still works if this call fails.
    api("/roadmap?voter=" + encodeURIComponent(voter)).then(
      function (r) {
        if (!r.ok || !r.data.project) return;
        var accent = /^#[0-9a-f]{6}$/i.test(r.data.project.accent)
          ? r.data.project.accent
          : "#5b3df5";
        wrap.style.setProperty("--accent", accent);
        wrap.style.setProperty("--ink", readableInk(accent));
      },
      function () {},
    );

    return {
      host: host,
      root: root,
      open: open,
      close: close,
      ready: function () {
        return loadedRoadmap;
      },
    };
  }

  window.RetourWidget = { mount: mount, readableInk: readableInk };

  var s = document.currentScript;
  if (s && s.getAttribute("data-key") && s.src) {
    var go = function () {
      mount({
        base: new URL(s.src).origin,
        key: s.getAttribute("data-key"),
        lang: s.getAttribute("data-lang") || (document.documentElement.lang || "en").slice(0, 2),
        position: s.getAttribute("data-position") || "right",
        label: s.getAttribute("data-label") || "",
      });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
    else go();
  }
})();
