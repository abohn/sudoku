"""
Video management CLI — hide or unhide individual videos from the export.

Usage:
    python -m app.crawler.manage hide <youtube_id> [<youtube_id> ...]
    python -m app.crawler.manage unhide <youtube_id> [<youtube_id> ...]
    python -m app.crawler.manage list-hidden

Hidden videos are excluded from data.json but remain in the database.
Run `python scripts/export_static.py` after making changes.
"""

import sys

from app.database import SessionLocal
from app.models import Video


def _get_videos(db, youtube_ids: list[str]) -> list[Video]:
    found = db.query(Video).filter(Video.youtube_id.in_(youtube_ids)).all()
    found_ids = {v.youtube_id for v in found}
    for vid in youtube_ids:
        if vid not in found_ids:
            print(f"  WARNING: {vid} not found in database", file=sys.stderr)
    return found


def cmd_hide(youtube_ids: list[str]) -> None:
    db = SessionLocal()
    videos = _get_videos(db, youtube_ids)
    for v in videos:
        v.is_hidden = True
        print(f"  Hidden: {v.youtube_id}  {v.title}")
    db.commit()
    db.close()


def cmd_unhide(youtube_ids: list[str]) -> None:
    db = SessionLocal()
    videos = _get_videos(db, youtube_ids)
    for v in videos:
        v.is_hidden = False
        print(f"  Unhidden: {v.youtube_id}  {v.title}")
    db.commit()
    db.close()


def cmd_list_hidden() -> None:
    db = SessionLocal()
    videos = (
        db.query(Video).filter(Video.is_hidden.is_(True)).order_by(Video.published_at.desc()).all()
    )
    if not videos:
        print("No hidden videos.")
    else:
        print(f"{len(videos)} hidden video(s):")
        for v in videos:
            print(f"  {v.youtube_id}  {v.published_at.date()}  {v.title}")
    db.close()


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    command = args[0]
    rest = args[1:]

    if command == "hide":
        if not rest:
            print("Usage: manage.py hide <youtube_id> [...]", file=sys.stderr)
            sys.exit(1)
        cmd_hide(rest)
    elif command == "unhide":
        if not rest:
            print("Usage: manage.py unhide <youtube_id> [...]", file=sys.stderr)
            sys.exit(1)
        cmd_unhide(rest)
    elif command == "list-hidden":
        cmd_list_hidden()
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
