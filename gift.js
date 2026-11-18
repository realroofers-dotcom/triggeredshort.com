/* BUILT 2026-11-18 · gift-1a · Mark: 'the read the filing on ant should say in a bubble "this one is a gift" and we can use that for
   other stocks when we want' / 'gifts have expiration dates in this case 5 days' / 'i should have an area that i can add a gift'.
   On any page with "Read a filing" buttons: if the stock on the page is on the gift list (read worker ?gift=, managed on Mark's
   Press Desk), a bubble "This one is a gift" sits beside each button and opens the gift. Gone by itself when the gift expires. */
(function () {
  var API = "https://read.realroofers.workers.dev/?gift=", cache = {}, busy = false;
  var css = document.createElement("style");
  css.textContent = ".giftbub{position:relative;display:inline-block;margin:6px 0 6px 10px;padding:6px 12px;border-radius:14px;background:#1a7f37;color:#fff!important;font:800 13.5px -apple-system,Segoe UI,Arial,sans-serif;text-decoration:none!important;white-space:nowrap;vertical-align:middle;box-shadow:0 2px 6px rgba(0,0,0,.15)}" +
    ".giftbub:before{content:'';position:absolute;left:-7px;top:50%;margin-top:-6px;border:6px solid transparent;border-right-color:#1a7f37;border-left:0}" +
    ".giftbub small{display:block;font-weight:500;font-size:11px;opacity:.9}";
  document.head.appendChild(css);
  function ticker() {
    var t = (new URLSearchParams(location.search).get("t") || "");
    var h = document.getElementById("hsym"); if (!t && h && h.value) t = h.value;
    return String(t).toUpperCase().replace(/[^A-Z.\-]/g, "");
  }
  function untilTxt(e) { if (!e) return ""; var d = new Date(String(e).replace(" ", "T") + "Z"); d = new Date(d.getTime() - 1000); return "free until " + d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  function paint(t, g) {
    var btns = Array.prototype.filter.call(document.querySelectorAll("a,button"), function (b) { return /Read a filing/i.test(b.textContent || "") && !b.closest(".giftbub"); });
    document.querySelectorAll(".giftbub").forEach(function (x) { if (x.getAttribute("data-t") !== t || !g || !g.gift) x.remove(); });
    if (!g || !g.gift) return;
    btns.forEach(function (b) {
      var n = b.nextElementSibling; if (n && n.classList && n.classList.contains("giftbub")) return;
      var a = document.createElement("a"); a.className = "giftbub"; a.href = g.url; a.setAttribute("data-t", t);
      a.title = g.note || "A gift from 8K10Q"; a.innerHTML = "This one is a gift" + (g.expires ? "<small>" + untilTxt(g.expires) + "</small>" : "");
      b.parentNode.insertBefore(a, b.nextSibling);
    });
  }
  function run() {
    if (busy) return; var t = ticker(); if (!t) return;
    if (cache[t]) { paint(t, cache[t]); return; }
    busy = true;
    fetch(API + encodeURIComponent(t)).then(function (r) { return r.json(); }).then(function (g) { cache[t] = g; busy = false; paint(t, g); }).catch(function () { busy = false; });
  }
  var timer = null;
  new MutationObserver(function () { clearTimeout(timer); timer = setTimeout(run, 400); }).observe(document.body, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
