import { describe, expect, it } from 'vitest';
import { mean, mulberry32, sampleIndices, sd } from '../../src/sims/models/c4-1-rng';
import { absoluteRate, duckweed, exponential, logistic, perCapita, phaseOf, rmsError, timeToFraction } from '../../src/sims/models/c4-1-growth';
import { FIELD, countIn, estimate, makeField, placeQuadrats, summarize } from '../../src/sims/models/c4-1-quadrat';
import { lincoln, runCmr, trials } from '../../src/sims/models/c4-1-capture';
import { DEFAULTS, peaks, predatorEquilibrium, preyEquilibrium, simulate } from '../../src/sims/models/c4-1-predator-prey';
import { CRITICAL_05_DF1, WORKED, chiSquared, df, expected, survey, totals, verdict } from '../../src/sims/models/c4-1-chi';

describe('C4.1 seeded randomness', () => {
  it('is deterministic for a seed and different between seeds', () => {
    const a = mulberry32(42), b = mulberry32(42), c = mulberry32(43);
    const xa = [a(), a(), a()], xb = [b(), b(), b()], xc = [c(), c(), c()];
    expect(xa).toEqual(xb);
    expect(xa).not.toEqual(xc);
    for (const x of xa) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); }
  });
  it('samples distinct indices and gives the calculator (n − 1) standard deviation', () => {
    const s = sampleIndices(mulberry32(1), 50, 20);
    expect(new Set(s).size).toBe(20);
    expect(mean([2, 4, 4, 4, 5, 5, 7, 9])).toBe(5);
    expect(sd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
  });
});

describe('C4.1 population growth', () => {
  it('logistic growth starts like exponential growth and tends to K', () => {
    expect(logistic(10, 0.3, 500, 0)).toBeCloseTo(10);
    expect(logistic(10, 0.3, 500, 2) / exponential(10, 0.3, 2)).toBeGreaterThan(0.95);
    expect(logistic(10, 0.3, 500, 80)).toBeCloseTo(500, 1);
    expect(logistic(10, 0.3, 500, 80)).toBeLessThanOrEqual(500);
  });
  it('exponential growth is a straight line on a log scale (constant ln N increase per unit time)', () => {
    const d1 = Math.log(exponential(5, 0.4, 3)) - Math.log(exponential(5, 0.4, 2));
    const d2 = Math.log(exponential(5, 0.4, 9)) - Math.log(exponential(5, 0.4, 8));
    expect(d1).toBeCloseTo(0.4);
    expect(d2).toBeCloseTo(0.4);
  });
  it('density-dependent feedback: per-capita growth falls to zero at K and is negative above it', () => {
    expect(perCapita(0.3, 400, 0)).toBeCloseTo(0.3);
    expect(perCapita(0.3, 400, 400)).toBe(0);
    expect(perCapita(0.3, 400, 500)).toBeLessThan(0);
  });
  it('absolute growth is fastest at K/2 (the steepest point of the sigmoid curve)', () => {
    const k = 400;
    expect(absoluteRate(0.3, k, k / 2)).toBeGreaterThan(absoluteRate(0.3, k, k / 4));
    expect(absoluteRate(0.3, k, k / 2)).toBeGreaterThan(absoluteRate(0.3, k, (3 * k) / 4));
  });
  it('phases come in order exponential → transitional → plateau', () => {
    expect(phaseOf(10, 400)).toBe('exponential');
    expect(phaseOf(200, 400)).toBe('transitional');
    expect(phaseOf(395, 400)).toBe('plateau');
    const t1 = timeToFraction(10, 0.3, 400, 0.25), t2 = timeToFraction(10, 0.3, 400, 0.95);
    expect(t1).toBeLessThan(t2);
    expect(logistic(10, 0.3, 400, t1)).toBeCloseTo(100);
  });
  it('the illustrative duckweed data are sigmoid and a logistic model fits them far better than a poor guess', () => {
    expect(duckweed[0]!.day).toBe(0);
    expect(duckweed.at(-1)!.fronds).toBeGreaterThan(duckweed[0]!.fronds * 20);
    expect(rmsError(0.3, 320)).toBeLessThan(15);
    expect(rmsError(0.15, 600)).toBeGreaterThan(50);
  });
});

describe('C4.1 quadrat sampling', () => {
  it('builds fields of the requested size inside the site', () => {
    for (const pattern of ['random', 'clumped', 'even'] as const) {
      const f = makeField(5, pattern, 600);
      expect(f).toHaveLength(600);
      for (const p of f) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThan(FIELD); expect(p.y).toBeLessThan(FIELD); }
    }
  });
  it('counting every quadrat of a complete grid gives the true population exactly (no sampling error)', () => {
    const f = makeField(9, 'random', 600);
    const counts: number[] = [];
    for (let x = 0; x < FIELD; x++) for (let y = 0; y < FIELD; y++) counts.push(countIn(f, x, y));
    expect(estimate(mean(counts), FIELD * FIELD, 1)).toBeCloseTo(600);
  });
  it('estimate = mean per quadrat × site area ÷ quadrat area', () => {
    expect(estimate(3.2, 50, 0.25)).toBeCloseTo(640);
  });
  it('a large random sample estimates the population closely', () => {
    const f = makeField(11, 'random', 600);
    const q = placeQuadrats(f, mulberry32(3), 400);
    const s = summarize(q.map((c) => c.count), 600);
    expect(Math.abs(s.errorPct)).toBeLessThan(12);
  });
  it('the standard deviation reflects spread: clumped > random > even', () => {
    const sdOf = (pattern: 'random' | 'clumped' | 'even') =>
      sd(placeQuadrats(makeField(21, pattern, 600), mulberry32(4), 300).map((c) => c.count));
    expect(sdOf('clumped')).toBeGreaterThan(sdOf('random'));
    expect(sdOf('random')).toBeGreaterThan(sdOf('even'));
  });
});

