/**
 * Minimal line-chart maths shared by the server render and the browser update, so a sim's
 * graph exists in the HTML before any JavaScript runs.
 */
export interface Axis { min: number; max: number; ticks: number[]; label: string }
export interface Frame { w: number; h: number; left: number; right: number; top: number; bottom: number; x: Axis; y: Axis }

export const sx = (f: Frame, v: number) => f.left + ((v - f.x.min) / (f.x.max - f.x.min)) * (f.w - f.left - f.right);
export const sy = (f: Frame, v: number) => f.h - f.bottom - ((v - f.y.min) / (f.y.max - f.y.min)) * (f.h - f.top - f.bottom);

/** SVG path for y = fn(x) sampled across the x-axis, clipped to the y-range. */
export function linePath(f: Frame, fn: (x: number) => number, samples = 80): string {
  let d = '';
  for (let i = 0; i <= samples; i++) {
    const x = f.x.min + ((f.x.max - f.x.min) * i) / samples;
    const y = Math.max(f.y.min, Math.min(f.y.max, fn(x)));
    d += `${i ? 'L' : 'M'}${sx(f, x).toFixed(1)} ${sy(f, y).toFixed(1)}`;
  }
  return d;
}

export const range = (a: number, b: number, step: number) => {
  const out: number[] = [];
  for (let v = a; v <= b + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
};
