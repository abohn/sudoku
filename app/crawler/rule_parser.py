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


# Pre-compile patterns for performance.
# Each entry: (slug, display_name, patterns, title_only)
# title_only=True means patterns are searched against the video title only,
# not the description. Used for word-puzzle categories whose signals appear in
# titles but whose terms also appear in CTC descriptions as promotional text.
_COMPILED: list[tuple[str, str, list[re.Pattern], bool]] = []

for defn in RULE_DEFINITIONS:
    compiled = [re.compile(p, re.IGNORECASE) for p in defn.get("patterns", [])]
    _COMPILED.append((defn["slug"], defn["display_name"], compiled, bool(defn.get("title_only"))))


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


def parse_rules(description: str, title: str = "") -> list[RuleMatch]:
    """
    Return a list of RuleMatch objects for all rules detected in the description
    and (optionally) the title.

    Rules with title_only=True are searched against the title only — these are
    word-puzzle categories whose terms appear in CTC descriptions as promotional
    text and would cause false positives if matched against the description.

    Each rule appears at most once. Order matches the RULE_DEFINITIONS order.
    """
    if not description and not title:
        return []

    desc_section = _puzzle_rules_section(description) if description else ""

    matched_slugs: set[str] = set()
    results: list[RuleMatch] = []

    for slug, display_name, patterns, title_only in _COMPILED:
        if slug == "unique-rules" or not patterns:
            continue
        # title_only rules must have a title to match against
        if title_only and not title:
            continue
        text = title if title_only else desc_section
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


# ---------------------------------------------------------------------------
# Solver name extraction (which CTC host is solving)
# ---------------------------------------------------------------------------

# Ordered most-specific to least-specific.
# We check for "Name solves/takes/has" first (explicit solver context),
# then fall back to name appearing in the first 300 chars of the rules section.
_SOLVER_EXPLICIT_RE = re.compile(
    r"\b(simon|mark|sven|sam)\s+(?:solves?|takes?\s+on|is\s+solv)",
    re.IGNORECASE,
)
_SOLVER_SIMPLE_RE = re.compile(
    r"\b(simon(?:\s+anthony)?|mark(?:\s+goodliffe)?|sven|sam)\b",
    re.IGNORECASE,
)
_SOLVER_DISPLAY: dict[str, str] = {
    "simon": "Simon",
    "mark": "Mark",
    "sven": "Sven",
    "sam": "Sam",
}


def extract_solver(title: str, description: str) -> str | None:
    """Best-effort detection of which CTC host is solving the puzzle.

    Checks for explicit "Name solves…" patterns first (high confidence),
    then falls back to name appearance in the first 300 characters of the
    puzzle-rules section.  Returns None when indeterminate.
    """
    desc_section = _puzzle_rules_section(description or "")

    # High-confidence: explicit solver verb ("Simon solves this…")
    for text in (title, desc_section[:500]):
        m = _SOLVER_EXPLICIT_RE.search(text)
        if m:
            key = m.group(1).split()[0].lower()
            return _SOLVER_DISPLAY.get(key)

    # Lower-confidence: name appears in title or start of description.
    # We skip occurrences immediately preceded by "by " (setter context).
    for text in (title, desc_section[:300]):
        for m in _SOLVER_SIMPLE_RE.finditer(text):
            preceding = text[max(0, m.start() - 4) : m.start()].lower().strip()
            if preceding.endswith("by"):
                continue  # "by Simon" = setter, not solver
            key = m.group(1).split()[0].lower()
            return _SOLVER_DISPLAY.get(key)

    return None


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
# Video type detection
# ---------------------------------------------------------------------------

