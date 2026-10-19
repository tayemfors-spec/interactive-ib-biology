/**
 * Step timeline shared by 3D scenes and 2D animations.
 *
 * A process is a list of steps. The thing being animated exposes render(index, t): it must draw
 * the complete state for step `index` at progress t ∈ [0, 1] (no reliance on earlier frames),
 * so stepping backwards and seeking are exact. The timeline never autoplays.
 */
export interface TimelineStep { id: string; duration: number }
export interface TimelineState { index: number; t: number; playing: boolean; speed: number }

export class Timeline {
  index = 0;
  t = 0;
  playing = false;
  speed = 1;
  private raf = 0;
  private last = 0;
  private listeners = new Set<(s: TimelineState) => void>();

  constructor(
    readonly steps: TimelineStep[],
    private readonly render: (index: number, t: number) => void,
    /** When true, steps jump straight to their end state and play is disabled. */
    public reduced = false,
  ) {
    this.render(0, reduced ? 1 : 0);
    if (reduced) this.t = 1;
  }

  get state(): TimelineState { return { index: this.index, t: this.t, playing: this.playing, speed: this.speed }; }
  onChange(fn: (s: TimelineState) => void) { this.listeners.add(fn); fn(this.state); return () => this.listeners.delete(fn); }
  private emit() { for (const fn of this.listeners) fn(this.state); }

  seek(index: number, t = 0) {
    this.index = Math.max(0, Math.min(this.steps.length - 1, index));
    this.t = Math.max(0, Math.min(1, t));
    this.render(this.index, this.t);
    this.emit();
  }

  next() {
    this.pause();
    if (this.index < this.steps.length - 1) this.seek(this.index + 1, this.reduced ? 1 : 0);
    else this.seek(this.index, 1);
  }

  prev() {
    this.pause();
    // First press rewinds the current step; a second press goes back a step.
    if (!this.reduced && this.t > 0.05) this.seek(this.index, 0);
    else this.seek(this.index - 1, this.reduced ? 1 : 0);
  }

  play() {
    if (this.reduced || this.playing) return;
    if (this.index === this.steps.length - 1 && this.t >= 1) this.seek(0, 0);
    this.playing = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
    this.emit();
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.emit();
  }

  toggle() { if (this.playing) this.pause(); else this.play(); }
  setSpeed(s: number) { this.speed = s; this.emit(); }
  setReduced(r: boolean) { this.reduced = r; if (r) { this.pause(); this.seek(this.index, 1); } }

  private tick = (now: number) => {
    if (!this.playing) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const step = this.steps[this.index]!;
    this.t += (dt * this.speed) / step.duration;
    if (this.t >= 1) {
      if (this.index < this.steps.length - 1) { this.index++; this.t = 0; }
      else { this.t = 1; this.render(this.index, 1); this.playing = false; this.emit(); return; }
    }
    this.render(this.index, this.t);
    this.emit();
    this.raf = requestAnimationFrame(this.tick);
  };
}

/** Smooth 0→1 easing used by most step animations. */
export const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** Map t from [a, b] to [0, 1], clamped. */
export const phase = (t: number, a: number, b: number) => (t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
