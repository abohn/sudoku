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

export default function Stats() {
  const { completed, favorites, watchlist } = useUserData();
  const [allVideos, setAllVideos] = useState<VideoSummary[]>([]);

  useEffect(() => {
    fetchAllVideos()
      .then(setAllVideos)
      .catch(() => {});
  }, []);

  const videoMap = new Map(allVideos.map((v) => [v.youtube_id, v]));
  const completedVideos = Object.keys(completed)
    .map((id) => videoMap.get(id))
    .filter((v): v is VideoSummary => v !== undefined);

  // Rule frequency among completed puzzles
  const ruleCounts = new Map<string, { name: string; count: number }>();
  for (const v of completedVideos) {
    for (const { rule } of v.rules) {
      const entry = ruleCounts.get(rule.slug) ?? { name: rule.display_name, count: 0 };
      ruleCounts.set(rule.slug, { ...entry, count: entry.count + 1 });
    }
  }
  const topRules = [...ruleCounts.values()].sort((a, b) => b.count - a.count).slice(0, 8);

  // Difficulty distribution of completed puzzles
  const diffCounts: Record<string, number> = {
    Easy: 0,
    Medium: 0,
    Hard: 0,
    Brutal: 0,
    Unknown: 0,
  };
  for (const v of completedVideos) {
    diffCounts[difficultyLabel(v.difficulty_score)]++;
  }

  // Average solve time of completed puzzles (that have solve duration)
  const withTime = completedVideos.filter((v) => v.solve_duration_seconds != null);
  const avgSeconds =
    withTime.length > 0
      ? withTime.reduce((sum, v) => sum + (v.solve_duration_seconds ?? 0), 0) / withTime.length
      : null;

  // Completions by month (last 12 months)
  const byMonth: Record<string, number> = {};
  for (const [id, ts] of Object.entries(completed)) {
    if (!videoMap.has(id)) continue;
    const month = ts.slice(0, 7); // "YYYY-MM"
    byMonth[month] = (byMonth[month] ?? 0) + 1;
  }
  const months = Object.keys(byMonth).sort().slice(-12);
  const maxMonthCount = Math.max(...Object.values(byMonth), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-gray-900">My Stats</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Completed", value: completedVideos.length },
            { label: "Favorites", value: favorites.size },
            { label: "Watchlist", value: watchlist.size },
            {
              label: "Avg solve time",
              value: avgSeconds != null ? formatDuration(avgSeconds) : "—",
            },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {completedVideos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-1">No completed puzzles yet</p>
            <p className="text-sm">Mark puzzles as completed on the main page to see your stats.</p>
          </div>
        ) : (
          <>
            {/* Completions by month */}
            {months.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="font-semibold text-sm text-gray-900 mb-4">Completions by month</h2>
                <div className="flex items-end gap-1 h-24">
                  {months.map((m) => {
                    const count = byMonth[m] ?? 0;
                    const height = Math.round((count / maxMonthCount) * 100);
                    return (
                      <div key={m} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-500">{count}</span>
                        <div
                          className="w-full bg-blue-500 rounded-t"
                          style={{ height: `${height}%`, minHeight: count > 0 ? "4px" : "0" }}
                        />
                        <span className="text-[9px] text-gray-400 rotate-45 origin-left whitespace-nowrap">
                          {m.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Difficulty distribution */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-sm text-gray-900 mb-3">Difficulty distribution</h2>
              <div className="space-y-2">
                {(["Easy", "Medium", "Hard", "Brutal"] as const).map((label) => {
                  const count = diffCounts[label] ?? 0;
                  const pct = completedVideos.length
                    ? Math.round((count / completedVideos.length) * 100)
                    : 0;
                  const barCls = {
                    Easy: "bg-green-400",
                    Medium: "bg-yellow-400",
                    Hard: "bg-orange-400",
                    Brutal: "bg-red-400",
                  }[label];
                  return (
                    <div key={label} className="flex items-center gap-2 text-sm">
                      <span className="w-14 text-gray-600 text-xs">{label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className={`${barCls} h-2 rounded-full`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top rules */}
            {topRules.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="font-semibold text-sm text-gray-900 mb-3">
                  Most completed rule types
                </h2>
                <div className="space-y-2">
                  {topRules.map(({ name, count }) => {
                    const pct = Math.round((count / completedVideos.length) * 100);
                    return (
                      <div key={name} className="flex items-center gap-2 text-sm">
                        <span className="w-28 text-gray-600 text-xs truncate">{name}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-blue-400 h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
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
