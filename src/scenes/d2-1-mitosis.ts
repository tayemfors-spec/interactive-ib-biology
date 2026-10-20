import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt } from '../viewer3d/kit';
import { ease, lerp, phase } from '../lib/timeline';
import { chromKit, chromatinThreads, contractileRing, dividingCell, fade, honestRaycast, lerpPose, pose, revealTube, segmentInstance, type Chromatid, type Pose } from './d2-1-kit';

/*
 * Mitosis in an animal cell with 2n = 4: a long and a short homologous pair, one homologue of each
 * pair maternal (red) and one paternal (blue). Steps:
 *   0 interphase (S phase: each chromosome replicated → two sister chromatids joined at a centromere)
 *   1 prophase   2 metaphase   3 anaphase   4 telophase   5 cytokinesis
 * Counts: 4 chromosomes = 8 chromatids until anaphase; then 8 chromosomes, 4 per pole;
 * each daughter nucleus ends with 4 chromosomes (one long + one short of each colour).
 */
const R = 4.2; // cell radius
const NR = 2.3; // nucleus radius
const POLE = 3.5;
const X = new THREE.Vector3(1, 0, 0);
const ORIGIN = new THREE.Vector3();

/** Fraction along the segment p→q at which it first meets a sphere of radius r centred on the origin (1 if it never does). */
function sphereHit(p: THREE.Vector3, q: THREE.Vector3, r: number): number {
  const dx = q.x - p.x, dy = q.y - p.y, dz = q.z - p.z;
  const a = dx * dx + dy * dy + dz * dz;
  const b = 2 * (p.x * dx + p.y * dy + p.z * dz);
  const c = p.x * p.x + p.y * p.y + p.z * p.z - r * r;
  if (a < 1e-9) return 1;
  if (c <= 0) return 0; // start already inside: draw nothing until the envelope has gone
  const disc = b * b - 4 * a * c;
  if (disc < 0) return 1;
  const s = (-b - Math.sqrt(disc)) / (2 * a);
  return s >= 0 && s <= 1 ? s : 1;
}

type Spec = { type: 'L' | 'S'; col: 'm' | 'p'; pro: [number, number, number]; proU: [number, number, number]; y: number; z: number };
// order on the metaphase plate (top to bottom): L-m, S-p, L-p, S-m
const CHROMS: Spec[] = [
  { type: 'L', col: 'm', pro: [-1.0, 0.85, 0.35], proU: [0.45, 1, 0.2], y: 2.31, z: 0.35 },
  { type: 'L', col: 'p', pro: [0.95, 0.75, -0.3], proU: [-0.55, 1, 0.3], y: -1.01, z: 0.35 },
  { type: 'S', col: 'm', pro: [-0.75, -1.05, 0.25], proU: [1, 0.45, 0], y: -2.67, z: -0.35 },
  { type: 'S', col: 'p', pro: [0.95, -0.95, 0.5], proU: [0.3, 1, -0.2], y: 0.65, z: -0.35 },
];
const D = 0.19; // half the distance between sister centromeres
const U_META: [number, number, number] = [0, 1, 0.8];

