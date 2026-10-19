import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng } from '../viewer3d/kit';
import { DS, type P2, arc, dnaLoop, inPoly, instanced, join, lathe, line, lollipops, planeFill, planeTube, scatter } from './b2-2-kit';

/*
 * B2.2 mitochondrion (AHL), cut lengthways by the plane z = 0; long axis along x.
 * Schematic: the organelle is ≈ 11 units long (≈ 3 µm), so the intermembrane space (really ≈ 10–20 nm),
 * the proteins and the 70S ribosomes are drawn far larger than they are, to be visible.
 *
 * Topology that matters:
 *  - two membranes: a smooth outer membrane and an inner membrane folded into cristae;
 *  - the intermembrane space is continuous with the space inside each crista (the cut face shows both
 *    in the same colour), and it is small, so pumped protons reach a high concentration there;
 *  - ATP synthase sits in the inner membrane with its head projecting into the matrix (on both faces of
 *    each crista, since both face the matrix); electron transport chain proteins are in the same membrane;
 *  - the matrix holds the link reaction and Krebs cycle enzymes, 70S ribosomes and circular DNA.
 */
const L = 11, R = 2.3, GAP = 0.38;
const RI = R - GAP;
const S = L / 2 - R; // half-length of the straight (cylindrical) part, the same for both membranes
const NC = 8, T = 0.26, H = RI * 1.05; // number of cristae, thickness of each fold, how far each reaches in
const TIP = RI - H; // y of a top crista's tip (bottom cristae mirror this)
const crista = (i: number) => ({ x: -S + ((i + 0.5) / NC) * 2 * S, top: i % 2 === 0 });

const seg = (a: P2, b: P2) => line(a, b, Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.12)));

/** The outline of a capsule of radius r (straight part ±S) in the cut plane, as a closed loop. */
const capsule = (r: number): P2[] => join(seg([-S, r], [S, r]), arc(S, 0, r, Math.PI / 2, -Math.PI / 2, 24), seg([S, -r], [-S, -r]), arc(-S, 0, r, -Math.PI / 2, -Math.PI * 1.5, 24)).slice(0, -1);

/** The inner membrane in the cut plane: the capsule outline running into and out of every crista. */
function innerOutline(): P2[] {
  const parts: P2[][] = [];
  let x0 = -S;
  for (let i = 0; i < NC; i += 2) {
    const { x } = crista(i);
    parts.push(seg([x0, RI], [x - T / 2, RI]), seg([x - T / 2, RI], [x - T / 2, TIP + T / 2]), arc(x, TIP + T / 2, T / 2, Math.PI, Math.PI * 2, 8), seg([x + T / 2, TIP + T / 2], [x + T / 2, RI]));
    x0 = x + T / 2;
  }
  parts.push(seg([x0, RI], [S, RI]), arc(S, 0, RI, Math.PI / 2, -Math.PI / 2, 24));
  x0 = S;
  for (let i = NC - 1; i >= 0; i -= 2) {
    const { x } = crista(i);
    parts.push(seg([x0, -RI], [x + T / 2, -RI]), seg([x + T / 2, -RI], [x + T / 2, -TIP - T / 2]), arc(x, -TIP - T / 2, T / 2, 0, Math.PI, 8), seg([x - T / 2, -TIP - T / 2], [x - T / 2, -RI]));
    x0 = x - T / 2;
  }
  parts.push(seg([x0, -RI], [-S, -RI]), arc(-S, 0, RI, -Math.PI / 2, -Math.PI * 1.5, 24));
  return join(...parts).slice(0, -1);
}

/** Lathe profile (radius, height) of a capsule standing on the y axis. */
function capsuleProfile(r: number): P2[] {
  return join(arc(0, -S, r, -Math.PI / 2, 0, 14).map(([a, b]) => [a, b] as P2), seg([r, -S], [r, S]), arc(0, S, r, 0, Math.PI / 2, 14)).map(([a, b]) => [Math.max(1e-4, a), b] as P2);
}

