import { describe, expect, it } from 'vitest';
import {
  cladeOf, cladeSet, closerTo, isClade, layout, mrca, nodes, prompts, rotate, sameRelationships, tips, vertebrates,
} from '../../src/sims/models/a3-2-cladogram';
import { divergenceTime, expectedDifferences, perLineageRate, rateFromCalibration, timeRange } from '../../src/sims/models/a3-2-molecular-clock';
import { altTree, bestTree, differences, pairs, parsimonyScore, sequences, species, variableSites } from '../../src/sims/models/a3-2-sequences';

const order = (t: typeof vertebrates) => tips(t).map((x) => x.id).join(',');

describe('A3.2 cladogram model', () => {
  it('has nine terminal taxa and eight nodes, each node joining two branches', () => {
    expect(tips(vertebrates)).toHaveLength(9);
    expect(nodes(vertebrates)).toHaveLength(8);
    expect(cladeOf(vertebrates, 'n1')).toHaveLength(9);
  });

  it('places birds inside the reptile clade, closest to crocodiles', () => {
    expect(isClade(vertebrates, ['lizard', 'crocodile', 'pigeon'])).toBe(true);
    expect(isClade(vertebrates, ['crocodile', 'pigeon'])).toBe(true);
    // the traditional class "Reptilia" without birds is not a clade
    expect(isClade(vertebrates, ['lizard', 'crocodile'])).toBe(false);
    expect(closerTo(vertebrates, 'crocodile', 'lizard', 'pigeon')).toBe('pigeon');
  });

  it('treats tetrapods as part of the bony vertebrates, so "fish" is not a clade', () => {
    expect(closerTo(vertebrates, 'salmon', 'shark', 'human')).toBe('human');
    expect(isClade(vertebrates, ['lamprey', 'shark', 'salmon'])).toBe(false);
    expect(mrca(vertebrates, ['salmon', 'human']).id).toBe('n3');
  });

  it('finds the most recent common ancestor', () => {
    expect(mrca(vertebrates, ['human', 'mouse']).id).toBe('n6');
    expect(mrca(vertebrates, ['human', 'pigeon']).id).toBe('n5');
    expect(mrca(vertebrates, ['frog', 'lamprey']).id).toBe('n1');
  });

  it('rotating a node changes the drawing order but never the relationships', () => {
    for (const n of nodes(vertebrates)) {
      const r = rotate(vertebrates, n.id);
      expect(order(r)).not.toBe(order(vertebrates));
      expect(sameRelationships(r, vertebrates)).toBe(true);
      expect(order(rotate(r, n.id))).toBe(order(vertebrates));
    }
    let t = vertebrates;
    for (const n of nodes(vertebrates)) t = rotate(t, n.id);
    expect([...cladeSet(t)].sort()).toEqual([...cladeSet(vertebrates)].sort());
    expect(closerTo(t, 'crocodile', 'lizard', 'pigeon')).toBe('pigeon');
  });

  it('rotation does not modify the original tree', () => {
    const before = order(vertebrates);
    rotate(vertebrates, 'n1');
    expect(order(vertebrates)).toBe(before);
  });

  it('every practice prompt has exactly one correct answer, whatever the rotation', () => {
    for (const p of prompts) {
      const ans = closerTo(vertebrates, p.focal, ...p.options);
      expect(ans).not.toBeNull();
      expect(closerTo(rotate(rotate(vertebrates, 'n5'), 'n1'), p.focal, ...p.options)).toBe(ans);
    }
  });

  it('layout keeps tips aligned and puts each node between its branches', () => {
    const l = layout(vertebrates);
    expect(new Set(l.tips.map((t) => t.x)).size).toBe(1);
    for (const n of l.nodes) {
      expect(n.y).toBeGreaterThan(Math.min(n.top, n.bottom) - 1e-9);
      expect(n.y).toBeLessThan(Math.max(n.top, n.bottom) + 1e-9);
      expect(n.x).toBeLessThan(l.tips[0]!.x);
    }
    expect(l.branches).toHaveLength(16);
  });
});

describe('A3.2 molecular clock model', () => {
  it('a calibration pair gives back its own fossil date', () => {
    const r = rateFromCalibration(60, 20);
    expect(r).toBe(3);
    expect(divergenceTime(60, r)).toBeCloseTo(20);
  });
  it('time is proportional to the number of differences and inversely to the rate', () => {
    expect(divergenceTime(0, 3)).toBe(0);
    expect(divergenceTime(40, 2)).toBeCloseTo(2 * divergenceTime(20, 2));
    expect(divergenceTime(30, 6)).toBeCloseTo(divergenceTime(30, 3) / 2);
    expect(expectedDifferences(divergenceTime(42, 3), 3)).toBeCloseTo(42);
  });
  it('rate variation gives a range that contains the estimate and widens with uncertainty', () => {
    const t = divergenceTime(30, 3);
    const [lo, hi] = timeRange(30, 3, 0.2);
    expect(lo).toBeLessThan(t);
    expect(hi).toBeGreaterThan(t);
    const [lo2, hi2] = timeRange(30, 3, 0.4);
    expect(hi2 - lo2).toBeGreaterThan(hi - lo);
    expect(timeRange(30, 3, 0)).toEqual([t, t]);
  });
  it('converts to a per-lineage rate per base per year (half the between-species rate)', () => {
    // 12 differences per Myr over 6000 bases ≈ 1 × 10⁻⁹ per base per year in each lineage
    expect(perLineageRate(12, 6000)).toBeCloseTo(1e-9, 15);
  });
});

describe('A3.2 sample sequence data', () => {
  it('sequences are aligned and of equal length', () => {
    for (const s of species) expect(sequences[s]).toHaveLength(16);
  });
  it('has the difference matrix shown in the animation', () => {
    const m = Object.fromEntries(pairs.map(([a, b]) => [`${a}${b}`, differences(sequences[a], sequences[b])]));
    expect(m).toEqual({ PQ: 2, PR: 4, QR: 4, PS: 8, QS: 8, RS: 6 });
    expect(variableSites()).toHaveLength(10);
  });
  it('the tree built by grouping the most similar first is the most parsimonious', () => {
    expect(parsimonyScore(bestTree)).toBe(10);
    expect(parsimonyScore(altTree)).toBe(12);
    expect(parsimonyScore([['P', 'S'], ['Q', 'R']])).toBe(12);
    expect(parsimonyScore([['P', 'Q'], ['R', 'S']])).toBe(10); // same unrooted tree, rooted elsewhere
  });
});
