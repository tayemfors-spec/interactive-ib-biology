import { readJSON, writeJSON } from './storage';

export type Theme = 'system' | 'light' | 'dark';
export type Motion = 'system' | 'reduce' | 'full';
export type LevelFilter = 'SL+AHL' | 'SL';
export interface Prefs { v: 1; theme: Theme; motion: Motion; level: LevelFilter; labels: boolean }

export const PREFS_KEY = 'ibbio.prefs';
const defaults: Prefs = { v: 1, theme: 'system', motion: 'system', level: 'SL+AHL', labels: true };

export function getPrefs(): Prefs {
  const p = readJSON<Partial<Prefs>>(PREFS_KEY);
  return { ...defaults, ...(p?.v === 1 ? p : {}) };
}

export function setPrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...getPrefs(), ...patch, v: 1 as const };
  writeJSON(PREFS_KEY, next);
  applyPrefs(next);
  window.dispatchEvent(new CustomEvent('ibbio:prefs', { detail: next }));
  return next;
}

/** Mirror preferences onto <html> data attributes; CSS and components react to these. */
export function applyPrefs(p: Prefs): void {
  const root = document.documentElement;
  if (p.theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = p.theme;
  if (p.motion === 'system') delete root.dataset.motion;
  else root.dataset.motion = p.motion;
  root.dataset.level = p.level;
}

/** True when animations should be replaced by manual stepping. */
export function prefersReducedMotion(): boolean {
  const m = document.documentElement.dataset.motion;
  if (m === 'reduce') return true;
  if (m === 'full') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