# Hard-reject patterns: always filter out regardless of description content.
# These are non-puzzle videos on the CTC channel (meta content, word games, etc.).
# Note: the puzzle-URL check runs BEFORE this, so sudoku videos with any of
# these words in their title (e.g. "Making Connections, Sudoku Style") are
# already saved by the time we reach this check.
# Crosswords are now KEPT and tagged via word-puzzle rule detection.
_HARD_REJECT_RE = re.compile(
    # Non-puzzle word games
    r"\bwordle\b"
    r"|\bspelling\s+bee\b"
    r"|\bminutecryptic\b"
    r"|\bplusword\b"
    r"|\bquordle\b"
    r"|\boctordle\b"
    r"|\bonly connect\b"  # BBC word/trivia game
    r"|\bconnections\b"  # NYT Connections word game
    r"|\bcodeword\b"  # word puzzle (not a logic puzzle)
    r"|\bletterboxed\b"  # NYT word game
    # Video games
    r"|\bblue\s+prince\b"
    # CTC channel meta-content (not puzzle videos)
    r"|the\s+podcast\b.{0,30}\bepisode\b"  # "The Podcast - Episode N"
    r"|podcast.{0,20}pilot"  # "Podcast - Pilot Episode"
    r"|cracking\s+the\s+cryptic.{0,30}the\s+(?:movie|extended\s+cut|pitch\s+meeting|miracle\s+movie)"
    r"|\bthe\s+computer\s+game\b"  # "Cracking The Cryptic: The Computer Game!"
    r"|\blive\s+stream\b"  # livestream episodes
    r"|\basmr\b",  # ASMR videos
    re.IGNORECASE,
)

# Soft-reject patterns: filter out UNLESS the description has positive signals.
# Used for ambiguous titles like "Experts Play X" where X could be a logic puzzle.
_SOFT_REJECT_RE = re.compile(
    r"\bexperts?\s+plays?\b",  # "Experts Play" / "Expert Plays" — hosts playing a game
    re.IGNORECASE,
)

# A puzzle URL in the description is the strongest positive signal.
_PUZZLE_URL_QUICK_RE = re.compile(
    r"https?://(?:sudokupad\.app|app\.crackingthecryptic\.com/sudoku|(?:www\.)?f-puzzles\.com)",
    re.IGNORECASE,
)

# Logic/pencil puzzle vocabulary in the puzzle-rules section of the description.
# We check the stripped section (not the full description) to avoid matching
# sudoku-related words in CTC's promotional boilerplate.
_PUZZLE_VOCAB_RE = re.compile(
    r"\bsudoku\b|\bkiller\b|\bthermos?\b|\brenban\b|\bwhispers\b|\bfog\s+of\s+war\b"
    r"|\bnurikabe\b|\bnonogram\b|\bkakuro\b|\bhitori\b|\bstar\s+battle\b|\bgalaxy\b"
    r"|\bloop\b|\bslitherlink\b|\bminesweeper\b|\bskyscraper\b|\barrow\b",
    re.IGNORECASE,
)


def is_puzzle_video(title: str, description: str = "") -> bool:
    """Return True if this looks like a puzzle video worth including.

    Keeps sudoku, pencil puzzles, crosswords, and any video with a SudokuPad link.
    Rejects channel meta-content (podcasts, movies, ASMR) and non-puzzle word games
    (Wordle, Spelling Bee, Connections, etc.).

    Decision order:
    1. Puzzle URL in description → always keep.
    2. Hard-reject title pattern → always filter.
    3. Soft-reject title pattern (Experts Play) → filter unless description has
       logic-puzzle vocabulary.
    4. Otherwise → keep.
    """
    description = description or ""
    title = title or ""

    # 1. Strongest positive signal: a puzzle link in the description
    if _PUZZLE_URL_QUICK_RE.search(description):
        return True

    # 2. Hard reject — word puzzles / clearly non-logic content
    if _HARD_REJECT_RE.search(title):
        return False

    # 3. Soft reject — ambiguous, check boilerplate-stripped description
    if _SOFT_REJECT_RE.search(title):
        rules_section = _puzzle_rules_section(description)
        return bool(_PUZZLE_VOCAB_RE.search(rules_section))

    return True


# ---------------------------------------------------------------------------
# Puzzle source detection
# ---------------------------------------------------------------------------

_SOURCE_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"logic-masters\.de", re.IGNORECASE), "Logic Masters"),
    (re.compile(r"gmpuzzles\.com", re.IGNORECASE), "GM Puzzles"),
]


def extract_source(description: str) -> str | None:
    """Detect the original publication source from URLs in the description."""
    if not description:
        return None
    for pattern, name in _SOURCE_PATTERNS:
        if pattern.search(description):
            return name
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
