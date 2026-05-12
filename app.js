// ================================================================
//  Albion Live Market Tracker — app.js
//  Data sources (all compliant, no scraping):
//    1. AODP prices:  /api/v2/stats/prices/
//    2. AODP history: /api/v2/stats/history/
//    3. AODP gold:    /api/v2/stats/gold.json
//    4. Render API:   render.albiononline.com (icons)
// ================================================================

// ---------- CACHE & RATE-LIMIT ----------

const _apiCache = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 min (for auto-refresh; manual refresh bypasses this)
let   _lastRequestTime = 0;

async function apiFetch(url, { forceRefresh = false } = {}) {
  const now    = Date.now();
  const cached = _apiCache.get(url);
  // Skip cache only if caller explicitly requests a fresh fetch
  if (!forceRefresh && cached && now - cached.ts < CACHE_TTL) return cached.data;

  // Minimum 100ms between requests (rate-limit)
  const gap = now - _lastRequestTime;
  if (gap < 100) await new Promise(r => setTimeout(r, 100 - gap));
  _lastRequestTime = Date.now();

  const res  = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  _apiCache.set(url, { data, ts: Date.now() });
  return data;

}

/** Wipe only the price-related entries so manual refresh always hits the API. */
function bustPriceCache() {
  for (const key of _apiCache.keys()) {
    if (key.includes("/stats/prices/") || key.includes("/stats/history/")) {
      _apiCache.delete(key);
    }
  }
}

// Expose for crafting.js — only apiFetch is needed immediately;
// the rest (iconUrl, CITIES, CITY_META, ageString) are top-level
// function/const declarations and are already on window automatically.
window.apiFetch = apiFetch;

// ---------- ICON FALLBACK ----------

const FALLBACK_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' rx='10' fill='%23171e2d'/%3E%3Ctext x='32' y='44' text-anchor='middle' font-size='28' fill='%232a3a4e'%3E%E2%9A%94%3C/text%3E%3C/svg%3E";
window.FALLBACK_ICON = FALLBACK_ICON;
window.onIconError = function(img) { img.onerror = null; img.src = FALLBACK_ICON; };

// ---------- API ----------

const API_BASES = {
  west:   "https://west.albion-online-data.com/api/v2",
  east:   "https://east.albion-online-data.com/api/v2",
  europe: "https://europe.albion-online-data.com/api/v2",
};

// ---------- CITIES & COLORS ----------

const CITIES = [
  "Caerleon", "Bridgewatch", "Lymhurst",
  "Fort Sterling", "Martlock", "Thetford",
  "Brecilien", "Black Market",
];

const CITY_META = {
  "Caerleon":      { color: "#e53935", bg: "rgba(229,57,53,0.08)",   glow: "rgba(229,57,53,0.12)"  },
  "Bridgewatch":   { color: "#fb8c00", bg: "rgba(251,140,0,0.08)",   glow: "rgba(251,140,0,0.12)"  },
  "Lymhurst":      { color: "#43a047", bg: "rgba(67,160,71,0.08)",   glow: "rgba(67,160,71,0.12)"  },
  "Fort Sterling": { color: "#90a4ae", bg: "rgba(144,164,174,0.08)", glow: "rgba(144,164,174,0.1)" },
  "Martlock":      { color: "#1e88e5", bg: "rgba(30,136,229,0.08)",  glow: "rgba(30,136,229,0.12)" },
  "Thetford":      { color: "#8e24aa", bg: "rgba(142,36,170,0.08)",  glow: "rgba(142,36,170,0.12)" },
  "Brecilien":     { color: "#d81b60", bg: "rgba(216,27,96,0.08)",   glow: "rgba(216,27,96,0.12)"  },
  "Black Market":  { color: "#546e7a", bg: "rgba(84,110,122,0.08)",  glow: "rgba(84,110,122,0.1)"  },
};

// ---------- QUALITIES ----------

const QUALITY_LABEL = { 1: "Normal", 2: "Good", 3: "Outstanding", 4: "Excellent", 5: "Masterpiece" };

// ---------- POPULAR ITEMS (pinned in empty search state) ----------

const POPULAR_IDS = [
  "T8_BAG", "T6_PLANKS", "T8_METALBAR", "T6_CLOTH",
  "T8_LEATHER", "T5_MOUNT_HORSE", "T8_MOUNT_OX",
  "T4_POTION_HEAL", "T6_MAIN_FIRESTAFF", "T8_2H_BOW",
  "T8_MEAL_PIE", "T6_MAIN_SWORD",
];

// ---------- STATE ----------

const state = {
  server:            "europe",
  selectedCities:    new Set(CITIES),
  selectedTiers:     new Set(["T4"]),
  selectedEnchants:  new Set(["0"]),
  selectedQualities: new Set([1, 2, 3]),
  currentItemId:     null,
  currentItemName:   null,
  rows:              [],
  sort:              { col: "city", dir: 1 },
  citySortMode:      "sell_asc",
  dropdownItems:     [],
  dropdownActiveIdx: -1,
  dropdownOpen:      false,
  refreshIntervalMs: 30000,
  refreshTimer:      null,
  countdownTimer:    null,
  nextRefreshAt:     null,
};

// ---------- FUSE.JS SETUP ----------

let fuse = null;

function initFuse() {
  fuse = new Fuse(window.ALBION_ITEMS, {
    keys: [
      { name: "name", weight: 0.75 },
      { name: "id",   weight: 0.25 },
    ],
    threshold:          0.35,   // tighter — reduces noise from irrelevant results
    includeMatches:     true,
    includeScore:       true,
    ignoreLocation:     true,
    minMatchCharLength: 2,
    distance:           120,
  });
}

// ---------- SEARCH HELPERS ----------

/**
 * Parse a raw search query into a clean search term + optional tier/enchant hint.
 * Examples:  "T8 sword"  → { q:"sword",  tier:"T8", enchant:null }
 *            "sword t5"  → { q:"sword",  tier:"T5", enchant:null }
 *            "cape +2"   → { q:"cape",   tier:null, enchant:"2"  }
 *            "t6.3 bag"  → { q:"bag",    tier:"T6", enchant:"3"  }
 */
function parseSearchQuery(raw) {
  let q = raw.trim();
  let tier = null, enchant = null;

  // Tier: T2–T8, t2–t8, or standalone digit 2–8
  const tierRx = /\bT?([2-8])\b/i;
  const tm = tierRx.exec(q);
  if (tm) { tier = "T" + tm[1]; q = q.replace(tm[0], "").trim(); }

  // Enchant: +0 to +4, .0 to .4, @0 to @4
  const enchRx = /[+@.]([0-4])\b/;
  const em = enchRx.exec(q);
  if (em) { enchant = em[1]; q = q.replace(em[0], "").trim(); }

  return { q: q || raw.trim(), tier, enchant };
}

/**
 * Run Fuse search with smart ranking:
 *   1. Exact name match
 *   2. Name starts-with query
 *   3. Fuse relevance score (lower = better)
 * Applies optional tier and enchant pre-filter.
 * Returns deduplicated, ranked item results.
 */
function smartSearch(rawQuery) {
  const { q, tier, enchant } = parseSearchQuery(rawQuery);
  const ql = q.toLowerCase();

  // Run fuse on the clean query
  let results = fuse ? fuse.search(q, { limit: 80 }) : [];

  // Tier filter
  if (tier) {
    results = results.filter(r => {
      const base = r.item.id.split("@")[0];
      return base.startsWith(tier + "_");
    });
  }

  // Enchant filter
  if (enchant) {
    results = results.filter(r => {
      const enc = r.item.id.includes("@") ? r.item.id.split("@")[1] : "0";
      return enc === enchant;
    });
  }

  // Deduplicate by item ID
  const seen = new Set();
  results = results.filter(r => {
    if (seen.has(r.item.id)) return false;
    seen.add(r.item.id);
    return true;
  });

  // Re-rank: exact → prefix → fuse score
  results.sort((a, b) => {
    const an = a.item.name.toLowerCase();
    const bn = b.item.name.toLowerCase();
    if (an === ql && bn !== ql) return -1;
    if (bn === ql && an !== ql) return  1;
    const as = an.startsWith(ql), bs = bn.startsWith(ql);
    if (as && !bs) return -1;
    if (bs && !as) return  1;
    return (a.score || 0) - (b.score || 0);
  });

  return results;
}

/** True if item ID has a crafting recipe registered by crafting.js */
function isCraftable(itemId) {
  const base = itemId.split("@")[0];
  return !!(window.CRAFTING_RECIPES?.[base]);
}

/** Tier text from item ID, e.g. "T4" */
function tierOf2(id) {
  const m = /^T(\d)/.exec(id);
  return m ? "T" + m[1] : null;
}

/** Enchant level from item ID, e.g. "@2" → "+2"; base items → "+0" */
function enchantLabel(id) {
  return id.includes("@") ? "+" + id.split("@")[1] : "+0";
}

