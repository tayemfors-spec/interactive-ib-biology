import { describe, expect, it } from 'vitest';
import { DIRECT_MAX, DIRECT_MIN, LOOPS, LOOP_IDS, STRENGTH_MAX, equilibrium, gainAt, responseCurve, rounds, type LoopId } from '../../src/sims/models/d4-3-feedback';
import {
  CATERPILLAR_SHIFT, RESPONSE_MAX, TEMP_MAX, TEMP_MIN, caterpillarPeak, caterpillars, dateLabel, dayLength, demand,
  demandPeak, fledglings, layingDate, mismatch, success, summary,
} from '../../src/sims/models/d4-3-phenology';

const subsets = (ids: readonly LoopId[]): LoopId[][] =>
  ids.reduce<LoopId[][]>((acc, id) => acc.concat(acc.map((s) => [...s, id])), [[]]);

describe('D4.3 positive feedback model', () => {
  it('with no loops switched on there is no amplification', () => {
    const r = equilibrium(1.3, []);
    expect(r.total).toBeCloseTo(1.3);
    expect(r.amplification).toBeCloseTo(1);
  });
  it('every loop is a positive feedback: switching any loop on never reduces warming', () => {
    for (const s of subsets(LOOP_IDS)) {
      for (const id of LOOP_IDS.filter((x) => !s.includes(x))) {
        for (const d of [0.5, 1, 1.7, 2.5]) expect(equilibrium(d, [...s, id]).total).toBeGreaterThan(equilibrium(d, s).total);
      }
    }
  });
  it('total warming rises monotonically with direct warming and with loop strength', () => {
    const on = [...LOOP_IDS];
    const curve = responseCurve(on);
    for (let i = 1; i < curve.length; i++) expect(curve[i]!.total).toBeGreaterThanOrEqual(curve[i - 1]!.total);
    let prev = 0;
    for (let s = 0.5; s <= STRENGTH_MAX + 1e-9; s += 0.25) {
      const t = equilibrium(1.2, on, s).total;
      expect(t).toBeGreaterThan(prev);
      prev = t;
    }
  });
  it('equilibrium satisfies T = direct + Σ contributions, and matches direct/(1 − G)', () => {
    const r = equilibrium(1, [...LOOP_IDS]);
    const sum = Object.values(r.contributions).reduce((a, b) => a + b, 0);
    expect(r.direct + sum).toBeCloseTo(r.total, 8);
    expect(r.total).toBeCloseTo(1 / (1 - r.totalGain), 8);
  });
  it('stays finite (no runaway) across the whole slider range', () => {
    const r = equilibrium(DIRECT_MAX, [...LOOP_IDS], STRENGTH_MAX);
    expect(r.totalGain).toBeLessThan(1);
    expect(Number.isFinite(r.total)).toBe(true);
  });
  it('rounds of feedback shrink, so each round adds less warming than the one before', () => {
    const rs = rounds(equilibrium(1, [...LOOP_IDS]));
    for (let i = 1; i < rs.length; i++) expect(rs[i]!).toBeLessThan(rs[i - 1]!);
  });
  it('passing a tipping point produces a jump in warming (permafrost, then boreal forest)', () => {
    const p = LOOPS.find((l) => l.id === 'permafrost')!.tip!;
    expect(gainAt('permafrost', p.at + 0.01)).toBeGreaterThan(gainAt('permafrost', p.at - 0.01));
    const curve = responseCurve([...LOOP_IDS], 1, 500);
    const steps = curve.slice(1).map((c, i) => c.total - curve[i]!.total);
    const typical = steps[0]!;
    expect(Math.max(...steps)).toBeGreaterThan(5 * typical);
    expect(equilibrium(DIRECT_MIN, [...LOOP_IDS]).tipped).toEqual([]);
    expect(equilibrium(2, [...LOOP_IDS]).tipped).toEqual(expect.arrayContaining(['permafrost', 'boreal']));
  });
});

describe('D4.3 great tit – caterpillar phenology model', () => {
  it('at the reference temperature the chicks’ peak demand matches the caterpillar peak', () => {
    expect(mismatch(0, 2)).toBeCloseTo(0);
    expect(success(0)).toBe(1);
  });
  it('warming advances the caterpillar peak more than the laying date of weakly responding birds', () => {
    for (let dT = 0.5; dT <= TEMP_MAX; dT += 0.5) {
      const caterpillarAdvance = caterpillarPeak(0) - caterpillarPeak(dT);
      const birdAdvance = layingDate(0, 2) - layingDate(dT, 2);
      expect(caterpillarAdvance).toBeGreaterThan(birdAdvance);
      expect(birdAdvance).toBeGreaterThan(0);
    }
  });
  it('mismatch grows monotonically with spring warming, and breeding success falls', () => {
    let prevM = -Infinity, prevS = Infinity;
    for (let dT = 0; dT <= TEMP_MAX + 1e-9; dT += 0.25) {
      const m = mismatch(dT, 2);
      expect(m).toBeGreaterThan(prevM);
      expect(fledglings(m)).toBeLessThanOrEqual(prevS);
      prevM = m; prevS = fledglings(m);
    }
    expect(mismatch(TEMP_MIN, 2)).toBeLessThan(0); // cold spring: caterpillars late
  });
  it('birds that track temperature as closely as the caterpillars stay in synchrony', () => {
    for (let dT = TEMP_MIN; dT <= TEMP_MAX; dT += 0.5) expect(mismatch(dT, CATERPILLAR_SHIFT)).toBeCloseTo(0);
    expect(Math.abs(mismatch(2, RESPONSE_MAX))).toBeLessThan(Math.abs(mismatch(2, 1)));
  });
  it('success is symmetrical and falls with the size of the mismatch', () => {
    expect(success(5)).toBeCloseTo(success(-5));
    expect(success(10)).toBeLessThan(success(5));
    expect(success(30)).toBeLessThan(0.01);
  });
  it('curves peak on the predicted days', () => {
    expect(caterpillars(caterpillarPeak(1.5), 1.5)).toBeCloseTo(1);
    expect(demand(demandPeak(1.5, 2), 1.5, 2)).toBeCloseTo(1);
    expect(caterpillars(caterpillarPeak(1.5) + 14, 1.5)).toBeLessThan(0.5);
  });
  it('day length at 52° N lengthens through spring and is near 16.5 h at the solstice', () => {
    expect(dayLength(30)).toBeGreaterThan(dayLength(1));
    expect(dayLength(81)).toBeCloseTo(16.5, 0); // 21 June
    expect(dayLength(1)).toBeGreaterThan(12.5);
    expect(dayLength(1)).toBeLessThan(13.5);
  });
  it('labels dates and summarises a scenario', () => {
    expect(dateLabel(1)).toBe('1 April');
    expect(dateLabel(50)).toBe('20 May');
    expect(dateLabel(61)).toBe('31 May');
    expect(dateLabel(62)).toBe('1 June');
    const s = summary(2, 2);
    expect(s.mismatch).toBeCloseTo(8);
    expect(s.fledglings).toBeLessThan(7.5);
  });
});
