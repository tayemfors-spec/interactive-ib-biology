import { describe, expect, it } from 'vitest';
import { at, equilibrium, outcome, presets, simulate, type CompParams } from '../../src/sims/models/b4-2-competition';
import { fundamental, realized, restricted, span, ZONE_EDGE } from '../../src/sims/models/b4-2-barnacles';
import { canineRatio, cheekShare, featureFor, hominids, toothLayout } from '../../src/sims/models/b4-2-dentition';

const P = (rA: number, KA: number, aAB: number, rB: number, KB: number, aBA: number): CompParams => ({
  a: { r: rA, K: KA, alpha: aAB },
  b: { r: rB, K: KB, alpha: aBA },
});
const end = (p: CompParams, a0 = 5, b0 = 5, t = 300) => { const r = simulate(p, a0, b0, t); return { a: r.a.at(-1)!, b: r.b.at(-1)! }; };

describe('B4.2 Lotka–Volterra competition', () => {
  it('a species grown alone shows logistic growth that levels off at its carrying capacity', () => {
    const run = simulate(P(0.8, 100, 0.9, 0.8, 70, 0.9), 5, 0, 80);
    for (let i = 1; i < run.a.length; i++) expect(run.a[i]!).toBeGreaterThanOrEqual(run.a[i - 1]! - 1e-9);
    expect(run.a.at(-1)!).toBeCloseTo(100, 1);
    expect(run.b.every((v) => v === 0)).toBe(true);
  });

  it('with no competition between species, each reaches its own K', () => {
    const e = end(P(0.6, 100, 0, 0.9, 60, 0));
    expect(e.a).toBeCloseTo(100, 1);
    expect(e.b).toBeCloseTo(60, 1);
  });

  it('weak interspecific competition (partly different niches) gives stable coexistence below K', () => {
    const p = P(0.8, 100, 0.5, 0.6, 100, 0.5);
    expect(outcome(p)).toBe('coexist');
    const eq = equilibrium(p)!;
    expect(eq.a).toBeCloseTo(100 / 1.5, 6);
    const e = end(p);
    expect(e.a).toBeCloseTo(eq.a, 1);
    expect(e.b).toBeCloseTo(eq.b, 1);
    expect(e.a).toBeLessThan(100);
    expect(e.b).toBeLessThan(100);
    // the same equilibrium is reached from different starting numbers
    const e2 = end(p, 60, 2);
    expect(e2.a).toBeCloseTo(eq.a, 1);
  });

  it('when one species competes strongly with the other, the weaker competitor is excluded', () => {
    const p = P(0.8, 100, 0.6, 0.8, 80, 1.4);
    expect(outcome(p)).toBe('a');
    const e = end(p);
    expect(e.b).toBeLessThan(0.5);
    expect(e.a).toBeCloseTo(100, 0);
    const q = P(0.8, 80, 1.4, 0.8, 100, 0.6);
    expect(outcome(q)).toBe('b');
    expect(end(q).a).toBeLessThan(0.5);
  });

  it('growth rate changes how fast exclusion happens, not which species wins', () => {
    const slow = P(0.3, 100, 0.6, 1.5, 80, 1.4);
    expect(outcome(slow)).toBe('a');
    expect(end(slow).b).toBeLessThan(0.5);
  });

  it('when interspecific competition is stronger than intraspecific for both, the starting numbers decide', () => {
    const p = P(0.8, 100, 1.3, 0.8, 100, 1.3);
    expect(outcome(p)).toBe('depends');
    expect(end(p, 10, 5).b).toBeLessThan(0.5);
    expect(end(p, 5, 10).a).toBeLessThan(0.5);
  });

  it('identical niches (α = 1, equal K) are flagged as neutral', () => {
    expect(outcome(P(0.8, 100, 1, 0.8, 100, 1))).toBe('neutral');
  });

  it('populations never go negative and samples are evenly spaced', () => {
    const run = simulate(P(1.5, 150, 2, 1.5, 20, 0), 30, 30, 80);
    expect(Math.min(...run.a, ...run.b)).toBeGreaterThanOrEqual(0);
    expect(run.t[1]! - run.t[0]!).toBeCloseTo(0.5, 9);
    expect(at(run, 0).a).toBe(30);
  });

  it('is deterministic', () => {
    const p = presets[0]!.p;
    expect(simulate(p)).toEqual(simulate(p));
  });

  it('the presets show the outcomes Gause reported', () => {
    const byId = Object.fromEntries(presets.map((x) => [x.id, x]));
    expect(outcome(byId.exclusion!.p)).toBe('a');
    expect(outcome(byId.coexist!.p)).toBe('coexist');
    const f = byId.founder!;
    expect(outcome(f.p)).toBe('depends');
    expect(end(f.p, ...f.start).a).toBeLessThan(0.5);
  });
});

