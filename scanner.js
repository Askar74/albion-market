// ================================================================
//  Albion Live Market Tracker — scanner.js
//  Live Profit Scanner: auto-ranks the best flip & craft
//  opportunities across all items and cities in real-time.
//
//  Dependencies (loaded before this script):
//    app.js  → window.apiFetch, API_BASES, CITIES, CITY_META,
//              iconUrl, ageString, FALLBACK_ICON
// ================================================================

// ── SCAN ITEM LIST ────────────────────────────────────────────
// High-traffic items most likely to have live prices. Grouped by
// category so the UI can later show category filters.

const SCAN_ITEMS = [
  // ── Resources ──
  { id: "T4_PLANKS",     name: "Birch Plank",         cat: "Resources" },
  { id: "T5_PLANKS",     name: "Chestnut Plank",       cat: "Resources" },
  { id: "T6_PLANKS",     name: "Pine Plank",           cat: "Resources" },
  { id: "T7_PLANKS",     name: "Cedar Plank",          cat: "Resources" },
  { id: "T8_PLANKS",     name: "Mahogany Plank",       cat: "Resources" },
  { id: "T4_METALBAR",   name: "Steel Bar",            cat: "Resources" },
  { id: "T5_METALBAR",   name: "Titanium Steel Bar",   cat: "Resources" },
  { id: "T6_METALBAR",   name: "Runite Steel Bar",     cat: "Resources" },
  { id: "T7_METALBAR",   name: "Meteorite Steel Bar",  cat: "Resources" },
  { id: "T8_METALBAR",   name: "Refined Infused Steel",cat: "Resources" },
  { id: "T4_CLOTH",      name: "Wool Cloth",           cat: "Resources" },
  { id: "T5_CLOTH",      name: "Linen Cloth",          cat: "Resources" },
  { id: "T6_CLOTH",      name: "Mage Cloth",           cat: "Resources" },
  { id: "T7_CLOTH",      name: "Infused Mage Cloth",   cat: "Resources" },
  { id: "T8_CLOTH",      name: "Refined Infused Cloth",cat: "Resources" },
  { id: "T4_LEATHER",    name: "Worked Leather",       cat: "Resources" },
  { id: "T5_LEATHER",    name: "Cured Leather",        cat: "Resources" },
  { id: "T6_LEATHER",    name: "Hardened Leather",     cat: "Resources" },
  { id: "T7_LEATHER",    name: "Reinforced Leather",   cat: "Resources" },
  { id: "T8_LEATHER",    name: "Refined Infused Leather",cat:"Resources" },
  { id: "T4_STONEBLOCK", name: "Sandstone Block",      cat: "Resources" },
  { id: "T5_STONEBLOCK", name: "Limestone Block",      cat: "Resources" },
  { id: "T6_STONEBLOCK", name: "Granite Block",        cat: "Resources" },
  { id: "T7_STONEBLOCK", name: "Slate Block",          cat: "Resources" },
  { id: "T8_STONEBLOCK", name: "Basalt Block",         cat: "Resources" },

  // ── Bags ──
  { id: "T4_BAG",        name: "Adept's Bag",          cat: "Bags" },
  { id: "T5_BAG",        name: "Expert's Bag",          cat: "Bags" },
  { id: "T6_BAG",        name: "Master's Bag",          cat: "Bags" },
  { id: "T7_BAG",        name: "Grandmaster's Bag",     cat: "Bags" },
  { id: "T8_BAG",        name: "Elder's Bag",           cat: "Bags" },

  // ── Weapons ──
  { id: "T4_MAIN_SWORD", name: "Adept's Broadsword",   cat: "Weapons" },
  { id: "T5_MAIN_SWORD", name: "Expert's Broadsword",  cat: "Weapons" },
  { id: "T6_MAIN_SWORD", name: "Master's Broadsword",  cat: "Weapons" },
  { id: "T7_MAIN_SWORD", name: "Grandmaster's Broadsword",cat:"Weapons"},
  { id: "T8_MAIN_SWORD", name: "Elder's Broadsword",   cat: "Weapons" },
  { id: "T4_2H_AXE",     name: "Adept's Greataxe",     cat: "Weapons" },
  { id: "T6_2H_AXE",     name: "Master's Greataxe",    cat: "Weapons" },
  { id: "T8_2H_AXE",     name: "Elder's Greataxe",     cat: "Weapons" },
  { id: "T4_2H_BOW",     name: "Adept's Bow",          cat: "Weapons" },
  { id: "T6_2H_BOW",     name: "Master's Bow",         cat: "Weapons" },
  { id: "T8_2H_BOW",     name: "Elder's Bow",          cat: "Weapons" },
  { id: "T4_MAIN_FIRESTAFF", name: "Adept's Fire Staff",cat:"Weapons" },
  { id: "T6_MAIN_FIRESTAFF", name: "Master's Fire Staff",cat:"Weapons"},
  { id: "T8_MAIN_FIRESTAFF", name: "Elder's Fire Staff", cat:"Weapons"},
  { id: "T6_MAIN_HOLYSTAFF",name: "Master's Holy Staff", cat:"Weapons"},
  { id: "T8_MAIN_HOLYSTAFF",name: "Elder's Holy Staff",  cat:"Weapons"},
  { id: "T6_MAIN_NATURESTAFF",name:"Master's Nature Staff",cat:"Weapons"},
  { id: "T8_MAIN_NATURESTAFF",name:"Elder's Nature Staff", cat:"Weapons"},
  { id: "T4_2H_CROSSBOW",name: "Adept's Heavy Crossbow",cat:"Weapons" },
  { id: "T6_2H_CROSSBOW",name: "Master's Heavy Crossbow",cat:"Weapons"},
  { id: "T8_2H_CROSSBOW",name: "Elder's Heavy Crossbow", cat:"Weapons"},

  // ── Armor ──
  { id: "T4_ARMOR_PLATE_SET1", name: "Adept's Plate Armor",  cat: "Armor" },
  { id: "T6_ARMOR_PLATE_SET1", name: "Master's Plate Armor", cat: "Armor" },
  { id: "T8_ARMOR_PLATE_SET1", name: "Elder's Plate Armor",  cat: "Armor" },
  { id: "T4_HEAD_PLATE_SET1",  name: "Adept's Plate Helmet", cat: "Armor" },
  { id: "T6_HEAD_PLATE_SET1",  name: "Master's Plate Helmet",cat: "Armor" },
  { id: "T8_HEAD_PLATE_SET1",  name: "Elder's Plate Helmet", cat: "Armor" },
  { id: "T4_SHOES_PLATE_SET1", name: "Adept's Plate Boots",  cat: "Armor" },
  { id: "T6_SHOES_PLATE_SET1", name: "Master's Plate Boots", cat: "Armor" },
  { id: "T4_ARMOR_LEATHER_SET1",name:"Adept's Leather Armor",cat: "Armor" },
  { id: "T6_ARMOR_LEATHER_SET1",name:"Master's Leather Armor",cat:"Armor" },
  { id: "T8_ARMOR_LEATHER_SET1",name:"Elder's Leather Armor", cat:"Armor" },
  { id: "T4_ARMOR_CLOTH_SET1", name: "Adept's Scholar Robe", cat: "Armor" },
  { id: "T6_ARMOR_CLOTH_SET1", name: "Master's Scholar Robe",cat: "Armor" },
  { id: "T8_ARMOR_CLOTH_SET1", name: "Elder's Scholar Robe", cat: "Armor" },

  // ── Mounts ──
  { id: "T3_MOUNT_HORSE",     name: "Journeyman's Horse",   cat: "Mounts" },
  { id: "T5_MOUNT_HORSE",     name: "Expert's Horse",       cat: "Mounts" },
  { id: "T7_MOUNT_HORSE",     name: "Grandmaster's Horse",  cat: "Mounts" },
  { id: "T5_MOUNT_OX",        name: "Expert's Ox",          cat: "Mounts" },
  { id: "T7_MOUNT_OX",        name: "Grandmaster's Ox",     cat: "Mounts" },
  { id: "T8_MOUNT_OX",        name: "Elder's Ox",           cat: "Mounts" },

  // ── Food & Potions ──
  { id: "T4_POTION_HEAL",     name: "Adept's Healing Potion",cat:"Consumables" },
  { id: "T6_POTION_HEAL",     name: "Master's Healing Potion",cat:"Consumables"},
  { id: "T8_POTION_HEAL",     name: "Elder's Healing Potion", cat:"Consumables"},
  { id: "T4_MEAL_PIE",        name: "Adept's Pie",           cat:"Consumables" },
  { id: "T6_MEAL_PIE",        name: "Master's Pie",          cat:"Consumables" },
  { id: "T8_MEAL_PIE",        name: "Elder's Pie",           cat:"Consumables" },
  { id: "T4_MEAL_SALAD",      name: "Adept's Salad",         cat:"Consumables" },
  { id: "T6_MEAL_SALAD",      name: "Master's Salad",        cat:"Consumables" },
  { id: "T8_MEAL_SALAD",      name: "Elder's Salad",         cat:"Consumables" },
];