/** Enchant level number (0–4) from item ID */
function enchantNum(id) {
  return id.includes("@") ? parseInt(id.split("@")[1]) || 0 : 0;
}

// ---------- TIER-AWARE DISPLAY HELPERS ----------

/**
 * Albion's per-tier item name prefixes.
 * Used to derive display names when the extended database hasn't loaded yet.
 */
const TIER_PREFIX = {
  T2: "Novice's",  T3: "Journeyman's", T4: "Adept's",
  T5: "Expert's",  T6: "Master's",     T7: "Grandmaster's", T8: "Elder's",
};

/**
 * Returns the display item ID that should be shown in the hero panel.
 * Picks the lowest selected tier + lowest selected enchant, applied to the
 * current item's suffix (e.g. "_BAG"). Non-tiered items (no T\d prefix) are
 * returned as-is.
 */
function getHeroItemId() {
  if (!state.currentItemId) return null;
  const base = state.currentItemId.split("@")[0];
  const m    = /^T(\d)(_.+)$/.exec(base);
  if (!m) return state.currentItemId; // non-tiered — return unchanged

  const suffix = m[2]; // e.g. "_BAG"

  // Pick lowest selected tier (sort lexicographically: T4 < T5 … T8)
  const tiers        = [...state.selectedTiers].sort();
  const primaryTier  = tiers.length ? tiers[0] : ("T" + m[1]);

  // Pick lowest selected enchant
  const enchants       = [...state.selectedEnchants].sort();
  const primaryEnchant = enchants.length ? enchants[0] : "0";

  const primaryBase = primaryTier + suffix;
  return primaryEnchant === "0" ? primaryBase : `${primaryBase}@${primaryEnchant}`;
}

/**
 * Returns the English display name for any item ID.
 * Searches the loaded item database first; falls back to tier-prefix derivation
 * so names are always correct even before the extended DB finishes loading.
 */
function getItemName(id) {
  const base = id.split("@")[0];

  // 1. Exact hit in loaded item database
  if (window.ALBION_ITEMS) {
    const hit = window.ALBION_ITEMS.find(i => i.id === base || i.id === id);
    if (hit) return hit.name;
  }

  // 2. Derive from the known item name by swapping the tier prefix
  const mNew = /^(T\d)(_.+)$/.exec(base);
  const mOld = state.currentItemId ? /^(T\d)(_.+)$/.exec(state.currentItemId.split("@")[0]) : null;
  if (mNew && mOld && state.currentItemName) {
    const oldPrefix = TIER_PREFIX[mOld[1]];
    const newPrefix = TIER_PREFIX[mNew[1]];
    if (oldPrefix && newPrefix && state.currentItemName.startsWith(oldPrefix)) {
      return newPrefix + state.currentItemName.slice(oldPrefix.length);
    }
  }

  // 3. Last resort: return the raw ID
  return base;
}

/**
 * Syncs the hero panel (image, name, ID text, enchant glow) to the current
 * tier + enchant filter selection. Called from render() so it fires on every
 * filter change, not just when the user picks a new item.
 */
function updateHeroForCurrentTier() {
  if (!state.currentItemId) return;
  const displayId = getHeroItemId();
  if (!displayId) return;

  const heroImg  = document.getElementById("heroImg");
  const heroName = document.getElementById("heroName");
  const heroIdEl = document.getElementById("heroId");

  if (heroImg) {
    const newSrc = iconUrl(displayId, 1);
    if (heroImg.getAttribute("src") !== newSrc) heroImg.src = newSrc;
    const eStyle = enchantImgStyle(displayId);
    heroImg.style.cssText = eStyle || "border:1px solid #1e2a3a;border-radius:12px;";
  }
  if (heroName) heroName.textContent = getItemName(displayId);
  if (heroIdEl)  heroIdEl.textContent  = displayId;
}

/**
 * Returns an inline CSS style string for an item image based on its enchantment.
 * Matches Albion Online's in-game enchantment border/glow colours:
 *   0 = none  1 = green  2 = blue/cyan  3 = purple  4 = gold
 */
function enchantImgStyle(id) {
  const enc = enchantNum(id);
  const STYLES = [
    "",   // +0: default border handled by existing CSS class
    "border:2px solid rgba(74,222,128,0.6);box-shadow:0 0 10px rgba(74,222,128,0.35),0 0 22px rgba(74,222,128,0.15);border-radius:12px;",
    "border:2px solid rgba(34,211,238,0.6);box-shadow:0 0 10px rgba(34,211,238,0.35),0 0 22px rgba(34,211,238,0.15);border-radius:12px;",
    "border:2px solid rgba(167,139,250,0.7);box-shadow:0 0 12px rgba(167,139,250,0.4),0 0 26px rgba(167,139,250,0.18);border-radius:12px;",
    "border:2px solid rgba(229,178,93,0.8);box-shadow:0 0 14px rgba(229,178,93,0.5),0 0 30px rgba(229,178,93,0.22);border-radius:12px;",
  ];
  return STYLES[enc] || "";
}

/**
 * CSS class for a colour-coded enchant pill in the search dropdown.
 * Returns one of: dd-enc-0 dd-enc-1 dd-enc-2 dd-enc-3 dd-enc-4
 */
function enchantPillClass(id) {
  return "dd-enc-" + enchantNum(id);
}

// ---------- ITEM HELPERS ----------

function categorize(id) {
  if (/_BAG/.test(id))                            return "Bags";
  if (/CAPE/.test(id))                            return "Capes";
  if (/_(WOOD|ORE|FIBER|HIDE|ROCK)/.test(id))     return "Raw Resources";
  if (/_(PLANKS|METALBAR|CLOTH|LEATHER|STONEBLOCK)/.test(id)) return "Refined Resources";
  if (/_(HEAD_|ARMOR_|SHOES_)/.test(id))          return "Armor";
  if (/_(MAIN_|2H_|OFF_)/.test(id))               return "Weapons";
  if (/_MOUNT_/.test(id))                         return "Mounts";
  if (/_MEAL_/.test(id))                          return "Food";
  if (/_POTION_/.test(id))                        return "Potions";
  if (/_FARM_|_CARROT|_BEAN|_WHEAT|_TURNIP|_CABBAGE/.test(id)) return "Farming";
  return "Misc";
}

function tierOf(id) {
  const m = /^T(\d)/.exec(id);
  return m ? parseInt(m[1]) : 0;
}

function iconUrl(id, quality = 1) {
  const base    = id.split("@")[0];
  const enchant = id.includes("@") ? id.split("@")[1] : "0";
  return `https://render.albiononline.com/v1/item/${base}.png?quality=${quality}&enchantment=${enchant}&size=64`;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ---------- ITEM INSIGHTS (static, shown in dropdown) ----------

function getItemInsights(item) {
  const badges = [];
  const t = tierOf(item.id);
  const cat = categorize(item.id);

  if (POPULAR_IDS.includes(item.id))   badges.push({ label: "Popular",    cls: "badge-blue"   });
  if (t === 8)                          badges.push({ label: "Elder Tier",  cls: "badge-gold"   });
  else if (t === 7)                     badges.push({ label: "T7",          cls: "badge-purple" });
  if (cat === "Weapons")                badges.push({ label: "Weapon",      cls: "badge-red"    });
  if (cat === "Armor")                  badges.push({ label: "Armor",       cls: "badge-slate"  });
  if (cat.includes("Resources"))        badges.push({ label: "Crafting",    cls: "badge-green"  });
  if (cat === "Mounts")                 badges.push({ label: "Mount",       cls: "badge-orange" });
  if (cat === "Food" || cat === "Potions") badges.push({ label: "Consumable", cls: "badge-slate" });
  // limit to 2 in dropdown to keep it tidy
  return badges.slice(0, 2);
}

// ---------- MARKET INSIGHTS (dynamic, shown in hero) ----------

function computeMarketInsights(rows) {
  const tags = [];
  const validSell = rows.filter(r => r.sell_price_min > 0);
  const validBuy  = rows.filter(r => r.buy_price_max  > 0);

  // Active market?
  const freshCount = validSell.filter(r => ageMins(r.sell_price_min_date) < 15).length;
  if (freshCount >= 3) tags.push({ label: "Active Market", cls: "badge-green" });

  // Arbitrage?
  if (validSell.length >= 2) {
    const prices = validSell.map(r => r.sell_price_min);
    const spread = (Math.max(...prices) - Math.min(...prices)) / Math.min(...prices);
    if (spread > 0.2) tags.push({ label: "Arbitrage Opp", cls: "badge-gold" });
  }

  // High demand (tight spread)?
  if (validSell.length && validBuy.length) {
    const avgSell = validSell.reduce((a,b) => a + b.sell_price_min, 0) / validSell.length;
    const avgBuy  = validBuy .reduce((a,b) => a + b.buy_price_max,  0) / validBuy.length;
    if (avgBuy / avgSell > 0.85) tags.push({ label: "High Demand", cls: "badge-blue" });
  }

  // Low liquidity?
  const staleCount = validSell.filter(r => ageMins(r.sell_price_min_date) > 60).length;
  if (staleCount >= validSell.length && validSell.length > 0)
    tags.push({ label: "Low Liquidity", cls: "badge-red" });

  return tags;
}

// ---------- AGE HELPERS ----------

function ageMins(iso) {
  if (!iso || iso.startsWith("0001-01-01")) return Infinity;
  const t = new Date(iso + (iso.endsWith("Z") ? "" : "Z")).getTime();
  return isNaN(t) ? Infinity : (Date.now() - t) / 60000;
}

function ageString(iso) {
  const m = ageMins(iso);
  if (m === Infinity) return { text: "—", cls: "" };
  const cls = m < 15 ? "age-fresh" : m < 60 ? "age-ok" : "age-stale";
  let text;
  if (m < 1)    text = "<1m";
  else if (m < 60)   text = `${Math.floor(m)}m`;
  else if (m < 1440) text = `${Math.floor(m/60)}h`;
  else               text = `${Math.floor(m/1440)}d`;
  return { text, cls };
}

function fmt(n) {
  if (!n || isNaN(n) || n === 0) return "—";
  return n.toLocaleString("en-US");
}

// ---------- RECENT SEARCHES ----------

const RECENT_KEY = "albion_recent_v1";

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
  catch { return []; }
}

