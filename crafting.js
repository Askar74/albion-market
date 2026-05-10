// ================================================================
//  crafting.js — Real-time crafting profitability engine
//  Data source: Albion Online Data Project (compliant, public API)
//  Recipes: public game mechanics (no scraping)
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
function fmtProfit(n) {
  if (n==null||isNaN(n)) return "—";
  const sign = n>0?"+":"";
  return sign + Math.round(n).toLocaleString("en-US");
}
function profitColorClass(n) { return n>0?"text-green-400":n<0?"text-red-400":"text-slate-500"; }
function profitBgClass(n)    { return n>0?"bg-green-400/10":n<0?"bg-red-400/10":""; }

// Uses ageMins from app.js (loaded before this file)
function ageMinsCraft(iso) {
  if (!iso||iso.startsWith("0001-01-01")) return Infinity;
  const t = new Date(iso+(iso.endsWith("Z")?"":"Z")).getTime();
  return isNaN(t) ? Infinity : (Date.now()-t)/60000;
}

// ---- Profit engine ----
function calcProfit(recipe, allPrices, taxPct) {
  const results = [];
  for (const city of (window.CITIES||[])) {
    let matCost   = 0;
    let missingMat = false;
    const matDetails = [];

    for (const mat of recipe.materials) {
      const rows = allPrices.filter(p => p.item_id===mat.id && p.city===city && p.sell_price_min>0);
      const best = rows.reduce((a,b) => (!a||b.sell_price_min<a.sell_price_min)?b:a, null);
      const price = best?.sell_price_min||0;
      if (!price) missingMat = true;
      matDetails.push({ ...mat, unitPrice:price, lineTotal:price*mat.amount, age:best?.sell_price_min_date, missing:!price });
      matCost += price*mat.amount;
    }

    const tax      = Math.round(matCost * taxPct / 100);
    const costFull = matCost + tax;

    const iRows    = allPrices.filter(p => p.item_id===recipe.id && p.city===city && p.sell_price_min>0);
    const bestItem = iRows.reduce((a,b) => (!a||b.sell_price_min<a.sell_price_min)?b:a, null);
    const sellPrice = bestItem?.sell_price_min||0;
    const sellAge   = bestItem?.sell_price_min_date;

    const profit        = (sellPrice>0 && costFull>0) ? sellPrice-costFull : null;
    const profitPct     = (profit!=null&&sellPrice>0) ? (profit/sellPrice*100) : null;
    const profitPerSec  = (profit!=null&&recipe.craftTime>0) ? profit/recipe.craftTime : null;
    const profitPerMin  = profitPerSec!=null ? profitPerSec*60 : null;
    const profitPerHour = profitPerMin!=null ? profitPerMin*60 : null;

    results.push({ city, matCost, tax, costFull, sellPrice, sellAge, profit, profitPct, profitPerSec, profitPerMin, profitPerHour, matDetails, missingMat });
  }
  return results.sort((a,b) => (b.profit||0)-(a.profit||0));
}

// ---- Efficiency score 0-100 ----
function efficiencyScore(row) {
  if (!row||row.profit==null||row.profit<=0) return 0;
  const roi   = Math.min(40, (row.profitPct||0) * 40/25);      // 25% ROI = 40pts
  const speed = Math.min(40, ((row.profitPerMin||0)/300000)*40); // 300k/min = 40pts
  const fresh = ageMinsCraft(row.sellAge)<15 ? 20 : ageMinsCraft(row.sellAge)<60 ? 10 : 0;
  return Math.max(0, Math.min(100, Math.round(roi+speed+fresh)));
}

function scoreColor(n) { return n>=70?"#4ade80":n>=40?"#fbbf24":"#f87171"; }

