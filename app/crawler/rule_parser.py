"""
Parse sudoku rule constraints from a YouTube video description.

Rules are matched in order. More specific rules (e.g. "german-whispers")
must appear BEFORE broader catch-alls (e.g. "whispers") so the catch-all
doesn't steal matches.
"""

import re
from dataclasses import dataclass

from app.rules_data import RULE_DEFINITIONS


@dataclass
class RuleMatch:
    slug: str
    display_name: str
    confidence: float
    matched_text: str


# Pre-compile patterns for performance
_COMPILED: list[tuple[str, str, list[re.Pattern]]] = []

for defn in RULE_DEFINITIONS:
    compiled = [re.compile(p, re.IGNORECASE) for p in defn.get("patterns", [])]
    _COMPILED.append((defn["slug"], defn["display_name"], compiled))


# Markers that indicate the start of boilerplate content in CTC descriptions.
# Everything from these markers onward is channel/app promotion, not puzzle rules.
_BOILERPLATE_MARKERS = re.compile(
    r"(?:"
    r"\u25b6"  # ▶ (YouTube section headers)
    r"|For all clue types below"  # SudokuPad generic clue explainer
    r"|OUR PATREON"
    r"|PATREON PAGE"
    r")",
    re.IGNORECASE,
)


def _puzzle_rules_section(description: str) -> str:
    """Return only the portion of the description that contains puzzle rules.

    CTC descriptions follow a pattern:
      [puzzle link + rules]
      ▶ OUR PATREON PAGE ...
      ▶ OUR NEWEST APP ... (mentions Fog of War, Killer, etc. as app features)
      ...

    We strip from the first boilerplate marker onward.
    """
    m = _BOILERPLATE_MARKERS.search(description)
    if m:
        return description[: m.start()]
    return description


def parse_rules(description: str) -> list[RuleMatch]:
    """
    Return a list of RuleMatch objects for all rules detected in the description.
    Each rule appears at most once. Order matches the RULE_DEFINITIONS order.
    """
    if not description:
        return []

    # Only search the puzzle-rules portion, not channel/app boilerplate
    text = _puzzle_rules_section(description)

    matched_slugs: set[str] = set()
    results: list[RuleMatch] = []

    for slug, display_name, patterns in _COMPILED:
        if slug == "unique-rules" or not patterns:
            continue
        for pattern in patterns:
            m = pattern.search(text)
            if m and slug not in matched_slugs:
                # Extract a short context window around the match
                start = max(0, m.start() - 40)
                end = min(len(text), m.end() + 40)
                context = text[start:end].strip().replace("\n", " ")
                results.append(
                    RuleMatch(
                        slug=slug,
                        display_name=display_name,
                        confidence=1.0,
                        matched_text=context,
                    )
                )
                matched_slugs.add(slug)
                break  # don't double-count via alternative patterns

    return results


# ---------------------------------------------------------------------------
# Puzzle URL extraction
# ---------------------------------------------------------------------------

_PUZZLE_URL_PATTERNS = [
    re.compile(r"https?://app\.crackingthecryptic\.com/sudoku/\S+"),
    re.compile(r"https?://sudokupad\.app/\S+"),
    re.compile(r"https?://(?:www\.)?f-puzzles\.com/\?load=\S+"),
]


def extract_puzzle_url(description: str) -> str | None:
    """Return the first SudokuPad/f-puzzles URL found in the description."""
    if not description:
        return None
    for pattern in _PUZZLE_URL_PATTERNS:
        m = pattern.search(description)
        if m:
            # Strip trailing punctuation that might have been captured
            return m.group(0).rstrip(".,;)")
    return None


# ---------------------------------------------------------------------------
# Setter name extraction
# ---------------------------------------------------------------------------

# A proper-noun word: uppercase first letter, then letters/apostrophes/hyphens.
# Case-sensitive (no re.IGNORECASE) so lowercase words like "clicking" don't match.
_NAME_WORD = r"[A-Z][a-zA-Z'\-]{1,}"
_PROPER_NAME = rf"{_NAME_WORD}(?:\s+{_NAME_WORD}){{0,3}}"

_SETTER_PATTERNS = [
    # "by ProperName" — case-sensitive for the name, works in both title and desc
    re.compile(rf"\bby\s+({_PROPER_NAME})"),
    # "Puzzle by: Name" or "puzzle by Name" — keyword is case-insensitive via (?i:...)
    re.compile(rf"(?i:puzzle\s+by[:\s]+)({_PROPER_NAME})"),
    # "setter: Name"
    re.compile(rf"(?i:setter[:\s]+)({_PROPER_NAME})"),
]

