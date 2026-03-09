import type {
  DifficultyLabel,
  MatchMode,
  PaginatedVideos,
  Rule,
  Setter,
  SortOption,
  SortOrder,
} from "./types";

const BASE = "/api";

export async function fetchRules(): Promise<Rule[]> {
  const res = await fetch(`${BASE}/rules/`);
  if (!res.ok) throw new Error("Failed to fetch rules");
  return res.json();
}

export async function fetchSetters(q?: string): Promise<Setter[]> {
  const p = new URLSearchParams({ min_count: "2" });
  if (q) p.set("q", q);
  const res = await fetch(`${BASE}/setters/?${p.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch setters");
  return res.json();
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
  const p = new URLSearchParams();
  if (params.rules?.length) p.set("rules", params.rules.join(","));
  if (params.match) p.set("match", params.match);
  if (params.sort) p.set("sort", params.sort);
  if (params.order) p.set("order", params.order);
  if (params.has_puzzle_url !== undefined) p.set("has_puzzle_url", String(params.has_puzzle_url));
  if (params.setter) p.set("setter", params.setter);
  if (params.difficulties?.length) p.set("difficulties", params.difficulties.join(","));
  if (params.page) p.set("page", String(params.page));
  if (params.per_page) p.set("per_page", String(params.per_page));

  const res = await fetch(`${BASE}/puzzles/?${p.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch puzzles");
  return res.json();
}
