"""
Crawler entry point.

Usage:
    python -m app.crawler.run                    # crawl last 3 months (default)
    python -m app.crawler.run --months 6         # crawl last 6 months
    python -m app.crawler.run --all              # crawl entire channel history
    python -m app.crawler.run --limit 50         # crawl only 50 most recent videos
    python -m app.crawler.run --reprocess        # skip YouTube/SudokuPad fetches;
                                                 # re-parse rules from cache only

On subsequent runs, YouTube metadata and SudokuPad puzzle data are read from
data/crawl_cache.json instead of hitting the APIs again. Use --reprocess to
re-apply updated rule logic to every cached video without any network calls.
"""

import argparse
import contextlib
import os
from datetime import UTC, datetime, timedelta

from dotenv import load_dotenv

load_dotenv()

import re

from sqlalchemy.orm import Session

from app.crawler.cache import CrawlCache
from app.crawler.rule_parser import (
    estimate_difficulty,
    estimate_popularity,
    extract_puzzle_start_seconds,
    extract_puzzle_url,
    extract_setter,
    extract_solver,
    extract_source,
    is_puzzle_video,
    parse_rules,
)
from app.crawler.sudokupad import fetch_puzzle_data, parse_rules_from_data
from app.crawler.youtube import YouTubeClient
from app.database import Base, SessionLocal, engine
from app.main import seed_rules, update_rare_flags
from app.models import Collection, Rule, Video, VideoCollection, VideoRule


def clean_str(s) -> str:
    """Replace lone surrogate characters that SQLite and JSON both reject.

    YouTube descriptions/titles can contain lone surrogates from certain emoji
    sequences. We round-trip through UTF-8 with surrogatepass + replace to
    substitute them with U+FFFD (the Unicode replacement character).
    """
    if not isinstance(s, str):
        return s
    return s.encode("utf-8", "surrogatepass").decode("utf-8", "replace")


def upsert_video(db: Session, data: dict) -> Video:
    """Insert or update a video record. Returns the Video ORM object."""
    video = db.query(Video).filter(Video.youtube_id == data["youtube_id"]).first()
    if not video:
        video = Video(youtube_id=data["youtube_id"])
        db.add(video)

    for field in (
        "title",
        "description",
        "published_at",
        "duration_seconds",
        "view_count",
        "like_count",
        "comment_count",
        "thumbnail_url",
    ):
        val = data.get(field)
        setattr(video, field, clean_str(val) if isinstance(val, str) else val)

    video.last_updated = datetime.now(UTC)
    return video


def _ensure_sudokupad_cached(cache: CrawlCache, youtube_id: str, puzzle_url: str | None):
    """Fetch SudokuPad data for this video and store it in cache if not already present.

    Re-fetches if the cached entry is missing the `sudokupad_author` field,
    which was added after the initial cache schema was established.
    """
    entry = cache.get(youtube_id)
    already_fetched = bool(entry and entry.get("sudokupad_fetched"))
    has_author_field = entry is not None and "sudokupad_author" in entry

    # Skip if we have a non-empty result, or if there's no puzzle URL to fetch.
    # Re-fetch if we have a puzzle URL but previously got nothing (empty author
    # AND empty rules) — this handles cases where the old parser silently failed.
    has_content = bool(
        entry and (entry.get("sudokupad_author") or entry.get("sudokupad_rules_text"))
    )
    if already_fetched and has_author_field and (has_content or not puzzle_url):
        return

    if not puzzle_url:
        cache.put_sudokupad(youtube_id, rules_text="", raw_keys=[], cages=[], author="")
        return

    data = fetch_puzzle_data(puzzle_url)
    if data:
        meta = data.get("metadata", {})
        cache.put_sudokupad(
            youtube_id,
            rules_text=meta.get("rules", ""),
            raw_keys=list(data.keys()),
            cages=data.get("cages", []),
            author=meta.get("author", ""),
        )
    else:
        cache.put_sudokupad(youtube_id, rules_text="", raw_keys=[], cages=[], author="")


def attach_rules(
    db: Session, video: Video, cache: CrawlCache, youtube_id: str, description: str, title: str = ""
):
    """Parse rules from cached data and link them to the video.

    Uses SudokuPad metadata.rules + structural detection when available.
    Falls back to the YouTube description (+ title) if SudokuPad had nothing useful.
    The title is passed through to parse_rules so that word-puzzle types detected
    from titles (e.g. crossword, meta-puzzle) are captured.
    """
    db.query(VideoRule).filter(VideoRule.video_id == video.id).delete()

    entry = cache.get(youtube_id) or {}
    rules_text = entry.get("sudokupad_rules_text", "")
    raw_keys = entry.get("sudokupad_raw_keys", [])
    cages = entry.get("sudokupad_cages", [])

    if entry.get("sudokupad_fetched") and (rules_text or raw_keys):
        matches = parse_rules_from_data(rules_text, raw_keys, cages)
    else:
        matches = []

    if not matches:
        matches = parse_rules(description, title=title)

    for match in matches:
        rule = db.query(Rule).filter(Rule.slug == match.slug).first()
        if not rule:
            continue
        db.add(
            VideoRule(
                video_id=video.id,
                rule_id=rule.id,
                confidence=match.confidence,
                matched_text=clean_str(match.matched_text),
            )
        )


