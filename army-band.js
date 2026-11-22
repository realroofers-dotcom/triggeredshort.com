/* BUILT 2026-11-22 · army-band-1a · 8k10q.com/army-band.js - ONE COPY of the 8K10Q Army band, shown on 8K10Q, Warrant Wire
   and Gigapoo's meetings page. Mark (22 Nov 2026, after the Cloudflare numbers showed /meetings on three sites): "okay we have
   to introduce the joining of the 8k10q army in all those places and offer that we will attend". The attend offer is the one
   already on 8k10q.com/attend ("we go for you, at cost, and ask your questions"). Loaded by brand8k.js, 8K10Q's home and room,
   Warrant Wire's nav.js, and the meetings copies (tools\meetings-sync.ps1). Not on the Army and attend pages themselves.
   A reader can close it; it stays closed on that device for 7 days. */
(function () {
  if (window.__armyBand) return; window.__armyBand = 1;
  var path = location.pathname.replace(/\.html$/, "");
  if (/\/(army|attend)$/.test(path)) return;
  try { var t = +localStorage.getItem("k8.armyband.closed") || 0; if (Date.now() - t < 7 * 86400000) return; } catch (e) {}
  var css = "#k8army{background:#00208B;color:#fff;font:500 15px/1.4 'Public Sans',system-ui,-apple-system,'Segoe UI',sans-serif;position:relative}"
    + "#k8army .in{max-width:1100px;margin:0 auto;padding:10px 44px 10px 16px;display:flex;align-items:center;gap:10px 16px;flex-wrap:wrap}"
    + "#k8army .t{flex:1 1 320px;min-width:0}"
    + "#k8army .t b{font-family:Rubik,'Public Sans',system-ui,sans-serif;font-weight:700}"
    + "#k8army .t em{font-style:normal;color:#FFB08A}"
    + "#k8army .b{display:flex;gap:8px;flex-wrap:wrap}"
    + "#k8army .b a{display:inline-block;text-decoration:none;font:700 14px Rubik,'Public Sans',system-ui,sans-serif;border-radius:8px;padding:8px 14px;white-space:nowrap}"
    + "#k8army .j{background:#FF4A00;color:#fff}#k8army .j:hover{background:#e04200}"
    + "#k8army .w{background:#fff;color:#00208B}#k8army .w:hover{background:#e8ecfa}"
    + "#k8army .x{position:absolute;right:8px;top:8px;background:none;border:0;color:#cfd6f5;font-size:22px;line-height:1;cursor:pointer;padding:4px 8px}"
    + "#k8army .x:hover{color:#fff}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  var src = encodeURIComponent(location.hostname.replace(/^www\./, "") + path);
  var box = document.createElement("div"); box.id = "k8army"; box.setAttribute("role", "region"); box.setAttribute("aria-label", "The 8K10Q Army");
  box.innerHTML = '<div class="in"><div class="t"><b>Join the 8K10Q Army.</b> Own one share, go to the meeting, ask the questions. '
    + '<em>Can&rsquo;t go? We&rsquo;ll attend for you and ask yours.</em></div>'
    + '<div class="b"><a class="j" href="https://8k10q.com/army?src=' + src + '">Join the Army</a>'
    + '<a class="w" href="https://8k10q.com/attend?src=' + src + '">We&rsquo;ll attend for you</a></div></div>'
    + '<button class="x" type="button" aria-label="Close">&times;</button>';
  box.querySelector(".x").addEventListener("click", function () {
    box.remove(); try { localStorage.setItem("k8.armyband.closed", String(Date.now())); } catch (e) {}
  });
  function place() {
    if (document.getElementById("k8army")) return;
    /* under the site's own menu: 8K10Q's brand band, Warrant Wire's icon strip, or a page header; else the top of the page */
    var after = null, pick = [".k8band", ".wwnav", "header.masthead", "header.top", "body > header"];
    for (var i = 0; i < pick.length && !after; i++) after = document.querySelector(pick[i]);
    if (after && after.parentNode) after.parentNode.insertBefore(box, after.nextSibling);
    else document.body.insertBefore(box, document.body.firstChild);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(place, 50); });
  else setTimeout(place, 50);
})();
