#!/usr/bin/env python3
"""
Export the database to a static JSON file for GitHub Pages hosting.

Usage:
    python scripts/export_static.py
    python scripts/export_static.py --output path/to/out.json

Writes to frontend/public/data.json by default.
"""

import argparse
import json
import os
import sys
from datetime import UTC, datetime

# Make app importable from repo root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Collection, Rule, Video, VideoCollection, VideoRule
from app.rules_data import RULE_DEFINITIONS

_RULE_CATEGORY = {d["slug"]: d.get("category", "sudoku") for d in RULE_DEFINITIONS}

_DEFAULT_OUTPUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "frontend",
    "public",
    "data.json",
)


def export(output_path: str) -> None:
    db = next(get_db())

    counts = dict(
        db.query(VideoRule.rule_id, func.count(VideoRule.id)).group_by(VideoRule.rule_id).all()
    )
    rules = db.query(Rule).all()
    rules_data = sorted(
        [
            {
                "id": r.id,
                "slug": r.slug,
                "display_name": r.display_name,
                "description": r.description,
                "is_rare": r.is_rare,
                "video_count": counts.get(r.id, 0),
                "category": _RULE_CATEGORY.get(r.slug, "sudoku"),
            }
            for r in rules
        ],
        key=lambda r: r["video_count"],
        reverse=True,
    )

    videos = (
        db.query(Video)
        .options(
            selectinload(Video.rules).selectinload(VideoRule.rule),
            selectinload(Video.collections).selectinload(VideoCollection.collection),
        )
        .order_by(Video.published_at.desc())
        .all()
    )

    setter_counts: dict[str, int] = {}
    source_counts: dict[str, int] = {}
    videos_data = []

    for v in videos:
        if v.setter_name:
            setter_counts[v.setter_name] = setter_counts.get(v.setter_name, 0) + 1
        if v.source_name:
            source_counts[v.source_name] = source_counts.get(v.source_name, 0) + 1

        videos_data.append(
            {
                "id": v.id,
                "youtube_id": v.youtube_id,
                "title": v.title,
                "published_at": v.published_at.isoformat(),
                "view_count": v.view_count,
                "thumbnail_url": v.thumbnail_url,
                "puzzle_url": v.puzzle_url,
                "setter_name": v.setter_name,
                "source_name": v.source_name,
                "puzzle_start_seconds": v.puzzle_start_seconds,
                "solve_duration_seconds": v.solve_duration_seconds,
                "difficulty_score": v.difficulty_score,
                "rules": [
                    {
                        "rule": {
                            "id": vr.rule.id,
                            "slug": vr.rule.slug,
                            "display_name": vr.rule.display_name,
                            "description": vr.rule.description,
                            "is_rare": vr.rule.is_rare,
                            "video_count": counts.get(vr.rule.id, 0),
                            "category": _RULE_CATEGORY.get(vr.rule.slug, "sudoku"),
                        },
                        "confidence": vr.confidence,
                        "matched_text": vr.matched_text,
                    }
                    for vr in v.rules
                ],
                "collections": [vc.collection.slug for vc in v.collections],
            }
        )

    setters = [
        {"name": name, "count": count}
        for name, count in sorted(setter_counts.items(), key=lambda x: -x[1])
        if count >= 2
    ]
    sources = [
        {"name": name, "count": count}
        for name, count in sorted(source_counts.items(), key=lambda x: -x[1])
    ]

    collections_data = [
        {
            "slug": c.slug,
            "display_name": c.display_name,
            "video_count": c.video_count,
        }
        for c in db.query(Collection)
        .filter(Collection.video_count > 0)
        .order_by(Collection.video_count.desc())
        .all()
    ]

    payload = {
        "generated_at": datetime.now(UTC).isoformat(),
        "videos": videos_data,
        "rules": rules_data,
        "setters": setters,
        "sources": sources,
        "collections": collections_data,
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(payload, f, separators=(",", ":"))

    size_mb = os.path.getsize(output_path) / 1024 / 1024
    print(
        f"Exported {len(videos_data)} videos, {len(rules_data)} rules → {output_path} ({size_mb:.1f} MB)"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default=_DEFAULT_OUTPUT, help="Output JSON path")
    args = parser.parse_args()
    export(args.output)
