import { describe, expect, it } from 'vitest';
import { boneKeys, bonesPresent, defaultShown, digitCount, drawnPhalanges, limbs, summary } from '../../src/sims/models/a4-1-limbs';
import { B13, B17, FLY_END, FLY_START, FOUNDERS, NORTH, SOUTH } from '../../src/anims/a4-1-speciation';

const byId = (id: string) => limbs.find((l) => l.id === id)!;

describe('pentadactyl limb model', () => {
  const vertebrates = limbs.filter((l) => l.kind === 'homologous');

  it('every vertebrate limb has all six homologous bone groups', () => {
    expect(vertebrates.length).toBeGreaterThanOrEqual(5);
    for (const l of vertebrates) for (const b of boneKeys) expect(bonesPresent(l).has(b), `${l.id} ${b}`).toBe(true);
  });

  it('every vertebrate limb has exactly one humerus', () => {
    for (const l of vertebrates) expect(l.segs.filter((s) => s.bone === 'humerus')).toHaveLength(1);
  });

  it('the insect wing is analogous and has no bones', () => {
    const insect = byId('insect');
    expect(insect.kind).toBe('analogous');
    expect(bonesPresent(insect).size).toBe(0);
  });

  it('the human hand has five digits with the 2-3-3-3-3 phalangeal formula', () => {
    const h = byId('human');
    expect(h.phalanges).toEqual([2, 3, 3, 3, 3]);
    expect(h.blobs.filter((b) => b.bone === 'carpals')).toHaveLength(8);
  });

  it('the horse stands on one digit with three phalanges, plus two splint metacarpals', () => {
    const h = byId('horse');
    expect(digitCount(h)).toBe(1);
    expect(drawnPhalanges(h, 3)).toBe(3);
    expect(h.segs.filter((s) => s.bone === 'metacarpals')).toHaveLength(3);
  });

  it('the bird wing has only three digits and two free carpals', () => {
    const b = byId('bird');
    expect(digitCount(b)).toBe(3);
    expect(b.blobs.filter((x) => x.bone === 'carpals')).toHaveLength(2);
  });

  it('the bat wing has the typical 2-2-3-2-2 phalangeal formula, with the third digit longest', () => {
    const b = byId('bat');
    expect(b.phalanges).toEqual([2, 2, 3, 2, 2]);
    expect(drawnPhalanges(b, 3)).toBe(3);
  });

  it('the dolphin shows hyperphalangy in digits 2 and 3', () => {
    const d = byId('dolphin');
    expect(d.phalanges[1]!).toBeGreaterThan(3);
    expect(d.phalanges[2]!).toBeGreaterThan(3);
  });

  it('drawn phalanges match the stated phalangeal counts', () => {
    for (const l of vertebrates) {
      l.phalanges.forEach((n, i) => { if (n > 0) expect(drawnPhalanges(l, i + 1), `${l.id} digit ${i + 1}`).toBe(n); });
    }
  });

  it('notes exist for every bone in every limb, and all bones fit the 240 × 320 frame', () => {
    for (const l of limbs) {
      for (const b of boneKeys) expect(l.notes[b].length).toBeGreaterThan(15);
      for (const s of l.segs) {
        expect(Math.min(s.x1, s.x2)).toBeGreaterThanOrEqual(0);
        expect(Math.max(s.x1, s.x2)).toBeLessThanOrEqual(240);
        expect(Math.min(s.y1, s.y2)).toBeGreaterThanOrEqual(0);
        expect(Math.max(s.y1, s.y2)).toBeLessThanOrEqual(320);
      }
    }
  });

  it('summaries mention the insect only when it is shown', () => {
    const shown = limbs.filter((l) => defaultShown.includes(l.id));
    expect(summary(shown, 'radius')).toContain('insect');
    expect(summary(shown.filter((l) => l.id !== 'insect'), 'radius')).not.toContain('insect');
    expect(summary([], 'all')).toMatch(/Choose at least one/);
  });
});

describe('speciation animation layout', () => {
  it('founders come from the northern population and land south of the river', () => {
    for (const i of FOUNDERS) expect(NORTH[i]).toBeDefined();
    for (const [, y] of NORTH) expect(y).toBeLessThan(160);
    for (const [, y] of SOUTH) expect(y).toBeGreaterThan(195);
    expect(SOUTH.length).toBeGreaterThan(FOUNDERS.length);
  });

  it('13- and 17-year cicada broods first coincide after 221 years', () => {
    const shared = B13.filter((y) => B17.includes(y));
    expect(shared).toEqual([221]);
  });

  it('flies split evenly between the two host trees', () => {
    expect(FLY_END).toHaveLength(FLY_START.length);
    const left = FLY_END.filter(([x]) => x < 260).length;
    expect(left).toBe(FLY_END.length / 2);
  });
});