// ---- AI tags from live market data ----
function computeAITags(recipe, cityRows) {
  const profitable = cityRows.filter(r => r.profit!=null&&r.profit>0);
  if (!profitable.length) return [{ label:"No profit", cls:"badge-red" }];
  const best  = profitable[0];
  const tags  = [];

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
  if (score>=80)            tags.push({ label:"Top Efficiency",  cls:"badge-green"  });
  else if (score>=60)       tags.push({ label:"Efficient",       cls:"badge-slate"  });

  const avgSpread = profitable.reduce((a,b)=>a+(b.profitPct||0),0)/profitable.length;
  if (avgSpread>20&&profitable.length>=4) tags.push({ label:"High Demand", cls:"badge-purple" });

  return tags.slice(0, 3);
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
};

// ---- Live refresh ----
let _liveTimer = null;
let _countdownTimer = null;

function startCraftLiveRefresh(recipeId) {
  stopCraftLiveRefresh();
  if (!recipeId) return;
  let nextAt = Date.now() + 30000;

  _countdownTimer = setInterval(() => {
    const el = document.getElementById("craftLiveCountdown");
    if (el) {
      const left = Math.max(0, Math.ceil((nextAt-Date.now())/1000));
      el.textContent = left>0 ? `Auto-refresh in ${left}s` : "Refreshing…";
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
    } catch(e) { setCalcStatus("error"); }
  }, 30000);
}

function stopCraftLiveRefresh() {
  clearInterval(_liveTimer);
  clearInterval(_countdownTimer);
  _liveTimer = null;
  _countdownTimer = null;
}
window.stopCraftLiveRefresh = stopCraftLiveRefresh;

function setCalcStatus(kind) {
  const el = document.getElementById("craftStatusBadge");
  if (!el) return;
  if (kind==="live")     { el.textContent="● Live";     el.className="text-xs text-green-400 font-medium"; }
  if (kind==="updating") { el.textContent="↻ Updating"; el.className="text-xs text-yellow-400 font-medium animate-pulse"; }
  if (kind==="error")    { el.textContent="✕ Error";    el.className="text-xs text-red-400 font-medium"; }
}

// ---- Fetch prices ----
async function fetchRecipePrices(recipe) {
  const ids = [recipe.id, ...recipe.materials.map(m => m.id)];
  const serverKey = document.getElementById("server")?.value || "europe";
  const url = `${window.API_BASES[serverKey]}/stats/prices/${ids.join(",")}.json`
    + `?locations=${encodeURIComponent((window.CITIES||[]).join(","))}`;
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
  document.getElementById("recCards").innerHTML =
    '<div class="col-span-full text-center text-slate-600 text-sm py-8 animate-pulse">Analysing market data…</div>';
  try {
    const allIds = new Set();
    const recipes = REC_ITEMS.map(id => window.CRAFTING_RECIPES[id]).filter(Boolean);
    for (const rec of recipes) { allIds.add(rec.id); rec.materials.forEach(m => allIds.add(m.id)); }
    const serverKey = document.getElementById("server")?.value || "europe";
    const prices = await window.apiFetch(
      `${window.API_BASES[serverKey]}/stats/prices/${[...allIds].join(",")}.json`
      + `?locations=${encodeURIComponent((window.CITIES||[]).join(","))}`
    );
    const ranked = [];
    for (const rec of recipes) {
      const rows = calcProfit(rec, prices, craftState.taxPct);
      const best = rows.find(r => r.profit!=null&&r.profit>0);
      if (best) { best.effScore = efficiencyScore(best); ranked.push({ recipe:rec, best, rows }); }
    }
    ranked.sort((a,b) => (b.best.effScore||0)-(a.best.effScore||0));
    craftState.recommendations = ranked.slice(0,6);
    renderRecommendations();
  } catch(e) {
    document.getElementById("recCards").innerHTML =
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
    const meta   = (window.CITY_META||{})[best.city]||{};
    const tags   = computeAITags(recipe, rows);
    const score  = best.effScore||0;
    const sColor = scoreColor(score);

    const el = document.createElement("div");
    el.className = "rec-card cursor-pointer";
    el.style.setProperty("--city-color", meta.color||"#546e7a");
    el.innerHTML = `
      <div class="flex items-center gap-2 mb-2">
        <img src="${iconUrl(recipe.id)}" alt="" loading="lazy" onerror="onIconError(this)" class="w-9 h-9 rounded-lg border border-border bg-elevated flex-shrink-0" />
        <div class="min-w-0 flex-1">
          <div class="text-xs font-semibold text-slate-200 truncate">${esc(recipe.name)}</div>
          <div class="text-xs text-slate-600">${recipe.category} · T${recipe.tier}</div>
        </div>
        <div class="text-xs font-bold" style="color:${sColor}">${score}</div>
      </div>
      <div class="text-xl font-black text-green-400 mb-1">
        +${fmtN(Math.round(best.profit))}<span class="text-xs text-slate-500 ml-1 font-normal">s/craft</span>
      </div>
      <div class="text-xs text-slate-500 mb-2">
        ${fmtN(Math.round(best.profitPerMin||0))}/min ·
        <span style="color:${meta.color||"#8a9aae"}">${esc(best.city)}</span>
      </div>
      <div class="flex gap-1 flex-wrap">
        ${tags.map(t=>`<span class="badge ${t.cls}">${t.label}</span>`).join("")}
      </div>
    `;
    el.addEventListener("click", () => selectRecipe(recipe.id));
    host.appendChild(el);
  });
}

