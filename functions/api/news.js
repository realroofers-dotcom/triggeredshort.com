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
  try {
    const r = await fetch(feed, { cf: { cacheTtl: 600, cacheEverything: true }, headers: { "user-agent": "8K10Q news reader (contact@8k10q.com)" } });
    if (!r.ok) throw new Error("feed " + r.status);
    const xml = await r.text();
    const items = (xml.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, 12).map((it) => {
      let title = tag(it, "title"); const source = tag(it, "source");
      if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
      return { title, source, link: tag(it, "link"), at: new Date(tag(it, "pubDate") || Date.now()).toISOString() };
    }).filter((x) => x.title && x.link);
    return new Response(JSON.stringify({ ok: true, build: "news-1a", t, items }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, t, items: [], error: "The news desk isn't answering just now" }), { headers });
  }
}