def _reprocess(cache: CrawlCache):
    """Re-parse rules for every cached video without any network calls."""
    print("Reprocess mode: re-parsing rules from cache (no API calls)")
    db = SessionLocal()
    with contextlib.suppress(Exception):
        seed_rules(db)

    entries = list(cache._data.items())
    print(f"  Processing {len(entries)} cached video(s)...")
    for i, (youtube_id, entry) in enumerate(entries, 1):
        title = entry.get("title", "") or ""
        description = entry.get("description", "") or ""
        if not is_puzzle_video(title, description):
            continue
        video = db.query(Video).filter(Video.youtube_id == youtube_id).first()
        if not video:
            continue
        video.solver_name = extract_solver(title, description)
        video.source_name = extract_source(description)
        attach_rules(db, video, cache, youtube_id, description, title=title)
        if i % 100 == 0:
            db.commit()
            print(f"    {i}/{len(entries)} committed")

    db.commit()
    update_rare_flags(db)
    db.commit()
    db.close()
    print(f"Reprocess complete. {len(entries)} video(s) updated.")


def _make_slug(title: str) -> str:
    """Convert a playlist title to a URL-safe slug."""
    slug = title.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def _crawl_playlists(db: Session, client: "YouTubeClient", channel_id: str):
    """Fetch all channel playlists and map their video IDs into video_collections."""
    print("Fetching channel playlists...")
    playlists = client.get_channel_playlists(channel_id)
    print(f"  Found {len(playlists)} playlist(s)")

    for pl in playlists:
        slug = _make_slug(pl["title"])
        collection = db.query(Collection).filter(Collection.slug == slug).first()
        if not collection:
            collection = Collection(
                slug=slug,
                display_name=pl["title"],
                youtube_playlist_id=pl["id"],
            )
            db.add(collection)
            db.flush()
        else:
            collection.display_name = pl["title"]
            collection.youtube_playlist_id = pl["id"]

        print(f"  Playlist: {pl['title']!r} — fetching video IDs...")
        video_ids = list(dict.fromkeys(client.get_playlist_video_ids(pl["id"])))
        print(f"    {len(video_ids)} video(s) in playlist")

        # Clear existing memberships for this collection
        db.query(VideoCollection).filter(VideoCollection.collection_id == collection.id).delete()

        count = 0
        for youtube_id in video_ids:
            video = db.query(Video).filter(Video.youtube_id == youtube_id).first()
            if not video:
                continue
            db.add(VideoCollection(video_id=video.id, collection_id=collection.id))
            count += 1

        collection.video_count = count
        db.commit()
        print(f"    Linked {count} known video(s)")

    print(f"Playlist crawl complete. {len(playlists)} playlist(s) processed.")


def _run_migrations():
    """Apply lightweight schema migrations for columns added after initial deploy."""
    from sqlalchemy import text

    # New tables are created by Base.metadata.create_all; only add columns here.
    with engine.connect() as conn:
        for stmt in [
            "ALTER TABLE videos ADD COLUMN solver_name VARCHAR(100)",
            "ALTER TABLE videos ADD COLUMN source_name VARCHAR(200)",
            "ALTER TABLE rules ADD COLUMN category VARCHAR(50) DEFAULT 'sudoku'",
            "ALTER TABLE videos ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT 0",
        ]:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass  # Column already exists


