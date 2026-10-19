import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { bonds, chainPoints, CYS, expose, freshSample, heatStable, nativeFraction, proteins, summary, WEAK } from '../../src/sims/models/b1-2-denaturation';
import { aminoAcids, charge, interactions, whereFound } from '../../src/sims/models/b1-2-r-groups';
import { cbDir, finish, helixAxis, HELIX, levelsModel, regularBackbone, STRAND, torsion } from '../../src/scenes/b1-2-kit';

const P = Object.fromEntries(proteins.map((p) => [p.id, p]));

describe('B1.2 denaturation model', () => {
  it('a typical human enzyme is fully folded at 37 °C and pH 7', () => {
    expect(nativeFraction(P.human!, 37, 7)).toBeGreaterThan(0.95);
  });
  it('the proportion of native molecules only falls as temperature rises, and is near zero by 70 °C', () => {
    let last = 2;
    for (let t = 0; t <= 100; t += 5) {
      const f = nativeFraction(P.human!, t, 7);
      expect(f).toBeLessThanOrEqual(last);
      last = f;
    }
    expect(nativeFraction(P.human!, 70, 7)).toBeLessThan(0.05);
  });
  it('the thermophile enzyme stays folded at temperatures that denature the human enzyme', () => {
    expect(nativeFraction(P.taq!, 80, 8)).toBeGreaterThan(0.9);
    expect(nativeFraction(P.human!, 80, 8)).toBeLessThan(0.01);
    expect(heatStable(P.taq!, 95)).toBeGreaterThan(0.5);
  });
  it('pepsin is stable at pH 2 but denatured at neutral pH; the human enzyme is the reverse', () => {
    expect(nativeFraction(P.pepsin!, 37, 2)).toBeGreaterThan(0.9);
    expect(nativeFraction(P.pepsin!, 37, 8)).toBeLessThan(0.05);
    expect(nativeFraction(P.human!, 37, 2)).toBeLessThan(0.05);
  });
  it('denaturation is permanent: returning to normal conditions does not restore the shape', () => {
    const heated = expose(expose(freshSample(), P.human!, 37, 7), P.human!, 80, 7);
    const cooled = expose(heated, P.human!, 37, 7);
    expect(cooled.native).toBeLessThan(0.05);
    expect(summary(P.human!, cooled, 37, 7)).toMatch(/permanent/);
    expect(expose(freshSample(), P.human!, 37, 7).native).toBeGreaterThan(0.95);
  });
  it('heat breaks hydrogen bonds; extreme pH breaks ionic bonds; peptide and disulfide bonds survive', () => {
    const hot = expose(freshSample(), P.human!, 85, 7);
    const acid = expose(freshSample(), P.human!, 37, 1);
    const state = (s: ReturnType<typeof freshSample>, name: RegExp) => bonds(s).find((b) => name.test(b.name))!.state;
    expect(state(hot, /^Hydrogen/)).toBe('broken');
    expect(state(acid, /^Ionic/)).toBe('broken');
    for (const s of [hot, acid]) {
      expect(state(s, /^Peptide/)).toBe('intact');
      expect(state(s, /^Disulfide/)).toBe('intact');
    }
    expect(bonds(freshSample()).every((b) => b.state === 'intact')).toBe(true);
  });
  it('in the drawing, bonded points are close in the folded chain and the disulfide stays closed when unfolded', () => {
    const folded = chainPoints(0);
    const open = chainPoints(1);
    const d = (p: [number, number][], a: number, b: number) => Math.hypot(p[a]![0] - p[b]![0], p[a]![1] - p[b]![1]);
    for (const [a, b] of [...WEAK.hbonds, ...WEAK.ionic, [CYS[0], CYS[1]] as [number, number]]) expect(d(folded, a, b)).toBeLessThan(42);
    expect(d(open, CYS[0], CYS[1])).toBeLessThan(16);
    // unfolded, the hydrogen-bonded pairs are far apart
    expect(Math.min(...WEAK.hbonds.map(([a, b]) => d(open, a, b)))).toBeGreaterThan(42);
  });
});

