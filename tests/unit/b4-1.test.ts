import { describe, expect, it } from 'vitest';
import { biomes, classify, desertLimit, envelope, forestLimit, places, regions, type BiomeId } from '../../src/sims/models/b4-1-biomes';
import { check, defaults, lightAt, presets, verdict } from '../../src/sims/models/b4-1-coral';
import { lightCorrelation, pearson, performance, toleranceFor, transect, zoneOf } from '../../src/sims/models/b4-1-tolerance';

describe('B4.1 biome graph', () => {
  it('example places fall in the expected biomes', () => {
    const expected: Record<string, string> = {
      manaus: 'tropical-forest', phoenix: 'hot-desert', kano: 'savanna', washington: 'temperate-forest',
      denver: 'grassland', fairbanks: 'taiga', utqiagvik: 'tundra',
    };
    for (const p of places) expect(classify(p.t, p.p), p.id).toBe(expected[p.id]);
  });
  it('temperature sets the sequence tundra → taiga → temperate → tropical at moderate rainfall', () => {
    expect(classify(-10, 30)).toBe('tundra');
    expect(classify(0, 80)).toBe('taiga');
    expect(classify(12, 120)).toBe('temperate-forest');
    expect(classify(26, 300)).toBe('tropical-forest');
  });
  it('very little rain gives desert, hot or cold depending on temperature', () => {
    expect(classify(25, 10)).toBe('hot-desert');
    expect(classify(10, 10)).toBe('cold-desert');
  });
  it('the same rainfall supports forest when cool but not when hot (evaporation)', () => {
    expect(classify(10, 60)).toBe('temperate-forest');
    expect(classify(25, 60)).toBe('savanna');
    expect(desertLimit(25)).toBeGreaterThan(desertLimit(0));
    expect(forestLimit(19)).toBeGreaterThan(forestLimit(6));
  });
  it('cold, very wet climates are outside the envelope', () => {
    expect(classify(-10, 300)).toBe('rare');
    expect(envelope(30)).toBeGreaterThan(envelope(-15));
  });
  it('the six biomes named in the guide are all marked as required', () => {
    const req = (Object.values(biomes)).filter((b) => b.required).map((b) => b.id);
    for (const id of ['tundra', 'taiga', 'temperate-forest', 'grassland', 'savanna', 'hot-desert', 'tropical-forest']) expect(req).toContain(id);
    expect(biomes['cold-desert'].required).toBe(false);
  });
  it('the drawn regions agree with the classifier', () => {
    const inside = (poly: [number, number][], x: number, y: number) => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i]!, [xj, yj] = poly[j]!;
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    for (let t = -14.7; t < 30; t += 1.3) {
      for (let p = 2.1; p < 450; p += 7.3) {
        const r = classify(t, p);
        const hits = (Object.keys(regions) as BiomeId[]).filter((id) => inside(regions[id], t, p));
        if (r === 'rare') expect(hits).toEqual([]);
        else expect(hits, `${t}, ${p}`).toEqual([r]);
      }
    }
  });
});

describe('B4.1 range of tolerance', () => {
  const s = toleranceFor(0.5);
  it('performance is highest across the optimum and zero beyond the limits', () => {
    expect(performance(50, s)).toBe(1);
    expect(performance(s.optLow, s)).toBe(1);
    expect(performance(s.lower - 1, s)).toBe(0);
    expect(performance(s.upper + 1, s)).toBe(0);
    const mid = (s.lower + s.optLow) / 2;
    expect(performance(mid, s)).toBeGreaterThan(0);
    expect(performance(mid, s)).toBeLessThan(1);
  });
  it('zones run intolerance → stress → optimum → stress → intolerance', () => {
    expect([5, (s.lower + s.optLow) / 2, 50, (s.optHigh + s.upper) / 2, 95].map((x) => zoneOf(x, s)))
      .toEqual(['intolerance-low', 'stress-low', 'optimum', 'stress-high', 'intolerance-high']);
  });
  it('a wider range of tolerance has wider limits', () => {
    const n = toleranceFor(0), w = toleranceFor(1);
    expect(w.upper - w.lower).toBeGreaterThan(n.upper - n.lower);
    expect(w.optHigh - w.optLow).toBeGreaterThan(n.optHigh - n.optLow);
  });
});

describe('B4.1 transect data', () => {
  it('has one value per quadrat and light falls into the wood', () => {
    const n = transect.distance.length;
    for (const k of ['light', 'grass', 'herb'] as const) expect(transect[k]).toHaveLength(n);
    for (let i = 1; i < n; i++) expect(transect.light[i]!).toBeLessThan(transect.light[i - 1]!);
  });
  it('Pearson r is ±1 for perfect lines and 0 for no variation', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(pearson([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1);
    expect(pearson([1, 2, 3], [5, 5, 5])).toBe(0);
  });
  it('matches the values quoted on the page', () => {
    expect(lightCorrelation('grass')).toBeCloseTo(0.99, 2);
    expect(lightCorrelation('herb')).toBeCloseTo(-0.69, 2);
    expect(lightCorrelation('herb', 30)).toBeCloseTo(0.77, 2);
  });
  it('the herb peaks at intermediate light (a tolerance curve), not in the deepest shade', () => {
    const peak = transect.herb.indexOf(Math.max(...transect.herb));
    expect(transect.light[peak]).toBeGreaterThan(10);
    expect(transect.light[peak]).toBeLessThan(30);
    expect(transect.herb[0]).toBe(0);
  });
});

describe('B4.1 coral reef conditions', () => {
  it('a clear, shallow, warm, normal-salinity sea supports a reef', () => {
    expect(verdict(defaults)).toBe('reef');
  });
  it('light falls with depth and with turbidity', () => {
    expect(lightAt(20, 0)).toBeLessThan(lightAt(10, 0));
    expect(lightAt(10, 5)).toBeLessThan(lightAt(10, 0));
    expect(lightAt(0, 3)).toBeCloseTo(100);
  });
  it('no reef in deep water, even when it is clear', () => {
    expect(verdict({ ...defaults, depth: 60 })).toBe('none');
    expect(verdict({ ...defaults, depth: 45 })).toBe('stressed');
  });
  it('each factor outside its range stops reef formation', () => {
    expect(verdict({ ...defaults, temp: 15 })).toBe('none');
    expect(verdict({ ...defaults, temp: 34 })).toBe('none');
    expect(verdict({ ...defaults, salinity: 22 })).toBe('none');
    expect(verdict({ ...defaults, ph: 7.6 })).toBe('none');
    expect(verdict({ ...defaults, turbidity: 9, depth: 2 })).toBe('none');
  });
  it('a marine heatwave stresses corals (bleaching risk)', () => {
    const c = { ...defaults, temp: 31 };
    expect(verdict(c)).toBe('stressed');
    expect(check(c).find((x) => x.factor === 'temp')!.status).toBe('stress');
  });
  it('presets give sensible outcomes', () => {
    const v = Object.fromEntries(presets.map((p) => [p.id, verdict(p.c)]));
    expect(v).toMatchObject({ reef: 'reef', deep: 'none', river: 'none', heatwave: 'stressed', acid: 'stressed', cold: 'none' });
  });
});
