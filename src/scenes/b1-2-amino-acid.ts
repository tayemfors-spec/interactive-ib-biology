import * as THREE from 'three';
import type { PaletteKey, SceneModule } from '../viewer3d/types';
import { anchorAt } from '../viewer3d/kit';
import { ease, phase } from '../lib/timeline';
import { ballStick, OFFSTAGE, v3, type V3 } from './b1-2-kit';

/*
 * B1.2.1–B1.2.2 Two amino acids and the condensation reaction that joins them (ball-and-stick, units ≈ Å).
 * Step 0: two separate amino acids. Step 1: the –OH of the first amino acid's carboxyl group and one H of
 * the second amino acid's amine group leave as H₂O, and a peptide bond (C–N) forms.
 * The backbone N–Cα–C–N–Cα–C is a planar zig-zag (x right, y up, z towards the camera). Each α carbon is
 * tetrahedral with N, C, R and H; the R and H positions give the L-configuration (with H towards the
 * viewer, CO → R → N runs clockwise). In the dipeptide neighbouring R groups point to opposite sides of
 * the chain, as in a real extended polypeptide. The carbonyl C=O is drawn as a double bond.
 * Colours: C dark, N blue, O red, H grey, R group green, peptide bond orange.
 */
const L = 1.5; // C–C and C–N single bonds (drawn ~1.0 × real length)
const LP = 1.35; // peptide bond (shorter: partial double-bond character)
const LH = 1.0;
const GAP = 3.2; // extra separation of the second amino acid before condensation
const up = v3(Math.cos(Math.PI / 6), Math.sin(Math.PI / 6), 0); // bond direction from a "down" to an "up" atom
const dn = v3(Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6), 0);
const tet = (s: 1 | -1, z: 1 | -1) => v3(0, 0.55 * s, 0.835 * z);

type El = 'C' | 'N' | 'O' | 'H' | 'R';
const EL_KEY: Record<El, PaletteKey> = { C: 'text', N: 'protein', O: 'k', H: 'neutral', R: 'carb' };
const EL_R: Record<El, number> = { C: 0.42, N: 0.42, O: 0.42, H: 0.27, R: 0.62 };

