import { describe, expect, it } from 'vitest';
import { STAGES, completedCycles, copies, cycleTemperature, exactLengthCopies, formatCount, nextStage } from '../../src/sims/models/d1-1-pcr';
import { GEL_LENGTH, LADDER, SCENARIOS, distance, estimateSize, paternityExclusions, profilesMatch, randomMatchProbability, ranOff } from '../../src/sims/models/d1-1-gel';

describe('D1.1 PCR model', () => {
  it('runs denaturation, annealing and extension in that order at the right temperatures', () => {
    expect(STAGES.map((s) => s.id)).toEqual(['denature', 'anneal', 'extend']);
    const [d, a, e] = STAGES;
    expect(d!.tempC).toBeGreaterThanOrEqual(94);
    expect(a!.tempC).toBeGreaterThanOrEqual(50);
    expect(a!.tempC).toBeLessThanOrEqual(65);
    expect(e!.tempC).toBe(72);
    // annealing is the coolest stage; denaturation the hottest
    expect(a!.tempC).toBeLessThan(e!.tempC);
    expect(e!.tempC).toBeLessThan(d!.tempC);
  });
  it('doubles the number of copies every cycle when efficiency is 100%', () => {
    expect(copies(0)).toBe(1);
    expect(copies(1)).toBe(2);
    expect(copies(10)).toBe(1024);
    for (let n = 0; n < 30; n++) expect(copies(n + 1, 5)).toBe(2 * copies(n, 5));
  });
  it('gives over a billion copies from one molecule after 30 cycles', () => {
    expect(copies(30)).toBeGreaterThan(1e9);
  });
  it('lower efficiency gives fewer copies, but never fewer than the start', () => {
    expect(copies(20, 1, 0.8)).toBeLessThan(copies(20));
    expect(copies(20, 1, 0.8)).toBeGreaterThan(1);
    expect(copies(5, 3, 0)).toBe(3);
  });
  it('makes the first exact-length target copies in cycle 3 (2ⁿ − 2n)', () => {
    expect(exactLengthCopies(1)).toBe(0);
    expect(exactLengthCopies(2)).toBe(0);
    expect(exactLengthCopies(3)).toBe(2);
    expect(exactLengthCopies(30) / copies(30)).toBeGreaterThan(0.9999);
  });
  it('follows the temperature profile through a cycle', () => {
    expect(cycleTemperature(10)).toBe(95);
    expect(cycleTemperature(40)).toBe(60);
    expect(cycleTemperature(100)).toBe(72);
    expect(cycleTemperature(130)).toBe(95); // next cycle
  });
  it('step mode moves stage by stage and counts a cycle only after extension', () => {
    let p = { cycle: 0, stage: -1 };
    p = nextStage(p); expect(p).toEqual({ cycle: 1, stage: 0 }); expect(completedCycles(p)).toBe(0);
    p = nextStage(p); p = nextStage(p); expect(p).toEqual({ cycle: 1, stage: 2 }); expect(completedCycles(p)).toBe(1);
    p = nextStage(p); expect(p).toEqual({ cycle: 2, stage: 0 }); expect(completedCycles(p)).toBe(1);
  });
  it('formats large counts in standard form', () => {
    expect(formatCount(1024)).toBe('1,024');
    expect(formatCount(2 ** 30)).toBe('1.07 × 10⁹');
  });
});

describe('D1.1 gel electrophoresis model', () => {
  it('smaller fragments move farther than larger ones in the same time', () => {
    for (let i = 0; i < LADDER.length - 1; i++) expect(distance(LADDER[i]!, 40)).toBeGreaterThan(distance(LADDER[i + 1]!, 40));
  });
  it('fragments move farther with more time and a higher voltage, and not at all at time zero', () => {
    expect(distance(500, 0)).toBe(0);
    expect(distance(500, 40)).toBeGreaterThan(distance(500, 20));
    expect(distance(500, 30, 150)).toBeGreaterThan(distance(500, 30, 100));
  });
  it('small fragments run off the end if the gel is run too long', () => {
    expect(ranOff(100, 45)).toBe(false);
    expect(ranOff(100, 90)).toBe(true);
    expect(distance(100, 60)).toBeLessThanOrEqual(GEL_LENGTH);
  });
  it('reads unknown fragment sizes from the ladder to within 3%', () => {
    for (const bp of [150, 350, 620, 880, 2500]) {
      const est = estimateSize(distance(bp, 40), 40)!;
      expect(Math.abs(est - bp) / bp).toBeLessThan(0.03);
    }
    expect(estimateSize(distance(4500, 40), 40)).toBeNull(); // beyond the largest ladder band
  });
  it('identifies the matching suspect in the forensic case', () => {
    const f = SCENARIOS.find((s) => s.id === 'forensic')!;
    const scene = f.lanes.find((l) => l.id === 'scene')!;
    const matches = f.lanes.filter((l) => l.id !== 'scene' && profilesMatch(l, scene)).map((l) => l.id);
    expect(matches).toEqual(['s2']);
  });
  it('excludes Man 1 (locus 2) and cannot exclude Man 2 as the father', () => {
    const p = SCENARIOS.find((s) => s.id === 'paternity')!;
    const lane = (id: string) => p.lanes.find((l) => l.id === id)!;
    expect(paternityExclusions(lane('child'), lane('mother'), lane('man1'))).toEqual([1]);
    expect(paternityExclusions(lane('child'), lane('mother'), lane('man2'))).toEqual([]);
  });
  it('every band in the child comes from the mother or the father, one allele each per locus', () => {
    const p = SCENARIOS.find((s) => s.id === 'paternity')!;
    const lane = (id: string) => p.lanes.find((l) => l.id === id)!;
    for (const b of lane('child').bands) expect(lane('mother').bands.includes(b) || lane('man2').bands.includes(b)).toBe(true);
  });
  it('more markers make a false match less likely', () => {
    expect(randomMatchProbability(13)).toBeLessThan(randomMatchProbability(5));
    expect(randomMatchProbability(1)).toBeCloseTo(0.1);
  });
});
