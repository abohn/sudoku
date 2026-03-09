"""
Fetch and parse SudokuPad puzzle data.

SudokuPad stores puzzles as LZString-compressed JSON accessible via:
  https://sudokupad.app/api/puzzle/{PUZZLE_ID}

The decoded JSON has:
  metadata.rules  - setter-written rules text (our best source)
  arrows          - present if arrows are used
  foglight        - present if fog of war is active
  triggereffect   - also present for fog of war
  cages           - cage constraints; killer cages have a numeric `value`
  lines           - line constraints (thermos, whispers, renban, etc.)
"""

import json
import re

import httpx
import lzstring

from app.crawler.rule_parser import RuleMatch, parse_rules

_lz = lzstring.LZString()

_PUZZLE_ID_RE = re.compile(r"(?:sudokupad\.app|app\.crackingthecryptic\.com/sudoku)/([^?&\s/#]+)")

# SudokuPad API timeout — keep short so the crawler doesn't stall
_TIMEOUT = 8.0


def _extract_puzzle_id(url: str) -> str | None:
    m = _PUZZLE_ID_RE.search(url)
    return m.group(1) if m else None


def fetch_puzzle_data(puzzle_url: str) -> dict | None:
    """Fetch and decode SudokuPad puzzle JSON. Returns None on any failure."""
    puzzle_id = _extract_puzzle_id(puzzle_url)
    if not puzzle_id:
        return None

    api_url = f"https://sudokupad.app/api/puzzle/{puzzle_id}"
    try:
        r = httpx.get(api_url, follow_redirects=True, timeout=_TIMEOUT)
        r.raise_for_status()
    except Exception:
        return None

    raw = r.text.strip()
    if raw.startswith("scl"):
        raw = raw[3:]

    try:
        decompressed = _lz.decompressFromBase64(raw)
        if not decompressed:
            return None
        return json.loads(decompressed)
    except Exception:
        return None


def parse_rules_from_data(
    rules_text: str,
    raw_keys: list[str],
    cages: list[dict],
) -> list[RuleMatch]:
    """
    Parse rule matches from already-fetched (or cached) SudokuPad puzzle data.

    Separated from network I/O so cached entries can be re-parsed without
    re-fetching when rule logic changes.

    Args:
        rules_text: The metadata.rules string from the puzzle JSON.
        raw_keys:   Top-level keys present in the puzzle JSON (for structural detection).
        cages:      The cages list from the puzzle JSON (for killer detection).
    """
    # --- 1. Text-based matching on metadata.rules --------------------------
    text_matches = parse_rules(rules_text) if rules_text else []
    matched_slugs = {m.slug for m in text_matches}

    # --- 2. Structural detection -------------------------------------------
    # Only used for constraints that are unambiguous from structure alone.
    # Arrows are NOT detected structurally — the arrows key also appears for
    # one-way doors and decorative shapes. Text matching is the sole arbiter.
    structural: list[RuleMatch] = []

    # Fog of War
    if (
        "foglight" in raw_keys or "triggereffect" in raw_keys
    ) and "fog-of-war" not in matched_slugs:
        structural.append(
            RuleMatch(
                slug="fog-of-war",
                display_name="Fog of War",
                confidence=1.0,
                matched_text="foglight/triggereffect key present in puzzle data",
            )
        )

    # Killer cages (cages with a numeric sum value)
    if cages and "killer" not in matched_slugs:
        for cage in cages:
            val = cage.get("value")
            if isinstance(val, int | float) or (
                isinstance(val, str) and val.strip().lstrip("-").isdigit()
            ):
                structural.append(
                    RuleMatch(
                        slug="killer",
                        display_name="Killer Cage",
                        confidence=1.0,
                        matched_text="cage with numeric sum in puzzle data",
                    )
                )
                break

    return text_matches + structural


def parse_rules_from_sudokupad(puzzle_url: str) -> list[RuleMatch]:
    """
    Fetch SudokuPad puzzle data and return rule matches.

    Prefer using the cache + parse_rules_from_data() in run.py when available.
    This function is intended for one-off use without caching.
    """
    data = fetch_puzzle_data(puzzle_url)
    if not data:
        return []

    rules_text = data.get("metadata", {}).get("rules", "")
    raw_keys = list(data.keys())
    cages = data.get("cages", [])
    return parse_rules_from_data(rules_text, raw_keys, cages)
