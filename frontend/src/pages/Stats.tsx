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

export default function Stats() {
  const { completed, favorites, watchlist } = useUserData();
  const [allVideos, setAllVideos] = useState<VideoSummary[]>([]);

  useEffect(() => {
    fetchAllVideos()
      .then(setAllVideos)
      .catch(() => {});
  }, []);

  // ---- Channel-level stats ----

  // Videos per month (all time, by year)
  const videosByMonth: Record<string, number> = {};
  for (const v of allVideos) {
    const key = v.published_at.slice(0, 7);
    videosByMonth[key] = (videosByMonth[key] ?? 0) + 1;
  }
  const monthKeys = Object.keys(videosByMonth).sort();
  const maxVideosPerMonth = Math.max(...Object.values(videosByMonth), 1);

  // Top 10 constraints across all videos
  const constraintCounts = new Map<string, { name: string; count: number }>();
  for (const v of allVideos) {
    for (const { rule } of v.rules) {
      if (rule.slug === "unique-rules") continue;
      const e = constraintCounts.get(rule.slug) ?? { name: rule.display_name, count: 0 };
      constraintCounts.set(rule.slug, { ...e, count: e.count + 1 });
    }
  }
  const topConstraints = [...constraintCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const maxConstraintCount = topConstraints[0]?.count ?? 1;

  // Top 10 setters
  const setterCounts: Record<string, number> = {};
  for (const v of allVideos) {
    if (v.setter_name) setterCounts[v.setter_name] = (setterCounts[v.setter_name] ?? 0) + 1;
  }
  const topSetters = Object.entries(setterCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const maxSetterCount = topSetters[0]?.[1] ?? 1;

  // ---- Personal stats ----
  const videoMap = new Map(allVideos.map((v) => [v.youtube_id, v]));
  const completedEntries = Object.entries(completed)
    .map(([id, rec]) => ({ video: videoMap.get(id), rec }))
    .filter((e): e is { video: VideoSummary; rec: (typeof e)["rec"] } => e.video !== undefined);

  // Rule frequency among completed puzzles
  const ruleCounts = new Map<string, { name: string; count: number }>();
  for (const { video } of completedEntries) {
    for (const { rule } of video.rules) {
      const entry = ruleCounts.get(rule.slug) ?? { name: rule.display_name, count: 0 };
      ruleCounts.set(rule.slug, { ...entry, count: entry.count + 1 });
    }
  }
  const topRules = [...ruleCounts.values()].sort((a, b) => b.count - a.count).slice(0, 8);

  // Difficulty distribution
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

  // Per-difficulty solve time comparison: user vs CTC solver
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

  // Completions by month (last 12 months)
  const byMonth: Record<string, number> = {};
  for (const { rec } of completedEntries) {
    const month = rec.completedAt.slice(0, 7);
    byMonth[month] = (byMonth[month] ?? 0) + 1;
  }
  const months = Object.keys(byMonth).sort().slice(-12);
  const maxMonthCount = Math.max(...Object.values(byMonth), 1);

  // Average CTC solve time across all completed (for summary card)
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

  return (
    <div className="min-h-screen bg-th-bg">
      <header className="bg-th-card border-b border-th-border sticky top-0 z-10">
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

            {/* Videos per month */}
            <div className="bg-th-card rounded-xl border border-th-border p-4">
              <h3 className="font-semibold text-sm text-th-text1 mb-4">
                Puzzles per month — all {allVideos.length.toLocaleString()} videos
              </h3>
              <div className="flex items-end gap-px h-20">
                {monthKeys.map((m) => {
                  const count = videosByMonth[m] ?? 0;
                  const pct = Math.round((count / maxVideosPerMonth) * 100);
                  return (
                    <div
                      key={m}
                      className="flex-1 bg-indigo-400 rounded-sm opacity-80 hover:opacity-100 transition-opacity"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                      title={`${m}: ${count}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-th-text3">{monthKeys[0]}</span>
                <span className="text-[10px] text-th-text3">{monthKeys[monthKeys.length - 1]}</span>
              </div>
            </div>

            {/* Top constraints + Solver breakdown side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Top 10 constraints */}
              <div className="bg-th-card rounded-xl border border-th-border p-4">
                <h3 className="font-semibold text-sm text-th-text1 mb-3">Top constraints</h3>
                <div className="space-y-1.5">
                  {topConstraints.map(({ name, count }) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className="text-[11px] text-th-text2 w-24 truncate shrink-0">
                        {name}
                      </span>
                      <div className="flex-1 bg-th-hover rounded-full h-1.5">
                        <div
                          className="bg-indigo-400 h-1.5 rounded-full"
                          style={{ width: `${Math.round((count / maxConstraintCount) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-th-text3 w-8 text-right shrink-0">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top setters */}
              <div className="bg-th-card rounded-xl border border-th-border p-4">
                <h3 className="font-semibold text-sm text-th-text1 mb-3">Top setters</h3>
                <div className="space-y-1.5">
                  {topSetters.map(([name, count]) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className="text-[11px] text-th-text2 w-24 truncate shrink-0">
                        {name}
                      </span>
                      <div className="flex-1 bg-th-hover rounded-full h-1.5">
                        <div
                          className="bg-emerald-400 h-1.5 rounded-full"
                          style={{ width: `${Math.round((count / maxSetterCount) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-th-text3 w-8 text-right shrink-0">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
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
                <div className="flex items-end gap-1 h-24">
                  {months.map((m) => {
                    const count = byMonth[m] ?? 0;
                    const height = Math.round((count / maxMonthCount) * 100);
                    return (
                      <div key={m} className="flex-1 flex flex-col items-center gap-1">
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