const scene: SceneModule = {
  camera: { position: [3.6, 2.2, 16.8], target: [2.6, -0.3, 0], fov: 38, minDistance: 5, maxDistance: 30 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    root.rotation.y = 0.04;

    // ---------- final (dipeptide) geometry; amino acid 2 starts GAP further right ----------
    const N1 = v3(0, 0, 0);
    const CA1 = N1.clone().addScaledVector(up, L);
    const C1 = CA1.clone().addScaledVector(dn, L);
    const N2 = C1.clone().addScaledVector(up, LP);
    const CA2 = N2.clone().addScaledVector(dn, L);
    const C2 = CA2.clone().addScaledVector(up, L);
    const centre = N1.clone().add(C2).multiplyScalar(0.5);
    for (const p of [N1, CA1, C1, N2, CA2, C2]) p.sub(centre);

    const a1: Record<string, [El, V3]> = {
      N1: ['N', N1],
      HN1a: ['H', N1.clone().add(v3(-0.76, 0.65, 0).multiplyScalar(LH))],
      HN1b: ['H', N1.clone().add(v3(-0.05, -0.575, 0.817).multiplyScalar(LH))],
      CA1: ['C', CA1],
      R1: ['R', CA1.clone().addScaledVector(tet(1, 1), 1.7)],
      HA1: ['H', CA1.clone().addScaledVector(tet(1, -1), LH)],
      C1: ['C', C1],
      O1: ['O', C1.clone().add(v3(0, -1.25, 0))],
    };
    // the carboxyl –OH of amino acid 1 (sits where amino acid 2's N will be) and its H
    const OH1 = C1.clone().addScaledVector(up, 1.36);
    const HO1 = OH1.clone().add(v3(-0.19, 0.98, 0).multiplyScalar(0.97));
    const a2: Record<string, [El, V3]> = {
      N2: ['N', N2],
      HN2: ['H', N2.clone().add(v3(0, LH, 0))],
      CA2: ['C', CA2],
      R2: ['R', CA2.clone().addScaledVector(tet(-1, -1), 1.7)],
      HA2: ['H', CA2.clone().addScaledVector(tet(-1, 1), LH)],
      C2: ['C', C2],
      O2: ['O', C2.clone().add(v3(0, 1.25, 0))],
      OH2: ['O', C2.clone().addScaledVector(dn, 1.36)],
    };
    a2.HO2 = ['H', a2.OH2![1].clone().add(v3(0.19, -0.98, 0).multiplyScalar(0.97))];
    // the amine H of amino acid 2 that leaves (points back towards amino acid 1)
    const HN2x = N2.clone().addScaledVector(up, -LH);

    // water: O and H from amino acid 1's –OH, plus H from amino acid 2's amine group
    const WATER = v3(C1.x + 0.4, -3.2, 1.6);
    const HOH = (104.5 * Math.PI) / 180;
    const wHa = v3(Math.sin(HOH / 2), Math.cos(HOH / 2), 0).multiplyScalar(0.97);
    const wHb = v3(-Math.sin(HOH / 2), Math.cos(HOH / 2), 0).multiplyScalar(0.97);

    // ---------- meshes, one set per group so a label highlights just its group ----------
    const kit = ballStick(ctx, root, 8);
    const groups = ['amine', 'alpha', 'rgroup', 'halpha', 'carboxyl', 'carboxyl1', 'aa2', 'water', 'bonds', 'peptide'] as const;
    type G = (typeof groups)[number];
    const balls = new Map<string, THREE.InstancedMesh>();
    const ballMesh = (g: G, el: El) => {
      const k = `${g}-${el}`;
      if (!balls.has(k)) balls.set(k, kit.mesh(k, 'ball', EL_KEY[el], 8, el === 'R' ? { roughness: 0.6 } : {}));
      return balls.get(k)!;
    };
    const stickMesh: Record<G, THREE.InstancedMesh> = {} as Record<G, THREE.InstancedMesh>;
    for (const g of groups) stickMesh[g] = kit.mesh(`${g}-stick`, 'stick', g === 'peptide' ? 'head' : 'neutral', 16);
    const groupOf: Record<string, G> = {
      N1: 'amine', HN1a: 'amine', HN1b: 'amine', CA1: 'alpha', R1: 'rgroup', HA1: 'halpha', C1: 'carboxyl1', O1: 'carboxyl1',
      N2: 'aa2', HN2: 'aa2', CA2: 'aa2', R2: 'aa2', HA2: 'aa2', C2: 'carboxyl', O2: 'carboxyl', OH2: 'carboxyl', HO2: 'carboxyl',
    };
    const group = (g: G) => [...balls.entries()].filter(([k]) => k.startsWith(`${g}-`)).map(([, m]) => m);
    // pre-create every mesh so highlight lists are complete
    for (const [k, [el]] of [...Object.entries(a1), ...Object.entries(a2)]) ballMesh(groupOf[k]!, el);
    ballMesh('carboxyl1', 'O'); ballMesh('carboxyl1', 'H'); ballMesh('water', 'O'); ballMesh('water', 'H'); ballMesh('aa2', 'H');

    const bond = (g: G, a: V3, b: V3, r = 0.11) => kit.stick(stickMesh[g], a, b, r);
    const double = (g: G, a: V3, b: V3) => {
      const d = b.clone().sub(a).normalize();
      const off = new THREE.Vector3().crossVectors(d, v3(0, 0, 1)).multiplyScalar(0.11);
      bond(g, a.clone().add(off), b.clone().add(off), 0.075);
      bond(g, a.clone().sub(off), b.clone().sub(off), 0.075);
    };

    // ---------- anchors (positions set in render) ----------
    const anchor = (id: string) => anchorAt(root, 0, 0, 0, id);
    const anc = {
      'alpha-carbon': anchor('alpha-carbon'),
      amine: anchor('amine'),
      carboxyl: anchor('carboxyl'),
      'r-group': anchor('r-group'),
      hydrogen: anchor('hydrogen'),
      'peptide-bond': anchor('peptide-bond'),
      water: anchor('water'),
    };
    const anchors = {
      'alpha-carbon': { object: anc['alpha-carbon'], highlight: group('alpha') },
      amine: { object: anc.amine, highlight: [...group('amine'), stickMesh.amine] },
      carboxyl: { object: anc.carboxyl, highlight: [...group('carboxyl'), stickMesh.carboxyl] },
      'r-group': { object: anc['r-group'], highlight: group('rgroup') },
      hydrogen: { object: anc.hydrogen, highlight: group('halpha') },
      'peptide-bond': { object: anc['peptide-bond'], highlight: [stickMesh.peptide] },
      water: { object: anc.water, highlight: [...group('water'), stickMesh.water] },
    };

    const tmp = new THREE.Vector3();
    const render = (index: number, t: number) => {
      kit.begin();
      const slide = index === 0 ? 0 : ease(phase(t, 0.05, 0.5)); // amino acid 2 moves in
      const leave = index === 0 ? 0 : ease(phase(t, 0.15, 0.45)); // –OH and H come off
      const form = index === 0 ? 0 : ease(phase(t, 0.45, 0.62)); // peptide bond forms
      const drift = index === 0 ? 0 : ease(phase(t, 0.62, 1)); // water moves away
      const shift = v3(GAP * (1 - slide), 0, 0);
      const P: Record<string, V3> = {};
      for (const [k, [, p]] of Object.entries(a1)) P[k] = p;
      for (const [k, [, p]] of Object.entries(a2)) P[k] = p.clone().add(shift);

      // amino acid 1 and 2 atoms
      for (const [k, [el]] of [...Object.entries(a1), ...Object.entries(a2)]) kit.ball(ballMesh(groupOf[k]!, el), P[k]!, EL_R[el]);
      // water assembly: from the carboxyl –OH (and the amine H) to a point below, then drifting off
      const wPos = WATER.clone().add(v3(0.6 * drift, -0.9 * drift, 0.8 * drift));
      const oPos = OH1.clone().lerp(wPos, leave);
      const hA = HO1.clone().lerp(wPos.clone().add(wHa), leave);
      const hBstart = HN2x.clone().add(shift);
      const hB = hBstart.clone().lerp(wPos.clone().add(wHb), leave);
      const inWater = leave > 0.999;
      kit.ball(ballMesh(inWater ? 'water' : 'carboxyl1', 'O'), oPos, EL_R.O);
      kit.ball(ballMesh(inWater ? 'water' : 'carboxyl1', 'H'), hA, EL_R.H);
      kit.ball(ballMesh(inWater ? 'water' : 'aa2', 'H'), hB, EL_R.H);

      // covalent bonds
      bond('amine', P.N1!, P.HN1a!); bond('amine', P.N1!, P.HN1b!); bond('amine', P.N1!, P.CA1!);
      bond('rgroup', P.CA1!, P.R1!, 0.14); bond('halpha', P.CA1!, P.HA1!);
      bond('carboxyl1', P.CA1!, P.C1!); double('carboxyl1', P.C1!, P.O1!);
      bond('aa2', P.N2!, P.HN2!); bond('aa2', P.N2!, P.CA2!); bond('aa2', P.CA2!, P.R2!, 0.14); bond('aa2', P.CA2!, P.HA2!); bond('aa2', P.CA2!, P.C2!);
      double('carboxyl', P.C2!, P.O2!); bond('carboxyl', P.C2!, P.OH2!); bond('carboxyl', P.OH2!, P.HO2!);
      if (leave < 0.35) { bond('carboxyl1', P.C1!, oPos); bond('carboxyl1', oPos, hA); bond('aa2', P.N2!, hB); }
      if (inWater) { bond('water', oPos, hA); bond('water', oPos, hB); }
      if (form > 0) bond('peptide', P.C1!, tmp.copy(P.C1!).lerp(P.N2!, form), 0.16);
      kit.end();

      // ---------- labels follow their atoms; labels that don't apply yet are moved off stage ----------
      anc['alpha-carbon'].position.copy(P.CA1!).add(v3(0.05, -0.15, 0.45));
      anc.amine.position.copy(P.N1!).add(v3(-0.25, -0.15, 0.45));
      // the carboxyl group of amino acid 2 stays free in the dipeptide (the amine group of amino acid 1 does too)
      anc.carboxyl.position.copy(P.O2!).add(v3(0, 0.35, 0.2));
      anc['r-group'].position.copy(P.R1!).add(v3(0, 0.7, 0));
      anc.hydrogen.position.copy(P.HA1!); // exactly on the α-carbon's H atom (not nudged towards the R group)
      anc['peptide-bond'].position.copy(form > 0.99 ? P.C1!.clone().lerp(P.N2!, 0.5).add(v3(0, -0.1, 0.2)) : OFFSTAGE);
      anc.water.position.copy(inWater ? wPos.clone().add(v3(0.4, -0.4, 0.3)) : OFFSTAGE);
    };
    render(0, 0);

    return {
      anchors,
      durations: [4, 7],
      render,
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