# Words/names to reject even when title-cased (CTC hosts, generic terms)
_SETTER_IGNORE = {
    "simon",
    "mark",
    "cracking",
    "cryptic",
    "subscribe",
    "click",
    "clicking",
    "watch",
    "visit",
    "today",
    "us",
    "you",
    "me",
    "him",
    "her",
    "the",
    "a",
    "an",
}


def _normalize_name(name: str) -> str:
    """Title-case ALL-CAPS names; otherwise leave as-is."""
    if name == name.upper():
        return name.title()
    return name


def extract_setter(title: str, description: str) -> str | None:
    """Best-effort extraction of the puzzle setter's name.

    Searches the title first (most reliable), then the puzzle-rules section
    of the description (boilerplate stripped). Requires proper-noun
    capitalization so generic phrases don't match.
    """
    desc_section = _puzzle_rules_section(description or "")
    for text in (title, desc_section):
        for pattern in _SETTER_PATTERNS:
            m = pattern.search(text)
            if m:
                name = _normalize_name(m.group(1).strip())
                # Reject if first word is a known false positive
                first_word = name.split()[0].lower()
                if first_word not in _SETTER_IGNORE and len(name) > 2:
                    return name
    return None


# ---------------------------------------------------------------------------
# Chapter / timestamp parsing for puzzle start time
# ---------------------------------------------------------------------------

_TIMESTAMP_RE = re.compile(
    r"(?:^|\n)\s*(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)",
    re.MULTILINE,
)

_SOLVE_KEYWORDS = re.compile(
    r"\b(?:solv|puzzle|start|begin|cracking|let'?s go|play)\b",
    re.IGNORECASE,
)


def _timestamp_to_seconds(ts: str) -> int:
    parts = ts.split(":")
    parts = [int(p) for p in parts]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    return parts[0] * 3600 + parts[1] * 60 + parts[2]


def extract_puzzle_start_seconds(description: str) -> int | None:
    """
    Parse YouTube chapter timestamps from the description and return the
    number of seconds at which the puzzle solve likely begins.
    """
    if not description:
        return None

    chapters = [
        (_timestamp_to_seconds(m.group(1)), m.group(2).strip())
        for m in _TIMESTAMP_RE.finditer(description)
    ]

    if not chapters:
        return None

    # Prefer a chapter whose label contains solve-related keywords
    for seconds, label in chapters:
        if _SOLVE_KEYWORDS.search(label):
            return seconds

    # Fallback: if there are multiple chapters, the second one is usually the solve
    if len(chapters) >= 2:
        return chapters[1][0]

    return None


# ---------------------------------------------------------------------------
# Difficulty scoring
# ---------------------------------------------------------------------------

_HARD_KEYWORDS = re.compile(
    r"\b(?:hard|brutal|nightmare|fiendish|extreme|genius|insane|diabolical|impossible)\b",
    re.IGNORECASE,
)
_EASY_KEYWORDS = re.compile(
    r"\b(?:easy|gentle|beginner|introductory|simple|accessible)\b",
    re.IGNORECASE,
)


def estimate_difficulty(
    title: str,
    solve_duration_seconds: int | None,
) -> float | None:
    """
    Return a 0–10 difficulty estimate.
    - Solve duration is the primary signal (longer = harder).
    - Title keywords shift the score up or down.
    Returns None if there's not enough information.
    """
    if solve_duration_seconds is None:
        score = 5.0  # neutral default when we have no timing data
    else:
        # Typical CTC solves range from ~5 min (easy) to ~90 min (brutal)
        minutes = solve_duration_seconds / 60
        # Clamp to [5, 90] then normalize to [0, 10]
        clamped = max(5.0, min(90.0, minutes))
        score = (clamped - 5.0) / (90.0 - 5.0) * 10.0

    if _HARD_KEYWORDS.search(title):
        score = min(10.0, score + 2.0)
    if _EASY_KEYWORDS.search(title):
        score = max(0.0, score - 2.0)

    return round(score, 1)


def estimate_popularity(view_count: int, like_count: int) -> float:
    """
    Return a 0–10 popularity score using a log scale so viral outliers
    don't dwarf everything else.
    """
    import math

    # Weight views more than likes
    combined = view_count + like_count * 5
    if combined <= 0:
        return 0.0
    # log10(1M) ≈ 6  →  score ≈ 10
    score = math.log10(combined + 1) / 6.0 * 10.0
    return round(min(10.0, score), 1)
