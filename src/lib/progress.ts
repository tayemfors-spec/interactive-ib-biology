import { readJSON, writeJSON } from './storage';

/** Per-topic self-test progress, stored under one versioned key. */
export interface TopicProgress {
  seen?: string; // ISO date of last visit
  quiz?: { rev: string; best: number; last: number; total: number; attempts: number };
  cards?: { rev: string; known: string[] };
}
export interface ProgressStore { v: 1; lastTopic?: string; topics: Record<string, TopicProgress> }

export const PROGRESS_KEY = 'ibbio.progress';

export function getProgress(): ProgressStore {
  const p = readJSON<ProgressStore>(PROGRESS_KEY);
  return p?.v === 1 && p.topics ? p : { v: 1, topics: {} };
}

export function updateTopic(code: string, fn: (t: TopicProgress) => TopicProgress): ProgressStore {
  const store = getProgress();
  store.topics[code] = fn(store.topics[code] ?? {});
  writeJSON(PROGRESS_KEY, store);
  window.dispatchEvent(new CustomEvent('ibbio:progress', { detail: store }));
  return store;
}

export function markSeen(code: string): void {
  const store = getProgress();
  store.lastTopic = code;
  store.topics[code] = { ...(store.topics[code] ?? {}), seen: new Date().toISOString().slice(0, 10) };
  writeJSON(PROGRESS_KEY, store);
}
