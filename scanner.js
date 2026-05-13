// ================================================================
//  Albion Live Market Tracker — scanner.js  v2
//  Live Profit Scanner: 200+ items, flip + craft profit,
//  ranked by ROI across all 8 cities in real-time.
//
//  Dependencies (loaded before this script):
//    app.js      → window.apiFetch, API_BASES, CITIES, CITY_META,
//                  iconUrl, ageString, FALLBACK_ICON
//    crafting.js → window.CRAFTING_RECIPES
// ================================================================

// ── SCAN ITEM LIST (200+ high-traffic items) ──────────────────

const SCAN_ITEMS = [

  // ── Raw Resources ──
  { id:"T4_WOOD",      name:"Birch Wood",           cat:"Raw Resources" },
  { id:"T5_WOOD",      name:"Chestnut Wood",         cat:"Raw Resources" },
  { id:"T6_WOOD",      name:"Ash Wood",              cat:"Raw Resources" },
  { id:"T7_WOOD",      name:"Yew Wood",              cat:"Raw Resources" },
  { id:"T8_WOOD",      name:"Ghoul Tree",            cat:"Raw Resources" },
  { id:"T4_ORE",       name:"Iron Ore",              cat:"Raw Resources" },
  { id:"T5_ORE",       name:"Titanium Ore",          cat:"Raw Resources" },
  { id:"T6_ORE",       name:"Runite Ore",            cat:"Raw Resources" },
  { id:"T7_ORE",       name:"Meteorite Ore",         cat:"Raw Resources" },
  { id:"T8_ORE",       name:"Madstone Ore",          cat:"Raw Resources" },
  { id:"T4_FIBER",     name:"Cotton",                cat:"Raw Resources" },
  { id:"T5_FIBER",     name:"Neat Fiber",            cat:"Raw Resources" },
  { id:"T6_FIBER",     name:"Rowan Fiber",           cat:"Raw Resources" },
  { id:"T7_FIBER",     name:"Bloodoak Fiber",        cat:"Raw Resources" },
  { id:"T8_FIBER",     name:"Ghostdust Fiber",       cat:"Raw Resources" },
  { id:"T4_HIDE",      name:"Thick Hide",            cat:"Raw Resources" },
  { id:"T5_HIDE",      name:"Rugged Hide",           cat:"Raw Resources" },
  { id:"T6_HIDE",      name:"Stiff Hide",            cat:"Raw Resources" },
  { id:"T7_HIDE",      name:"Feral Hide",            cat:"Raw Resources" },
  { id:"T8_HIDE",      name:"Infernal Hide",         cat:"Raw Resources" },
  { id:"T4_ROCK",      name:"Limestone",             cat:"Raw Resources" },
  { id:"T5_ROCK",      name:"Slate",                 cat:"Raw Resources" },
  { id:"T6_ROCK",      name:"Granite",               cat:"Raw Resources" },
  { id:"T7_ROCK",      name:"Basalt",                cat:"Raw Resources" },
  { id:"T8_ROCK",      name:"Sunstone",              cat:"Raw Resources" },

  // ── Refined Resources ──
  { id:"T4_PLANKS",     name:"Birch Plank",          cat:"Refined" },
  { id:"T5_PLANKS",     name:"Chestnut Plank",       cat:"Refined" },
  { id:"T6_PLANKS",     name:"Pine Plank",           cat:"Refined" },
  { id:"T7_PLANKS",     name:"Cedar Plank",          cat:"Refined" },
  { id:"T8_PLANKS",     name:"Mahogany Plank",       cat:"Refined" },
  { id:"T4_METALBAR",   name:"Steel Bar",            cat:"Refined" },
  { id:"T5_METALBAR",   name:"Titanium Steel Bar",   cat:"Refined" },
  { id:"T6_METALBAR",   name:"Runite Steel Bar",     cat:"Refined" },
  { id:"T7_METALBAR",   name:"Meteorite Steel Bar",  cat:"Refined" },
  { id:"T8_METALBAR",   name:"Infused Steel Bar",    cat:"Refined" },
  { id:"T4_CLOTH",      name:"Wool Cloth",           cat:"Refined" },
  { id:"T5_CLOTH",      name:"Linen Cloth",          cat:"Refined" },
  { id:"T6_CLOTH",      name:"Mage Cloth",           cat:"Refined" },
  { id:"T7_CLOTH",      name:"Infused Mage Cloth",   cat:"Refined" },
  { id:"T8_CLOTH",      name:"Infused Cloth",        cat:"Refined" },
  { id:"T4_LEATHER",    name:"Worked Leather",       cat:"Refined" },
  { id:"T5_LEATHER",    name:"Cured Leather",        cat:"Refined" },
  { id:"T6_LEATHER",    name:"Hardened Leather",     cat:"Refined" },
  { id:"T7_LEATHER",    name:"Reinforced Leather",   cat:"Refined" },
  { id:"T8_LEATHER",    name:"Infused Leather",      cat:"Refined" },
  { id:"T4_STONEBLOCK", name:"Sandstone Block",      cat:"Refined" },
  { id:"T5_STONEBLOCK", name:"Limestone Block",      cat:"Refined" },
  { id:"T6_STONEBLOCK", name:"Granite Block",        cat:"Refined" },
  { id:"T7_STONEBLOCK", name:"Slate Block",          cat:"Refined" },
  { id:"T8_STONEBLOCK", name:"Basalt Block",         cat:"Refined" },

  // ── Bags ──
  { id:"T4_BAG",        name:"Adept's Bag",          cat:"Bags" },
  { id:"T5_BAG",        name:"Expert's Bag",         cat:"Bags" },
  { id:"T6_BAG",        name:"Master's Bag",         cat:"Bags" },
  { id:"T7_BAG",        name:"Grandmaster's Bag",    cat:"Bags" },
  { id:"T8_BAG",        name:"Elder's Bag",          cat:"Bags" },

  // ── Swords ──
  { id:"T4_MAIN_SWORD", name:"Adept's Broadsword",       cat:"Weapons" },
  { id:"T5_MAIN_SWORD", name:"Expert's Broadsword",      cat:"Weapons" },
  { id:"T6_MAIN_SWORD", name:"Master's Broadsword",      cat:"Weapons" },
  { id:"T7_MAIN_SWORD", name:"Grandmaster's Broadsword", cat:"Weapons" },
  { id:"T8_MAIN_SWORD", name:"Elder's Broadsword",       cat:"Weapons" },
  { id:"T4_2H_CLAYMORE",name:"Adept's Claymore",         cat:"Weapons" },
  { id:"T5_2H_CLAYMORE",name:"Expert's Claymore",        cat:"Weapons" },
  { id:"T6_2H_CLAYMORE",name:"Master's Claymore",        cat:"Weapons" },
  { id:"T7_2H_CLAYMORE",name:"Grandmaster's Claymore",   cat:"Weapons" },
  { id:"T8_2H_CLAYMORE",name:"Elder's Claymore",         cat:"Weapons" },

  // ── Axes ──
  { id:"T4_2H_AXE",     name:"Adept's Greataxe",         cat:"Weapons" },
  { id:"T5_2H_AXE",     name:"Expert's Greataxe",        cat:"Weapons" },
  { id:"T6_2H_AXE",     name:"Master's Greataxe",        cat:"Weapons" },
  { id:"T7_2H_AXE",     name:"Grandmaster's Greataxe",   cat:"Weapons" },
  { id:"T8_2H_AXE",     name:"Elder's Greataxe",         cat:"Weapons" },

  // ── Hammers ──
  { id:"T4_2H_HAMMER",  name:"Adept's Great Hammer",      cat:"Weapons" },
  { id:"T5_2H_HAMMER",  name:"Expert's Great Hammer",     cat:"Weapons" },
  { id:"T6_2H_HAMMER",  name:"Master's Great Hammer",     cat:"Weapons" },
  { id:"T7_2H_HAMMER",  name:"Grandmaster's Great Hammer",cat:"Weapons" },
  { id:"T8_2H_HAMMER",  name:"Elder's Great Hammer",      cat:"Weapons" },

  // ── Spears ──
  { id:"T4_2H_SPEAR",   name:"Adept's Pike",             cat:"Weapons" },
  { id:"T5_2H_SPEAR",   name:"Expert's Pike",            cat:"Weapons" },
  { id:"T6_2H_SPEAR",   name:"Master's Pike",            cat:"Weapons" },
  { id:"T7_2H_SPEAR",   name:"Grandmaster's Pike",       cat:"Weapons" },
  { id:"T8_2H_SPEAR",   name:"Elder's Pike",             cat:"Weapons" },

  // ── Bows ──
  { id:"T4_2H_BOW",     name:"Adept's Bow",              cat:"Weapons" },
  { id:"T5_2H_BOW",     name:"Expert's Bow",             cat:"Weapons" },
  { id:"T6_2H_BOW",     name:"Master's Bow",             cat:"Weapons" },
  { id:"T7_2H_BOW",     name:"Grandmaster's Bow",        cat:"Weapons" },
  { id:"T8_2H_BOW",     name:"Elder's Bow",              cat:"Weapons" },

  // ── Crossbows ──
  { id:"T4_2H_CROSSBOW",name:"Adept's Heavy Crossbow",    cat:"Weapons" },
  { id:"T5_2H_CROSSBOW",name:"Expert's Heavy Crossbow",   cat:"Weapons" },
  { id:"T6_2H_CROSSBOW",name:"Master's Heavy Crossbow",   cat:"Weapons" },
  { id:"T7_2H_CROSSBOW",name:"Grandmaster's Heavy Crossbow",cat:"Weapons"},
  { id:"T8_2H_CROSSBOW",name:"Elder's Heavy Crossbow",    cat:"Weapons" },

  // ── Staves ──
  { id:"T4_MAIN_FIRESTAFF",  name:"Adept's Fire Staff",        cat:"Weapons" },
  { id:"T5_MAIN_FIRESTAFF",  name:"Expert's Fire Staff",       cat:"Weapons" },
  { id:"T6_MAIN_FIRESTAFF",  name:"Master's Fire Staff",       cat:"Weapons" },
  { id:"T7_MAIN_FIRESTAFF",  name:"Grandmaster's Fire Staff",  cat:"Weapons" },
  { id:"T8_MAIN_FIRESTAFF",  name:"Elder's Fire Staff",        cat:"Weapons" },
  { id:"T4_2H_HOLYSTAFF",    name:"Adept's Holy Staff",        cat:"Weapons" },
  { id:"T5_2H_HOLYSTAFF",    name:"Expert's Holy Staff",       cat:"Weapons" },
  { id:"T6_2H_HOLYSTAFF",    name:"Master's Holy Staff",       cat:"Weapons" },
  { id:"T7_2H_HOLYSTAFF",    name:"Grandmaster's Holy Staff",  cat:"Weapons" },
  { id:"T8_2H_HOLYSTAFF",    name:"Elder's Holy Staff",        cat:"Weapons" },
  { id:"T4_MAIN_NATURESTAFF",name:"Adept's Nature Staff",      cat:"Weapons" },
  { id:"T5_MAIN_NATURESTAFF",name:"Expert's Nature Staff",     cat:"Weapons" },
  { id:"T6_MAIN_NATURESTAFF",name:"Master's Nature Staff",     cat:"Weapons" },
  { id:"T7_MAIN_NATURESTAFF",name:"Grandmaster's Nature Staff",cat:"Weapons" },
  { id:"T8_MAIN_NATURESTAFF",name:"Elder's Nature Staff",      cat:"Weapons" },
  { id:"T4_MAIN_ARCANESTAFF",name:"Adept's Arcane Staff",      cat:"Weapons" },
  { id:"T5_MAIN_ARCANESTAFF",name:"Expert's Arcane Staff",     cat:"Weapons" },
  { id:"T6_MAIN_ARCANESTAFF",name:"Master's Arcane Staff",     cat:"Weapons" },
  { id:"T7_MAIN_ARCANESTAFF",name:"Grandmaster's Arcane Staff",cat:"Weapons" },
  { id:"T8_MAIN_ARCANESTAFF",name:"Elder's Arcane Staff",      cat:"Weapons" },

  // ── Plate Armor ──
  { id:"T4_ARMOR_PLATE_SET1", name:"Adept's Soldier Armor",        cat:"Armor" },
  { id:"T5_ARMOR_PLATE_SET1", name:"Expert's Soldier Armor",       cat:"Armor" },
  { id:"T6_ARMOR_PLATE_SET1", name:"Master's Soldier Armor",       cat:"Armor" },
  { id:"T7_ARMOR_PLATE_SET1", name:"Grandmaster's Soldier Armor",  cat:"Armor" },
  { id:"T8_ARMOR_PLATE_SET1", name:"Elder's Soldier Armor",        cat:"Armor" },
  { id:"T4_HEAD_PLATE_SET1",  name:"Adept's Soldier Helmet",       cat:"Armor" },
  { id:"T5_HEAD_PLATE_SET1",  name:"Expert's Soldier Helmet",      cat:"Armor" },
  { id:"T6_HEAD_PLATE_SET1",  name:"Master's Soldier Helmet",      cat:"Armor" },
  { id:"T7_HEAD_PLATE_SET1",  name:"Grandmaster's Soldier Helmet", cat:"Armor" },
  { id:"T8_HEAD_PLATE_SET1",  name:"Elder's Soldier Helmet",       cat:"Armor" },
  { id:"T4_SHOES_PLATE_SET1", name:"Adept's Soldier Boots",        cat:"Armor" },
  { id:"T5_SHOES_PLATE_SET1", name:"Expert's Soldier Boots",       cat:"Armor" },
  { id:"T6_SHOES_PLATE_SET1", name:"Master's Soldier Boots",       cat:"Armor" },
  { id:"T7_SHOES_PLATE_SET1", name:"Grandmaster's Soldier Boots",  cat:"Armor" },
  { id:"T8_SHOES_PLATE_SET1", name:"Elder's Soldier Boots",        cat:"Armor" },

  // ── Leather Armor ──
  { id:"T4_ARMOR_LEATHER_SET1",name:"Adept's Merc Jacket",         cat:"Armor" },
  { id:"T5_ARMOR_LEATHER_SET1",name:"Expert's Merc Jacket",        cat:"Armor" },
  { id:"T6_ARMOR_LEATHER_SET1",name:"Master's Merc Jacket",        cat:"Armor" },
  { id:"T7_ARMOR_LEATHER_SET1",name:"Grandmaster's Merc Jacket",   cat:"Armor" },
  { id:"T8_ARMOR_LEATHER_SET1",name:"Elder's Merc Jacket",         cat:"Armor" },
  { id:"T4_HEAD_LEATHER_SET1", name:"Adept's Merc Hood",           cat:"Armor" },
  { id:"T5_HEAD_LEATHER_SET1", name:"Expert's Merc Hood",          cat:"Armor" },
  { id:"T6_HEAD_LEATHER_SET1", name:"Master's Merc Hood",          cat:"Armor" },
  { id:"T7_HEAD_LEATHER_SET1", name:"Grandmaster's Merc Hood",     cat:"Armor" },
  { id:"T8_HEAD_LEATHER_SET1", name:"Elder's Merc Hood",           cat:"Armor" },
  { id:"T4_SHOES_LEATHER_SET1",name:"Adept's Merc Shoes",          cat:"Armor" },
  { id:"T5_SHOES_LEATHER_SET1",name:"Expert's Merc Shoes",         cat:"Armor" },
  { id:"T6_SHOES_LEATHER_SET1",name:"Master's Merc Shoes",         cat:"Armor" },
  { id:"T7_SHOES_LEATHER_SET1",name:"Grandmaster's Merc Shoes",    cat:"Armor" },
  { id:"T8_SHOES_LEATHER_SET1",name:"Elder's Merc Shoes",          cat:"Armor" },

  // ── Cloth Armor ──
  { id:"T4_ARMOR_CLOTH_SET1",  name:"Adept's Scholar Robe",        cat:"Armor" },
  { id:"T5_ARMOR_CLOTH_SET1",  name:"Expert's Scholar Robe",       cat:"Armor" },
  { id:"T6_ARMOR_CLOTH_SET1",  name:"Master's Scholar Robe",       cat:"Armor" },
  { id:"T7_ARMOR_CLOTH_SET1",  name:"Grandmaster's Scholar Robe",  cat:"Armor" },
  { id:"T8_ARMOR_CLOTH_SET1",  name:"Elder's Scholar Robe",        cat:"Armor" },
  { id:"T4_HEAD_CLOTH_SET1",   name:"Adept's Scholar Cowl",        cat:"Armor" },
  { id:"T5_HEAD_CLOTH_SET1",   name:"Expert's Scholar Cowl",       cat:"Armor" },
  { id:"T6_HEAD_CLOTH_SET1",   name:"Master's Scholar Cowl",       cat:"Armor" },
  { id:"T7_HEAD_CLOTH_SET1",   name:"Grandmaster's Scholar Cowl",  cat:"Armor" },
  { id:"T8_HEAD_CLOTH_SET1",   name:"Elder's Scholar Cowl",        cat:"Armor" },
  { id:"T4_SHOES_CLOTH_SET1",  name:"Adept's Scholar Sandals",     cat:"Armor" },
  { id:"T5_SHOES_CLOTH_SET1",  name:"Expert's Scholar Sandals",    cat:"Armor" },
  { id:"T6_SHOES_CLOTH_SET1",  name:"Master's Scholar Sandals",    cat:"Armor" },
  { id:"T7_SHOES_CLOTH_SET1",  name:"Grandmaster's Scholar Sandals",cat:"Armor"},
  { id:"T8_SHOES_CLOTH_SET1",  name:"Elder's Scholar Sandals",     cat:"Armor" },

  // ── Enchanted (T6+3 & T8+1..+4 — highest flip margins) ──
  { id:"T6_MAIN_SWORD@3",       name:"Master's Broadsword +3",      cat:"Enchanted" },
  { id:"T6_2H_AXE@3",           name:"Master's Greataxe +3",        cat:"Enchanted" },
  { id:"T6_2H_BOW@3",           name:"Master's Bow +3",             cat:"Enchanted" },
  { id:"T6_MAIN_FIRESTAFF@3",   name:"Master's Fire Staff +3",      cat:"Enchanted" },
  { id:"T6_2H_HOLYSTAFF@3",     name:"Master's Holy Staff +3",      cat:"Enchanted" },
  { id:"T8_MAIN_SWORD@1",       name:"Elder's Broadsword +1",       cat:"Enchanted" },
  { id:"T8_MAIN_SWORD@2",       name:"Elder's Broadsword +2",       cat:"Enchanted" },
  { id:"T8_MAIN_SWORD@3",       name:"Elder's Broadsword +3",       cat:"Enchanted" },
  { id:"T8_MAIN_SWORD@4",       name:"Elder's Broadsword +4",       cat:"Enchanted" },
  { id:"T8_2H_AXE@1",           name:"Elder's Greataxe +1",         cat:"Enchanted" },
  { id:"T8_2H_AXE@4",           name:"Elder's Greataxe +4",         cat:"Enchanted" },
  { id:"T8_2H_BOW@1",           name:"Elder's Bow +1",              cat:"Enchanted" },
  { id:"T8_2H_BOW@4",           name:"Elder's Bow +4",              cat:"Enchanted" },
  { id:"T8_MAIN_FIRESTAFF@1",   name:"Elder's Fire Staff +1",       cat:"Enchanted" },
  { id:"T8_MAIN_FIRESTAFF@4",   name:"Elder's Fire Staff +4",       cat:"Enchanted" },
  { id:"T8_2H_HOLYSTAFF@4",     name:"Elder's Holy Staff +4",       cat:"Enchanted" },
  { id:"T8_MAIN_NATURESTAFF@4", name:"Elder's Nature Staff +4",     cat:"Enchanted" },
  { id:"T8_ARMOR_PLATE_SET1@1", name:"Elder's Soldier Armor +1",    cat:"Enchanted" },
  { id:"T8_ARMOR_PLATE_SET1@4", name:"Elder's Soldier Armor +4",    cat:"Enchanted" },
  { id:"T8_ARMOR_LEATHER_SET1@4",name:"Elder's Merc Jacket +4",     cat:"Enchanted" },
  { id:"T8_ARMOR_CLOTH_SET1@4", name:"Elder's Scholar Robe +4",     cat:"Enchanted" },

  // ── Mounts ──
  { id:"T3_MOUNT_HORSE",         name:"Journeyman's Horse",         cat:"Mounts" },
  { id:"T5_MOUNT_HORSE",         name:"Expert's Horse",             cat:"Mounts" },
  { id:"T7_MOUNT_HORSE",         name:"Grandmaster's Horse",        cat:"Mounts" },
  { id:"T8_MOUNT_HORSE",         name:"Elder's Horse",              cat:"Mounts" },
  { id:"T5_MOUNT_OX",            name:"Expert's Ox",                cat:"Mounts" },
  { id:"T7_MOUNT_OX",            name:"Grandmaster's Ox",           cat:"Mounts" },
  { id:"T8_MOUNT_OX",            name:"Elder's Ox",                 cat:"Mounts" },
  { id:"T5_MOUNT_ARMORED_HORSE", name:"Expert's Armored Horse",     cat:"Mounts" },
  { id:"T8_MOUNT_ARMORED_HORSE", name:"Elder's Armored Horse",      cat:"Mounts" },
  { id:"T5_MOUNT_MULE",          name:"Expert's Mule",              cat:"Mounts" },

  // ── Consumables ──
  { id:"T4_POTION_HEAL",        name:"Adept's Healing Potion",      cat:"Consumables" },
  { id:"T5_POTION_HEAL",        name:"Expert's Healing Potion",     cat:"Consumables" },
  { id:"T6_POTION_HEAL",        name:"Master's Healing Potion",     cat:"Consumables" },
  { id:"T7_POTION_HEAL",        name:"Grandmaster's Healing Potion",cat:"Consumables" },
  { id:"T8_POTION_HEAL",        name:"Elder's Healing Potion",      cat:"Consumables" },
  { id:"T4_POTION_MOB_RESIST",  name:"Adept's Resistance Potion",   cat:"Consumables" },
  { id:"T6_POTION_MOB_RESIST",  name:"Master's Resistance Potion",  cat:"Consumables" },
  { id:"T8_POTION_MOB_RESIST",  name:"Elder's Resistance Potion",   cat:"Consumables" },
  { id:"T4_MEAL_PIE",           name:"Adept's Pie",                 cat:"Consumables" },
  { id:"T6_MEAL_PIE",           name:"Master's Pie",                cat:"Consumables" },
  { id:"T8_MEAL_PIE",           name:"Elder's Pie",                 cat:"Consumables" },
  { id:"T4_MEAL_SALAD",         name:"Adept's Salad",               cat:"Consumables" },
  { id:"T6_MEAL_SALAD",         name:"Master's Salad",              cat:"Consumables" },
  { id:"T8_MEAL_SALAD",         name:"Elder's Salad",               cat:"Consumables" },
  { id:"T4_MEAL_STEW",          name:"Adept's Beef Stew",           cat:"Consumables" },
  { id:"T6_MEAL_STEW",          name:"Master's Beef Stew",          cat:"Consumables" },
  { id:"T8_MEAL_STEW",          name:"Elder's Beef Stew",           cat:"Consumables" },
  { id:"T4_MEAL_SOUP",          name:"Adept's Bean Soup",           cat:"Consumables" },
  { id:"T6_MEAL_SOUP",          name:"Master's Bean Soup",          cat:"Consumables" },
  { id:"T8_MEAL_SOUP",          name:"Elder's Bean Soup",           cat:"Consumables" },
];