describe('B1.2 R-group explorer data', () => {
  it('has the 20 genetically coded amino acids: 9 non-polar, 6 polar, 2 acidic and 3 basic', () => {
    expect(aminoAcids).toHaveLength(20);
    expect(new Set(aminoAcids.map((a) => a.code)).size).toBe(20);
    expect(new Set(aminoAcids.map((a) => a.letter)).size).toBe(20);
    const n = (c: string) => aminoAcids.filter((a) => a.cls === c).length;
    expect([n('non-polar'), n('polar'), n('acidic'), n('basic')]).toEqual([9, 6, 2, 3]);
  });
  const aa = (code: string) => aminoAcids.find((a) => a.code === code)!;
  it('acidic R groups lose H⁺ (negative) and basic R groups gain H⁺ (positive) at pH 7, but not at extremes', () => {
    expect(charge(aa('Asp'), 7)).toBeLessThan(-0.99);
    expect(charge(aa('Glu'), 1)).toBeGreaterThan(-0.01);
    expect(charge(aa('Lys'), 7)).toBeGreaterThan(0.99);
    expect(charge(aa('Lys'), 13)).toBeLessThan(0.01);
    expect(charge(aa('Arg'), 7)).toBeGreaterThan(0.99);
    const his = charge(aa('His'), 7);
    expect(his).toBeGreaterThan(0.05);
    expect(his).toBeLessThan(0.2);
    for (const a of aminoAcids.filter((x) => x.cls === 'non-polar' || x.cls === 'polar')) expect(charge(a, 7)).toBe(0);
  });
  it('only cysteine forms disulfide bonds; charged R groups form ionic bonds; non-polar ones hydrophobic interactions', () => {
    for (const a of aminoAcids) {
      const i = interactions(a).join(' ');
      expect(/disulfide/.test(i)).toBe(a.code === 'Cys');
      if (a.cls === 'acidic' || a.cls === 'basic') expect(i).toMatch(/ionic/);
      if (a.cls === 'non-polar' && a.code !== 'Gly') expect(i).toMatch(/hydrophobic/);
    }
  });
  it('non-polar R groups are buried (core or bilayer); polar and charged ones are exposed to water', () => {
    expect(whereFound(aa('Leu'))).toMatchObject({ globular: 'buried', membrane: 'buried' });
    expect(whereFound(aa('Glu'))).toMatchObject({ globular: 'exposed', membrane: 'exposed' });
    expect(whereFound(aa('Ser')).globular).toBe('exposed');
  });
});

