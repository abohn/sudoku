"""
Canonical rule definitions. Imported by both main.py (for seeding) and
rule_parser.py (for pattern matching). Lives here to avoid circular imports.

Rules are ordered from most-specific to least-specific within each family
so that catch-all patterns don't steal matches from precise ones.

Patterns are intent-aware: they require enough semantic context to distinguish
the rule from incidental uses of the same word (e.g. "arrow" alone vs.
"arrow sum", "irregular" alone vs. "irregular region/grid").
"""

RULE_DEFINITIONS: list[dict] = [
    # ---- Very common ----
    {
        "slug": "arrow",
        "display_name": "Arrow",
        "description": "Digits along arrows sum to the digit(s) in the circle or pill.",
        # Require "sum" within ~100 chars of "arrow(s)" in either order.
        # This distinguishes arrow-summing from decorative uses (e.g. one-way doors).
        "patterns": [
            r"\barrow sums?\b",  # "Arrow Sum" / "Arrow Sums"
            r"\barrows?[^.!?\n]{0,100}\bsum\b",  # "arrow ... sum"
            r"\bsum\b[^.!?\n]{0,100}\barrows?\b",  # "sum ... arrow"
            r"\bdigits? (?:on|along) (?:the )?arrows?\b",  # "digits on/along the arrows"
            r"\bcircle[^.!?\n]{0,60}\barrow\b",  # "circle ... arrow" (bulb context)
        ],
    },
    {
        "slug": "killer",
        "display_name": "Killer Cage",
        "description": "Digits in dashed cages sum to the given total and don't repeat within the cage.",
        "patterns": [
            r"\bkiller\b",
            r"\bdashed (?:cage|box)\b",
            r"\bcage[^.!?\n]{0,60}\bsum\b",  # "cage ... sum"
            r"\bsum\b[^.!?\n]{0,60}\bcage\b",  # "sum ... cage"
        ],
    },
    {
        "slug": "thermo",
        "display_name": "Thermometer",
        "description": "Digits must strictly increase from the bulb end to the flat end.",
        "patterns": [
            r"\bthermo(?:meter)?s?\b",
            r"\bdigits? (?:increase|must increase|strictly increase) (?:from|along)\b",
            r"\bbulb[^.!?\n]{0,80}\bincreas\b",  # "bulb ... increas(e/ing)"
        ],
    },
    {
        "slug": "german-whispers",
        "display_name": "German Whispers",
        "description": "Adjacent digits on the green line must differ by at least 5.",
        "patterns": [
            r"\bgerman whispers?\b",
            r"\bdiffer by at least 5\b",
            r"\bdifference of (?:at least )?5\b",
        ],
    },
    {
        "slug": "renban",
        "display_name": "Renban",
        "description": "Digits on the line form a set of consecutive digits in any order.",
        "patterns": [
            r"\brenban\b",
            r"\bconsecutive (?:set|group|digits?)[^.!?\n]{0,80}\b(?:line|path)\b",
            r"\b(?:line|path)[^.!?\n]{0,80}\bconsecutive (?:set|group|digits?)\b",
        ],
    },
    {
        "slug": "anti-knight",
        "display_name": "Anti-Knight",
        "description": "No digit may repeat at a chess knight's move distance.",
        "patterns": [
            r"\banti.?knight\b",
            r"\bknight(?:'s)? (?:move|constraint)\b",
            r"\bno (?:two )?(?:equal |same )?digits?[^.!?\n]{0,80}\bknight\b",
        ],
    },
    {
        "slug": "sandwich",
        "display_name": "Sandwich",
        "description": "Digits sandwiched between 1 and 9 in each row/column sum to the clue.",
        "patterns": [
            r"\bsandwich\b",
            r"\bdigits? between the 1 and(?: the)? 9\b",
            r"\bsandwiched between\b",
        ],
    },
    {
        "slug": "between-lines",
        "display_name": "Between Lines",
        "description": "Digits on a line must be strictly between the values of the circles at each end.",
        "patterns": [
            r"\bbetween lines?\b",
            r"\bstrictly between\b[^.!?\n]{0,80}\b(?:circle|endpoint|bulb)\b",
            r"\b(?:circle|endpoint|bulb)\b[^.!?\n]{0,80}\bstrictly between\b",
            r"\bdigits? on(?: the)? line[^.!?\n]{0,80}\bbetween[^.!?\n]{0,80}\bcircle\b",
            r"\bmust be strictly between the (?:values?|digits?)\b",
            r"\bstrictly between the (?:two )?(?:values?|digits?) (?:in|at|of)\b",
        ],
    },
    {
        "slug": "little-killer",
        "display_name": "Little Killer",
        "description": "Digits along indicated diagonals sum to the clue (repeats allowed).",
        "patterns": [
            r"\blittle killer\b",
            r"\bdiagonal[^.!?\n]{0,80}\bsum\b[^.!?\n]{0,40}\b(?:repeat|clue|arrow)\b",
        ],
    },
    {
        "slug": "palindrome",
        "display_name": "Palindrome",
        "description": "Digits on the line read the same forwards and backwards.",
        "patterns": [
            r"\bpalindrome\b",
            r"\bread the same (?:forwards? and backwards?|in (?:both|either) direction)\b",
        ],
    },
    {
        "slug": "diagonal",
        "display_name": "Diagonal",
        "description": "The main diagonals each contain the digits 1–9 exactly once.",
        "patterns": [
            r"\bdiagonal sudoku\b",
            r"\bmain diagonal\b",
            r"\bdiagonals? (?:contain|must contain|also)\b",
            r"\bpositive diagonal\b",
            r"\bnegative diagonal\b",
            r"\b(?:marked |highlighted )?diagonals? (?:are|act as) (?:a )?(?:normal )?(?:row|column|region)\b",
        ],
    },
    {
        "slug": "region-sum-lines",
        "display_name": "Region Sum Lines",
        "description": "Digits on lines sum to the same total in each 3×3 box they pass through.",
        "patterns": [
            r"\bregion sum\b",
            r"\bsame (?:sum|total)[^.!?\n]{0,80}\b(?:box|region|3.3)\b",
            r"\b(?:box|region|3.3)\b[^.!?\n]{0,80}\bsame (?:sum|total)\b",
        ],
    },
    {
        "slug": "dutch-whispers",
        "display_name": "Dutch Whispers",
        "description": "Adjacent digits on the line must differ by at least 4.",
        "patterns": [
            r"\bdutch whispers?\b",
            r"\bdiffer by at least 4\b",
            r"\bdifference of (?:at least )?4\b",
        ],
    },
    {
        "slug": "x-sums",
        "display_name": "X-Sums",
        "description": "The first X digits in a row/column sum to the clue, where X is the first digit seen.",
        "patterns": [
            r"\bx.?sums?\b",
            r"\bfirst x digits?\b",
            r"\bx (?:digits?|cells?)[^.!?\n]{0,80}\bsum\b",
        ],
    },
    {
        "slug": "skyscraper",
        "display_name": "Skyscraper",
        "description": "Clues indicate how many 'buildings' (taller digits) are visible from that side.",
        "patterns": [
            r"\bskyscraper\b",
            r"\bhow many (?:buildings?|skyscrapers?|digits?) (?:are )?visible\b",
            r"\bvisible (?:buildings?|skyscrapers?)\b",
        ],
    },
    # ---- Moderate frequency ----
    {
        "slug": "nonconsecutive",
        "display_name": "Nonconsecutive",
        "description": "Orthogonally adjacent cells may not contain consecutive digits.",
        "patterns": [
            r"\bnon.?consecutive\b",
            r"\bno (?:two )?orthogonally adjacent[^.!?\n]{0,80}\bconsecutive\b",
            r"\badjacent cells?[^.!?\n]{0,80}\b(?:may not|cannot|must not) (?:be )?consecutive\b",
        ],
    },
    {
        "slug": "anti-king",
        "display_name": "Anti-King",
        "description": "No digit may repeat at a chess king's move distance.",
        "patterns": [
            r"\banti.?king\b",
            r"\bking(?:'s)? (?:move|constraint)\b",
            r"\bno (?:two )?(?:equal |same )?digits?[^.!?\n]{0,80}\bking\b",
        ],
    },
    {
        "slug": "zipper",
        "display_name": "Zipper",
        "description": "Digits equidistant from the centre of a line sum to the same value.",
        "patterns": [
            r"\bzipper\b",
            r"\bequidistant[^.!?\n]{0,80}\bsum\b",
            r"\bsum to the same[^.!?\n]{0,80}\bequidistant\b",
            r"\bdigits? (?:equidistant|equal distance) from (?:the )?cent(?:er|re)\b",
        ],
    },
    {
        "slug": "entropic",
        "display_name": "Entropic Lines",
        "description": "Any 3 consecutive cells on a line contain a low (1–3), mid (4–6), and high (7–9) digit.",
        "patterns": [
            r"\bentropic\b",
            r"\blow[^.!?\n]{0,60}\bmid(?:dle)?\b[^.!?\n]{0,60}\bhigh\b[^.!?\n]{0,80}\b(?:line|path|loop)\b",
            r"\b(?:line|path|loop)\b[^.!?\n]{0,80}\blow[^.!?\n]{0,60}\bmid(?:dle)?\b[^.!?\n]{0,60}\bhigh\b",
            r"\b\{1,\s*2,\s*3\}[^.!?\n]{0,80}\b(?:line|path|loop)\b",
        ],
    },
    {
        "slug": "modular",
        "display_name": "Modular Lines",
        "description": "Any 3 consecutive cells on a line contain digits from each of the three mod-3 classes.",
        "patterns": [
            r"\bmodular (?:line|path|group|constraint)\b",
            r"\b(?:line|path)[^.!?\n]{0,80}\bmodular group\b",
            r"\bmod(?:ular)?-?3 (?:class|group|residue)\b",
            r"\bone digit from each (?:of )?(?:the )?three (?:modular )?group\b",
        ],
    },
    {
        "slug": "clone",
        "display_name": "Clone",
        "description": "Shaded regions contain identical digit patterns.",
        "patterns": [
            r"\bclone[^.!?\n]{0,80}\b(?:region|cell|shad|identical)\b",
            r"\b(?:region|cell|shad|identical)\b[^.!?\n]{0,80}\bclone\b",
            r"\bidentical (?:digit )?patterns?\b[^.!?\n]{0,80}\b(?:region|shad)\b",
            r"\bshaded regions?[^.!?\n]{0,80}\bidentical\b",
        ],
    },
    {
        "slug": "fog-of-war",
        "display_name": "Fog of War",
        "description": "Cells are hidden until revealed by placing correct digits nearby.",
        "patterns": [
            r"\bfog of war\b",
            r"\bcells? (?:are )?hidden[^.!?\n]{0,80}\b(?:revealed|correct)\b",
            r"\bfog (?:conceals?|hides?|clears?)\b",
        ],
    },
    {
        "slug": "nabner",
        "display_name": "Nabner",
        "description": "No digit on a line appears within that digit's value of itself on the same line.",
        "patterns": [
            r"\bnabner\b",
            r"\bno (?:two )?digits?[^.!?\n]{0,80}\bwithin (?:that digit's|its) value\b",
        ],
    },
    {
        "slug": "odd-even",
        "display_name": "Odd/Even",
        "description": "Highlighted cells must contain odd or even digits as indicated.",
        "patterns": [
            r"\bodd.?even\b",
            r"\beven.?odd\b",
            r"\bshaded cells? (?:are|must be|contain) (?:odd|even)\b",
            r"\bcircled cells? (?:are|must be|contain) (?:odd|even)\b",
            r"\bmarked cells? (?:are|must be|contain) (?:odd|even)\b",
            r"\b(?:square|circle)[^.!?\n]{0,60}\b(?:odd|even)\b[^.!?\n]{0,60}\b(?:square|circle)\b",
            r"\b(?:grey|gray) (?:cell|square)[^.!?\n]{0,60}\b(?:odd|even)\b",
        ],
    },
    {
        "slug": "xv",
        "display_name": "XV",
        "description": "Adjacent cells marked X sum to 10; cells marked V sum to 5.",
        "patterns": [
            r"\bxv\b",
            r"\bx[^.!?\n]{0,40}\bsum(?:s)? to 10\b",
            r"\bv[^.!?\n]{0,40}\bsum(?:s)? to 5\b",
            r"\bsum to 10[^.!?\n]{0,40}\bx\b",
            r"\bsum to 5[^.!?\n]{0,40}\bv\b",
            r"\badjacent[^.!?\n]{0,40}\bsum to (?:10|5)\b[^.!?\n]{0,40}\b(?:marked|x|v)\b",
        ],
    },
    {
        "slug": "kropki",
        "display_name": "Kropki Dots",
        "description": "White dots mark consecutive digits; black dots mark digits in a 1:2 ratio.",
        "patterns": [
            r"\bkropki\b",
            r"\bwhite dot[^.!?\n]{0,80}\bconsecutive\b",
            r"\bconsecutive\b[^.!?\n]{0,80}\bwhite dot\b",
            r"\bblack dot[^.!?\n]{0,80}\b(?:double|ratio|1:2|twice)\b",
            r"\b(?:double|ratio|1:2|twice)\b[^.!?\n]{0,80}\bblack dot\b",
            r"\bdot[^.!?\n]{0,60}\b(?:consecutive|ratio|double)\b",
        ],
    },
    {
        "slug": "extra-regions",
        "display_name": "Extra Regions",
        "description": "Additional highlighted regions must also contain 1–9.",
        "patterns": [
            r"\bextra regions?\b",
            r"\bhyper(?:cube)?\b",
            r"\badditional (?:region|box|area)[^.!?\n]{0,80}\b(?:1.9|one.nine|normal region)\b",
            r"\b(?:shaded|highlighted|colou?red) regions?[^.!?\n]{0,80}\b(?:also contain|must contain|1.9)\b",
        ],
    },
    {
        "slug": "disjoint-groups",
        "display_name": "Disjoint Groups",
        "description": "Digits in the same position within each 3×3 box must all be different.",
        "patterns": [
            r"\bdisjoint\b",
            r"\bsame position[^.!?\n]{0,80}\b(?:box|region|3.3)\b",
            r"\b(?:box|region|3.3)\b[^.!?\n]{0,80}\bsame position[^.!?\n]{0,80}\bdifferent\b",
        ],
    },
    {
        "slug": "irregular",
        "display_name": "Irregular / Jigsaw",
        "description": "The grid uses irregular jigsaw-shaped regions instead of standard 3×3 boxes.",
        "patterns": [
            r"\birregular (?:region|grid|box|jigsaw|shape|sudoku)\b",
            r"\bjigsaw\b",
            r"\b(?:non.?standard|non.?rectangular|oddly.?shaped) (?:region|box|area)\b",
            r"\b9 (?:irregular|jigsaw|non.?standard) regions?\b",
        ],
    },
    {
        "slug": "miracle",
        "display_name": "Miracle",
        "description": "Combines anti-knight, anti-king, and nonconsecutive constraints.",
        "patterns": [
            r"\bmiracle\b",
            r"\banti.?knight[^.!?\n]{0,80}\banti.?king[^.!?\n]{0,80}\bnon.?consecutive\b",
        ],
    },
    # ---- Catch-all for unlisted whisper variants ----
    {
        "slug": "whispers",
        "display_name": "Whisper Lines",
        "description": "Adjacent digits on a line must differ by a minimum value (variant not otherwise specified).",
        # Negative lookbehind excludes "german whispers", "dutch whispers", "green whispers"
        "patterns": [r"(?<!german )(?<!dutch )(?<!green )\bwhispers?\b"],
    },
    # ---- Non-sudoku logic puzzles ----
    # Catches pure non-sudoku pencil puzzles (Fillomino, Nurikabe, Star Battle, etc.)
    # as well as sudoku hybrids that use these puzzle types as their primary constraint.
    {
        "slug": "non-sudoku",
        "display_name": "Non-Sudoku Puzzle",
        "description": "A logic/pencil puzzle that isn't standard sudoku — e.g. Star Battle, Nurikabe, Fillomino, Slitherlink, Pentominoes.",
        "patterns": [
            r"\bpentomino\b",
            r"\bnurikabe\b",
            r"\bnonogram\b",
            r"\bstar battle\b",
            r"\bslitherlink\b",
            r"\bmasyu\b",
            r"\bfillomino\b",
            r"\bsuguru\b",
            r"\btapa\b",
            r"\bhitori\b",
            r"\bspiral galaxi",  # "spiral galaxy" / "spiral galaxies"
            r"\bkakuro\b",
        ],
    },
]
