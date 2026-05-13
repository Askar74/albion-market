// ================================================================
//  Albion Live Market Tracker — routes.js
//  🌍 Global Route Optimizer
//  For any item: all buy-city → sell-city combos ranked by profit,
//  with travel time, profit/min, and safe-only filter.
//
//  Dependencies: app.js (apiFetch, API_BASES, CITIES, CITY_META)
//                scanner.js (SCAN_ITEMS)
// ================================================================

// ── TRAVEL TIMES (minutes, city → city, approximate horseback) ──
// Symmetric unless noted. Based on typical road routes.

const TRAVEL_TIMES = {
  // Royal city pairs
  "Bridgewatch↔Thetford":    15,
  "Bridgewatch↔Lymhurst":    25,
  "Bridgewatch↔FortSterling":35,
  "Bridgewatch↔Martlock":    40,
  "Bridgewatch↔Brecilien":   30,
  "Thetford↔Lymhurst":       20,
  "Thetford↔FortSterling":   40,
  "Thetford↔Martlock":       35,
  "Thetford↔Brecilien":      25,
  "Lymhurst↔FortSterling":   30,
  "Lymhurst↔Martlock":       25,
  "Lymhurst↔Brecilien":      20,
  "FortSterling↔Martlock":   15,
  "FortSterling↔Brecilien":  25,
  "Martlock↔Brecilien":      20,
  // Routes through/to Caerleon (red zone)
  "Caerleon↔Bridgewatch":    30,
  "Caerleon↔Thetford":       28,
  "Caerleon↔Lymhurst":       25,
  "Caerleon↔FortSterling":   30,
  "Caerleon↔Martlock":       28,
  "Caerleon↔Brecilien":      35,
  "Caerleon↔BlackMarket":     5,
  // Black Market (via Caerleon portal)
  "Bridgewatch↔BlackMarket": 35,
  "Thetford↔BlackMarket":    33,
  "Lymhurst↔BlackMarket":    30,
  "FortSterling↔BlackMarket":35,
  "Martlock↔BlackMarket":    33,
  "Brecilien↔BlackMarket":   40,
};

// City risk classification
const CITY_RISK = {
  "Caerleon":     "red",
  "Black Market": "red",
  "Bridgewatch":  "yellow",
  "Thetford":     "yellow",
  "Lymhurst":     "green",
  "Brecilien":    "green",
  "Fort Sterling":"green",
  "Martlock":     "green",
};

const RISK_LABEL = { red: "🔴 Red Zone", yellow: "🟡 Yellow", green: "🟢 Safe" };

function getTravelTime(cityA, cityB) {
  const a = cityA.replace(" ", "").replace("Fort Sterling", "FortSterling").replace("Black Market","BlackMarket");
  const b = cityB.replace(" ", "").replace("Fort Sterling", "FortSterling").replace("Black Market","BlackMarket");
  return TRAVEL_TIMES[`${a}↔${b}`] || TRAVEL_TIMES[`${b}↔${a}`] || 30;
}

// ── STATE ─────────────────────────────────────────────────────

const routesState = {
  selectedItem: null,
  rows:         [],
  safeOnly:     false,
  sortCol:      "profitPerMin",
  sortDir:      -1,
  scanning:     false,
};

// ── HELPERS ───────────────────────────────────────────────────

