import { useCallback, useEffect, useState } from "react";
import { fetchPuzzles, fetchRules, fetchSetters } from "../api";
import PuzzleCard from "../components/PuzzleCard";
import RuleFilter from "../components/RuleFilter";
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
            <p className="text-xs text-gray-500">Cracking the Cryptic — searchable by rule type</p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
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
              Has puzzle link
            </label>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6 items-start">
        {/* Sidebar */}
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

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {loading
                ? "Loading..."
                : results
                  ? `${results.total.toLocaleString()} puzzle${results.total !== 1 ? "s" : ""}`
                  : ""}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {results && results.items.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {results.items.map((video) => (
                  <PuzzleCard
                    key={video.id}
                    video={video}
                    selectedRules={selectedRules}
                    onRuleClick={toggleRule}
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
