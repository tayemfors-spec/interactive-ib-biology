import * as THREE from 'three';
import type { PaletteKey, SceneModule } from '../viewer3d/types';
import { anchorAt } from '../viewer3d/kit';
import { ease, phase } from '../lib/timeline';
import { ballStick, levelsModel, OFFSTAGE, type RClass, type Res, v3, type V3 } from './b1-2-kit';

/*
 * B1.2.7–B1.2.10 One 45-residue polypeptide folding from primary to tertiary structure (units: Å).
 * The chain is drawn as a backbone of N, Cα and C atoms with each carbonyl O and amide H, plus one bead
 * per R group, coloured by type. Geometry comes from levelsModel() in b1-2-kit.ts:
 *   step 0  primary: the unfolded chain laid out in rows, read N-terminus → C-terminus (sequence only);
 *   step 1  secondary: an α-helix (C=O of residue i H-bonded to N–H of residue i + 4) and a
 *           three-stranded antiparallel β-pleated sheet (C=O···H–N between neighbouring strands);
 *   step 2  tertiary: the helix packs onto the sheet with the hydrophobic R groups buried between them;
 *           a disulfide bond, an ionic bond and a hydrogen bond between R groups are shown.
 * Backbone H-bonds involve only the C=O and N–H groups of the backbone, never R groups.
 */
const R_ATOM = 0.45;
const R_H = 0.3;
const R_BEAD = 1.05;
const CLASS_KEY: Record<RClass, PaletteKey> = { hydrophobic: 'tail', polar: 'carb', acidic: 'chol', basic: 'protein2', cys: 'glucose' };

