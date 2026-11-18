/* BUILT 2026-11-18 · warn-1a · Mark: 'put a warning up that nvda did not file a 10q with earnings major warning and sell sign'.
   A stock's room (?t=) shows its warning in full at the top; the home page shows a strip of every live warning.
   The warnings live in our database (read worker ?warn=), so one can be added or ended without changing the site.
   Facts come only from the company's own SEC filings, each with its source; Mark's view is shown apart, labelled
   opinion and signed (Mark 11/18 forecast rule: 'this is my opinion' / 'sign it with my name'). */
(function () {
  var API = "https://read.realroofers.workers.dev/?warn=";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var css = document.createElement("style");
  css.textContent = ".k8warn{background:#fff;border:3px solid #b3121a;border-radius:12px;margin:12px auto;max-width:1100px;font:16px/1.5 -apple-system,Segoe UI,Arial,sans-serif;color:#14150f;overflow:hidden}"
    + ".k8warn .wh{background:#b3121a;color:#fff;padding:10px 16px;font:900 15px/1.2 Arial,sans-serif;letter-spacing:.06em}"
    + ".k8warn .wt{font:800 21px/1.25 Arial,sans-serif;padding:12px 16px 4px;color:#b3121a}"
    + ".k8warn ol{margin:6px 0 4px;padding:0 16px 0 38px}.k8warn li{margin:8px 0}.k8warn .src{display:block;font-size:12.5px;color:#6b6c62}"
    + ".k8warn .op{margin:10px 16px 14px;padding:12px 14px;border-left:6px solid #b3121a;background:#fff4f2;border-radius:6px}"
    + ".k8warn .op b{font-size:18px}.k8warn .sig{font-size:13.5px;color:#3a3b33;margin-top:4px}.k8warn .nb{font-size:12.5px;color:#6b6c62}"
    + ".k8wstrip{display:block;background:#b3121a;color:#fff!important;text-decoration:none!important;padding:10px 14px;font:700 15px/1.4 Arial,sans-serif;margin:10px auto;max-width:1100px;border-radius:10px}"
    + ".k8wstrip u{font-weight:800}@media(max-width:600px){.k8warn{margin:10px 8px}.k8wstrip{margin:10px 8px}}";
  document.head.appendChild(css);
  function where() { return document.querySelector("main") || document.body.firstElementChild; }
  function full(w) {
    return '<div class="k8warn" id="warn" role="alert"><div class="wh">&#9888; ' + (w.level === "major" ? "MAJOR WARNING" : "WARNING") + ' &middot; ' + esc(w.ticker) + '</div>'
      + '<div class="wt">' + esc(w.title) + '</div>'
      + '<ol>' + (w.facts || []).map(function (f) { return '<li>' + esc(f.t) + (f.src ? '<span class="src">Source: ' + esc(f.src) + '</span>' : '') + '</li>'; }).join("") + '</ol>'
      + (w.opinion ? '<div class="op"><b>' + esc(w.opinion) + '</b><div class="sig">&mdash; ' + esc(w.signed || "") + '</div><div class="nb">Opinion, not investment advice. The numbered facts above are from the company&rsquo;s own SEC filings.</div></div>' : '')
      + '</div>';
  }
  var t = String(new URLSearchParams(location.search).get("t") || new URLSearchParams(location.search).get("ticker") || "").toUpperCase().replace(/[^A-Z.\-]/g, "");
  var isRoom = /\/room/.test(location.pathname) && t;
  fetch(API + encodeURIComponent(isRoom ? t : "all")).then(function (r) { return r.json(); }).then(function (j) {
    var ws = (j && j.warnings) || []; if (!ws.length) return;
    var box = document.createElement("div");
    if (isRoom) box.innerHTML = full(ws[0]);
    else box.innerHTML = ws.map(function (w) { return '<a class="k8wstrip" href="/room?t=' + encodeURIComponent(w.ticker) + '#warn">&#9888; ' + (w.level === "major" ? "MAJOR WARNING" : "WARNING") + ' &middot; <u>' + esc(w.ticker) + '</u>: ' + esc(w.title.replace(/^MAJOR WARNING:\s*/i, "")) + (w.opinion ? ' &mdash; ' + esc(String(w.signed || "").split(",")[0]) + ': &ldquo;' + esc(w.opinion) + '&rdquo;' : '') + ' &rarr; the facts</a>'; }).join("");
    var m = where(); m.parentNode.insertBefore(box, m);
    if (isRoom && location.hash === "#warn") box.scrollIntoView({ block: "start" });
  }).catch(function () {});
})();