def crawl(
    months_back: int = 3,
    crawl_all: bool = False,
    limit: int = 0,
    reprocess: bool = False,
    playlists: bool = False,
):
    os.makedirs("data", exist_ok=True)
    Base.metadata.create_all(bind=engine)
    _run_migrations()

    cache = CrawlCache()

    if reprocess:
        _reprocess(cache)
        return

    channel_id = os.environ.get("CTC_CHANNEL_ID", "UCedA79V1zMVMDwH0GWNBDBQ")

    published_after = None
    if not crawl_all and months_back > 0:
        published_after = datetime.now(UTC) - timedelta(days=months_back * 30)

    print(f"Starting crawl — channel: {channel_id}")
    if published_after:
        print(f"  Fetching videos published after: {published_after.date()}")
    else:
        print("  Fetching ALL videos (this may take a while)")

    client = YouTubeClient()

    print("  Retrieving video ID list...")
    video_ids = client.get_video_ids(
        channel_id,
        published_after=published_after,
        max_results=limit or None,
    )
    print(f"  Found {len(video_ids)} video(s) to process")

    db = SessionLocal()
    with contextlib.suppress(Exception):
        seed_rules(db)

    total = len(video_ids)
    for batch_start in range(0, total, 50):
        batch = video_ids[batch_start : batch_start + 50]
        batch_end = batch_start + len(batch)
        print(f"  Batch {batch_start + 1}–{batch_end} of {total}...")

        # Only call the YouTube API for videos not already in cache
        uncached_ids = cache.missing_youtube(batch)
        if uncached_ids:
            print(f"    Fetching YouTube details for {len(uncached_ids)} new video(s)...")
            for data in client.get_video_details(uncached_ids):
                cache.put_youtube(data)
        else:
            print(f"    All {len(batch)} already cached, skipping YouTube API call")

        # Process every video in the batch using cached data
        for youtube_id in batch:
            entry = cache.get(youtube_id)
            if not entry:
                continue

            desc = entry.get("description", "") or ""
            title = entry.get("title", "") or ""

            # Skip non-sudoku content (video games, Wordle, crosswords, etc.)
            if not is_puzzle_video(title, desc):
                print(f"    Skipping non-puzzle video: {title!r}")
                continue

            puzzle_url = extract_puzzle_url(desc)

            _ensure_sudokupad_cached(cache, youtube_id, puzzle_url)

            # Prefer the setter name from SudokuPad metadata (most reliable),
            # falling back to description-based extraction.
            sudokupad_author = (cache.get(youtube_id) or {}).get("sudokupad_author", "")
            setter_name = sudokupad_author.strip() or extract_setter(title, desc)
            solver_name = extract_solver(title, desc)
            puzzle_start = extract_puzzle_start_seconds(desc)
            duration = entry.get("duration_seconds")
            solve_duration = (
                duration - puzzle_start
                if duration and puzzle_start and duration > puzzle_start
                else duration
            )
            difficulty = estimate_difficulty(title, solve_duration)
            popularity = estimate_popularity(
                entry.get("view_count", 0),
                entry.get("like_count", 0),
            )

            # Build data dict for upsert; deserialize published_at if stored as string
            video_data = dict(entry)
            if isinstance(video_data.get("published_at"), str):
                try:
                    video_data["published_at"] = datetime.fromisoformat(video_data["published_at"])
                except ValueError:
                    video_data["published_at"] = None

            video = upsert_video(db, video_data)
            db.flush()

            video.puzzle_url = clean_str(puzzle_url)
            video.setter_name = clean_str(setter_name)
            video.solver_name = solver_name
            video.source_name = extract_source(desc)
            video.puzzle_start_seconds = puzzle_start
            video.solve_duration_seconds = solve_duration
            video.difficulty_score = difficulty
            video.popularity_score = popularity

            attach_rules(db, video, cache, youtube_id, desc, title=title)

        db.commit()
        cache.flush()
        print("    Committed.")

    update_rare_flags(db)
    db.commit()

    if playlists:
        client2 = YouTubeClient()
        _crawl_playlists(db, client2, channel_id)

    db.close()
    cache.flush()
    print(f"\nCrawl complete. {total} video(s) processed.")


def main():
    parser = argparse.ArgumentParser(description="Crawl Cracking the Cryptic YouTube channel")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--months", type=int, default=3, help="Months back to crawl (default: 3)")
    group.add_argument(
        "--all", action="store_true", dest="all", help="Crawl entire channel history"
    )
    parser.add_argument("--limit", type=int, default=0, help="Max videos to fetch (0 = no limit)")
    parser.add_argument(
        "--reprocess",
        action="store_true",
        help="Re-parse rules for all cached videos without any API calls",
    )
    parser.add_argument(
        "--playlists",
        action="store_true",
        help="Also fetch playlist memberships after the video crawl",
    )
    parser.add_argument(
        "--playlists-only",
        action="store_true",
        dest="playlists_only",
        help="Only update playlist memberships (skip video crawl)",
    )
    args = parser.parse_args()

    if args.playlists_only:
        os.makedirs("data", exist_ok=True)
        Base.metadata.create_all(bind=engine)
        _run_migrations()
        channel_id = os.environ.get("CTC_CHANNEL_ID", "UCedA79V1zMVMDwH0GWNBDBQ")
        db = SessionLocal()
        client = YouTubeClient()
        _crawl_playlists(db, client, channel_id)
        db.close()
        return

    crawl(
        months_back=args.months,
        crawl_all=args.all,
        limit=args.limit,
        reprocess=args.reprocess,
        playlists=args.playlists,
    )


if __name__ == "__main__":
    main()