const scene: SceneModule = {
  camera: { position: [0.5, 3.6, 12.6], target: [0, -0.25, -0.8], fov: 38, minDistance: 5, maxDistance: 36 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(53);

    const mOuter = ctx.material('head', { roughness: 0.5, side: DS });
    const mInner = ctx.material('head', { roughness: 0.45, metalness: 0.25, side: DS });
    const mRim = ctx.material('head', { roughness: 0.35, metalness: 0.6 });
    const mIMS = ctx.material('water', { roughness: 0.6, side: DS });
    const mH = ctx.material('glucose', { roughness: 0.35 });
    const mATPase = ctx.material('protein', { roughness: 0.4 });
    const mStalk = ctx.material('protein', { roughness: 0.6 });
    const mETC = ctx.material('k', { roughness: 0.5 });
    const mEnz = ctx.material('neutral', { roughness: 0.6 });
    const mRibo = ctx.material('text', { roughness: 0.55 });
    const mDNA = ctx.material('na', { roughness: 0.45 });

    // ---------- membranes (back halves) ----------
    const toX = (g: THREE.BufferGeometry) => g.rotateZ(-Math.PI / 2);
    const outer = new THREE.Group();
    outer.add(new THREE.Mesh(toX(lathe(ctx, capsuleProfile(R), Math.PI / 2, Math.PI * 1.5, 48)), mOuter));
    const inner = new THREE.Group();
    inner.add(new THREE.Mesh(toX(lathe(ctx, capsuleProfile(RI), Math.PI / 2, Math.PI * 1.5, 48)), mInner));

    // cristae: folds of the inner membrane that reach into the matrix, alternating from top and bottom
    const cristae = new THREE.Group();
    const a1 = Math.PI - Math.asin(TIP / RI);
    for (let i = 0; i < NC; i++) {
      const { x, top } = crista(i);
      const s = new THREE.Shape();
      s.moveTo(0, TIP);
      s.lineTo(0, RI);
      s.absarc(0, 0, RI, Math.PI / 2, a1, false);
      s.lineTo(0, TIP);
      const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 14 });
      // shape (sx, sy, depth) → world (x ± depth, ±y, z = sx); the sign keeps the mapping a rotation (det +1)
      const k = top ? -1 : 1;
      g.applyMatrix4(new THREE.Matrix4().set(0, 0, k, x - (k * T) / 2, 0, -k, 0, 0, 1, 0, 0, -0.002, 0, 0, 0, 1));
      cristae.add(new THREE.Mesh(ctx.track(g), mInner));
    }
    inner.add(cristae);
    root.add(outer, inner);

    // ---------- the cut face: two membranes with the (small) intermembrane space between them ----------
    const outerLine = capsule(R);
    const innerLine = innerOutline();
    const ims = new THREE.Mesh(planeFill(ctx, outerLine, [innerLine], 0.004), mIMS);
    const rimOuter = new THREE.Mesh(planeTube(ctx, outerLine, 0.055, true), mRim);
    const rimInner = new THREE.Mesh(planeTube(ctx, innerLine, 0.05, true), mRim);
    root.add(ims, rimOuter, rimInner);

    // protons: crowded in the intermembrane space, few in the matrix
    const inIMS = (p: THREE.Vector3) => inPoly(p.x, p.y, outerLine) && !inPoly(p.x, p.y, innerLine);
    const hIMS = scatter(rand, 90, [new THREE.Vector3(-L / 2, -R, 0.03), new THREE.Vector3(L / 2, R, 0.03)], (p) => {
      if (!inIMS(p)) return false;
      // keep clear of the membrane lines themselves
      return [...outerLine, ...innerLine].every(([x, y]) => Math.hypot(x - p.x, y - p.y) > 0.11);
    }, 0.16);
    const plates = (p: THREE.Vector3, pad: number) => Array.from({ length: NC }, (_, i) => crista(i)).some(({ x, top }) => Math.abs(p.x - x) < T / 2 + pad && (top ? p.y > TIP - pad : p.y < -TIP + pad));
    const inMatrix = (p: THREE.Vector3, pad: number) => {
      const dx = Math.max(0, Math.abs(p.x) - S);
      return dx * dx + p.y * p.y + p.z * p.z < (RI - pad) ** 2 && !plates(p, pad);
    };
    const hMatrix = scatter(rand, 7, [new THREE.Vector3(-S - 1, -1.2, -1.2), new THREE.Vector3(S + 1, 1.2, -0.4)], (p) => inMatrix(p, 0.25), 0.8);
    const hGeo = ctx.track(new THREE.SphereGeometry(0.065, 8, 6));
    const protons = new THREE.Group();
    protons.add(instanced(hGeo, mH, hIMS), instanced(hGeo, mH, hMatrix));
    root.add(protons);

    // ---------- proteins of the inner membrane ----------
    const items: { at: THREE.Vector3; dir: THREE.Vector3 }[] = [];
    const etcPts: THREE.Vector3[] = [];
    for (let i = 0; i < NC; i++) {
      const { x, top } = crista(i);
      for (const side of [-1, 1]) {
        for (let k = 0, tries = 0; k < 8 && tries < 200; tries++) {
          const y = TIP + 0.2 + rand() * (RI - TIP - 0.45);
          const zMin = -Math.sqrt(Math.max(0, RI * RI - y * y)) + 0.22;
          if (zMin > -0.25) continue;
          const z = zMin + rand() * (-0.14 - zMin);
          const at = new THREE.Vector3(x + side * (T / 2), top ? y : -y, z);
          if ([...items.map((it) => it.at), ...etcPts].some((q) => q.distanceTo(at) < 0.3)) continue;
          if (k % 3 === 2) etcPts.push(at.clone().add(new THREE.Vector3(side * 0.03, 0, 0)));
          else items.push({ at, dir: new THREE.Vector3(side, 0, 0) });
          k++;
        }
      }
    }
    // on the inner boundary membrane too, heads pointing into the matrix
    for (let k = 0, tries = 0; k < 34 && tries < 600; tries++) {
      const x = -S + rand() * 2 * S;
      if (Array.from({ length: NC }, (_, i) => crista(i)).some((c) => Math.abs(c.x - x) < T / 2 + 0.2)) continue;
      const b = Math.PI + 0.25 + rand() * (Math.PI - 0.5);
      const n = new THREE.Vector3(0, Math.cos(b), Math.sin(b));
      items.push({ at: new THREE.Vector3(x, n.y * RI, n.z * RI), dir: n.clone().negate() });
      k++;
    }
    const atp = lollipops(ctx, items, mATPase, mStalk, 0.8);
    const etc = instanced(ctx.track(new THREE.SphereGeometry(0.12, 10, 8).scale(0.7, 1, 1)), mETC, etcPts);
    root.add(atp.group, etc);

    // ---------- the matrix: Krebs cycle enzymes, 70S ribosomes and circular DNA ----------
    const box: [THREE.Vector3, THREE.Vector3] = [new THREE.Vector3(-L / 2, -RI, -RI), new THREE.Vector3(L / 2, RI, -0.12)];
    const enzPts = scatter(rand, 300, box, (p) => inMatrix(p, 0.12), 0.12);
    const enzymes = instanced(ctx.track(new THREE.IcosahedronGeometry(0.04, 0)), mEnz, enzPts);
    const riboPts = scatter(rand, 26, box, (p) => inMatrix(p, 0.2) && p.z < -0.3, 0.45);
    const ribosomes = instanced(ctx.track(new THREE.SphereGeometry(0.085, 10, 8)), mRibo, riboPts);
    const dna = new THREE.Group();
    for (const [x, y, z, seed] of [[-4.35, 0.25, -0.9, 3], [4.4, -0.35, -1.0, 8]] as const) {
      const loop = new THREE.Mesh(dnaLoop(ctx, 0.36, 0.032, seed), mDNA);
      loop.position.set(x, y, z);
      dna.add(loop);
    }
    root.add(enzymes, ribosomes, dna);

    // ---------- anchors ----------
    const nearest = (pts: THREE.Vector3[], t: THREE.Vector3) => pts.reduce((b, p) => (p.distanceTo(t) < b.distanceTo(t) ? p : b), pts[0]!);
    const hP = nearest(hIMS, new THREE.Vector3(2.2, -2.15, 0));
    const atpP = nearest(items.map((it) => it.at.clone().addScaledVector(it.dir, 0.2)), new THREE.Vector3(1.2, -0.8, -0.2));
    const etcP = nearest(etcPts, new THREE.Vector3(-1.2, 0.9, -0.3));
    const riboP = nearest(riboPts, new THREE.Vector3(-0.2, -0.5, -0.6));
    const top0 = crista(4);
    const anchors = {
      outer: { object: anchorAt(root, -1.0, R, 0.06, 'outer'), highlight: [outer, rimOuter] },
      inner: { object: anchorAt(root, -1.4, -RI, 0.06, 'inner'), highlight: [inner, rimInner] },
      cristae: { object: anchorAt(root, top0.x, TIP + 0.25, 0.06, 'cristae'), highlight: [cristae] },
      ims: { object: anchorAt(root, -S - (R + RI) / 2, 0, 0.06, 'ims'), highlight: [ims] },
      protons: { object: anchorAt(root, hP.x, hP.y, hP.z + 0.03, 'protons'), highlight: [protons] },
      matrix: { object: anchorAt(root, -3.6, 0.7, -1.0, 'matrix'), highlight: [enzymes] },
      'atp-synthase': { object: anchorAt(root, atpP.x, atpP.y, atpP.z, 'atp-synthase'), highlight: [atp.group] },
      etc: { object: anchorAt(root, etcP.x, etcP.y, etcP.z, 'etc'), highlight: [etc] },
      ribosomes: { object: anchorAt(root, riboP.x, riboP.y, riboP.z, 'ribosomes'), highlight: [ribosomes] },
      dna: { object: anchorAt(root, 4.4, -0.35, -0.7, 'dna'), highlight: [dna] },
    };
    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
