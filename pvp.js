// ============================================================
//  PVP TAB  —  Kill & Death tracker
//  Works for Solo Players and Guilds
//  Uses the Albion Online Gameinfo API via Cloudflare Worker
// ============================================================

// ── CLOUDFLARE WORKER URL ────────────────────────── 
// After deploying cloudflare-worker.js, paste your Worker URL here.
// Example: "https://albion-proxy.yourname.workers.dev"
// Leave empty ("") to stay in placeholder/external-links mode.
const CF_WORKER_URL = "https://albion-proxy.askarmohamed011.workers.dev/"

// Routes requests through your Worker (when set) or returns null.
// Pattern: {WORKER}/{server}/{api-path}?{query}
function workerUrl(server, path, query = "") {
  if (!CF_WORKER_URL) return null;
  const base = CF_WORKER_URL.replace(/\/$/, "");
  return `${base}/${server}${path}${query ? "?" + query : ""}`;
}

const GAMEINFO_BASES = {
  europe : "https://gameinfo.albiononline.com/api/gameinfo",
  west   : "https://gameinfo.albiononline.com/api/gameinfo",
  east   : "https://gameinfo-sgp.albiononline.com/api/gameinfo",
};

const GEAR_SLOTS = [
  "MainHand","OffHand","Head","Armor","Shoes",
  "Bag","Cape","Mount","Potion","Food"
];

let pvpState = {
  mode    : "player",  // "player" | "guild"
  selected: null,      // { id, name, type }
  events  : [],
  filter  : "all",     // "all" | "kills" | "deaths"
};

// ── Core helpers ────────────────────────────────────────────────────

function pvpServer() {
  return document.getElementById("server")?.value || "europe";
}

function pvpBase() {
  return GAMEINFO_BASES[pvpServer()] || GAMEINFO_BASES.europe;
}

/**
 * Fetch a gameinfo API path.
 * - When CF_WORKER_URL is set: routes through your Cloudflare Worker (no CORS issues).
 * - When empty: tries direct fetch (works if API ever adds CORS headers, e.g. localhost).
 *
 * @param {string} apiPath  - e.g. "/players/search"
 * @param {string} [query]  - query string WITHOUT leading "?", e.g. "q=PlayerName"
 */
async function pvpFetch(apiPath, query = "") {
  const server = pvpServer();

  // ── Path A: Cloudflare Worker is configured ──────────────────────
  if (CF_WORKER_URL) {
    const url = workerUrl(server, apiPath, query);
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    // Albion gameinfo API returns 404 when no results found (not a real error)
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Worker HTTP ${res.status}`);
    return res.json();
  }

  // ── Path B: No Worker yet — try direct (usually blocked by CORS) ─
  const base = GAMEINFO_BASES[server] || GAMEINFO_BASES.europe;
  const url  = base + apiPath + (query ? "?" + query : "");
  const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function pvpTimeAgo(ts) {
  const t  = ts.endsWith("Z") ? ts : ts + "Z";
  const diff = Date.now() - new Date(t).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtFame(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

// ── Gear strip (10 equipment icons) ─────────────────────────────────

function gearStrip(equipment, alignRight = false) {
  if (!equipment) return `<div class="pvp-gear-strip"></div>`;
  const slots = GEAR_SLOTS.map(slot => {
    const item = equipment[slot];
    if (!item?.Type) {
      return `<div class="pvp-gear-slot pvp-gear-empty" title="${slot}"></div>`;
    }
    const q   = item.Quality || 1;
    const src = `https://render.albiononline.com/v1/item/${item.Type}.png?quality=${q}`;
    return `
      <div class="pvp-gear-slot" title="${slot} · ${item.Type}">
        <img src="${src}" onerror="onIconError(this)" alt="${slot}" />
      </div>`;
  }).join("");
  return `<div class="pvp-gear-strip${alignRight ? " pvp-gear-right" : ""}">${slots}</div>`;
}

