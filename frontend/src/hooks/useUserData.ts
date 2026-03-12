/**
 * Persists per-user puzzle state (favorites + completed) in localStorage.
 * No backend or auth required — state is per-browser.
 *
 * Schema:
 *   ctc_favorites  → JSON string[]   of youtube_ids
 *   ctc_completed  → JSON Record<youtube_id, ISO timestamp>
 */
import { useState } from "react";

const FAVORITES_KEY = "ctc_favorites";
const COMPLETED_KEY = "ctc_completed";

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
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
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [completed, setCompleted] = useState<Record<string, string>>(loadCompleted);

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

  return { favorites, completed, toggleFavorite, toggleCompleted };
}
