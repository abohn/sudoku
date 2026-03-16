# CTC Puzzle Database

A searchable, filterable archive of [Cracking the Cryptic](https://www.youtube.com/@CrackingTheCryptic) logic puzzles — find the exact puzzle type you want to solve and jump straight to the video.

**Live site:** https://abohn.github.io/sudoku/

---

## Using the site

### Browsing and filtering

The sidebar lets you narrow down puzzles in multiple ways at once:

- **Search** — type any part of a puzzle title or setter name to filter instantly.
- **Watchlist only** — show only puzzles you've saved to your watchlist.
- **Difficulty** — filter by Easy / Medium / Hard / Brutal. Difficulty is estimated from solve duration and title keywords (see *How difficulty works* below).
- **Solve time** — filter by how long the solve takes: ≤30 min, 30–60 min, 60–90 min, or 90+ min. Handy when you only have a short window.
- **Rules** — click one or more rule tags (Arrow, Thermo, Renban, etc.) to find puzzles with those constraints. When multiple rules are selected, toggle **All (AND)** / **Any (OR)** to control matching.
- **Setter** — filter to puzzles by a specific puzzle constructor.

Filters combine. For example: *Hard + Arrow + Killer + ≤60 min* gives you a very specific shortlist.

Any active filter combination is reflected in the URL, so you can **bookmark or share** an exact filtered view.

### Sorting

Use the **Date / Most viewed / Solve time / Difficulty** dropdown in the header, with the **↑ / ↓** toggle for ascending or descending order.

### Has puzzle link

Check **Has puzzle link** to show only puzzles that have an associated SudokuPad link. This means you can open the grid yourself and solve along — or solve it independently before watching.

### Watch vs. Solve

Each puzzle card has two action buttons:

- **Watch** — opens the YouTube video from the beginning.
- **Solve** — opens the YouTube video starting at the moment the puzzle solve begins (skipping the rules explanation). Only shown when a puzzle link exists.

> **Why no direct link to the puzzle grid?**
> We deliberately route through YouTube rather than linking directly to the SudokuPad puzzle. Cracking the Cryptic is a small team that depends on YouTube views to sustain the channel. Watching the video — even for a few seconds — supports them. If you want to solve the puzzle blind, open the video, note the SudokuPad link in the description, and close the video before watching any of the solve.

### Personal tracking

All tracking is saved in your browser (localStorage) — no account needed, nothing is sent anywhere.

| Button | What it does |
|--------|-------------|
| **★ / ☆** | Toggle a puzzle as a favorite |
| **Save / Saved** | Add or remove from your watchlist ("want to solve later") |
| **Completed / ✓ Completed** | Mark a puzzle as solved |

Use **Hide completed** (top of the results area) to remove finished puzzles from view and focus on what's next.

### Random puzzle

Click **Random** in the header to pick a random puzzle from whatever filters are currently active. Great for when you want a surprise within a specific style (e.g. random Hard Thermo puzzle).

### Stats

Click **Stats** in the header to see a personal dashboard: total completed, average solve time, completions by month, difficulty distribution, and your most-solved rule types.

---

## How difficulty works

Difficulty is an estimate (0–10 scale), displayed as:

| Label | Score range |
|-------|-------------|
| Easy | 0 – 2.9 |
| Medium | 3.0 – 5.4 |
| Hard | 5.5 – 7.4 |
| Brutal | 7.5 – 10 |

**Primary signal:** solve duration (total video length minus the timestamp when the solve begins, parsed from YouTube chapter markers). Longer solves score higher.

**Adjustment:** title keywords like "brutal", "nightmare", or "easy", "gentle" shift the score ±2 points.

This is a heuristic, not a ground truth — treat it as a rough guide.

---

## How rule detection works

Each video description is matched against ~30 canonical rule definitions using regex patterns. Rules found in ≤ 3 videos are flagged **Rare** and grouped separately in the sidebar.

| Rule | Example triggers |
|------|-----------------|
| Arrow | `arrow sudoku` |
| German Whispers | `german whispers`, `green line` |
| Thermometer | `thermo`, `thermometer` |
| Renban | `renban` |
| Fog of War | `fog of war` |
| Killer | `killer sudoku`, `killer cages` |

Patterns are evaluated in specificity order so "German Whispers" is matched before the generic "Whispers" catch-all.

---

## Developer docs

### Prerequisites

- Python 3.12+
- Node 20+
- A YouTube Data API v3 key

### Setup

```bash
cp .env.example .env
# Edit .env and add your YOUTUBE_API_KEY

python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Crawl videos

```bash
python -m app.crawler.run              # last 3 months (default)
python -m app.crawler.run --months 6
python -m app.crawler.run --all        # full history (~3,000 videos)
python -m app.crawler.run --limit 20   # quick smoke test
```

### Export static data and run the frontend

```bash
python scripts/export_static.py        # writes frontend/public/data.json

cd frontend
npm install
npm run dev                            # http://localhost:5173
```

### Hiding non-puzzle videos

Occasionally the CTC channel publishes videos that aren't puzzle solves (video game playthroughs, app promos, etc.). These can be hidden from the archive without deleting them from the database:

```bash
# Hide one or more videos by YouTube ID
python -m app.crawler.manage hide <youtube_id> [<youtube_id> ...]

# Undo a hide
python -m app.crawler.manage unhide <youtube_id>

# List all currently hidden videos
python -m app.crawler.manage list-hidden
```

Hidden videos are excluded from `data.json` on the next export but remain in the database. Re-crawling will not un-hide them. After hiding, re-export:

```bash
python scripts/export_static.py
```

### Full rebuild from scratch

```bash
./scripts/rebuild.sh
```

Deletes the database, runs a full crawl, and exports the static data file.

### GitHub Actions

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `crawl.yml` | Weekly (Monday 06:00 UTC) or manual | Crawls new videos, exports `data.json`, commits |
| `deploy.yml` | Push to `main` touching `frontend/` | Builds frontend, deploys to GitHub Pages |

Add `YOUTUBE_API_KEY` as a repository secret. Enable GitHub Pages (Settings → Pages → Source: GitHub Actions) on first setup.

### YouTube API key

1. Go to https://console.cloud.google.com
2. Create a project → **APIs & Services → Library** → "YouTube Data API v3" → Enable
3. **Credentials → Create Credentials → API key**

Free quota: **10,000 units/day**. Crawling 100 videos costs ~4 units.

### Project structure

```
app/
  crawler/
    youtube.py       YouTube Data API v3 client
    rule_parser.py   Rule detection, setter extraction, difficulty scoring
    sudokupad.py     SudokuPad puzzle metadata fetcher
    run.py           CLI entry point
  api/
    puzzles.py       GET /api/puzzles
    rules.py         GET /api/rules
  models.py          SQLAlchemy ORM models
  rules_data.py      Rule definitions (single source of truth)
frontend/
  public/
    data.json        Pre-exported static data (generated by export_static.py)
  src/
    api.ts           Client-side filtering/sorting/pagination
    pages/
      Home.tsx       Main browse page
      Stats.tsx      Personal stats page
    components/
      PuzzleCard.tsx
      RuleFilter.tsx
    hooks/
      useUserData.ts localStorage persistence (favorites, completed, watchlist)
scripts/
  export_static.py   DB → data.json exporter
  rebuild.sh         Full rebuild script
```
