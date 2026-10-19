import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt } from '../viewer3d/kit';
import { LEN, chainAtoms, ch2Dirs, inPlane, molKit, outward, zigzag, type Part } from './b1-1-kit';

/*
 * B1.1 lipids, ball-and-stick, units ångströms. Hydrocarbon chains are planar zigzags (all bonds anti)
 * in the xy-plane; CH₂ hydrogens point in front of and behind that plane.
 *  - Triglyceride (top left): glycerol (3 C) joined by three ester bonds (C–O–C=O) to three saturated
 *    16-carbon fatty acids (palmitate). Each ester bond comes from one condensation reaction.
 *  - Phospholipid (middle left): glycerol with two fatty acids (sn-1 saturated 16 C; sn-2 18 C with a cis
 *    double bond at C9, as in oleate) and a phosphate group on the third carbon. The phosphate is shown
 *    without a further polar group; in most membrane phospholipids (e.g. phosphatidylcholine) one is attached.
 *  - Free fatty acids (top right), all 18 C with a –COOH group at carbon 1:
 *      saturated (stearic acid, 18:0) — no C=C, a straight chain;
 *      trans-unsaturated (elaidic acid, 18:1 trans-9) — the H atoms of C9=C10 on opposite sides, chain straight;
 *      cis-unsaturated (oleic acid, 18:1 cis-9) — the H atoms on the same side, chain bent (the kink).
 *  - Steroid (bottom right): oestradiol, C₁₈H₂₄O₂ — four fused rings (three six-membered, A–C, and one
 *    five-membered, D); ring A is aromatic; –OH on C3 and C17 (17β); a methyl (C18) on C13 (β).
 *    β substituents point to the +w face of the ring system (up, towards the viewer); 8β-H, 9α-H, 14α-H, 17α-H.
 */
const X = new THREE.Vector3(1, 0, 0);
const Yv = new THREE.Vector3(0, 1, 0);
const N = new THREE.Vector3(0, 0, 1);

/** Point at distance ra from a and rb from b, on the side of a→b given by `sign` (in the xy-plane). */
const bridge = (a: THREE.Vector3, b: THREE.Vector3, ra: number, rb: number, sign: 1 | -1) => {
  const d = b.clone().sub(a);
  const L = d.length();
  const x = (ra * ra - rb * rb + L * L) / (2 * L);
  const h = Math.sqrt(Math.max(0, ra * ra - x * x));
  const u = d.normalize();
  const perp = new THREE.Vector3().crossVectors(N, u).multiplyScalar(sign);
  return a.clone().addScaledVector(u, x).addScaledVector(perp, h);
};

