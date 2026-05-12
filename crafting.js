// ================================================================
//  crafting.js — Real-time crafting profitability engine v2
//  Competitor-grade features:
//    · Global cheapest material sourcing across all cities
//    · Buy-order vs sell-order material toggle
//    · Crafting focus / return rate slider (0–47.9%)
//    · Price history sparkline (14-point SVG)
//    · Best cross-city route card (buy here → sell there)
//    · Live profit badge in recipe list
//    · selectCraftingItem() — cross-tab navigation from market tab
//    · refreshCraftingPrices() — called by manualRefresh()
// ================================================================

// ---- Tier labels ----
const TIER_LABEL = { 2:"Novice's",3:"Journeyman's",4:"Adept's",5:"Expert's",6:"Master's",7:"Grandmaster's",8:"Elder's" };

// ---- Resource definitions ----
const RESOURCE_DEFS = [
  { raw:"WOOD",  refined:"PLANKS",     rawLabel:"Logs",      refinedLabel:"Planks"    },
  { raw:"ORE",   refined:"METALBAR",   rawLabel:"Ore",       refinedLabel:"Steel Bar" },
  { raw:"FIBER", refined:"CLOTH",      rawLabel:"Fiber",     refinedLabel:"Cloth"     },
  { raw:"HIDE",  refined:"LEATHER",    rawLabel:"Hide",      refinedLabel:"Leather"   },
  { raw:"ROCK",  refined:"STONEBLOCK", rawLabel:"Rock",      refinedLabel:"Block"     },
];

function buildRefiningRecipes() {
  const r = {};
  for (const d of RESOURCE_DEFS) {
    for (let t = 2; t <= 8; t++) {
      const id   = `T${t}_${d.refined}`;
      const mats = [{ id:`T${t}_${d.raw}`, amount:t, label:`T${t} ${d.rawLabel}` }];
      if (t > 2) mats.push({ id:`T${t-1}_${d.refined}`, amount:1, label:`T${t-1} ${d.refinedLabel}` });
      r[id] = { id, name:`${TIER_LABEL[t]} ${d.refinedLabel}`, category:"Refining", tier:t, materials:mats, craftTime:5 };
    }
  }
  return r;
}

const TIER_TOTAL = { 4:16, 5:20, 6:24, 7:28, 8:32 };
const CRAFT_TIME = { 4:22, 5:26, 6:30, 7:34, 8:38 };

const EQUIP_TMPL = {
  MAIN_SWORD:         [{ t:"METALBAR", p:1.0 }],
  "2H_CLAYMORE":      [{ t:"METALBAR", p:1.0 }],
  "2H_AXE":           [{ t:"METALBAR", p:1.0 }],
  "2H_HAMMER":        [{ t:"METALBAR", p:1.0 }],
  "2H_SPEAR":         [{ t:"METALBAR", p:1.0 }],
  "2H_BOW":           [{ t:"PLANKS",   p:0.5 }, { t:"LEATHER", p:0.5 }],
  "2H_CROSSBOWLARGE": [{ t:"METALBAR", p:0.5 }, { t:"PLANKS",  p:0.5 }],
  MAIN_FIRESTAFF:     [{ t:"METALBAR", p:0.75 }, { t:"CLOTH",  p:0.25 }],
  "2H_HOLYSTAFF":     [{ t:"METALBAR", p:0.75 }, { t:"CLOTH",  p:0.25 }],
  MAIN_NATURESTAFF:   [{ t:"METALBAR", p:0.75 }, { t:"CLOTH",  p:0.25 }],
  MAIN_ARCANESTAFF:   [{ t:"METALBAR", p:0.75 }, { t:"CLOTH",  p:0.25 }],
  HEAD_PLATE_SET1:    [{ t:"METALBAR", p:0.75 }, { t:"CLOTH",  p:0.25 }],
  ARMOR_PLATE_SET1:   [{ t:"METALBAR", p:0.75 }, { t:"CLOTH",  p:0.25 }],
  SHOES_PLATE_SET1:   [{ t:"METALBAR", p:0.75 }, { t:"CLOTH",  p:0.25 }],
  HEAD_LEATHER_SET1:  [{ t:"LEATHER",  p:0.75 }, { t:"CLOTH",  p:0.25 }],
  ARMOR_LEATHER_SET1: [{ t:"LEATHER",  p:0.75 }, { t:"CLOTH",  p:0.25 }],
  SHOES_LEATHER_SET1: [{ t:"LEATHER",  p:0.75 }, { t:"CLOTH",  p:0.25 }],
  HEAD_CLOTH_SET1:    [{ t:"CLOTH",    p:1.0  }],
  ARMOR_CLOTH_SET1:   [{ t:"CLOTH",    p:1.0  }],
  SHOES_CLOTH_SET1:   [{ t:"CLOTH",    p:1.0  }],
};

const EQUIP_DISPLAY = {
  MAIN_SWORD:"Broadsword","2H_CLAYMORE":"Claymore","2H_AXE":"Greataxe","2H_HAMMER":"Great Hammer",
  "2H_SPEAR":"Pike","2H_BOW":"Bow","2H_CROSSBOWLARGE":"Heavy Crossbow",
  MAIN_FIRESTAFF:"Fire Staff","2H_HOLYSTAFF":"Holy Staff",MAIN_NATURESTAFF:"Nature Staff",MAIN_ARCANESTAFF:"Arcane Staff",
  HEAD_PLATE_SET1:"Soldier Helmet",ARMOR_PLATE_SET1:"Soldier Armor",SHOES_PLATE_SET1:"Soldier Boots",
  HEAD_LEATHER_SET1:"Merc Hood",ARMOR_LEATHER_SET1:"Merc Jacket",SHOES_LEATHER_SET1:"Merc Shoes",
  HEAD_CLOTH_SET1:"Scholar Cowl",ARMOR_CLOTH_SET1:"Scholar Robe",SHOES_CLOTH_SET1:"Scholar Sandals",
};
const EQUIP_CAT = {
  MAIN_SWORD:"Weapons","2H_CLAYMORE":"Weapons","2H_AXE":"Weapons","2H_HAMMER":"Weapons",
  "2H_SPEAR":"Weapons","2H_BOW":"Weapons","2H_CROSSBOWLARGE":"Weapons",
  MAIN_FIRESTAFF:"Weapons","2H_HOLYSTAFF":"Weapons",MAIN_NATURESTAFF:"Weapons",MAIN_ARCANESTAFF:"Weapons",
  HEAD_PLATE_SET1:"Armor",ARMOR_PLATE_SET1:"Armor",SHOES_PLATE_SET1:"Armor",
  HEAD_LEATHER_SET1:"Armor",ARMOR_LEATHER_SET1:"Armor",SHOES_LEATHER_SET1:"Armor",
  HEAD_CLOTH_SET1:"Armor",ARMOR_CLOTH_SET1:"Armor",SHOES_CLOTH_SET1:"Armor",
};

