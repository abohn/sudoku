/**
 * Data layer — loads a pre-exported data.json and implements all
 * filtering/sorting/pagination client-side so the app runs without a backend.
 */
import type {
  Collection,
  DifficultyLabel,
  HistogramBucket,
  MatchMode,
  PaginatedVideos,
  Rule,
  Setter,
  Source,
  SortOption,
  SortOrder,
  VideoSummary,
} from "./types";

interface StaticData {
  generated_at: string;
  videos: VideoSummary[];
  rules: Rule[];
  setters: Setter[];
  sources: Source[];
  collections: Collection[];
}

const DIFFICULTY_RANGES: Record<DifficultyLabel, [number | null, number | null]> = {
  easy: [null, 3.0],
  medium: [3.0, 5.5],
  hard: [5.5, 7.5],
  brutal: [7.5, null],
};

let _promise: Promise<StaticData> | null = null;

export function loadData(): Promise<StaticData> {
  if (!_promise) {
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

export async function fetchSources(): Promise<Source[]> {
  const data = await loadData();
  return data.sources ?? [];
}

export async function fetchCollections(): Promise<Collection[]> {
  const data = await loadData();
  return data.collections ?? [];
}

export async function fetchAllVideos(): Promise<VideoSummary[]> {
  const { videos } = await loadData();
  return videos;
}

export async function fetchPuzzles(params: {
  rules?: string[];
  match?: MatchMode;
  sort?: SortOption;
  order?: SortOrder;
  has_puzzle_url?: boolean;
  setter?: string;
  source?: string;
  collection?: string;
  difficulties?: DifficultyLabel[];
  searchQuery?: string;
  solveTime?: string;
  watchlistOnly?: boolean;
  watchlistIds?: Set<string>;
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
    source,
    collection,
    difficulties = [],
    searchQuery = "",
    solveTime,
    watchlistOnly = false,
    watchlistIds,
    page = 1,
    per_page = 24,
  } = params;

  const { videos } = await loadData();
  let items = videos;

  if (rules.length > 0) {
    items = items.filter((v) => {
      const slugs = new Set(v.rules.map((vr) => vr.rule.slug));
      return match === "all" ? rules.every((s) => slugs.has(s)) : rules.some((s) => slugs.has(s));
    });
  }

  if (has_puzzle_url === true) {
    items = items.filter((v) => v.puzzle_url != null);
  } else if (has_puzzle_url === false) {
    items = items.filter((v) => v.puzzle_url == null);
  }

  if (setter) {
    items = items.filter((v) => v.setter_name === setter);
  }

  if (source) {
    items = items.filter((v) => v.source_name === source);
  }

  if (collection) {
    items = items.filter((v) => v.collections?.includes(collection));
  }

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

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    items = items.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        (v.setter_name?.toLowerCase().includes(q) ?? false) ||
        v.rules.some((vr) => vr.rule.display_name.toLowerCase().includes(q))
    );
  }

  if (solveTime) {
    items = items.filter((v) => {
      const mins = v.solve_duration_seconds != null ? v.solve_duration_seconds / 60 : null;
      if (mins == null) return false;
      if (solveTime === "lt30") return mins < 30;
      if (solveTime === "30-60") return mins >= 30 && mins < 60;
      if (solveTime === "60-90") return mins >= 60 && mins < 90;
      if (solveTime === "gt90") return mins >= 90;
      return true;
    });
  }

  if (watchlistOnly && watchlistIds) {
    items = items.filter((v) => watchlistIds.has(v.youtube_id));
  }

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

  // Compute histogram from all filtered items (before pagination)
  const { histogram, granularity } = buildHistogram(items);

  return {
    items: items.slice(offset, offset + per_page),
    total,
    page,
    per_page,
    pages,
    histogram,
    granularity,
  };
}

function buildHistogram(items: VideoSummary[]): {
  histogram: HistogramBucket[];
  granularity: "month" | "quarter" | "year";
} {
  if (items.length === 0) return { histogram: [], granularity: "month" };

  const today = new Date();
  const dates = items.map((v) => new Date(v.published_at));
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  // Granularity is based on the video date range (not extended to today)
  const videoMax = new Date(Math.max(...dates.map((d) => d.getTime())));
  const rangeMonths =
    (videoMax.getFullYear() - minDate.getFullYear()) * 12 +
    (videoMax.getMonth() - minDate.getMonth());

  const granularity: "month" | "quarter" | "year" =
    rangeMonths <= 24 ? "month" : rangeMonths <= 72 ? "quarter" : "year";

  // Always extend the chart end to today so recent empty periods are visible.
  const maxDate = today > videoMax ? today : videoMax;

  // Count videos into buckets.
  const buckets = new Map<string, number>();
  for (const v of items) {
    const d = new Date(v.published_at);
    let key: string;
    if (granularity === "month") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    } else if (granularity === "quarter") {
      key = `${d.getFullYear()} Q${Math.ceil((d.getMonth() + 1) / 3)}`;
    } else {
      key = `${d.getFullYear()}`;
    }
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  // Generate every period from minDate to maxDate, filling gaps with 0.
  const allPeriods: string[] = [];
  if (granularity === "month") {
    let y = minDate.getFullYear(),
      m = minDate.getMonth();
    const ey = maxDate.getFullYear(),
      em = maxDate.getMonth();
    while (y < ey || (y === ey && m <= em)) {
      allPeriods.push(`${y}-${String(m + 1).padStart(2, "0")}`);
      if (++m === 12) {
        m = 0;
        y++;
      }
    }
  } else if (granularity === "quarter") {
    let y = minDate.getFullYear(),
      q = Math.ceil((minDate.getMonth() + 1) / 3);
    const ey = maxDate.getFullYear(),
      eq = Math.ceil((maxDate.getMonth() + 1) / 3);
    while (y < ey || (y === ey && q <= eq)) {
      allPeriods.push(`${y} Q${q}`);
      if (++q === 5) {
        q = 1;
        y++;
      }
    }
  } else {
    for (let y = minDate.getFullYear(); y <= maxDate.getFullYear(); y++) allPeriods.push(`${y}`);
  }

  const histogram = allPeriods.map((period) => ({ period, count: buckets.get(period) ?? 0 }));
  return { histogram, granularity };
}
