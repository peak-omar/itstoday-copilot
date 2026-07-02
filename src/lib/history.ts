import type { AnalyzeResult, Creative } from "./types";

/** A saved campaign run, persisted to localStorage so the app has memory. */
export interface HistoryEntry {
  id: string;
  label: string;
  sourceUrl?: string;
  createdAt: number;
  analysis: AnalyzeResult;
  creativesByAngle: Record<string, Creative[]>;
}

const KEY = "angleworks.history.v1";
const MAX = 12;

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
}

export function upsertEntry(entries: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...entries.filter((e) => e.id !== entry.id)];
  saveHistory(next);
  return next.slice(0, MAX);
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