// ── Kill card ────────────────────────────────────────────────────────

function killCard(ev, trackedId, trackedType) {
  const killer = ev.Killer || {};
  const victim = ev.Victim  || {};

  const isKill  = trackedType === "guild"
    ? killer.GuildId === trackedId
    : killer.Id      === trackedId;
  const isDeath = trackedType === "guild"
    ? victim.GuildId  === trackedId
    : victim.Id       === trackedId;

  const fame  = fmtFame(ev.TotalVictimKillFame || 0);
  const time  = pvpTimeAgo(ev.TimeStamp);
  const parts = ev.Participants?.length || 1;
  const loc   = ev.Location || "";

  const cardCls = isKill  ? "pvp-card pvp-card-kill"
                : isDeath ? "pvp-card pvp-card-death"
                :           "pvp-card pvp-card-neutral";

  const badge = isKill
    ? `<span class="pvp-badge pvp-badge-kill">⚔ KILL</span>`
    : isDeath
    ? `<span class="pvp-badge pvp-badge-death">💀 DEATH</span>`
    : `<span class="pvp-badge pvp-badge-neutral">EVENT</span>`;

  const killerGuild = killer.GuildName
    ? `<div class="pvp-pguild">${killer.GuildName}${killer.AllianceTag ? ` [${killer.AllianceTag}]` : ""}</div>` : "";
  const victimGuild = victim.GuildName
    ? `<div class="pvp-pguild">${victim.GuildName}${victim.AllianceTag  ? ` [${victim.AllianceTag}]`  : ""}</div>` : "";

  const guildTag = parts > 1
    ? `<span class="pvp-group-tag">👥 ${parts}-man</span>` : "";

  return `
  <div class="${cardCls}">

    <!-- Top bar: badge / participants / meta -->
    <div class="pvp-card-header">
      <div class="pvp-card-header-left">
        ${badge}
        ${guildTag}
      </div>
      <div class="pvp-card-header-right">
        ${loc  ? `<span class="pvp-meta-loc">📍 ${loc}</span>`  : ""}
        <span class="pvp-meta-time">${time}</span>
        <span class="pvp-meta-fame">⚔ ${fame} fame</span>
      </div>
    </div>

    <!-- Players -->
    <div class="pvp-matchup">

      <!-- Killer -->
      <div class="pvp-player">
        <div class="pvp-player-header">
          <span class="pvp-role-label pvp-role-kill">Killer</span>
        </div>
        <div class="pvp-pname${isKill ? " pvp-pname-tracked" : ""}">${killer.Name || "Unknown"}</div>
        ${killerGuild}
        ${gearStrip(killer.Equipment, false)}
      </div>

      <!-- VS divider -->
      <div class="pvp-vs">⚔</div>

      <!-- Victim -->
      <div class="pvp-player pvp-player-right">
        <div class="pvp-player-header pvp-player-header-right">
          <span class="pvp-role-label pvp-role-death">Victim</span>
        </div>
        <div class="pvp-pname pvp-pname-right${isDeath ? " pvp-pname-tracked" : ""}">${victim.Name || "Unknown"}</div>
        ${victimGuild ? `<div class="pvp-pguild pvp-pguild-right">${victim.GuildName}${victim.AllianceTag ? ` [${victim.AllianceTag}]` : ""}</div>` : ""}
        ${gearStrip(victim.Equipment, true)}
      </div>

    </div>
  </div>`;
}

// ── Render helpers ──────────────────────────────────────────────────

function pvpHost() { return document.getElementById("pvpResults"); }

function pvpLoading(msg = "Loading…") {
  pvpHost().innerHTML = `<div class="pvp-loading">${msg}</div>`;
}

function pvpError(msg) {
  pvpHost().innerHTML = `
    <div class="pvp-error-box">
      <div class="pvp-error-title">⚠ Could not load data</div>
      <div class="pvp-error-body">${msg}</div>
      <div class="pvp-error-hint">Open browser console (F12) for more details, or try a different server.</div>
    </div>`;
}

