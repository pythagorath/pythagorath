/* ============================================================================
   site.js — shared, DEFENSIVE platform-control injector for CUSTOMER surfaces
   (index / parent / child / landing). NOT loaded on /admin.

   Injects, each guarded so a blank setting or a failure is a NO-OP and can never
   break the page or the learning flow:
     • brand identity  — colours (--deep / --orange via setProperty), platform name
       (document.title + [data-brand] elements), logo (data-URL → swaps [data-brand]).
     • tracking        — Google Analytics (gtag) + Facebook Pixel, only if an ID is set.
     • whatsapp        — a floating support button → wa.me/<number>, if enabled.
     • announcements   — one targeted popup/banner; once dismissed it never returns
       (localStorage of dismissed ids → "don't nag").

   Reads only public endpoints (/api/site, /api/announcements). Touches no engine state.
   ============================================================================ */
(function () {
  "use strict";
  var safe = function (fn) { try { fn(); } catch (e) { /* never break the page */ } };
  var sid = function () { try { return new URLSearchParams(location.search).get("student"); } catch (e) { return null; } };
  // The CHILD surface is ISOLATED — no external contact (no whatsapp, no marketing
  // announcements). Detected by the page marker or the /child route. Brand + tracking
  // (internal, harmless) still apply.
  var isChild = function () {
    try {
      if (document.body && document.body.getAttribute("data-surface") === "child") return true;
      var p = location.pathname.replace(/\/+$/, "");
      return p === "/child";
    } catch (e) { return false; }
  };

  // ---------- brand ----------
  var BRAND = null;
  function applyBrandEls() {
    if (!BRAND) return;
    document.querySelectorAll("[data-brand]").forEach(function (el) {
      if (el.dataset.branded === "1") return;
      if (BRAND.logo) { el.innerHTML = '<img src="' + BRAND.logo + '" alt="" style="height:26px;width:auto;vertical-align:middle">'; el.dataset.branded = "1"; }
      else if (BRAND.name) { el.textContent = BRAND.name; el.dataset.branded = "1"; }
    });
  }
  function applyBrand(b) {
    if (!b) return;
    BRAND = b;
    if (b.primary) document.documentElement.style.setProperty("--deep", b.primary);
    if (b.secondary) document.documentElement.style.setProperty("--orange", b.secondary);
    if (b.name) document.title = b.name;
    applyBrandEls();
    // catch wordmarks rendered later by the page's own JS (parent/child)
    safe(function () {
      var mo = new MutationObserver(function () { applyBrandEls(); });
      mo.observe(document.body, { childList: true, subtree: true });
    });
  }

  // ---------- tracking ----------
  function applyTracking(intg) {
    if (!intg) return;
    if (intg.ga) safe(function () {
      var s = document.createElement("script"); s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(intg.ga);
      document.head.appendChild(s);
      var i = document.createElement("script");
      i.text = "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config'," + JSON.stringify(intg.ga) + ");";
      document.head.appendChild(i);
    });
    if (intg.fbpixel) safe(function () {
      var i = document.createElement("script");
      i.text = "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init'," + JSON.stringify(intg.fbpixel) + ");fbq('track','PageView');";
      document.head.appendChild(i);
    });
  }

  // ---------- whatsapp ----------
  function applyWhatsapp(w) {
    if (!w || !w.enabled || !w.number) return;
    var num = String(w.number).replace(/[^0-9]/g, "");
    if (!num) return;
    var a = document.createElement("a");
    a.href = "https://wa.me/" + num; a.target = "_blank"; a.rel = "noopener";
    a.setAttribute("aria-label", "تواصل عبر واتساب");
    a.style.cssText = "position:fixed;bottom:18px;left:18px;z-index:300;width:54px;height:54px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 26px -10px rgba(0,0,0,.45);text-decoration:none;";
    a.innerHTML = '<svg viewBox="0 0 32 32" width="30" height="30" fill="#fff"><path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.6 6L4 29l8.2-1.6c1.8.9 3.8 1.4 5.8 1.4 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.6.7.7-3.5-.2-.4c-1-1.6-1.5-3.4-1.5-5.3C5.2 9.5 10 4.8 16 4.8S26.8 9.5 26.8 15 22 24.8 16 24.8zm5.8-7.6c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2s-.8 1-1 1.2-.4.2-.7.1c-1.8-.9-3-1.6-4.2-3.6-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.6s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.9 5.1 2.2.9 3 1 4.1.8.7-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg>';
    document.body.appendChild(a);
  }

  // ---------- announcements ----------
  function seen() { try { return JSON.parse(localStorage.getItem("pyth_seen_ads") || "{}"); } catch (e) { return {}; } }
  function markSeen(id) { var s = seen(); s[id] = 1; try { localStorage.setItem("pyth_seen_ads", JSON.stringify(s)); } catch (e) {} }

  function adCard(ad) {
    var code = ad.code ? '<div style="margin-top:10px;display:inline-block;background:#FFF1DA;color:#8A5A00;border:1px dashed #E9C48B;border-radius:10px;padding:7px 14px;font-weight:800;letter-spacing:1px">' + ad.code + "</div>" : "";
    var link = ad.link ? '<a href="' + ad.link + '" target="_blank" rel="noopener" style="display:inline-block;margin-top:12px;background:linear-gradient(135deg,#F39A1F,#E8833A);color:#fff;border-radius:13px;padding:10px 22px;font-weight:800;text-decoration:none">اعرف المزيد</a>' : "";
    return '<div style="font-family:\'Baloo Bhaijaan 2\',sans-serif;font-weight:800;font-size:20px;color:#155E7D;margin-bottom:6px">' + esc(ad.title) + "</div>" +
           '<div style="font-size:15px;color:#4A4239;line-height:1.7">' + esc(ad.body) + "</div>" + code + (link ? "<div>" + link + "</div>" : "");
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[<>&]/g, function (c) { return { "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]; }); }

  function showPopup(ad, onClose) {
    var ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;z-index:320;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(18,42,54,.5)";
    var box = document.createElement("div");
    box.style.cssText = "position:relative;background:#fff;border-radius:22px;max-width:380px;width:100%;padding:26px 22px;text-align:center;box-shadow:0 40px 80px -24px rgba(0,0,0,.5)";
    box.innerHTML = '<button aria-label="إغلاق" style="position:absolute;left:12px;top:8px;border:0;background:none;font-size:22px;color:#9A8F82;cursor:pointer">✕</button>' + adCard(ad);
    ov.appendChild(box);
    function close() { safe(function () { ov.remove(); }); onClose(); }
    box.querySelector("button").onclick = close;
    ov.onclick = function (e) { if (e.target === ov) close(); };
    document.body.appendChild(ov);
  }
  function showBanner(ad, onClose) {
    var bar = document.createElement("div");
    bar.dir = "rtl";
    bar.style.cssText = "position:fixed;top:0;right:0;left:0;z-index:310;background:linear-gradient(135deg,#163E52,#1B6E97);color:#fff;display:flex;align-items:center;gap:12px;padding:10px 16px;box-shadow:0 8px 20px -10px rgba(0,0,0,.4);font-family:'Readex Pro',sans-serif";
    var link = ad.link ? '<a href="' + ad.link + '" target="_blank" rel="noopener" style="color:#FFD27E;font-weight:800;text-decoration:underline">اعرف المزيد</a>' : "";
    var code = ad.code ? '<b style="background:rgba(255,255,255,.18);border-radius:8px;padding:2px 9px">' + esc(ad.code) + "</b>" : "";
    bar.innerHTML = '<b style="font-family:\'Baloo Bhaijaan 2\',sans-serif">' + esc(ad.title) + "</b><span style=\"opacity:.92;font-size:14px;flex:1\">" + esc(ad.body) + " " + code + " " + link + '</span><button aria-label="إغلاق" style="border:0;background:rgba(255,255,255,.2);color:#fff;border-radius:8px;width:28px;height:28px;cursor:pointer;font-size:16px">✕</button>';
    function close() { safe(function () { bar.remove(); }); onClose(); }
    bar.querySelector("button").onclick = close;
    document.body.appendChild(bar);
  }

  async function loadAnnouncements() {
    var s = sid();
    var ads = [];
    try { ads = await (await fetch("/api/announcements" + (s ? "?student_id=" + encodeURIComponent(s) : ""))).json(); } catch (e) { return; }
    if (!Array.isArray(ads) || !ads.length) return;
    var sn = seen();
    var ad = ads.find(function (a) { return !sn[a.id]; });   // one not-yet-dismissed
    if (!ad) return;
    var onClose = function () { markSeen(ad.id); };
    if (ad.format === "banner") showBanner(ad, onClose); else showPopup(ad, onClose);
  }

  async function init() {
    var site = null;
    try { site = await (await fetch("/api/site")).json(); } catch (e) {}
    var child = isChild();
    if (site) {
      safe(function () { applyBrand(site.brand); });
      safe(function () { applyTracking(site.integrations); });
      if (!child) safe(function () { applyWhatsapp(site.whatsapp); });   // child is isolated
    }
    if (!child) safe(loadAnnouncements);                                  // no external contact for the child
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