function saveRecent(id, name) {
  const list = getRecent().filter(r => r.id !== id);
  list.unshift({ id, name });
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6))); }
  catch {}
}

function removeRecent(id) {
  const list = getRecent().filter(r => r.id !== id);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); }
  catch {}
}

// ---------- SEARCH DROPDOWN ----------

let searchDebounce = null;

function onSearchInput(query, dropdownEl) {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => renderDropdown(query.trim(), dropdownEl), 80);

  // Show/hide clear button
  const clearBtn = document.getElementById("searchClearBtn");
  if (clearBtn) clearBtn.classList.toggle("hidden", !query);
  const searchKbd = document.getElementById("searchKbd");
  if (searchKbd) searchKbd.classList.toggle("hidden", !!query);
}

function renderDropdown(query, dropdownEl) {
  dropdownEl.innerHTML = "";
  state.dropdownItems = [];
  state.dropdownActiveIdx = -1;

  let sections = [];

  if (!query) {
    const recent = getRecent();
    if (recent.length) {
      sections.push({ label: "Recent Searches", items: recent.map(r => ({ ...r, isRecent: true })) });
    }
    const popular = POPULAR_IDS
      .map(pid => ALBION_ITEMS.find(i => i.id === pid))
      .filter(Boolean);
    sections.push({ label: "Popular Items", items: popular });
  } else {
    const results = smartSearch(query);
    if (!results.length) {
      dropdownEl.innerHTML = `<div class="dd-empty">No results for "<strong>${escHtml(query)}</strong>".<br/>Try a raw ID like <code>T6_BAG</code> or <code>T8_2H_BOW</code>.</div>`;
      openDropdown(dropdownEl);
      return;
    }
    const grouped = {};
    for (const r of results) {
      const cat = categorize(r.item.id);
      if (!grouped[cat]) grouped[cat] = [];
      if (grouped[cat].length < 8) grouped[cat].push(r);
    }
    for (const [cat, catResults] of Object.entries(grouped)) {
      sections.push({
        label: cat,
        items: catResults.map(r => ({ ...r.item, matches: r.matches })),
      });
    }
  }

  // Flatten all items for keyboard nav
  const allItems = sections.flatMap(s => s.items);
  state.dropdownItems = allItems;

  for (const section of sections) {
    if (!section.items.length) continue;
    const secEl = document.createElement("div");
    secEl.className = "dd-section";
    secEl.innerHTML = `<div class="dd-label">${escHtml(section.label)}</div>`;

    for (const item of section.items) {
      const globalIdx = state.dropdownItems.indexOf(item);
      const nameHtml  = highlight(item.name, item.matches, "name");
      const idHtml    = highlight(item.id,   item.matches, "id");
      const insights  = getItemInsights(item);

      const tier       = tierOf2(item.id);
      const enc        = enchantLabel(item.id);
      const encStyle   = enchantImgStyle(item.id);
      const encPillCls = enc !== "+0" ? enchantPillClass(item.id) : "";
      const craft      = query && isCraftable(item.id);
      const tierPill   = tier ? `<span class="dd-tier-pill">${tier}</span>` : "";
      const enchPill   = enc !== "+0" ? `<span class="dd-enchant-pill ${encPillCls}">${enc}</span>` : "";
      const craftBadge = craft ? `<span class="dd-craft-badge">⚒</span>` : "";

      const el = document.createElement("div");
      el.className = "dd-item";
      el.dataset.idx = globalIdx;
      el.innerHTML = `
        <img class="dd-icon" src="${iconUrl(item.id)}" alt="" loading="lazy" onerror="onIconError(this)"${encStyle ? ` style="${encStyle}"` : ""} />
        <div class="dd-info">
          <div class="dd-name">${nameHtml}${craftBadge}</div>
          <div class="dd-meta">${tierPill}${enchPill}<span>${idHtml}</span></div>
        </div>
        <div class="dd-badges">
          ${insights.map(i => `<span class="badge ${i.cls}">${i.label}</span>`).join("")}
        </div>
        ${item.isRecent
          ? `<button class="dd-remove" data-remove="${escHtml(item.id)}" title="Remove">✕</button>`
          : `<span class="dd-arrow">›</span>`
        }
      `;

      el.addEventListener("mouseenter", () => setActiveDDItem(globalIdx, dropdownEl));

      el.addEventListener("click", (e) => {
        const removeBtn = e.target.closest("[data-remove]");
        if (removeBtn) {
          e.stopPropagation();
          removeRecent(removeBtn.dataset.remove);
          renderDropdown(query, dropdownEl);
          return;
        }
        selectItem(item.id, item.name);
        closeDropdown(dropdownEl);
        const inp = dropdownEl.closest("#searchWrap")
          ? document.getElementById("searchInput")
          : document.getElementById("mobileSearchInput");
        if (inp) { inp.value = item.name; onSearchInput(item.name, dropdownEl); }
      });

      secEl.appendChild(el);
    }
    dropdownEl.appendChild(secEl);
  }

  openDropdown(dropdownEl);
}

function highlight(text, matches, key) {
  if (!matches) return escHtml(text);
  const match = matches.find(m => m.key === key);
  if (!match || !match.indices.length) return escHtml(text);
  let result = "";
  let last = 0;
  const sorted = [...match.indices].sort((a,b) => a[0]-b[0]);
  for (const [s, e] of sorted) {
    result += escHtml(text.slice(last, s));
    result += `<mark>${escHtml(text.slice(s, e + 1))}</mark>`;
    last = e + 1;
  }
  result += escHtml(text.slice(last));
  return result;
}

function setActiveDDItem(idx, dropdownEl) {
  dropdownEl.querySelectorAll(".dd-item").forEach((el, i) => {
    el.classList.toggle("active", parseInt(el.dataset.idx) === idx);
  });
  state.dropdownActiveIdx = idx;
}

function openDropdown(dropdownEl) {
  if (!dropdownEl) return;
  dropdownEl.classList.remove("hidden");
  state.dropdownOpen = true;
  document.getElementById("searchBackdrop")?.classList.remove("hidden");
}

function closeDropdown(dropdownEl) {
  if (dropdownEl) dropdownEl.classList.add("hidden");
  state.dropdownOpen = false;
  document.getElementById("searchBackdrop")?.classList.add("hidden");
}

function handleSearchKeydown(e, dropdownEl) {
  if (!state.dropdownOpen) {
    if (e.key === "ArrowDown") { renderDropdown("", dropdownEl); }
    return;
  }

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      setActiveDDItem(Math.min(state.dropdownActiveIdx + 1, state.dropdownItems.length - 1), dropdownEl);
      scrollActiveDDItem(dropdownEl);
      break;
    case "ArrowUp":
      e.preventDefault();
      setActiveDDItem(Math.max(state.dropdownActiveIdx - 1, 0), dropdownEl);
      scrollActiveDDItem(dropdownEl);
      break;
    case "Enter":
      e.preventDefault();
      if (state.dropdownActiveIdx >= 0) {
        const item = state.dropdownItems[state.dropdownActiveIdx];
        if (item) { selectItem(item.id, item.name); closeDropdown(dropdownEl); }
      } else {
        const v = e.target.value.trim();
        tryDirectSearch(v);
        closeDropdown(dropdownEl);
      }
      break;
    case "Escape":
      closeDropdown(dropdownEl);
      e.target.blur();
      break;
  }
}

function scrollActiveDDItem(dropdownEl) {
  const active = dropdownEl.querySelector(".dd-item.active");
  if (active) active.scrollIntoView({ block: "nearest" });
}

function tryDirectSearch(v) {
  if (!v) return;
  const match = ALBION_ITEMS.find(
    i => i.name.toLowerCase() === v.toLowerCase() || i.id.toLowerCase() === v.toLowerCase()
  );
  if (match) selectItem(match.id, match.name);
  else if (/^T\d_/i.test(v)) selectItem(v.toUpperCase(), v.toUpperCase());
}

