import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchPuzzles, fetchRules, fetchSetters, fetchSources } from "../api";
import PuzzleCard from "../components/PuzzleCard";
import RuleFilter from "../components/RuleFilter";
import { useTheme } from "../context/ThemeContext";
import type { Theme } from "../context/ThemeContext";
import { useUserData } from "../hooks/useUserData";
import type {
  DifficultyLabel,
  MatchMode,
  PaginatedVideos,
  Rule,
  Setter,
  Source,
  SortOption,
  SortOrder,
  VideoSummary,
} from "../types";

const PER_PAGE = 24;

// Helpers to read/write URL search params cleanly
function useParam(params: URLSearchParams, key: string): string {
  return params.get(key) ?? "";
}

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  // All filter state lives in the URL
  const searchQuery = useParam(searchParams, "q");
  const selectedRules = searchParams.get("rules")?.split(",").filter(Boolean) ?? [];
  const match = (searchParams.get("match") ?? "all") as MatchMode;
  const sort = (searchParams.get("sort") ?? "published") as SortOption;
  const order = (searchParams.get("order") ?? "desc") as SortOrder;
  const hasPuzzleUrl = searchParams.get("puzzle") === "1" ? true : undefined;
  const selectedSetter = searchParams.get("setter") ?? null;
  const selectedDifficulties = (searchParams.get("diff")?.split(",").filter(Boolean) ??
    []) as DifficultyLabel[];
  const solveTime = searchParams.get("solve") ?? undefined;
  const watchlistOnly = searchParams.get("watchlist") === "1";
  const page = parseInt(searchParams.get("page") ?? "1", 10);

  const selectedSource = searchParams.get("source") ?? null;

  const [rules, setRules] = useState<Rule[]>([]);
  const [setters, setSetters] = useState<Setter[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [results, setResults] = useState<PaginatedVideos | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);

  const { theme, setTheme } = useTheme();
  const THEMES: { id: Theme; label: string }[] = [
    { id: "light", label: "☀" },
    { id: "dark", label: "☽" },
    { id: "warm", label: "✦" },
  ];

  // Random puzzle
  const [randomPick, setRandomPick] = useState<VideoSummary | null>(null);

  const {
    favorites,
    completed,
    watchlist,
    toggleFavorite,
    markCompleted,
    unmarkCompleted,
    toggleWatchlist,
  } = useUserData();

  function setParam(key: string, value: string | null) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        // Reset to page 1 when any filter changes (except page itself)
        if (key !== "page") next.delete("page");
        return next;
      },
      { replace: true }
    );
  }

  const activeFilterCount =
    selectedRules.length +
    selectedDifficulties.length +
    (selectedSetter ? 1 : 0) +
    (selectedSource ? 1 : 0) +
    (searchQuery ? 1 : 0) +
    (solveTime ? 1 : 0) +
    (watchlistOnly ? 1 : 0);

  useEffect(() => {
    fetchRules()
      .then(setRules)
      .catch(() => setError("Failed to load rules"));
    fetchSetters()
      .then(setSetters)
      .catch(() => {});
    fetchSources()
      .then(setSources)
      .catch(() => {});
  }, []);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPuzzles({
          rules: selectedRules,
          match,
          sort,
          order,
          has_puzzle_url: hasPuzzleUrl,
          setter: selectedSetter ?? undefined,
          source: selectedSource ?? undefined,
          difficulties: selectedDifficulties.length ? selectedDifficulties : undefined,
          searchQuery,
          solveTime,
          watchlistOnly,
          watchlistIds: watchlist,
          page: p,
          per_page: PER_PAGE,
        });
        setResults(data);
      } catch {
        setError("Failed to load puzzles.");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, watchlist]
  );

  useEffect(() => {
    load(page);
  }, [load, page]);

  async function pickRandom() {
    try {
      const all = await fetchPuzzles({
        rules: selectedRules,
        match,
        sort,
        order,
        has_puzzle_url: hasPuzzleUrl,
        setter: selectedSetter ?? undefined,
        difficulties: selectedDifficulties.length ? selectedDifficulties : undefined,
        searchQuery,
        solveTime,
        watchlistOnly,
        watchlistIds: watchlist,
        page: 1,
        per_page: 9999,
      });
      if (all.items.length === 0) return;
      const pick = all.items[Math.floor(Math.random() * all.items.length)];
      setRandomPick(pick);
    } catch {
      /* ignore */
    }
  }

  function toggleRule(slug: string) {
    const next = selectedRules.includes(slug)
      ? selectedRules.filter((s) => s !== slug)
      : [...selectedRules, slug];
    setParam("rules", next.length ? next.join(",") : null);
  }

  function toggleDifficulty(d: DifficultyLabel) {
    const next = selectedDifficulties.includes(d)
      ? selectedDifficulties.filter((x) => x !== d)
      : [...selectedDifficulties, d];
    setParam("diff", next.length ? next.join(",") : null);
  }

  return (
    <div className="min-h-screen bg-th-bg">
      {/* Random puzzle modal */}
      {randomPick && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setRandomPick(null)}
        >
          <div
            className="bg-th-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {randomPick.thumbnail_url && (
              <img
                src={randomPick.thumbnail_url}
                alt={randomPick.title}
                className="w-full aspect-video object-cover"
              />
            )}
            <div className="p-4">
              <p className="text-xs text-th-text3 mb-1 uppercase tracking-wide font-medium">
                Random pick
              </p>
              <p className="font-semibold text-th-text1 leading-snug mb-1">{randomPick.title}</p>
              {randomPick.setter_name && (
                <p className="text-sm text-th-text2 mb-3">by {randomPick.setter_name}</p>
              )}
              <div className="flex gap-2">
                <a
                  href={`https://www.youtube.com/watch?v=${randomPick.youtube_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center text-sm py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium"
                >
                  Watch
                </a>
                {randomPick.puzzle_url && (
                  <a
                    href={
                      randomPick.puzzle_start_seconds
                        ? `https://www.youtube.com/watch?v=${randomPick.youtube_id}&t=${randomPick.puzzle_start_seconds}`
                        : `https://www.youtube.com/watch?v=${randomPick.youtube_id}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center text-sm py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                  >
                    Solve
                  </a>
                )}
                <button
                  onClick={() => setRandomPick(null)}
                  className="px-3 text-sm py-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-th-card border-b border-th-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full bg-indigo-500 hidden sm:block" />
            <div>
              <h1 className="text-lg font-bold text-th-text1 leading-tight">
                Cracking the Cryptic
              </h1>
              <p className="text-xs text-th-text3 hidden sm:block leading-tight">
                Puzzle Archive — search by rule type, setter, difficulty &amp; more
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="lg:hidden text-sm border border-th-border rounded-lg px-2.5 py-1.5 bg-th-card hover:bg-th-hover text-th-text2 flex items-center gap-1.5"
            >
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-xs font-medium rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <select
              value={sort}
              onChange={(e) => setParam("sort", e.target.value)}
              className="text-sm border border-th-border rounded-lg px-2 py-1.5 bg-th-card text-th-text2"
            >
              <option value="published">Date</option>
              <option value="views">Most viewed</option>
              <option value="solve_time">Solve time</option>
              <option value="difficulty">Difficulty</option>
            </select>
            <button
              onClick={() => setParam("order", order === "desc" ? "asc" : "desc")}
              className="text-sm border border-th-border rounded-lg px-2 py-1.5 bg-th-card hover:bg-th-hover text-th-text2"
              title="Toggle sort order"
            >
              {order === "desc" ? "↓" : "↑"}
            </button>
            <label className="flex items-center gap-1.5 text-sm text-th-text2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasPuzzleUrl === true}
                onChange={(e) => setParam("puzzle", e.target.checked ? "1" : null)}
                className="rounded"
              />
              <span className="hidden sm:inline">Has puzzle link</span>
              <span className="sm:hidden">Puzzle link</span>
            </label>
            <button
              onClick={pickRandom}
              className="text-sm border border-th-border rounded-lg px-2.5 py-1.5 bg-th-card hover:bg-th-hover text-th-text2"
              title="Pick a random puzzle from current filters"
            >
              Random
            </button>
            <Link
              to="/stats"
              className="text-sm border border-th-border rounded-lg px-2.5 py-1.5 bg-th-card hover:bg-th-hover text-th-text2"
            >
              Stats
            </Link>
            <Link
              to="/help"
              className="text-sm border border-th-border rounded-lg px-2.5 py-1.5 bg-th-card hover:bg-th-hover text-th-text2"
            >
              Help
            </Link>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSd8dru84uSsy8eMWLn2Jz44mhbOxp6cn3lAVyO1f_kq4kwrrA/viewform"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm border border-th-border rounded-lg px-2.5 py-1.5 bg-th-card hover:bg-th-hover text-th-text2"
            >
              Feedback
            </a>
            {/* Theme toggle */}
            <div className="flex border border-th-border rounded-lg overflow-hidden">
              {THEMES.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  title={id.charAt(0).toUpperCase() + id.slice(1)}
                  className={`px-2.5 py-1.5 text-sm transition-colors ${
                    theme === id
                      ? "bg-indigo-600 text-white"
                      : "bg-th-card text-th-text2 hover:bg-th-hover"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar */}
        <div className={showFilters ? "block w-full lg:block" : "hidden lg:block"}>
          <RuleFilter
            rules={rules}
            selected={selectedRules}
            match={match}
            onToggle={toggleRule}
            onMatchChange={(m) => setParam("match", m)}
            onClear={() => setParam("rules", null)}
            selectedDifficulties={selectedDifficulties}
            onToggleDifficulty={toggleDifficulty}
            setters={setters}
            selectedSetter={selectedSetter}
            onSelectSetter={(name) => setParam("setter", name)}
            sources={sources}
            selectedSource={selectedSource}
            onSelectSource={(name) => setParam("source", name)}
            searchQuery={searchQuery}
            onSearchChange={(q) => setParam("q", q || null)}
            solveTime={solveTime}
            onSolveTimeChange={(v) => setParam("solve", v)}
            watchlistOnly={watchlistOnly}
            onWatchlistOnlyChange={(v) => setParam("watchlist", v ? "1" : null)}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm text-th-text2">
              {loading ? (
                "Loading..."
              ) : results ? (
                <>
                  {results.total.toLocaleString()} puzzle{results.total !== 1 ? "s" : ""}
                  {(() => {
                    const ids = results.items.map((v) => v.youtube_id);
                    const doneCount = ids.filter((id) => completed[id]).length;
                    const pct = ids.length ? Math.round((doneCount / ids.length) * 100) : 0;
                    return doneCount > 0 ? (
                      <span className="ml-2 text-green-600">
                        · {doneCount}/{ids.length} done ({pct}%)
                      </span>
                    ) : null;
                  })()}
                </>
              ) : (
                ""
              )}
            </p>
            <label className="flex items-center gap-1.5 text-sm text-th-text2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
                className="rounded"
              />
              Hide completed
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Frequency chart */}
          {results && results.histogram.length > 1 && (
            <div className="bg-th-card border border-th-border rounded-xl px-4 pt-3 pb-2 mb-4">
              <p className="text-[11px] font-semibold text-th-text3 uppercase tracking-wider mb-2">
                Puzzles by {results.granularity}
              </p>
              {(() => {
                const histMax = Math.max(...results.histogram.map((b) => b.count));
                return (
                  <div className="flex items-end gap-px h-14">
                    {results.histogram.map(({ period, count }) => {
                      const pct = Math.round((count / histMax) * 100);
                      return (
                        <div
                          key={period}
                          className="flex-1 flex flex-col items-center justify-end h-full"
                          title={`${period}: ${count} puzzle${count !== 1 ? "s" : ""}`}
                        >
                          <div
                            className="w-full bg-indigo-400 dark:bg-indigo-500 rounded-sm opacity-80 hover:opacity-100 transition-opacity"
                            style={{ height: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-th-text3">{results.histogram[0].period}</span>
                <span className="text-[10px] text-th-text3">
                  {results.histogram[results.histogram.length - 1].period}
                </span>
              </div>
            </div>
          )}

          {results && results.items.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {results.items
                  .filter((v) => !hideCompleted || !completed[v.youtube_id])
                  .map((video) => (
                    <PuzzleCard
                      key={video.id}
                      video={video}
                      selectedRules={selectedRules}
                      onRuleClick={toggleRule}
                      isFavorite={favorites.has(video.youtube_id)}
                      isCompleted={!!completed[video.youtube_id]}
                      completedAt={completed[video.youtube_id]?.completedAt}
                      solveMinutes={completed[video.youtube_id]?.solveMinutes}
                      isWatchlisted={watchlist.has(video.youtube_id)}
                      onToggleFavorite={() => toggleFavorite(video.youtube_id)}
                      onMarkCompleted={(mins) => markCompleted(video.youtube_id, mins)}
                      onUnmarkCompleted={() => unmarkCompleted(video.youtube_id)}
                      onToggleWatchlist={() => toggleWatchlist(video.youtube_id)}
                    />
                  ))}
              </div>

              {results.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setParam("page", String(page - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm border border-th-border text-th-text2 rounded-lg disabled:opacity-40 hover:bg-th-hover"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-th-text2">
                    Page {page} of {results.pages}
                  </span>
                  <button
                    onClick={() => setParam("page", String(page + 1))}
                    disabled={page >= results.pages}
                    className="px-3 py-1.5 text-sm border border-th-border text-th-text2 rounded-lg disabled:opacity-40 hover:bg-th-hover"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : !loading ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-base font-medium text-th-text1 mb-1">
                No puzzles match these filters
              </p>
              <p className="text-sm text-th-text2 mb-4">
                Try fewer rules, a broader difficulty, or
              </p>
              <button
                onClick={pickRandom}
                className="inline-block text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition-colors"
              >
                Pick a random puzzle
              </button>
            </div>
          ) : null}
        </main>
      </div>

      <footer className="mt-8 pb-6 text-center text-xs text-th-text3">
        Made by{" "}
        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLSd8dru84uSsy8eMWLn2Jz44mhbOxp6cn3lAVyO1f_kq4kwrrA/viewform"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-th-text2 underline underline-offset-2"
        >
          Andy Bohn
        </a>
      </footer>
    </div>
  );
}