describe('C4.1 capture–mark–release–recapture', () => {
  it('applies the Lincoln index M × N ÷ R', () => {
    expect(lincoln(40, 50, 8)).toBe(250);
    expect(lincoln(60, 45, 9)).toBe(300);
    expect(lincoln(10, 10, 0)).toBe(Infinity);
  });
  it('is close to the true size on average when the assumptions hold', () => {
    const est = trials({ trueN: 400, firstCatch: 80, secondCatch: 80 }, 1, 300).filter(Number.isFinite);
    expect(Math.abs(mean(est) - 400) / 400).toBeLessThan(0.08);
  });
  it('mark loss, deaths of marked animals and immigration all cause overestimates', () => {
    const base = { trueN: 400, firstCatch: 80, secondCatch: 80 };
    const avg = (extra: object) => mean(trials({ ...base, ...extra }, 2, 200).filter(Number.isFinite));
    const ok = avg({});
    expect(avg({ markLoss: 0.4 })).toBeGreaterThan(ok * 1.3);
    expect(avg({ markedDeath: 0.4 })).toBeGreaterThan(ok * 1.3);
    expect(avg({ immigration: 0.4 })).toBeGreaterThan(ok * 1.2);
  });
  it('marked animals that do not mix (more likely to be recaptured) cause an underestimate', () => {
    const est = trials({ trueN: 400, firstCatch: 80, secondCatch: 80, trapBias: 3 }, 3, 200).filter(Number.isFinite);
    expect(mean(est)).toBeLessThan(400 * 0.7);
  });
  it('reports M, N and R consistently', () => {
    const r = runCmr({ trueN: 200, firstCatch: 30, secondCatch: 40 }, mulberry32(8));
    expect(r.M).toBe(30);
    expect(r.N).toBe(40);
    expect(r.R).toBe(r.animals.filter((a) => a.recaptured && a.marked).length);
    expect(r.R).toBeLessThanOrEqual(Math.min(r.M, r.N));
  });
});

describe('C4.1 predator–prey model', () => {
  const run = simulate(DEFAULTS, 100, 20, 80);
  it('classic Lotka–Volterra populations cycle repeatedly', () => {
    expect(peaks(run, 'H').length).toBeGreaterThanOrEqual(6);
    expect(peaks(run, 'L').length).toBeGreaterThanOrEqual(6);
  });
  it('each prey peak comes before the next predator peak (predators lag behind prey)', () => {
    const h = peaks(run, 'H'), l = peaks(run, 'L');
    const firstL = l.find((t) => t > h[0]!)!;
    expect(firstL - h[0]!).toBeGreaterThan(0.5);
    expect(firstL - h[0]!).toBeLessThan(h[1]! - h[0]!);
  });
  it('without predators the prey grow to the carrying capacity set by food (bottom-up)', () => {
    const r = simulate({ ...DEFAULTS, K: 300, predators: false }, 50, 0, 60);
    expect(r.at(-1)!.H).toBeCloseTo(300, 0);
  });
  it('with limited food the cycles are damped towards a steady state', () => {
    const p = { ...DEFAULTS, K: 400 };
    const r = simulate(p, 100, 20, 200);
    expect(r.at(-1)!.H).toBeCloseTo(preyEquilibrium(p), 0);
    expect(r.at(-1)!.L).toBeCloseTo(predatorEquilibrium(p), 0);
  });
  it('if food keeps prey below the level predators need, the predators die out', () => {
    const p = { ...DEFAULTS, K: 120 };
    expect(preyEquilibrium(p)).toBeGreaterThan(120);
    expect(simulate(p, 100, 20, 150).at(-1)!.L).toBeLessThan(0.5);
  });
});

describe('C4.1 chi-squared test for association', () => {
  it('computes expected frequencies from row and column totals', () => {
    const e = expected(WORKED);
    expect(totals(WORKED).grand).toBe(50);
    expect(e.both).toBeCloseTo(11.5);
    expect(e.aOnly).toBeCloseTo(13.5);
    expect(e.bOnly).toBeCloseTo(11.5);
    expect(e.neither).toBeCloseTo(13.5);
    expect(e.both + e.aOnly + e.bOnly + e.neither).toBeCloseTo(50);
  });
  it('worked example: χ² ≈ 9.74 > 3.84 with df = 1, a significant negative association', () => {
    expect(df(2, 2)).toBe(1);
    expect(chiSquared(WORKED)).toBeCloseTo(9.74, 2);
    expect(CRITICAL_05_DF1).toBeCloseTo(3.84, 2);
    expect(verdict(WORKED)).toBe('negative');
  });
  it('observed = expected gives χ² = 0; more co-occurrence gives a positive association', () => {
    expect(chiSquared({ both: 10, aOnly: 10, bOnly: 10, neither: 10 })).toBe(0);
    expect(verdict({ both: 18, aOnly: 4, bOnly: 3, neither: 15 })).toBe('positive');
  });
  it('simulated surveys: competing species tend to be negatively associated', () => {
    let neg = 0;
    for (let s = 1; s <= 30; s++) if (verdict(survey(s, 'compete', 60)) === 'negative') neg++;
    expect(neg).toBeGreaterThan(20);
    let sig = 0;
    for (let s = 1; s <= 60; s++) if (verdict(survey(s, 'independent', 60)) !== 'none') sig++;
    expect(sig).toBeLessThan(10); // ≈ 5% false positives expected
  });
});
