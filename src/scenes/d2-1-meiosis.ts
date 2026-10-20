import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt } from '../viewer3d/kit';
import { ease, lerp, phase } from '../lib/timeline';
import { chromKit, dividingCell, fade, honestRaycast, lerpPose, pose, segmentInstance, type Chromatid, type Pose } from './d2-1-kit';

/*
 * Meiosis in an animal cell with 2n = 4 (a long and a short homologous pair; maternal red, paternal blue).
 * DNA was replicated in the preceding interphase, so every chromosome starts as two sister chromatids.
 * Steps:
 *   0 prophase I: homologues pair (2 bivalents = 4 chromosomes = 8 chromatids)
 *   1 prophase I: crossing over between non-sister chromatids → chiasmata; envelope breaks down
 *   2 metaphase I: bivalents on the equator, random orientation (here long: maternal left; short: maternal right)
 *   3 anaphase I: homologues separate; sister chromatids stay joined
 *   4 telophase I + cytokinesis: 2 haploid cells, each n = 2 chromosomes of two chromatids
 *   5 metaphase II: chromosomes on the equator of each cell (spindles at right angles to the first)
 *   6 anaphase II: sister chromatids separate
 *   7 telophase II + cytokinesis: 4 haploid cells, each 2 chromosomes of one chromatid, all genetically different
 */
const R = 4.2;
const NR = 2.4;
const POLE = 3.5;
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const ORIGIN = new THREE.Vector3();
const SIS = 0.165; // half the spacing of sister chromatids (they touch)
const HOM = 0.43; // distance of each homologue from the mid-line of its bivalent

// chromosomes: long pair (L) and short pair (S); col m = maternal, p = paternal
type Spec = { type: 'L' | 'S'; col: 'm' | 'p' };
const CHROMS: Spec[] = [
  { type: 'L', col: 'm' }, { type: 'L', col: 'p' }, { type: 'S', col: 'm' }, { type: 'S', col: 'p' },
];
/** Metaphase I orientation: side (−1 = left pole, +1 = right pole) each homologue faces. */
const SIDE: Record<string, -1 | 1> = { Lm: -1, Lp: 1, Sm: 1, Sp: -1 };
const BIV = { L: { c: [-0.7, 0.55, 0.3] as const, y: 1.15, z: 0.2 }, S: { c: [0.95, -0.95, 0.2] as const, y: -1.05, z: -0.2 } };
const UNPAIRED: Record<string, [number, number, number]> = { Lm: [-1.35, 0.7, 0.4], Lp: [0.6, 1.25, -0.3], Sm: [-1.1, -1.2, 0.5], Sp: [1.25, -0.55, 0.1] };
const U_PRO: [number, number, number] = [0.25, 1, 0.3];
const U_M1: [number, number, number] = [0, 1, 0.4];
const U_M2: [number, number, number] = [1, 0, 0.4];
/** Metaphase II: x offset of each chromosome's centromere from its cell centre. */
const M2X = { L: -0.75, S: 0.95 };