// ── SCANNER STATE ──────────────────────────────────────────────

const scannerState = {
  running:    false,
  results:    [],
  progress:   0,
  filterCat:  "All",
  filterType: "all",   // "all" | "flip" | "craft"
  sortBy:     "roi",   // "roi" | "profit"
  lastScanAt: null,
  serverKey:  "europe",
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
  if (mins < 1)    return "< 1m";
  if (mins < 60)   return mins + "m";
  if (mins < 1440) return Math.floor(mins / 60) + "h";
  return Math.floor(mins / 1440) + "d";
}

function profitColor(pct) {
  if (pct >= 30) return "#4ade80";
  if (pct >= 15) return "#a3e635";
  if (pct >= 7)  return "#fbbf24";
  return "#f87171";
}

function ageIsStale(dateStr, maxMins = 120) {
  if (!dateStr) return true;
  const d = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  return (Date.now() - d) / 60000 > maxMins;
}

// ── FLIP ANALYSIS ─────────────────────────────────────────────

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

  // Cheapest sell → buy-from city
  let buyFrom = null, buyFromPrice = Infinity;
  for (const c of cities) {
    if (cityMap[c].sell > 0 && !ageIsStale(cityMap[c].sellAge) && cityMap[c].sell < buyFromPrice) {
      buyFromPrice = cityMap[c].sell;
      buyFrom = c;
    }
  }

  // Most expensive sell (different city) → sell-to city
  let sellTo = null, sellToPrice = 0;
  for (const c of cities) {
    if (c === buyFrom) continue;
    if (cityMap[c].sell > 0 && !ageIsStale(cityMap[c].sellAge) && cityMap[c].sell > sellToPrice) {
      sellToPrice = cityMap[c].sell;
      sellTo = c;
    }
  }

  if (!buyFrom || !sellTo || buyFromPrice <= 0 || sellToPrice <= buyFromPrice) return null;

  const profit    = sellToPrice - buyFromPrice;
  const profitPct = (profit / buyFromPrice) * 100;
  if (profitPct < 3) return null;

  // Check Black Market override
  const bmSell = cityMap["Black Market"]?.sell;
  let bmFlip = null;
  if (bmSell > 0 && bmSell > sellToPrice && buyFrom !== "Black Market") {
    const bmProfit    = bmSell - buyFromPrice;
    const bmProfitPct = (bmProfit / buyFromPrice) * 100;
    if (bmProfitPct > profitPct) {
      bmFlip = { sellTo: "Black Market", sellPrice: bmSell, profit: bmProfit, profitPct: bmProfitPct };
    }
  }

  const best = bmFlip || { sellTo, sellPrice: sellToPrice, profit, profitPct };

  return {
    type:      "flip",
    buyFrom,
    buyPrice:  buyFromPrice,
    sellTo:    best.sellTo,
    sellPrice: best.sellPrice,
    profit:    best.profit,
    profitPct: best.profitPct,
    sellAge:   cityMap[best.sellTo]?.sellAge || cityMap[buyFrom]?.sellAge,
    allCities: cityMap,
  };
}