// ── SCANNER STATE ──────────────────────────────────────────────

const scannerState = {
  running:     false,
  results:     [],       // sorted opportunity objects
  progress:    0,        // 0–100
  filterCat:   "All",
  filterMode:  "flip",   // "flip" | "craft" | "all"
  lastScanAt:  null,
  autoTimer:   null,
  serverKey:   "europe",
};

// ── HELPERS ───────────────────────────────────────────────────

function scanFmt(n) {
  if (!n || isNaN(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "k";
  return Math.round(n).toLocaleString();
}

function scanAge(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  const mins = Math.floor((Date.now() - d) / 60000);
  if (mins < 1)   return "< 1m";
  if (mins < 60)  return mins + "m";
  if (mins < 1440) return Math.floor(mins / 60) + "h";
  return Math.floor(mins / 1440) + "d";
}

function profitColor(pct) {
  if (pct >= 20) return "#4ade80";
  if (pct >= 10) return "#a3e635";
  if (pct >= 5)  return "#fbbf24";
  return "#f87171";
}

function ageIsStale(dateStr, maxMins = 120) {
  if (!dateStr) return true;
  const d = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  return (Date.now() - d) / 60000 > maxMins;
}

// ── CORE SCAN LOGIC ───────────────────────────────────────────

/**
 * Fetch prices for a batch of item IDs from AODP in one request.
 * Returns the raw rows array.
 */
async function fetchBatch(ids, serverKey) {
  const base = window.API_BASES?.[serverKey] || "https://europe.albion-online-data.com/api/v2";
  const cities = (window.CITIES || []).join(",");
  const url = `${base}/stats/prices/${ids.join(",")}.json?locations=${encodeURIComponent(cities)}&qualities=1,2,3`;
  try {
    return await window.apiFetch(url, { forceRefresh: true });
  } catch {
    return [];
  }
}

/**
 * For a set of price rows for one item, find:
 *   • cheapestSell: city with lowest sell_price_min
 *   • highestBuy:   city with highest buy_price_max
 *   • bestFlip:     highestBuy.city → cheapestSell.city route
 * Returns null if insufficient data.
 */
function analyzeFlip(rows) {
  const cityMap = {};
  for (const r of rows) {
    const c = r.city;
    if (!c) continue;
    if (!cityMap[c]) cityMap[c] = { sell: 0, buy: 0, sellAge: null, buyAge: null };
    if (r.sell_price_min > 0 && (!cityMap[c].sell || r.sell_price_min < cityMap[c].sell)) {
      cityMap[c].sell    = r.sell_price_min;
      cityMap[c].sellAge = r.sell_price_min_date;
    }
    if (r.buy_price_max > 0 && r.buy_price_max > cityMap[c].buy) {
      cityMap[c].buy    = r.buy_price_max;
      cityMap[c].buyAge = r.buy_price_max_date;
    }
  }

  const cities = Object.keys(cityMap);

  // Best sell city (cheapest sell price — where to buy from)
  let buyFrom = null, buyFromPrice = Infinity;
  for (const c of cities) {
    if (cityMap[c].sell > 0 && !ageIsStale(cityMap[c].sellAge) && cityMap[c].sell < buyFromPrice) {
      buyFromPrice = cityMap[c].sell;
      buyFrom = c;
    }
  }

  // Best sell city (highest sell price — where to sell TO)
  let sellTo = null, sellToPrice = 0;
  for (const c of cities) {
    if (c === buyFrom) continue; // different city route only
    if (cityMap[c].sell > 0 && !ageIsStale(cityMap[c].sellAge) && cityMap[c].sell > sellToPrice) {
      sellToPrice = cityMap[c].sell;
      sellTo = c;
    }
  }

  if (!buyFrom || !sellTo || buyFromPrice <= 0 || sellToPrice <= buyFromPrice) return null;

  const profit    = sellToPrice - buyFromPrice;
  const profitPct = (profit / buyFromPrice) * 100;
  if (profitPct < 3) return null; // not worth surfacing tiny margins

  // Also compute Black Market flip potential
  const bmSell = cityMap["Black Market"]?.sell;
  let bmFlip = null;
  if (bmSell > 0 && bmSell > sellToPrice && buyFrom !== "Black Market") {
    const bmProfit    = bmSell - buyFromPrice;
    const bmProfitPct = (bmProfit / buyFromPrice) * 100;
    if (bmProfitPct > profitPct) {
      bmFlip = { sellTo: "Black Market", sellPrice: bmSell, profit: bmProfit, profitPct: bmProfitPct };
    }
  }

  const result = bmFlip || { sellTo, sellPrice: sellToPrice, profit, profitPct };

  return {
    type:       "flip",
    buyFrom,
    buyPrice:   buyFromPrice,
    sellTo:     result.sellTo,
    sellPrice:  result.sellPrice,
    profit:     result.profit,
    profitPct:  result.profitPct,
    sellAge:    cityMap[result.sellTo]?.sellAge || cityMap[buyFrom]?.sellAge,
    allCities:  cityMap,
  };
}

/**
 * Run the full scanner over all SCAN_ITEMS in batches of 10.
 * Updates progress and calls onProgress(pct, results) after each batch.
 */
async function runScan(serverKey, onProgress) {
  const BATCH = 10;
  const all   = SCAN_ITEMS;
  const total = Math.ceil(all.length / BATCH);
  const results = [];

  for (let i = 0; i < all.length; i += BATCH) {
    if (!scannerState.running) break; // cancelled

    const batch = all.slice(i, i + BATCH);
    const ids   = batch.map(b => b.id);
    const rows  = await fetchBatch(ids, serverKey);

    for (const item of batch) {
      const itemRows = rows.filter(r => r.item_id === item.id);
      if (!itemRows.length) continue;

      const flip = analyzeFlip(itemRows);
      if (flip) {
        results.push({
          ...flip,
          itemId:   item.id,
          itemName: item.name,
          cat:      item.cat,
        });
      }
    }

    // Sort by profit descending after every batch so live table is always fresh
    results.sort((a, b) => b.profit - a.profit);

    const pct = Math.round(((i + BATCH) / all.length) * 100);
    onProgress(Math.min(pct, 100), [...results]);

    // Polite rate limit between batches
    await new Promise(r => setTimeout(r, 120));
  }

  return results;
}

// ── RENDER ────────────────────────────────────────────────────

function renderScannerTab() {
  const host = document.getElementById("tab-scanner");
  if (!host) return;

  const cats = ["All", ...new Set(SCAN_ITEMS.map(i => i.cat))];

  host.innerHTML = `
    <div class="scanner-header">
      <div class="scanner-title-row">
        <div>
          <h2 class="scanner-title">🔥 Live Profit Scanner</h2>
          <p class="scanner-subtitle">Scans ${SCAN_ITEMS.length} items across all 8 cities — surfaces the best flip opportunities ranked by profit.</p>
        </div>
        <div class="scanner-controls">
          <select id="scanMode" class="scan-select">
            <option value="flip">City Flips</option>
          </select>
          <button id="scanBtn" class="scan-btn scan-btn-start">▶ Start Scan</button>
        </div>
      </div>

      <!-- Progress bar -->
      <div id="scanProgressWrap" class="scan-progress-wrap hidden">
        <div class="scan-progress-track">
          <div id="scanProgressBar" class="scan-progress-bar" style="width:0%"></div>
        </div>
        <span id="scanProgressLabel" class="scan-progress-label">0%</span>
      </div>

      <!-- Category filter chips -->
      <div class="scan-filter-row" id="scanCatChips">
        ${cats.map(c => `<button class="scan-chip ${c === "All" ? "active" : ""}" data-cat="${c}">${c}</button>`).join("")}
      </div>
    </div>

    <!-- Stats bar -->
    <div id="scanStats" class="scan-stats hidden">
      <div class="scan-stat">
        <span class="scan-stat-label">Opportunities</span>
        <span class="scan-stat-val" id="scanCount">—</span>
      </div>
      <div class="scan-stat">
        <span class="scan-stat-label">Best Profit</span>
        <span class="scan-stat-val" id="scanBest">—</span>
      </div>
      <div class="scan-stat">
        <span class="scan-stat-label">Avg ROI</span>
        <span class="scan-stat-val" id="scanAvgRoi">—</span>
      </div>
      <div class="scan-stat">
        <span class="scan-stat-label">Last scan</span>
        <span class="scan-stat-val" id="scanLastTime">—</span>
      </div>
    </div>

    <!-- Results -->
    <div id="scanResults">
      <div class="scan-empty" id="scanEmpty">
        <div class="scan-empty-icon">🔍</div>
        <div class="scan-empty-title">Ready to scan</div>
        <div class="scan-empty-sub">Hit <strong>Start Scan</strong> to find live profit opportunities across all Albion cities. Takes about 15–20 seconds.</div>
      </div>
      <div id="scanTable" class="hidden"></div>
    </div>
  `;

  // Category filter chips
  host.querySelectorAll(".scan-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      host.querySelectorAll(".scan-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      scannerState.filterCat = chip.dataset.cat;
      renderScanResults(scannerState.results);
    });
  });

  // Start/Stop button
  document.getElementById("scanBtn").addEventListener("click", toggleScan);
}