// ---------- FILTER BAR ----------

const TIERS    = ["T2","T3","T4","T5","T6","T7","T8"];
const ENCHANTS = ["0","1","2","3","4"];
const QUALITIES = [
  { id: 1, label: "Normal" },
  { id: 2, label: "Good" },
  { id: 3, label: "Outstanding" },
  { id: 4, label: "Excellent" },
  { id: 5, label: "Masterpiece" },
];

function buildFilterBar() {
  const bar = document.getElementById("filterBar");
  bar.innerHTML = "";

  const addSection = (label, content) => {
    const sec = document.createElement("div");
    sec.className = "filter-section";
    sec.innerHTML = `<span class="filter-label">${label}</span>`;
    sec.appendChild(content);
    bar.appendChild(sec);
    const div = document.createElement("div");
    div.className = "filter-divider";
    bar.appendChild(div);
  };

  // Cities
  const citiesEl = buildChips(
    CITIES, state.selectedCities,
    (c) => {
      const meta = CITY_META[c];
      return {
        label: c,
        extraAttrs: `data-city="${c}" style="--city-color:${meta?.color};--city-bg:${meta?.bg}"`,
      };
    },
    () => render()
  );
  addSection("Cities", citiesEl);

  // Tiers
  const tiersEl = buildChips(TIERS, state.selectedTiers, (t) => ({ label: t }), () => fetchPrices());
  addSection("Tier", tiersEl);

  // Enchant
  const enchEl = buildChips(ENCHANTS, state.selectedEnchants, (e) => ({ label: "+" + e }), () => fetchPrices());
  addSection("Enchant", enchEl);

  // Quality
  const qualEl = buildChips(
    QUALITIES.map(q => q.id), state.selectedQualities,
    (id) => ({ label: QUALITY_LABEL[id] }),
    () => fetchPrices()
  );
  addSection("Quality", qualEl);

  // Refresh interval
  const refreshSec = document.createElement("div");
  refreshSec.className = "filter-section shrink-0";
  refreshSec.innerHTML = `
    <span class="filter-label">Refresh</span>
    <select id="refreshInterval" class="bg-transparent border border-[#1e2a3a] text-slate-400 text-xs rounded-lg px-2 py-1 outline-none cursor-pointer">
      <option value="0">Off</option>
      <option value="15000">15s</option>
      <option value="30000" selected>30s</option>
      <option value="60000">60s</option>
      <option value="300000">5m</option>
    </select>
  `;
  bar.appendChild(refreshSec);

  document.getElementById("refreshInterval").addEventListener("change", (e) => {
    state.refreshIntervalMs = parseInt(e.target.value, 10);
    scheduleRefresh();
  });
}

function buildChips(values, selectedSet, getOpts, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "flex gap-1.5 items-center";
  for (const v of values) {
    const opts  = getOpts(v);
    const chip  = document.createElement("div");
    chip.className = "chip" + (selectedSet.has(v) ? " on" : "");
    chip.setAttribute("role", "button");
    if (opts.extraAttrs) chip.setAttribute("style", chip.getAttribute("style") || "");
    // parse extra attrs manually
    if (opts.extraAttrs) {
      const dummy = document.createElement("div");
      dummy.innerHTML = `<div ${opts.extraAttrs}></div>`;
      const d = dummy.firstChild;
      for (const attr of d.attributes) chip.setAttribute(attr.name, attr.value);
    }
    chip.textContent = opts.label;
    chip.addEventListener("click", () => {
      if (selectedSet.has(v)) selectedSet.delete(v);
      else selectedSet.add(v);
      chip.classList.toggle("on");
      onChange();
    });
    wrap.appendChild(chip);
  }
  return wrap;
}

// ---------- ITEM SELECTION ----------

// ---------- API / DATA ----------

function buildItemIds(baseId) {
  const clean = baseId.split("@")[0];
  const m = /^T(\d)(_.+)$/.exec(clean);
  let bases;
  if (m) {
    const suffix  = m[2];
    const allowed = [...state.selectedTiers].sort();
    bases = allowed.length ? allowed.map(t => t + suffix) : [clean];
  } else {
    bases = [clean];
  }
  const enchants = [...state.selectedEnchants];
  const ids = [];
  for (const b of bases)
    for (const e of enchants)
      ids.push(e === "0" ? b : `${b}@${e}`);
  return ids;
}

// Sequence counter — each new top-level fetch increments this.
// Any in-flight fetch that sees its seq no longer matches _fetchSeq knows a
// newer request has started and silently discards its results instead of
// overwriting the screen with stale data.
let _fetchSeq     = 0;
let _fetchInFlight = false; // used only by manualRefresh to guard the spin button

async function fetchPrices(retryCount = 0) {
  // Guard: event listeners pass MouseEvent — coerce to number
  if (typeof retryCount !== "number") retryCount = 0;
  if (!state.currentItemId) return;

  // Each fresh (non-retry) call gets a new sequence number so stale responses
  // from earlier filter selections are discarded automatically.
  const mySeq = retryCount === 0 ? ++_fetchSeq : _fetchSeq;
  _fetchInFlight = true;

  // ── Immediately clear stale data so old tier/enchant results never linger ──
  if (retryCount === 0) {
    state.rows = [];
    clearStaleUI(); // wipe city cards, table, and best-deals before new data arrives
  }

  setStatus("loading");

  const ids       = buildItemIds(state.currentItemId);
  const qualities = [...state.selectedQualities].join(",");
  const url =
    `${API_BASES[state.server]}/stats/prices/${ids.join(",")}.json` +
    `?locations=${encodeURIComponent(CITIES.join(","))}` +
    (qualities ? `&qualities=${qualities}` : "");

  try {
    const data = await apiFetch(url);
    // Discard result if a newer fetch has superseded this one
    if (mySeq !== _fetchSeq) return;
    state.rows = data || [];
    _fetchInFlight = false;
    setStatus("live");
    render();
    scheduleRefresh();
  } catch (err) {
    if (mySeq !== _fetchSeq) return; // suppress error from stale fetch
    console.error("[Albion Market] fetchPrices error:", err);
    _fetchInFlight = false;
    if (retryCount < 1) {
      setTimeout(() => fetchPrices(retryCount + 1), 4000);
      return;
    }
    setStatus("error");
    document.getElementById("priceBody").innerHTML =
      '<tr class="empty-row"><td colspan="7">Price data temporarily unavailable. Click ↻ to retry.</td></tr>';
  }
}

/**
 * Wipes the city cards, price table, and best-deals panel immediately when a
 * new filter or item selection starts a fresh fetch. Prevents stale prices for
 * the previous tier/enchant from remaining visible during the loading window.
 */
function clearStaleUI() {
  // City cards → loading skeletons
  const cardHost = document.getElementById("cityCards");
  if (cardHost) {
    const count = Math.min([...state.selectedCities].length, 8) || 4;
    cardHost.innerHTML = Array(count).fill(0).map(() => `
      <div class="city-card" style="--city-color:#1e2a3a;--city-glow:transparent;">
        <div class="city-name" style="background:#1e2a3a;height:10px;width:60%;border-radius:4px;animation:pulse2 1.4s ease infinite;"></div>
        <div class="price-main" style="background:#1e2a3a;height:22px;width:45%;border-radius:4px;margin-top:14px;animation:pulse2 1.4s ease infinite;"></div>
        <div class="price-sub" style="border-top:1px solid #141c28;margin-top:12px;">
          <span style="background:#1e2a3a;height:8px;width:38%;border-radius:3px;display:inline-block;animation:pulse2 1.4s ease infinite;"></span>
          <span style="background:#1e2a3a;height:8px;width:28%;border-radius:3px;display:inline-block;animation:pulse2 1.4s ease infinite;"></span>
        </div>
      </div>`).join("");
  }

  // Price table → single loading row
  const tbody = document.getElementById("priceBody");
  if (tbody) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7" class="loading-cell">Fetching prices…</td></tr>';
  }

  // Best-deals panel → subtle placeholder
  ["bestSell", "bestBuy", "bestFlip"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<span class="loading-pulse">—</span>';
  });
}

// ---------- TRADING ROUTES ----------

const DANGER_CITIES = ["Caerleon", "Bridgewatch", "Lymhurst", "Fort Sterling", "Martlock", "Thetford", "Brecilien", "Black Market"];
const SAFE_CITIES   = ["Bridgewatch", "Lymhurst", "Fort Sterling", "Martlock", "Thetford", "Brecilien"];

