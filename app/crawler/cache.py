"""
Disk-backed cache for raw crawl data.

Stores per-video YouTube metadata and SudokuPad puzzle data so that
re-runs with updated rule logic don't need to re-hit the APIs.

Cache file: data/crawl_cache.json
  A JSON object keyed by YouTube video ID. Each entry contains:
    youtube_url          str   — https://www.youtube.com/watch?v={id}
    title                str
    description          str   — full YouTube description
    published_at         str   — ISO-8601 datetime string
    duration_seconds     int|null
    view_count           int
    like_count           int
    comment_count        int
    thumbnail_url        str|null
    puzzle_url           str|null  — SudokuPad/f-puzzles URL (extracted from description)
    sudokupad_fetched    bool  — True once we've attempted a SudokuPad fetch
    sudokupad_rules_text str   — metadata.rules from puzzle JSON (empty string if absent)
    sudokupad_raw_keys   list  — top-level keys present in puzzle JSON (for structural detection)
    sudokupad_cages      list  — cages array from puzzle JSON (for killer detection)
"""

import json
from pathlib import Path

DEFAULT_CACHE_PATH = "data/crawl_cache.json"


def _strip_surrogates(obj):
    """Recursively replace lone surrogate characters in strings.

    YouTube descriptions can contain lone surrogates (e.g. from certain emoji
    sequences) that Python's json module cannot serialize even with
    ensure_ascii=False. We round-trip through UTF-8 with surrogateescape +
    replace to convert them to U+FFFD (replacement character).
    """
    if isinstance(obj, str):
        return obj.encode("utf-8", "surrogatepass").decode("utf-8", "replace")
    if isinstance(obj, dict):
        return {k: _strip_surrogates(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_strip_surrogates(item) for item in obj]
    return obj


class CrawlCache:
    def __init__(self, path: str = DEFAULT_CACHE_PATH):
        self._path = Path(path)
        self._data: dict[str, dict] = {}
        self._dirty = False
        self._load()

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def _load(self):
        if self._path.exists():
            try:
                with open(self._path, encoding="utf-8") as f:
                    self._data = json.load(f)
                print(f"  Cache loaded: {len(self._data)} entries from {self._path}")
            except (json.JSONDecodeError, OSError) as e:
                print(f"  Warning: could not read cache ({e}); starting fresh")
                self._data = {}
        else:
            self._data = {}

    def flush(self):
        """Write the cache to disk if any entries have changed."""
        if not self._dirty:
            return
        self._path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self._path.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(_strip_surrogates(self._data), f, indent=2, ensure_ascii=False, default=str)
        tmp.replace(self._path)
        self._dirty = False

    # ------------------------------------------------------------------
    # Read helpers
    # ------------------------------------------------------------------

    def get(self, youtube_id: str) -> dict | None:
        return self._data.get(youtube_id)

    def has_youtube(self, youtube_id: str) -> bool:
        """Return True if full YouTube metadata is present for this video."""
        entry = self._data.get(youtube_id)
        return bool(entry and "title" in entry)

    def has_sudokupad(self, youtube_id: str) -> bool:
        """Return True if a SudokuPad fetch has already been attempted."""
        entry = self._data.get(youtube_id)
        return bool(entry and entry.get("sudokupad_fetched"))

    def missing_youtube(self, youtube_ids: list[str]) -> list[str]:
        """Return IDs that are not yet in the YouTube metadata cache."""
        return [vid for vid in youtube_ids if not self.has_youtube(vid)]

    # ------------------------------------------------------------------
    # Write helpers
    # ------------------------------------------------------------------

    def put_youtube(self, video_data: dict):
        """Store YouTube metadata for one video.

        `video_data` is a normalized dict as returned by YouTubeClient._normalize(),
        which must include a 'youtube_id' key.
        """
        youtube_id = video_data["youtube_id"]
        entry = self._data.setdefault(youtube_id, {})
        entry.update(video_data)
        entry["youtube_url"] = f"https://www.youtube.com/watch?v={youtube_id}"
        # Serialize datetime objects to strings for JSON storage
        if "published_at" in entry and hasattr(entry["published_at"], "isoformat"):
            entry["published_at"] = entry["published_at"].isoformat()
        self._dirty = True

    def put_sudokupad(
        self,
        youtube_id: str,
        *,
        rules_text: str,
        raw_keys: list[str],
        cages: list[dict],
    ):
        """Store SudokuPad puzzle data for one video.

        Call this whether or not the fetch succeeded — pass empty values on
        failure so we don't re-attempt on every re-run.
        """
        entry = self._data.setdefault(youtube_id, {})
        entry["sudokupad_fetched"] = True
        entry["sudokupad_rules_text"] = rules_text
        entry["sudokupad_raw_keys"] = raw_keys
        entry["sudokupad_cages"] = cages
        self._dirty = True