function toggleScan() {
  if (scannerState.running) {
    stopScan();
  } else {
    startScan();
  }
}

async function startScan() {
  scannerState.running  = true;
  scannerState.results  = [];
  scannerState.progress = 0;
  scannerState.serverKey = document.getElementById("server")?.value || "europe";

  const btn      = document.getElementById("scanBtn");
  const progWrap = document.getElementById("scanProgressWrap");
  const progBar  = document.getElementById("scanProgressBar");
  const progLbl  = document.getElementById("scanProgressLabel");
  const statsBar = document.getElementById("scanStats");
  const empty    = document.getElementById("scanEmpty");
  const table    = document.getElementById("scanTable");

  if (btn)      { btn.textContent = "■ Stop"; btn.classList.remove("scan-btn-start"); btn.classList.add("scan-btn-stop"); }
  if (progWrap) progWrap.classList.remove("hidden");
  if (statsBar) statsBar.classList.remove("hidden");
  if (empty)    empty.classList.add("hidden");
  if (table)    table.classList.remove("hidden");

  await runScan(scannerState.serverKey, (pct, results) => {
    scannerState.progress = pct;
    scannerState.results  = results;
    if (progBar)  progBar.style.width  = pct + "%";
    if (progLbl)  progLbl.textContent  = pct + "%";
    renderScanResults(results);
    updateScanStats(results);
  });

  // Scan complete
  scannerState.running  = false;
  scannerState.lastScanAt = new Date();
  if (btn)     { btn.textContent = "↻ Re-scan"; btn.classList.remove("scan-btn-stop"); btn.classList.add("scan-btn-start"); }
  if (progBar) progBar.style.width = "100%";
  if (progLbl) progLbl.textContent = "Done";
  updateScanStats(scannerState.results);
}

