// ================================================================
//  Albion Live Market Tracker — dashboard.js
//  📊 My Albion — Personalized Dashboard
//  Watchlisted items with live prices + saved trade routes,
//  all persisted in localStorage.
//
//  Dependencies: app.js (apiFetch, API_BASES, CITIES, CITY_META,
//                        iconUrl, FALLBACK_ICON)
// ================================================================

const DASH_STORAGE_KEY  = "albion_watchlist_v2";
const ROUTE_STORAGE_KEY = "albion_saved_routes_v1";
const DASH_REFRESH_MS   = 60 * 1000; // auto-refresh every 60s

// ── STORAGE HELPERS ───────────────────────────────────────────

function loadWatchlist() {
  try { return JSON.parse(localStorage.getItem(DASH_STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveWatchlist(list) {
  try { localStorage.setItem(DASH_STORAGE_KEY, JSON.stringify(list)); }
  catch {}
}

function loadSavedRoutes() {
  try { return JSON.parse(localStorage.getItem(ROUTE_STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveSavedRoutes(list) {
  try { localStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(list)); }
  catch {}
}

// ── DASHBOARD STATE ───────────────────────────────────────────

const dashState = {
  watchlist:    loadWatchlist(),  // [{itemId, itemName}]
  savedRoutes:  loadSavedRoutes(), // [{itemId, itemName, fromCity, toCity, profit, profitPct, savedAt}]
  priceCache:   {},               // itemId → {prices, fetchedAt}
  refreshTimer: null,
};

// ── ADD/REMOVE ITEMS ──────────────────────────────────────────

// Called from scanner ★ button and from within the dashboard
window.dashboardAddItem = function(itemId, itemName) {
  const list = dashState.watchlist;
  if (list.some(x => x.itemId === itemId)) {
    showDashToast(`${itemName} is already in your watchlist`);
    return;
  }
  list.push({ itemId, itemName });
  dashState.watchlist = list;
  saveWatchlist(list);
  // If tab is active, re-render
  const host = document.getElementById("tab-dashboard");
  if (host && !host.classList.contains("hidden")) {
    renderWatchlist();
  }
  showDashToast(`★ Added ${itemName} to watchlist`);
};

function dashboardRemoveItem(itemId) {
  dashState.watchlist = dashState.watchlist.filter(x => x.itemId !== itemId);
  saveWatchlist(dashState.watchlist);
  renderWatchlist();
}

// Called from routes tab "save route" button (exposed globally)
window.dashboardSaveRoute = function(route) {
  const routes = dashState.savedRoutes;
  const key = `${route.itemId}|${route.fromCity}→${route.toCity}`;
  if (routes.some(r => `${r.itemId}|${r.fromCity}→${r.toCity}` === key)) {
    showDashToast("Route already saved");
    return;
  }
  routes.unshift({ ...route, savedAt: new Date().toISOString() });
  if (routes.length > 20) routes.pop();
  dashState.savedRoutes = routes;
  saveSavedRoutes(routes);
  showDashToast(`Route saved: ${route.fromCity} → ${route.toCity}`);
};

// ── TOAST ─────────────────────────────────────────────────────

function showDashToast(msg) {
  let toast = document.getElementById("dashToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "dashToast";
    toast.className = "dash-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("dash-toast-show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("dash-toast-show"), 2500);
}

// ── PRICE FETCHING ────────────────────────────────────────────

async function fetchWatchlistPrices(itemIds, serverKey) {
  if (!itemIds.length) return [];
  const base   = window.API_BASES?.[serverKey] || "https://europe.albion-online-data.com/api/v2";
  const cities = (window.CITIES || []).join(",");
  // Batch up to 20 items at once
  const BATCH = 20;
  const results = [];
  for (let i = 0; i < itemIds.length; i += BATCH) {
    const chunk = itemIds.slice(i, i + BATCH);
    const url   = `${base}/stats/prices/${chunk.join(",")}.json?locations=${encodeURIComponent(cities)}&qualities=1`;
    try {
      const data = await window.apiFetch(url, { forceRefresh: true });
      results.push(...(data || []));
    } catch {}
    if (i + BATCH < itemIds.length) await new Promise(r => setTimeout(r, 150));
  }
  return results;
}

function bestPrices(rows) {
  // Returns { cheapestSellCity, cheapestSellPrice, highestBuyCity, highestBuyPrice, bestFlipProfit, bestFlipPct }
  const cityMap = {};
  for (const r of rows) {
    const c = r.city;
    if (!c) continue;
    if (!cityMap[c]) cityMap[c] = { sell: 0, buy: 0 };
    if (r.sell_price_min > 0 && (!cityMap[c].sell || r.sell_price_min < cityMap[c].sell))
      cityMap[c].sell = r.sell_price_min;
    if (r.buy_price_max > 0 && r.buy_price_max > cityMap[c].buy)
      cityMap[c].buy = r.buy_price_max;
  }

  let cheapestSell = Infinity, cheapestSellCity = null;
  let highestBuy   = 0,        highestBuyCity   = null;

  for (const [city, p] of Object.entries(cityMap)) {
    if (p.sell > 0 && p.sell < cheapestSell) { cheapestSell = p.sell; cheapestSellCity = city; }
    if (p.buy > 0 && p.buy > highestBuy)     { highestBuy  = p.buy;  highestBuyCity   = city; }
  }

  if (cheapestSell === Infinity) cheapestSell = 0;

  let bestFlipProfit = 0, bestFlipFrom = null, bestFlipTo = null, bestFlipPct = 0;
  // Find best inter-city flip
  for (const [fromCity, fp] of Object.entries(cityMap)) {
    if (!fp.sell) continue;
    for (const [toCity, tp] of Object.entries(cityMap)) {
      if (toCity === fromCity) continue;
      if (!tp.sell || tp.sell <= fp.sell) continue;
      const profit = tp.sell - fp.sell;
      if (profit > bestFlipProfit) {
        bestFlipProfit = profit;
        bestFlipFrom   = fromCity;
        bestFlipTo     = toCity;
        bestFlipPct    = (profit / fp.sell) * 100;
      }
    }
  }

  return {
    cheapestSell, cheapestSellCity,
    highestBuy, highestBuyCity,
    bestFlipProfit, bestFlipFrom, bestFlipTo, bestFlipPct,
    cityMap,
  };
}

// ── FORMAT HELPERS ────────────────────────────────────────────

function dFmt(n) {
  if (!n || isNaN(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "k";
  return Math.round(n).toLocaleString();
}

function dPColor(pct) {
  if (pct >= 30) return "#4ade80";
  if (pct >= 15) return "#a3e635";
  if (pct >= 7)  return "#fbbf24";
  return "#f87171";
}

// ── RENDER ────────────────────────────────────────────────────

function renderDashboardTab() {
  const host = document.getElementById("tab-dashboard");
  if (!host) return;

  host.innerHTML = `
    <!-- Quick Stats from last scanner run -->
    <div id="dashScannerSummary" class="dash-scanner-summary hidden"></div>

    <!-- Watchlist section -->
    <div class="dash-section">
      <div class="dash-section-header">
        <div>
          <h2 class="dash-section-title">★ My Watchlist</h2>
          <p class="dash-section-sub">Add items to track live prices across all cities. Hit ★ on any Scanner result to add.</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="dashShareBtn" class="dash-share-btn" title="Copy shareable link">🔗 Share</button>
          <button id="dashRefreshBtn" class="dash-refresh-btn" title="Refresh all prices">↻ Refresh</button>
        </div>
      </div>

      <!-- Search to add items -->
      <div class="dash-add-row">
        <select id="dashAddSelect" class="dash-add-select">
          <option value="">— Add item to watchlist —</option>
        </select>
        <button id="dashAddBtn" class="dash-add-btn" disabled>+ Add</button>
      </div>

      <!-- Watchlist items -->
      <div id="dashWatchlist" class="dash-watchlist">
        <div class="dash-watchlist-loading" id="dashLoadingMsg" style="display:none">
          <span class="dash-spinner"></span> Fetching live prices…
        </div>
      </div>
    </div>

    <!-- Saved Routes section -->
    <div class="dash-section" id="dashRoutesSection">
      <div class="dash-section-header">
        <h2 class="dash-section-title">📍 Saved Routes</h2>
        <button id="dashClearRoutes" class="dash-clear-btn">Clear all</button>
      </div>
      <div id="dashRoutesList"></div>
    </div>
  `;

  // Populate add-item dropdown from SCAN_ITEMS
  const addSelect = document.getElementById("dashAddSelect");
  const items = window.SCAN_ITEMS || [];
  const cats = {};
  for (const it of items) {
    if (!cats[it.cat]) cats[it.cat] = [];
    cats[it.cat].push(it);
  }
  for (const [cat, list] of Object.entries(cats)) {
    const grp = document.createElement("optgroup");
    grp.label = cat;
    for (const it of list) {
      const opt = document.createElement("option");
      opt.value = it.id;
      opt.dataset.name = it.name;
      opt.textContent = it.name;
      grp.appendChild(opt);
    }
    addSelect.appendChild(grp);
  }

  const addBtn = document.getElementById("dashAddBtn");
  addSelect.addEventListener("change", () => {
    addBtn.disabled = !addSelect.value;
  });

  addBtn.addEventListener("click", () => {
    const id   = addSelect.value;
    const name = addSelect.selectedOptions[0]?.dataset?.name || id;
    if (id) {
      window.dashboardAddItem(id, name);
      addSelect.value = "";
      addBtn.disabled = true;
    }
  });

  document.getElementById("dashRefreshBtn")?.addEventListener("click", () => refreshWatchlistPrices());
  document.getElementById("dashShareBtn")?.addEventListener("click", () => window.shareWatchlistUrl());

  document.getElementById("dashClearRoutes")?.addEventListener("click", () => {
    dashState.savedRoutes = [];
    saveSavedRoutes([]);
    renderSavedRoutes();
  });

  renderWatchlist();
  renderSavedRoutes();
  updateScannerSummary();

  // Auto-refresh
  clearInterval(dashState.refreshTimer);
  dashState.refreshTimer = setInterval(() => {
    if (!document.getElementById("tab-dashboard")?.classList.contains("hidden")) {
      refreshWatchlistPrices();
    }
  }, DASH_REFRESH_MS);
}

async function refreshWatchlistPrices() {
  const list = dashState.watchlist;
  if (!list.length) return;

  const loadMsg = document.getElementById("dashLoadingMsg");
  if (loadMsg) loadMsg.style.display = "flex";

  const serverKey = document.getElementById("server")?.value || "europe";
  const ids       = list.map(x => x.itemId);
  const rows      = await fetchWatchlistPrices(ids, serverKey);

  // Update cache
  for (const item of list) {
    const itemRows = rows.filter(r => r.item_id === item.itemId);
    if (itemRows.length) {
      dashState.priceCache[item.itemId] = {
        prices:    bestPrices(itemRows),
        fetchedAt: new Date(),
      };
    }
  }

  if (loadMsg) loadMsg.style.display = "none";
  renderWatchlist();
}

function renderWatchlist() {
  const container = document.getElementById("dashWatchlist");
  if (!container) return;

  const list = dashState.watchlist;

  if (!list.length) {
    container.innerHTML = `
      <div class="dash-watchlist-empty">
        <div class="dash-empty-icon">★</div>
        <div class="dash-empty-title">Your watchlist is empty</div>
        <div class="dash-empty-sub">Search for an item above or click ★ on any Scanner result to start tracking prices.</div>
      </div>`;
    return;
  }

  const meta = window.CITY_META || {};

  const cards = list.map(item => {
    const cached = dashState.priceCache[item.itemId];
    const p      = cached?.prices;
    const icon   = window.iconUrl ? window.iconUrl(item.itemId, 1, 1) : "";
    const age    = cached?.fetchedAt
      ? `Updated ${Math.floor((Date.now() - cached.fetchedAt) / 60000)}m ago`
      : "Not loaded yet";

    const cheapColor  = meta[p?.cheapestSellCity]?.color || "#94a3b8";
    const buyColor    = meta[p?.highestBuyCity]?.color   || "#94a3b8";
    const flipColor   = p?.bestFlipPct ? dPColor(p.bestFlipPct) : "#94a3b8";

    const flipSection = p?.bestFlipProfit > 0 ? `
      <div class="dash-card-flip">
        <span class="dash-flip-label">Best Flip</span>
        <span class="dash-flip-route">
          <span style="color:${meta[p.bestFlipFrom]?.color||'#94a3b8'}">${p.bestFlipFrom||"?"}</span>
          <span class="dash-flip-arrow">→</span>
          <span style="color:${meta[p.bestFlipTo]?.color||'#94a3b8'}">${p.bestFlipTo||"?"}</span>
        </span>
        <span class="dash-flip-profit" style="color:${flipColor}">+${dFmt(p.bestFlipProfit)} (${p.bestFlipPct?.toFixed(1)}%)</span>
      </div>` : "";

    return `
      <div class="dash-card" data-item="${item.itemId}">
        <div class="dash-card-left">
          ${icon ? `<img src="${icon}" class="dash-card-icon" onerror="this.src='${window.FALLBACK_ICON||""}'" alt="" />` : `<div class="dash-card-icon-placeholder">⚔</div>`}
          <div class="dash-card-meta">
            <div class="dash-card-name">${item.itemName}</div>
            <div class="dash-card-age">${age}</div>
          </div>
        </div>
        <div class="dash-card-prices">
          ${p ? `
            <div class="dash-price-pill">
              <span class="dash-price-label">Cheapest Sell</span>
              <span class="dash-price-city" style="color:${cheapColor}">${p.cheapestSellCity || "—"}</span>
              <span class="dash-price-val">${dFmt(p.cheapestSell)}</span>
            </div>
            <div class="dash-price-pill">
              <span class="dash-price-label">Highest Buy</span>
              <span class="dash-price-city" style="color:${buyColor}">${p.highestBuyCity || "—"}</span>
              <span class="dash-price-val">${dFmt(p.highestBuy)}</span>
            </div>
          ` : `<div class="dash-price-loading">Click ↻ to load prices</div>`}
        </div>
        ${flipSection}
        <div class="dash-card-actions">
          <button class="dash-view-btn" onclick="scanViewItem('${item.itemId}','${item.itemName.replace(/'/g,"\\'")}')">View →</button>
          <button class="dash-remove-btn" onclick="dashboardRemoveItem('${item.itemId}')" title="Remove from watchlist">✕</button>
        </div>
      </div>`;
  }).join("");

  // Preserve the loading message element, then add cards below
  const loadMsg = container.querySelector("#dashLoadingMsg") ||
    (() => { const el = document.createElement("div"); el.id="dashLoadingMsg"; el.className="dash-watchlist-loading"; el.style.display="none"; return el; })();

  container.innerHTML = `<div id="dashLoadingMsg" class="dash-watchlist-loading" style="display:none"><span class="dash-spinner"></span> Fetching live prices…</div>` + cards;
}

// ── SAVED ROUTES ──────────────────────────────────────────────

function renderSavedRoutes() {
  const container = document.getElementById("dashRoutesList");
  if (!container) return;

  const routes = dashState.savedRoutes;

  if (!routes.length) {
    container.innerHTML = `<div class="dash-routes-empty">No saved routes yet. Click the <strong>Save</strong> button on any route in the 🌍 Routes tab.</div>`;
    return;
  }

  const meta = window.CITY_META || {};

  container.innerHTML = routes.map((r, i) => {
    const fColor = meta[r.fromCity]?.color || "#94a3b8";
    const tColor = meta[r.toCity]?.color   || "#94a3b8";
    const pColor = dPColor(r.profitPct || 0);
    const savedDate = r.savedAt ? new Date(r.savedAt).toLocaleDateString() : "";

    return `
      <div class="dash-route-row">
        <div class="dash-route-item">${r.itemName}</div>
        <div class="dash-route-path">
          <span style="color:${fColor}">${r.fromCity}</span>
          <span class="dash-route-arrow">→</span>
          <span style="color:${tColor}">${r.toCity}</span>
        </div>
        <div class="dash-route-profit" style="color:${pColor}">+${dFmt(r.profit)} s</div>
        <div class="dash-route-roi" style="color:${pColor}">${r.profitPct?.toFixed(1) || "—"}%</div>
        <div class="dash-route-date">${savedDate}</div>
        <button class="dash-route-remove" onclick="dashboardRemoveSavedRoute(${i})" title="Remove">✕</button>
      </div>`;
  }).join("");
}

window.dashboardRemoveSavedRoute = function(index) {
  dashState.savedRoutes.splice(index, 1);
  saveSavedRoutes(dashState.savedRoutes);
  renderSavedRoutes();
};

window.dashboardRemoveItem = dashboardRemoveItem;

// ── SCANNER SUMMARY ───────────────────────────────────────────

function updateScannerSummary() {
  const el = document.getElementById("dashScannerSummary");
  if (!el) return;

  const state = window.scannerState;
  if (!state?.results?.length || !state.lastScanAt) {
    el.classList.add("hidden");
    return;
  }

  const top3 = state.results.slice(0, 3);
  const meta = window.CITY_META || {};

  const cards = top3.map(r => {
    const pColor = dPColor(r.profitPct);
    return `
      <div class="dash-summary-card" onclick="scanViewItem('${r.itemId}','${r.itemName.replace(/'/g,"\\'")}')">
        <div class="dash-summary-item">${r.itemName}</div>
        <div class="dash-summary-route">
          <span style="color:${meta[r.buyFrom]?.color||'#e5b25d'}">${r.buyFrom}</span>
          <span>→</span>
          <span style="color:${meta[r.sellTo]?.color||'#94a3b8'}">${r.sellTo}</span>
        </div>
        <div class="dash-summary-profit" style="color:${pColor}">+${dFmt(r.profit)} s · ${r.profitPct.toFixed(1)}%</div>
      </div>`;
  }).join("");

  el.classList.remove("hidden");
  el.innerHTML = `
    <div class="dash-summary-header">
      <span class="dash-summary-title">🔥 Top Opportunities from Last Scan</span>
      <span class="dash-summary-time">Scanned at ${state.lastScanAt.toLocaleTimeString()}</span>
    </div>
    <div class="dash-summary-cards">${cards}</div>
  `;
}

// ── SHAREABLE WATCHLIST URLS ──────────────────────────────────

/**
 * Encode the watchlist to a compact base64 string for URL sharing.
 * Format: base64(JSON([[itemId, itemName], ...]))
 */
function encodeWatchlistParam(list) {
  const compact = list.map(x => [x.itemId, x.itemName]);
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(compact)))); }
  catch { return btoa(JSON.stringify(compact)); }
}

/**
 * Decode a base64 watchlist param back to [{itemId, itemName}].
 */
function decodeWatchlistParam(str) {
  try {
    const raw = JSON.parse(decodeURIComponent(escape(atob(str))));
    if (!Array.isArray(raw)) return null;
    return raw.map(([itemId, itemName]) => ({ itemId: String(itemId), itemName: String(itemName) }));
  } catch {
    return null;
  }
}

/**
 * Copy a shareable link to clipboard with the current watchlist encoded.
 * The link uses the ?w= query param so recipients get prompted to import on load.
 */
window.shareWatchlistUrl = function() {
  const list = dashState.watchlist;
  if (!list.length) { showDashToast("Nothing in your watchlist to share"); return; }
  const param = encodeWatchlistParam(list);
  const url   = `${location.origin}${location.pathname}?w=${param}#tab-dashboard`;
  navigator.clipboard.writeText(url).then(
    () => showDashToast("📋 Share link copied to clipboard!"),
    () => {
      // Fallback: prompt
      prompt("Copy this link:", url);
    }
  );
};

/**
 * Check URL for ?w= param on init. If present, offer to import the watchlist.
 */
function checkWatchlistImportUrl() {
  const params = new URLSearchParams(location.search);
  const w = params.get("w");
  if (!w) return;

  const imported = decodeWatchlistParam(w);
  if (!imported || !imported.length) return;

  // Clean the URL so refresh doesn't re-prompt
  const cleanUrl = location.pathname + location.hash;
  history.replaceState(null, "", cleanUrl);

  // Show an import banner inside the watchlist section
  const banner = document.createElement("div");
  banner.className = "dash-import-banner";
  banner.innerHTML = `
    <div class="dash-import-text">
      📋 A shared watchlist with <strong>${imported.length} item${imported.length !== 1 ? "s" : ""}</strong> was found in this link.
    </div>
    <div class="dash-import-actions">
      <button class="dash-import-btn dash-import-merge" id="dashImportMerge">Merge with mine</button>
      <button class="dash-import-btn dash-import-replace" id="dashImportReplace">Replace mine</button>
      <button class="dash-import-btn dash-import-ignore" id="dashImportIgnore">Ignore</button>
    </div>`;

  const watchlistEl = document.getElementById("dashWatchlist");
  if (watchlistEl) watchlistEl.prepend(banner);

  document.getElementById("dashImportMerge")?.addEventListener("click", () => {
    let changed = 0;
    for (const item of imported) {
      if (!dashState.watchlist.some(x => x.itemId === item.itemId)) {
        dashState.watchlist.push(item);
        changed++;
      }
    }
    saveWatchlist(dashState.watchlist);
    banner.remove();
    renderWatchlist();
    showDashToast(`Added ${changed} new item${changed !== 1 ? "s" : ""} from shared list`);
    refreshWatchlistPrices();
  });

  document.getElementById("dashImportReplace")?.addEventListener("click", () => {
    dashState.watchlist = imported;
    saveWatchlist(imported);
    banner.remove();
    renderWatchlist();
    showDashToast(`Imported ${imported.length} items from shared list`);
    refreshWatchlistPrices();
  });

  document.getElementById("dashImportIgnore")?.addEventListener("click", () => banner.remove());
}

// ── INIT ──────────────────────────────────────────────────────

window.initDashboardTab = function() {
  const host = document.getElementById("tab-dashboard");
  if (!host || host.dataset.loaded) return;
  host.dataset.loaded = "1";
  renderDashboardTab();
  // Check for shared watchlist URL
  checkWatchlistImportUrl();
  // Kick off a price fetch immediately if watchlist has items
  if (dashState.watchlist.length) {
    refreshWatchlistPrices();
  }
};
