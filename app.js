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
const CACHE_TTL = 3 * 60 * 1000; // 3 min
let   _lastRequestTime = 0;

async function apiFetch(url) {
  const now    = Date.now();
  const cached = _apiCache.get(url);
  if (cached && now - cached.ts < CACHE_TTL) return cached.data;

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
  server:            "west",
  selectedCities:    new Set(CITIES),
  selectedTiers:     new Set(["T4","T5","T6","T7","T8"]),
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
      { name: "name", weight: 0.7 },
      { name: "id",   weight: 0.3 },
    ],
    threshold:         0.42,
    includeMatches:    true,
    includeScore:      true,
    ignoreLocation:    true,
    minMatchCharLength: 1,
  });
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
  searchDebounce = setTimeout(() => renderDropdown(query.trim(), dropdownEl), 120);

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
    const results = fuse.search(query, { limit: 36 });
    if (!results.length) {
      dropdownEl.innerHTML = `<div class="dd-empty">No results for "<strong>${escHtml(query)}</strong>".<br/>Try a raw ID like <code>T6_BAG</code> or <code>T8_2H_BOW</code>.</div>`;
      openDropdown(dropdownEl);
      return;
    }
    const grouped = {};
    for (const r of results) {
      const cat = categorize(r.item.id);
      if (!grouped[cat]) grouped[cat] = [];
      if (grouped[cat].length < 5) grouped[cat].push(r);
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

      const el = document.createElement("div");
      el.className = "dd-item";
      el.dataset.idx = globalIdx;
      el.innerHTML = `
        <img class="dd-icon" src="${iconUrl(item.id)}" alt="" loading="lazy" onerror="onIconError(this)" />
        <div class="dd-info">
          <div class="dd-name">${nameHtml}</div>
          <div class="dd-meta">${idHtml}</div>
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

function selectItem(id, name) {
  state.currentItemId   = id;
  state.currentItemName = name || id;
  saveRecent(id, name || id);

  document.getElementById("emptyState").classList.add("hidden");
  ["citySection","bestSection","bmRoutesSection","tableSection","itemHero"].forEach(s =>
    document.getElementById(s)?.classList.remove("hidden")
  );

  const heroImg  = document.getElementById("heroImg");
  const heroName = document.getElementById("heroName");
  const heroId   = document.getElementById("heroId");
  heroImg.onerror = function() { this.onerror = null; this.src = FALLBACK_ICON; };
  heroImg.src  = iconUrl(id, 1);
  heroName.textContent = name || id;
  heroId.textContent   = id;
  document.getElementById("heroInsights").innerHTML = "";

  fetchPrices();
}

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

async function fetchPrices() {
  if (!state.currentItemId) return;
  setStatus("loading");

  const ids       = buildItemIds(state.currentItemId);
  const qualities = [...state.selectedQualities].join(",");
  const url =
    `${API_BASES[state.server]}/stats/prices/${ids.join(",")}.json` +
    `?locations=${encodeURIComponent(CITIES.join(","))}` +
    (qualities ? `&qualities=${qualities}` : "");

  try {
    const data = await apiFetch(url);
    state.rows = data || [];
    setStatus("live");
    render();
    scheduleRefresh();
  } catch (err) {
    console.error(err);
    setStatus("error");
    document.getElementById("priceBody").innerHTML =
      '<tr class="empty-row"><td colspan="7">Failed to fetch. Check connection or try again.</td></tr>';
  }
}

// ---------- BLACK MARKET ROUTES ----------

const BM_ROUTE_META = {
  "Bridgewatch":   { travelMin: 12, risk: "High",   riskScore: 3, riskColor: "#f87171", riskBg: "rgba(248,113,113,0.08)", path: "Steppe Roads" },
  "Lymhurst":      { travelMin: 18, risk: "Medium", riskScore: 2, riskColor: "#fbbf24", riskBg: "rgba(251,191,36,0.08)",  path: "Forest Roads" },
  "Fort Sterling": { travelMin: 22, risk: "Low",    riskScore: 1, riskColor: "#4ade80", riskBg: "rgba(74,222,128,0.08)", path: "Mountain Roads" },
  "Martlock":      { travelMin: 20, risk: "Low",    riskScore: 1, riskColor: "#4ade80", riskBg: "rgba(74,222,128,0.08)", path: "Highland Roads" },
  "Thetford":      { travelMin: 13, risk: "High",   riskScore: 3, riskColor: "#f87171", riskBg: "rgba(248,113,113,0.08)", path: "Swamp Roads" },
  "Brecilien":     { travelMin: 25, risk: "Medium", riskScore: 2, riskColor: "#fbbf24", riskBg: "rgba(251,191,36,0.08)",  path: "Mists" },
};

function renderBlackMarketRoutes(allRows) {
  const section = document.getElementById("bmRoutesSection");
  const host    = document.getElementById("bmRoutesContent");
  if (!section || !host) return;

  // Best Black Market buy order
  const bmRows = allRows.filter(r => r.city === "Black Market" && r.buy_price_max > 0);
  const bmBest = bmRows.reduce((a, b) => (!a || b.buy_price_max > a.buy_price_max ? b : a), null);

  if (!bmBest) { section.classList.add("hidden"); return; }
  section.classList.remove("hidden");

  const bmPrice = bmBest.buy_price_max;
  const royalCities = ["Bridgewatch", "Lymhurst", "Fort Sterling", "Martlock", "Thetford", "Brecilien"];

  // Build routes
  const routes = royalCities.map(city => {
    const meta     = BM_ROUTE_META[city];
    const cityMeta = CITY_META[city] || {};
    const cityRows = allRows.filter(r => r.city === city && r.sell_price_min > 0);
    const cheapest = cityRows.reduce((a, b) => (!a || b.sell_price_min < a.sell_price_min ? b : a), null);
    if (!cheapest) return null;

    const buyPrice     = cheapest.sell_price_min;
    const profit       = bmPrice - buyPrice;
    const roi          = bmPrice > 0 ? (profit / bmPrice * 100) : 0;
    const profitPerMin = meta.travelMin > 0 ? profit / meta.travelMin : 0;
    const efficiency   = profitPerMin / meta.riskScore; // penalise by risk
    return { city, meta, cityMeta, buyPrice, profit, roi, profitPerMin, efficiency, sellAge: cheapest.sell_price_min_date, quality: cheapest.quality };
  }).filter(r => r && r.profit > 0).sort((a, b) => b.profit - a.profit);

  if (!routes.length) { section.classList.add("hidden"); return; }

  // Danger's Way = highest raw profit
  const dangersWay = routes[0];
  // Safe Way = best efficiency among Low/Medium risk (riskScore ≤ 2)
  const safeRoutes = routes.filter(r => r.meta.riskScore <= 2).sort((a, b) => b.efficiency - a.efficiency);
  const safeWay    = safeRoutes[0] && safeRoutes[0] !== dangersWay ? safeRoutes[0] : (routes[1] || null);

  host.innerHTML = `
    <div class="flex items-center gap-3 mb-4 flex-wrap">
      <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-widest">⚔ Black Market Routes</h3>
      <span class="text-xs px-2.5 py-1 rounded-full bg-elevated border border-border text-slate-500">
        BM Buy Order: <span class="text-albion font-semibold">${fmt(bmPrice)}s</span>
      </span>
    </div>

    <!-- Two featured route cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
      ${renderRouteCard(dangersWay, "Danger's Way", "#f87171", "rgba(248,113,113,0.09)", "🔴", bmPrice)}
      ${safeWay
        ? renderRouteCard(safeWay, "Safe Way", "#4ade80", "rgba(74,222,128,0.07)", "🟢", bmPrice)
        : `<div class="bg-surface border border-border rounded-2xl p-6 flex items-center justify-center text-slate-600 text-sm">No safe route with positive profit</div>`}
    </div>

    <!-- Route comparison table -->
    <div class="bg-surface border border-border rounded-2xl overflow-hidden">
      <div class="px-4 py-3 border-b border-border flex items-center gap-3">
        <span class="text-xs text-slate-500 uppercase tracking-wider font-semibold">All Routes → Black Market</span>
        <span class="text-xs text-slate-600">(Caerleon excluded · ranked by profit)</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm" style="min-width:700px">
          <thead>
            <tr class="border-b border-border bg-elevated">
              <th class="text-left px-4 py-2.5 text-xs text-slate-500 uppercase tracking-wider">City</th>
              <th class="text-right px-4 py-2.5 text-xs text-slate-500 uppercase tracking-wider">Buy At</th>
              <th class="text-right px-4 py-2.5 text-xs text-slate-500 uppercase tracking-wider">Profit</th>
              <th class="text-right px-4 py-2.5 text-xs text-slate-500 uppercase tracking-wider">ROI %</th>
              <th class="text-right px-4 py-2.5 text-xs text-slate-500 uppercase tracking-wider">Travel</th>
              <th class="text-right px-4 py-2.5 text-xs text-slate-500 uppercase tracking-wider">Risk</th>
              <th class="text-right px-4 py-2.5 text-xs text-slate-500 uppercase tracking-wider">Profit/min</th>
              <th class="text-right px-4 py-2.5 text-xs text-slate-500 uppercase tracking-wider">Verdict</th>
            </tr>
          </thead>
          <tbody>
            ${routes.map(r => {
              const isDanger = r === dangersWay;
              const isSafe   = r === safeWay;
              const badge    = isDanger
                ? `<span class="badge badge-red ml-1">Danger's Way</span>`
                : isSafe
                  ? `<span class="badge badge-green ml-1">Safe Way</span>`
                  : "";
              const age = ageString(r.sellAge);
              const roiCls = r.roi > 40 ? "text-green-400" : r.roi > 20 ? "text-yellow-400" : "text-slate-400";
              const riskBars = [1,2,3].map(i =>
                `<span class="inline-block h-1.5 w-4 rounded-full" style="background:${i <= r.meta.riskScore ? r.meta.riskColor : '#1e2a3a'}"></span>`
              ).join("");
              return `<tr class="border-b border-[#141c28] hover:bg-[rgba(255,255,255,0.015)]">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${r.cityMeta.color||'#546e7a'}"></span>
                    <span class="font-semibold" style="color:${r.cityMeta.color||'#e2e8f0'}">${r.city}</span>
                    ${badge}
                  </div>
                  <div class="text-xs text-slate-600 mt-0.5 pl-4">${r.meta.path}</div>
                </td>
                <td class="text-right px-4 py-3 text-sm text-slate-300 font-mono">${fmt(r.buyPrice)}</td>
                <td class="text-right px-4 py-3 text-sm font-bold text-green-400">+${fmt(r.profit)}</td>
                <td class="text-right px-4 py-3 text-sm font-semibold ${roiCls}">${r.roi.toFixed(1)}%</td>
                <td class="text-right px-4 py-3 text-xs text-slate-400">~${r.meta.travelMin}m</td>
                <td class="text-right px-4 py-3">
                  <div class="flex items-center justify-end gap-1">${riskBars}</div>
                  <div class="text-xs font-semibold text-right mt-0.5" style="color:${r.meta.riskColor}">${r.meta.risk}</div>
                </td>
                <td class="text-right px-4 py-3 text-xs text-slate-400">${fmt(Math.round(r.profitPerMin))}/m</td>
                <td class="text-right px-4 py-3 text-xs ${age.cls}">${age.text} ago</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
    <p class="text-xs text-slate-700 mt-2">⚠ Travel times are estimates based on typical road distances. Risk reflects average PvP exposure per route.</p>
  `;
}

function renderRouteCard(route, label, accentColor, accentBg, icon, bmPrice) {
  if (!route) return "";
  const age = ageString(route.sellAge);
  const riskBars = [1,2,3].map(i =>
    `<div class="h-2 w-6 rounded-full" style="background:${i <= route.meta.riskScore ? route.meta.riskColor : '#1e2a3a'}"></div>`
  ).join("");

  const roiCls = route.roi > 40 ? "text-green-400" : route.roi > 20 ? "text-yellow-400" : "text-slate-400";

  return `
    <div class="rounded-2xl p-5 border-2" style="background:${accentBg};border-color:${accentColor}55">

      <!-- Card header -->
      <div class="flex items-start justify-between mb-4">
        <div>
          <div class="text-xs font-black uppercase tracking-widest mb-0.5" style="color:${accentColor}">${icon} ${label}</div>
          <div class="text-base font-bold text-slate-200">${route.city} → Black Market</div>
          <div class="text-xs text-slate-500 mt-0.5">via ${route.meta.path} · ~${route.meta.travelMin} min</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-500 mb-1">Risk Level</div>
          <div class="flex gap-1 justify-end">${riskBars}</div>
          <div class="text-xs font-bold mt-1" style="color:${route.meta.riskColor}">${route.meta.risk}</div>
        </div>
      </div>

      <!-- Profit hero -->
      <div class="text-4xl font-black text-green-400 leading-tight">+${fmt(route.profit)}<span class="text-base font-normal text-slate-500 ml-1">s</span></div>
      <div class="flex gap-3 mt-1 mb-4">
        <span class="text-sm font-semibold ${roiCls}">${route.roi.toFixed(1)}% ROI</span>
        <span class="text-sm text-slate-500">${fmt(Math.round(route.profitPerMin))}/min</span>
      </div>

      <!-- Buy → Sell strip -->
      <div class="flex items-stretch gap-2 mb-4">
        <div class="flex-1 bg-[rgba(0,0,0,0.25)] rounded-xl p-3 text-center">
          <div class="text-xs text-slate-500 mb-1">Buy in</div>
          <div class="text-xs font-bold mb-1" style="color:${route.cityMeta.color||'#e2e8f0'}">${route.city}</div>
          <div class="text-lg font-black text-slate-100">${fmt(route.buyPrice)}<span class="text-xs text-slate-500 ml-0.5">s</span></div>
        </div>
        <div class="flex items-center justify-center px-1 text-slate-600 text-xl font-bold">→</div>
        <div class="flex-1 bg-[rgba(0,0,0,0.25)] rounded-xl p-3 text-center">
          <div class="text-xs text-slate-500 mb-1">Sell at</div>
          <div class="text-xs font-bold text-slate-400 mb-1">Black Market</div>
          <div class="text-lg font-black text-albion">${fmt(bmPrice)}<span class="text-xs text-slate-500 ml-0.5">s</span></div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between text-xs">
        <span class="text-slate-600">Quality: ${QUALITY_LABEL[route.quality] || route.quality}</span>
        <span class="${age.cls}">Data: ${age.text} ago</span>
      </div>
    </div>
  `;
}

// ---------- RENDER ----------

function render() {
  let rows = state.rows.filter(r =>
    state.selectedCities.has(r.city) && state.selectedQualities.has(r.quality)
  );
  for (const r of rows)
    r._spread = r.sell_price_min && r.buy_price_max ? r.sell_price_min - r.buy_price_max : null;

  renderTable(rows);
  renderCityCards(rows);
  updateBest(rows);
  renderHeroInsights(rows);
  renderBlackMarketRoutes(state.rows); // uses full rows (needs BM data regardless of city filter)
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
  const tags = computeMarketInsights(rows);
  for (const t of tags) {
    const span = document.createElement("span");
    span.className = `badge ${t.cls}`;
    span.textContent = t.label;
    host.appendChild(span);
  }
  // Static insights from item type
  const itemBadges = getItemInsights({ id: state.currentItemId, name: state.currentItemName });
  for (const b of itemBadges) {
    const span = document.createElement("span");
    span.className = `badge ${b.cls}`;
    span.textContent = b.label;
    host.appendChild(span);
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

function init() {
  initFuse();
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

  // Server select
  document.getElementById("server").addEventListener("change", (e) => {
    state.server = e.target.value;
    if (state.currentItemId) fetchPrices();
  });

  // Refresh button
  document.getElementById("refreshBtn").addEventListener("click", fetchPrices);

  // Override selectItem to also close mobile overlay
  const _orig = selectItem;
  window.__selectItem = function(id, name) {
    _orig(id, name);
    closeMobileOverlay();
    closeDropdown(searchDD);
    document.getElementById("searchInput").value = name || id;
    onSearchInput(name || id, searchDD);
  };
}

// Patch selectItem after init to wire up mobile close
const _selectItemOrig = selectItem;
function selectItem(id, name) {
  state.currentItemId   = id;
  state.currentItemName = name || id;
  saveRecent(id, name || id);

  document.getElementById("emptyState").classList.add("hidden");
  ["citySection","bestSection","tableSection","itemHero"].forEach(s =>
    document.getElementById(s)?.classList.remove("hidden")
  );

  const _heroImg = document.getElementById("heroImg");
  _heroImg.onerror = function() { this.onerror = null; this.src = FALLBACK_ICON; };
  _heroImg.src = iconUrl(id, 1);
  document.getElementById("heroName").textContent = name || id;
  document.getElementById("heroId").textContent = id;
  document.getElementById("heroInsights").innerHTML = "";

  // update search input text
  const sinp = document.getElementById("searchInput");
  if (sinp && document.activeElement !== sinp) sinp.value = name || id;

  closeMobileOverlay();
  closeDropdown(document.getElementById("searchDropdown"));

  fetchPrices();
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
      if (tab === "gold") initGoldTab();
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
    const serverKey = document.getElementById("server")?.value || "west";
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