function buildEquipmentRecipes() {
  const r = {};
  for (const [suf, tmpl] of Object.entries(EQUIP_TMPL)) {
    for (let t = 4; t <= 8; t++) {
      const id   = `T${t}_${suf}`;
      const tot  = TIER_TOTAL[t];
      const mats = tmpl.map(({ t:type, p }) => ({
        id:`T${t}_${type}`, amount:Math.round(tot*p), label:`T${t} ${type[0]+type.slice(1).toLowerCase()}`
      }));
      r[id] = { id, name:`${TIER_LABEL[t]} ${EQUIP_DISPLAY[suf]||suf}`, category:EQUIP_CAT[suf]||"Equipment", tier:t, materials:mats, craftTime:CRAFT_TIME[t] };
    }
  }
  return r;
}

function buildBagRecipes() {
  const r = {};
  const bags = { 4:12, 5:15, 6:18, 7:21, 8:24 };
  for (const [t, lAmt] of Object.entries(bags)) {
    r[`T${t}_BAG`] = {
      id:`T${t}_BAG`, name:`${TIER_LABEL[+t]} Bag`, category:"Bags", tier:+t, craftTime:15+(+t-4)*4,
      materials:[{ id:`T${t}_LEATHER`, amount:lAmt, label:`T${t} Leather` }, { id:`T${t}_CLOTH`, amount:Math.round(lAmt/2), label:`T${t} Cloth` }],
    };
  }
  return r;
}

window.CRAFTING_RECIPES = { ...buildRefiningRecipes(), ...buildEquipmentRecipes(), ...buildBagRecipes() };