function rFmt(n) {
  if (!n || isNaN(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "k";
  return Math.round(n).toLocaleString();
}

function rProfitColor(pct) {
  if (pct >= 30) return "#4ade80";
  if (pct >= 15) return "#a3e635";
  if (pct >= 7)  return "#fbbf24";
  return "#f87171";
}

function rAgeIsStale(dateStr, maxMins = 180) {
  if (!dateStr) return true;
  const d = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  return (Date.now() - d) / 60000 > maxMins;
}

// ── COMPUTE ROUTES FOR ONE ITEM ───────────────────────────────

function computeRoutes(rows) {
  // Build per-city price summary
  const cityMap = {};
  for (const r of rows) {
    const c = r.city;
    if (!c) continue;
    if (!cityMap[c]) cityMap[c] = { sell: 0, sellAge: null, buy: 0, buyAge: null };
    if (r.sell_price_min > 0 && (!cityMap[c].sell || r.sell_price_min < cityMap[c].sell)) {
      cityMap[c].sell    = r.sell_price_min;
      cityMap[c].sellAge = r.sell_price_min_date;
    }
    if (r.buy_price_max > 0 && r.buy_price_max > cityMap[c].buy) {
      cityMap[c].buy    = r.buy_price_max;
      cityMap[c].buyAge = r.buy_price_max_date;
    }
  }

  const cities  = Object.keys(cityMap);
  const results = [];

  for (const fromCity of cities) {
    const buyPrice = cityMap[fromCity].sell;
    if (!buyPrice || rAgeIsStale(cityMap[fromCity].sellAge)) continue;

    for (const toCity of cities) {
      if (toCity === fromCity) continue;
      const sellPrice = cityMap[toCity].sell; // sell here = compete with this listing
      if (!sellPrice || rAgeIsStale(cityMap[toCity].sellAge)) continue;
      if (sellPrice <= buyPrice) continue;

      const profit       = sellPrice - buyPrice;
      const profitPct    = (profit / buyPrice) * 100;
      if (profitPct < 2) continue;

      const travelMins   = getTravelTime(fromCity, toCity);
      const profitPerMin = profit / travelMins;
      const fromRisk     = CITY_RISK[fromCity] || "green";
      const toRisk       = CITY_RISK[toCity]   || "green";
      const isSafe       = fromRisk !== "red" && toRisk !== "red";

      results.push({
        fromCity, toCity, buyPrice, sellPrice,
        profit, profitPct, travelMins, profitPerMin,
        fromRisk, toRisk, isSafe,
        sellAge: cityMap[toCity].sellAge,
      });
    }
  }

  return results.sort((a, b) => b.profitPerMin - a.profitPerMin);
}

// ── FETCH & ANALYZE ───────────────────────────────────────────

async function scanRouteItem(itemId, serverKey) {
  const base   = window.API_BASES?.[serverKey] || "https://europe.albion-online-data.com/api/v2";
  const cities = (window.CITIES || []).join(",");
  const url    = `${base}/stats/prices/${itemId}.json?locations=${encodeURIComponent(cities)}&qualities=1`;
  try {
    const data = await window.apiFetch(url, { forceRefresh: true });
    return data || [];
  } catch {
    return [];
  }
}

// ── RENDER ────────────────────────────────────────────────────

function renderRoutesTab() {
  const host = document.getElementById("tab-routes");
  if (!host) return;

  // Build item options from SCAN_ITEMS
  const items = window.SCAN_ITEMS || [];
  const optGroups = {};
  for (const it of items) {
    if (!optGroups[it.cat]) optGroups[it.cat] = [];
    optGroups[it.cat].push(it);
  }
  const optHtml = Object.entries(optGroups).map(([cat, list]) =>
    `<optgroup label="${cat}">` +
    list.map(it => `<option value="${it.id}" data-name="${it.name}">${it.name}</option>`).join("") +
    `</optgroup>`
  ).join("");

  host.innerHTML = `
    <div class="routes-header">
      <div class="routes-title-row">
        <div>
          <h2 class="routes-title">🌍 Global Route Optimizer</h2>
          <p class="routes-subtitle">Every buy → sell city combo for any item, ranked by profit/minute. Factor in travel time to find the most efficient routes.</p>
        </div>
        <div class="routes-controls">
          <label class="routes-safe-toggle">
            <input type="checkbox" id="routesSafeOnly" />
            <span class="routes-safe-label">🟢 Safe routes only</span>
          </label>
          <select id="routesItemSelect" class="routes-select">
            <option value="">— Select an item —</option>
            ${optHtml}
          </select>
          <button id="routesScanBtn" class="routes-scan-btn" disabled>🔍 Analyze</button>
        </div>
      </div>
    </div>

    <!-- Best route hero card (shown after scan) -->
    <div id="routesHero" class="hidden"></div>

    <!-- Routes table -->
    <div id="routesTableWrap" class="hidden">
      <div class="routes-table-controls">
        <span id="routesItemLabel" class="routes-item-label"></span>
        <span id="routesCount" class="routes-count"></span>
      </div>
      <div class="routes-table-container">
        <table class="routes-table" id="routesTable">
          <thead>
            <tr>
              <th class="routes-th routes-th-sortable" data-col="fromCity">Buy From</th>
              <th class="routes-th routes-th-sortable" data-col="toCity">Sell To</th>
              <th class="routes-th routes-th-sortable routes-th-right" data-col="buyPrice">Buy Price</th>
              <th class="routes-th routes-th-sortable routes-th-right" data-col="sellPrice">Sell Price</th>
              <th class="routes-th routes-th-sortable routes-th-right" data-col="profit">Profit</th>
              <th class="routes-th routes-th-sortable routes-th-right" data-col="profitPct">ROI %</th>
              <th class="routes-th routes-th-sortable routes-th-right" data-col="travelMins">Travel</th>
              <th class="routes-th routes-th-sortable routes-th-right routes-th-highlight" data-col="profitPerMin">Profit / min</th>
              <th class="routes-th">Risk</th>
            </tr>
          </thead>
          <tbody id="routesBody"></tbody>
        </table>
      </div>
    </div>

    <!-- Empty state -->
    <div id="routesEmpty" class="routes-empty">
      <div class="routes-empty-icon">🌍</div>
      <div class="routes-empty-title">Route Optimizer</div>
      <div class="routes-empty-sub">Select any item from the dropdown and click <strong>Analyze</strong> to see every profitable city-to-city route ranked by how much silver you earn per minute of travel time.</div>
    </div>

    <!-- Loading state -->
    <div id="routesLoading" class="routes-loading hidden">
      <div class="routes-loading-spinner"></div>
      <div class="routes-loading-text">Fetching live prices across all cities…</div>
    </div>
  `;

  // Item select → enable button
  const select  = document.getElementById("routesItemSelect");
  const scanBtn = document.getElementById("routesScanBtn");
  const safeChk = document.getElementById("routesSafeOnly");

  select?.addEventListener("change", () => {
    scanBtn.disabled = !select.value;
    routesState.selectedItem = select.value || null;
  });

  safeChk?.addEventListener("change", () => {
    routesState.safeOnly = safeChk.checked;
    renderRoutesTable();
  });

  scanBtn?.addEventListener("click", () => runRouteAnalysis());

  // Sortable headers
  document.getElementById("routesTable")?.querySelectorAll(".routes-th-sortable").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (routesState.sortCol === col) {
        routesState.sortDir *= -1;
      } else {
        routesState.sortCol = col;
        routesState.sortDir = -1;
      }
      renderRoutesTable();
    });
  });
}