const scene: SceneModule = {
  camera: { position: [2, 7, 64], target: [-2.5, 0.5, 0], fov: 38, minDistance: 12, maxDistance: 110 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const kit = molKit(ctx);

    const H = (p: Part, c: THREE.Vector3, dir: THREE.Vector3, len: number = LEN.CH) => {
      const h = c.clone().addScaledVector(dir.clone().normalize(), len);
      p.atom('H', h);
      p.bond(c, h);
      return h;
    };

    /**
     * An acyl group joined to oxygen `o`: carbonyl carbon C1 at `c1`, then a zigzag chain of `n` carbons.
     * Returns the chain carbons and the carbonyl O.
     */
    const acyl = (p: Part, ester: Part, o: THREE.Vector3, c1: THREE.Vector3, n: number, side: THREE.Vector3, doubles: Record<number, 'cis' | 'trans'> = {}) => {
      const pts = zigzag(c1, X, side, n, doubles);
      p.atom('C', c1);
      ester.bond(o, c1);
      const od = c1.clone().addScaledVector(outward(c1, o, pts[1]!), LEN.CdO);
      ester.atom('O', od);
      ester.bond(c1, od, 2, N);
      chainAtoms(p, pts, N, doubles, 2);
      return { pts, od };
    };

    /** Glycerol carbons at x = gx, centred on y = gy; returns carbons and the parts used. */
    const glycerol = (g: Part, gx: number, gy: number) => {
      const G = [new THREE.Vector3(gx, gy + LEN.CC, 0), new THREE.Vector3(gx, gy, 0), new THREE.Vector3(gx, gy - LEN.CC, 0)];
      G.forEach((c) => g.atom('C', c));
      g.bond(G[0]!, G[1]!);
      g.bond(G[1]!, G[2]!);
      // hydrogens on the left (the side away from the fatty acids): CH₂, CH, CH₂
      const left = X.clone().negate();
      for (const s of [1, -1]) H(g, G[0]!, left.clone().multiplyScalar(0.55).addScaledVector(Yv, 0.35).addScaledVector(N, s * 0.75));
      H(g, G[1]!, left);
      for (const s of [1, -1]) H(g, G[2]!, left.clone().multiplyScalar(0.55).addScaledVector(Yv, -0.35).addScaledVector(N, s * 0.75));
      return G;
    };

    // ---------- triglyceride ----------
    const tg = new THREE.Group();
    root.add(tg);
    const tgGly = kit.part(tg), tgEster = kit.part(tg), tgChains = kit.part(tg);
    const TGX = -25, TGY = 13, ROW = 3.3, CX = 2.0;
    // ester O placement (side of the glycerol–C1 line) and chain zigzag side for rows 0, 1, 2, chosen so the
    // O–C1–C2 angle is close to 120° and each C=O points away from the neighbouring chain where possible
    const oSide: (1 | -1)[] = [1, -1, -1];
    const zSide = [Yv.clone().negate(), Yv.clone().negate(), Yv.clone()];
    const tgG = glycerol(tgGly, TGX, TGY);
    const tgO: THREE.Vector3[] = [];
    const tgPts: THREE.Vector3[][] = [];
    tgG.forEach((g, k) => {
      const c1 = new THREE.Vector3(TGX + CX, TGY + ROW * (1 - k), 0);
      const o = bridge(g, c1, LEN.CO, 1.36, oSide[k]!);
      tgEster.atom('O', o);
      tgEster.bond(g, o);
      tgO.push(o);
      tgPts.push(acyl(tgChains, tgEster, o, c1, 16, zSide[k]!).pts);
    });

    // ---------- phospholipid ----------
    const pl = new THREE.Group();
    root.add(pl);
    const plGly = kit.part(pl), plEster = kit.part(pl), plChains = kit.part(pl), plPhos = kit.part(pl);
    const PLX = -25, PLY = 1.5;
    const plG = glycerol(plGly, PLX, PLY);
    const plPts: THREE.Vector3[][] = [];
    [0, 1].forEach((k) => {
      const g = plG[k]!;
      const c1 = new THREE.Vector3(PLX + CX, PLY + ROW * (1 - k), 0);
      const o = bridge(g, c1, LEN.CO, 1.36, oSide[k]!);
      plEster.atom('O', o);
      plEster.bond(g, o);
      // sn-2 chain: 18 C with a cis double bond between C9 and C10 that bends the chain downwards
      plPts.push(k === 0 ? acyl(plChains, plEster, o, c1, 16, zSide[0]!).pts : acyl(plChains, plEster, o, c1, 18, zSide[1]!, { 9: 'cis' }).pts);
    });
    // phosphate on carbon 3: C3–O–P, with three more O (one P=O and two O⁻; charged, so strongly hydrophilic)
    const o3 = plG[2]!.clone().addScaledVector(inPlane(X, Yv, 225), LEN.CO);
    const P = o3.clone().addScaledVector(inPlane(X, Yv, 195), LEN.PO);
    plPhos.atom('O', o3);
    plGly.bond(plG[2]!, o3);
    plPhos.atom('P', P);
    plPhos.bond(o3, P);
    const pO = [inPlane(X, Yv, 105), inPlane(X, Yv, 250), inPlane(X, Yv, 165).multiplyScalar(0.5).addScaledVector(N, 0.87)].map((d) => P.clone().addScaledVector(d.normalize(), 1.5));
    pO.forEach((o, i) => { plPhos.atom('O', o); plPhos.bond(P, o, i === 0 ? 2 : 1, N); });

    // ---------- free fatty acids: saturated, trans, cis ----------
    const fa = new THREE.Group();
    root.add(fa);
    const faX = 2.5;
    const carboxyl = kit.part(fa);
    const freeAcid = (y: number, doubles: Record<number, 'cis' | 'trans'>, side: THREE.Vector3) => {
      const p = kit.part(fa);
      const c1 = new THREE.Vector3(faX, y, 0);
      const pts = zigzag(c1, X, side, 18, doubles);
      carboxyl.atom('C', c1);
      // –COOH: C=O and C–O–H in the plane, at 120° to the C1–C2 bond
      const d12 = pts[1]!.clone().sub(c1).normalize();
      const dO1 = d12.clone().applyAxisAngle(N, (2 * Math.PI) / 3);
      const dO2 = d12.clone().applyAxisAngle(N, (-2 * Math.PI) / 3);
      const od = c1.clone().addScaledVector(dO1, LEN.CdO);
      const oh = c1.clone().addScaledVector(dO2, 1.34);
      carboxyl.atom('O', od); carboxyl.bond(c1, od, 2, N);
      carboxyl.atom('O', oh); carboxyl.bond(c1, oh);
      H(carboxyl, oh, dO2.clone().applyAxisAngle(N, dO2.y > 0 ? -1.2 : 1.2), LEN.OH);
      chainAtoms(p, pts, N, doubles, 2);
      return { p, pts };
    };
    const sat = freeAcid(15.5, {}, Yv);
    const trans = freeAcid(10.5, { 9: 'trans' }, Yv);
    const cis = freeAcid(5.5, { 9: 'cis' }, Yv.clone().negate());

    // ---------- steroid: oestradiol ----------
    const st = new THREE.Group();
    root.add(st);
    const tilt = THREE.MathUtils.degToRad(35);
    const u = X.clone();
    const w = new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt)); // β face
    const v = new THREE.Vector3().crossVectors(w, u);
    const SO = new THREE.Vector3(-19, -10.5, 0);
    const L = 1.45;
    const flat: Record<string, [number, number]> = {
      C1: [0, 1], C2: [-0.866, 0.5], C3: [-0.866, -0.5], C4: [0, -1], C5: [0.866, -0.5], C10: [0.866, 0.5],
      C6: [1.732, -1], C7: [2.598, -0.5], C8: [2.598, 0.5], C9: [1.732, 1],
      C11: [1.732, 2], C12: [2.598, 2.5], C13: [3.464, 2], C14: [3.464, 1],
      C15: [4.415, 0.691], C16: [5.003, 1.5], C17: [4.415, 2.309],
    };
    const S: Record<string, THREE.Vector3> = {};
    for (const [k, [a, b]] of Object.entries(flat)) S[k] = SO.clone().addScaledVector(u, (a - 2.07) * L).addScaledVector(v, (b - 0.75) * L);
    const ring = kit.part(st), stOH = kit.part(st);
    for (const c of Object.values(S)) ring.atom('C', c);
    const ringBonds: [string, string, (1 | 2)?][] = [
      ['C1', 'C2', 2], ['C2', 'C3'], ['C3', 'C4', 2], ['C4', 'C5'], ['C5', 'C10', 2], ['C10', 'C1'],
      ['C5', 'C6'], ['C6', 'C7'], ['C7', 'C8'], ['C8', 'C9'], ['C9', 'C10'],
      ['C9', 'C11'], ['C11', 'C12'], ['C12', 'C13'], ['C13', 'C14'], ['C14', 'C8'],
      ['C14', 'C15'], ['C15', 'C16'], ['C16', 'C17'], ['C17', 'C13'],
    ];
    for (const [a, b, o] of ringBonds) ring.bond(S[a]!, S[b]!, o ?? 1, w);
    const out = (c: string, a: string, b: string) => outward(S[c]!, S[a]!, S[b]!);
    H(ring, S.C1!, out('C1', 'C2', 'C10'));
    H(ring, S.C2!, out('C2', 'C1', 'C3'));
    H(ring, S.C4!, out('C4', 'C3', 'C5'));
    const o3s = S.C3!.clone().addScaledVector(out('C3', 'C2', 'C4'), 1.36);
    stOH.atom('O', o3s); ring.bond(S.C3!, o3s);
    H(stOH, o3s, out('C3', 'C2', 'C4').applyAxisAngle(w, 1.2), LEN.OH);
    for (const [c, a, b] of [['C6', 'C5', 'C7'], ['C7', 'C6', 'C8'], ['C11', 'C9', 'C12'], ['C12', 'C11', 'C13'], ['C15', 'C14', 'C16'], ['C16', 'C15', 'C17']] as const) {
      for (const d of ch2Dirs(S[c]!, S[a]!, S[b]!, w)) H(ring, S[c]!, d);
    }
    H(ring, S.C8!, w); // 8β-H
    H(ring, S.C9!, w.clone().negate()); // 9α-H
    H(ring, S.C14!, w.clone().negate()); // 14α-H
    // C18 methyl on C13 (β)
    const c18 = S.C13!.clone().addScaledVector(w, LEN.CC);
    ring.atom('C', c18); ring.bond(S.C13!, c18);
    const o13 = out('C13', 'C12', 'C14');
    for (const deg of [0, 120, 240]) {
      const perp = o13.clone().applyAxisAngle(w, THREE.MathUtils.degToRad(deg));
      H(ring, c18, w.clone().multiplyScalar(0.33).addScaledVector(perp, 0.94));
    }
    // C17: 17β-OH and 17α-H
    const o17d = out('C17', 'C16', 'C13');
    const o17 = S.C17!.clone().addScaledVector(o17d.clone().multiplyScalar(0.6).addScaledVector(w, 0.8).normalize(), LEN.CO);
    stOH.atom('O', o17); ring.bond(S.C17!, o17);
    H(stOH, o17, o17d.clone().multiplyScalar(0.9).addScaledVector(w, 0.2).addScaledVector(v, 0.35), LEN.OH);
    H(ring, S.C17!, o17d.clone().multiplyScalar(0.6).addScaledVector(w, -0.8));

    kit.finish();

    // ---------- anchors ----------
    const at = (name: string, p: THREE.Vector3, dz = 0.6) => anchorAt(root, p.x, p.y, p.z + dz, name);
    const mid = (pts: THREE.Vector3[], i: number) => pts[i]!.clone().lerp(pts[i + 1]!, 0.5);
    const anchors = {
      triglyceride: { object: at('triglyceride', new THREE.Vector3(TGX - 2.2, TGY + 3.8, 0)), highlight: [tg] },
      glycerol: { object: at('glycerol', tgG[1]!.clone().add(new THREE.Vector3(-0.5, 0, 0))), highlight: [tgGly.group, plGly.group] },
      ester: { object: at('ester', tgO[1]!), highlight: [tgEster.group, plEster.group] },
      tails: { object: at('tails', mid(tgPts[2]!, 9)), highlight: [tgChains.group, plChains.group] },
      phospholipid: { object: at('phospholipid', new THREE.Vector3(PLX - 2.2, PLY + 3.8, 0)), highlight: [pl] },
      phosphate: { object: at('phosphate', P), highlight: [plPhos.group] },
      carboxyl: { object: at('carboxyl', trans.pts[0]!.clone().add(new THREE.Vector3(-1.2, -0.6, 0))), highlight: [carboxyl.group] },
      saturated: { object: at('saturated', mid(sat.pts, 3)), highlight: [sat.p.group] },
      trans: { object: at('trans', mid(trans.pts, 3)), highlight: [trans.p.group] },
      cis: { object: at('cis', mid(cis.pts, 4)), highlight: [cis.p.group] },
      'kink-membrane': { object: at('kink-membrane', mid(plPts[1]!, 9)), highlight: [plChains.group] },
      steroid: { object: at('steroid', S.C9!.clone().lerp(S.C8!, 0.5)), highlight: [ring.group] },
      'steroid-oh': { object: at('steroid-oh', o17), highlight: [stOH.group] },
    };
    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
