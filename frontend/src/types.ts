export interface Rule {
  id: number;
  slug: string;
  display_name: string;
  description: string | null;
  is_rare: boolean;
  video_count: number;
  category: "sudoku" | "pencil";
}

export interface VideoRule {
  rule: Rule;
  confidence: number;
  matched_text: string | null;
}

export interface VideoSummary {
  id: number;
  youtube_id: string;
  title: string;
  published_at: string;
  view_count: number;
  thumbnail_url: string | null;
  puzzle_url: string | null;
  setter_name: string | null;
  solver_name: string | null;
  puzzle_start_seconds: number | null;
  solve_duration_seconds: number | null;
  difficulty_score: number | null;
  rules: VideoRule[];
}

export interface PaginatedVideos {
  items: VideoSummary[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface Setter {
  name: string;
  count: number;
}

export interface Solver {
  name: string;
  count: number;
}

export type DifficultyLabel = "easy" | "medium" | "hard" | "brutal";

export type SortOption = "published" | "views" | "solve_time" | "difficulty";
export type MatchMode = "all" | "any";
export type SortOrder = "asc" | "desc";