function renderTradingRoutes(allRows) {
  const section = document.getElementById("bmRoutesSection");
  const host    = document.getElementById("bmRoutesContent");
  if (!section || !host) return;

  // Build per-city price summaries for a given city list
  function buildCityData(cities) {
    return cities.map(city => {
      const rows     = allRows.filter(r => r.city === city);
      const sellRows = rows.filter(r => r.sell_price_min > 0);
      const buyRows  = rows.filter(r => r.buy_price_max  > 0);
      const bestSell = sellRows.reduce((a, b) => !a || b.sell_price_min < a.sell_price_min ? b : a, null);
      const bestBuy  = buyRows.reduce((a, b)  => !a || b.buy_price_max  > a.buy_price_max  ? b : a, null);
      return { city, bestSell, bestBuy, meta: CITY_META[city] || {} };
    }).filter(d => d.bestSell || d.bestBuy);
  }

  // Find the single best flip route: cheapest buy city → highest buy-order sell city
  function findBestRoute(cityData) {
    let buySource = null, sellDest = null;
    for (const d of cityData) {
      if (d.bestSell && (!buySource || d.bestSell.sell_price_min < buySource.bestSell.sell_price_min))
        buySource = d;
      if (d.bestBuy && (!sellDest || d.bestBuy.buy_price_max > sellDest.bestBuy.buy_price_max))
        sellDest = d;
    }
    if (!buySource || !sellDest || buySource.city === sellDest.city) return null;
    const buyPrice  = buySource.bestSell.sell_price_min;
    const sellPrice = sellDest.bestBuy.buy_price_max;
    if (sellPrice <= buyPrice) return null;
    const profit = sellPrice - buyPrice;
    const roi    = +(profit / buyPrice * 100).toFixed(1);
    return { buyCity: buySource.city, sellCity: sellDest.city,
             buyPrice, sellPrice, profit, roi,
             buyMeta: buySource.meta, sellMeta: sellDest.meta };
  }

  // Render the featured route card
  function routeCard(route, label, icon, accentColor, accentBg) {
    if (!route) return `<div class="bg-surface border border-border rounded-2xl p-6 flex items-center justify-center text-slate-600 text-sm italic">No profitable route found</div>`;
    const roiCls = route.roi > 40 ? "text-green-400" : route.roi > 20 ? "text-yellow-400" : "text-slate-400";
    return `
      <div class="rounded-2xl p-5 border-2" style="background:${accentBg};border-color:${accentColor}55">
        <div class="text-xs font-black uppercase tracking-widest mb-1" style="color:${accentColor}">${icon} ${label}</div>
        <div class="text-base font-bold text-slate-100 mb-0.5">
          <span style="color:${route.buyMeta.color||'#e2e8f0'}">${route.buyCity}</span>
          <span class="text-slate-500 mx-2">→</span>
          <span style="color:${route.sellMeta.color||'#e2e8f0'}">${route.sellCity}</span>
        </div>
        <div class="text-3xl font-black text-green-400 mt-3 leading-tight">
          +${fmt(route.profit)}<span class="text-base font-normal text-slate-500 ml-1">s profit</span>
        </div>
        <div class="text-sm font-semibold mt-1 ${roiCls}">${route.roi}% ROI</div>
        <div class="flex items-stretch gap-2 mt-4">
          <div class="flex-1 bg-[rgba(0,0,0,0.25)] rounded-xl p-3 text-center">
            <div class="text-xs text-slate-500 mb-1">Buy in</div>
            <div class="text-xs font-bold mb-1" style="color:${route.buyMeta.color||'#e2e8f0'}">${route.buyCity}</div>
            <div class="text-lg font-black text-slate-100">${fmt(route.buyPrice)}<span class="text-xs text-slate-500 ml-0.5">s</span></div>
          </div>
          <div class="flex items-center justify-center px-1 text-slate-600 text-xl font-bold">→</div>
          <div class="flex-1 bg-[rgba(0,0,0,0.25)] rounded-xl p-3 text-center">
            <div class="text-xs text-slate-500 mb-1">Sell in</div>
            <div class="text-xs font-bold mb-1" style="color:${route.sellMeta.color||'#e2e8f0'}">${route.sellCity}</div>
            <div class="text-lg font-black text-albion">${fmt(route.sellPrice)}<span class="text-xs text-slate-500 ml-0.5">s</span></div>
          </div>
        </div>
      </div>`;
  }

  // Render a city comparison table for a category
  function cityTable(cityData, bestBuyCity, bestSellCity) {
    const rows = cityData.map(d => {
      const sellP  = d.bestSell?.sell_price_min || 0;
      const buyP   = d.bestBuy?.buy_price_max   || 0;
      const spread = (buyP > 0 && sellP > 0) ? buyP - sellP : null;
      const isBestBuy  = d.city === bestBuyCity;
      const isBestSell = d.city === bestSellCity;
      const badge = isBestBuy
        ? `<span class="badge badge-green ml-1">Buy Here</span>`
        : isBestSell
          ? `<span class="badge badge-red ml-1">Sell Here</span>`
          : "";
      const roiCls = spread !== null ? (spread > 0 ? "text-green-400 font-semibold" : "text-red-400") : "text-slate-600";
      return `<tr class="border-b border-[#141c28] hover:bg-[rgba(255,255,255,0.015)]">
        <td class="px-4 py-3">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${d.meta.color||'#546e7a'}"></span>
            <span class="font-semibold text-sm" style="color:${d.meta.color||'#e2e8f0'}">${d.city}</span>
            ${badge}
          </div>
        </td>
        <td class="text-right px-4 py-3 font-mono text-sm ${isBestBuy  ? 'text-green-400 font-bold' : 'text-slate-300'}">${sellP > 0 ? fmt(sellP) : '—'}</td>
        <td class="text-right px-4 py-3 font-mono text-sm ${isBestSell ? 'text-albion  font-bold' : 'text-slate-300'}">${buyP > 0  ? fmt(buyP)  : '—'}</td>
        <td class="text-right px-4 py-3 text-sm ${roiCls}">${spread !== null ? (spread > 0 ? '+' : '') + fmt(spread) : '—'}</td>
      </tr>`;
    }).join("");

    return `
      <div class="overflow-x-auto">
        <table class="w-full text-sm" style="min-width:480px">
          <thead>
            <tr class="border-b border-border bg-elevated">
              <th class="text-left px-4 py-2.5 text-xs text-slate-500 uppercase tracking-wider">City</th>
              <th class="text-right px-4 py-2.5 text-xs text-slate-500 uppercase tracking-wider">Sell Price (buy here)</th>
              <th class="text-right px-4 py-2.5 text-xs text-slate-500 uppercase tracking-wider">Buy Order (sell here)</th>
              <th class="text-right px-4 py-2.5 text-xs text-slate-500 uppercase tracking-wider">Spread</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  const dangerData = buildCityData(DANGER_CITIES);
  const safeData   = buildCityData(SAFE_CITIES);

  if (!dangerData.length && !safeData.length) { section.classList.add("hidden"); return; }
  section.classList.remove("hidden");

  const dangerRoute = findBestRoute(dangerData);
  const safeRoute   = findBestRoute(safeData);

  host.innerHTML = `
    <!-- Section title -->
    <div class="flex items-center gap-3 mb-5">
      <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-widest">⚔ Trading Routes</h3>
      <span class="text-xs text-slate-600">Live price comparison by city group</span>
    </div>

    <!-- ── DANGER'S WAY ── -->
    <div class="mb-6 rounded-2xl border border-[#f87171]/20 bg-[rgba(248,113,113,0.04)] overflow-hidden">
      <div class="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-[#f87171]/15">
        <span class="text-base font-black uppercase tracking-widest text-[#f87171]">🔴 Danger's Way</span>
        <span class="text-xs text-slate-500">All cities · includes Black Market &amp; Caerleon</span>
      </div>
      <div class="p-5">
        <div class="mb-4">
          ${routeCard(dangerRoute, "Best Route", "🔴", "#f87171", "rgba(248,113,113,0.07)")}
        </div>
        <div class="bg-surface border border-border rounded-xl overflow-hidden">
          ${cityTable(dangerData, dangerRoute?.buyCity, dangerRoute?.sellCity)}
        </div>
      </div>
    </div>

    <!-- ── SAFE WAY ── -->
    <div class="mb-2 rounded-2xl border border-[#4ade80]/20 bg-[rgba(74,222,128,0.03)] overflow-hidden">
      <div class="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-[#4ade80]/15">
        <span class="text-base font-black uppercase tracking-widest text-[#4ade80]">🟢 Safe Way</span>
        <span class="text-xs text-slate-500">Royal cities only · Black Market &amp; Caerleon excluded</span>
      </div>
      <div class="p-5">
        <div class="mb-4">
          ${routeCard(safeRoute, "Best Route", "🟢", "#4ade80", "rgba(74,222,128,0.05)")}
        </div>
        <div class="bg-surface border border-border rounded-xl overflow-hidden">
          ${cityTable(safeData, safeRoute?.buyCity, safeRoute?.sellCity)}
        </div>
      </div>
    </div>

    <p class="text-xs text-slate-700 mt-3">⚠ Profit = Buy Order price − Sell Price. Always verify prices in-game before trading.</p>
  `;
}

// ---------- RENDER ----------

function render() {
  // Sync hero image/name/glow to the currently selected tier + enchant FIRST
  // so the hero is never stale after filter changes.
  updateHeroForCurrentTier();

  let rows = state.rows.filter(r =>
    state.selectedCities.has(r.city) && state.selectedQualities.has(r.quality)
  );
  for (const r of rows)
    r._spread = r.sell_price_min && r.buy_price_max ? r.sell_price_min - r.buy_price_max : null;

  renderTable(rows);
  renderCityCards(rows);
  updateBest(rows);
  renderHeroInsights(rows);
  renderTradingRoutes(state.rows); // uses full rows (needs all city data regardless of city filter)
}

function renderTable(rows) {
  const tbody = document.getElementById("priceBody");
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No data — adjust filters or refresh.</td></tr>';
    return;
  }

  const { col, dir } = state.sort;
  rows = [...rows].sort((a, b) => {
    const vals = {
      city:     [a.city, b.city],
      quality:  [a.quality, b.quality],
      sell_min: [a.sell_price_min || 0, b.sell_price_min || 0],
      buy_max:  [a.buy_price_max  || 0, b.buy_price_max  || 0],
      sell_age: [a.sell_price_min_date || "", b.sell_price_min_date || ""],
      buy_age:  [a.buy_price_max_date  || "", b.buy_price_max_date  || ""],
      spread:   [a._spread || 0, b._spread || 0],
    };
    const [va, vb] = vals[col] || [0,0];
    return va < vb ? -dir : va > vb ? dir : 0;
  });

  for (const r of rows) {
    const meta    = CITY_META[r.city] || {};
    const sellAge = ageString(r.sell_price_min_date);
    const buyAge  = ageString(r.buy_price_max_date);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="city-cell" style="--city-color:${meta.color||"#4a5a6e"}">${escHtml(r.city)}</td>
      <td class="q${r.quality} text-sm">${QUALITY_LABEL[r.quality] || r.quality}</td>
      <td class="num text-sm font-medium text-slate-200">${fmt(r.sell_price_min)}</td>
      <td class="num text-xs ${sellAge.cls}">${sellAge.text}</td>
      <td class="num text-sm font-medium text-slate-200">${fmt(r.buy_price_max)}</td>
      <td class="num text-xs ${buyAge.cls}">${buyAge.text}</td>
      <td class="num text-xs text-slate-500">${fmt(r._spread)}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderCityCards(rows) {
  const host = document.getElementById("cityCards");
  host.innerHTML = "";

  const byCity = new Map();
  for (const r of rows) {
    if (!byCity.has(r.city)) byCity.set(r.city, []);
    byCity.get(r.city).push(r);
  }

  const cards = [];
  for (const city of CITIES) {
    if (!state.selectedCities.has(city)) continue;
    const list    = byCity.get(city) || [];
    const bestSell = list.filter(r => r.sell_price_min > 0)
      .reduce((a,b) => (!a || b.sell_price_min < a.sell_price_min ? b : a), null);
    const bestBuy  = list.filter(r => r.buy_price_max  > 0)
      .reduce((a,b) => (!a || b.buy_price_max > a.buy_price_max ? b : a), null);
    cards.push({ city, bestSell, bestBuy });
  }

  const mode = state.citySortMode;
  cards.sort((a, b) => {
    const nullLast = x => x == null ? Infinity : x;
    switch (mode) {
      case "sell_asc":  return nullLast(a.bestSell?.sell_price_min) - nullLast(b.bestSell?.sell_price_min);
      case "sell_desc": return (b.bestSell?.sell_price_min||0) - (a.bestSell?.sell_price_min||0);
      case "buy_desc":  return (b.bestBuy?.buy_price_max||0)   - (a.bestBuy?.buy_price_max||0);
      case "buy_asc":   return nullLast(a.bestBuy?.buy_price_max) - nullLast(b.bestBuy?.buy_price_max);
      default:          return a.city.localeCompare(b.city);
    }
  });

  const showBuy = mode === "buy_desc" || mode === "buy_asc";
  const bestSellCity = cards.reduce((b,c) => (c.bestSell && (!b || c.bestSell.sell_price_min < b.bestSell.sell_price_min)) ? c : b, null);
  const bestBuyCity  = cards.reduce((b,c) => (c.bestBuy  && (!b || c.bestBuy.buy_price_max  > b.bestBuy.buy_price_max))   ? c : b, null);

  cards.forEach((c, idx) => {
    const meta     = CITY_META[c.city] || {};
    const primary  = showBuy ? c.bestBuy : c.bestSell;
    const secondary= showBuy ? c.bestSell : c.bestBuy;
    const mainPrice= primary
      ? fmt(showBuy ? primary.buy_price_max : primary.sell_price_min)
      : null;
    const ageInfo  = primary
      ? ageString(showBuy ? primary.buy_price_max_date : primary.sell_price_min_date)
      : { text: "—", cls: "" };
    const subPrice = secondary
      ? fmt(showBuy ? secondary.sell_price_min : secondary.buy_price_max)
      : "—";
    const subLabel = showBuy ? "Sell" : "Buy";

    const highlight = (!showBuy && bestSellCity?.city === c.city) ? "highlight-sell"
      : (showBuy && bestBuyCity?.city === c.city) ? "highlight-buy" : "";

    const card = document.createElement("div");
    card.className = `city-card ${highlight}`;
    card.style.setProperty("--city-color", meta.color || "#546e7a");
    card.style.setProperty("--city-glow",  meta.glow  || "transparent");
    card.innerHTML = `
      <div class="city-rank">#${idx + 1}</div>
      <div class="city-name">${escHtml(c.city)}</div>
      <div class="price-main ${mainPrice ? "" : "empty"}">
        ${mainPrice || "No data"}${mainPrice ? `<span class="price-unit">s</span>` : ""}
      </div>
      <div class="price-sub">
        <span class="${ageInfo.cls}">${showBuy ? "Buy" : "Sell"} · ${ageInfo.text}</span>
        <span>${subLabel}: ${subPrice}</span>
      </div>
    `;
    host.appendChild(card);
  });
}

function updateBest(rows) {
  const validSell = rows.filter(r => r.sell_price_min > 0);
  const validBuy  = rows.filter(r => r.buy_price_max  > 0);

  // ---- Cheapest Sell ----
  if (validSell.length) {
    const min  = validSell.reduce((a,b) => a.sell_price_min < b.sell_price_min ? a : b);
    const meta = CITY_META[min.city] || {};
    const age  = ageString(min.sell_price_min_date);
    document.getElementById("bestSell").innerHTML = `
      <div class="text-2xl font-black text-slate-100">${fmt(min.sell_price_min)} <span class="text-sm font-normal text-slate-500">s</span></div>
      <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
        <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${meta.color||"#8a9aae"}"></span>
        <span class="text-sm font-semibold" style="color:${meta.color||"#e2e8f0"}">${min.city}</span>
        <span class="text-xs text-slate-600">${QUALITY_LABEL[min.quality]}</span>
      </div>
      <div class="flex gap-3 mt-1.5 text-xs text-slate-600">
        <span>Updated: <span class="${age.cls}">${age.text}</span></span>
      </div>
    `;
  } else {
    document.getElementById("bestSell").innerHTML = `<span class="text-slate-600">No sell data</span>`;
  }

  // ---- Highest Buy Order ----
  if (validBuy.length) {
    const max  = validBuy.reduce((a,b) => a.buy_price_max > b.buy_price_max ? a : b);
    const meta = CITY_META[max.city] || {};
    const age  = ageString(max.buy_price_max_date);
    document.getElementById("bestBuy").innerHTML = `
      <div class="text-2xl font-black text-slate-100">${fmt(max.buy_price_max)} <span class="text-sm font-normal text-slate-500">s</span></div>
      <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
        <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${meta.color||"#8a9aae"}"></span>
        <span class="text-sm font-semibold" style="color:${meta.color||"#e2e8f0"}">${max.city}</span>
        <span class="text-xs text-slate-600">${QUALITY_LABEL[max.quality]}</span>
      </div>
      <div class="flex gap-3 mt-1.5 text-xs text-slate-600">
        <span>Updated: <span class="${age.cls}">${age.text}</span></span>
      </div>
    `;
  } else {
    document.getElementById("bestBuy").innerHTML = `<span class="text-slate-600">No buy orders</span>`;
  }

  // ---- Best Flip ----
  let bestFlip = null;
  for (const a of validSell)
    for (const b of validBuy) {
      if (a.city === b.city || a.quality !== b.quality) continue;
      const profit = b.buy_price_max - a.sell_price_min;
      if (!bestFlip || profit > bestFlip.profit)
        bestFlip = { from:a.city, to:b.city, buy:a.sell_price_min, sell:b.buy_price_max, profit, quality:a.quality, sellAge:b.buy_price_max_date };
    }

  if (bestFlip && bestFlip.profit > 0) {
    const metaFrom = CITY_META[bestFlip.from] || {};
    const metaTo   = CITY_META[bestFlip.to]   || {};
    const margin   = ((bestFlip.profit / bestFlip.sell) * 100).toFixed(1);
    const age      = ageString(bestFlip.sellAge);
    document.getElementById("bestFlip").innerHTML = `
      <div class="text-2xl font-black text-green-400">+${fmt(bestFlip.profit)} <span class="text-sm font-normal text-slate-500">s</span>
        <span class="text-sm font-semibold text-green-500 ml-1">(${margin}%)</span>
      </div>
      <div class="flex items-center gap-1.5 mt-1.5 text-sm flex-wrap">
        <span class="font-semibold" style="color:${metaFrom.color||"#e2e8f0"}">${bestFlip.from}</span>
        <span class="text-slate-600 text-xs">@ ${fmt(bestFlip.buy)}</span>
        <span class="text-slate-500">→</span>
        <span class="font-semibold" style="color:${metaTo.color||"#e2e8f0"}">${bestFlip.to}</span>
        <span class="text-slate-600 text-xs">@ ${fmt(bestFlip.sell)}</span>
      </div>
      <div class="flex gap-3 mt-1.5 text-xs text-slate-600">
        <span>${QUALITY_LABEL[bestFlip.quality]}</span>
        <span>Updated: <span class="${age.cls}">${age.text}</span></span>
      </div>
    `;
  } else {
    document.getElementById("bestFlip").innerHTML = `<span class="text-slate-600 text-sm">No profitable flip in current selection.</span>`;
  }
}

function renderHeroInsights(rows) {
  const host = document.getElementById("heroInsights");
  host.innerHTML = "";

  // Use the tier-adjusted display ID so badges always reflect what's on screen
  const displayId   = getHeroItemId() || state.currentItemId;
  const displayName = getItemName(displayId);

  // Dynamic market-condition badges
  const tags = computeMarketInsights(rows);
  for (const t of tags) {
    const span = document.createElement("span");
    span.className = `badge ${t.cls}`;
    span.textContent = t.label;
    host.appendChild(span);
  }

  // Static item-type badges (tier / category) — uses display ID, not stale currentItemId
  const itemBadges = getItemInsights({ id: displayId, name: displayName });
  for (const b of itemBadges) {
    const span = document.createElement("span");
    span.className = `badge ${b.cls}`;
    span.textContent = b.label;
    host.appendChild(span);
  }

  // Craftable shortcut button — lives here so it survives every re-render
  // (placing it in selectItem() caused it to be wiped by the next render() call)
  if (isCraftable(displayId)) {
    const base     = displayId.split("@")[0];
    const craftBtn = document.createElement("button");
    craftBtn.className  = "badge badge-gold";
    craftBtn.style.cssText = "cursor:pointer;padding:4px 10px;font-size:11px;";
    craftBtn.title      = "Open in Crafting tab";
    craftBtn.textContent = "⚒ View Recipe";
    craftBtn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-section").forEach(s => s.classList.add("hidden"));
      const craftTab = document.querySelector(".tab-btn[data-tab='crafting']");
      const craftSection = document.getElementById("tab-crafting");
      if (craftTab)    craftTab.classList.add("active");
      if (craftSection) craftSection.classList.remove("hidden");
      window.initCraftingTab?.();
      setTimeout(() => window.selectCraftingItem?.(base), 300);
    });
    host.appendChild(craftBtn);
  }

  // Hero stats: best sell / best buy
  const host2 = document.getElementById("heroStats");
  host2.innerHTML = "";
  const validSell = rows.filter(r => r.sell_price_min > 0);
  const validBuy  = rows.filter(r => r.buy_price_max  > 0);
  if (validSell.length) {
    const min = validSell.reduce((a,b) => a.sell_price_min < b.sell_price_min ? a : b);
    host2.innerHTML += `<div class="hero-stat"><div class="label">Best Sell</div><div class="value text-green-400">${fmt(min.sell_price_min)}s</div></div>`;
  }
  if (validBuy.length) {
    const max = validBuy.reduce((a,b) => a.buy_price_max > b.buy_price_max ? a : b);
    host2.innerHTML += `<div class="hero-stat"><div class="label">Best Buy Order</div><div class="value text-albion">${fmt(max.buy_price_max)}s</div></div>`;
  }
}

// ---------- STATUS ----------

function setStatus(kind) {
  const dot  = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  dot.className  = `w-1.5 h-1.5 rounded-full`;
  switch (kind) {
    case "live":    dot.classList.add("live");    text.textContent = "live";    break;
    case "loading": dot.classList.add("loading"); text.textContent = "updating"; break;
    case "error":   dot.classList.add("error");   text.textContent = "error";   break;
    default:        text.textContent = "idle";
  }
}

// ---------- AUTO-REFRESH ----------

function scheduleRefresh() {
  clearTimeout(state.refreshTimer);
  clearInterval(state.countdownTimer);
  if (!state.refreshIntervalMs) {
    document.getElementById("nextRefresh").textContent = "";
    return;
  }
  state.nextRefreshAt = Date.now() + state.refreshIntervalMs;
  state.refreshTimer  = setTimeout(fetchPrices, state.refreshIntervalMs);
  state.countdownTimer = setInterval(updateCountdown, 1000);
  updateCountdown();
}

function updateCountdown() {
  const left = Math.max(0, Math.floor((state.nextRefreshAt - Date.now()) / 1000));
  document.getElementById("nextRefresh").textContent =
    left > 0 ? `Refreshes in ${left}s` : "Refreshing…";
}

// ---------- CITY-CARDS SORT TOGGLES ----------

const SORT_MODES = [
  { mode: "sell_asc",  label: "Cheapest sell" },
  { mode: "sell_desc", label: "Highest sell"  },
  { mode: "buy_desc",  label: "Highest buy"   },
  { mode: "buy_asc",   label: "Lowest buy"    },
  { mode: "city",      label: "By city"       },
];

function buildSortToggles() {
  const host = document.getElementById("citySort");
  host.innerHTML = "";
  for (const { mode, label } of SORT_MODES) {
    const btn = document.createElement("button");
    btn.className = "sort-toggle" + (state.citySortMode === mode ? " on" : "");
    btn.textContent = label;
    btn.addEventListener("click", () => {
      state.citySortMode = mode;
      host.querySelectorAll(".sort-toggle").forEach(b => b.classList.remove("on"));
      btn.classList.add("on");
      render();
    });
    host.appendChild(btn);
  }
}

// ---------- TABLE SORT HEADERS ----------

function initTableSort() {
  document.querySelectorAll(".sort-th").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.sort;
      if (state.sort.col === col) state.sort.dir *= -1;
      else { state.sort.col = col; state.sort.dir = 1; }
      document.querySelectorAll(".sort-th").forEach(h => h.classList.remove("active"));
      th.classList.add("active");
      render();
    });
  });
}

// ---------- MOBILE OVERLAY ----------

function openMobileOverlay() {
  document.getElementById("mobileOverlay").classList.remove("hidden");
  document.getElementById("mobileSearchInput").focus();
  renderDropdown("", document.getElementById("mobileResults"));
}

function closeMobileOverlay() {
  document.getElementById("mobileOverlay").classList.add("hidden");
  document.getElementById("mobileSearchInput").value = "";
  document.getElementById("mobileResults").innerHTML = "";
}

// ---------- KEYBOARD SHORTCUT: "/" to open search ----------

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "SELECT") {
    e.preventDefault();
    const inp = document.getElementById("searchInput");
    inp?.focus();
    const dd = document.getElementById("searchDropdown");
    if (dd) renderDropdown("", dd);
  }
  if (e.key === "Escape") {
    closeDropdown(document.getElementById("searchDropdown"));
    closeMobileOverlay();
  }
});

// ---------- INIT ----------

// Silently fetch the full 7000+ item database from ao-bin-dumps and merge it in
async function loadExtendedItems() {
  const AO_ITEMS_URL  = "https://raw.githubusercontent.com/broderickhyman/ao-bin-dumps/master/formatted/items.json";
  const CACHE_KEY     = "albion_items_ext_v1";
  const CACHE_TTL_MS  = 24 * 60 * 60 * 1000; // 24 hours

  try {
    // Try sessionStorage cache first — avoids re-downloading 7MB on every refresh
    let data = null;
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { ts, items } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL_MS) data = items;
      }
    } catch (_) {}

    if (!data) {
      const res = await fetch(AO_ITEMS_URL);
      if (!res.ok) return;
      data = await res.json();
      // Save to sessionStorage for this browser session
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items: data })); } catch (_) {}
    }

    if (!Array.isArray(data)) return;
    const existingIds = new Set(window.ALBION_ITEMS.map(i => i.id));
    const extras = [];
    for (const item of data) {
      const id   = item.UniqueName;
      const name = item.LocalizedNames?.["EN-US"] || item.LocalizedNames?.["EN-GB"];
      if (id && name && !existingIds.has(id)) {
        extras.push({ id, name });
        existingIds.add(id);
      }
    }
    if (extras.length) {
      window.ALBION_ITEMS = [...window.ALBION_ITEMS, ...extras];
      initFuse();
      console.log(`[Albion Market] Extended item database: ${window.ALBION_ITEMS.length} items`);
    }
  } catch (_) {
    // Silently fail — built-in list used as fallback
  }
}

// ---------- MANUAL REFRESH ----------

/**
 * Called exclusively by the ↻ button click.
 * Separated from fetchPrices() so the MouseEvent is never passed as retryCount.
 * Always busts the price cache so the API is hit fresh regardless of TTL.
 */
function manualRefresh() {
  // Prevent double-fire from button spam while already loading
  if (_fetchInFlight) return;
  // Invalidate any auto-refresh or pending fetch that might be mid-flight
  _fetchSeq++;

  // 1. Bust the price/history cache so apiFetch goes to the network
  bustPriceCache();

  // 2. Animate the button (spin once)
  const btn = document.getElementById("refreshBtn");
  if (btn) {
    btn.classList.add("refreshing");
    btn.disabled = true;
    // Re-enable after animation
    setTimeout(() => {
      btn.classList.remove("refreshing");
      btn.disabled = false;
    }, 900);
  }

  // 3. Fetch fresh market prices
  if (state.currentItemId) {
    fetchPrices(0);
  } else {
    // No item selected yet — at least pulse the status pill so user knows it worked
    setStatus("idle");
  }

  // 4. Also invalidate crafting tab data if it is currently visible
  const craftSection = document.getElementById("tab-crafting");
  if (craftSection && !craftSection.classList.contains("hidden")) {
    window.refreshCraftingPrices?.();
  }
}

// Expose so crafting.js or pvp.js can trigger a market refresh if needed
window.manualRefresh = manualRefresh;

function init() {
  initFuse();
  loadExtendedItems(); // async — extends search index in background
  buildFilterBar();
  buildSortToggles();
  initTableSort();

  // Desktop search
  const searchInput  = document.getElementById("searchInput");
  const searchDD     = document.getElementById("searchDropdown");
  const searchClear  = document.getElementById("searchClearBtn");

  searchInput.addEventListener("focus", () => {
    renderDropdown(searchInput.value.trim(), searchDD);
  });
  searchInput.addEventListener("input", (e) => {
    onSearchInput(e.target.value, searchDD);
  });
  searchInput.addEventListener("keydown", (e) => {
    handleSearchKeydown(e, searchDD);
  });
  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    onSearchInput("", searchDD);
    searchInput.focus();
  });

  // Backdrop click closes dropdown
  document.getElementById("searchBackdrop").addEventListener("click", () => {
    closeDropdown(searchDD);
  });

  // Mobile search
  document.getElementById("mobileSearchBtn").addEventListener("click", openMobileOverlay);
  document.getElementById("mobileCloseBtn").addEventListener("click", closeMobileOverlay);

  const mobileInput   = document.getElementById("mobileSearchInput");
  const mobileResults = document.getElementById("mobileResults");
  const mobileClear   = document.getElementById("mobileClearBtn");

  mobileInput.addEventListener("input", (e) => {
    mobileClear.classList.toggle("hidden", !e.target.value);
    onSearchInput(e.target.value, mobileResults);
  });
  mobileInput.addEventListener("keydown", (e) => {
    handleSearchKeydown(e, mobileResults);
  });
  mobileClear.addEventListener("click", () => {
    mobileInput.value = "";
    mobileClear.classList.add("hidden");
    renderDropdown("", mobileResults);
    mobileInput.focus();
  });

  // Server select — bust price cache so switching regions always fetches fresh
  document.getElementById("server").addEventListener("change", (e) => {
    state.server = e.target.value;
    bustPriceCache();
    if (state.currentItemId) fetchPrices(0);
  });

  // Refresh button — calls manualRefresh() not fetchPrices() directly
  // (fetchPrices used as a direct listener was receiving MouseEvent as retryCount)
  document.getElementById("refreshBtn").addEventListener("click", manualRefresh);

}

// Single authoritative selectItem — consolidated from two earlier versions
function selectItem(id, name) {
  state.currentItemId   = id;
  state.currentItemName = name || id;
  saveRecent(id, name || id);

  document.getElementById("emptyState").classList.add("hidden");
  ["citySection","bestSection","bmRoutesSection","tableSection","itemHero"].forEach(s =>
    document.getElementById(s)?.classList.remove("hidden")
  );

  // Wire up fallback before setting src
  const heroImg = document.getElementById("heroImg");
  heroImg.onerror = function() { this.onerror = null; this.src = FALLBACK_ICON; };
  document.getElementById("heroInsights").innerHTML = "";

  // Apply hero image + name immediately using the tier-aware helper, so the
  // correct tier/enchant is shown right away (no flash of the raw search-result tier).
  updateHeroForCurrentTier();

  // Keep search input in sync with the display name (may differ from raw `name` arg)
  const displayName = document.getElementById("heroName")?.textContent || name || id;
  const sinp = document.getElementById("searchInput");
  if (sinp && document.activeElement !== sinp) sinp.value = displayName;

  closeMobileOverlay();
  closeDropdown(document.getElementById("searchDropdown"));

  fetchPrices(0);
}

document.addEventListener("DOMContentLoaded", () => {
  init();

  // Expose constants for crafting.js (after declarations)
  window.API_BASES = API_BASES;
  window.CITIES    = CITIES;
  window.CITY_META = CITY_META;
  window.iconUrl   = iconUrl;
  window.ageString = ageString;

  // Tab switching
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-section").forEach(s => s.classList.add("hidden"));
      document.getElementById("tab-" + tab)?.classList.remove("hidden");
      if (tab === "crafting") window.initCraftingTab?.();
      if (tab === "gold")     initGoldTab();
      if (tab === "pvp")      window.initPvpTab?.();
    });
  });
});

// ---- Gold tab ----
async function initGoldTab() {
  const host = document.getElementById("tab-gold");
  if (!host || host.dataset.loaded) return;
  host.dataset.loaded = "1";
  host.innerHTML = `<div class="text-slate-500 text-sm text-center py-8 animate-pulse">Loading gold prices…</div>`;
  try {
    const serverKey = document.getElementById("server")?.value || "europe";
    const url  = `${API_BASES[serverKey]}/stats/gold.json?count=48`;
    const data = await apiFetch(url);
    if (!data?.length) { host.innerHTML = `<div class="text-slate-600 py-8 text-center">No gold data.</div>`; return; }
    const latest = data[data.length - 1];
    const oldest = data[0];
    const change    = latest.price - oldest.price;
    const changePct = ((change / oldest.price) * 100).toFixed(2);
    const color     = change >= 0 ? "#4ade80" : "#f87171";

    const tableRows = [...data].reverse().slice(0,24).map(d => {
      const dt = new Date(d.timestamp + (d.timestamp.endsWith("Z") ? "" : "Z"));
      return `<tr class="border-b border-[#141c28]">
        <td class="px-4 py-2 text-sm text-slate-400">${dt.toLocaleString()}</td>
        <td class="px-4 py-2 text-right text-sm font-mono text-slate-200">${d.price.toLocaleString()}</td>
      </tr>`;
    }).join("");

    host.innerHTML = `
      <div class="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-surface border border-border rounded-xl p-4">
          <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">Current Price</div>
          <div class="text-2xl font-black text-slate-100">${latest.price.toLocaleString()} <span class="text-xs font-normal text-slate-500">s/gold</span></div>
        </div>
        <div class="bg-surface border border-border rounded-xl p-4">
          <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">48h Change</div>
          <div class="text-2xl font-black" style="color:${color}">${change>=0?"+":""}${change.toLocaleString()}</div>
        </div>
        <div class="bg-surface border border-border rounded-xl p-4">
          <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">Change %</div>
          <div class="text-2xl font-black" style="color:${color}">${change>=0?"+":""}${changePct}%</div>
        </div>
        <div class="bg-surface border border-border rounded-xl p-4">
          <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">48h Range</div>
          <div class="text-sm font-mono text-slate-300">${Math.min(...data.map(d=>d.price)).toLocaleString()} – ${Math.max(...data.map(d=>d.price)).toLocaleString()}</div>
        </div>
      </div>
      <div class="bg-surface border border-border rounded-2xl overflow-hidden">
        <div class="px-4 py-3 border-b border-border text-xs text-slate-500 uppercase tracking-wider">Recent Prices (48 entries)</div>
        <div class="overflow-x-auto"><table class="w-full">
          <thead><tr class="border-b border-border bg-elevated text-xs text-slate-500 uppercase tracking-wider">
            <th class="text-left px-4 py-2">Time</th>
            <th class="text-right px-4 py-2">Silver / Gold</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table></div>
      </div>
      <p class="text-xs text-slate-700 mt-3">Gold prices via <a href="https://www.albion-online-data.com" class="underline hover:text-slate-500" target="_blank">Albion Online Data Project</a>.</p>
    `;
  } catch(e) {
    host.innerHTML = `<div class="text-red-400 py-8 text-center text-sm">Failed to load gold prices.</div>`;
  }
}