function renderSearchResults(results) {
  if (!results.length) {
    pvpHost().innerHTML = `<div class="pvp-empty">No results found — check the spelling or switch server.</div>`;
    return;
  }
  pvpHost().innerHTML = `
    <div class="pvp-result-list">
      ${results.slice(0, 10).map(r => `
        <button class="pvp-result-item"
          onclick="pvpSelectEntity('${r.Id}','${(r.Name||"").replace(/'/g,"\\'").replace(/"/g,"&quot;")}','${pvpState.mode}')">
          <span class="pvp-result-dot"></span>
          <div class="pvp-result-info">
            <div class="pvp-result-name">${r.Name || "—"}</div>
            ${r.GuildName  ? `<div class="pvp-result-sub">${r.GuildName}</div>` : ""}
            ${r.KillFame   ? `<div class="pvp-result-sub">⚔ ${fmtFame(r.KillFame)} kill fame</div>` : ""}
          </div>
          <span class="pvp-result-arrow">View →</span>
        </button>`).join("")}
    </div>`;
}

function renderPvpFeed() {
  const { selected, events, filter } = pvpState;
  const host = pvpHost();

  if (!events.length) {
    host.innerHTML = `<div class="pvp-empty">No recent PvP activity found for <strong>${selected.name}</strong>.<br>
      <span style="font-size:12px;color:#3a4a5e">Data only covers events recorded by the community client app. Older events may not appear.</span></div>`;
    return;
  }

  // Compute stats
  let kills = 0, deaths = 0, totalFame = 0;
  for (const e of events) {
    const isK = selected.type === "guild" ? e.Killer?.GuildId === selected.id : e.Killer?.Id === selected.id;
    const isD = selected.type === "guild" ? e.Victim?.GuildId  === selected.id : e.Victim?.Id  === selected.id;
    if (isK) kills++;
    if (isD) deaths++;
    totalFame += e.TotalVictimKillFame || 0;
  }
  const kd       = deaths > 0 ? (kills / deaths).toFixed(2) : kills > 0 ? "∞" : "—";
  const kdColor  = kd === "∞" || parseFloat(kd) >= 1 ? "#4ade80" : kd === "—" ? "#4a5a6e" : "#f87171";

  // Filter visible events
  const visible = events.filter(e => {
    if (filter === "all") return true;
    const isK = selected.type === "guild" ? e.Killer?.GuildId === selected.id : e.Killer?.Id === selected.id;
    const isD = selected.type === "guild" ? e.Victim?.GuildId  === selected.id : e.Victim?.Id  === selected.id;
    return filter === "kills" ? isK : isD;
  });

  const safeId   = selected.id.replace(/'/g, "\\'");
  const safeName = selected.name.replace(/'/g, "\\'").replace(/"/g, "&quot;");

  host.innerHTML = `

    <!-- Profile header -->
    <div class="pvp-profile">
      <div class="pvp-profile-left">
        <div class="pvp-profile-type">${selected.type === "guild" ? "🛡 Guild" : "👤 Player"}</div>
        <div class="pvp-profile-name">${selected.name}</div>
      </div>
      <div class="pvp-profile-stats">
        <div class="pvp-stat-block">
          <div class="pvp-stat-val" style="color:#4ade80">${kills}</div>
          <div class="pvp-stat-lbl">Kills</div>
        </div>
        <div class="pvp-stat-sep"></div>
        <div class="pvp-stat-block">
          <div class="pvp-stat-val" style="color:#f87171">${deaths}</div>
          <div class="pvp-stat-lbl">Deaths</div>
        </div>
        <div class="pvp-stat-sep"></div>
        <div class="pvp-stat-block">
          <div class="pvp-stat-val" style="color:${kdColor}">${kd}</div>
          <div class="pvp-stat-lbl">K / D</div>
        </div>
        <div class="pvp-stat-sep"></div>
        <div class="pvp-stat-block">
          <div class="pvp-stat-val" style="color:#e5b25d">${fmtFame(totalFame)}</div>
          <div class="pvp-stat-lbl">Fame</div>
        </div>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="pvp-filter-bar">
      <div class="pvp-filter-group">
        <button class="pvp-filter-btn ${filter==="all"    ? "active" : ""}" onclick="setPvpFilter('all')">
          All <span class="pvp-filter-count">${events.length}</span>
        </button>
        <button class="pvp-filter-btn ${filter==="kills"  ? "active" : ""}" onclick="setPvpFilter('kills')">
          ⚔ Kills <span class="pvp-filter-count">${kills}</span>
        </button>
        <button class="pvp-filter-btn ${filter==="deaths" ? "active" : ""}" onclick="setPvpFilter('deaths')">
          💀 Deaths <span class="pvp-filter-count">${deaths}</span>
        </button>
      </div>
      <button class="pvp-refresh-btn"
        onclick="pvpSelectEntity('${safeId}','${safeName}','${selected.type}')">
        ↻ Refresh
      </button>
    </div>

    <!-- Kill feed -->
    <div class="pvp-feed">
      ${visible.length
        ? visible.map(e => killCard(e, selected.id, selected.type)).join("")
        : `<div class="pvp-empty">No ${filter} to show.</div>`}
    </div>`;
}

// ── Actions (called from HTML onclick / keyboard) ────────────────────

async function pvpSearch(query) {
  query = (query || "").trim();
  if (!query) return;
  pvpLoading("Searching…");

  if (pvpState.mode === "player") {
    try {
      // Primary: fuzzy search index
      let results = await pvpFetch("/players/search", "q=" + encodeURIComponent(query));

      // Fallback: if search index misses the player, try exact-name lookup
      if (!results.length) {
        try {
          const exact = await pvpFetch("/players/playername/" + encodeURIComponent(query));
          if (exact && exact.Id) results = [exact];
        } catch (_) { /* exact lookup also failed — no match */ }
      }

      renderSearchResults(results);
    } catch (e) {
      pvpError(`Search failed: ${e.message}`);
    }
  } else {
    try {
      const data = await pvpFetch("/guilds/search", "q=" + encodeURIComponent(query));
      renderSearchResults(Array.isArray(data) ? data : []);
    } catch (e) {
      pvpError(`Search failed: ${e.message}`);
    }
  }
}

async function pvpSelectEntity(id, name, type) {
  pvpState.selected = { id, name, type };
  pvpState.filter   = "all";
  pvpLoading(`Loading data for ${name}…`);

  try {
    let events = [];
    if (type === "player") {
      const [kills, deaths] = await Promise.all([
        pvpFetch(`/players/${id}/kills`,  "offset=0&limit=20"),
        pvpFetch(`/players/${id}/deaths`, "offset=0&limit=20"),
      ]);
      events = [
        ...(Array.isArray(kills)  ? kills  : []),
        ...(Array.isArray(deaths) ? deaths : []),
      ];
    } else {
      // Guild: fetch events where guild is involved
      const data = await pvpFetch("/events", `guildId=${id}&offset=0&limit=51`);
      events = Array.isArray(data) ? data : [];
    }
    // Sort newest first
    events.sort((a, b) => new Date(b.TimeStamp) - new Date(a.TimeStamp));
    pvpState.events = events;
    renderPvpFeed();
  } catch (e) {
    pvpError(`Failed to load data: ${e.message}`);
  }
}

function setPvpFilter(f) {
  pvpState.filter = f;
  renderPvpFeed();
}

function setPvpMode(mode) {
  pvpState.mode     = mode;
  pvpState.selected = null;
  pvpState.events   = [];
  pvpState.filter   = "all";

  document.getElementById("pvpModePlayer")?.classList.toggle("active", mode === "player");
  document.getElementById("pvpModeGuild")?.classList.toggle("active",  mode === "guild");

  const input = document.getElementById("pvpSearchInput");
  if (input) {
    input.value       = "";
    input.placeholder = mode === "player" ? "Enter player name…" : "Enter guild name…";
  }
  const clearBtn = document.getElementById("pvpClearBtn");
  if (clearBtn) clearBtn.style.display = "none";

  pvpHost().innerHTML = "";
}

function pvpClearSearch() {
  const input    = document.getElementById("pvpSearchInput");
  const clearBtn = document.getElementById("pvpClearBtn");
  if (input)    { input.value = ""; input.focus(); }
  if (clearBtn)   clearBtn.style.display = "none";
  pvpHost().innerHTML = "";
}

// ── Tab bootstrap ────────────────────────────────────────────────────

function initPvpTab() {
  const host = document.getElementById("tab-pvp");
  if (!host || host.dataset.pvpInit) return;
  host.dataset.pvpInit = "1";

  // ── NATIVE UI (Cloudflare Worker is configured) ──────────────────
  if (CF_WORKER_URL) {
    host.innerHTML = `
      <div class="max-w-3xl mx-auto">

        <!-- Mode toggle -->
        <div class="pvp-mode-row">
          <button id="pvpModePlayer" class="pvp-mode-btn active" onclick="setPvpMode('player')">👤 Player</button>
          <button id="pvpModeGuild"  class="pvp-mode-btn"        onclick="setPvpMode('guild')">🛡 Guild</button>
        </div>

        <!-- Search bar -->
        <div class="pvp-search-row">
          <div class="pvp-search-box">
            <span class="pvp-search-icon">⌕</span>
            <input id="pvpSearchInput" type="text" autocomplete="off"
              class="pvp-search-input"
              placeholder="Enter player name…" />
            <button id="pvpClearBtn" class="pvp-clear-btn" style="display:none" onclick="pvpClearSearch()">✕</button>
          </div>
          <button class="pvp-search-submit" onclick="pvpSearch(document.getElementById('pvpSearchInput').value)">
            Search →
          </button>
        </div>

        <!-- Results / feed area -->
        <div id="pvpResults"></div>

        <!-- External links footer -->
        <div style="margin-top:32px;padding-top:20px;border-top:1px solid #1e2a3a">
          <p style="font-size:11px;color:#3a4a5e;text-align:center;margin-bottom:12px">
            For battle reports &amp; ZvZ analysis, visit the community killboards:
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">
            <a href="https://murderledger.albiononline2d.com/" target="_blank" rel="noopener" class="pvp-ext-tag" style="text-decoration:none">🗡 Murder Ledger</a>
            <a href="https://killboard-1.com/"                 target="_blank" rel="noopener" class="pvp-ext-tag" style="text-decoration:none">⚔ KillBoard #1</a>
            <a href="https://albionbattlehub.com/"             target="_blank" rel="noopener" class="pvp-ext-tag" style="text-decoration:none">🛡 Battle Hub</a>
            <a href="https://albionbb.com/"                    target="_blank" rel="noopener" class="pvp-ext-tag" style="text-decoration:none">📊 AlbionBB</a>
          </div>
        </div>

      </div>`;

    // Wire up search input
    const inp = document.getElementById("pvpSearchInput");
    const clr = document.getElementById("pvpClearBtn");
    inp?.addEventListener("keydown", e => { if (e.key === "Enter") pvpSearch(inp.value); });
    inp?.addEventListener("input",   () => { if (clr) clr.style.display = inp.value ? "" : "none"; });
    return;
  }

  // ── PLACEHOLDER UI (no Worker yet) ──────────────────────────────
  host.innerHTML = `
    <div class="max-w-3xl mx-auto">

      <div class="pvp-empty-state" style="padding-bottom:24px">
        <div class="pvp-empty-icon">⚔</div>
        <div class="pvp-empty-title">PvP Kill &amp; Death Tracker</div>
        <div class="pvp-empty-desc">
          Native player search is coming soon. While we finish the full integration,
          use the trusted community killboards below.
        </div>
      </div>

      <div class="pvp-search-row" style="margin-bottom:28px">
        <div class="pvp-search-box">
          <span class="pvp-search-icon">⌕</span>
          <input id="pvpExtInput" type="text" autocomplete="off"
            class="pvp-search-input" placeholder="Enter player or guild name…" />
        </div>
        <button class="pvp-search-submit" onclick="pvpOpenExternal('ml')">Look up →</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-bottom:32px">
        <a href="https://murderledger.albiononline2d.com/" target="_blank" rel="noopener" class="pvp-ext-card">
          <div class="pvp-ext-card-header" style="color:#f87171">🗡 Murder Ledger</div>
          <div class="pvp-ext-card-desc">Full kill &amp; death history, build stats, weapon matchup matrix, guild leaderboards.</div>
          <div class="pvp-ext-card-tags"><span class="pvp-ext-tag">All servers</span><span class="pvp-ext-tag">Player search</span><span class="pvp-ext-tag">Guild search</span></div>
          <div class="pvp-ext-card-link">Open Murder Ledger →</div>
        </a>
        <a href="https://killboard-1.com/" target="_blank" rel="noopener" class="pvp-ext-card">
          <div class="pvp-ext-card-header" style="color:#fb923c">⚔ KillBoard #1</div>
          <div class="pvp-ext-card-desc">Tracks kills, deaths, and PvP performance. Includes a Discord bot for guild kill notifications.</div>
          <div class="pvp-ext-card-tags"><span class="pvp-ext-tag">All servers</span><span class="pvp-ext-tag">Discord bot</span><span class="pvp-ext-tag">Guild tracking</span></div>
          <div class="pvp-ext-card-link">Open KillBoard #1 →</div>
        </a>
        <a href="https://albionbattlehub.com/" target="_blank" rel="noopener" class="pvp-ext-card">
          <div class="pvp-ext-card-header" style="color:#60a5fa">🛡 Albion Battle Hub</div>
          <div class="pvp-ext-card-desc">Advanced killboard and ZvZ battle reports. Multi-battle analysis and regear system.</div>
          <div class="pvp-ext-card-tags"><span class="pvp-ext-tag">Battle reports</span><span class="pvp-ext-tag">ZvZ analysis</span><span class="pvp-ext-tag">Regear tool</span></div>
          <div class="pvp-ext-card-link">Open Battle Hub →</div>
        </a>
        <a href="https://albionbb.com/" target="_blank" rel="noopener" class="pvp-ext-card">
          <div class="pvp-ext-card-header" style="color:#a78bfa">📊 AlbionBB</div>
          <div class="pvp-ext-card-desc">Detailed battle reports for guilds and alliances. Damage, healing, fame, and compositions.</div>
          <div class="pvp-ext-card-tags"><span class="pvp-ext-tag">Guild stats</span><span class="pvp-ext-tag">Alliance view</span><span class="pvp-ext-tag">Damage logs</span></div>
          <div class="pvp-ext-card-link">Open AlbionBB →</div>
        </a>
      </div>
    </div>`;

  document.getElementById("pvpExtInput")?.addEventListener("keydown", e => {
    if (e.key === "Enter") pvpOpenExternal("ml");
  });
}

function pvpOpenExternal(site) {
  const name = (document.getElementById("pvpExtInput")?.value || "").trim();
  const urls = {
    ml: name
      ? `https://murderledger.albiononline2d.com/Check#${encodeURIComponent(name)}`
      : "https://murderledger.albiononline2d.com/",
  };
  window.open(urls[site] || urls.ml, "_blank", "noopener");
}

// Expose everything app.js needs
window.initPvpTab      = initPvpTab;
window.pvpSelectEntity = pvpSelectEntity;
window.setPvpFilter    = setPvpFilter;
window.setPvpMode      = setPvpMode;
window.pvpSearch       = pvpSearch;
window.pvpClearSearch  = pvpClearSearch;