async function runRouteAnalysis() {
  const itemId = routesState.selectedItem;
  if (!itemId) return;

  const serverKey = document.getElementById("server")?.value || "europe";
  const itemName  = document.getElementById("routesItemSelect")?.selectedOptions[0]?.dataset?.name || itemId;

  // Show loading
  document.getElementById("routesEmpty")?.classList.add("hidden");
  document.getElementById("routesHero")?.classList.add("hidden");
  document.getElementById("routesTableWrap")?.classList.add("hidden");
  document.getElementById("routesLoading")?.classList.remove("hidden");

  routesState.scanning = true;
  const rawRows = await scanRouteItem(itemId, serverKey);
  routesState.scanning = false;

  document.getElementById("routesLoading")?.classList.add("hidden");

  if (!rawRows.length) {
    document.getElementById("routesEmpty")?.classList.remove("hidden");
    document.getElementById("routesEmpty").innerHTML = `
      <div class="routes-empty-icon">😔</div>
      <div class="routes-empty-title">No data found</div>
      <div class="routes-empty-sub">No live price data for <strong>${itemName}</strong>. The item may not be actively traded on this server.</div>`;
    return;
  }

  routesState.rows     = computeRoutes(rawRows);
  routesState.itemName = itemName;
  routesState.itemId   = itemId;

  document.getElementById("routesTableWrap")?.classList.remove("hidden");
  document.getElementById("routesItemLabel").textContent = itemName;
  renderRouteHero();
  renderRoutesTable();
}

function renderRouteHero() {
  const hero = document.getElementById("routesHero");
  if (!hero) return;

  const visible = routesState.safeOnly
    ? routesState.rows.filter(r => r.isSafe)
    : routesState.rows;

  const best = visible[0];
  if (!best) { hero.classList.add("hidden"); return; }

  const meta = window.CITY_META || {};
  const fColor = meta[best.fromCity]?.color || "#94a3b8";
  const tColor = meta[best.toCity]?.color   || "#94a3b8";
  const pColor = rProfitColor(best.profitPct);

  hero.classList.remove("hidden");
  hero.innerHTML = `
    <div class="routes-hero-card">
      <div class="routes-hero-label">⚡ Best Route Right Now</div>
      <div class="routes-hero-route">
        <div class="routes-hero-city">
          <div class="routes-hero-city-dot" style="background:${fColor}"></div>
          <div class="routes-hero-city-name" style="color:${fColor}">${best.fromCity}</div>
          <div class="routes-hero-price-label">Buy for</div>
          <div class="routes-hero-price">${rFmt(best.buyPrice)} s</div>
        </div>
        <div class="routes-hero-arrow">
          <div class="routes-hero-travel">✈ ${best.travelMins} min</div>
          <div class="routes-hero-arrow-icon">→</div>
          <div class="routes-hero-ppm" style="color:${pColor}">${rFmt(best.profitPerMin)}<span>s/min</span></div>
        </div>
        <div class="routes-hero-city">
          <div class="routes-hero-city-dot" style="background:${tColor}"></div>
          <div class="routes-hero-city-name" style="color:${tColor}">${best.toCity}</div>
          <div class="routes-hero-price-label">Sell for</div>
          <div class="routes-hero-price">${rFmt(best.sellPrice)} s</div>
        </div>
      </div>
      <div class="routes-hero-stats">
        <div class="routes-hero-stat">
          <span class="routes-hero-stat-label">Profit</span>
          <span class="routes-hero-stat-val" style="color:${pColor}">+${rFmt(best.profit)} s</span>
        </div>
        <div class="routes-hero-stat">
          <span class="routes-hero-stat-label">ROI</span>
          <span class="routes-hero-stat-val" style="color:${pColor}">${best.profitPct.toFixed(1)}%</span>
        </div>
        <div class="routes-hero-stat">
          <span class="routes-hero-stat-label">Risk</span>
          <span class="routes-hero-stat-val">${RISK_LABEL[best.isSafe ? "green" : "red"]}</span>
        </div>
        <div class="routes-hero-stat">
          <span class="routes-hero-stat-label">Travel</span>
          <span class="routes-hero-stat-val">${best.travelMins} min</span>
        </div>
      </div>
    </div>
  `;
}

