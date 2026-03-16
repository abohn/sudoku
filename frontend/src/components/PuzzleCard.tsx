import { useEffect, useRef, useState } from "react";
import type { VideoSummary } from "../types";
import { RuleTag } from "./RuleFilter";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const NOW = Date.now();

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function difficultyLabel(score: number | null): {
  label: string;
  cls: string;
} {
  if (score === null) return { label: "", cls: "" };
  if (score < 3) return { label: "Easy", cls: "bg-green-100 text-green-700" };
  if (score < 5.5) return { label: "Medium", cls: "bg-yellow-100 text-yellow-700" };
  if (score < 7.5) return { label: "Hard", cls: "bg-orange-100 text-orange-700" };
  return { label: "Brutal", cls: "bg-red-100 text-red-700" };
}

interface Props {
  video: VideoSummary;
  selectedRules: string[];
  onRuleClick: (slug: string) => void;
  isFavorite: boolean;
  isCompleted: boolean;
  completedAt: string | undefined;
  solveMinutes: number | undefined;
  isWatchlisted: boolean;
  onToggleFavorite: () => void;
  onMarkCompleted: (solveMinutes?: number) => void;
  onUnmarkCompleted: () => void;
  onToggleWatchlist: () => void;
  highlighted?: boolean;
}

export default function PuzzleCard({
  video,
  selectedRules,
  onRuleClick,
  isFavorite,
  isCompleted,
  completedAt,
  solveMinutes,
  isWatchlisted,
  onToggleFavorite,
  onMarkCompleted,
  onUnmarkCompleted,
  onToggleWatchlist,
  highlighted = false,
}: Props) {
  const diff = difficultyLabel(video.difficulty_score);
  const ytUrl = `https://www.youtube.com/watch?v=${video.youtube_id}`;
  const ytSolveUrl = video.puzzle_start_seconds
    ? `${ytUrl}&t=${video.puzzle_start_seconds}`
    : ytUrl;
  const publishedDate = new Date(video.published_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const completedDate = completedAt
    ? new Date(completedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const isNew = NOW - new Date(video.published_at).getTime() < FOURTEEN_DAYS_MS;

  const [showModal, setShowModal] = useState(false);
  const [timeInput, setTimeInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (highlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlighted]);

  function openModal() {
    setTimeInput("");
    setShowModal(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function submitCompletion(skip?: boolean) {
    const mins = !skip && timeInput.trim() ? parseInt(timeInput.trim(), 10) : undefined;
    onMarkCompleted(mins && mins > 0 ? mins : undefined);
    setShowModal(false);
  }

  return (
    <article
      ref={cardRef}
      className={`bg-th-card rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden border ${highlighted ? "border-indigo-500 ring-2 ring-indigo-500 ring-offset-2" : "border-th-border"}`}
    >
      {/* Thumbnail */}
      <a href={ytUrl} target="_blank" rel="noopener noreferrer" className="relative block">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full aspect-video object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-video bg-th-hover flex items-center justify-center text-th-text3 text-sm">
            No thumbnail
          </div>
        )}

        {/* Completed overlay */}
        {isCompleted && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold shadow-lg">
              ✓
            </span>
          </div>
        )}

        {/* New badge */}
        {isNew && !isCompleted && (
          <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            NEW
          </span>
        )}

        {/* Has puzzle badge */}
        {video.puzzle_url && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
            Has puzzle
          </span>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite();
          }}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors text-base leading-none"
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </a>

      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Title */}
        <a
          href={ytUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-th-text1 hover:text-blue-500 leading-snug line-clamp-2"
        >
          {video.title}
        </a>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-th-text2">
          {video.setter_name && (
            <span className="font-medium text-th-text1">{video.setter_name}</span>
          )}
          <span>{publishedDate}</span>
          <span>{formatViews(video.view_count)} views</span>
          {video.solve_duration_seconds && (
            <span>Solve: {formatDuration(video.solve_duration_seconds)}</span>
          )}
        </div>

        {/* Difficulty badge + completed info */}
        <div className="flex items-center gap-2 flex-wrap">
          {diff.label && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${diff.cls}`}>
              {diff.label}
            </span>
          )}
          {isCompleted && completedDate && (
            <span className="text-xs text-th-text3">
              Done {completedDate}
              {solveMinutes != null && ` · ${solveMinutes}m`}
            </span>
          )}
        </div>

        {/* Rules */}
        {video.rules.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-1">
            {video.rules.map(({ rule }) => (
              <RuleTag
                key={rule.slug}
                rule={rule}
                selected={selectedRules.includes(rule.slug)}
                onClick={() => onRuleClick(rule.slug)}
              />
            ))}
          </div>
        )}

        {/* Links + action buttons */}
        <div className="flex gap-2 mt-2 pt-2 border-t border-th-border">
          <a
            href={ytUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 font-medium transition-colors"
          >
            Watch
          </a>
          {video.puzzle_url && (
            <a
              href={ytSolveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center text-xs py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 font-medium transition-colors"
            >
              Solve
            </a>
          )}
          <button
            onClick={onToggleWatchlist}
            title={isWatchlisted ? "Remove from watchlist" : "Save to watchlist"}
            className={`px-2.5 text-xs py-1.5 rounded-lg font-medium transition-colors ${
              isWatchlisted
                ? "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
                : "bg-th-hover text-th-text2 hover:bg-th-border"
            }`}
          >
            {isWatchlisted ? "Saved" : "Save"}
          </button>
          <button
            onClick={isCompleted ? onUnmarkCompleted : openModal}
            title={isCompleted ? "Mark as not completed" : "Mark as completed"}
            className={`px-2.5 text-xs py-1.5 rounded-lg font-medium transition-colors ${
              isCompleted
                ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                : "bg-th-hover text-th-text2 hover:bg-th-border"
            }`}
          >
            {isCompleted ? "✓ Done" : "Done"}
          </button>
        </div>
      </div>

      {/* Completion time modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-th-card rounded-2xl shadow-xl w-72 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-th-text1 mb-1">How long did it take you?</p>
            <p className="text-xs text-th-text3 mb-3 leading-snug line-clamp-2">{video.title}</p>
            <div className="flex items-center gap-2 mb-4">
              <input
                ref={inputRef}
                type="number"
                min="1"
                max="999"
                placeholder="minutes"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitCompletion();
                  if (e.key === "Escape") setShowModal(false);
                }}
                className="flex-1 bg-th-bg text-th-text1 border border-th-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-sm text-th-text3">min</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => submitCompletion(true)}
                className="flex-1 text-xs py-2 rounded-lg bg-th-hover text-th-text2 hover:bg-th-border font-medium"
              >
                Skip
              </button>
              <button
                onClick={() => submitCompletion()}
                className="flex-1 text-xs py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 font-medium"
              >
                Mark done
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
