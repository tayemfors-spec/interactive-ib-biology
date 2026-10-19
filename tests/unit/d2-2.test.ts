import { describe, expect, it } from 'vitest';
import {
  access, chromatinState, describe as describeChromatin, nucleosomeLayout, openness, rateBand, transcriptionRate,
  type ChromatinParams, type HistoneMethyl,
} from '../../src/sims/models/d2-2-chromatin';
import { describeLac, lacExpression, operatorBlocked, repressorInactive } from '../../src/sims/models/d2-2-lac';

const base: ChromatinParams = { promoterMethyl: 0, acetylated: false, histoneMethyl: 'none' };
const rate = (p: Partial<ChromatinParams>) => transcriptionRate({ ...base, ...p });
const marks: HistoneMethyl[] = ['none', 'activating', 'repressive'];

describe('D2.2 epigenetic tags and chromatin (qualitative model)', () => {
  it('methylating promoter cytosines represses transcription, monotonically', () => {
    for (const acetylated of [false, true]) for (const histoneMethyl of marks) {
      let prev = Infinity;
      for (let m = 0; m <= 6; m++) {
        const r = transcriptionRate({ promoterMethyl: m / 6, acetylated, histoneMethyl });
        expect(r).toBeLessThanOrEqual(prev);
        prev = r;
      }
      expect(transcriptionRate({ promoterMethyl: 1, acetylated, histoneMethyl })).toBeLessThan(
        transcriptionRate({ promoterMethyl: 0, acetylated, histoneMethyl }));
    }
  });

  it('a fully methylated promoter silences the gene even when histones are acetylated', () => {
    expect(rateBand(rate({ promoterMethyl: 1, acetylated: true }))).toBe('silenced');
  });

  it('histone acetylation opens chromatin and raises transcription', () => {
    for (const histoneMethyl of marks) for (const m of [0, 0.5]) {
      const off = { promoterMethyl: m, acetylated: false, histoneMethyl };
      const on = { ...off, acetylated: true };
      expect(openness(on)).toBeGreaterThan(openness(off));
      expect(transcriptionRate(on)).toBeGreaterThan(transcriptionRate(off));
    }
  });

  it('histone methylation can activate or repress depending on the amino acid', () => {
    for (const acetylated of [false, true]) {
      const none = rate({ acetylated });
      expect(rate({ acetylated, histoneMethyl: 'activating' })).toBeGreaterThan(none);
      expect(rate({ acetylated, histoneMethyl: 'repressive' })).toBeLessThan(none);
    }
  });

  it('open chromatin is euchromatin and condensed chromatin is heterochromatin', () => {
    expect(chromatinState(openness({ promoterMethyl: 0, acetylated: true, histoneMethyl: 'activating' }))).toBe('euchromatin');
    expect(chromatinState(openness({ promoterMethyl: 1, acetylated: false, histoneMethyl: 'repressive' }))).toBe('heterochromatin');
  });

  it('active gene is transcribed fast; silenced gene not at all', () => {
    expect(rateBand(rate({ acetylated: true, histoneMethyl: 'activating' }))).toBe('high');
    expect(rateBand(rate({ promoterMethyl: 1, histoneMethyl: 'repressive' }))).toBe('silenced');
  });

  it('values stay in 0–1 and access never exceeds openness', () => {
    for (const acetylated of [false, true]) for (const histoneMethyl of marks) for (let m = 0; m <= 1; m += 0.25) {
      const p = { promoterMethyl: m, acetylated, histoneMethyl };
      for (const v of [openness(p), access(p), transcriptionRate(p)]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
      expect(access(p)).toBeLessThanOrEqual(openness(p));
    }
  });

  it('nucleosomes pack closer together when chromatin is condensed', () => {
    const gap = (o: number) => { const pts = nucleosomeLayout(o); return pts[1]![0] - pts[0]![0]; };
    expect(gap(0)).toBeLessThan(gap(1));
  });

  it('the description names the tags and never calls promoter methylation activating', () => {
    const s = describeChromatin({ promoterMethyl: 1, acetylated: false, histoneMethyl: 'none' });
    expect(s).toMatch(/methylated/);
    expect(s).toMatch(/silenced/);
  });
});

describe('D2.2 lac genes of E. coli (qualitative model)', () => {
  it('without lactose the repressor blocks the operator and only basal expression occurs', () => {
    expect(operatorBlocked(0)).toBe(1);
    expect(lacExpression(0)).toBeGreaterThan(0);
    expect(lacExpression(0)).toBeLessThan(0.05);
  });

  it('expression rises with lactose as more repressor is inactivated', () => {
    let prev = -1;
    for (let L = 0; L <= 4; L++) {
      expect(lacExpression(L)).toBeGreaterThan(prev);
      prev = lacExpression(L);
      expect(repressorInactive(L) + operatorBlocked(L)).toBeCloseTo(1);
    }
    expect(lacExpression(4)).toBeGreaterThan(0.8);
    expect(lacExpression(4)).toBeLessThanOrEqual(1);
  });

  it('describes the repressor binding the operator, not lactose binding DNA', () => {
    expect(describeLac(0)).toMatch(/repressor is bound to the operator/);
    expect(describeLac(4)).toMatch(/allolactose/);
  });
});