// ---- Recipe list ----
function filterRecipes() {
  const q    = (document.getElementById("craftSearch")?.value||"").toLowerCase();
  const cat  = craftState.filterCategory;
  const tier = craftState.filterTier;
  return Object.values(window.CRAFTING_RECIPES).filter(r => {
    if (cat!=="All" && r.category!==cat)  return false;
    if (tier!=="All" && `T${r.tier}`!==tier) return false;
    if (q && !r.name.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
    return true;
  }).sort((a,b) => a.tier-b.tier||a.name.localeCompare(b.name));
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
    el.className = "recipe-item"+(craftState.selectedRecipeId===rec.id?" active":"");
    el.innerHTML = `
      <img src="${iconUrl(rec.id)}" alt="" loading="lazy" onerror="onIconError(this)" class="w-8 h-8 rounded-lg border border-border bg-elevated flex-shrink-0" />
      <div class="min-w-0 flex-1">
        <div class="text-sm text-slate-300 truncate font-medium">${esc(rec.name)}</div>
        <div class="text-xs text-slate-600">${rec.category} · T${rec.tier} · ${rec.craftTime}s</div>
      </div>
    `;
    el.addEventListener("click", () => {
      list.querySelectorAll(".recipe-item").forEach(e=>e.classList.remove("active"));
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

  // Highlight in list
  document.querySelectorAll("#recipeList .recipe-item").forEach(el => {
    const idText = el.querySelector(".text-xs")?.textContent||"";
    el.classList.toggle("active", idText.includes(`T${recipe.tier}`) && el.querySelector(".font-medium")?.textContent===recipe.name);
  });

  const panel = document.getElementById("craftCalcPanel");
  panel.innerHTML = `
    <div class="flex items-center gap-3 py-12 text-slate-500 justify-center text-sm">
      <span class="animate-spin text-xl">↻</span> Fetching live prices…
    </div>`;

  try {
    const prices = await fetchRecipePrices(recipe);
    craftState.calcPrices = prices;
    renderCalculator(id, prices);
    startCraftLiveRefresh(id);
  } catch(e) {
    panel.innerHTML = `<div class="text-red-400 py-12 text-center text-sm">Failed to fetch prices. Try again.</div>`;
  }
}

// ---- Main calculator renderer ----
function renderCalculator(recipeId, prices) {
  const recipe = window.CRAFTING_RECIPES[recipeId];
  if (!recipe) return;
  const panel  = document.getElementById("craftCalcPanel");
  const rows   = calcProfit(recipe, prices, craftState.taxPct);
  const qty    = craftState.craftQty;
  const best   = rows.find(r => r.profit!=null&&r.profit>0) || rows[0];
  const aiTags = computeAITags(recipe, rows);
  const score  = efficiencyScore(best);

  // Scaled by quantity
  const youPay      = (best?.costFull||0)  * qty;
  const youReceive  = (best?.sellPrice||0) * qty;
  const netProfit   = (best?.profit!=null) ? best.profit * qty : null;
  const roi         = best?.profitPct||0;

  const pcls  = profitColorClass(netProfit);
  const roiClr = roi>15 ? "text-green-400" : roi>5 ? "text-yellow-400" : "text-red-400";
  const sClr  = scoreColor(score);

  panel.innerHTML = `
    <!-- Item header -->
    <div class="flex items-start gap-3 mb-4 pb-4 border-b border-border">
      <img src="${iconUrl(recipe.id)}" onerror="onIconError(this)" class="w-14 h-14 rounded-xl border border-border bg-elevated flex-shrink-0" />
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-bold text-slate-100 truncate">${esc(recipe.name)}</h3>
        <div class="flex items-center gap-2 mt-1 flex-wrap">
          <span class="text-xs text-slate-500">${recipe.category} · T${recipe.tier} · ${recipe.craftTime}s craft</span>
          ${aiTags.map(t=>`<span class="badge ${t.cls}">${t.label}</span>`).join("")}
        </div>
      </div>
      <div class="text-right flex-shrink-0">
        <div id="craftStatusBadge" class="text-xs text-green-400 font-medium">● Live</div>
        <div id="craftLiveCountdown" class="text-xs text-slate-600 mt-0.5"></div>
      </div>
    </div>

    <!-- Quantity selector -->
    <div class="flex items-center gap-3 mb-5">
      <span class="text-xs text-slate-500 uppercase tracking-wider shrink-0">Quantity</span>
      <div class="flex gap-1.5" id="qtyBtns">
        ${[1,10,100,1000].map(q=>`
          <button class="qty-btn${craftState.craftQty===q?" active":""}" data-qty="${q}">×${q.toLocaleString()}</button>
        `).join("")}
      </div>
      <span class="text-xs text-slate-600">Tax:
        <span class="text-albion">${craftState.taxPct}%</span>
      </span>
    </div>

    <!-- Hero: You Pay / You Receive / Net Profit -->
    <div class="profit-hero mb-5">
      <div class="hero-card hero-pay">
        <div class="hero-card-label">You Pay</div>
        <div class="hero-card-amount text-red-400">${fmtN(youPay)} <span class="hero-unit">s</span></div>
        <div class="hero-card-sub">Materials + ${craftState.taxPct}% tax${qty>1?` × ${qty}`:""}</div>
      </div>
      <div class="hero-sep">→</div>
      <div class="hero-card hero-receive">
        <div class="hero-card-label">You Receive</div>
        <div class="hero-card-amount text-blue-400">${fmtN(youReceive)} <span class="hero-unit">s</span></div>
        <div class="hero-card-sub">Cheapest sell · ${esc(best?.city||"—")}</div>
      </div>
      <div class="hero-sep">=</div>
      <div class="hero-card hero-profit ${netProfit!=null&&netProfit>0?"profitable":netProfit!=null&&netProfit<0?"loss":""}">
        <div class="hero-card-label">Net Profit</div>
        <div class="hero-card-amount ${pcls}">${fmtProfit(netProfit)} <span class="hero-unit">s</span></div>
        <div class="hero-card-sub ${roiClr}">${roi.toFixed(1)}% ROI · ${netProfit!=null&&netProfit>0?"✓ Profitable":"✗ Loss"}</div>
      </div>
    </div>

    <!-- Efficiency metrics -->
    <div class="eff-grid mb-5">
      <div class="eff-card">
        <div class="eff-label">Per Craft</div>
        <div class="eff-value ${pcls}">${fmtProfit(best?.profit)}</div>
        <div class="eff-sub">silver</div>
      </div>
      <div class="eff-card">
        <div class="eff-label">Per Second</div>
        <div class="eff-value ${pcls}">${best?.profitPerSec!=null ? fmtProfit(Math.round(best.profitPerSec)) : "—"}</div>
        <div class="eff-sub">s/sec</div>
      </div>
      <div class="eff-card">
        <div class="eff-label">Per Minute</div>
        <div class="eff-value ${pcls}">${best?.profitPerMin!=null ? fmtProfit(Math.round(best.profitPerMin)) : "—"}</div>
        <div class="eff-sub">s/min</div>
      </div>
      <div class="eff-card eff-score-card">
        <div class="eff-label">Efficiency Score</div>
        <div class="eff-value" style="color:${sClr}">${score}<span class="text-xs text-slate-500 font-normal ml-0.5">/100</span></div>
        <div class="eff-bar mt-1.5">
          <div class="eff-bar-fill" style="width:${score}%;background:${sClr}"></div>
        </div>
      </div>
    </div>

    <!-- Materials table -->
    ${renderMaterialsTable(recipe, best)}

    <!-- City comparison -->
    ${renderCityTable(rows)}

    <p class="text-xs text-slate-700 mt-3 pt-3 border-t border-border">
      ⓘ Base crafting costs. Actual profit depends on crafting focus, city bonuses, and market fluctuations.
      Data via <a href="https://www.albion-online-data.com" target="_blank" class="underline hover:text-slate-500">Albion Online Data Project</a>.
    </p>
  `;

  // Wire quantity buttons
  panel.querySelectorAll(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      craftState.craftQty = parseInt(btn.dataset.qty);
      renderCalculator(recipeId, prices);
    });
  });
}

