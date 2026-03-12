import { useCallback, useEffect, useState } from "react";
import { fetchPuzzles, fetchRules, fetchSetters } from "../api";
import PuzzleCard from "../components/PuzzleCard";
import RuleFilter from "../components/RuleFilter";
import { useUserData } from "../hooks/useUserData";
import type {
  DifficultyLabel,
  MatchMode,
  PaginatedVideos,
  Rule,
  Setter,
  SortOption,
  SortOrder,
} from "../types";

const PER_PAGE = 24;

export default function Home() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [setters, setSetters] = useState<Setter[]>([]);
  const [results, setResults] = useState<PaginatedVideos | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [match, setMatch] = useState<MatchMode>("all");
  const [sort, setSort] = useState<SortOption>("published");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [hasPuzzleUrl, setHasPuzzleUrl] = useState<boolean | undefined>(undefined);
  const [selectedDifficulties, setSelectedDifficulties] = useState<DifficultyLabel[]>([]);
  const [selectedSetter, setSelectedSetter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);

  const { favorites, completed, toggleFavorite, toggleCompleted } = useUserData();

  const activeFilterCount =
    selectedRules.length + selectedDifficulties.length + (selectedSetter ? 1 : 0);

  // Load rules and setters on mount
  useEffect(() => {
    fetchRules()
      .then(setRules)
      .catch(() => setError("Failed to load rules"));
    fetchSetters()
      .then(setSetters)
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
          difficulties: selectedDifficulties.length ? selectedDifficulties : undefined,
          page: p,
          per_page: PER_PAGE,
        });
        setResults(data);
        setPage(p);
      } catch {
        setError("Failed to load puzzles. Is the backend running?");
      } finally {
        setLoading(false);
      }
    },
    [selectedRules, match, sort, order, hasPuzzleUrl, selectedSetter, selectedDifficulties]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  function toggleRule(slug: string) {
    setSelectedRules((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function toggleDifficulty(d: DifficultyLabel) {
    setSelectedDifficulties((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">CTC Puzzle Database</h1>
            <p className="text-xs text-gray-500 hidden sm:block">
              Cracking the Cryptic — searchable by rule type
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="lg:hidden text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white hover:bg-gray-50 flex items-center gap-1.5"
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
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
            >
              <option value="published">Date</option>
              <option value="views">Most viewed</option>
              <option value="solve_time">Solve time</option>
              <option value="difficulty">Difficulty</option>
            </select>
            <button
              onClick={() => setOrder((o) => (o === "desc" ? "asc" : "desc"))}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white hover:bg-gray-50"
              title="Toggle sort order"
            >
              {order === "desc" ? "↓" : "↑"}
            </button>
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasPuzzleUrl === true}
                onChange={(e) => setHasPuzzleUrl(e.target.checked ? true : undefined)}
                className="rounded"
              />
              <span className="hidden sm:inline">Has puzzle link</span>
              <span className="sm:hidden">Puzzle link</span>
            </label>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar — always visible on lg+, toggle-controlled on mobile */}
        <div className={showFilters ? "block w-full lg:block" : "hidden lg:block"}>
          <RuleFilter
            rules={rules}
            selected={selectedRules}
            match={match}
            onToggle={toggleRule}
            onMatchChange={setMatch}
            onClear={() => setSelectedRules([])}
            selectedDifficulties={selectedDifficulties}
            onToggleDifficulty={toggleDifficulty}
            setters={setters}
            selectedSetter={selectedSetter}
            onSelectSetter={setSelectedSetter}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm text-gray-500">
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
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
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
                      completedAt={completed[video.youtube_id]}
                      onToggleFavorite={() => toggleFavorite(video.youtube_id)}
                      onToggleCompleted={() => toggleCompleted(video.youtube_id)}
                    />
                  ))}
              </div>

              {results.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => load(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {results.pages}
                  </span>
                  <button
                    onClick={() => load(page + 1)}
                    disabled={page >= results.pages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : !loading ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg mb-1">No puzzles found</p>
              <p className="text-sm">
                {results?.total === 0 && selectedRules.length > 0
                  ? "Try removing some rule filters, or run the crawler to populate the database."
                  : "Run the crawler to populate the database."}
              </p>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
