import type { VideoSummary } from "../types";
import { RuleTag } from "./RuleFilter";

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
}

export default function PuzzleCard({ video, selectedRules, onRuleClick }: Props) {
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

  return (
    <article className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
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
          <div className="w-full aspect-video bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
            No thumbnail
          </div>
        )}
        {video.puzzle_url && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
            Has puzzle
          </span>
        )}
      </a>

      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Title */}
        <a
          href={ytUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-gray-900 hover:text-blue-600 leading-snug line-clamp-2"
        >
          {video.title}
        </a>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
          {video.setter_name && (
            <span className="font-medium text-gray-700">{video.setter_name}</span>
          )}
          <span>{publishedDate}</span>
          <span>{formatViews(video.view_count)} views</span>
          {video.solve_duration_seconds && (
            <span>Solve: {formatDuration(video.solve_duration_seconds)}</span>
          )}
        </div>

        {/* Difficulty badge */}
        {diff.label && (
          <span className={`self-start text-xs font-medium px-2 py-0.5 rounded-full ${diff.cls}`}>
            {diff.label}
          </span>
        )}

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

        {/* Links */}
        <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
          <a
            href={ytUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium transition-colors"
          >
            Watch
          </a>
          {video.puzzle_url && (
            <a
              href={ytSolveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center text-xs py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors"
            >
              Solve on YouTube
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
