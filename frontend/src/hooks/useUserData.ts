/**
 * Persists per-user puzzle state (favorites, completed, watchlist) in localStorage.
 *
 * Schema:
 *   ctc_favorites  → JSON string[]              of youtube_ids
 *   ctc_completed  → JSON Record<id, ISO string> of youtube_ids → completion timestamp
 *   ctc_watchlist  → JSON string[]              of youtube_ids ("want to solve")
 */
import { useState } from "react";

const FAVORITES_KEY = "ctc_favorites";
const COMPLETED_KEY = "ctc_completed";
const WATCHLIST_KEY = "ctc_watchlist";

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function loadCompleted(): Record<string, string> {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function useUserData() {
  const [favorites, setFavorites] = useState<Set<string>>(() => loadSet(FAVORITES_KEY));
  const [completed, setCompleted] = useState<Record<string, string>>(loadCompleted);
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

  function toggleCompleted(youtubeId: string) {
    setCompleted((prev) => {
      const next = { ...prev };
      if (next[youtubeId]) delete next[youtubeId];
      else next[youtubeId] = new Date().toISOString();
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

  return { favorites, completed, watchlist, toggleFavorite, toggleCompleted, toggleWatchlist };
}
