import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng, setInstance } from '../viewer3d/kit';
import { tube, vec, type V3 } from './b3-1-kit';

/*
 * B3.1 schematic thorax, seen from the front with the front of the rib cage removed.
 * The person faces +z, so their right side is at −x (the viewer's left).
 * Topology that matters: the trachea is held open by C-shaped cartilage rings whose gap faces the back
 * (oesophagus side); it divides into two bronchi (the right one shorter, wider and more vertical), which
 * branch repeatedly into bronchioles (no cartilage rings) ending in clusters of alveoli. The lungs sit in the
 * thorax above the dome-shaped diaphragm, inside the ribs; intercostal muscles fill the spaces between ribs.
 */

const scene: SceneModule = {
  camera: { position: [4.5, -0.6, 19.5], target: [0, 0.9, 0], fov: 38, minDistance: 6, maxDistance: 36 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(17);
    const DS = THREE.DoubleSide;
    const mAir = ctx.material('head', { roughness: 0.5 });
    const mCart = ctx.material('neutral', { roughness: 0.45 });
    const mBone = ctx.material('neutral', { roughness: 0.6 });
    const mLung = ctx.material('k', { roughness: 0.6, transparent: true, opacity: 0.2, depthWrite: false, side: DS });
    const mMuscle = ctx.material('chol', { roughness: 0.6, transparent: true, opacity: 0.88, side: DS });
    const mDia = ctx.material('chol', { roughness: 0.55, side: DS });
    const mAlv = ctx.material('tail', { roughness: 0.6 });

    // ---------- trachea with C-shaped cartilage rings (open at the back) ----------
    const TR_TOP = 7.2, CARINA = 3.3, TR_Z = 0.6;
    const trachea = new THREE.Mesh(tube(ctx, [vec([0, TR_TOP, TR_Z]), vec([0, CARINA, TR_Z])], 0.42, 24, 16).geo, mAir);
    const ringGeo = ctx.track(new THREE.TorusGeometry(0.47, 0.075, 8, 28, 1.6 * Math.PI));
    ringGeo.rotateZ(-0.3 * Math.PI); // centre the gap on −z after the next rotation
    ringGeo.rotateX(Math.PI / 2);
    const nRings = 10;
    const rings = new THREE.InstancedMesh(ringGeo, mCart, nRings + 6);
    for (let i = 0; i < nRings; i++) setInstance(rings, i, new THREE.Vector3(0, TR_TOP - 0.3 - i * 0.37, TR_Z));
    root.add(trachea);

    // ---------- bronchi (right: shorter, wider, steeper) with cartilage ----------
    const carina = vec([0, CARINA, TR_Z]);
    const rEnd = vec([-1.6, 1.9, 0.3]);
    const lEnd = vec([2.1, 2.35, 0.3]);
    const bronchi = new THREE.Group();
    bronchi.add(new THREE.Mesh(tube(ctx, [carina, carina.clone().lerp(rEnd, 0.5).add(vec([0, 0.05, 0])), rEnd], 0.34, 20, 12).geo, mAir));
    bronchi.add(new THREE.Mesh(tube(ctx, [carina, carina.clone().lerp(lEnd, 0.5).add(vec([0, 0.1, 0])), lEnd], 0.29, 20, 12).geo, mAir));
    root.add(bronchi);
    const q = new THREE.Quaternion();
    const m4 = new THREE.Matrix4();
    let ri = nRings;
    for (const [end, r] of [[rEnd, 0.8], [lEnd, 0.7]] as const) {
      const dir = end.clone().sub(carina).normalize();
      q.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      for (const u of [0.35, 0.6, 0.85]) {
        m4.compose(carina.clone().lerp(end, u), q, new THREE.Vector3(r, r, r));
        rings.setMatrixAt(ri++, m4);
      }
    }
    rings.count = ri;
    root.add(rings);

    // ---------- bronchioles: repeated branching inside each lung, ending in alveoli ----------
    const brGroup = new THREE.Group();
    const tips: THREE.Vector3[] = [];
    // keep every branch inside its lung (ellipsoids matching the lung meshes below)
    const inLung = (p: THREE.Vector3) => {
      const [cx, sx] = p.x < 0 ? [-2.55, 2.25] : [2.6, 2.05];
      return ((p.x - cx) / (sx * 0.88)) ** 2 + ((p.y - 0.7) / (3.4 * 0.88)) ** 2 + (p.z / (2.3 * 0.88)) ** 2 < 1;
    };
    const branch = (start: THREE.Vector3, dir: THREE.Vector3, len0: number, r: number, depth: number) => {
      let len = len0;
      while (len > 0.15 && !inLung(start.clone().addScaledVector(dir, len))) len *= 0.75;
      const end = start.clone().addScaledVector(dir, len);
      const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3((rand() - 0.5) * 0.15, (rand() - 0.5) * 0.15, (rand() - 0.5) * 0.15));
      brGroup.add(new THREE.Mesh(tube(ctx, [start, mid, end], r, 8, 6).geo, mAir));
      if (depth === 0) { tips.push(end); return; }
      for (const s of [-1, 1]) {
        const axis = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).cross(dir).normalize();
        const nd = dir.clone().applyAxisAngle(axis, s * (0.45 + rand() * 0.25)).normalize();
        branch(end, nd, len * 0.72, r * 0.72, depth - 1);
      }
    };
    for (const [end, side] of [[rEnd, -1], [lEnd, 1]] as const) {
      for (const d of [[side * 0.6, 0.8, 0.1], [side, -0.1, 0.15], [side * 0.3, -1, 0.05]] as V3[]) {
        branch(end, vec(d).normalize(), d[1] < -0.5 ? 1.15 : 0.9, 0.17, 3);
      }
    }
    root.add(brGroup);
    const alvGeo = ctx.track(new THREE.SphereGeometry(0.11, 10, 8));
    const alveoli = new THREE.InstancedMesh(alvGeo, mAlv, tips.length * 5);
    let ai = 0;
    for (const t of tips) for (let k = 0; k < 5; k++) setInstance(alveoli, ai++, t.clone().add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.28)));
    alveoli.count = ai;
    root.add(alveoli);

    // ---------- lungs (transparent so the airways show) ----------
    const lungGeo = ctx.track(new THREE.SphereGeometry(1, 40, 28));
    const lungs = new THREE.Group();
    for (const [x, sx] of [[-2.55, 2.25], [2.6, 2.05]] as const) {
      const l = new THREE.Mesh(lungGeo, mLung);
      l.position.set(x, 0.7, 0);
      l.scale.set(sx, 3.4, 2.3);
      lungs.add(l);
    }
    root.add(lungs);

    // ---------- ribs (front part removed), spine, intercostal muscles ----------
    const RIB_Y = [4.3, 3.45, 2.6, 1.75, 0.9, 0.05, -0.8, -1.65, -2.5];
    const RIB_A = [2.4, 3.3, 3.9, 4.3, 4.6, 4.75, 4.8, 4.75, 4.6];
    const ribPoint = (i: number, s: number, side: number) => new THREE.Vector3(side * RIB_A[i]! * Math.sin(s), RIB_Y[i]! - 1.1 * (s / Math.PI), -2.5 * Math.cos(s) - 0.15);
    const S0 = 0.22, S1 = 2.25;
    const ribs = new THREE.Group();
    for (let i = 0; i < RIB_Y.length; i++) {
      for (const side of [-1, 1]) {
        const pts = Array.from({ length: 14 }, (_, k) => ribPoint(i, S0 + ((S1 - S0) * k) / 13, side));
        ribs.add(new THREE.Mesh(tube(ctx, pts, 0.13, 40, 8).geo, mBone));
      }
    }
    const vert = new THREE.InstancedMesh(ctx.track(new THREE.BoxGeometry(0.75, 0.62, 0.7)), mBone, 13);
    for (let i = 0; i < 13; i++) setInstance(vert, i, new THREE.Vector3(0, 4.6 - i * 0.82, -2.75));
    ribs.add(vert);
    root.add(ribs);
    // ribbons of muscle between neighbouring ribs, on the sides of the chest
    const strip = (i: number, side: number) => {
      const n = 16, a = 0.7, b = 2.2;
      const pos: number[] = [], idx: number[] = [];
      for (let k = 0; k <= n; k++) {
        const s = a + ((b - a) * k) / n;
        for (const p of [ribPoint(i, s, side), ribPoint(i + 1, s, side)]) pos.push(p.x * 0.985, p.y, p.z * 0.985);
        if (k < n) { const o = 2 * k; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return ctx.track(g);
    };
    const intercostals = new THREE.Group();
    for (let i = 1; i < RIB_Y.length - 2; i++) for (const side of [-1, 1]) intercostals.add(new THREE.Mesh(strip(i, side), mMuscle));
    root.add(intercostals);

    // ---------- diaphragm: a dome of muscle below the lungs ----------
    const domeGeo = ctx.track(new THREE.SphereGeometry(6, 48, 14, 0, Math.PI * 2, 0, 0.82));
    const diaphragm = new THREE.Mesh(domeGeo, mDia);
    diaphragm.scale.set(1, 0.95, 0.55);
    diaphragm.position.set(0, -2.75 - 6 * 0.95, -0.15);
    root.add(diaphragm);

    const anchors = {
      trachea: { object: anchorAt(root, 0.45, 6.2, TR_Z + 0.3, 'trachea'), highlight: [trachea] },
      cartilage: { object: anchorAt(root, -0.5, 4.9, TR_Z + 0.2, 'cartilage'), highlight: [rings] },
      bronchus: { object: anchorAt(root, 1.2, 2.95, 0.6, 'bronchus'), highlight: [bronchi] },
      bronchiole: { object: anchorAt(root, ...tips[2]!.clone().lerp(rEnd, 0.4).toArray(), 'bronchiole'), highlight: [brGroup] },
      alveoli: { object: anchorAt(root, ...tips[tips.length - 3]!.toArray(), 'alveoli'), highlight: [alveoli] },
      lung: { object: anchorAt(root, -3.2, 2.2, 1.9, 'lung'), highlight: [lungs] },
      ribs: { object: anchorAt(root, ...ribPoint(2, 1.9, 1).toArray(), 'ribs'), highlight: [ribs] },
      intercostals: { object: anchorAt(root, ...ribPoint(4, 1.55, -1).lerp(ribPoint(5, 1.55, -1), 0.5).toArray(), 'intercostals'), highlight: [intercostals] },
      diaphragm: { object: anchorAt(root, 1.6, -3.3, 1.9, 'diaphragm'), highlight: [diaphragm] },
    };
    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