const scene: SceneModule = {
  camera: { position: [4, 10, 60], target: [0, 3, 0], fov: 38, minDistance: 25, maxDistance: 140 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const m = levelsModel();
    const [S0, S1, S2] = m.states as [Res[], Res[], Res[]];
    const kindOf = (i: number) => {
      const s = m.seg.find((g) => i >= g.from && i <= g.to)!;
      return s.kind === 'helix' ? 'helix' : s.kind === 'strand' ? 'sheet' : 'coil';
    };
    type K = 'helix' | 'sheet' | 'coil';

    const kit = ballStick(ctx, root, m.n);
    const atomMesh = (k: K, el: 'N' | 'C' | 'O' | 'H') => kit.mesh(`${k}-${el}`, 'ball', el === 'N' ? 'protein' : el === 'O' ? 'k' : el === 'H' ? 'neutral' : 'text', m.n * (el === 'C' ? 2 : 1));
    const atoms = Object.fromEntries((['helix', 'sheet', 'coil'] as K[]).map((k) => [k, { N: atomMesh(k, 'N'), C: atomMesh(k, 'C'), O: atomMesh(k, 'O'), H: atomMesh(k, 'H'), bond: kit.mesh(`${k}-bond`, 'stick', 'neutral', m.n * 6) }])) as Record<K, Record<'N' | 'C' | 'O' | 'H' | 'bond', THREE.InstancedMesh>>;
    const pepBond = kit.mesh('peptide', 'stick', 'neutral', 1);
    const beads = Object.fromEntries((Object.keys(CLASS_KEY) as RClass[]).map((c) => [c, kit.mesh(`r-${c}`, 'ball', CLASS_KEY[c], m.n, { roughness: 0.6 })])) as Record<RClass, THREE.InstancedMesh>;
    const rStick = kit.mesh('r-stick', 'stick', 'neutral', m.n);
    const hbHelix = kit.mesh('hb-helix', 'stick', 'head', m.helixHB.length * 3);
    const hbSheet = kit.mesh('hb-sheet', 'stick', 'head', m.sheetHB.length * 3);
    const hbR = kit.mesh('hb-r', 'stick', 'head', 3);
    const ionic = kit.mesh('ionic', 'stick', 'na', 3);
    const ss = kit.mesh('disulfide', 'stick', 'glucose', 1);

    const PEP = 19; // the peptide bond C(19)–N(20) carries the label
    const pos: Res[] = S0.map((r) => ({ N: r.N.clone(), CA: r.CA.clone(), C: r.C.clone(), O: r.O.clone(), H: r.H.clone(), R: r.R.clone() }));
    const lerpState = (a: Res[], b: Res[], u: number) => {
      for (let i = 0; i < m.n; i++) for (const k of ['N', 'CA', 'C', 'O', 'H', 'R'] as const) pos[i]![k].copy(a[i]![k]).lerp(b[i]![k], u);
    };

    // ---------- anchors ----------
    const anc = (id: string) => anchorAt(root, 0, 0, 0, id);
    const A = {
      'n-terminus': anc('n-terminus'), 'c-terminus': anc('c-terminus'), 'peptide-bond': anc('peptide-bond'), 'r-group': anc('r-group'),
      primary: anc('primary'), 'alpha-helix': anc('alpha-helix'), 'helix-hbond': anc('helix-hbond'), 'beta-sheet': anc('beta-sheet'),
      'sheet-hbond': anc('sheet-hbond'), hydrophobic: anc('hydrophobic'), disulfide: anc('disulfide'), ionic: anc('ionic'), 'r-hbond': anc('r-hbond'),
    };
    const allBackbone = (['helix', 'sheet', 'coil'] as K[]).flatMap((k) => Object.values(atoms[k]));
    const anchors = {
      'n-terminus': { object: A['n-terminus'], highlight: [] },
      'c-terminus': { object: A['c-terminus'], highlight: [] },
      'peptide-bond': { object: A['peptide-bond'], highlight: [pepBond] },
      'r-group': { object: A['r-group'], highlight: Object.values(beads) },
      primary: { object: A.primary, highlight: allBackbone },
      'alpha-helix': { object: A['alpha-helix'], highlight: Object.values(atoms.helix) },
      'helix-hbond': { object: A['helix-hbond'], highlight: [hbHelix] },
      'beta-sheet': { object: A['beta-sheet'], highlight: Object.values(atoms.sheet) },
      'sheet-hbond': { object: A['sheet-hbond'], highlight: [hbSheet] },
      hydrophobic: { object: A.hydrophobic, highlight: [beads.hydrophobic] },
      disulfide: { object: A.disulfide, highlight: [ss, beads.cys] },
      ionic: { object: A.ionic, highlight: [ionic, beads.acidic, beads.basic] },
      'r-hbond': { object: A['r-hbond'], highlight: [hbR] },
    };

    const helixRes = m.seg[1]!;
    const sheetRes = m.seg.filter((s) => s.kind === 'strand');
    const centroid = (idx: number[], key: 'CA' | 'R' = 'CA') => idx.reduce((s, i) => s.add(pos[i]![key]), new THREE.Vector3()).divideScalar(idx.length);
    const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
    const hide = (o: THREE.Object3D) => o.position.copy(OFFSTAGE);
    const mid = (a: V3, b: V3) => a.clone().add(b).multiplyScalar(0.5);
    // the sheet H-bond nearest the camera carries the label
    const labelHB = [...m.sheetHB].sort((p, q) => S2[q[0]]!.O.z + S2[q[1]]!.H.z - S2[p[0]]!.O.z - S2[p[1]]!.H.z)[0]!;
    const toward = v3(0, 0, 1);

    const render = (index: number, t: number) => {
      const u = ease(phase(t, 0, 0.8));
      if (index === 0) lerpState(S0, S0, 0);
      else if (index === 1) lerpState(S0, S1, u);
      else lerpState(S1, S2, u);
      const made = m.n; // the whole chain is shown in every step, so the first frame is never empty
      const backboneHB = index === 2 || (index === 1 && t >= 0.8);
      const sideBonds = index === 2 && t >= 0.8;

      kit.begin();
      for (let i = 0; i < made; i++) {
        const r = pos[i]!;
        const a = atoms[kindOf(i) as K];
        kit.ball(a.N, r.N, R_ATOM); kit.ball(a.C, r.CA, R_ATOM); kit.ball(a.C, r.C, R_ATOM); kit.ball(a.O, r.O, R_ATOM); kit.ball(a.H, r.H, R_H);
        kit.stick(a.bond, r.N, r.CA, 0.16); kit.stick(a.bond, r.CA, r.C, 0.16); kit.stick(a.bond, r.C, r.O, 0.16); kit.stick(a.bond, r.N, r.H, 0.12);
        if (i + 1 < made) kit.stick(i === PEP ? pepBond : a.bond, r.C, pos[i + 1]!.N, 0.16);
        kit.ball(beads[m.cls[i]!], r.R, R_BEAD);
        kit.stick(rStick, r.CA, r.R, 0.2);
      }
      if (backboneHB) {
        for (const [i, j] of m.helixHB) kit.dashes(hbHelix, pos[i]!.O, pos[j]!.H, 0.11);
        for (const [i, j] of m.sheetHB) kit.dashes(hbSheet, pos[i]!.O, pos[j]!.H, 0.11);
      }
      if (sideBonds) {
        if (m.disulfide) kit.stick(ss, pos[m.disulfide[0]]!.R, pos[m.disulfide[1]]!.R, 0.32);
        if (m.ionic) kit.dashes(ionic, pos[m.ionic[0]]!.R, pos[m.ionic[1]]!.R, 0.18);
        if (m.rhb) kit.dashes(hbR, pos[m.rhb[0]]!.R, pos[m.rhb[1]]!.R, 0.13);
      }
      kit.end();

      // ---------- labels ----------
      const last = m.n - 1;
      A['n-terminus'].position.copy(pos[0]!.N).add(v3(-1.2, 0.8, 0.5));
      if (made > last) A['c-terminus'].position.copy(pos[last]!.C).add(v3(1.2, -0.6, 0.5)); else hide(A['c-terminus']);
      const early = index === 0 || (index === 1 && t < 0.8); // sequence labels belong to the primary step
      if (early && made > PEP + 1) A['peptide-bond'].position.copy(mid(pos[PEP]!.C, pos[PEP + 1]!.N)).add(v3(0, 0, 0.5)); else hide(A['peptide-bond']);
      const rr = 8;
      if (index < 2 && made > rr) A['r-group'].position.copy(pos[rr]!.R).addScaledVector(toward, R_BEAD); else hide(A['r-group']);
      if (early && made > 30) A.primary.position.copy(pos[28]!.CA).add(v3(0, 1.4, 0.8)); else hide(A.primary);
      const secondary = backboneHB;
      if (secondary) {
        const hc = centroid(range(helixRes.from, helixRes.to));
        A['alpha-helix'].position.copy(hc).add(v3(-4, 4.2, 1.5));
        const [hi, hj] = m.helixHB[5]!;
        if (index === 1) A['helix-hbond'].position.copy(mid(pos[hi]!.O, pos[hj]!.H)).add(v3(0, 0, 0.4)); else hide(A['helix-hbond']);
        A['beta-sheet'].position.copy(centroid(sheetRes.flatMap((s) => range(s.from, s.to)))).add(v3(5.5, 0.5, 2));
        if (index === 1) A['sheet-hbond'].position.copy(mid(pos[labelHB[0]]!.O, pos[labelHB[1]]!.H)).add(v3(0, 0, 0.4)); else hide(A['sheet-hbond']);
      } else {
        hide(A['alpha-helix']); hide(A['helix-hbond']); hide(A['beta-sheet']); hide(A['sheet-hbond']);
      }
      if (sideBonds) {
        A.hydrophobic.position.copy(centroid(m.core, 'R')).add(v3(-3, 0, 3.5));
        if (m.disulfide) A.disulfide.position.copy(mid(pos[m.disulfide[0]]!.R, pos[m.disulfide[1]]!.R)).add(v3(0, 0, 1)); else hide(A.disulfide);
        if (m.ionic) A.ionic.position.copy(mid(pos[m.ionic[0]]!.R, pos[m.ionic[1]]!.R)).add(v3(0, 0, 1)); else hide(A.ionic);
        if (m.rhb) A['r-hbond'].position.copy(mid(pos[m.rhb[0]]!.R, pos[m.rhb[1]]!.R)).add(v3(0, 0, 1)); else hide(A['r-hbond']);
      } else {
        hide(A.hydrophobic); hide(A.disulfide); hide(A.ionic); hide(A['r-hbond']);
      }
    };
    render(0, 1);

    return {
      anchors,
      durations: [6, 7, 7],
      render,
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
