# ⚔ Albion Live Market Tracker

> A fast, competitor-grade market & crafting tool for **Albion Online** — live silver prices, global crafting profit routing, Black Market flip analysis, PvP kill tracking, and gold prices across all cities and servers.

🌐 **Live Demo:** [askar74.github.io/albion-market](https://askar74.github.io/albion-market/)

---

## ✨ Features

### 📈 Market Tab

| Feature | Detail |
|---------|--------|
| **Live silver prices** | All 8 cities: Caerleon, Bridgewatch, Lymhurst, Fort Sterling, Martlock, Thetford, Brecilien, Black Market |
| **Smart fuzzy search** | Find any item by name or raw ID (e.g. `T8_2H_BOW`, `T6_BAG`) with 80ms debounce |
| **Tier & enchant badges** | Dropdown shows tier pill, enchantment colour (+1 green / +2 cyan / +3 purple / +4 gold) and craftable badge per result |
| **Auto-chip sync** | Clicking any search result instantly snaps the Tier and Enchant filter chips to match — no manual re-selection |
| **Single-select filters** | Tier and Enchant chips behave as radio buttons — clicking T8 deselects T4, clicking +2 deselects +0 |
| **Enchant glow borders** | Hero item image updates with Albion-accurate coloured glow border for each enchant level |
| **Instant stale-clear** | Previous results replaced by animated skeletons the moment any filter changes — no ghost data |
| **City cards** | Ranked by cheapest sell or highest buy order, with age indicator and rank badge |
| **Best Deals panel** | Cheapest Sell, Highest Buy Order, Best Flip Route — calculated automatically from live data |
| **Server selector** | Switch between Americas / Asia / Europe — cache is busted on every switch |
| **Auto-refresh** | 15s / 30s / 60s / 5m configurable interval with live countdown |
| **Manual refresh** | ↻ button busts the price cache and forces a fresh API call, ignores in-flight requests |
| **Race-condition safe** | Sequence counter (`_fetchSeq`) ensures only the latest filter selection's response is rendered |

#### ⚔ Black Market Route System

Calculates the best flip routes from royal cities to the Black Market using live price data:

- 🔴 **Danger's Way** — best profit route across all cities including Caerleon & Black Market
- 🟢 **Safe Way** — best profit among royal cities only (no open-world PvP)
- Full city comparison table: sell price, buy order price, spread per city

| City | Travel Time | Risk |
|------|-------------|------|
| Thetford | ~13 min | 🔴 High |
| Bridgewatch | ~12 min | 🔴 High |
| Lymhurst | ~18 min | 🟡 Medium |
| Brecilien | ~25 min | 🟡 Medium |
| Martlock | ~20 min | 🟢 Low |
| Fort Sterling | ~22 min | 🟢 Low |

---

### ⚒ Crafting Tab

A full competitor-grade crafting profitability engine — matching and exceeding albionfreemarket.com and onelifegaming in key areas:

| Feature | Detail |
|---------|--------|
| **🌍 Global material sourcing** | Finds the cheapest price for each material independently across all 8 cities — the highest-value mode |
| **📍 Per-city mode** | Classic single-city analysis: buy mats and sell in the same city |
| **Buy order toggle** | Switch material sourcing between sell orders (immediate) and buy orders (cheaper, wait required) |
| **Crafting focus return rate** | Slider from 0% to 47.9% (max specialization) — reduces effective material cost on every calculation |
| **📈 Price history sparkline** | 14-point SVG trend chart loaded asynchronously after the calculator renders — shows low, high and % change |
| **Global Best Route card** | Banner showing the optimal "buy globally → sell in [city]" route with profit and ROI at a glance |
| **Smart Recommendations** | Auto-loads the top 6 most profitable crafts right now, ranked by Efficiency Score |
| **AI market tags** | Best ROI / Fast-selling / Low Competition / High Throughput / Top Efficiency per recipe |
| **Per-craft/sec/min breakdown** | Profit scaled by craft time, shown at 3 granularities |
| **Efficiency Score (0–100)** | Composite score: ROI weight + throughput weight + market freshness |
| **All-cities comparison table** | Mat cost, tax, sell price, profit, ROI %, /sec, /min, score, age, verdict badge per city |
| **Verdict badges** | 🏆 Best / ✓ Good / OK / Loss — colour-coded per city row |
| **Adjustable tax slider** | 0–25% crafting station tax |
| **Quantity multiplier** | ×1 / ×10 / ×100 / ×1,000 — scales all costs, profits and material quantities |
| **Effective qty display** | When return rate > 0, shows both raw and effective material amounts |
| **Cross-tab navigation** | "⚒ View Recipe" button in Market tab jumps directly to the correct recipe in Crafting tab |
| **↻ Refresh integration** | Header refresh button also refreshes crafting prices when Crafting tab is active |
| **T2–T8 tier filter** | Refining recipes at all tiers (including Novice's T2 / Journeyman's T3) are now reachable |
| **Auto live-refresh** | Crafting prices auto-update every 30s with countdown, same as market tab |

**Recipes covered:** Refining (Planks, Steel Bar, Cloth, Leather, Stone Block — all tiers), Weapons (Broadsword, Claymore, Greataxe, Great Hammer, Pike, Bow, Heavy Crossbow, Fire/Holy/Nature/Arcane Staves), Armor (Plate / Leather / Cloth sets — head, chest, boots), Bags

---

### 💰 Gold Tab

- Live gold price in silver (real-time from AODP)
- 48-hour price change (absolute + percentage)
- 48-hour price range (min / max)
- Recent 24-entry price history table with timestamps

---

### ⚔ PvP Tab

- Player kill/death feed lookup by player or guild name
- Gear viewer — see every item your target was wearing during each fight
- Kill / Death / Assist badge per event
- Fame value display per kill event
- Filter by kills, deaths, or all events

---

## 🚀 Getting Started

No installation, no build step, no dependencies to install.

**Run locally:**
```bash
git clone https://github.com/Askar74/albion-market.git
cd albion-market
# Open index.html in your browser — done.
```

**Or visit the live site:**
👉 [askar74.github.io/albion-market](https://askar74.github.io/albion-market/)

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Structure |
| Tailwind CSS (CDN) | Styling & layout |
| Vanilla JavaScript | All logic — zero frameworks |
| [Fuse.js v7](https://fusejs.io/) | Fuzzy item search with score-based ranking |
| [Albion Online Data Project API](https://www.albion-online-data.com/) | Live market prices, history, gold data |
| Albion Render API | Item icons (all tiers + enchant levels) |
| Cloudflare Workers | CORS proxy for gameinfo API (PvP tab) |

---

## 🏗 Architecture

```
index.html      — shell, tab nav, header, filter bar
app.js          — market search, price fetching, city cards, trading routes, state management
crafting.js     — recipe definitions, profitability engine, global sourcing, sparklines
pvp.js          — kill feed, player/guild lookup, gear display
items.js        — bundled item database (extended at runtime via ao-bin-dumps)
styles.css      — custom component CSS (Tailwind handles utilities)
```

**Key design decisions:**
- **Pure static site** — no server, no database, no build step; hosts for free on GitHub Pages
- **3-minute API cache** (`Map`-based, keyed by URL) with manual cache-bust on ↻ press
- **Sequence counter** (`_fetchSeq`) prevents race conditions when rapidly switching filters
- **`sessionStorage`** caches the 7,000+ item extended database for 24h (avoids re-downloading 7 MB every visit)
- **Single-select chips** for Tier and Enchant (radio behaviour) so `getHeroItemId()` always has exactly one tier and one enchant to work with

---

## 📡 API Reference

All data comes from free, public, community-maintained sources — no scraping, no ToS violations.

| Endpoint | Used for |
|----------|----------|
| `{server}.albion-online-data.com/api/v2/stats/prices/{ids}.json` | Live market prices |
| `{server}.albion-online-data.com/api/v2/stats/history/{id}.json` | 14-day price history (sparkline) |
| `{server}.albion-online-data.com/api/v2/stats/gold.json` | Gold price feed |
| `render.albiononline.com/v1/item/{id}.png?quality={q}&enchantment={e}` | Item icons |
| `raw.githubusercontent.com/broderickhyman/ao-bin-dumps/…/items.json` | Extended item database (7,000+ items) |
| `gameinfo.albiononline.com` (via Cloudflare proxy) | PvP kill feed |

---

## ⚠ Disclaimer

This project is **not affiliated with, endorsed by, or connected to Sandbox Interactive GmbH** in any way. Albion Online is a registered trademark of Sandbox Interactive GmbH.

Data is provided by the community-run [Albion Online Data Project](https://www.albion-online-data.com/). Crafting profit estimates are based on raw market prices and configurable return rates — actual profit depends on your crafting specialization, city bonuses, focus usage, and market fluctuations at the time of crafting.

---

## 🤝 Contributing

Pull requests are welcome! If you find a bug or want to suggest a feature, open an issue on GitHub.

---

## ⭐ Support

If this tool helps your silver-making, give it a **star** on GitHub — it helps others find it!

[![GitHub stars](https://img.shields.io/github/stars/Askar74/albion-market?style=social)](https://github.com/Askar74/albion-market/stargazers)
