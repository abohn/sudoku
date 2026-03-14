/**
 * Persists per-user puzzle state (favorites, completed, watchlist) in localStorage.
 *
 * Schema:
 *   ctc_favorites  → JSON string[]                    of youtube_ids
 *   ctc_completed  → JSON Record<id, CompletionRecord> of youtube_ids → completion data
 *   ctc_watchlist  → JSON string[]                    of youtube_ids ("want to solve")
 *
 * CompletionRecord stores the completion timestamp and an optional user solve time.
 * Old format (string values = ISO timestamp) is migrated automatically on load.
 */
import { useState } from "react";

const FAVORITES_KEY = "ctc_favorites";
const COMPLETED_KEY = "ctc_completed";
const WATCHLIST_KEY = "ctc_watchlist";

export interface CompletionRecord {
  completedAt: string; // ISO timestamp
  solveMinutes?: number; // user-entered solve time
}

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function loadCompleted(): Record<string, CompletionRecord> {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string | CompletionRecord>;
    // Migrate old format: string → { completedAt: string }
    const result: Record<string, CompletionRecord> = {};
    for (const [id, val] of Object.entries(parsed)) {
      result[id] = typeof val === "string" ? { completedAt: val } : val;
    }
    return result;
  } catch {
    return {};
  }
}

export function useUserData() {
  const [favorites, setFavorites] = useState<Set<string>>(() => loadSet(FAVORITES_KEY));
  const [completed, setCompleted] = useState<Record<string, CompletionRecord>>(loadCompleted);
  const [watchlist, setWatchlist] = useState<Set<string>>(() => loadSet(WATCHLIST_KEY));

  function toggleFavorite(youtubeId: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(youtubeId)) next.delete(youtubeId);
      else next.add(youtubeId);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function markCompleted(youtubeId: string, solveMinutes?: number) {
    setCompleted((prev) => {
      const next = {
        ...prev,
        [youtubeId]: { completedAt: new Date().toISOString(), solveMinutes },
      };
      localStorage.setItem(COMPLETED_KEY, JSON.stringify(next));
      return next;
    });
  }

  function unmarkCompleted(youtubeId: string) {
    setCompleted((prev) => {
      const next = { ...prev };
      delete next[youtubeId];
      localStorage.setItem(COMPLETED_KEY, JSON.stringify(next));
      return next;
    });
  }

  function toggleWatchlist(youtubeId: string) {
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(youtubeId)) next.delete(youtubeId);
      else next.add(youtubeId);
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  return {
    favorites,
    completed,
    watchlist,
    toggleFavorite,
    markCompleted,
    unmarkCompleted,
    toggleWatchlist,
  };
}
