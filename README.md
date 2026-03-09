# CTC Puzzle Database

A searchable database of Cracking the Cryptic sudoku puzzles, filterable by rule type.

## Quick start (local)

### 1. Prerequisites

- Python 3.12+
- Node 20+
- A YouTube Data API v3 key (see below)

### 2. Environment

```bash
cp .env.example .env
# Edit .env and paste your YOUTUBE_API_KEY
```

### 3. Backend

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --reload
# API available at http://localhost:8000
# Auto-docs at   http://localhost:8000/docs
```

### 4. Crawl some videos

```bash
# Activate the venv first, then:

# Crawl the last 3 months (default)
python -m app.crawler.run

# Crawl the last 6 months
python -m app.crawler.run --months 6

# Crawl everything (3,000+ videos — use sparingly)
python -m app.crawler.run --all

# Quick test: only 20 videos
python -m app.crawler.run --limit 20
```

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:5173
```

---

## YouTube API key

1. Go to https://console.cloud.google.com
2. Create a project
3. **APIs & Services → Library** → search "YouTube Data API v3" → Enable
4. **APIs & Services → Credentials → Create Credentials → API key**
5. (Optional) Restrict the key to YouTube Data API v3

Free quota: **10,000 units/day**. Crawling 100 videos costs ~4 units.

---

## Scheduled crawling

To keep the database up to date, run the crawler periodically. Example cron (daily at 3 AM):

```cron
0 3 * * * cd /path/to/sudoku && .venv/bin/python -m app.crawler.run --months 1
```

Or use a GitHub Actions scheduled workflow if deploying to a server.

---

## Deployment (Docker)

```bash
cp .env.example .env
# Fill in YOUTUBE_API_KEY in .env

docker compose up --build -d
# Frontend: http://your-server
# Backend:  http://your-server/api
```

The `data/` directory containing the SQLite database is mounted as a volume and persists across container restarts.

---

## Project structure

```
sudoku/
  app/
    main.py            FastAPI app + rule seed data
    database.py        SQLAlchemy engine + session
    models.py          ORM models (Video, Rule, VideoRule)
    schemas.py         Pydantic response schemas
    api/
      puzzles.py       GET /api/puzzles  (search + filter)
      rules.py         GET /api/rules    (all rules with counts)
    crawler/
      youtube.py       YouTube Data API v3 client
      rule_parser.py   Rule detection + helper parsers
      run.py           CLI entry point
  frontend/
    src/
      api.ts           Fetch wrappers
      types.ts         TypeScript interfaces
      pages/Home.tsx   Main page
      components/
        RuleFilter.tsx  Sidebar filter panel
        PuzzleCard.tsx  Puzzle grid card
  Dockerfile           Backend image
  docker-compose.yml   Full stack orchestration
  requirements.txt
```

---

## How rule detection works

Each video description is matched against a dictionary of ~30 canonical rules using regex patterns. For example:

| Rule | Triggers on |
|------|-------------|
| Arrow | `\barrow\b` |
| German Whispers | `german whispers`, `green line` |
| Thermometer | `thermo`, `thermometer` |
| Renban | `renban` |
| Fog of War | `fog of war`, `fog` |

Rules found in ≤ 3 videos are flagged as **rare** and grouped separately in the filter sidebar. Patterns are evaluated in specificity order (e.g. "German Whispers" before the generic "Whispers" catch-all).

## Difficulty scoring

- **Solve duration** (total video length minus chapter-parsed puzzle-start time) is the primary signal
- **Title keywords** ("brutal", "easy", etc.) shift the score ±2 points
- Score is 0–10 → displayed as Easy / Medium / Hard / Brutal
