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
import { useRef, useState } from "react";

const FAVORITES_KEY = "ctc_favorites";
const COMPLETED_KEY = "ctc_completed";
const WATCHLIST_KEY = "ctc_watchlist";
const LAST_EXPORT_KEY = "ctc_last_exported";
const BACKUP_STALE_DAYS = 30;

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

interface ExportedData {
  version: 1;
  exportedAt: string;
  completed: Record<string, CompletionRecord>;
  favorites: string[];
  watchlist: string[];
}

function isBackupStale(): boolean {
  const raw = localStorage.getItem(LAST_EXPORT_KEY);
  if (!raw) return true;
  const days = (Date.now() - new Date(raw).getTime()) / (1000 * 60 * 60 * 24);
  return days > BACKUP_STALE_DAYS;
}

export function useUserData() {
  const [favorites, setFavorites] = useState<Set<string>>(() => loadSet(FAVORITES_KEY));
  const [completed, setCompleted] = useState<Record<string, CompletionRecord>>(loadCompleted);
  const [watchlist, setWatchlist] = useState<Set<string>>(() => loadSet(WATCHLIST_KEY));
  const [showBackupNudge, setShowBackupNudge] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Has completions but backup is stale — show persistent banner
  const needsBackupBanner = Object.keys(completed).length > 0 && isBackupStale();

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
    if (isBackupStale()) {
      setShowBackupNudge(true);
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
      nudgeTimer.current = setTimeout(() => setShowBackupNudge(false), 8000);
    }
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

  function exportData() {
    const now = new Date().toISOString();
    const data: ExportedData = {
      version: 1,
      exportedAt: now,
      completed,
      favorites: [...favorites],
      watchlist: [...watchlist],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ctc-puzzles-backup-${now.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    localStorage.setItem(LAST_EXPORT_KEY, now);
    setShowBackupNudge(false);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
  }

  function importData(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ExportedData;
        if (data.version !== 1) throw new Error("Unknown backup version");

        const newCompleted = data.completed ?? {};
        const newFavorites = new Set<string>(data.favorites ?? []);
        const newWatchlist = new Set<string>(data.watchlist ?? []);

        localStorage.setItem(COMPLETED_KEY, JSON.stringify(newCompleted));
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...newFavorites]));
        localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...newWatchlist]));

        setCompleted(newCompleted);
        setFavorites(newFavorites);
        setWatchlist(newWatchlist);
      } catch {
        alert("Failed to import backup — the file may be corrupted or in the wrong format.");
      }
    };
    reader.readAsText(file);
  }

  function openImportPicker() {
    if (!importInputRef.current) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) importData(file);
      };
      importInputRef.current = input;
    }
    importInputRef.current.value = "";
    importInputRef.current.click();
  }

  return {
    favorites,
    completed,
    watchlist,
    toggleFavorite,
    markCompleted,
    unmarkCompleted,
    toggleWatchlist,
    exportData,
    openImportPicker,
    showBackupNudge,
    needsBackupBanner,
  };
}
