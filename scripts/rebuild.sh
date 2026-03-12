#!/usr/bin/env bash
# Wipe the database and run a full crawl from scratch.
set -euo pipefail

DB="data/sudoku.db"

if [ -f "$DB" ]; then
    echo "Removing $DB..."
    rm "$DB"
fi

echo "Starting full crawl (this will take a while)..."
python -m app.crawler.run --all

echo "Exporting static data..."
python scripts/export_static.py