describe('B1.2 backbone geometry used by the 3D models', () => {
  const isL = (r: { N: THREE.Vector3; CA: THREE.Vector3; C: THREE.Vector3 }) => {
    const n = r.N.clone().sub(r.CA).normalize();
    const c = r.C.clone().sub(r.CA).normalize();
    const b = cbDir(r);
    const h = n.clone().add(c).add(b).multiplyScalar(-1); // the α hydrogen points away from the other three
    return new THREE.Vector3().crossVectors(c, b).dot(h) < 0; // with H towards the viewer, CO → R → N is clockwise
  };
  it('builds the requested torsion angles', () => {
    const h = regularBackbone(6, HELIX.phi, HELIX.psi);
    expect(torsion(h[2]!.C, h[3]!.N, h[3]!.CA, h[3]!.C)).toBeCloseTo(HELIX.phi, 3);
    expect(torsion(h[3]!.N, h[3]!.CA, h[3]!.C, h[4]!.N)).toBeCloseTo(HELIX.psi, 3);
  });
  it('the α-helix is right-handed with C=O(i)···H–N(i+4) hydrogen bonds of about 2 Å', () => {
    const h = finish(regularBackbone(14, HELIX.phi, HELIX.psi));
    const { axis, centre } = helixAxis(h);
    let turn = 0;
    for (let i = 0; i < 13; i++) {
      const a = h[i]!.CA.clone().sub(centre).projectOnPlane(axis);
      const b = h[i + 1]!.CA.clone().sub(centre).projectOnPlane(axis);
      turn += new THREE.Vector3().crossVectors(a, b).dot(axis);
    }
    expect(turn).toBeGreaterThan(0);
    for (let i = 0; i + 4 < 13; i++) {
      expect(h[i]!.O.distanceTo(h[i + 4]!.H)).toBeGreaterThan(1.8);
      expect(h[i]!.O.distanceTo(h[i + 4]!.H)).toBeLessThan(2.2);
      // and not to i + 3 (that would be a 3₁₀ helix)
      expect(h[i]!.O.distanceTo(h[i + 3]!.H)).toBeGreaterThan(2.5);
    }
    // rise per residue ≈ 1.5 Å
    expect(h[12]!.CA.clone().sub(h[0]!.CA).dot(axis) / 12).toBeCloseTo(1.5, 1);
  });
  it('every residue is an L-amino acid', () => {
    for (const r of regularBackbone(8, HELIX.phi, HELIX.psi)) expect(isL(r)).toBe(true);
    for (const r of regularBackbone(8, STRAND.phi, STRAND.psi)) expect(isL(r)).toBe(true);
  });
  it('the β-strand is flat (two-fold), so R groups alternate above and below the sheet', () => {
    const s = finish(regularBackbone(8, STRAND.phi, STRAND.psi));
    expect(Math.abs(torsion(s[1]!.CA, s[2]!.CA, s[3]!.CA, s[4]!.CA))).toBeCloseTo(180, 0);
    const d = (i: number) => s[i]!.R.clone().sub(s[i]!.CA).normalize();
    for (let i = 0; i < 6; i++) expect(d(i).dot(d(i + 1))).toBeLessThan(-0.7);
  });

  const m = levelsModel();
  const S = m.states[2]!;
  it('the folded model has a 14-residue helix with 10 i → i+4 hydrogen bonds and an antiparallel sheet with inter-strand hydrogen bonds', () => {
    expect(m.helixHB).toHaveLength(10);
    for (const [i, j] of m.helixHB) {
      expect(j - i).toBe(4);
      expect(S[i]!.O.distanceTo(S[j]!.H)).toBeLessThan(2.2);
    }
    expect(m.sheetHB.length).toBeGreaterThanOrEqual(8);
    const strandOf = (i: number) => m.seg.findIndex((s) => s.kind === 'strand' && i >= s.from && i <= s.to);
    for (const [i, j] of m.sheetHB) {
      expect(S[i]!.O.distanceTo(S[j]!.H)).toBeLessThan(2.5);
      expect(strandOf(i)).toBeGreaterThanOrEqual(0);
      expect(strandOf(j)).toBeGreaterThanOrEqual(0);
      expect(strandOf(i)).not.toBe(strandOf(j)); // between neighbouring strands, never within one
    }
  });
  it('the chain stays connected in every state (Cα–Cα ≈ 3.8 Å)', () => {
    for (const st of m.states) for (let i = 0; i + 1 < st.length; i++) {
      const d = st[i]!.CA.distanceTo(st[i + 1]!.CA);
      expect(d).toBeGreaterThan(2.9);
      expect(d).toBeLessThan(4.4);
    }
  });
  it('the core holds the hydrophobic R groups, between helix and sheet, and the special pairs have the right classes', () => {
    expect(m.core.length).toBeGreaterThanOrEqual(10);
    for (const i of m.core) expect(['hydrophobic', 'cys']).toContain(m.cls[i]); // a buried cysteine may form the disulfide
    expect(m.disulfide && m.disulfide.map((i) => m.cls[i])).toEqual(['cys', 'cys']);
    expect(m.ionic && [...m.ionic.map((i) => m.cls[i])].sort()).toEqual(['acidic', 'basic']);
    expect(m.rhb && m.rhb.map((i) => m.cls[i])).toEqual(['polar', 'polar']);
    // the disulfide and ionic partners are far apart in the sequence
    expect(Math.abs(m.disulfide![1] - m.disulfide![0])).toBeGreaterThan(6);
    expect(Math.abs(m.ionic![1] - m.ionic![0])).toBeGreaterThan(6);
    expect(S[m.disulfide![0]]!.R.distanceTo(S[m.disulfide![1]]!.R)).toBeLessThan(3.5);
  });
});