// ── CRAFT ANALYSIS ────────────────────────────────────────────
// Finds cheapest materials globally → compare total craft cost vs best sell price

function analyzeCraft(itemId, itemRows) {
  const recipe = window.CRAFTING_RECIPES?.[itemId];
  if (!recipe) return null;

  const batchRows = window._scanBatchRows || [];
  let totalMatCost = 0;
  const matSources = [];

  for (const mat of recipe.materials) {
    const matRows = batchRows.filter(r => r.item_id === mat.id);
    let cheapest = Infinity, cheapestCity = null;
    for (const r of matRows) {
      if (r.sell_price_min > 0 && !ageIsStale(r.sell_price_min_date, 240) && r.sell_price_min < cheapest) {
        cheapest     = r.sell_price_min;
        cheapestCity = r.city;
      }
    }
    if (cheapest === Infinity) return null; // missing material
    matSources.push({ id: mat.id, amount: mat.amount, unitPrice: cheapest, city: cheapestCity });
    totalMatCost += cheapest * mat.amount;
  }

  const tax      = totalMatCost * 0.03;
  const costFull = totalMatCost + tax;

  // Best sell city for the crafted item
  let bestSellPrice = 0, bestSellCity = null, bestSellAge = null;
  for (const r of itemRows) {
    if (r.sell_price_min > 0 && !ageIsStale(r.sell_price_min_date, 240) && r.sell_price_min > bestSellPrice) {
      bestSellPrice = r.sell_price_min;
      bestSellCity  = r.city;
      bestSellAge   = r.sell_price_min_date;
    }
  }

  if (!bestSellCity || bestSellPrice <= costFull) return null;

  const profit    = bestSellPrice - costFull;
  const profitPct = (profit / costFull) * 100;
  if (profitPct < 3) return null;

  return {
    type:       "craft",
    buyFrom:    "Global Mats",
    buyPrice:   costFull,
    sellTo:     bestSellCity,
    sellPrice:  bestSellPrice,
    profit,
    profitPct,
    sellAge:    bestSellAge,
    matSources,
    matCost:    totalMatCost,
    tax,
  };
}

