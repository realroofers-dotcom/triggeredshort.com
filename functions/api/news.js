// BUILT 2026-09-30 · 8k10q news-1a · GET /api/news?t=TICKER[&q=Company name]
// Recent headlines for one symbol, for the room's right-hand column. Source: Google News RSS search
// (headline, publisher, time, link to the publisher). Cached 10 minutes at the edge. No keys needed.

const esc = (s) => String(s || "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/<[^>]+>/g, "").trim();

const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return m ? esc(m[1]) : ""; };

export async function onRequestGet({ request }) {
  const u = new URL(request.url);
  const t = (u.searchParams.get("t") || "").toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 10);
  const name = (u.searchParams.get("q") || "").replace(/[^\w .,&'-]/g, "").slice(0, 60);
  const headers = { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "public, max-age=600" };
  if (!t) return new Response(JSON.stringify({ ok: false, items: [], error: "no symbol" }), { status: 400, headers });

  const query = name ? `"${t}" OR "${name}" stock` : `"${t}" stock`;
  const feed = "https://news.google.com/rss/search?q=" + encodeURIComponent(query + " when:7d") + "&hl=en-US&gl=US&ceid=US:en";
  /* news-1b (17 Nov 2026): Google News stopped answering Cloudflare, so the rooms showed "The news desk isn't answering".
     Google first; if it fails or is empty, Yahoo Finance's per-symbol feed and Bing News by name (same as the halts desk). */
  const read = async (u, src) => {
    const r = await fetch(u, { cf: { cacheTtl: 600, cacheEverything: true }, headers: { "user-agent": "Mozilla/5.0 (compatible; 8K10Q news reader; research@8k10q.com)" } });
    if (!r.ok) return [];
    const xml = await r.text();
    return (xml.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, 12).map((it) => {
      let title = tag(it, "title"); const source = tag(it, "News:Source") || tag(it, "source") || src; let link = tag(it, "link");
      const m = link.match(/[?&]url=([^&]+)/); if (/bing\.com/.test(link) && m) link = decodeURIComponent(m[1]);
      if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
      return { title, source, link, at: new Date(tag(it, "pubDate") || Date.now()).toISOString() };
    }).filter((x) => x.title && x.link);
  };
  try {
    let items = [];
    try { items = await read(feed, "Google News"); } catch (e) {}
    if (!items.length) {
      const y = await read("https://feeds.finance.yahoo.com/rss/2.0/headline?s=" + encodeURIComponent(t) + "&region=US&lang=en-US", "Yahoo Finance").catch(() => []);
      const b = name ? await read("https://www.bing.com/news/search?q=" + encodeURIComponent('"' + name + '"') + "&format=rss", "Bing News").catch(() => []) : [];
      const seen = new Set(), cut = Date.now() - 7 * 86400000;
      items = [...y, ...b].filter((x) => { const k = x.title.toLowerCase().slice(0, 60); if (seen.has(k) || Date.parse(x.at) < cut) return false; seen.add(k); return true; })
        .sort((a, b2) => b2.at.localeCompare(a.at)).slice(0, 12);
    }
    return new Response(JSON.stringify({ ok: true, build: "news-1b", t, items }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, t, items: [], error: "The news desk isn't answering just now" }), { headers });
  }
}