describe('B4.2 barnacle niches (Connell)', () => {
  it('competition from Semibalanus restricts Chthamalus to the upper shore', () => {
    const r = realized('both');
    expect(r.chthamalus!.from).toBe(ZONE_EDGE);
    expect(restricted('both', 'chthamalus')).toBe(true);
    expect(span(r.chthamalus)).toBeLessThan(span(fundamental.chthamalus));
  });
  it('removing Semibalanus lets Chthamalus occupy its whole fundamental niche', () => {
    expect(realized('no-semibalanus').chthamalus).toEqual(fundamental.chthamalus);
    expect(realized('no-semibalanus').semibalanus).toBeNull();
  });
  it('Semibalanus does not spread upwards when Chthamalus is removed (desiccation limits it)', () => {
    expect(realized('no-chthamalus').semibalanus).toEqual(realized('both').semibalanus);
    expect(restricted('both', 'semibalanus')).toBe(false);
    expect(fundamental.semibalanus.to).toBeLessThan(fundamental.chthamalus.to);
  });
  it('the fundamental niches overlap, which is what makes competition possible', () => {
    expect(fundamental.chthamalus.from).toBeLessThan(fundamental.semibalanus.to);
  });
});

describe('B4.2 hominid dentition', () => {
  const by = Object.fromEntries(hominids.map((h) => [h.id, h]));
  it('includes the named examples and classes Paranthropus as herbivore, Homo species as omnivores', () => {
    expect(by.paranthropus!.diet).toBe('herbivore');
    expect(by.floresiensis!.diet).toBe('omnivore');
    expect(by.sapiens!.diet).toBe('omnivore');
    expect(by.gorilla!.diet).toBe('herbivore');
  });
  it('only Paranthropus and the gorilla have a sagittal crest', () => {
    expect(hominids.filter((h) => h.crest).map((h) => h.id).sort()).toEqual(['gorilla', 'paranthropus']);
  });
  it('Paranthropus has the largest share of the tooth row in its cheek teeth', () => {
    const top = hominids.reduce((a, b) => (cheekShare(b) > cheekShare(a) ? b : a));
    expect(top.id).toBe('paranthropus');
    expect(cheekShare(by.paranthropus!)).toBeGreaterThan(cheekShare(by.sapiens!));
  });
  it('only the gorilla has projecting canines and a diastema', () => {
    expect(canineRatio(by.gorilla!)).toBeGreaterThan(1.5);
    for (const id of ['paranthropus', 'floresiensis', 'sapiens']) expect(canineRatio(by[id]!)).toBeLessThan(1.2);
    expect(hominids.filter((h) => h.teeth.some((x) => x.kind === 'gap')).map((h) => h.id)).toEqual(['gorilla']);
  });
  it('every skull has the full adult tooth row on one side of each jaw: 2 incisors, 1 canine, 2 premolars, 3 molars', () => {
    for (const h of hominids) {
      const n = (k: string) => h.teeth.filter((x) => x.kind === k).length;
      expect([n('incisor'), n('canine'), n('premolar'), n('molar')]).toEqual([2, 1, 2, 3]);
      const lay = toothLayout(h);
      expect(lay[0]!.x).toBe(h.teethX);
      for (let i = 1; i < lay.length; i++) expect(lay[i]!.x).toBeGreaterThan(lay[i - 1]!.x);
    }
    expect(featureFor('molar')).toBe('cheek');
    expect(featureFor('canine')).toBe('front');
  });
});
