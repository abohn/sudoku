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
    # ---- Word puzzles (category: word) ----
    # Matched against video title (not description), so patterns should be broad
    # but unambiguous. "crossword" is always a crossword; "cryptic" alone is too
    # ambiguous (also used in "cryptic sudoku"), so we require newspaper context
    # or the explicit word "crossword".
    {
        "slug": "cryptic-crossword",
        "display_name": "Cryptic Crossword",
        "category": "word",
        "title_only": True,  # CTC descriptions mention crosswords promotionally; title is reliable
        "description": "British-style crossword where each clue is a wordplay puzzle.",
        "patterns": [
            r"\bcrossword\b",
            r"\bguardian\s+cryptic\b",
            r"\btimes\s+(?:cryptic|masterclass)\b",
            r"\bquick\s+cryptic\b",
            r"\bspeedrun.*cryptic\b",
            r"\bcryptic.*speedrun\b",
        ],
    },
    {
        "slug": "meta-puzzle",
        "display_name": "Meta Puzzle",
        "category": "word",
        "title_only": True,
        "description": "A puzzle whose completed solution yields a hidden meta-answer.",
        "patterns": [
            r"\bmeta[\s-](?:puzzle|crossword|conundrum)\b",
            r"\bMGWCC\b",
        ],
    },
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
    {
        "slug": "yin-yang",
        "display_name": "Yin Yang",
        "description": "Shade cells so shaded and unshaded cells each form a single connected group, with no 2×2 area fully shaded or unshaded.",
        "patterns": [
            r"\byin.?yang\b",
        ],
    },
    {
        "slug": "chaos-construction",
        "display_name": "Chaos Construction",
        "description": "The solver must deduce the region boundaries as part of solving the puzzle.",
        "patterns": [
            r"\bchaos construction\b",
            r"\bregions?[^.!?\n]{0,60}\bmust (?:be )?(?:determin|deduc|find)\b",
        ],
    },
    {
        "slug": "inequality",
        "display_name": "Inequality",
        "description": "Inequality signs between adjacent cells indicate which cell contains the larger digit.",
        "patterns": [
            r"\binequality sign\b",
            r"\binequality[^.!?\n]{0,60}\b(?:point|cell|between|smaller|larger)\b",
            r"\bgreater than[^.!?\n]{0,60}\b(?:sign|cell|constraint|clue)\b",
            r"\b(?:point|sign)[^.!?\n]{0,40}\b(?:smaller|larger) digit\b",
        ],
    },
    {
        "slug": "quadruple",
        "display_name": "Quadruple",
        "description": "A clue in the corner of four cells lists digits that must appear among those four cells.",
        "patterns": [
            r"\bquadruple\b",
        ],
    },
    {
        "slug": "parity-lines",
        "display_name": "Parity Lines",
        "description": "Digits along a parity line must strictly alternate between odd and even.",
        "patterns": [
            r"\bparity lines?\b",
            r"\bparity[^.!?\n]{0,60}\balternat\b",
            r"\balternat[^.!?\n]{0,60}\b(?:odd|even)[^.!?\n]{0,60}\bline\b",
        ],
    },
    {
        "slug": "snake",
        "display_name": "Snake",
        "description": "Shade cells to form a one-cell-wide snake (connected path) satisfying given constraints.",
        "patterns": [
            r"\bsnake egg\b",
            r"\bform a snake\b",
            r"\bone.cell.wide[^.!?\n]{0,60}\bsnake\b",
            r"\bsnake[^.!?\n]{0,60}\bone.cell.wide\b",
        ],
    },
    {
        "slug": "equal-sums",
        "display_name": "Equal Sums",
        "description": "Multiple groups or regions must have the same total sum.",
        "patterns": [
            r"\bequal sums?\b",
        ],
    },
    {
        "slug": "consecutive",
        "display_name": "Consecutive",
        "description": "Marked pairs of adjacent cells must contain consecutive digits.",
        # Avoid matching "nonconsecutive" / "non-consecutive" contexts by requiring
        # a following noun or a positive verb form ("are/must be consecutive").
        "patterns": [
            r"\bconsecutive (?:dots?|pairs?|clue|constraint)\b",
            r"\badjacent cells? (?:are|must be) consecutive\b",
            r"\bmarked (?:as )?consecutive\b",
            r"\bdots? (?:indicate|mark|show|denote) (?:that )?(?:adjacent )?cells? are consecutive\b",
        ],
    },
    {
        "slug": "ratio",
        "display_name": "Ratio",
        "description": "Marked pairs of adjacent cells must have a 1:2 ratio between them.",
        "patterns": [
            r"\bratio (?:dots?|clue|constraint|rule)\b",
            r"\b1:2 ratio\b",
            r"\bdots? (?:indicate|mark|denote) (?:a )?(?:1:2 )?ratio\b",
            r"\bone cell (?:is )?(?:double|twice) (?:the other|its neighbou?r|adjacent)\b",
            r"\bratio sudoku\b",
        ],
    },
    {
        "slug": "sequence",
        "display_name": "Sequence",
        "description": "Digits on a line form a set of consecutive digits in any order (a sequence line).",
        "patterns": [
            r"\bsequence lines?\b",
            r"\bsequence (?:constraint|clue|rule|sudoku)\b",
        ],
    },
    {
        "slug": "indexing",
        "display_name": "Indexing",
        "description": "A digit in a cell indicates the column (or row) in its row (or column) where a specific digit appears.",
        "patterns": [
            r"\bindexing\b",
            r"\bindex(?:er|ing)? (?:digit|cell|column|row|clue|constraint)\b",
            r"\bself.?referential\b",
        ],
    },
    {
        "slug": "liar",
        "display_name": "Liar",
        "description": "Exactly one clue in a given set is false; the rest are true.",
        "patterns": [
            r"\bliar\b",
            r"\bone (?:of (?:the|each) )?(?:clue|constraint|rule)s? (?:is (?:false|a lie)|lies?)\b",
        ],
    },
    {
        "slug": "fortress",
        "display_name": "Fortress",
        "description": "Shaded cells must contain a digit greater than all orthogonally adjacent unshaded cells.",
        "patterns": [
            r"\bfortress\b",
        ],
    },
    {
        "slug": "windoku",
        "display_name": "Windoku",
        "description": "Four 3×3 windows at fixed positions act as extra boxes, each containing 1–9.",
        "patterns": [
            r"\bwindoku\b",
            r"\bwindow sudoku\b",
        ],
    },
    {
        "slug": "toroidal",
        "display_name": "Toroidal",
        "description": "The grid wraps around — the top connects to the bottom and left connects to the right.",
        "patterns": [
            r"\btoroidal\b",
            r"\bthe grid wraps\b",
            r"\bwraps? around the (?:grid|board|edge)\b",
            r"\btorus\b",
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
    # ---- Non-sudoku / pencil puzzles ----
    # Individual rules for common pencil puzzle types (ordered most-specific first).
    # Each carries category="pencil" so the frontend can group them separately.
    {
        "slug": "star-battle",
        "display_name": "Star Battle",
        "description": "Place stars in regions so each row, column, and region has exactly the same number of stars, with no two stars touching.",
        "category": "pencil",
        "patterns": [r"\bstar battle\b", r"\bstar[- ]wars?\b(?!.*sudoku)"],
    },
    {
        "slug": "nurikabe",
        "display_name": "Nurikabe",
        "description": "Shade cells to form rivers (connected black cells) while islands (white regions) match the given clue numbers.",
        "category": "pencil",
        "patterns": [r"\bnurikabe\b"],
    },
    {
        "slug": "slitherlink",
        "display_name": "Slitherlink",
        "description": "Draw a single closed loop along grid edges so each numbered cell has that many loop segments around it.",
        "category": "pencil",
        "patterns": [r"\bslitherlink\b", r"\bfences\b(?!.*sudoku)"],
    },
    {
        "slug": "fillomino",
        "display_name": "Fillomino",
        "description": "Divide the grid into polyominoes where each cell's number equals the size of its polyomino.",
        "category": "pencil",
        "patterns": [r"\bfillomino\b"],
    },
    {
        "slug": "pentomino",
        "display_name": "Pentominoes",
        "description": "Logic puzzle involving the 12 distinct shapes made of 5 connected squares.",
        "category": "pencil",
        "patterns": [r"\bpentomino\b"],
    },
    {
        "slug": "nonogram",
        "display_name": "Nonogram",
        "description": "Fill cells to reveal a picture using row/column clues indicating run lengths.",
        "category": "pencil",
        "patterns": [r"\bnonogram\b", r"\bpicross\b", r"\bpaint by numbers\b"],
    },
    {
        "slug": "masyu",
        "display_name": "Masyu",
        "description": "Draw a loop that passes through all circles: straight through white circles (turning before/after), turning at black circles (straight before and after).",
        "category": "pencil",
        "patterns": [r"\bmasyu\b", r"\bmashu\b"],
    },
    {
        "slug": "suguru",
        "display_name": "Suguru",
        "description": "Fill each region with digits 1–N (where N is the region size); no two touching cells may share a digit.",
        "category": "pencil",
        "patterns": [r"\bsuguru\b"],
    },
    {
        "slug": "tapa",
        "display_name": "Tapa",
        "description": "Shade cells to form a single connected wall; clues indicate the lengths of shaded runs in the surrounding 8 cells.",
        "category": "pencil",
        "patterns": [r"\btapa\b"],
    },
    {
        "slug": "hitori",
        "display_name": "Hitori",
        "description": "Black out cells so no digit repeats in any row or column, no two blacked-out cells touch, and all remaining cells are connected.",
        "category": "pencil",
        "patterns": [r"\bhitori\b"],
    },
    {
        "slug": "spiral-galaxies",
        "display_name": "Spiral Galaxies",
        "description": "Divide the grid into 180°-rotationally-symmetric regions, each containing exactly one circle at its centre of symmetry.",
        "category": "pencil",
        "patterns": [r"\bspiral galaxi"],  # "spiral galaxy" / "spiral galaxies"
    },
    {
        "slug": "japanese-sums",
        "display_name": "Japanese Sums",
        "description": "Clues outside the grid indicate the sums of runs of shaded cells in each row and column.",
        "category": "pencil",
        "patterns": [r"\bjapanese sums?\b"],
    },
    {
        "slug": "cave",
        "display_name": "Cave",
        "description": "Shade cells so that the unshaded region forms a single connected cave; clues indicate visibility from that cell.",
        "category": "pencil",
        "patterns": [r"\bcave puzzle\b", r"\bcave sudoku\b", r"\bcave[^.!?\n]{0,60}\bshad\b"],
    },
    {
        "slug": "kakuro",
        "display_name": "Kakuro",
        "description": "Fill the grid with digits 1–9 so each run sums to its clue with no repeated digits.",
        "category": "pencil",
        "patterns": [r"\bkakuro\b", r"\bcross sums\b"],
    },
    {
        "slug": "loop-puzzle",
        "display_name": "Loop Puzzle",
        "description": "Draw a single closed loop through the grid satisfying given constraints.",
        "category": "pencil",
        "patterns": [
            r"\bloop puzzle\b",
            r"\bdraw a loop\b",
            r"\bsingle (?:closed )?loop\b",
            r"\byakeru\b",
            r"\bnurikabe\b(?!.*nurikabe)",  # never reached; kept for future
        ],
    },
    {
        "slug": "minesweeper",
        "display_name": "Minesweeper",
        "description": "Locate hidden mines using numeric clues that indicate how many mines are adjacent to each revealed cell.",
        "category": "pencil",
        "patterns": [r"\bminesweeper\b"],
    },
    # Catch-all for other non-sudoku pencil puzzles not covered above.
    {
        "slug": "non-sudoku",
        "display_name": "Other Pencil Puzzle",
        "description": "A logic/pencil puzzle not covered by other rule types.",
        "category": "pencil",
        "patterns": [
            r"\bhashiwokakero\b",
            r"\bhashi\b",
            r"\baquarium\b(?!.*sudoku)",
            r"\bpicture logic\b",
            r"\bnumbrix\b",
            r"\bhidato\b",
            r"\bkaleidoscope\b(?!.*sudoku)",
            r"\bchocolate box\b",
        ],
    },
]