const scene: SceneModule = {
  camera: { position: [2.4, 3.2, 14.6], target: [0, 0, 0], fov: 40, minDistance: 7, maxDistance: 34 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);

    const mat = {
      m: ctx.material('k', { roughness: 0.45 }),
      p: ctx.material('protein', { roughness: 0.45 }),
      cen: ctx.material('text', { roughness: 0.5 }),
      tm: ctx.material('k', { roughness: 0.5, transparent: true }),
      tp: ctx.material('protein', { roughness: 0.5, transparent: true }),
      dm: ctx.material('k', { roughness: 0.5, transparent: true }),
      dp: ctx.material('protein', { roughness: 0.5, transparent: true }),
      membrane: ctx.material('head', { roughness: 0.6, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
      envelope: ctx.material('neutral', { roughness: 0.6, transparent: true, side: THREE.DoubleSide }),
      envelope2: ctx.material('neutral', { roughness: 0.6, transparent: true, side: THREE.DoubleSide }),
      mt: ctx.material('carb', { roughness: 0.6 }),
      centrosome: ctx.material('glucose', { roughness: 0.4 }),
      ring: ctx.material('protein2', { roughness: 0.5 }),
    };

    // ---------- cell, nucleus, centrosomes ----------
    const cell = dividingCell(ctx, mat.membrane);
    root.add(cell.mesh);
    const nucleus = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(NR, 40, 28)), mat.envelope);
    nucleus.renderOrder = 1;
    root.add(nucleus);
    const newNuclei = [-1, 1].map(() => {
      const m = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(1.25, 32, 20)), mat.envelope2);
      m.renderOrder = 1;
      root.add(m);
      return m;
    });
    const csGeo = ctx.track(new THREE.SphereGeometry(0.24, 14, 10));
    const centrosomes = [0, 1].map(() => { const m = new THREE.Mesh(csGeo, mat.centrosome); root.add(m); return m; });
    const ring = contractileRing(ctx, mat.ring);
    root.add(ring.mesh);

    // ---------- chromatin threads (interphase, and the two daughter nuclei) ----------
    const threads: { geo: THREE.TubeGeometry[]; meshes: THREE.Mesh[] }[] = CHROMS.map((c, i) => {
      const start = new THREE.Vector3(...c.pro);
      const u = new THREE.Vector3(...c.proU).normalize();
      const v = new THREE.Vector3().crossVectors(u, new THREE.Vector3(0, 0, 1)).normalize();
      const geo = chromatinThreads(ctx, 11 + i * 7, start, c.type === 'L' ? 9 : 5, 0.36, NR - 0.25, { v, off: 0.13 });
      const meshes = geo.map((g) => { const m = new THREE.Mesh(g, c.col === 'm' ? mat.tm : mat.tp); root.add(m); return m; });
      return { geo, meshes };
    });
    const interCen = CHROMS.map((c) => { const m = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(0.11, 10, 8)), mat.cen); m.position.set(...c.pro); root.add(m); return m; });
    const daughterThreads = [-1, 1].map((side, di) => {
      const g = new THREE.Group();
      CHROMS.forEach((c, i) => {
        const a = (i / 4) * Math.PI * 2 + di;
        const start = new THREE.Vector3(Math.cos(a) * 0.45, Math.sin(a) * 0.45, (i % 2 ? 0.2 : -0.2));
        const [geo] = chromatinThreads(ctx, 101 + i * 13 + di * 5, start, c.type === 'L' ? 7 : 4, 0.26, 1.0, null, 0.04);
        g.add(new THREE.Mesh(geo!, c.col === 'm' ? mat.dm : mat.dp));
      });
      g.position.x = side * 2.9;
      root.add(g);
      return g;
    });

    // ---------- condensed chromatids: 4 chromosomes × 2 sisters ----------
    const kit = chromKit(ctx, mat.cen);
    const chromatids: { ch: Chromatid; spec: Spec; sis: -1 | 1 }[] = [];
    CHROMS.forEach((spec) => {
      for (const sis of [-1, 1] as const) {
        const ch = kit.make(spec.type, spec.col === 'm' ? mat.m : mat.p);
        root.add(ch.group);
        chromatids.push({ ch, spec, sis });
      }
    });

    // Pose of each chromatid at the END of each step (index = step).
    const poses: Pose[][] = chromatids.map(({ spec, sis }) => {
      const u = new THREE.Vector3(...spec.proU).normalize();
      const v = new THREE.Vector3().crossVectors(u, new THREE.Vector3(0, 0, 1)).normalize();
      const c = new THREE.Vector3(...spec.pro).addScaledVector(v, sis * D);
      const pro = pose([c.x, c.y, c.z], spec.proU, [v.x * sis, v.y * sis, v.z * sis], 0.12);
      const hidden = { ...pro, c: pro.c.clone(), s: 0 };
      const meta = pose([sis * D, spec.y, spec.z], U_META, [sis, 0, 0], 0.07);
      const ana = pose([sis * 2.55, spec.y * 0.72, spec.z * 0.6], U_META, [-sis, 0, 0], 0.85);
      const telo = pose([sis * 2.75, spec.y * 0.5, spec.z * 0.5], U_META, [-sis, 0, 0], 0.5, 0);
      return [hidden, pro, meta, ana, telo, telo];
    });
    const cur = poses.map((p) => ({ ...p[0]!, c: p[0]!.c.clone(), u: p[0]!.u.clone(), w: p[0]!.w.clone() }));

    // ---------- spindle microtubules ----------
    const mtGeo = ctx.track(new THREE.CylinderGeometry(0.03, 0.03, 1, 5));
    const KMT = chromatids.length; // one kinetochore microtubule bundle per chromatid
    const polarTargets: THREE.Vector3[] = [];
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      polarTargets.push(new THREE.Vector3(0, Math.cos(a) * 1.6, Math.sin(a) * 1.4));
    }
    const asterDirs: THREE.Vector3[] = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      asterDirs.push(new THREE.Vector3(0.75, Math.cos(a) * 0.65, Math.sin(a) * 0.65).normalize());
    }
    const mts = new THREE.InstancedMesh(mtGeo, mat.mt, KMT + 2 * polarTargets.length + 2 * asterDirs.length);
    mts.count = 0;
    root.add(mts);
    const a3 = new THREE.Vector3(), b3 = new THREE.Vector3();

    // ---------- anchors (several move with the structures they name) ----------
    const anchors = {
      membrane: { object: anchorAt(root, -1.4, 3.75, 1.2, 'membrane'), highlight: [cell.mesh] },
      nucleus: { object: anchorAt(root, -1.3, -1.5, 1.2, 'nucleus'), highlight: [nucleus] },
      chromatin: { object: anchorAt(root, 0, 0, 0, 'chromatin'), highlight: threads.flatMap((t) => t.meshes) },
      centrosome: { object: anchorAt(root, 0, 0, 0, 'centrosome'), highlight: centrosomes },
      'sister-chromatids': { object: anchorAt(root, 0, 0, 0, 'sister-chromatids'), highlight: [chromatids[0]!.ch.group, chromatids[1]!.ch.group] },
      centromere: { object: anchorAt(root, 0, 0, 0, 'centromere'), highlight: [chromatids[6]!.ch.cen, chromatids[7]!.ch.cen] },
      spindle: { object: anchorAt(root, 0, 0, 0, 'spindle'), highlight: [mts] },
      equator: { object: anchorAt(root, 0, -3.4, 0.4, 'equator'), highlight: [] },
      homologues: { object: anchorAt(root, 0, 0, 0, 'homologues'), highlight: chromatids.filter((c) => c.spec.type === 'L').map((c) => c.ch.group) },
      'daughter-chromosomes': { object: anchorAt(root, 0, 0, 0, 'daughter-chromosomes'), highlight: chromatids.filter((c) => c.sis === -1).map((c) => c.ch.group) },
      'new-nuclei': { object: anchorAt(root, 0, 0, 0, 'new-nuclei'), highlight: newNuclei },
      furrow: { object: anchorAt(root, 0, 0, 0, 'furrow'), highlight: [ring.mesh] },
    };
    const moveAnchor = (id: keyof typeof anchors, p: THREE.Vector3) => anchors[id].object.position.copy(p);

    // furrow depth at the end of each step
    const FURROW = [0, 0, 0, 0.08, 0.45, 0.97];

    honestRaycast(root);
    return {
      anchors,
      durations: [6, 7, 7, 6, 6, 6],
      render(index, t) {
        const e = ease(t);
        const prev = Math.max(0, index - 1);

        // ----- cell surface and contractile ring -----
        const f = index === 0 ? 0 : lerp(FURROW[prev]!, FURROW[index]!, index >= 3 ? ease(phase(t, 0.2, 1)) : e);
        const { s, neck, r } = cell.set(ORIGIN, X, R, f);
        const ringOn = index >= 4 ? (index === 4 ? ease(phase(t, 0.1, 0.5)) : 1) : 0;
        ring.mesh.visible = ringOn > 0.02;
        ring.set(Math.max(0.05, neck - 0.05));
        moveAnchor('furrow', a3.set(0, neck + 0.1, 0.6));
        moveAnchor('membrane', a3.set(-s - r * 0.45, r * 0.83, r * 0.25));

        // ----- nuclear envelope: present in interphase, breaks down in prophase, re-forms in telophase -----
        // (it has gone by t = 0.7 of prophase; spindle microtubules only enter the nuclear region after that)
        const env = index === 0 ? 1 : index === 1 ? 1 - ease(phase(t, 0.4, 0.7)) : 0;
        fade(mat.envelope, env, 0.22);
        nucleus.scale.setScalar(1 + 0.06 * (1 - env));
        const env2 = index === 4 ? ease(phase(t, 0.45, 1)) : index === 5 ? 1 : 0;
        fade(mat.envelope2, env2, 0.3);
        const nx = index === 5 ? lerp(2.9, s, e) : 2.9;
        newNuclei.forEach((n, i) => n.position.set((i ? 1 : -1) * nx, 0, 0));
        daughterThreads.forEach((g, i) => (g.position.x = (i ? 1 : -1) * nx));
        moveAnchor('new-nuclei', a3.set(-nx - 0.5, 1.05, 0.6));

        // ----- chromatin: replicated in interphase (S phase), condenses in prophase -----
        const rep = index === 0 ? ease(phase(t, 0.15, 0.9)) : 1;
        threads.forEach((th) => { revealTube(th.geo[0]!, 1); revealTube(th.geo[1]!, rep); });
        const thr = index === 0 ? 1 : index === 1 ? 1 - ease(phase(t, 0.05, 0.55)) : 0;
        fade(mat.tm, thr); fade(mat.tp, thr);
        interCen.forEach((m) => (m.visible = thr > 0.02));
        moveAnchor('chromatin', a3.set(...CHROMS[0]!.pro).add(new THREE.Vector3(-0.4, 0.5, 0.3)));
        const dth = index === 4 ? ease(phase(t, 0.35, 0.95)) : index === 5 ? 1 : 0;
        fade(mat.dm, dth); fade(mat.dp, dth);

        // ----- condensed chromatids -----
        chromatids.forEach(({ ch }, i) => {
          const P = poses[i]!;
          let k = e;
          if (index === 1) k = ease(phase(t, 0.1, 0.65));
          if (index === 2) k = ease(phase(t, 0.05, 0.75));
          if (index === 4) k = ease(phase(t, 0.15, 0.85));
          if (index === 0) lerpPose(P[0]!, P[0]!, 1, cur[i]);
          else lerpPose(P[prev]!, P[index]!, k, cur[i]);
          kit.place(ch, cur[i]!);
        });
        const c0 = chromatids[0]!.ch, c6 = chromatids[6]!.ch;
        moveAnchor('sister-chromatids', a3.copy(c0.tip).add(new THREE.Vector3(-0.15, 0.2, 0.2)));
        moveAnchor('centromere', a3.copy(c6.cen.position).add(new THREE.Vector3(0.3, 0, 0.2)));
        moveAnchor('homologues', a3.copy(chromatids[3]!.ch.tip).add(new THREE.Vector3(0.25, 0, 0.2)));
        moveAnchor('daughter-chromosomes', a3.copy(chromatids[0]!.ch.cen.position).add(new THREE.Vector3(-0.3, 0.35, 0.3)));

        // ----- centrosomes: duplicated in interphase, move to opposite poles in prophase -----
        const poleOut = index === 3 ? lerp(POLE, 3.7, e) : index >= 4 ? 3.7 : POLE;
        const csPos = (side: number) => {
          if (index === 0) return a3.set(side * (t > 0.5 ? 0.22 * ease(phase(t, 0.5, 0.8)) : 0), NR + 0.45, 0.3);
          if (index === 1) {
            const k = ease(phase(t, 0.1, 0.9));
            const ang = lerp(0.08, Math.PI / 2, k), rad = lerp(NR + 0.45, POLE, k);
            return a3.set(side * rad * Math.sin(ang), rad * Math.cos(ang), lerp(0.3, 0, k));
          }
          const px = index === 4 ? lerp(3.7, 4.5, e) : index === 5 ? nx + 1.6 : poleOut;
          return a3.set(side * px, 0, 0);
        };
        centrosomes.forEach((m, i) => m.position.copy(csPos(i ? 1 : -1)));
        moveAnchor('centrosome', a3.copy(centrosomes[0]!.position).add(new THREE.Vector3(-0.25, 0.3, 0.2)));

        // ----- spindle microtubules -----
        let n = 0;
        // grow in prophase, full in metaphase/anaphase, disassemble in telophase
        const grow = index === 1 ? ease(phase(t, 0.3, 1)) : index === 2 || index === 3 ? 1 : index === 4 ? 1 - ease(phase(t, 0, 0.6)) : 0;
        // while the nuclear envelope is still present, microtubules stop at its surface (they cannot cross it);
        // once it has broken down (prophase t > 0.7) the limit opens so they can reach the chromosomes
        const open = index === 1 ? ease(phase(t, 0.72, 1)) : index >= 2 ? 1 : 0;
        const envR = NR * nucleus.scale.x + 0.06;
        if (grow > 0.01) {
          for (const side of [-1, 1]) {
            const pole = centrosomes[side < 0 ? 0 : 1]!.position;
            for (const tg of polarTargets) {
              b3.set(-side * 0.5, tg.y, tg.z);
              a3.copy(pole).lerp(b3, Math.min(grow, lerp(sphereHit(pole, b3, envR), 1, open)));
              segmentInstance(mts, n++, pole, a3);
            }
            for (const d of asterDirs) {
              a3.copy(pole).addScaledVector(b3.set(side * d.x, d.y, d.z), 0.9 * grow);
              segmentInstance(mts, n++, pole, a3);
            }
          }
        }
        // kinetochore microtubules attach at the start of metaphase and stay attached through anaphase
        const kmt = index === 2 ? ease(phase(t, 0, 0.3)) : index === 3 ? 1 : index === 4 ? 1 - ease(phase(t, 0, 0.4)) : 0;
        if (kmt > 0.01) {
          chromatids.forEach(({ ch, sis }) => {
            const pole = centrosomes[sis < 0 ? 0 : 1]!.position;
            a3.copy(pole).lerp(ch.cen.position, kmt);
            segmentInstance(mts, n++, pole, a3);
          });
        }
        mts.count = n;
        mts.instanceMatrix.needsUpdate = true;
        mts.visible = n > 0;
        moveAnchor('spindle', a3.set(-POLE * 0.55, 1.05, 0.9));
      },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