// ---- Helpers ----
function esc(s) { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function fmtN(n) { return (n==null||isNaN(n)||n===0) ? "—" : Math.round(n).toLocaleString("en-US"); }
function fmtNZ(n) {
  // Like fmtN but shows 0 as 0 (for hero panel where 0 is meaningful context)
  if (n == null || isNaN(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}
function fmtProfit(n) {
  if (n==null||isNaN(n)) return "—";
  return (n>0?"+":"") + Math.round(n).toLocaleString("en-US");
}
function profitColorClass(n) { return n>0?"text-green-400":n<0?"text-red-400":"text-slate-500"; }
function profitBgClass(n)    { return n>0?"bg-green-400/10":n<0?"bg-red-400/10":""; }

function ageMinsCraft(iso) {
  if (!iso||iso.startsWith("0001-01-01")) return Infinity;
  const t = new Date(iso+(iso.endsWith("Z")?"":"Z")).getTime();
  return isNaN(t) ? Infinity : (Date.now()-t)/60000;
}

// ---- State ----
const craftState = {
  selectedRecipeId: null,
  filterCategory:   "All",
  filterTier:       "All",
  taxPct:           3,
  craftQty:         1,
  calcPrices:       [],
  recommendations:  [],
  recLoading:       false,
  // ── NEW ──
  sourcingMode:  "global",   // "same_city" | "global" — find cheapest mats globally
  materialOrder: "sell",     // "sell" | "buy" — use sell orders or buy orders for mats
  returnRate:    0,          // 0–47.9% — crafting focus material return
};

// ── Helper: get unit price from a city's rows ──
function getMatPrice(rows, useBuyOrders) {
  if (useBuyOrders) {
    const buyRows = rows.filter(r => r.buy_price_max > 0);
    const best = buyRows.reduce((a,b) => (!a || b.buy_price_max > a.buy_price_max) ? b : a, null);
    const buyP = best?.buy_price_max || 0;
    // Fall back to sell if no buy orders exist
    if (buyP) return { price: buyP, age: best?.buy_price_max_date, isBuyOrder: true };
  }
  const sellRows = rows.filter(r => r.sell_price_min > 0);
  const best = sellRows.reduce((a,b) => (!a || b.sell_price_min < a.sell_price_min) ? b : a, null);
  return { price: best?.sell_price_min || 0, age: best?.sell_price_min_date, isBuyOrder: false };
}

// ---- Profit engine: per-city ----
function calcProfit(recipe, allPrices, taxPct) {
  const returnMult  = Math.max(0, 1 - (craftState.returnRate / 100));
  const useBuyOrders = craftState.materialOrder === "buy";
  const results = [];

  for (const city of (window.CITIES || [])) {
    let matCost = 0, missingMat = false;
    const matDetails = [];

    for (const mat of recipe.materials) {
      const rows = allPrices.filter(p => p.item_id === mat.id && p.city === city);
      const { price, age } = getMatPrice(rows, useBuyOrders);
      const effectiveAmount = mat.amount * returnMult;

      // Gather both prices for display in table
      const sellRows = rows.filter(r => r.sell_price_min > 0);
      const bestSell = sellRows.reduce((a,b) => (!a || b.sell_price_min < a.sell_price_min) ? b : a, null);
      const buyRows  = rows.filter(r => r.buy_price_max > 0);
      const bestBuy  = buyRows.reduce((a,b) => (!a || b.buy_price_max > a.buy_price_max) ? b : a, null);

      if (!price) missingMat = true;
      matDetails.push({
        ...mat,
        unitPrice:       price,
        effectiveAmount,
        lineTotal:       price * effectiveAmount,
        sellPrice:       bestSell?.sell_price_min || 0,
        buyOrderPrice:   bestBuy?.buy_price_max   || 0,
        age,
        missing: !price,
      });
      matCost += price * effectiveAmount;
    }

    const tax      = Math.round(matCost * taxPct / 100);
    const costFull = matCost + tax;

    // Output item sell price (cheapest listing in this city)
    const iSellRows = allPrices.filter(p => p.item_id === recipe.id && p.city === city && p.sell_price_min > 0);
    const bestItem  = iSellRows.reduce((a,b) => (!a || b.sell_price_min < a.sell_price_min) ? b : a, null);
    const sellPrice = bestItem?.sell_price_min || 0;
    const sellAge   = bestItem?.sell_price_min_date;

    // Output buy order (someone wants to buy your crafted item)
    const iBuyRows     = allPrices.filter(p => p.item_id === recipe.id && p.city === city && p.buy_price_max > 0);
    const bestBuyOrder = iBuyRows.reduce((a,b) => (!a || b.buy_price_max > a.buy_price_max) ? b : a, null);
    const buyOrderPrice = bestBuyOrder?.buy_price_max || 0;

    const profit        = (sellPrice > 0 && costFull > 0) ? sellPrice - costFull : null;
    const profitPct     = (profit != null && sellPrice > 0) ? (profit / sellPrice * 100) : null;
    const profitPerSec  = (profit != null && recipe.craftTime > 0) ? profit / recipe.craftTime : null;
    const profitPerMin  = profitPerSec != null ? profitPerSec * 60 : null;
    const profitPerHour = profitPerMin != null ? profitPerMin * 60 : null;

    results.push({
      city, matCost, tax, costFull, sellPrice, buyOrderPrice, sellAge,
      profit, profitPct, profitPerSec, profitPerMin, profitPerHour,
      matDetails, missingMat,
    });
  }

  return results.sort((a,b) => (b.profit || 0) - (a.profit || 0));
}

// ---- Profit engine: global cheapest sourcing ----
// Finds cheapest material price across ALL cities, finds best sell city for output.
// This is the "global best route" mode used by top competitors.
function calcProfitGlobal(recipe, allPrices, taxPct) {
  const returnMult   = Math.max(0, 1 - (craftState.returnRate / 100));
  const useBuyOrders = craftState.materialOrder === "buy";
  let matCost = 0, missingMat = false;
  const matDetails = [];

  for (const mat of recipe.materials) {
    const allRows = allPrices.filter(p => p.item_id === mat.id);
    let bestPrice = 0, bestCity = "—", bestAge = null;

    if (useBuyOrders) {
      const buyRows = allRows.filter(r => r.buy_price_max > 0);
      const best = buyRows.reduce((a,b) => (!a || b.buy_price_max > a.buy_price_max) ? b : a, null);
      bestPrice = best?.buy_price_max || 0; bestCity = best?.city || "—"; bestAge = best?.buy_price_max_date;
    }
    if (!bestPrice) {
      // Fallback to sell orders (global cheapest)
      const sellRows = allRows.filter(r => r.sell_price_min > 0);
      const best = sellRows.reduce((a,b) => (!a || b.sell_price_min < a.sell_price_min) ? b : a, null);
      bestPrice = best?.sell_price_min || 0; bestCity = best?.city || "—"; bestAge = best?.sell_price_min_date;
    }

    const effectiveAmount = mat.amount * returnMult;
    if (!bestPrice) missingMat = true;

    // Also compute global sell + buy for display
    const gSell = allRows.filter(r => r.sell_price_min > 0)
      .reduce((a,b) => (!a || b.sell_price_min < a.sell_price_min) ? b : a, null);
    const gBuy = allRows.filter(r => r.buy_price_max > 0)
      .reduce((a,b) => (!a || b.buy_price_max > a.buy_price_max) ? b : a, null);

    matDetails.push({
      ...mat,
      unitPrice:       bestPrice,
      effectiveAmount,
      lineTotal:       bestPrice * effectiveAmount,
      sourceCity:      bestCity,
      age:             bestAge,
      sellPrice:       gSell?.sell_price_min || 0,
      buyOrderPrice:   gBuy?.buy_price_max   || 0,
      missing:         !bestPrice,
    });
    matCost += bestPrice * effectiveAmount;
  }

  const tax      = Math.round(matCost * taxPct / 100);
  const costFull = matCost + tax;

  // Best sell city for output item (cheapest sell = where supply is highest)
  const iSellRows = allPrices.filter(p => p.item_id === recipe.id && p.sell_price_min > 0);
  const bestSell  = iSellRows.reduce((a,b) => (!a || b.sell_price_min < a.sell_price_min) ? b : a, null);
  const sellPrice = bestSell?.sell_price_min || 0;
  const sellCity  = bestSell?.city || "—";
  const sellAge   = bestSell?.sell_price_min_date;

  // Highest buy order across cities (instant-sell alternative)
  const iBuyRows     = allPrices.filter(p => p.item_id === recipe.id && p.buy_price_max > 0);
  const bestBuyOrder = iBuyRows.reduce((a,b) => (!a || b.buy_price_max > a.buy_price_max) ? b : a, null);
  const buyOrderPrice = bestBuyOrder?.buy_price_max || 0;
  const buyOrderCity  = bestBuyOrder?.city || "—";

  const profit       = (sellPrice > 0 && costFull > 0) ? sellPrice - costFull : null;
  const profitPct    = (profit != null && sellPrice > 0) ? (profit / sellPrice * 100) : null;
  const profitPerSec = (profit != null && recipe.craftTime > 0) ? profit / recipe.craftTime : null;
  const profitPerMin = profitPerSec != null ? profitPerSec * 60 : null;

  return {
    matCost, tax, costFull, sellPrice, sellCity, buyOrderPrice, buyOrderCity, sellAge,
    profit, profitPct, profitPerSec, profitPerMin, matDetails, missingMat, isGlobal: true,
  };
}

// ---- Efficiency score 0-100 ----
function efficiencyScore(row) {
  if (!row||row.profit==null||row.profit<=0) return 0;
  const roi   = Math.min(40, (row.profitPct||0) * 40/25);
  const speed = Math.min(40, ((row.profitPerMin||0)/300000)*40);
  const fresh = ageMinsCraft(row.sellAge)<15 ? 20 : ageMinsCraft(row.sellAge)<60 ? 10 : 0;
  return Math.max(0, Math.min(100, Math.round(roi+speed+fresh)));
}
function scoreColor(n) { return n>=70?"#4ade80":n>=40?"#fbbf24":"#f87171"; }

// ---- AI tags ----
function computeAITags(recipe, cityRows) {
  const profitable = cityRows.filter(r => r.profit!=null&&r.profit>0);
  if (!profitable.length) return [{ label:"No profit", cls:"badge-red" }];
  const best = profitable[0];
  const tags = [];
  const roi = best.profitPct||0;
  if (roi>25)      tags.push({ label:"Best ROI",        cls:"badge-gold"   });
  else if (roi>10) tags.push({ label:"Good ROI",         cls:"badge-green"  });
  const freshCities = cityRows.filter(r => ageMinsCraft(r.sellAge)<30).length;
  if (freshCities>=4)      tags.push({ label:"Fast-selling",    cls:"badge-blue"   });
  else if (freshCities>=2) tags.push({ label:"Active Market",   cls:"badge-blue"   });
  const activeCities = cityRows.filter(r => r.sellPrice>0).length;
  if (activeCities<=2)     tags.push({ label:"Low Competition", cls:"badge-orange" });
  if ((best.profitPerMin||0)>200000) tags.push({ label:"High Throughput", cls:"badge-purple" });
  const score = efficiencyScore(best);
  if (score>=80)           tags.push({ label:"Top Efficiency",  cls:"badge-green"  });
  else if (score>=60)      tags.push({ label:"Efficient",       cls:"badge-slate"  });
  return tags.slice(0, 3);
}

// ---- Price history fetch + SVG sparkline ----
async function fetchPriceHistory(itemId) {
  const serverKey = document.getElementById("server")?.value || "europe";
  const url = `${window.API_BASES[serverKey]}/stats/history/${itemId}.json`
    + `?locations=Black%20Market%2CCaerleon%2CBridgewatch&time-scale=24&count=14`;
  try { return await window.apiFetch(url); } catch { return []; }
}

function renderSparkline(histData, w = 220, h = 44) {
  if (!histData || !histData.length) return "";
  const prices = histData
    .flatMap(d => (d.data || []).map(p => p.avg_price || 0))
    .filter(p => p > 0);
  if (prices.length < 3) return "";
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const pad = 4;
  const pts = prices.map((p, i) => {
    const x = (pad + (i / (prices.length - 1)) * (w - pad * 2)).toFixed(1);
    const y = (pad + (1 - (p - minP) / range) * (h - pad * 2)).toFixed(1);
    return `${x},${y}`;
  });
  const last  = pts[pts.length - 1].split(",");
  const trend = prices[prices.length - 1] >= prices[0] ? "#4ade80" : "#f87171";
  const fillPts = [`${pad},${h - pad}`, ...pts, `${w - pad},${h - pad}`].join(" ");
  return `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible">
      <defs>
        <linearGradient id="spkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${trend}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${trend}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polygon points="${fillPts}" fill="url(#spkGrad)"/>
      <polyline points="${pts.join(" ")}" fill="none" stroke="${trend}" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="2.5" fill="${trend}"/>
    </svg>`;
}

// ---- Live refresh ----
let _liveTimer = null, _countdownTimer = null;

function startCraftLiveRefresh(recipeId) {
  stopCraftLiveRefresh();
  if (!recipeId) return;
  let nextAt = Date.now() + 30000;
  _countdownTimer = setInterval(() => {
    const el = document.getElementById("craftLiveCountdown");
    if (el) {
      const left = Math.max(0, Math.ceil((nextAt - Date.now()) / 1000));
      el.textContent = left > 0 ? `Auto-refresh in ${left}s` : "Refreshing…";
    }
  }, 1000);
  _liveTimer = setInterval(async () => {
    const recipe = window.CRAFTING_RECIPES[recipeId];
    if (!recipe) return;
    nextAt = Date.now() + 30000;
    setCalcStatus("updating");
    try {
      const prices = await fetchRecipePrices(recipe);
      craftState.calcPrices = prices;
      renderCalculator(recipeId, prices);
      setCalcStatus("live");
    } catch { setCalcStatus("error"); }
  }, 30000);
}

function stopCraftLiveRefresh() {
  clearInterval(_liveTimer); clearInterval(_countdownTimer);
  _liveTimer = null; _countdownTimer = null;
}
window.stopCraftLiveRefresh = stopCraftLiveRefresh;

function setCalcStatus(kind) {
  const el = document.getElementById("craftStatusBadge");
  if (!el) return;
  if (kind === "live")     { el.textContent = "● Live";     el.className = "text-xs text-green-400 font-medium"; }
  if (kind === "updating") { el.textContent = "↻ Updating"; el.className = "text-xs text-yellow-400 font-medium animate-pulse"; }
  if (kind === "error")    { el.textContent = "✕ Error";    el.className = "text-xs text-red-400 font-medium"; }
}

// ---- Fetch prices ----
async function fetchRecipePrices(recipe) {
  const ids = [...new Set([recipe.id, ...recipe.materials.map(m => m.id)])];
  const serverKey = document.getElementById("server")?.value || "europe";
  const url = `${window.API_BASES[serverKey]}/stats/prices/${ids.join(",")}.json`
    + `?locations=${encodeURIComponent((window.CITIES || []).join(","))}`;
  return window.apiFetch(url);
}

// ---- Recommendations ----
const REC_ITEMS = [
  "T6_PLANKS","T6_METALBAR","T6_CLOTH","T6_LEATHER",
  "T7_PLANKS","T7_METALBAR","T7_CLOTH","T7_LEATHER",
  "T8_PLANKS","T8_METALBAR",
  "T6_BAG","T7_BAG","T8_BAG",
  "T6_2H_BOW","T8_2H_BOW","T6_MAIN_SWORD","T8_MAIN_SWORD",
  "T6_ARMOR_LEATHER_SET1","T8_ARMOR_LEATHER_SET1",
];

async function loadRecommendations() {
  if (craftState.recLoading) return;
  craftState.recLoading = true;
  const host = document.getElementById("recCards");
  if (host) host.innerHTML =
    '<div class="col-span-full text-center text-slate-600 text-sm py-8 animate-pulse">Analysing market data…</div>';
  try {
    const allIds = new Set();
    const recipes = REC_ITEMS.map(id => window.CRAFTING_RECIPES[id]).filter(Boolean);
    for (const rec of recipes) { allIds.add(rec.id); rec.materials.forEach(m => allIds.add(m.id)); }
    const serverKey = document.getElementById("server")?.value || "europe";
    const prices = await window.apiFetch(
      `${window.API_BASES[serverKey]}/stats/prices/${[...allIds].join(",")}.json`
      + `?locations=${encodeURIComponent((window.CITIES || []).join(","))}`
    );
    const ranked = [];
    for (const rec of recipes) {
      const rows = calcProfit(rec, prices, craftState.taxPct);
      const best = rows.find(r => r.profit != null && r.profit > 0);
      if (best) { best.effScore = efficiencyScore(best); ranked.push({ recipe: rec, best, rows }); }
    }
    ranked.sort((a,b) => (b.best.effScore || 0) - (a.best.effScore || 0));
    craftState.recommendations = ranked.slice(0, 6);
    renderRecommendations();
  } catch {
    if (host) host.innerHTML =
      '<div class="col-span-full text-center text-red-400 text-sm py-6">Failed to load. Check connection.</div>';
  } finally { craftState.recLoading = false; }
}

function renderRecommendations() {
  const host = document.getElementById("recCards");
  if (!host) return;
  host.innerHTML = "";
  if (!craftState.recommendations.length) {
    host.innerHTML = '<div class="col-span-full text-center text-slate-600 py-6 text-sm">No profitable crafts found.</div>';
    return;
  }
  craftState.recommendations.forEach(({ recipe, best, rows }) => {
    const meta  = (window.CITY_META || {})[best.city] || {};
    const tags  = computeAITags(recipe, rows);
    const score = best.effScore || 0;
    const sClr  = scoreColor(score);
    const el    = document.createElement("div");
    el.className = "rec-card cursor-pointer";
    el.style.setProperty("--city-color", meta.color || "#546e7a");
    el.innerHTML = `
      <div class="flex items-center gap-2 mb-2">
        <img src="${iconUrl(recipe.id)}" alt="" loading="lazy" onerror="onIconError(this)"
          class="w-9 h-9 rounded-lg border border-border bg-elevated flex-shrink-0" />
        <div class="min-w-0 flex-1">
          <div class="text-xs font-semibold text-slate-200 truncate">${esc(recipe.name)}</div>
          <div class="text-xs text-slate-600">${recipe.category} · T${recipe.tier}</div>
        </div>
        <div class="text-xs font-bold" style="color:${sClr}">${score}</div>
      </div>
      <div class="text-xl font-black text-green-400 mb-1">
        +${fmtN(Math.round(best.profit))}<span class="text-xs text-slate-500 ml-1 font-normal">s/craft</span>
      </div>
      <div class="text-xs text-slate-500 mb-2">
        ${fmtN(Math.round(best.profitPerMin || 0))}/min ·
        <span style="color:${meta.color || "#8a9aae"}">${esc(best.city)}</span>
      </div>
      <div class="flex gap-1 flex-wrap">
        ${tags.map(t => `<span class="badge ${t.cls}">${t.label}</span>`).join("")}
      </div>`;
    el.addEventListener("click", () => selectRecipe(recipe.id));
    host.appendChild(el);
  });
}

// ---- Recipe list ----
function filterRecipes() {
  const q    = (document.getElementById("craftSearch")?.value || "").toLowerCase();
  const cat  = craftState.filterCategory;
  const tier = craftState.filterTier;
  return Object.values(window.CRAFTING_RECIPES).filter(r => {
    if (cat !== "All" && r.category !== cat) return false;
    if (tier !== "All" && `T${r.tier}` !== tier) return false;
    if (q && !r.name.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
    return true;
  }).sort((a,b) => a.tier - b.tier || a.name.localeCompare(b.name));
}

function renderRecipeList() {
  const list = document.getElementById("recipeList");
  if (!list) return;
  const recipes = filterRecipes();
  list.innerHTML = "";
  if (!recipes.length) {
    list.innerHTML = '<div class="text-slate-600 text-sm text-center py-6">No recipes match.</div>';
    return;
  }
  for (const rec of recipes) {
    const el = document.createElement("div");
    el.className = "recipe-item" + (craftState.selectedRecipeId === rec.id ? " active" : "");
    el.innerHTML = `
      <img src="${iconUrl(rec.id)}" alt="" loading="lazy" onerror="onIconError(this)"
        class="w-8 h-8 rounded-lg border border-border bg-elevated flex-shrink-0" />
      <div class="min-w-0 flex-1">
        <div class="text-sm text-slate-300 truncate font-medium">${esc(rec.name)}</div>
        <div class="text-xs text-slate-600">${rec.category} · T${rec.tier} · ${rec.craftTime}s</div>
      </div>`;
    el.addEventListener("click", () => {
      list.querySelectorAll(".recipe-item").forEach(e => e.classList.remove("active"));
      el.classList.add("active");
      selectRecipe(rec.id);
    });
    list.appendChild(el);
  }
}

async function selectRecipe(id) {
  craftState.selectedRecipeId = id;
  const recipe = window.CRAFTING_RECIPES[id];
  if (!recipe) return;

  // Highlight in sidebar list
  document.querySelectorAll("#recipeList .recipe-item").forEach(el => {
    const nameEl = el.querySelector(".font-medium");
    el.classList.toggle("active", nameEl?.textContent === recipe.name);
  });

  const panel = document.getElementById("craftCalcPanel");
  if (panel) panel.innerHTML = `
    <div class="flex items-center gap-3 py-12 text-slate-500 justify-center text-sm">
      <span class="animate-spin text-xl">↻</span> Fetching live prices…
    </div>`;

  try {
    const prices = await fetchRecipePrices(recipe);
    craftState.calcPrices = prices;
    renderCalculator(id, prices);
    startCraftLiveRefresh(id);
  } catch {
    if (panel) panel.innerHTML =
      `<div class="text-red-400 py-12 text-center text-sm">Failed to fetch prices. Try again.</div>`;
  }
}

// ---- Main calculator renderer ----
function renderCalculator(recipeId, prices) {
  const recipe = window.CRAFTING_RECIPES[recipeId];
  if (!recipe) return;
  const panel  = document.getElementById("craftCalcPanel");
  if (!panel) return;

  // Per-city profit breakdown
  const rows = calcProfit(recipe, prices, craftState.taxPct);
  const qty  = craftState.craftQty;

  // Global best route (across all cities)
  const globalRow = calcProfitGlobal(recipe, prices, craftState.taxPct);

  // Pick best city for hero display
  const best   = (craftState.sourcingMode === "global")
    ? { ...globalRow, city: globalRow.sellCity }
    : (rows.find(r => r.profit != null && r.profit > 0) || rows[0]);

  const aiTags = computeAITags(recipe, rows);
  const score  = efficiencyScore(best);

  // Hero numbers — scaled by quantity
  const youPay     = (best?.costFull  || 0) * qty;
  const youReceive = (best?.sellPrice || 0) * qty;
  const netProfit  = (best?.profit != null) ? best.profit * qty : null;
  const roi        = best?.profitPct || 0;

  const pcls   = profitColorClass(netProfit);
  const roiClr = roi > 15 ? "text-green-400" : roi > 5 ? "text-yellow-400" : "text-red-400";
  const sClr   = scoreColor(score);

  // Check if we have any real data at all
  const hasMatData  = best?.matDetails?.some(m => m.unitPrice > 0);
  const hasSellData = (best?.sellPrice || 0) > 0;

  // Sell location label
  const sellLoc = craftState.sourcingMode === "global"
    ? (globalRow.sellCity || "—")
    : (best?.city || "—");

  panel.innerHTML = `
    <!-- ── Item header ── -->
    <div class="flex items-start gap-3 mb-4 pb-4 border-b border-border">
      <img src="${iconUrl(recipe.id)}" onerror="onIconError(this)"
        class="w-14 h-14 rounded-xl border border-border bg-elevated flex-shrink-0" />
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-bold text-slate-100 truncate">${esc(recipe.name)}</h3>
        <div class="flex items-center gap-2 mt-1 flex-wrap">
          <span class="text-xs text-slate-500">${recipe.category} · T${recipe.tier} · ${recipe.craftTime}s craft</span>
          ${aiTags.map(t => `<span class="badge ${t.cls}">${t.label}</span>`).join("")}
        </div>
      </div>
      <div class="text-right flex-shrink-0">
        <div id="craftStatusBadge" class="text-xs text-green-400 font-medium">● Live</div>
        <div id="craftLiveCountdown" class="text-xs text-slate-600 mt-0.5"></div>
      </div>
    </div>

    <!-- ── Global Best Route card (NEW) ── -->
    ${globalRow.profit != null && globalRow.profit > 0 ? `
    <div class="mb-4 rounded-xl border border-green-400/20 bg-green-400/5 px-4 py-3 flex items-center gap-4 flex-wrap">
      <div class="text-xs font-black uppercase tracking-widest text-green-400">🌍 Global Best Route</div>
      <div class="flex items-center gap-2 text-sm flex-wrap">
        <span class="text-slate-500 text-xs">Buy mats globally</span>
        <span class="text-slate-600">·</span>
        <span class="text-slate-500 text-xs">Sell in</span>
        <span class="font-semibold text-slate-200">${esc(globalRow.sellCity)}</span>
      </div>
      <div class="ml-auto text-right">
        <div class="text-xl font-black text-green-400">+${fmtN(globalRow.profit)}<span class="text-xs font-normal text-slate-500 ml-1">s profit</span></div>
        <div class="${globalRow.profitPct > 15 ? "text-green-400" : "text-yellow-400"} text-xs font-semibold">${(globalRow.profitPct || 0).toFixed(1)}% ROI</div>
      </div>
    </div>` : globalRow.missingMat ? `
    <div class="mb-4 rounded-xl border border-slate-700/50 bg-slate-800/20 px-4 py-3 flex items-center gap-3">
      <span class="text-slate-500 text-lg">⚠</span>
      <div>
        <div class="text-xs font-semibold text-slate-400">Incomplete market data</div>
        <div class="text-xs text-slate-600 mt-0.5">Some material prices missing — profits may be understated. Try refreshing or switching server.</div>
      </div>
    </div>` : ""}

    <!-- ── Sourcing mode + order type controls ── -->
    <div class="flex items-center gap-3 mb-4 flex-wrap">
      <span class="text-xs text-slate-500 uppercase tracking-wider shrink-0">Source</span>
      <div class="flex gap-1" id="sourcingBtns">
        <button class="qty-btn${craftState.sourcingMode === "global"    ? " active" : ""}" data-src="global">🌍 Global</button>
        <button class="qty-btn${craftState.sourcingMode === "same_city" ? " active" : ""}" data-src="same_city">📍 Per City</button>
      </div>
      <div class="w-px h-4 bg-border mx-1 shrink-0"></div>
      <span class="text-xs text-slate-500 uppercase tracking-wider shrink-0">Mat orders</span>
      <div class="flex gap-1" id="orderBtns">
        <button class="qty-btn${craftState.materialOrder === "sell" ? " active" : ""}" data-order="sell">Sell</button>
        <button class="qty-btn${craftState.materialOrder === "buy"  ? " active" : ""}" data-order="buy">Buy orders</button>
      </div>
    </div>

    <!-- ── Quantity + Tax ── -->
    <div class="flex items-center gap-3 mb-5 flex-wrap">
      <span class="text-xs text-slate-500 uppercase tracking-wider shrink-0">Quantity</span>
      <div class="flex gap-1.5" id="qtyBtns">
        ${[1,10,100,1000].map(q => `
          <button class="qty-btn${craftState.craftQty === q ? " active" : ""}" data-qty="${q}">×${q.toLocaleString()}</button>
        `).join("")}
      </div>
      <span class="text-xs text-slate-600 ml-auto">
        Tax: <span class="text-albion">${craftState.taxPct}%</span>
        ${craftState.returnRate > 0 ? `· Return: <span class="text-green-400">${craftState.returnRate}%</span>` : ""}
      </span>
    </div>

    <!-- ── Hero: You Pay / You Receive / Net Profit ── -->
    <div class="profit-hero mb-5">
      <div class="hero-card hero-pay">
        <div class="hero-card-label">You Pay</div>
        <div class="hero-card-amount ${hasMatData ? "text-red-400" : "text-slate-600"}">
          ${hasMatData ? fmtNZ(youPay) : "No data"} ${hasMatData ? `<span class="hero-unit">s</span>` : ""}
        </div>
        <div class="hero-card-sub">Materials + ${craftState.taxPct}% tax${qty > 1 ? ` × ${qty}` : ""}</div>
      </div>
      <div class="hero-sep">→</div>
      <div class="hero-card hero-receive">
        <div class="hero-card-label">You Receive</div>
        <div class="hero-card-amount ${hasSellData ? "text-blue-400" : "text-slate-600"}">
          ${hasSellData ? fmtNZ(youReceive) : "No data"} ${hasSellData ? `<span class="hero-unit">s</span>` : ""}
        </div>
        <div class="hero-card-sub">Sell · ${esc(sellLoc)}</div>
      </div>
      <div class="hero-sep">=</div>
      <div class="hero-card hero-profit ${netProfit != null && netProfit > 0 ? "profitable" : netProfit != null && netProfit < 0 ? "loss" : ""}">
        <div class="hero-card-label">Net Profit</div>
        <div class="hero-card-amount ${netProfit != null ? pcls : "text-slate-600"}">
          ${netProfit != null ? fmtProfit(netProfit) : (hasMatData && hasSellData ? "—" : "No data")}
          ${netProfit != null ? `<span class="hero-unit">s</span>` : ""}
        </div>
        <div class="hero-card-sub ${netProfit != null ? roiClr : "text-slate-600"}">
          ${netProfit != null ? `${roi.toFixed(1)}% ROI · ${netProfit > 0 ? "✓ Profitable" : "✗ Loss"}` : "Awaiting prices"}
        </div>
      </div>
    </div>

    <!-- ── Efficiency metrics ── -->
    <div class="eff-grid mb-5">
      <div class="eff-card">
        <div class="eff-label">Per Craft</div>
        <div class="eff-value ${pcls}">${best?.profit != null ? fmtProfit(best.profit) : "—"}</div>
        <div class="eff-sub">silver</div>
      </div>
      <div class="eff-card">
        <div class="eff-label">Per Second</div>
        <div class="eff-value ${pcls}">${best?.profitPerSec != null ? fmtProfit(Math.round(best.profitPerSec)) : "—"}</div>
        <div class="eff-sub">s/sec</div>
      </div>
      <div class="eff-card">
        <div class="eff-label">Per Minute</div>
        <div class="eff-value ${pcls}">${best?.profitPerMin != null ? fmtProfit(Math.round(best.profitPerMin)) : "—"}</div>
        <div class="eff-sub">s/min</div>
      </div>
      <div class="eff-card eff-score-card">
        <div class="eff-label">Efficiency Score</div>
        <div class="eff-value" style="color:${sClr}">${score}<span class="text-xs text-slate-500 font-normal ml-0.5">/100</span></div>
        <div class="eff-bar mt-1.5"><div class="eff-bar-fill" style="width:${score}%;background:${sClr}"></div></div>
      </div>
    </div>

    <!-- ── Materials table ── -->
    ${renderMaterialsTable(recipe, craftState.sourcingMode === "global" ? globalRow : best)}

    <!-- ── City comparison (shown in per-city mode, or as reference in global) ── -->
    ${renderCityTable(rows)}

    <!-- ── Price history (async loaded below) ── -->
    <div id="craftSparklineSection" class="mt-4 pt-4 border-t border-border">
      <div class="text-xs text-slate-600 animate-pulse">Loading price history…</div>
    </div>

    <p class="text-xs text-slate-700 mt-3 pt-3 border-t border-border">
      ⓘ Return rate accounts for crafting focus bonus. Actual profit depends on city crafting bonuses and market fluctuations.
      Data via <a href="https://www.albion-online-data.com" target="_blank" class="underline hover:text-slate-500">Albion Online Data Project</a>.
    </p>
  `;

  // Wire quantity buttons
  panel.querySelectorAll(".qty-btn[data-qty]").forEach(btn => {
    btn.addEventListener("click", () => {
      craftState.craftQty = parseInt(btn.dataset.qty);
      renderCalculator(recipeId, prices);
    });
  });

  // Wire sourcing mode buttons
  panel.querySelectorAll(".qty-btn[data-src]").forEach(btn => {
    btn.addEventListener("click", () => {
      craftState.sourcingMode = btn.dataset.src;
      renderCalculator(recipeId, prices);
    });
  });

  // Wire material order buttons
  panel.querySelectorAll(".qty-btn[data-order]").forEach(btn => {
    btn.addEventListener("click", () => {
      craftState.materialOrder = btn.dataset.order;
      renderCalculator(recipeId, prices);
    });
  });

  // Load price history async (non-blocking)
  fetchPriceHistory(recipe.id).then(histData => {
    const sec = document.getElementById("craftSparklineSection");
    if (!sec) return;
    const svg = renderSparkline(histData);
    if (!svg) { sec.innerHTML = ""; return; }
    const prices14 = histData.flatMap(d => (d.data || []).map(p => p.avg_price || 0)).filter(p => p > 0);
    const firstP = prices14[0] || 0, lastP = prices14[prices14.length - 1] || 0;
    const chg    = firstP > 0 ? ((lastP - firstP) / firstP * 100).toFixed(1) : null;
    const chgCls = chg == null ? "text-slate-500" : +chg >= 0 ? "text-green-400" : "text-red-400";
    sec.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-slate-500 uppercase tracking-wider">Price Trend · 14 Days</span>
        ${chg != null ? `<span class="text-xs font-semibold ${chgCls}">${+chg >= 0 ? "+" : ""}${chg}%</span>` : ""}
      </div>
      <div class="flex items-end gap-4">
        ${svg}
        <div class="text-right text-xs text-slate-600 pb-1">
          <div>Low: ${fmtN(Math.min(...prices14))}</div>
          <div>High: ${fmtN(Math.max(...prices14))}</div>
        </div>
      </div>`;
  });
}

function renderMaterialsTable(recipe, cityRow) {
  const isGlobal = cityRow?.isGlobal;
  const mats = cityRow?.matDetails
    || recipe.materials.map(m => ({ ...m, unitPrice:0, effectiveAmount:m.amount, lineTotal:0, missing:true }));
  const qty  = craftState.craftQty || 1;

  const rows = mats.map(m => {
    const age = m.age
      ? (window.ageString ? window.ageString(m.age) : { text:"—", cls:"" })
      : { text:"—", cls:"" };
    const effectiveQty = (m.effectiveAmount ?? m.amount) * qty;
    const rawQty       = m.amount * qty;
    const showReturn   = craftState.returnRate > 0;

    return `<tr class="border-b border-[#141c28] hover:bg-[rgba(255,255,255,0.02)]">
      <td class="px-3 py-2.5">
        <div class="flex items-center gap-2">
          <img src="${iconUrl(m.id)}" alt="" onerror="onIconError(this)"
            class="w-7 h-7 rounded-lg border border-border bg-elevated" loading="lazy" />
          <div>
            <div class="text-sm text-slate-300">${esc(m.label || m.id)}</div>
            ${isGlobal && m.sourceCity ? `<div class="text-xs text-slate-600">📍 ${esc(m.sourceCity)}</div>` : ""}
          </div>
        </div>
      </td>
      <td class="px-3 py-2.5 text-right text-sm">
        <div class="text-slate-400">${showReturn ? effectiveQty.toFixed(1) : Math.round(rawQty).toLocaleString()}</div>
        ${showReturn ? `<div class="text-xs text-slate-600 line-through">${Math.round(rawQty).toLocaleString()}</div>` : ""}
      </td>
      <td class="px-3 py-2.5 text-right text-sm">
        <div class="${m.missing ? "text-slate-600" : "text-slate-200"}">${m.missing ? "No data" : fmtN(m.unitPrice)}</div>
        ${!m.missing && m.buyOrderPrice && m.sellPrice && m.buyOrderPrice !== m.unitPrice
          ? `<div class="text-xs text-slate-600">Buy ord: ${fmtN(m.buyOrderPrice)}</div>` : ""}
      </td>
      <td class="px-3 py-2.5 text-right text-sm font-semibold ${m.missing ? "text-slate-600" : "text-slate-100"}">
        ${m.missing ? "—" : fmtN(m.lineTotal * qty)}
      </td>
      <td class="px-3 py-2.5 text-right text-xs ${age.cls}">${age.text}</td>
    </tr>`;
  }).join("");

  const cityLabel = cityRow?.isGlobal
    ? `<span class="text-green-400">GLOBAL CHEAPEST</span>`
    : `<span class="text-slate-400">${esc(cityRow?.city || "—")}</span>`;

  return `
    <div class="mb-5">
      <h4 class="text-xs uppercase tracking-widest text-slate-500 mb-2">
        Materials · Best prices ${cityRow?.isGlobal ? "globally" : `in ${cityLabel}`}
      </h4>
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border bg-elevated text-xs text-slate-500 uppercase tracking-wider">
              <th class="text-left px-3 py-2">Material${cityRow?.isGlobal ? " · Source" : ""}</th>
              <th class="text-right px-3 py-2">Qty${craftState.returnRate > 0 ? " (effective)" : ""}${craftState.craftQty > 1 ? ` ×${craftState.craftQty}` : ""}</th>
              <th class="text-right px-3 py-2">Unit Price</th>
              <th class="text-right px-3 py-2">Total Cost</th>
              <th class="text-right px-3 py-2">Age</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function renderCityTable(rows) {
  const bestProfit = Math.max(0, ...rows.filter(r => r.profit > 0).map(r => r.profit));
  const tableRows  = rows.map(row => {
    const meta  = (window.CITY_META || {})[row.city] || {};
    const age   = row.sellAge ? (window.ageString ? window.ageString(row.sellAge) : { text:"—", cls:"" }) : { text:"—", cls:"" };
    const pcls  = profitColorClass(row.profit);
    const pbg   = profitBgClass(row.profit);
    const score = efficiencyScore(row);
    const sClr  = scoreColor(score);
    let verdict = "";
    if (!row.profit || row.profit <= 0) verdict = `<span class="badge badge-red">Loss</span>`;
    else if (row.profit === bestProfit)  verdict = `<span class="badge badge-gold">🏆 Best</span>`;
    else if ((row.profitPct || 0) > 20)  verdict = `<span class="badge badge-green">✓ Good</span>`;
    else                                 verdict = `<span class="badge badge-slate">OK</span>`;

    // Show "no data" state clearly
    const hasData = row.sellPrice > 0 || row.matCost > 0;

    return `<tr class="border-b border-[#141c28] hover:bg-[rgba(255,255,255,0.015)] transition-colors ${pbg}">
      <td class="px-3 py-2.5" style="border-left:2px solid ${meta.color||"#2a3a4e"};padding-left:10px">
        <span class="font-semibold text-sm" style="color:${meta.color||"#e2e8f0"}">${esc(row.city)}</span>
        ${row.missingMat ? `<span class="text-xs text-slate-700 ml-1">⚠</span>` : ""}
      </td>
      <td class="px-3 py-2.5 text-right text-sm ${row.matCost>0?"text-slate-400":"text-slate-700"}">${row.matCost>0?fmtN(row.matCost):"—"}</td>
      <td class="px-3 py-2.5 text-right text-xs text-slate-600">+${fmtN(row.tax)}</td>
      <td class="px-3 py-2.5 text-right text-sm ${row.sellPrice>0?"text-slate-300":"text-slate-700"}">${row.sellPrice>0?fmtN(row.sellPrice):"—"}</td>
      <td class="px-3 py-2.5 text-right text-sm font-bold ${hasData?pcls:"text-slate-700"}">${row.profit!=null?fmtProfit(row.profit):"—"}</td>
      <td class="px-3 py-2.5 text-right text-xs ${(row.profitPct||0)>15?"text-green-400":(row.profitPct||0)>5?"text-yellow-400":"text-red-400"}">
        ${row.profitPct != null ? row.profitPct.toFixed(1) + "%" : "—"}
      </td>
      <td class="px-3 py-2.5 text-right text-xs ${pcls}">${row.profitPerSec!=null?fmtProfit(Math.round(row.profitPerSec)):"—"}</td>
      <td class="px-3 py-2.5 text-right text-xs ${pcls}">${row.profitPerMin!=null?fmtProfit(Math.round(row.profitPerMin)):"—"}</td>
      <td class="px-3 py-2.5 text-right"><span style="color:${sClr}" class="text-xs font-semibold">${score>0?score:"—"}</span></td>
      <td class="px-3 py-2.5 text-right text-xs ${age.cls}">${age.text}</td>
      <td class="px-3 py-2.5 text-right">${verdict}</td>
    </tr>`;
  }).join("");

  return `
    <div>
      <h4 class="text-xs uppercase tracking-widest text-slate-500 mb-2">All Cities Comparison</h4>
      <div class="bg-surface border border-border rounded-xl overflow-hidden overflow-x-auto">
        <table class="w-full text-sm" style="min-width:780px">
          <thead>
            <tr class="border-b border-border bg-elevated text-xs text-slate-500 uppercase tracking-wider">
              <th class="text-left px-3 py-2">City</th>
              <th class="text-right px-3 py-2">Mat Cost</th>
              <th class="text-right px-3 py-2">Tax</th>
              <th class="text-right px-3 py-2">Sell Price</th>
              <th class="text-right px-3 py-2">Profit</th>
              <th class="text-right px-3 py-2">ROI</th>
              <th class="text-right px-3 py-2">/sec</th>
              <th class="text-right px-3 py-2">/min</th>
              <th class="text-right px-3 py-2">Score</th>
              <th class="text-right px-3 py-2">Updated</th>
              <th class="text-right px-3 py-2">Verdict</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>`;
}

// ---- Tab init ----
function initCraftingTab() {
  const host = document.getElementById("tab-crafting");
  if (!host || host.dataset.crafting) return;
  host.dataset.crafting = "1";

  host.innerHTML = `
    <!-- Recommendations -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-widest">Smart Recommendations</h3>
        <button id="recRefreshBtn" class="text-xs text-slate-500 hover:text-albion border border-border rounded-lg px-3 py-1.5 bg-surface transition-colors">↻ Refresh</button>
      </div>
      <div id="recCards" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"></div>
    </div>

    <div class="craft-layout">
      <!-- Left: filters + recipe list -->
      <div class="craft-sidebar">
        <div class="mb-3">
          <div class="filter-label mb-2">Category</div>
          <div class="flex gap-1.5 flex-wrap mb-3" id="craftCatFilter"></div>

          <div class="filter-label mb-2">Tier</div>
          <div class="flex gap-1.5 flex-wrap mb-3" id="craftTierFilter"></div>

          <div class="filter-label mb-1">Crafting Tax %</div>
          <div class="flex items-center gap-2 mb-3">
            <input type="range" id="taxSlider" min="0" max="25" value="${craftState.taxPct}"
              class="flex-1 h-1.5 rounded-full accent-albion cursor-pointer" />
            <span id="taxVal" class="text-xs text-albion font-mono w-8 text-right">${craftState.taxPct}%</span>
          </div>

          <div class="filter-label mb-1">Crafting Focus Return %
            <span class="text-slate-700 font-normal normal-case tracking-normal ml-1">(0 = no focus)</span>
          </div>
          <div class="flex items-center gap-2 mb-1">
            <input type="range" id="returnSlider" min="0" max="47" step="0.9" value="${craftState.returnRate}"
              class="flex-1 h-1.5 rounded-full accent-green-500 cursor-pointer" />
            <span id="returnVal" class="text-xs text-green-400 font-mono w-10 text-right">${craftState.returnRate.toFixed(1)}%</span>
          </div>
          <div class="text-xs text-slate-700 mb-3">Max 47.9% at 100% crafting specialization</div>
        </div>

        <div class="filter-label mb-2">Select Item to Craft</div>
        <input id="craftSearch" type="text" placeholder="Filter recipes…"
          class="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-slate-200 outline-none mb-2 placeholder-slate-600 focus:border-albion/50" />
        <div id="recipeList" class="craft-recipe-list thin-scroll"></div>
      </div>

      <!-- Right: calculator -->
      <div class="craft-calc-panel" id="craftCalcPanel">
        <div class="text-center text-slate-600 py-16">
          <div class="text-5xl mb-4">⚒</div>
          <p class="text-sm font-medium text-slate-500">Select a recipe to calculate profitability</p>
          <p class="text-xs text-slate-600 mt-2">Live prices · Global sourcing · Price history</p>
        </div>
      </div>
    </div>
  `;

  // Category filter
  buildCraftFilter("craftCatFilter", ["All","Refining","Weapons","Armor","Bags"], craftState, "filterCategory", renderRecipeList);
  // Tier filter (include T2/T3 for refining)
  buildCraftFilter("craftTierFilter", ["All","T2","T3","T4","T5","T6","T7","T8"], craftState, "filterTier", renderRecipeList);

  // Tax slider
  const taxSlider = document.getElementById("taxSlider");
  taxSlider.addEventListener("input", () => {
    craftState.taxPct = parseInt(taxSlider.value);
    document.getElementById("taxVal").textContent = craftState.taxPct + "%";
    if (craftState.selectedRecipeId && craftState.calcPrices.length)
      renderCalculator(craftState.selectedRecipeId, craftState.calcPrices);
  });

  // Return rate slider
  const returnSlider = document.getElementById("returnSlider");
  returnSlider.addEventListener("input", () => {
    craftState.returnRate = parseFloat(returnSlider.value);
    document.getElementById("returnVal").textContent = craftState.returnRate.toFixed(1) + "%";
    if (craftState.selectedRecipeId && craftState.calcPrices.length)
      renderCalculator(craftState.selectedRecipeId, craftState.calcPrices);
  });

  // Recipe search
  document.getElementById("craftSearch").addEventListener("input", renderRecipeList);

  // Rec refresh
  document.getElementById("recRefreshBtn").addEventListener("click", () => {
    craftState.recommendations = [];
    craftState.recLoading = false;
    loadRecommendations();
  });

  renderRecipeList();
  loadRecommendations();
}

function buildCraftFilter(hostId, values, obj, key, onChange) {
  const host = document.getElementById(hostId);
  if (!host) return;
  host.innerHTML = "";
  for (const v of values) {
    const chip = document.createElement("div");
    chip.className = "chip" + (obj[key] === v ? " on" : "");
    chip.textContent = v;
    chip.addEventListener("click", () => {
      obj[key] = v;
      host.querySelectorAll(".chip").forEach(c => c.classList.remove("on"));
      chip.classList.add("on");
      onChange();
    });
    host.appendChild(chip);
  }
}

window.initCraftingTab = initCraftingTab;

// ================================================================
//  Cross-tab integration — called from app.js
// ================================================================

/**
 * Navigate the Crafting tab to a specific recipe, syncing from the market tab.
 * Called by app.js when user clicks "⚒ View Recipe" on an item in the Market tab.
 */
window.selectCraftingItem = function(itemId) {
  const base   = (itemId || "").split("@")[0];
  const recipe = window.CRAFTING_RECIPES[base] || window.CRAFTING_RECIPES[itemId];

  if (!recipe) {
    console.info(`[Crafting] No recipe for: ${itemId}`);
    return;
  }

  // Ensure crafting tab is initialised
  if (!document.getElementById("tab-crafting")?.dataset.crafting) {
    window.initCraftingTab?.();
  }

  // Sync sidebar filters to match the recipe
  craftState.filterCategory = recipe.category;
  craftState.filterTier     = `T${recipe.tier}`;

  // Update chip UI
  const catHost  = document.getElementById("craftCatFilter");
  const tierHost = document.getElementById("craftTierFilter");
  catHost?.querySelectorAll(".chip").forEach(c => {
    c.classList.toggle("on", c.textContent === recipe.category);
  });
  tierHost?.querySelectorAll(".chip").forEach(c => {
    c.classList.toggle("on", c.textContent === `T${recipe.tier}`);
  });

  // Render filtered list and select
  renderRecipeList();

  // Small delay so DOM settles, then select + scroll
  setTimeout(() => {
    selectRecipe(recipe.id);
    const activeEl = document.querySelector("#recipeList .recipe-item.active");
    activeEl?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 80);
};

/**
 * Called by manualRefresh() in app.js when the ↻ button is pressed.
 * Refreshes crafting prices if the crafting tab is active.
 */
window.refreshCraftingPrices = function() {
  if (!craftState.selectedRecipeId) return;
  const recipe = window.CRAFTING_RECIPES[craftState.selectedRecipeId];
  if (!recipe) return;
  setCalcStatus("updating");
  fetchRecipePrices(recipe)
    .then(prices => {
      craftState.calcPrices = prices;
      renderCalculator(craftState.selectedRecipeId, prices);
      setCalcStatus("live");
    })
    .catch(() => setCalcStatus("error"));
};