// ── BATCH FETCHING ────────────────────────────────────────────

function getMaterialIds(batchItems) {
  const ids = new Set();
  const recipes = window.CRAFTING_RECIPES || {};
  for (const item of batchItems) {
    const recipe = recipes[item.id];
    if (recipe) recipe.materials.forEach(m => ids.add(m.id));
  }
  return [...ids];
}

async function fetchBatch(ids, serverKey) {
  const base   = window.API_BASES?.[serverKey] || "https://europe.albion-online-data.com/api/v2";
  const cities = (window.CITIES || []).join(",");
  const url    = `${base}/stats/prices/${ids.join(",")}.json?locations=${encodeURIComponent(cities)}&qualities=1`;
  try {
    return await window.apiFetch(url, { forceRefresh: true });
  } catch {
    return [];
  }
}

// ── CORE SCAN ─────────────────────────────────────────────────

async function runScan(serverKey, onProgress) {
  const BATCH   = 8;
  const all     = SCAN_ITEMS;
  const results = [];

  for (let i = 0; i < all.length; i += BATCH) {
    if (!scannerState.running) break;

    const batch   = all.slice(i, i + BATCH);
    const itemIds = batch.map(b => b.id);
    const matIds  = getMaterialIds(batch);
    const allIds  = [...new Set([...itemIds, ...matIds])];

    const rows = await fetchBatch(allIds, serverKey);
    window._scanBatchRows = rows;

    for (const item of batch) {
      const itemRows = rows.filter(r => r.item_id === item.id);
      if (!itemRows.length) continue;

      const flip  = analyzeFlip(itemRows);
      const craft = analyzeCraft(item.id, itemRows);

      if (flip)  results.push({ ...flip,  itemId: item.id, itemName: item.name, cat: item.cat });
      // Only push craft if it's meaningfully better than flip or flip doesn't exist
      if (craft && (!flip || craft.profitPct > flip.profitPct * 0.85)) {
        results.push({ ...craft, itemId: item.id, itemName: item.name, cat: item.cat });
      }
    }

    // Sort by chosen metric after every batch
    results.sort((a, b) =>
      scannerState.sortBy === "roi" ? b.profitPct - a.profitPct : b.profit - a.profit
    );

    const pct = Math.round(((i + BATCH) / all.length) * 100);
    onProgress(Math.min(pct, 100), [...results]);

    await new Promise(r => setTimeout(r, 100));
  }

  window._scanBatchRows = null;
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
          <p class="scanner-subtitle">Scans ${SCAN_ITEMS.length} items across all 8 cities — flip <em>and</em> craft opportunities ranked by ROI.</p>
        </div>
        <div class="scanner-controls">
          <select id="scanSortBy" class="scan-select" title="Sort by">
            <option value="roi">Sort: ROI %</option>
            <option value="profit">Sort: Profit ₛ</option>
          </select>
          <select id="scanTypeFilter" class="scan-select" title="Opportunity type">
            <option value="all">All Types</option>
            <option value="flip">🔄 Flips Only</option>
            <option value="craft">⚒ Crafts Only</option>
          </select>
          <button id="scanBtn" class="scan-btn scan-btn-start">▶ Start Scan</button>
        </div>
      </div>

      <div id="scanProgressWrap" class="scan-progress-wrap hidden">
        <div class="scan-progress-track">
          <div id="scanProgressBar" class="scan-progress-bar" style="width:0%"></div>
        </div>
        <span id="scanProgressLabel" class="scan-progress-label">0%</span>
      </div>

      <div class="scan-filter-row" id="scanCatChips">
        ${cats.map(c => `<button class="scan-chip ${c==="All"?"active":""}" data-cat="${c}">${c}</button>`).join("")}
      </div>
    </div>

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
        <span class="scan-stat-label">Best ROI</span>
        <span class="scan-stat-val" id="scanBestRoi">—</span>
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

    <div id="scanResults">
      <div class="scan-empty" id="scanEmpty">
        <div class="scan-empty-icon">🔥</div>
        <div class="scan-empty-title">Ready to scan</div>
        <div class="scan-empty-sub">Hit <strong>Start Scan</strong> to find live flip <em>and</em> craft opportunities across ${SCAN_ITEMS.length} items and 8 cities. Takes ~30s.</div>
      </div>
      <div id="scanTable" class="hidden"></div>
    </div>
  `;

  host.querySelectorAll(".scan-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      host.querySelectorAll(".scan-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      scannerState.filterCat = chip.dataset.cat;
      renderScanResults(scannerState.results);
      updateScanStats(scannerState.results);
    });
  });

  document.getElementById("scanSortBy")?.addEventListener("change", e => {
    scannerState.sortBy = e.target.value;
    scannerState.results.sort((a, b) =>
      scannerState.sortBy === "roi" ? b.profitPct - a.profitPct : b.profit - a.profit
    );
    renderScanResults(scannerState.results);
  });

  document.getElementById("scanTypeFilter")?.addEventListener("change", e => {
    scannerState.filterType = e.target.value;
    renderScanResults(scannerState.results);
    updateScanStats(scannerState.results);
  });

  document.getElementById("scanBtn").addEventListener("click", toggleScan);
}

function toggleScan() {
  scannerState.running ? stopScan() : startScan();
}

async function startScan() {
  scannerState.running   = true;
  scannerState.results   = [];
  scannerState.progress  = 0;
  scannerState.serverKey = document.getElementById("server")?.value || "europe";

  const btn      = document.getElementById("scanBtn");
  const progWrap = document.getElementById("scanProgressWrap");
  const progBar  = document.getElementById("scanProgressBar");
  const progLbl  = document.getElementById("scanProgressLabel");
  const statsBar = document.getElementById("scanStats");
  const empty    = document.getElementById("scanEmpty");
  const table    = document.getElementById("scanTable");

  if (btn)      { btn.textContent = "■ Stop"; btn.classList.replace("scan-btn-start","scan-btn-stop"); }
  if (progWrap) progWrap.classList.remove("hidden");
  if (statsBar) statsBar.classList.remove("hidden");
  if (empty)    empty.classList.add("hidden");
  if (table)    table.classList.remove("hidden");

  await runScan(scannerState.serverKey, (pct, results) => {
    scannerState.progress = pct;
    scannerState.results  = results;
    if (progBar) progBar.style.width = pct + "%";
    if (progLbl) progLbl.textContent = pct + "%";
    renderScanResults(results);
    updateScanStats(results);
  });

  scannerState.running    = false;
  scannerState.lastScanAt = new Date();
  if (btn)     { btn.textContent = "↻ Re-scan"; btn.classList.replace("scan-btn-stop","scan-btn-start"); }
  if (progBar) progBar.style.width = "100%";
  if (progLbl) progLbl.textContent = "Done ✓";
  updateScanStats(scannerState.results);
}

function stopScan() {
  scannerState.running = false;
  const btn = document.getElementById("scanBtn");
  if (btn) { btn.textContent = "▶ Start Scan"; btn.classList.replace("scan-btn-stop","scan-btn-start"); }
}

function filterResults(results) {
  let r = results;
  if (scannerState.filterCat !== "All")  r = r.filter(x => x.cat === scannerState.filterCat);
  if (scannerState.filterType !== "all") r = r.filter(x => x.type === scannerState.filterType);
  return r;
}

function updateScanStats(results) {
  const visible  = filterResults(results);
  const byProfit = [...visible].sort((a,b) => b.profit - a.profit);
  const byRoi    = [...visible].sort((a,b) => b.profitPct - a.profitPct);

  const setEl = (id, val, color) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    if (color !== undefined) el.style.color = color || "";
  };

  setEl("scanCount",   visible.length || "—");
  setEl("scanBest",    byProfit[0] ? scanFmt(byProfit[0].profit) + " s" : "—");
  setEl("scanBestRoi", byRoi[0]    ? byRoi[0].profitPct.toFixed(1) + "%" : "—",
        byRoi[0] ? profitColor(byRoi[0].profitPct) : "");
  if (visible.length) {
    const avg = visible.reduce((s, r) => s + r.profitPct, 0) / visible.length;
    setEl("scanAvgRoi", avg.toFixed(1) + "%", profitColor(avg));
  } else {
    setEl("scanAvgRoi", "—", "");
  }
  if (scannerState.lastScanAt) setEl("scanLastTime", scannerState.lastScanAt.toLocaleTimeString());
}

function renderScanResults(results) {
  const table = document.getElementById("scanTable");
  if (!table) return;

  const visible = filterResults(results);

  if (!visible.length) {
    table.innerHTML = `<div class="scan-no-results">No opportunities found yet — scan in progress…</div>`;
    return;
  }

  const rows = visible.slice(0, 100).map((r, idx) => {
    const meta      = window.CITY_META || {};
    const fromColor = r.type === "craft" ? "#e5b25d" : (meta[r.buyFrom]?.color || "#94a3b8");
    const toColor   = meta[r.sellTo]?.color || "#94a3b8";
    const pColor    = profitColor(r.profitPct);
    const icon      = window.iconUrl ? window.iconUrl(r.itemId, 1, 1) : "";
    const rankLabel = idx === 0 ? "🏆" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
    const ageStr    = r.sellAge ? scanAge(r.sellAge) : "";
    const isBM      = r.sellTo === "Black Market";
    const typeBadge = r.type === "craft"
      ? `<span class="scan-type-badge scan-type-craft">⚒ Craft</span>`
      : `<span class="scan-type-badge scan-type-flip">🔄 Flip</span>`;
    const buyLabel  = r.type === "craft" ? "Mat Cost" : "Buy";

    return `
      <div class="scan-row" data-item="${r.itemId}">
        <div class="scan-rank">${rankLabel}</div>
        <div class="scan-item-cell">
          ${icon ? `<img src="${icon}" class="scan-item-icon" onerror="this.src='${window.FALLBACK_ICON||""}'" alt="" />` : ""}
          <div class="scan-item-info">
            <div class="scan-item-name">${r.itemName}</div>
            <div class="scan-item-cat">${r.cat}${ageStr ? ` · ${ageStr} ago` : ""} ${typeBadge}</div>
          </div>
        </div>
        <div class="scan-route">
          <span class="scan-city" style="color:${fromColor}">${r.buyFrom}</span>
          <span class="scan-arrow">→</span>
          <span class="scan-city ${isBM?"scan-bm":""}" style="color:${toColor}">${r.sellTo}</span>
        </div>
        <div class="scan-prices">
          <div class="scan-price-row">
            <span class="scan-price-label">${buyLabel}</span>
            <span class="scan-price-val">${scanFmt(r.buyPrice)}</span>
          </div>
          <div class="scan-price-row">
            <span class="scan-price-label">Sell</span>
            <span class="scan-price-val">${scanFmt(r.sellPrice)}</span>
          </div>
        </div>
        <div class="scan-profit-cell">
          <div class="scan-profit" style="color:${pColor}">+${scanFmt(r.profit)}</div>
          <div class="scan-roi"   style="color:${pColor}">${r.profitPct.toFixed(1)}% ROI</div>
        </div>
        <div class="scan-action-cell">
          <button class="scan-view-btn" onclick="scanViewItem('${r.itemId}','${r.itemName.replace(/'/g,"\\'")}')">View →</button>
          <button class="scan-save-btn" title="Watch this item" onclick="dashboardAddItem('${r.itemId}','${r.itemName.replace(/'/g,"\\'")}')">★</button>
        </div>
      </div>`;
  }).join("");

  table.innerHTML = `
    <div class="scan-table-header">
      <span>Rank</span><span>Item</span><span>Route</span>
      <span>Prices</span><span>Profit</span><span></span>
    </div>
    <div class="scan-rows">${rows}</div>
    ${visible.length > 100 ? `<div class="scan-more">Showing top 100 of ${visible.length} opportunities</div>` : ""}
  `;
}

window.scanViewItem = function(itemId, itemName) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelector('[data-tab="market"]')?.classList.add("active");
  document.querySelectorAll(".tab-section").forEach(s => s.classList.add("hidden"));
  document.getElementById("tab-market")?.classList.remove("hidden");
  if (window.selectItem) window.selectItem(itemId, itemName);
};

// ── INIT ──────────────────────────────────────────

window.initScannerTab = function() {
  const host = document.getElementById("tab-scanner");
  if (!host || host.dataset.loaded) return;
  host.dataset.loaded = "1";
  renderScannerTab();
};

// Expose for other modules
window.SCAN_ITEMS   = SCAN_ITEMS;
window.scannerState = scannerState;


window.initScannerTab = function() {
  const host = document.getElementById("tab-scanner");
  if (!host || host.dataset.loaded) return;
  host.dataset.loaded = "1";
  renderScannerTab();
};

// Expose for other modules
window.SCAN_ITEMS   = SCAN_ITEMS;
window.scannerState = scannerState;
