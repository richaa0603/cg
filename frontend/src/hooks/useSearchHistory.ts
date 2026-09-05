import { useCallback, useEffect, useState } from "react";
import type { SearchHistoryEntry } from "../types/gitlas";

const STORAGE_KEY = "gitlas.searchHistory";
const MAX_ENTRIES = 8;
const CHANGE_EVENT = "gitlas-history-updated";

function read(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SearchHistoryEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: SearchHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* storage unavailable — history is a nice-to-have */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>(read);

  useEffect(() => {
    const sync = () => setHistory(read());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const record = useCallback((query: string, resultCount: number) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const next: SearchHistoryEntry[] = [
      { id: `${Date.now()}`, query: trimmed, timestamp: Date.now(), resultCount },
      ...read().filter((e) => e.query.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, MAX_ENTRIES);
    write(next);
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((e) => e.id !== id));
  }, []);

  const clear = useCallback(() => write([]), []);

  return { history, record, remove, clear };
}
