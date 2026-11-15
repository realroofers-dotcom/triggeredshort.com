/* BUILT 2026-11-15 · via-1a · 8k10q.com/via.js - THE WAY BACK.
   Mark: "shouldnt we have a note that we are taking them to 8k10q and let them have a way to get back to shellmkt".
   A link from a sister site adds ?via=<site>. Every 8K10Q page that loads this shows a slim bar at the top:
   the sister site's logo, "You came from <site>" and "Back to <site>". It stays while the visitor looks around
   8K10Q (this tab only), until they close it. */
(function () {
  var SITES = {
    shellmkt:      { name: "Shell Market",   url: "https://shellmkt.com/",       logo: "https://shellmkt.com/apple-touch-icon.png",     bg: "#11161b", fg: "#ecebe6", acc: "#e0a63a" },
    warrantwire:   { name: "Warrant Wire",   url: "https://warrantwire.com/",    logo: "https://warrantwire.com/apple-touch-icon.png",  bg: "#ffffff", fg: "#14150f", acc: "#b23a2b" },
    gigapoo:       { name: "Gigapoo",        url: "https://gigapoo.com/",        logo: "https://gigapoo.com/peaches.svg?v=3",           bg: "#eaf4fb", fg: "#12283d", acc: "#f28c28" },
    newsweed:      { name: "Newsweed",       url: "https://newsweed.com/",       logo: "https://newsweed.com/apple-touch-icon.png",     bg: "#f7f6f1", fg: "#1d2470", acc: "#00a651" },
    triggeredshort:{ name: "Triggered Short",url: "https://triggeredshort.com/", logo: "https://triggeredshort.com/favicon.png",         bg: "#fbfaf6", fg: "#1a1a17", acc: "#b8321f" },
    adhotbox:      { name: "AdHotBox",       url: "https://adhotbox.com/",       logo: "https://adhotbox.com/apple-touch-icon.png",     bg: "#F2F4F8", fg: "#0C1220", acc: "#FF4A00" }
  };
  var key = "";
  try { key = new URLSearchParams(location.search).get("via") || ""; } catch (e) {}
  try { if (SITES[key]) sessionStorage.setItem("k8.via", key); else key = sessionStorage.getItem("k8.via") || ""; } catch (e) {}
  var s = SITES[key]; if (!s || document.getElementById("k8via")) return;
  function draw() {
    if (document.getElementById("k8via")) return;
    var bar = document.createElement("div"); bar.id = "k8via";
    bar.setAttribute("style", "display:flex;align-items:center;gap:10px;padding:7px 16px;background:" + s.bg + ";color:" + s.fg + ";border-bottom:2px solid " + s.acc + ";font:600 14px -apple-system,Segoe UI,Helvetica,Arial,sans-serif;position:relative;z-index:70");
    bar.innerHTML = '<img src="' + s.logo + '" alt="" width="24" height="24" style="border-radius:6px;background:#fff">'
      + '<span>You came from <b>' + s.name + '</b>. This is 8K10Q, its sister site.</span>'
      + '<a href="' + s.url + '" style="margin-left:auto;color:' + s.acc + ';font-weight:800;text-decoration:none;white-space:nowrap">&larr; Back to ' + s.name + '</a>'
      + '<button type="button" aria-label="Close" style="background:none;border:0;color:inherit;font-size:18px;cursor:pointer;padding:0 4px">&times;</button>';
    bar.querySelector("button").addEventListener("click", function () { try { sessionStorage.removeItem("k8.via"); } catch (e) {} bar.remove(); });
    document.body.insertBefore(bar, document.body.firstChild);
  }
  if (document.body) draw(); else document.addEventListener("DOMContentLoaded", draw);
})();