function renderRoutesTable() {
  const tbody = document.getElementById("routesBody");
  const count = document.getElementById("routesCount");
  if (!tbody) return;

  let rows = routesState.safeOnly
    ? routesState.rows.filter(r => r.isSafe)
    : routesState.rows;

  // Sort
  const { sortCol, sortDir } = routesState;
  rows = [...rows].sort((a, b) => {
    const av = a[sortCol], bv = b[sortCol];
    if (typeof av === "string") return av.localeCompare(bv) * sortDir;
    return ((bv - av) * sortDir);
  });

  if (count) count.textContent = `${rows.length} route${rows.length !== 1 ? "s" : ""}`;

  // Re-apply sort indicators to headers
  document.getElementById("routesTable")?.querySelectorAll(".routes-th-sortable").forEach(th => {
    th.classList.remove("routes-th-asc","routes-th-desc");
    if (th.dataset.col === sortCol) th.classList.add(sortDir === 1 ? "routes-th-asc" : "routes-th-desc");
  });

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="routes-no-rows">${routesState.safeOnly ? "No safe routes found." : "No profitable routes found."}</td></tr>`;
    renderRouteHero();
    return;
  }

  renderRouteHero();

  const meta = window.CITY_META || {};
  tbody.innerHTML = rows.map(r => {
    const fColor  = meta[r.fromCity]?.color || "#94a3b8";
    const tColor  = meta[r.toCity]?.color   || "#94a3b8";
    const pColor  = rProfitColor(r.profitPct);
    const isBM    = r.toCity === "Black Market";
    const riskBadge = r.isSafe
      ? `<span class="routes-risk routes-risk-safe">🟢 Safe</span>`
      : `<span class="routes-risk routes-risk-danger">🔴 Danger</span>`;

    return `<tr class="routes-row${isBM?" routes-row-bm":""}">
      <td class="routes-td">
        <span class="routes-city-dot" style="background:${fColor}"></span>
        <span class="routes-city-name" style="color:${fColor}">${r.fromCity}</span>
      </td>
      <td class="routes-td">
        <span class="routes-city-dot" style="background:${tColor}"></span>
        <span class="routes-city-name ${isBM?"routes-bm":""}" style="color:${tColor}">${r.toCity}</span>
      </td>
      <td class="routes-td routes-td-right routes-mono">${rFmt(r.buyPrice)}</td>
      <td class="routes-td routes-td-right routes-mono">${rFmt(r.sellPrice)}</td>
      <td class="routes-td routes-td-right routes-mono" style="color:${pColor}">+${rFmt(r.profit)}</td>
      <td class="routes-td routes-td-right" style="color:${pColor}">${r.profitPct.toFixed(1)}%</td>
      <td class="routes-td routes-td-right routes-travel">${r.travelMins}m</td>
      <td class="routes-td routes-td-right routes-ppm" style="color:${pColor}">${rFmt(r.profitPerMin)}</td>
      <td class="routes-td">${riskBadge}</td>
    </tr>`;
  }).join("");
}

// ── INIT ──────────────────────────────────────────────────────

window.initRoutesTab = function() {
  const host = document.getElementById("tab-routes");
  if (!host || host.dataset.loaded) return;
  host.dataset.loaded = "1";
  renderRoutesTab();
};
