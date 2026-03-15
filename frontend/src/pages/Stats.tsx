import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllVideos } from "../api";
import { useUserData } from "../hooks/useUserData";
import type { VideoSummary } from "../types";

function difficultyLabel(score: number | null): string {
  if (score === null) return "Unknown";
  if (score < 3) return "Easy";
  if (score < 5.5) return "Medium";
  if (score < 7.5) return "Hard";
  return "Brutal";
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const DIFF_ORDER = ["Easy", "Medium", "Hard", "Brutal"] as const;
const DIFF_BAR_CLS: Record<string, string> = {
  Easy: "bg-green-400",
  Medium: "bg-yellow-400",
  Hard: "bg-orange-400",
  Brutal: "bg-red-400",
};

const LINE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function accumulate(series: Record<string, number>[], months: string[]): Record<string, number>[] {
  return series.map((s) => {
    let acc = 0;
    const out: Record<string, number> = {};
    for (const m of months) {
      acc += s[m] ?? 0;
      out[m] = acc;
    }
    return out;
  });
}

function LineChart({
  months,
  series,
  labels,
  cumulative = false,
}: {
  months: string[];
  series: Record<string, number>[];
  labels: string[];
  cumulative?: boolean;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (months.length < 2) return null;
  const displaySeries = cumulative ? accumulate(series, months) : series;

  const W = 800;
  const chartH = 90;
  const labelH = 18;
  const H = chartH + labelH;

  const allValues = displaySeries.flatMap((s) => months.map((m) => s[m] ?? 0));
  const maxVal = Math.max(...allValues, 1);

  const xOf = (i: number) => (i / (months.length - 1)) * W;
  const yOf = (v: number) => chartH - (v / maxVal) * chartH;

  const yearTicks = months.map((m, i) => ({ m, i })).filter(({ m }) => m.endsWith("-01"));

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    const idx = Math.max(
      0,
      Math.min(months.length - 1, Math.round(fraction * (months.length - 1)))
    );
    setHoverIdx(idx);
  }

  const hoverMonth = hoverIdx !== null ? months[hoverIdx] : null;
  const hoverValues =
    hoverIdx !== null && hoverMonth
      ? displaySeries
          .map((s, i) => ({ label: labels[i], value: s[hoverMonth] ?? 0, color: LINE_COLORS[i] }))
          .sort((a, b) => b.value - a.value)
      : [];

  const tooltipOnRight = hoverIdx !== null && hoverIdx <= months.length * 0.6;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 100 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {yearTicks.map(({ m, i }) => (
          <g key={m}>
            <line
              x1={xOf(i)}
              y1={0}
              x2={xOf(i)}
              y2={chartH}
              stroke="currentColor"
              strokeWidth="0.8"
              opacity="0.15"
            />
            <text
              x={xOf(i)}
              y={H - 2}
              textAnchor="middle"
              fontSize="11"
              fill="currentColor"
              opacity="0.45"
            >
              {m.slice(0, 4)}
            </text>
          </g>
        ))}
        {displaySeries.map((s, idx) => {
          const points = months.map((m, i) => `${xOf(i)},${yOf(s[m] ?? 0)}`).join(" ");
          return (
            <polyline
              key={labels[idx]}
              points={points}
              fill="none"
              stroke={LINE_COLORS[idx]}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.85"
            />
          );
        })}
        {hoverIdx !== null && hoverMonth && (
          <>
            <line
              x1={xOf(hoverIdx)}
              y1={0}
              x2={xOf(hoverIdx)}
              y2={chartH}
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.35"
              strokeDasharray="3 2"
            />
            {displaySeries.map((s, idx) => (
              <circle
                key={labels[idx]}
                cx={xOf(hoverIdx)}
                cy={yOf(s[hoverMonth] ?? 0)}
                r="3"
                fill={LINE_COLORS[idx]}
                opacity="0.9"
              />
            ))}
          </>
        )}
      </svg>
      {hoverIdx !== null && hoverMonth && (
        <div
          className="absolute pointer-events-none top-0 glass-panel border border-th-border rounded-lg shadow-lg px-2.5 py-2 text-xs z-20"
          style={{
            left: `${(hoverIdx / (months.length - 1)) * 100}%`,
            transform: tooltipOnRight ? "translate(6px, 0)" : "translate(calc(-100% - 6px), 0)",
          }}
        >
          <p className="text-th-text3 font-medium mb-1">{hoverMonth}</p>
          {hoverValues.map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-1.5 whitespace-nowrap">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: color }}
              />
              <span className="text-th-text2">{label}:</span>
              <span className="text-th-text1 font-medium">{value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
        {labels.map((label, idx) => (
          <div key={label} className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-0.5 rounded"
              style={{ background: LINE_COLORS[idx] }}
            />
            <span className="text-[10px] text-th-text2">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ViewToggle({
  cumulative,
  onChange,
}: {
  cumulative: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex border border-th-border rounded overflow-hidden text-[10px]">
      {(["Monthly", "Cumulative"] as const).map((label) => {
        const active = (label === "Cumulative") === cumulative;
        return (
          <button
            key={label}
            onClick={() => onChange(label === "Cumulative")}
            className={`px-2 py-0.5 transition-colors ${
              active ? "bg-indigo-600 text-white" : "bg-th-card text-th-text3 hover:bg-th-hover"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function computeRuleCategoryStats(
  videos: VideoSummary[],
  category: "sudoku" | "pencil" | "word",
  topN = 10,
  seriesN = 5
) {
  const counts = new Map<string, { slug: string; name: string; count: number }>();
  for (const v of videos) {
    for (const { rule } of v.rules) {
      if (rule.category !== category || rule.slug === "unique-rules") continue;
      const e = counts.get(rule.slug) ?? { slug: rule.slug, name: rule.display_name, count: 0 };
      counts.set(rule.slug, { ...e, count: e.count + 1 });
    }
  }
  const top = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, topN);
  const maxCount = top[0]?.count ?? 1;
  const topSeries = top.slice(0, seriesN);
  const timeSeries: Record<string, Record<string, number>> = {};
  for (const { slug } of topSeries) timeSeries[slug] = {};
  for (const v of videos) {
    const month = v.published_at.slice(0, 7);
    for (const { rule } of v.rules) {
      if (timeSeries[rule.slug] !== undefined) {
        timeSeries[rule.slug][month] = (timeSeries[rule.slug][month] ?? 0) + 1;
      }
    }
  }
  return { top, maxCount, topSeries, timeSeries };
}

function RuleCategorySection({
  title,
  barColor,
  top,
  maxCount,
  topSeries,
  timeSeries,
  monthKeys,
}: {
  title: string;
  barColor: string;
  top: { name: string; count: number }[];
  maxCount: number;
  topSeries: { slug: string; name: string }[];
  timeSeries: Record<string, Record<string, number>>;
  monthKeys: string[];
}) {
  const [cumulative, setCumulative] = useState(false);
  if (top.length === 0) return null;
  return (
    <div className="bg-th-card rounded-xl border border-th-border p-4 space-y-4">
      <h3 className="font-semibold text-sm text-th-text1">{title}</h3>
      <div className="space-y-1.5">
        {top.map(({ name, count }) => (
          <div key={name} className="flex items-center gap-2">
            <span className="text-[11px] text-th-text2 w-28 truncate shrink-0">{name}</span>
            <div className="flex-1 bg-th-hover rounded-full h-1.5">
              <div
                className={`${barColor} h-1.5 rounded-full`}
                style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-th-text3 w-10 text-right shrink-0">
              {count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      {topSeries.length > 0 && monthKeys.length > 1 && (
        <div className="border-t border-th-border pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-th-text3">Frequency over time</p>
            <ViewToggle cumulative={cumulative} onChange={setCumulative} />
          </div>
          <LineChart
            months={monthKeys}
            series={topSeries.map(({ slug }) => timeSeries[slug])}
            labels={topSeries.map(({ name }) => name)}
            cumulative={cumulative}
          />
        </div>
      )}
    </div>
  );
}

export default function Stats() {
  const { completed, favorites, watchlist } = useUserData();
  const [allVideos, setAllVideos] = useState<VideoSummary[]>([]);

  useEffect(() => {
    fetchAllVideos()
      .then(setAllVideos)
      .catch(() => {});
  }, []);

  // ---- Channel-level stats ----

  const videosByMonth: Record<string, number> = {};
  for (const v of allVideos) {
    const key = v.published_at.slice(0, 7);
    videosByMonth[key] = (videosByMonth[key] ?? 0) + 1;
  }
  const monthKeys = Object.keys(videosByMonth).sort();
  const maxVideosPerMonth = Math.max(...Object.values(videosByMonth), 1);

  const sudokuStats = computeRuleCategoryStats(allVideos, "sudoku");
  const pencilStats = computeRuleCategoryStats(allVideos, "pencil");
  const wordStats = computeRuleCategoryStats(allVideos, "word", 20, 5);

  // Top 10 setters
  const setterCounts: Record<string, number> = {};
  for (const v of allVideos) {
    if (v.setter_name) setterCounts[v.setter_name] = (setterCounts[v.setter_name] ?? 0) + 1;
  }
  const topSetters = Object.entries(setterCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const maxSetterCount = topSetters[0]?.[1] ?? 1;

  const top5SetterNames = topSetters.slice(0, 5).map(([name]) => name);
  const setterTimeSeries: Record<string, Record<string, number>> = {};
  for (const name of top5SetterNames) setterTimeSeries[name] = {};
  for (const v of allVideos) {
    if (v.setter_name && setterTimeSeries[v.setter_name] !== undefined) {
      const month = v.published_at.slice(0, 7);
      setterTimeSeries[v.setter_name][month] = (setterTimeSeries[v.setter_name][month] ?? 0) + 1;
    }
  }

  // ---- Personal stats ----
  const videoMap = new Map(allVideos.map((v) => [v.youtube_id, v]));
  const completedEntries = Object.entries(completed)
    .map(([id, rec]) => ({ video: videoMap.get(id), rec }))
    .filter((e): e is { video: VideoSummary; rec: (typeof e)["rec"] } => e.video !== undefined);

  const ruleCounts = new Map<string, { name: string; count: number }>();
  for (const { video } of completedEntries) {
    for (const { rule } of video.rules) {
      const entry = ruleCounts.get(rule.slug) ?? { name: rule.display_name, count: 0 };
      ruleCounts.set(rule.slug, { ...entry, count: entry.count + 1 });
    }
  }
  const topRules = [...ruleCounts.values()].sort((a, b) => b.count - a.count).slice(0, 8);

  const diffCounts: Record<string, number> = {
    Easy: 0,
    Medium: 0,
    Hard: 0,
    Brutal: 0,
    Unknown: 0,
  };
  for (const { video } of completedEntries) {
    diffCounts[difficultyLabel(video.difficulty_score)]++;
  }

  type DiffStats = { userMinutes: number[]; ctcSeconds: number[] };
  const byDiff: Record<string, DiffStats> = {
    Easy: { userMinutes: [], ctcSeconds: [] },
    Medium: { userMinutes: [], ctcSeconds: [] },
    Hard: { userMinutes: [], ctcSeconds: [] },
    Brutal: { userMinutes: [], ctcSeconds: [] },
  };
  for (const { video, rec } of completedEntries) {
    const label = difficultyLabel(video.difficulty_score);
    if (!(label in byDiff)) continue;
    if (rec.solveMinutes != null) byDiff[label].userMinutes.push(rec.solveMinutes);
    if (video.solve_duration_seconds != null)
      byDiff[label].ctcSeconds.push(video.solve_duration_seconds);
  }

  const avg = (nums: number[]) =>
    nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;

  const hasAnySolveTime = completedEntries.some((e) => e.rec.solveMinutes != null);

  const byMonth: Record<string, number> = {};
  for (const { rec } of completedEntries) {
    const month = rec.completedAt.slice(0, 7);
    byMonth[month] = (byMonth[month] ?? 0) + 1;
  }
  const months = Object.keys(byMonth).sort().slice(-12);
  const maxMonthCount = Math.max(...Object.values(byMonth), 1);

  const ctcWithTime = completedEntries.filter((e) => e.video.solve_duration_seconds != null);
  const avgCtcSeconds =
    ctcWithTime.length > 0
      ? ctcWithTime.reduce((sum, e) => sum + (e.video.solve_duration_seconds ?? 0), 0) /
        ctcWithTime.length
      : null;

  const userWithTime = completedEntries.filter((e) => e.rec.solveMinutes != null);
  const avgUserMinutes =
    userWithTime.length > 0
      ? userWithTime.reduce((sum, e) => sum + (e.rec.solveMinutes ?? 0), 0) / userWithTime.length
      : null;

  const [ppmCumulative, setPpmCumulative] = useState(false);
  const [setterCumulative, setSetterCumulative] = useState(false);
  const [ppmHover, setPpmHover] = useState<{ m: string; count: number; idx: number } | null>(null);
  const [completionsHover, setCompletionsHover] = useState<{
    m: string;
    count: number;
    idx: number;
  } | null>(null);

  // Cumulative total for the puzzles-per-month line view
  const cumulativeTotals: Record<string, number> = {};
  let running = 0;
  for (const m of monthKeys) {
    running += videosByMonth[m] ?? 0;
    cumulativeTotals[m] = running;
  }

  return (
    <div className="min-h-screen bg-th-bg">
      <header className="sticky-header border-b border-th-border sticky top-0 z-10 shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-th-text1">Stats</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* ---- Channel Stats ---- */}
        {allVideos.length > 0 && (
          <>
            <h2 className="text-base font-semibold text-th-text1">Channel</h2>

            {/* Puzzles per month */}
            <div className="bg-th-card rounded-xl border border-th-border p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm text-th-text1">
                  Puzzles per month — all {allVideos.length.toLocaleString()} videos
                </h3>
                <ViewToggle cumulative={ppmCumulative} onChange={setPpmCumulative} />
              </div>
              {ppmCumulative ? (
                <LineChart
                  months={monthKeys}
                  series={[cumulativeTotals]}
                  labels={["Total videos"]}
                />
              ) : (
                <div className="relative">
                  {ppmHover && (
                    <div
                      className="absolute -top-7 pointer-events-none glass-panel border border-th-border rounded px-2 py-0.5 text-[10px] text-th-text1 shadow-lg z-10 -translate-x-1/2 whitespace-nowrap"
                      style={{ left: `${((ppmHover.idx + 0.5) / monthKeys.length) * 100}%` }}
                    >
                      {ppmHover.m}: {ppmHover.count}
                    </div>
                  )}
                  <div className="flex items-end gap-px h-20">
                    {monthKeys.map((m, idx) => {
                      const count = videosByMonth[m] ?? 0;
                      const pct = Math.round((count / maxVideosPerMonth) * 100);
                      return (
                        <div
                          key={m}
                          className="flex-1 bg-indigo-400 rounded-sm opacity-80 hover:opacity-100 transition-opacity cursor-crosshair"
                          style={{ height: `${Math.max(pct, 2)}%` }}
                          onMouseEnter={() => setPpmHover({ m, count, idx })}
                          onMouseLeave={() => setPpmHover(null)}
                        />
                      );
                    })}
                  </div>
                  <div className="relative mt-1 h-4">
                    {monthKeys.map((m, i) => {
                      if (!m.endsWith("-01")) return null;
                      const pct = ((i + 0.5) / monthKeys.length) * 100;
                      return (
                        <span
                          key={m}
                          className="absolute text-[9px] text-th-text3 -translate-x-1/2"
                          style={{ left: `${pct}%` }}
                        >
                          {m.slice(0, 4)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sudoku Constraints */}
            <RuleCategorySection
              title="Sudoku constraints"
              barColor="bg-indigo-400"
              {...sudokuStats}
              monthKeys={monthKeys}
            />

            {/* Pencil Puzzles */}
            <RuleCategorySection
              title="Pencil puzzles"
              barColor="bg-amber-400"
              {...pencilStats}
              monthKeys={monthKeys}
            />

            {/* Word Puzzles */}
            <RuleCategorySection
              title="Word puzzles"
              barColor="bg-teal-400"
              {...wordStats}
              monthKeys={monthKeys}
            />

            {/* Top setters */}
            <div className="bg-th-card rounded-xl border border-th-border p-4 space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-th-text1">Top setters</h3>
                <p className="text-[11px] text-th-text3 mt-0.5">All puzzle types</p>
              </div>
              <div className="space-y-1.5">
                {topSetters.map(([name, count]) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="text-[11px] text-th-text2 w-28 truncate shrink-0">{name}</span>
                    <div className="flex-1 bg-th-hover rounded-full h-1.5">
                      <div
                        className="bg-emerald-400 h-1.5 rounded-full"
                        style={{ width: `${Math.round((count / maxSetterCount) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-th-text3 w-10 text-right shrink-0">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
              {top5SetterNames.length > 0 && monthKeys.length > 1 && (
                <div className="border-t border-th-border pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] text-th-text3">Frequency over time</p>
                    <ViewToggle cumulative={setterCumulative} onChange={setSetterCumulative} />
                  </div>
                  <LineChart
                    months={monthKeys}
                    series={top5SetterNames.map((name) => setterTimeSeries[name])}
                    labels={top5SetterNames}
                    cumulative={setterCumulative}
                  />
                </div>
              )}
            </div>

            <div className="border-t border-th-border pt-2" />
            <h2 className="text-base font-semibold text-th-text1">My Stats</h2>
          </>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Completed", value: completedEntries.length },
            { label: "Favorites", value: favorites.size },
            { label: "Watchlist", value: watchlist.size },
            {
              label: "Avg CTC solve",
              value: avgCtcSeconds != null ? formatDuration(avgCtcSeconds) : "—",
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-th-card rounded-xl border border-th-border p-4 text-center"
            >
              <p className="text-2xl font-bold text-th-text1">{value}</p>
              <p className="text-xs text-th-text2 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {completedEntries.length === 0 ? (
          <div className="text-center py-16 text-th-text3">
            <p className="text-lg mb-1">No completed puzzles yet</p>
            <p className="text-sm">Mark puzzles as done on the main page to see your stats.</p>
          </div>
        ) : (
          <>
            {/* Completions by month */}
            {months.length > 0 && (
              <div className="bg-th-card rounded-xl border border-th-border p-4">
                <h2 className="font-semibold text-sm text-th-text1 mb-4">Completions by month</h2>
                <div className="relative">
                  {completionsHover && (
                    <div
                      className="absolute -top-6 pointer-events-none glass-panel border border-th-border rounded px-2 py-0.5 text-[10px] text-th-text1 shadow-lg z-10 -translate-x-1/2 whitespace-nowrap"
                      style={{ left: `${((completionsHover.idx + 0.5) / months.length) * 100}%` }}
                    >
                      {completionsHover.m}: {completionsHover.count}
                    </div>
                  )}
                  <div className="flex items-end gap-1 h-24">
                    {months.map((m, idx) => {
                      const count = byMonth[m] ?? 0;
                      const height = Math.round((count / maxMonthCount) * 100);
                      return (
                        <div
                          key={m}
                          className="flex-1 flex flex-col items-center gap-1 cursor-crosshair"
                          onMouseEnter={() => setCompletionsHover({ m, count, idx })}
                          onMouseLeave={() => setCompletionsHover(null)}
                        >
                          <span className="text-[10px] text-th-text2">{count}</span>
                          <div
                            className="w-full bg-blue-500 rounded-t"
                            style={{ height: `${height}%`, minHeight: count > 0 ? "4px" : "0" }}
                          />
                          <span className="text-[9px] text-th-text3 rotate-45 origin-left whitespace-nowrap">
                            {m.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Difficulty distribution */}
            <div className="bg-th-card rounded-xl border border-th-border p-4">
              <h2 className="font-semibold text-sm text-th-text1 mb-3">Difficulty distribution</h2>
              <div className="space-y-2">
                {DIFF_ORDER.map((label) => {
                  const count = diffCounts[label] ?? 0;
                  const pct = completedEntries.length
                    ? Math.round((count / completedEntries.length) * 100)
                    : 0;
                  return (
                    <div key={label} className="flex items-center gap-2 text-sm">
                      <span className="w-14 text-th-text2 text-xs">{label}</span>
                      <div className="flex-1 bg-th-hover rounded-full h-2">
                        <div
                          className={`${DIFF_BAR_CLS[label]} h-2 rounded-full`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-th-text2 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Solve time comparison */}
            <div className="bg-th-card rounded-xl border border-th-border p-4">
              <h2 className="font-semibold text-sm text-th-text1 mb-1">Solve time comparison</h2>
              <p className="text-xs text-th-text3 mb-4">
                Your time vs. CTC solver's time, averaged by difficulty.
                {!hasAnySolveTime && (
                  <span className="block mt-0.5 text-amber-600">
                    Enter your solve time when marking puzzles done to see your stats here.
                  </span>
                )}
              </p>
              <div className="space-y-4">
                {DIFF_ORDER.map((label) => {
                  const { userMinutes, ctcSeconds } = byDiff[label];
                  const userAvg = avg(userMinutes);
                  const ctcAvg = avg(ctcSeconds);
                  if (ctcAvg == null && userAvg == null) return null;

                  const ctcMin = ctcAvg != null ? ctcAvg / 60 : null;
                  const maxMin = Math.max(userAvg ?? 0, ctcMin ?? 0, 1);

                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            {
                              Easy: "bg-green-100 text-green-700",
                              Medium: "bg-yellow-100 text-yellow-700",
                              Hard: "bg-orange-100 text-orange-700",
                              Brutal: "bg-red-100 text-red-700",
                            }[label]
                          }`}
                        >
                          {label}
                        </span>
                        <span className="text-xs text-th-text3">{diffCounts[label]} solved</span>
                      </div>
                      <div className="space-y-1.5">
                        {ctcMin != null && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-th-text2 w-8">CTC</span>
                            <div className="flex-1 bg-th-hover rounded-full h-2">
                              <div
                                className="bg-slate-400 h-2 rounded-full"
                                style={{ width: `${Math.round((ctcMin / maxMin) * 100)}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-th-text2 w-10 text-right">
                              {Math.round(ctcMin)}m
                            </span>
                          </div>
                        )}
                        {userAvg != null && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-th-text2 w-8">You</span>
                            <div className="flex-1 bg-th-hover rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${Math.round((userAvg / maxMin) * 100)}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-th-text2 w-10 text-right">
                              {Math.round(userAvg)}m
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {avgUserMinutes != null && avgCtcSeconds != null && (
                <div className="mt-4 pt-3 border-t border-th-border text-xs text-th-text2 flex justify-between">
                  <span>Your avg: {Math.round(avgUserMinutes)}m</span>
                  <span>CTC avg: {Math.round(avgCtcSeconds / 60)}m</span>
                </div>
              )}
            </div>

            {/* Top rules */}
            {topRules.length > 0 && (
              <div className="bg-th-card rounded-xl border border-th-border p-4">
                <h2 className="font-semibold text-sm text-th-text1 mb-3">
                  Most completed rule types
                </h2>
                <div className="space-y-2">
                  {topRules.map(({ name, count }) => {
                    const pct = Math.round((count / completedEntries.length) * 100);
                    return (
                      <div key={name} className="flex items-center gap-2 text-sm">
                        <span className="w-28 text-th-text2 text-xs truncate">{name}</span>
                        <div className="flex-1 bg-th-hover rounded-full h-2">
                          <div
                            className="bg-blue-400 h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-th-text2 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
