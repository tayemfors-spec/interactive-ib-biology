/**
 * Safe localStorage access. Some browsers (private modes, strict settings) throw on any
 * storage call; in that case we keep data in memory for this visit and tell the reader once.
 */
const memory = new Map<string, string>();
let available: boolean | undefined;

export function storageAvailable(): boolean {
  if (available !== undefined) return available;
  try {
    const k = '__ibbio_probe__';
    window.localStorage.setItem(k, k);
    window.localStorage.removeItem(k);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

export function readJSON<T>(key: string): T | undefined {
  try {
    const raw = storageAvailable() ? window.localStorage.getItem(key) : memory.get(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function writeJSON(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    /* quota exceeded or blocked: the in-memory copy still works for this visit */
  }
}
