# TradeLab — Day Trading Study & Practice Platform

A fully **offline** progressive web app (PWA) for studying and practicing day trading.
No installs, no build step, no accounts, no external requests — everything runs locally
and all your data stays on your device.

## Use it

**On the web / install as an app:** open the hosted URL (see *Hosting* below), then:

- **Android (Chrome):** menu ⋮ → *Add to Home screen* → *Install*
- **iPhone/iPad (Safari):** Share □↑ → *Add to Home Screen*
- **Desktop (Chrome/Edge):** click the install icon in the address bar

Once installed it launches full-screen from its own icon and **works with no
internet** — the service worker keeps a complete copy on the device.

**Straight from the folder:** double-click `index.html` — everything works from disk.

**Local server:** `python -m http.server 4173` in this folder → <http://127.0.0.1:4173>.

> Data is saved in the browser's localStorage **per origin** — the hosted app, the
> `file://` copy and a local server each keep separate data. Use **Backup & Sync**
> (below) to move data between them or between devices.

## Keeping phone and computer in sync

TradeLab stays offline — data only travels when you carry it. The **Backup & Sync**
section gives you:

- **Backup file** — export everything (journal, quiz scores, checklist history,
  settings) to a JSON file; import it on any device with *Replace* or *Merge*.
- **Sync code** — generate a text code, send it to yourself (WhatsApp, email, notes
  app…), paste it on the other device and *Merge*. Trades are matched by id, best quiz
  scores win, and merging twice is harmless.

## What's inside

| Section | What it does |
|---|---|
| **Dashboard** | Live ET market clock & session status (works offline — NYSE holidays through 2027 built in), intraday volatility windows, recurring economic events, performance snapshot |
| **Strategy Library** | Three full playbooks — Opening Range Breakout, Pullback, Scalping — with annotated chart diagrams, setup criteria, entry/stop/exit rules, worked examples, mistakes, and printable quick-reference cards |
| **Education Hub** | Technical analysis basics, a 12-pattern candlestick gallery, risk management math, trading psychology protocols, market sessions & the volume U-curve |
| **Trade Journal** | Log trades (entry/exit/stop/fees/notes), 11 live stats (win rate, profit factor, expectancy, realized R, max drawdown…), equity curve + 3 more charts, filters, CSV/JSON export & import |
| **Interactive Tools** | Position-size calculator, breakeven calculator, Monte Carlo P/L simulator, interactive volume-profile explainer |
| **Pre-Market Checklist** | An 18-item daily routine with per-day persistence and 7-day history, plus news-scanning tips and per-strategy screener criteria |
| **Quiz & Tests** | Six banks / 60 questions: strategy rules, candlestick pattern recognition, risk math scenarios, psychology judgment — scores saved |
| **Backup & Sync** | Full-device backup file + copy-paste sync codes for moving data between devices |

**Bonus — TradingView indicator:** [pine/tradelab-day-trader.pine](pine/tradelab-day-trader.pine)
is a Pine Script v5 overlay implementing the app's ORB playbook on real charts
(opening range, volume-confirmed breakouts, swing S/R, 2R/3R trade lines, position-size
table, 6 alert conditions). Paste it into TradingView's Pine Editor — install steps are
in the file header.

## Hosting your own copy

The app is pure static files — any static host works. For GitHub Pages:

1. Create a **public** repo (e.g. `tradelab`) on github.com.
2. Push this folder to it (`main` branch).
3. Repo → *Settings* → *Pages* → Source: *Deploy from a branch* → `main` / `/ (root)`.
4. Your app appears at `https://<username>.github.io/tradelab/` in a minute or two.

Everything uses relative paths, so the subpath just works. When you update files,
also bump `VERSION` in `sw.js` — that's what tells installed apps to fetch the update.

## Tips

- **Theme:** dark/light toggle top right; your choice persists (and follows the OS
  preference until you choose).
- **Print:** every strategy guide and lesson prints clean — navigation stripped,
  ink-friendly palette forced.
- **Try it out:** an empty journal offers *Load sample trades* so you can explore the
  stats and charts before logging real ones.

## Tech notes

Vanilla HTML/CSS/JS, classic scripts (no modules — that's what keeps `file://` working).
`js/app.js` (router, theme, market clock, helpers) · `js/charts.js` (tiny SVG chart
library) · `js/data/*.js` (strategy & education content as data) ·
`js/journal|tools|checklist|quiz|backup.js` (feature modules) · `sw.js` (offline cache)
· `manifest.webmanifest` + `icons/` (installability). Theming is pure CSS variables on
`<html data-theme>`, including all inline SVG.

---

*Educational purposes only — not financial advice.*