function renderMaterialsTable(recipe, cityRow) {
  const mats = cityRow?.matDetails || recipe.materials.map(m => ({ ...m, unitPrice:0, lineTotal:0, missing:true }));
  const rows = mats.map(m => {
    const age = m.age ? (window.ageString?window.ageString(m.age):{text:"—",cls:""}) : {text:"—",cls:""};
    return `<tr class="border-b border-[#141c28] hover:bg-[rgba(255,255,255,0.02)]">
      <td class="px-3 py-2.5">
        <div class="flex items-center gap-2">
          <img src="${iconUrl(m.id)}" alt="" onerror="onIconError(this)" class="w-7 h-7 rounded-lg border border-border bg-elevated" loading="lazy" />
          <span class="text-sm text-slate-300">${esc(m.label||m.id)}</span>
        </div>
      </td>
      <td class="px-3 py-2.5 text-right text-sm text-slate-400">${(m.amount*(craftState.craftQty||1)).toLocaleString()}</td>
      <td class="px-3 py-2.5 text-right text-sm ${m.missing?"text-slate-600":"text-slate-200"}">${m.missing?"—":fmtN(m.unitPrice)}</td>
      <td class="px-3 py-2.5 text-right text-sm font-semibold ${m.missing?"text-slate-600":"text-slate-100"}">${m.missing?"—":fmtN(m.lineTotal*(craftState.craftQty||1))}</td>
      <td class="px-3 py-2.5 text-right text-xs ${age.cls}">${age.text}</td>
    </tr>`;
  }).join("");

  return `
    <div class="mb-5">
      <h4 class="text-xs uppercase tracking-widest text-slate-500 mb-2">
        Materials · Best prices in <span class="text-slate-400">${esc(cityRow?.city||"—")}</span>
      </h4>
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border bg-elevated text-xs text-slate-500 uppercase tracking-wider">
              <th class="text-left px-3 py-2">Material</th>
              <th class="text-right px-3 py-2">Qty${craftState.craftQty>1?` ×${craftState.craftQty}`:""}</th>
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
  const bestProfit = Math.max(0, ...rows.filter(r=>r.profit>0).map(r=>r.profit));
  const tableRows  = rows.map(row => {
    const meta  = (window.CITY_META||{})[row.city]||{};
    const age   = row.sellAge ? (window.ageString?window.ageString(row.sellAge):{text:"—",cls:""}) : {text:"—",cls:""};
    const pcls  = profitColorClass(row.profit);
    const pbg   = profitBgClass(row.profit);
    const score = efficiencyScore(row);
    const sClr  = scoreColor(score);

    // Verdict
    let verdict = "";
    if (!row.profit || row.profit<=0) verdict = `<span class="badge badge-red">Loss</span>`;
    else if (row.profit===bestProfit)  verdict = `<span class="badge badge-gold">🏆 Best</span>`;
    else if ((row.profitPct||0)>20)    verdict = `<span class="badge badge-green">✓ Good</span>`;
    else                               verdict = `<span class="badge badge-slate">OK</span>`;

    return `<tr class="border-b border-[#141c28] hover:bg-[rgba(255,255,255,0.015)] transition-colors ${pbg}">
      <td class="px-3 py-2.5" style="border-left:2px solid ${meta.color||"#2a3a4e"};padding-left:10px">
        <span class="font-semibold text-sm" style="color:${meta.color||"#e2e8f0"}">${esc(row.city)}</span>
      </td>
      <td class="px-3 py-2.5 text-right text-sm text-slate-400">${fmtN(row.matCost)}</td>
      <td class="px-3 py-2.5 text-right text-xs text-slate-600">+${fmtN(row.tax)}</td>
      <td class="px-3 py-2.5 text-right text-sm text-slate-300">${row.sellPrice?fmtN(row.sellPrice):"—"}</td>
      <td class="px-3 py-2.5 text-right text-sm font-bold ${pcls}">${fmtProfit(row.profit)}</td>
      <td class="px-3 py-2.5 text-right text-xs ${(row.profitPct||0)>15?"text-green-400":(row.profitPct||0)>5?"text-yellow-400":"text-red-400"}">
        ${row.profitPct!=null?row.profitPct.toFixed(1)+"%":"—"}
      </td>
      <td class="px-3 py-2.5 text-right text-xs ${pcls}">
        ${row.profitPerSec!=null?fmtProfit(Math.round(row.profitPerSec)):"—"}
      </td>
      <td class="px-3 py-2.5 text-right text-xs ${pcls}">
        ${row.profitPerMin!=null?fmtProfit(Math.round(row.profitPerMin)):"—"}
      </td>
      <td class="px-3 py-2.5 text-right">
        <span style="color:${sClr}" class="text-xs font-semibold">${score>0?score:"—"}</span>
      </td>
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
            <input type="range" id="taxSlider" min="0" max="25" value="3"
              class="flex-1 h-1.5 rounded-full accent-albion cursor-pointer" />
            <span id="taxVal" class="text-xs text-albion font-mono w-8 text-right">${craftState.taxPct}%</span>
          </div>
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
          <p class="text-xs text-slate-600 mt-2">Live prices · Profit per second · City comparison</p>
        </div>
      </div>
    </div>
  `;

  // Category filter
  buildCraftFilter("craftCatFilter", ["All","Refining","Weapons","Armor","Bags"], craftState, "filterCategory", renderRecipeList);
  buildCraftFilter("craftTierFilter", ["All","T4","T5","T6","T7","T8"], craftState, "filterTier", renderRecipeList);

  // Tax slider
  const slider = document.getElementById("taxSlider");
  slider.addEventListener("input", () => {
    craftState.taxPct = parseInt(slider.value);
    document.getElementById("taxVal").textContent = craftState.taxPct+"%";
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
    chip.className = "chip"+(obj[key]===v?" on":"");
    chip.textContent = v;
    chip.addEventListener("click", () => {
      obj[key] = v;
      host.querySelectorAll(".chip").forEach(c=>c.classList.remove("on"));
      chip.classList.add("on");
      onChange();
    });
    host.appendChild(chip);
  }
}

window.initCraftingTab = initCraftingTab;