const scene: SceneModule = {
  camera: { position: [2.2, 2.6, 17], target: [0, 0, 0], fov: 40, minDistance: 7, maxDistance: 36 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const mat = {
      m: ctx.material('k', { roughness: 0.45 }),
      p: ctx.material('protein', { roughness: 0.45 }),
      cen: ctx.material('text', { roughness: 0.5 }),
      membrane: ctx.material('head', { roughness: 0.6, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
      membrane2: ctx.material('head', { roughness: 0.6, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
      envelope: ctx.material('neutral', { roughness: 0.6, transparent: true, side: THREE.DoubleSide }),
      envelope2: ctx.material('neutral', { roughness: 0.6, transparent: true, side: THREE.DoubleSide }),
      mt: ctx.material('carb', { roughness: 0.6 }),
      centrosome: ctx.material('glucose', { roughness: 0.4 }),
      chiasma: ctx.material('glucose', { roughness: 0.35, emissiveIntensity: 0.2 }),
    };

    // ---------- cells ----------
    const parent = dividingCell(ctx, mat.membrane);
    root.add(parent.mesh);
    const daughters = [0, 1].map(() => { const c = dividingCell(ctx, mat.membrane2); root.add(c.mesh); return c; });
    const nucleus = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(NR, 40, 28)), mat.envelope);
    nucleus.renderOrder = 1;
    root.add(nucleus);
    const nucGeo = ctx.track(new THREE.SphereGeometry(1.15, 28, 18));
    const gameteNuclei = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(nucGeo, mat.envelope2); m.renderOrder = 1; root.add(m); return m; });

    // ---------- chromatids ----------
    const kit = chromKit(ctx, mat.cen);
    type Ct = { ch: Chromatid; spec: Spec; key: string; inner: boolean };
    const cts: Ct[] = [];
    CHROMS.forEach((spec) => {
      for (const inner of [false, true]) {
        const ch = kit.make(spec.type, spec.col === 'm' ? mat.m : mat.p);
        root.add(ch.group);
        cts.push({ ch, spec, key: spec.type + spec.col, inner });
      }
    });
    // crossing over: the tip of the +u arm of each INNER (non-sister, adjacent) chromatid is exchanged
    const tipMat = (c: Ct, crossed: boolean) => (crossed && c.inner ? (c.spec.col === 'm' ? mat.p : mat.m) : c.spec.col === 'm' ? mat.m : mat.p);

    // chiasmata markers (one per bivalent)
    const chiGeo = ctx.track(new THREE.TorusGeometry(0.5, 0.07, 8, 28));
    const chiasmata = [0, 1].map(() => { const m = new THREE.Mesh(chiGeo, mat.chiasma); root.add(m); return m; });

    // ---------- poses at the end of each step ----------
    const poses: Pose[][] = cts.map(({ spec, key, inner }) => {
      const t = spec.type;
      const hom = spec.col === 'm' ? -1 : 1; // side of the bivalent axis in prophase
      const off = inner ? HOM - SIS : HOM + SIS; // distance from the bivalent mid-line
      const sisSign = inner ? 1 : -1; // sister chromatid offset within one chromosome
      // 0: paired bivalent in the nucleus (bivalent axis = x)
      const b = BIV[t];
      const paired = pose([b.c[0] + hom * off, b.c[1], b.c[2]], U_PRO, [hom * (inner ? -1 : 1), 0, 0], 0.04);
      const crossed = paired;
      // 2: metaphase I — homologue faces the pole SIDE[key]
      const side = SIDE[key]!;
      const m1 = pose([side * off, b.y, b.z], U_M1, [side * (inner ? -1 : 1), 0, 0], 0.04);
      // 3: anaphase I — whole chromosomes (still two chromatids) pulled to the poles, arms trailing
      const a1 = pose([side * (2.45 + (inner ? -1 : 1) * SIS), b.y * 0.6, b.z], U_M1, [-side, 0, 0], 0.6);
      // 4: telophase I — inside the daughter cell centred at side × 3.38
      const cx = side * 3.38;
      const t1 = pose([cx + (inner ? -1 : 1) * SIS * side, b.y * 0.55, b.z], U_M1, [side * (inner ? -1 : 1), 0, 0], 0.08);
      // 5: metaphase II — on the equator (y = 0) of that cell; outer sister faces +y, inner (recombinant) faces −y
      const ySide = inner ? -1 : 1;
      const m2 = pose([cx + M2X[t], ySide * SIS, b.z], U_M2, [0, ySide, 0], 0.05);
      // 6: anaphase II — sister chromatids separated towards the poles of the second spindle
      const a2 = pose([cx + M2X[t] * 0.8, ySide * 1.75, b.z], U_M2, [0, -ySide, 0], 0.7);
      // 7: telophase II — inside one of four cells
      const t2 = pose([cx + M2X[t] * 0.55, ySide * 2.72, b.z * 0.5], U_M2, [0, ySide, 0], 0.1, 0.85);
      void sisSign;
      return [paired, crossed, m1, a1, t1, m2, a2, t2];
    });
    // start of step 0: homologues not yet paired (each chromosome on its own, sisters side by side)
    const start: Pose[] = cts.map(({ key, inner }) => {
      const c = UNPAIRED[key]!;
      const sgn = inner ? 1 : -1;
      return pose([c[0] + sgn * SIS, c[1], c[2]], U_PRO, [sgn, 0, 0], 0.12);
    });
    const cur = poses.map((p) => ({ ...p[0]!, c: p[0]!.c.clone(), u: p[0]!.u.clone(), w: p[0]!.w.clone() }));

    // ---------- spindles ----------
    const csGeo = ctx.track(new THREE.SphereGeometry(0.24, 14, 10));
    const cs1 = [0, 1].map(() => { const m = new THREE.Mesh(csGeo, mat.centrosome); root.add(m); return m; });
    const cs2 = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(csGeo, mat.centrosome); root.add(m); return m; });
    const mtGeo = ctx.track(new THREE.CylinderGeometry(0.03, 0.03, 1, 5));
    const mts = new THREE.InstancedMesh(mtGeo, mat.mt, 80);
    mts.count = 0;
    root.add(mts);
    const polar = Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * Math.PI * 2; return [Math.cos(a), Math.sin(a)] as const; });
    const a3 = new THREE.Vector3(), b3 = new THREE.Vector3();

    const anchors = {
      membrane: { object: anchorAt(root, 0, 0, 0, 'membrane'), highlight: [parent.mesh, ...daughters.map((d) => d.mesh)] },
      nucleus: { object: anchorAt(root, 0, 0, 0, 'nucleus'), highlight: [nucleus, ...gameteNuclei] },
      bivalent: { object: anchorAt(root, 0, 0, 0, 'bivalent'), highlight: cts.filter((c) => c.spec.type === 'L').map((c) => c.ch.group) },
      'sister-chromatids': { object: anchorAt(root, 0, 0, 0, 'sister-chromatids'), highlight: cts.filter((c) => c.key === 'Sp').map((c) => c.ch.group) },
      chiasma: { object: anchorAt(root, 0, 0, 0, 'chiasma'), highlight: chiasmata },
      equator: { object: anchorAt(root, 0, 0, 0, 'equator'), highlight: [] },
      spindle: { object: anchorAt(root, 0, 0, 0, 'spindle'), highlight: [mts] },
      'homologues-separate': { object: anchorAt(root, 0, 0, 0, 'homologues-separate'), highlight: cts.filter((c) => c.spec.type === 'L').map((c) => c.ch.group) },
      haploid: { object: anchorAt(root, 0, 0, 0, 'haploid'), highlight: [parent.mesh] },
      recombinant: { object: anchorAt(root, 0, 0, 0, 'recombinant'), highlight: [cts[1]!.ch.group] },
      'chromatids-separate': { object: anchorAt(root, 0, 0, 0, 'chromatids-separate'), highlight: cts.map((c) => c.ch.group) },
      gametes: { object: anchorAt(root, 0, 0, 0, 'gametes'), highlight: daughters.map((d) => d.mesh) },
    };
    const put = (id: keyof typeof anchors, x: number, y: number, z: number) => anchors[id].object.position.set(x, y, z);
    const putV = (id: keyof typeof anchors, v: THREE.Vector3, dx = 0, dy = 0, dz = 0) => anchors[id].object.position.copy(v).add(b3.set(dx, dy, dz));

    honestRaycast(root);
    return {
      anchors,
      durations: [6, 7, 6, 6, 7, 6, 6, 7],
      render(index, t) {
        const e = ease(t);
        const meiosis2 = index >= 5;

        // ----- cell surfaces -----
        const f1 = index < 3 ? 0 : index === 3 ? 0.08 * e : index === 4 ? lerp(0.08, 0.97, ease(phase(t, 0.15, 1))) : 0.97;
        parent.mesh.visible = !meiosis2;
        const P = parent.set(ORIGIN, X, R, f1);
        const f2 = index < 6 ? 0 : index === 6 ? 0.08 * e : lerp(0.08, 0.97, ease(phase(t, 0.15, 1)));
        let s2 = 0, r2 = P.r;
        daughters.forEach((d, i) => {
          d.mesh.visible = meiosis2;
          if (!meiosis2) return;
          const res = d.set(a3.set((i ? 1 : -1) * 3.38, 0, 0), Y, 3.38, f2);
          s2 = res.s; r2 = res.r;
        });
        if (!meiosis2) put('membrane', -P.s - P.r * 0.45, P.r * 0.83, P.r * 0.25);
        else put('membrane', -3.38 - r2 * 0.5, s2 + r2 * 0.8, r2 * 0.25);
        put('haploid', 3.38 + 1.2, 2.2, 0.9);
        put('gametes', 3.38 + r2 * 0.55, -s2 - r2 * 0.6, r2 * 0.3);

        // ----- nuclear envelopes -----
        const env = index === 0 ? 1 : index === 1 ? 1 - 0.6 * ease(phase(t, 0.55, 0.95)) : index === 2 ? 0.4 * (1 - ease(phase(t, 0, 0.3))) : 0;
        fade(mat.envelope, env, 0.22);
        nucleus.scale.setScalar(1 + 0.06 * (1 - env));
        put('nucleus', -1.4, -1.6, 1.2);
        const env2 = index === 7 ? ease(phase(t, 0.5, 1)) : 0;
        fade(mat.envelope2, env2, 0.3);
        gameteNuclei.forEach((n, i) => n.position.set((i % 2 ? 1 : -1) * 3.38, (i < 2 ? 1 : -1) * 2.72, 0));
        if (index === 7) put('nucleus', -3.38 - 0.9, 2.72 + 0.75, 0.5);

        // ----- chromatids -----
        const crossed = index > 1 || (index === 1 && t >= 0.45);
        cts.forEach((c, i) => {
          const Ps = poses[i]!;
          const k = index === 1 ? 1 : index === 4 || index === 7 ? ease(phase(t, 0.05, 0.8)) : ease(phase(t, 0.05, 0.85));
          const from = index === 0 ? start[i]! : Ps[index - 1]!;
          lerpPose(from, Ps[index]!, k, cur[i]);
          kit.place(c.ch, cur[i]!);
          c.ch.segs[0]![1]!.material = tipMat(c, crossed);
        });

        // chiasmata: where the two inner (non-sister) chromatids exchanged segments
        const chi = index === 1 ? ease(phase(t, 0.3, 0.55)) : index === 2 ? 1 : index === 3 ? 1 - ease(phase(t, 0, 0.25)) : 0;
        chiasmata.forEach((m, bi) => {
          const pair = cts.filter((c) => c.inner && c.spec.type === (bi ? 'S' : 'L'));
          m.visible = chi > 0.02;
          m.position.copy(pair[0]!.ch.junction).add(pair[1]!.ch.junction).multiplyScalar(0.5);
          m.quaternion.setFromUnitVectors(b3.set(0, 0, 1), cur[cts.indexOf(pair[0]!)]!.u);
          m.scale.setScalar(chi * (bi ? 0.85 : 1));
        });
        putV('chiasma', chiasmata[0]!.position, -0.55, 0.15, 0.4);
        const lmOuter = cts[0]!.ch, spOuter = cts[6]!.ch;
        putV('bivalent', lmOuter.tip, -0.35, 0.2, 0.2);
        putV('sister-chromatids', spOuter.tip, 0.3, -0.1, 0.2);
        put('equator', meiosis2 ? -3.38 - 2.2 : 0, meiosis2 ? 0.15 : -2.6, 0.4);
        putV('homologues-separate', cts[2]!.ch.cen.position, 0.35, 0.3, 0.3);
        putV('recombinant', cts[1]!.ch.tip, -0.25, 0.25, 0.3);
        putV('chromatids-separate', cts[3]!.ch.cen.position, 0.3, -0.35, 0.3);

        // ----- spindles -----
        let n = 0;
        const g1 = index === 1 ? ease(phase(t, 0.5, 1)) : index === 2 || index === 3 ? 1 : index === 4 ? 1 - ease(phase(t, 0, 0.5)) : 0;
        const pos1 = (side: number) => {
          if (index <= 1) {
            const k = index === 1 ? ease(phase(t, 0.3, 1)) : 0;
            const ang = lerp(0.08, Math.PI / 2, k), rad = lerp(NR + 0.45, POLE, k);
            return a3.set(side * rad * Math.sin(ang), rad * Math.cos(ang), lerp(0.3, 0, k));
          }
          return a3.set(side * (index >= 3 ? 3.65 : POLE), 0, 0);
        };
        cs1.forEach((m, i) => { m.position.copy(pos1(i ? 1 : -1)); m.visible = !meiosis2 && index <= 4 && !(index === 4 && t > 0.6); });
        if (g1 > 0.01) {
          cs1.forEach((pole, i) => {
            const side = i ? 1 : -1;
            for (const [cy, cz] of polar) { b3.set(-side * 0.5, cy * 1.7, cz * 1.4); a3.copy(pole.position).lerp(b3, g1); segmentInstance(mts, n++, pole.position, a3); }
          });
          // kinetochore microtubules: both sister chromatids of a homologue attach to the SAME pole
          if (index >= 2) {
            const k = index === 2 ? ease(phase(t, 0, 0.3)) : g1;
            cts.forEach((c) => { const pole = cs1[SIDE[c.key]! < 0 ? 0 : 1]!.position; a3.copy(pole).lerp(c.ch.cen.position, k); segmentInstance(mts, n++, pole, a3); });
          }
        }
        putV('spindle', cs1[0]!.position, 1.6, 1.0, 0.8);
        // meiosis II spindles, along y in each daughter cell
        const g2 = index === 5 ? ease(phase(t, 0, 0.5)) : index === 6 ? 1 : index === 7 ? 1 - ease(phase(t, 0, 0.5)) : 0;
        cs2.forEach((m, i) => {
          const cx = (i % 2 ? 1 : -1) * 3.38, sy = i < 2 ? 1 : -1;
          m.position.set(cx, sy * (index === 6 ? lerp(2.5, 2.7, e) : index === 7 ? 2.7 : 2.5), 0);
          m.visible = g2 > 0.02;
        });
        if (g2 > 0.01) {
          cs2.forEach((pole, i) => {
            const cx = (i % 2 ? 1 : -1) * 3.38, sy = i < 2 ? 1 : -1;
            for (const [cy, cz] of polar.slice(0, 6)) { b3.set(cx + cy * 1.4, -sy * 0.4, cz * 1.1); a3.copy(pole.position).lerp(b3, g2); segmentInstance(mts, n++, pole.position, a3); }
          });
          const k = index === 5 ? ease(phase(t, 0.2, 0.5)) : g2;
          cts.forEach((c) => {
            const side = SIDE[c.key]!;
            const pole = cs2[(c.inner ? 2 : 0) + (side > 0 ? 1 : 0)]!.position;
            a3.copy(pole).lerp(c.ch.cen.position, k);
            segmentInstance(mts, n++, pole, a3);
          });
        }
        if (meiosis2) putV('spindle', cs2[0]!.position, 1.1, -0.6, 0.6);
        mts.count = n;
        mts.visible = n > 0;
        mts.instanceMatrix.needsUpdate = true;
      },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
