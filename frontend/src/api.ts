/**
 * Data layer — loads a pre-exported data.json and implements all
 * filtering/sorting/pagination client-side so the app runs without a backend.
 */
import type {
  DifficultyLabel,
  MatchMode,
  PaginatedVideos,
  Rule,
  Setter,
  SortOption,
  SortOrder,
  VideoSummary,
} from "./types";

interface StaticData {
  generated_at: string;
  videos: VideoSummary[];
  rules: Rule[];
  setters: Setter[];
}

// difficulty label → [min_inclusive, max_exclusive] (null = unbounded)
const DIFFICULTY_RANGES: Record<DifficultyLabel, [number | null, number | null]> = {
  easy: [null, 3.0],
  medium: [3.0, 5.5],
  hard: [5.5, 7.5],
  brutal: [7.5, null],
};

// Singleton — load data.json once for the lifetime of the page.
let _promise: Promise<StaticData> | null = null;

function loadData(): Promise<StaticData> {
  if (!_promise) {
    // import.meta.env.BASE_URL is "/" locally and "/repo-name/" on GitHub Pages.
    _promise = fetch(`${import.meta.env.BASE_URL}data.json`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load data.json (${r.status})`);
      return r.json() as Promise<StaticData>;
    });
  }
  return _promise;
}

export async function fetchRules(): Promise<Rule[]> {
  const { rules } = await loadData();
  return rules;
}

export async function fetchSetters(): Promise<Setter[]> {
  const { setters } = await loadData();
  return setters;
}

export async function fetchPuzzles(params: {
  rules?: string[];
  match?: MatchMode;
  sort?: SortOption;
  order?: SortOrder;
  has_puzzle_url?: boolean;
  setter?: string;
  difficulties?: DifficultyLabel[];
  page?: number;
  per_page?: number;
}): Promise<PaginatedVideos> {
  const {
    rules = [],
    match = "all",
    sort = "published",
    order = "desc",
    has_puzzle_url,
    setter,
    difficulties = [],
    page = 1,
    per_page = 24,
  } = params;

  const { videos } = await loadData();
  let items = videos;

  // Rule filter
  if (rules.length > 0) {
    items = items.filter((v) => {
      const slugs = new Set(v.rules.map((vr) => vr.rule.slug));
      return match === "all" ? rules.every((s) => slugs.has(s)) : rules.some((s) => slugs.has(s));
    });
  }

  // Puzzle URL filter
  if (has_puzzle_url === true) {
    items = items.filter((v) => v.puzzle_url != null);
  } else if (has_puzzle_url === false) {
    items = items.filter((v) => v.puzzle_url == null);
  }

  // Setter filter
  if (setter) {
    items = items.filter((v) => v.setter_name === setter);
  }

  // Difficulty filter
  if (difficulties.length > 0) {
    items = items.filter((v) => {
      if (v.difficulty_score == null) return false;
      const score = v.difficulty_score;
      return difficulties.some((label) => {
        const [lo, hi] = DIFFICULTY_RANGES[label];
        if (lo != null && score < lo) return false;
        if (hi != null && score >= hi) return false;
        return true;
      });
    });
  }

  // Sort (stable — spread to avoid mutating the cached array)
  items = [...items].sort((a, b) => {
    let av: number | string | null;
    let bv: number | string | null;
    if (sort === "views") {
      av = a.view_count;
      bv = b.view_count;
    } else if (sort === "solve_time") {
      av = a.solve_duration_seconds;
      bv = b.solve_duration_seconds;
    } else if (sort === "difficulty") {
      av = a.difficulty_score;
      bv = b.difficulty_score;
    } else {
      av = a.published_at;
      bv = b.published_at;
    }

    if (av == null && bv == null) return 0;
    if (av == null) return order === "desc" ? 1 : -1;
    if (bv == null) return order === "desc" ? -1 : 1;
    if (av < bv) return order === "desc" ? 1 : -1;
    if (av > bv) return order === "desc" ? -1 : 1;
    return 0;
  });

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / per_page));
  const offset = (page - 1) * per_page;

  return {
    items: items.slice(offset, offset + per_page),
    total,
    page,
    per_page,
    pages,
  };
}
