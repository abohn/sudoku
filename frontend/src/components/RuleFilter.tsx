import { useState } from "react";
import type { Collection, DifficultyLabel, MatchMode, Rule, Setter, Source } from "../types";
import SetterFilter from "./SetterFilter";

const FREQUENT_THRESHOLD = 20; // video_count above this → always shown

const DIFFICULTIES: { label: DifficultyLabel; display: string; activeCls: string }[] = [
  { label: "easy", display: "Easy", activeCls: "bg-green-500 text-white border-green-500" },
  { label: "medium", display: "Medium", activeCls: "bg-yellow-500 text-white border-yellow-500" },
  { label: "hard", display: "Hard", activeCls: "bg-orange-500 text-white border-orange-500" },
  { label: "brutal", display: "Brutal", activeCls: "bg-red-500 text-white border-red-500" },
];

const SOLVE_TIMES: { value: string; display: string }[] = [
  { value: "lt30", display: "≤30 min" },
  { value: "30-60", display: "30–60 min" },
  { value: "60-90", display: "60–90 min" },
  { value: "gt90", display: "90+ min" },
];

interface Props {
  rules: Rule[];
  selected: string[];
  match: MatchMode;
  onToggle: (slug: string) => void;
  onMatchChange: (m: MatchMode) => void;
  onClear: () => void;
  selectedDifficulties: DifficultyLabel[];
  onToggleDifficulty: (d: DifficultyLabel) => void;
  setters: Setter[];
  selectedSetter: string | null;
  onSelectSetter: (name: string | null) => void;
  sources: Source[];
  selectedSource: string | null;
  onSelectSource: (name: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  solveTime: string | undefined;
  onSolveTimeChange: (v: string | null) => void;
  watchlistOnly: boolean;
  onWatchlistOnlyChange: (v: boolean) => void;
  collections: Collection[];
  selectedCollection: string | null;
  onSelectCollection: (slug: string | null) => void;
}

export function RuleTag({
  rule,
  selected,
  onClick,
  activeClass = "bg-blue-600 text-white",
}: {
  rule: Rule;
  selected: boolean;
  onClick?: () => void;
  activeClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={rule.description ?? undefined}
      data-selected={selected ? "true" : undefined}
      className={`rule-tag inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors
        ${selected ? activeClass : "bg-th-card text-th-text1 hover:bg-th-hover"}
        ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      {rule.display_name}
      {rule.video_count > 0 && (
        <span className={`text-[10px] ${selected ? "opacity-70" : "text-th-text3"}`}>
          {rule.video_count}
        </span>
      )}
    </button>
  );
}

export default function RuleFilter({
  rules,
  selected,
  match,
  onToggle,
  onMatchChange,
  onClear,
  selectedDifficulties,
  onToggleDifficulty,
  setters,
  selectedSetter,
  onSelectSetter,
  sources,
  selectedSource,
  onSelectSource,
  searchQuery,
  onSearchChange,
  solveTime,
  onSolveTimeChange,
  watchlistOnly,
  onWatchlistOnlyChange,
  collections,
  selectedCollection,
  onSelectCollection,
}: Props) {
  const [showOccasionalSudoku, setShowOccasionalSudoku] = useState(false);
  const [showOccasionalPencil, setShowOccasionalPencil] = useState(false);

  const sudokuRules = rules.filter((r) => r.category === "sudoku");
  const pencilRules = rules.filter((r) => r.category === "pencil");
  const wordRules = rules.filter((r) => r.category === "word");

  const frequentSudoku = sudokuRules.filter((r) => r.video_count > FREQUENT_THRESHOLD);
  const occasionalSudoku = sudokuRules.filter(
    (r) => r.video_count > 3 && r.video_count <= FREQUENT_THRESHOLD
  );
  const rareSudoku = sudokuRules.filter((r) => r.is_rare);

  const frequentPencil = pencilRules.filter((r) => r.video_count > FREQUENT_THRESHOLD);
  const occasionalPencil = pencilRules.filter(
    (r) => r.video_count > 3 && r.video_count <= FREQUENT_THRESHOLD
  );
  const rarePencil = pencilRules.filter((r) => r.is_rare);

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="sticky top-4 overflow-y-auto max-h-[calc(100vh-6rem)] space-y-2">
        {/* ---- Search ---- */}
        <div className="bg-th-card rounded-xl border border-th-border p-3">
          <input
            type="search"
            placeholder="Search title, setter, rule…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full text-sm bg-th-card text-th-text1 border border-th-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <label className="flex items-center gap-2 text-sm text-th-text2 cursor-pointer select-none mt-2.5">
            <input
              type="checkbox"
              checked={watchlistOnly}
              onChange={(e) => onWatchlistOnlyChange(e.target.checked)}
              className="rounded accent-indigo-600"
            />
            <span>Saved only</span>
          </label>
        </div>

        {/* ---- Difficulty + Solve time + Solver ---- */}
        <div className="bg-th-card rounded-xl border border-th-border p-3 space-y-3">
          <div>
            <p className="text-[11px] font-semibold text-th-text3 uppercase tracking-wider mb-2">
              Difficulty
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DIFFICULTIES.map(({ label, display, activeCls }) => {
                const active = selectedDifficulties.includes(label);
                return (
                  <button
                    key={label}
                    onClick={() => onToggleDifficulty(label)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                      active ? activeCls : "border-th-border text-th-text2 hover:bg-th-hover"
                    }`}
                  >
                    {display}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-th-border pt-3">
            <p className="text-[11px] font-semibold text-th-text3 uppercase tracking-wider mb-2">
              Solve time
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SOLVE_TIMES.map(({ value, display }) => {
                const active = solveTime === value;
                return (
                  <button
                    key={value}
                    onClick={() => onSolveTimeChange(active ? null : value)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                      active
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-th-border text-th-text2 hover:bg-th-hover"
                    }`}
                  >
                    {display}
                  </button>
                );
              })}
            </div>
          </div>

          {sources.length > 0 && (
            <div className="border-t border-th-border pt-3">
              <p className="text-[11px] font-semibold text-th-text3 uppercase tracking-wider mb-2">
                Source
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sources.map(({ name, count }) => {
                  const active = selectedSource === name;
                  return (
                    <button
                      key={name}
                      onClick={() => onSelectSource(active ? null : name)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                        active
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-th-border text-th-text2 hover:bg-th-hover"
                      }`}
                    >
                      {name}
                      <span
                        className={`ml-1 text-[10px] ${active ? "text-indigo-200" : "text-th-text3"}`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ---- Word Puzzles ---- */}
        {wordRules.length > 0 && (
          <div className="sidebar-word rounded-xl border p-3">
            <h2 className="sidebar-word-header text-[11px] font-semibold uppercase tracking-wider mb-2">
              Word Puzzles
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {wordRules.map((rule) => (
                <RuleTag
                  key={rule.slug}
                  rule={rule}
                  selected={selected.includes(rule.slug)}
                  onClick={() => onToggle(rule.slug)}
                  activeClass="bg-teal-600 text-white"
                />
              ))}
            </div>
          </div>
        )}

        {/* ---- Pencil Puzzles ---- */}
        {pencilRules.length > 0 && (
          <div className="sidebar-pencil rounded-xl border p-3">
            <h2 className="sidebar-pencil-header text-[11px] font-semibold uppercase tracking-wider mb-2">
              Pencil Puzzles
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {frequentPencil.map((rule) => (
                <RuleTag
                  key={rule.slug}
                  rule={rule}
                  selected={selected.includes(rule.slug)}
                  onClick={() => onToggle(rule.slug)}
                  activeClass="bg-amber-600 text-white"
                />
              ))}
            </div>
            {occasionalPencil.length > 0 && (
              <>
                {showOccasionalPencil && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {occasionalPencil.map((rule) => (
                      <RuleTag
                        key={rule.slug}
                        rule={rule}
                        selected={selected.includes(rule.slug)}
                        onClick={() => onToggle(rule.slug)}
                        activeClass="bg-amber-600 text-white"
                      />
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowOccasionalPencil((v) => !v)}
                  className="sidebar-sudoku-clear text-xs mt-2 hover:underline"
                >
                  {showOccasionalPencil ? "Show fewer" : `+${occasionalPencil.length} more`}
                </button>
              </>
            )}
            {rarePencil.length > 0 && showOccasionalPencil && (
              <div className="border-t border-th-border mt-2 pt-2">
                <div className="flex flex-wrap gap-1.5">
                  {rarePencil.map((rule) => (
                    <RuleTag
                      key={rule.slug}
                      rule={rule}
                      selected={selected.includes(rule.slug)}
                      onClick={() => onToggle(rule.slug)}
                      activeClass="bg-amber-600 text-white"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- Sudoku Rules ---- */}
        <div className="sidebar-sudoku rounded-xl border p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="sidebar-sudoku-header text-[11px] font-semibold uppercase tracking-wider">
              Sudoku Rules
            </h2>
            {selected.length > 0 && (
              <button onClick={onClear} className="sidebar-sudoku-clear text-xs hover:underline">
                Clear ({selected.length})
              </button>
            )}
          </div>

          {selected.length > 1 && (
            <div className="flex gap-1.5 mb-3">
              {(["all", "any"] as MatchMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => onMatchChange(m)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    match === m
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "sidebar-sudoku-clear border-current hover:bg-th-hover"
                  }`}
                >
                  {m === "all" ? "All (AND)" : "Any (OR)"}
                </button>
              ))}
            </div>
          )}

          <div className="mb-1">
            <div className="flex flex-wrap gap-1.5">
              {frequentSudoku.map((rule) => (
                <RuleTag
                  key={rule.slug}
                  rule={rule}
                  selected={selected.includes(rule.slug)}
                  onClick={() => onToggle(rule.slug)}
                />
              ))}
            </div>
          </div>

          {occasionalSudoku.length > 0 && (
            <>
              {showOccasionalSudoku && (
                <div className="sidebar-sudoku-divider border-t pt-2 mb-1">
                  <div className="flex flex-wrap gap-1.5">
                    {occasionalSudoku.map((rule) => (
                      <RuleTag
                        key={rule.slug}
                        rule={rule}
                        selected={selected.includes(rule.slug)}
                        onClick={() => onToggle(rule.slug)}
                      />
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={() => setShowOccasionalSudoku((v) => !v)}
                className="sidebar-sudoku-clear text-xs mt-1 hover:underline"
              >
                {showOccasionalSudoku ? "Show fewer" : `+${occasionalSudoku.length} more`}
              </button>
            </>
          )}

          {rareSudoku.length > 0 && showOccasionalSudoku && (
            <div className="sidebar-sudoku-divider border-t pt-2 mt-2">
              <div className="flex flex-wrap gap-1.5">
                {rareSudoku.map((rule) => (
                  <RuleTag
                    key={rule.slug}
                    rule={rule}
                    selected={selected.includes(rule.slug)}
                    onClick={() => onToggle(rule.slug)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---- Setter ---- */}
        <SetterFilter setters={setters} selected={selectedSetter} onSelect={onSelectSetter} />

        {/* ---- Collections ---- */}
        {collections.length > 0 && (
          <div className="bg-th-card rounded-xl border border-th-border p-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-th-text3 mb-2">
              Collections
            </h2>
            <div className="flex flex-col gap-1">
              {collections.map(({ slug, display_name, video_count }) => {
                const active = selectedCollection === slug;
                return (
                  <button
                    key={slug}
                    onClick={() => onSelectCollection(active ? null : slug)}
                    className={`flex items-center justify-between w-full text-left text-xs px-2 py-1 rounded-lg border transition-colors ${
                      active
                        ? "bg-violet-600 text-white border-violet-600"
                        : "border-th-border text-th-text2 hover:bg-th-hover"
                    }`}
                  >
                    <span className="truncate">{display_name}</span>
                    <span
                      className={`ml-2 shrink-0 text-[10px] ${active ? "text-violet-200" : "text-th-text3"}`}
                    >
                      {video_count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