function stopScan() {
  scannerState.running = false;
  const btn = document.getElementById("scanBtn");
  if (btn) { btn.textContent = "▶ Start Scan"; btn.classList.remove("scan-btn-stop"); btn.classList.add("scan-btn-start"); }
}

function updateScanStats(results) {
  const visible = filterResults(results);
  const count   = document.getElementById("scanCount");
  const best    = document.getElementById("scanBest");
  const avgRoi  = document.getElementById("scanAvgRoi");
  const lastT   = document.getElementById("scanLastTime");

  if (count)  count.textContent  = visible.length;
  if (best)   best.textContent   = visible.length ? scanFmt(visible[0].profit) + " s" : "—";
  if (avgRoi) {
    const avg = visible.length ? (visible.reduce((s, r) => s + r.profitPct, 0) / visible.length) : 0;
    avgRoi.textContent = visible.length ? avg.toFixed(1) + "%" : "—";
    avgRoi.style.color = visible.length ? profitColor(avg) : "";
  }
  if (lastT && scannerState.lastScanAt) {
    lastT.textContent = scannerState.lastScanAt.toLocaleTimeString();
  }
}

function filterResults(results) {
  if (scannerState.filterCat === "All") return results;
  return results.filter(r => r.cat === scannerState.filterCat);
}

