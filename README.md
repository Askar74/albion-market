# ⚔ Albion Live Market Tracker

> A fast, real-time market tool for **Albion Online** players — track prices, calculate crafting profits, find Black Market flip routes, and monitor gold prices across all cities.

🌐 **Live Demo:** [askar74.github.io/albion-market](https://askar74.github.io/albion-market/)

---

## ✨ Features

### 📈 Market Tab
- **Live silver prices** across all 8 Albion cities (Caerleon, Bridgewatch, Lymhurst, Fort Sterling, Martlock, Thetford, Brecilien, Black Market)
- **Fuzzy search** — find any item by name or raw ID (e.g. `T8_2H_BOW`)
- **City cards** ranked by cheapest sell or highest buy order
- **Best Deals panel** — Cheapest Sell, Highest Buy Order, and Best Flip Route calculated automatically
- **⚔ Black Market Routes** — compares all royal cities for flipping to the Black Market with:
  - 🔴 **Danger's Way** — highest profit route regardless of risk
  - 🟢 **Safe Way** — best profit among low/medium risk routes
  - Full comparison table with profit, ROI, travel time, and risk level
- Filter by **City, Tier, Enchantment, Quality**
- Auto-refresh every 15s / 30s / 60s / 5m (configurable)
- Server selector: **Americas / Asia / Europe**

### ⚒ Crafting Tab
- **Real-time crafting profitability** calculator for refining, weapons, armor, and bags
- **Smart Recommendations** — auto-loads the top 6 most profitable crafts right now
- Per-craft, per-second, per-minute profit breakdown
- **Efficiency Score** (0–100) based on ROI, speed, and market freshness
- All-cities comparison table with verdict badges (🏆 Best / ✓ Good / Loss)
- Adjustable crafting tax slider (0–25%)
- Quantity multiplier (×1, ×10, ×100, ×1000)

### 💰 Gold Tab
- Live gold price in silver
- 48-hour change, percentage change, and price range
- Recent price history table

---

## 🚀 Getting Started

No installation needed. This is a pure HTML/CSS/JS project.

**Run locally:**
1. Clone the repo:
   ```bash
   git clone https://github.com/Askar74/albion-market.git
   ```
2. Open `index.html` in your browser — that's it!

**Or just visit the live site:**
👉 [askar74.github.io/albion-market](https://askar74.github.io/albion-market/)

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5 | Structure |
| Tailwind CSS (CDN) | Styling & layout |
| Vanilla JavaScript | All logic, no frameworks |
| [Fuse.js](https://fusejs.io/) | Fuzzy item search |
| [Albion Online Data Project API](https://www.albion-online-data.com/) | Live market prices & gold data |
| Albion Render API | Item icons |

---

## 🗺 Black Market Route System

The app calculates the best flip routes from royal cities to the **Black Market** using live price data, estimated travel times, and risk scoring:

| City | Travel Time | Risk |
|------|------------|------|
| Thetford | ~13 min | 🔴 High |
| Bridgewatch | ~12 min | 🔴 High |
| Lymhurst | ~18 min | 🟡 Medium |
| Brecilien | ~25 min | 🟡 Medium |
| Martlock | ~20 min | 🟢 Low |
| Fort Sterling | ~22 min | 🟢 Low |

---

## 📡 Data Sources

- **Market prices & gold:** [Albion Online Data Project](https://www.albion-online-data.com/) — free community API
- **Item icons:** Albion Online Render API (`render.albiononline.com`)

---

## ⚠ Disclaimer

This project is **not affiliated with, endorsed by, or connected to Sandbox Interactive GmbH** in any way. Albion Online is a registered trademark of Sandbox Interactive GmbH.

Data is provided by the community-run [Albion Online Data Project](https://www.albion-online-data.com/). Crafting profit estimates are based on raw material costs and do not account for crafting focus, city bonuses, or return rates.

---

## 🤝 Contributing

Pull requests are welcome! If you find a bug or want to suggest a feature, open an issue.

---

## ⭐ Support

If this tool helps your silver-making, consider giving it a **star** on GitHub — it helps others find it!

[![GitHub stars](https://img.shields.io/github/stars/Askar74/albion-market?style=social)](https://github.com/Askar74/albion-market/stargazers)
