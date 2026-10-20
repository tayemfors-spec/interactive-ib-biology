import { describe, expect, it } from 'vitest';
import { AI_MAX, DENSITY, SWITCH_AI, THRESHOLD, autoinducer, lightPerCell, totalLight } from '../../src/sims/models/c2-1-quorum';

describe('C2.1 quorum sensing model', () => {
  const densities = Array.from({ length: 100 }, (_, i) => i + 1);

  it('autoinducer concentration rises with population density', () => {
    for (let i = 1; i < densities.length; i++) expect(autoinducer(densities[i]!)).toBeGreaterThan(autoinducer(densities[i - 1]!));
  });

  it('free-living cells in sea water are dark; cells in the light organ glow at close to maximum', () => {
    expect(autoinducer(DENSITY.sea)).toBeLessThan(THRESHOLD);
    expect(lightPerCell(DENSITY.sea)).toBeLessThan(1);
    expect(autoinducer(DENSITY.organ)).toBeGreaterThan(THRESHOLD);
    expect(lightPerCell(DENSITY.organ)).toBeGreaterThan(95);
    expect(totalLight(DENSITY.sea)).toBeLessThan(0.01 * totalLight(DENSITY.organ));
  });

  it('light switches on steeply around a threshold rather than rising in proportion to density', () => {
    expect(lightPerCell(15)).toBeLessThan(5);
    expect(lightPerCell(40)).toBeGreaterThan(90);
    // doubling the density near the threshold increases light per cell more than tenfold
    expect(lightPerCell(30)).toBeGreaterThan(10 * lightPerCell(15));
  });

  it('positive feedback: induced cells make more autoinducer than uninduced ones would', () => {
    const noFeedback = autoinducer(DENSITY.organ, { receptor: false });
    expect(autoinducer(DENSITY.organ)).toBeGreaterThan(2 * noFeedback);
    expect(AI_MAX).toBeCloseTo(autoinducer(DENSITY.organ));
  });

  it('a luxR (receptor) knockout never produces light, even at high density', () => {
    for (const d of densities) expect(lightPerCell(d, { receptor: false })).toBe(0);
    // the autoinducer is still made, so the signal is present but cannot be detected
    expect(autoinducer(DENSITY.organ, { receptor: false })).toBeGreaterThan(THRESHOLD);
  });

  it('adding autoinducer above the threshold makes even a sparse population glow', () => {
    expect(lightPerCell(DENSITY.sea, { added: 1.5 * THRESHOLD })).toBeGreaterThan(80);
    expect(lightPerCell(DENSITY.sea, { added: 1.5 * THRESHOLD })).toBeGreaterThan(50 * lightPerCell(DENSITY.sea));
  });

  it('the drawn threshold line sits where the switch actually jumps (positive feedback makes it abrupt)', () => {
    expect(SWITCH_AI).toBeGreaterThan(0);
    expect(SWITCH_AI).toBeLessThan(THRESHOLD);
    // every density whose autoinducer is at or below the line is still dim; just past it the population is bright
    const below = densities.filter((d) => autoinducer(d) <= SWITCH_AI);
    const above = densities.filter((d) => autoinducer(d) > SWITCH_AI);
    expect(below.length).toBeGreaterThan(0);
    for (const d of below) expect(lightPerCell(d)).toBeLessThan(15);
    expect(lightPerCell(above[0]!)).toBeGreaterThan(80);
  });
});
