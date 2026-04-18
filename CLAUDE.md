# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A searchable archive of Cracking the Cryptic YouTube sudoku puzzles, filterable by rule type (killer, thermometer, etc.). The production site is a **static GitHub Pages SPA** — the backend and database only exist locally/in CI to generate `frontend/public/data.json`.

## Commands

### Backend (Python)
```bash
source .venv/bin/activate
uvicorn app.main:app --reload        # API at http://localhost:8000
```

### Frontend (React/TypeScript)
```bash
cd frontend && npm run dev           # http://localhost:5173 (proxies /api → :8000)
cd frontend && npm run build         # production build
cd frontend && npx tsc --noEmit     # type-check only
```

### Linting / formatting
```bash
ruff check app/ --fix                # Python lint (auto-fix)
ruff format app/                     # Python format
cd frontend && npx eslint --fix src/ # JS/TS lint
```
Pre-commit hooks run all of the above automatically. Install with `pre-commit install`.

### Crawler
```bash
python -m app.crawler.run              # last 3 months (default)
python -m app.crawler.run --months 6
python -m app.crawler.run --all        # full history (~5700 videos)
python -m app.crawler.run --limit 20   # quick test
python -m app.crawler.run --reprocess  # re-parse rules from cache, no API calls
python -m app.crawler.run --playlists  # also sync playlist memberships
python -m app.crawler.run --playlists-only  # only sync playlists
```

### Static export (required after any DB change)
```bash
python scripts/export_static.py      # writes frontend/public/data.json
```

### Managing hidden videos
```bash
python -m app.crawler.manage hide <youtube_id> [...]
python -m app.crawler.manage unhide <youtube_id> [...]
python -m app.crawler.manage list-hidden
```

### Full rebuild from scratch
```bash
bash scripts/rebuild.sh              # deletes DB, runs --all crawl, exports data.json
```

## Architecture

### Data flow
```
YouTube Data API v3
       ↓
  CrawlCache (data/crawl_cache.json)   ← persists between runs to avoid re-fetching
       ↓
  SQLite DB (data/sudoku.db)
       ↓
  export_static.py
       ↓
  frontend/public/data.json            ← the only thing deployed to GitHub Pages
```

The frontend is **fully static**: it loads `data.json` once at startup and does all filtering/sorting client-side. There is no API call from the production site.

### Rule detection pipeline
1. **SudokuPad first**: crawler fetches the puzzle JSON from SudokuPad/f-puzzles; `parse_rules_from_data()` in `app/crawler/sudokupad.py` detects rules from structured puzzle data (cages, raw keys, metadata.rules text).
2. **Description fallback**: if SudokuPad yields nothing, `parse_rules()` in `app/crawler/rule_parser.py` regex-matches against the YouTube description (boilerplate stripped) and video title.
3. **`RULE_DEFINITIONS`** in `app/rules_data.py` is the **single source of truth** for all rule slugs, display names, patterns, and categories. It is imported by both `rule_parser.py` and `main.py` (to avoid circular imports — do not move rule definitions back into `main.py`).

### Key design decisions
- Rules with `title_only: true` in `RULE_DEFINITIONS` are matched against the video title only, not the description (CTC descriptions mention puzzle types as app feature promos).
- More specific rules must appear **before** broader catch-alls in `RULE_DEFINITIONS` (e.g. `german-whispers` before `whispers`).
- `is_rare` flag on `Rule` is recomputed after every crawl: rules with ≤ 3 associated videos are marked rare.
- Schema migrations are lightweight inline `ALTER TABLE` calls in `_run_migrations()` in `run.py` (not Alembic). New columns are added there with a try/except for "already exists".
- `Video.is_hidden` excludes videos from the static export while keeping them in the DB.

### CI/CD
- **`crawl.yml`**: runs daily at 06:00 UTC, crawls last 1 month, exports, commits updated `data.json` to main.
- **`deploy.yml`**: triggers on pushes to `main` that touch `frontend/`, builds Vite, deploys to GitHub Pages.
- The SQLite DB is cached between CI runs via `actions/cache`; `data/crawl_cache.json` is gitignored but persists similarly.
