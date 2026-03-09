import type { DifficultyLabel, MatchMode, Rule, Setter } from "../types";
import SetterFilter from "./SetterFilter";

const DIFFICULTIES: { label: DifficultyLabel; display: string; activeCls: string }[] = [
  { label: "easy", display: "Easy", activeCls: "bg-green-500 text-white border-green-500" },
  { label: "medium", display: "Medium", activeCls: "bg-yellow-500 text-white border-yellow-500" },
  { label: "hard", display: "Hard", activeCls: "bg-orange-500 text-white border-orange-500" },
  { label: "brutal", display: "Brutal", activeCls: "bg-red-500 text-white border-red-500" },
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
}

export function RuleTag({
  rule,
  selected,
  onClick,
}: {
  rule: Rule;
  selected: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={rule.description ?? undefined}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors
        ${selected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}
        ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      {rule.display_name}
      {rule.video_count > 0 && (
        <span className={`text-[10px] ${selected ? "text-blue-200" : "text-gray-400"}`}>
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
}: Props) {
  const common = rules.filter((r) => !r.is_rare && r.slug !== "unique-rules");
  const rare = rules.filter((r) => r.is_rare || r.slug === "unique-rules");

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-4 overflow-y-auto max-h-[calc(100vh-6rem)]">
        {/* ---- Difficulty ---- */}
        <div className="mb-4">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">
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
                    active ? activeCls : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {display}
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- Rules ---- */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-gray-900">Rules</h2>
            {selected.length > 0 && (
              <button onClick={onClear} className="text-xs text-blue-600 hover:underline">
                Clear ({selected.length})
              </button>
            )}
          </div>

          {selected.length > 1 && (
            <div className="flex gap-2 mb-3">
              <span className="text-xs text-gray-500 self-center">Match:</span>
              {(["all", "any"] as MatchMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => onMatchChange(m)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    match === m
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {m === "all" ? "All (AND)" : "Any (OR)"}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1 mb-3">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
              Common
            </p>
            <div className="flex flex-wrap gap-1.5">
              {common.map((rule) => (
                <RuleTag
                  key={rule.slug}
                  rule={rule}
                  selected={selected.includes(rule.slug)}
                  onClick={() => onToggle(rule.slug)}
                />
              ))}
            </div>
          </div>

          {rare.length > 0 && (
            <div className="space-y-1 border-t pt-3">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                Rare / Unique
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rare.map((rule) => (
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
      </div>
    </aside>
  );
}
