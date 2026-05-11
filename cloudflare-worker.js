/**
 * Albion Online Gameinfo CORS Proxy
 * Deploy this on Cloudflare Workers (free tier: 100k req/day)
 *
 * It proxies requests to gameinfo.albiononline.com and adds
 * CORS headers so the browser can reach the API.
 *
 * Usage:
 *   https://your-worker.your-subdomain.workers.dev/europe/players/search?q=PlayerName
 *   https://your-worker.your-subdomain.workers.dev/east/players/search?q=PlayerName
 *
 * The first path segment is the server (europe | west | east).
 * Everything after it is forwarded to the correct gameinfo host.
 */

const ORIGINS = {
  europe: "https://gameinfo.albiononline.com/api/gameinfo",
  west:   "https://gameinfo.albiononline.com/api/gameinfo",
  east:   "https://gameinfo-sgp.albiononline.com/api/gameinfo",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
    }

    const url  = new URL(request.url);
    const parts = url.pathname.replace(/^\/+/, "").split("/");

    // First segment = server key (europe/west/east)
    const serverKey = parts[0]?.toLowerCase();
    const base      = ORIGINS[serverKey];

    if (!base) {
      return new Response(
        JSON.stringify({ error: "Unknown server. Use /europe/, /west/, or /east/" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Remaining path segments = the actual gameinfo API path
    const apiPath  = "/" + parts.slice(1).join("/");
    const upstream = base + apiPath + url.search;

    try {
      const response = await fetch(upstream, {
        headers: {
          "User-Agent": "AlbionMarketTracker/1.0",
          "Accept":     "application/json",
        },
        cf: { cacheTtl: 60, cacheEverything: false },
      });

      const body        = await response.text();
      const contentType = response.headers.get("Content-Type") || "application/json";

      return new Response(body, {
        status:  response.status,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": contentType,
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Upstream fetch failed", detail: err.message }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
  },
};