function renderScanResults(results) {
  const table = document.getElementById("scanTable");
  if (!table) return;

  const visible = filterResults(results);

  if (!visible.length) {
    table.innerHTML = `<div class="scan-no-results">No opportunities found yet — scan in progress…</div>`;
    return;
  }

  const rows = visible.slice(0, 50).map((r, idx) => {
    const meta      = window.CITY_META || {};
    const fromColor = meta[r.buyFrom]?.color  || "#94a3b8";
    const toColor   = meta[r.sellTo]?.color   || "#94a3b8";
    const pColor    = profitColor(r.profitPct);
    const icon      = window.iconUrl ? window.iconUrl(r.itemId, 1, 1) : "";
    const rankLabel = idx === 0 ? "🏆" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
    const ageStr    = r.sellAge ? scanAge(r.sellAge) : "";
    const isBM      = r.sellTo === "Black Market";

    return `
      <div class="scan-row" data-item="${r.itemId}" data-name="${r.itemName}">
        <div class="scan-rank">${rankLabel}</div>
        <div class="scan-item-cell">
          ${icon ? `<img src="${icon}" class="scan-item-icon" onerror="this.src='${window.FALLBACK_ICON || ""}'" alt="" />` : ""}
          <div class="scan-item-info">
            <div class="scan-item-name">${r.itemName}</div>
            <div class="scan-item-cat">${r.cat}${ageStr ? ` · ${ageStr} ago` : ""}</div>
          </div>
        </div>
        <div class="scan-route">
          <span class="scan-city" style="color:${fromColor}">${r.buyFrom}</span>
          <span class="scan-arrow">→</span>
          <span class="scan-city ${isBM ? "scan-bm" : ""}" style="color:${toColor}">${r.sellTo}</span>
        </div>
        <div class="scan-prices">
          <div class="scan-price-row">
            <span class="scan-price-label">Buy</span>
            <span class="scan-price-val">${scanFmt(r.buyPrice)}</span>
          </div>
          <div class="scan-price-row">
            <span class="scan-price-label">Sell</span>
            <span class="scan-price-val">${scanFmt(r.sellPrice)}</span>
          </div>
        </div>
        <div class="scan-profit-cell">
          <div class="scan-profit" style="color:${pColor}">+${scanFmt(r.profit)}</div>
          <div class="scan-roi" style="color:${pColor}">${r.profitPct.toFixed(1)}% ROI</div>
        </div>
        <div class="scan-action-cell">
          <button class="scan-view-btn" onclick="scanViewItem('${r.itemId}', '${r.itemName.replace(/'/g, "\\'")}')">View →</button>
        </div>
      </div>
    `;
  }).join("");

  table.innerHTML = `
    <div class="scan-table-header">
      <span>Rank</span>
      <span>Item</span>
      <span>Route</span>
      <span>Prices</span>
      <span>Profit</span>
      <span></span>
    </div>
    <div class="scan-rows">${rows}</div>
    ${visible.length > 50 ? `<div class="scan-more">Showing top 50 of ${visible.length} opportunities</div>` : ""}
  `;
}

// Navigate to Market tab and load item
window.scanViewItem = function(itemId, itemName) {
  // Switch to market tab
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  const mBtn = document.querySelector('[data-tab="market"]');
  if (mBtn) mBtn.classList.add("active");
  document.querySelectorAll(".tab-section").forEach(s => s.classList.add("hidden"));
  const mTab = document.getElementById("tab-market");
  if (mTab) mTab.classList.remove("hidden");

  // Trigger item selection
  if (window.selectItem) window.selectItem(itemId, itemName);
};

// ── INIT ──────────────────────────────────────────────────────

window.initScannerTab = function() {
  const host = document.getElementById("tab-scanner");
  if (!host || host.dataset.loaded) return;
  host.dataset.loaded = "1";
  renderScannerTab();
};
