import { describe, expect, it } from 'vitest';
import { Timeline, ease, phase } from '../../src/lib/timeline';

const steps = [{ id: 'a', duration: 1 }, { id: 'b', duration: 1 }, { id: 'c', duration: 1 }];

describe('timeline', () => {
  it('renders the start state on creation and steps forwards and backwards exactly', () => {
    const calls: [number, number][] = [];
    const tl = new Timeline(steps, (i, t) => calls.push([i, t]));
    expect(calls[0]).toEqual([0, 0]);
    tl.next(); expect(tl.state).toMatchObject({ index: 1, t: 0 });
    tl.next(); tl.next(); expect(tl.state).toMatchObject({ index: 2, t: 1 });
    tl.prev(); expect(tl.state).toMatchObject({ index: 2, t: 0 });
    tl.prev(); expect(tl.state).toMatchObject({ index: 1, t: 0 });
  });
  it('in reduced-motion mode shows end states and refuses to play', () => {
    const tl = new Timeline(steps, () => {}, true);
    expect(tl.t).toBe(1);
    tl.next(); expect(tl.state).toMatchObject({ index: 1, t: 1 });
    tl.play(); expect(tl.playing).toBe(false);
  });
  it('easing helpers are clamped', () => {
    expect(ease(-1)).toBe(0); expect(ease(2)).toBe(1); expect(ease(0.5)).toBeCloseTo(0.5);
    expect(phase(0.5, 0.25, 0.75)).toBeCloseTo(0.5); expect(phase(0.1, 0.25, 0.75)).toBe(0);
  });
});
