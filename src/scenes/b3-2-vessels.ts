import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng, setInstance } from '../viewer3d/kit';
import { arrow, bandGeometry, ringEdge } from './b3-2-kit';

/*
 * B3.2 blood vessels: short lengths of an artery, a vein and a capillary, each cut across so the
 * front face (+z) shows the layers of the wall in transverse section.
 * Schematic proportions: the artery and vein are drawn at about the same scale (artery wall thick
 * relative to its lumen, vein wall thin relative to a wide lumen); the capillary is drawn hundreds of
 * times larger than to scale so that its one-cell-thick wall can be seen.
 * The rear parts of the vein and the capillary are cut open lengthways (upper half removed) to show a
 * pocket valve in the vein and red blood cells in single file in the capillary.
 * Blood in the vein flows towards −z (towards the heart): valve cusps attach upstream and their free
 * edges point downstream, so backflow (+z) would fill the pockets and close the valve.
 */
const TAU = Math.PI * 2;

const scene: SceneModule = {
  camera: { position: [3, 16, 16], target: [1.6, -0.6, 0], fov: 38, minDistance: 5, maxDistance: 45 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(32);
    const DS = THREE.DoubleSide;

    const mIntima = ctx.material('head', { roughness: 0.5 });
    const mMuscle = ctx.material('chol', { roughness: 0.6 });
    const mElastic = ctx.material('glucose', { roughness: 0.45 });
    const mExterna = ctx.material('tail', { roughness: 0.75 });
    const mNucleus = ctx.material('protein2', { roughness: 0.5 });
    const mBasement = ctx.material('carb', { roughness: 0.6 });
    const mEndo = ctx.material('head', { roughness: 0.5, side: DS });
    const mValve = ctx.material('protein', { roughness: 0.5, side: DS });
    const mRBC = ctx.material('k', { roughness: 0.45 });
    const mHole = ctx.material('text', { roughness: 0.8 });
    const mArrow = ctx.material('text', { roughness: 0.6 });

    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D) => { const m = new THREE.Mesh(geo, mat); parent.add(m); return m; };

    // ================= ARTERY (x = −5.2) =================
    const A = new THREE.Group();
    A.position.x = -5.2;
    root.add(A);
    const AL = 3, AB = -1.2; // runs from z = −1.2 to +3
    const lumenA = ringEdge(0.95, 1, 1, 0.06, 14);         // corrugated (folded) lining, as seen in micrographs
    const ielA = ringEdge(1.1, 1, 1, 0.06, 14);            // internal elastic lamina follows the folds
    const intima = add(bandGeometry(ctx, lumenA, ielA, AB, AL), mIntima, A);
    // tunica media: smooth muscle layers separated by wavy elastic lamellae
    const mediaR = [1.1, 1.3, 1.36, 1.56, 1.62, 1.82, 1.88, 2.05];
    const media = new THREE.Group();
    const elastic = new THREE.Group();
    A.add(media, elastic);
    for (let k = 0; k < mediaR.length - 1; k++) {
      const wav = (r: number) => (k === 0 && r === 1.1 ? ielA : ringEdge(r, 1, 1, 0.035, 22, k));
      const isElastic = k % 2 === 1;
      add(bandGeometry(ctx, wav(mediaR[k]!), wav(mediaR[k + 1]!), AB, AL), isElastic ? mElastic : mMuscle, isElastic ? elastic : media);
    }
    const externaA = add(bandGeometry(ctx, ringEdge(2.05, 1, 1, 0.035, 22, 6), ringEdge(2.62, 1, 1, 0.05, 9), AB, AL), mExterna, A);
    // smooth muscle nuclei on the cut face, elongated around the circumference (circular muscle)
    const nucGeo = ctx.track(new THREE.SphereGeometry(1, 10, 8));
    const muscleNuclei = new THREE.InstancedMesh(nucGeo, mNucleus, 70);
    let ni = 0;
    for (const [r0, r1] of [[1.1, 1.3], [1.36, 1.56], [1.62, 1.82], [1.88, 2.05]] as const) {
      const count = Math.round(13 + r0 * 3);
      for (let i = 0; i < count && ni < 70; i++) {
        const a = (i / count) * TAU + rand() * 0.3;
        const r = (r0 + r1) / 2 + (rand() - 0.5) * 0.04;
        setInstance(muscleNuclei, ni++, new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), AL + 0.005), new THREE.Euler(0, 0, a + Math.PI / 2), 1);
        const m = new THREE.Matrix4();
        muscleNuclei.getMatrixAt(ni - 1, m);
        m.multiply(new THREE.Matrix4().makeScale(0.17, 0.035, 0.02));
        muscleNuclei.setMatrixAt(ni - 1, m);
      }
    }
    muscleNuclei.count = ni;
    A.add(muscleNuclei);

    // ================= VEIN (x = +1.4) =================
    const V = new THREE.Group();
    V.position.x = 1.4;
    root.add(V);
    const VL = 3, cutZ = 2.4; // front (z 2.4…3) is a whole ring; behind that the upper half is removed
    const ex = 1, ey = 0.8; // slightly flattened, as veins often are in sections
    const vR = [1.75, 1.82, 1.92, 1.96, 2.04, 2.4];
    const vMat = [mIntima, mMuscle, mElastic, mMuscle, mExterna];
    const vWall = new THREE.Group(), vIntima = new THREE.Group(), vMedia = new THREE.Group(), vExterna = new THREE.Group();
    V.add(vWall);
    vWall.add(vIntima, vMedia, vExterna);
    const vGroup = [vIntima, vMedia, vMedia, vMedia, vExterna];
    for (let k = 0; k < vR.length - 1; k++) {
      const inner = ringEdge(vR[k]!, ex, ey, k === 0 ? 0.02 : 0, 10);
      const outer = ringEdge(vR[k + 1]!, ex, ey, 0, 10);
      add(bandGeometry(ctx, inner, outer, cutZ, VL), vMat[k]!, vGroup[k]!);
      add(bandGeometry(ctx, inner, outer, -VL, cutZ, Math.PI, TAU, 70), vMat[k]!, vGroup[k]!);
    }
    // pocket valve: two cusps, attached upstream (z0) along a U-shaped line, free edges downstream (z1)
    const valve = new THREE.Group();
    V.add(valve);
    const z0 = -0.15, z1 = -1.55, rl = 1.74, gap = 0.18;
    for (const side of [1, -1]) {
      const pos: number[] = [];
      const idx: number[] = [];
      const nu = 14, nv = 22;
      for (let i = 0; i <= nu; i++) {
        const u = i / nu;
        for (let j = 0; j <= nv; j++) {
          // lower half only (y ≤ 0): θ from −π/2 to 0 on the +x side, π to 3π/2 on the −x side
          const th = side === 1 ? -Math.PI / 2 + (Math.PI / 2) * (j / nv) : Math.PI + (Math.PI / 2) * (j / nv);
          const W = new THREE.Vector3(rl * Math.cos(th) * ex, rl * Math.sin(th) * ey, z0 - (z0 - z1) * 0.85 * Math.abs(Math.sin(th)));
          const E = new THREE.Vector3(side * gap, rl * Math.sin(th) * ey * 0.97, z1);
          // bow the cusp towards the wall a little so it reads as a pocket
          const p = W.clone().lerp(E, u);
          const bow = Math.sin(Math.PI * u) * 0.28;
          p.x += side * bow * Math.abs(Math.cos(th));
          pos.push(p.x, p.y, p.z);
        }
      }
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
        const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      add(ctx.track(g), mValve, valve);
    }
    // flow towards the heart (−z), past the open valve
    const flow = arrow(ctx, mArrow, new THREE.Vector3(0, -0.55, 0.3), new THREE.Vector3(0, 0, -1), 2.6, 0.07);
    V.add(flow);

    // ================= CAPILLARY (x = +6.1) =================
    const C = new THREE.Group();
    C.position.set(6.1, -0.6, 0);
    root.add(C);
    const CL = 2.6, cCut = 2.0;
    const rLum = 0.44, rEndo = 0.53, rBase = 0.565;
    // two endothelial cells around the circumference; a narrow pore (intercellular gap) at one junction
    const j1 = Math.PI * 0.62, j2 = Math.PI * 1.62, pore = 0.07;
    const cells = new THREE.Group();
    C.add(cells);
    const lumE = ringEdge(rLum), endE = ringEdge(rEndo);
    add(bandGeometry(ctx, lumE, endE, cCut, CL, j1 + pore, j2, 60), mEndo, cells);
    add(bandGeometry(ctx, lumE, endE, cCut, CL, j2, j1 + TAU - pore, 60), mEndo, cells);
    add(bandGeometry(ctx, lumE, endE, -CL, cCut, Math.PI, TAU, 60), mEndo, cells);
    const basement = new THREE.Group();
    C.add(basement);
    add(bandGeometry(ctx, endE, ringEdge(rBase), cCut, CL, 0, TAU, 80), mBasement, basement);
    add(bandGeometry(ctx, endE, ringEdge(rBase), -CL, cCut, Math.PI, TAU, 50), mBasement, basement);
    // endothelial nucleus bulging slightly into the lumen (seen in the opened half)
    const cNuc = new THREE.Mesh(nucGeo, mNucleus);
    cNuc.position.set(0.12, -rLum + 0.02, -1.95);
    cNuc.scale.set(0.16, 0.06, 0.34);
    C.add(cNuc);
    // fenestrations: small pores through the endothelial cells (seen on the inner surface)
    const fen = new THREE.InstancedMesh(ctx.track(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 12)), mHole, 16);
    let fi = 0;
    for (const z of [-0.2, -0.65, -1.1]) for (const a of [1.3, 1.42, 1.58, 1.7]) {
      const th = a * Math.PI + (rand() - 0.5) * 0.05;
      const p = new THREE.Vector3((rLum - 0.004) * Math.cos(th), (rLum - 0.004) * Math.sin(th), z + (rand() - 0.5) * 0.15);
      const o = new THREE.Object3D();
      o.position.copy(p);
      o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().setZ(0).normalize());
      o.updateMatrix();
      fen.setMatrixAt(fi++, o.matrix);
    }
    fen.count = fi;
    C.add(fen);
    // red blood cells (biconcave discs) in single file
    const rbcProfile: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const s = i / 16;
      const r = 0.36 * s;
      // biconcave: thin in the centre, thickest near the rim, closing to the rim edge
      const half = Math.sqrt(Math.max(0, 1 - s * s)) * (0.05 + 0.2 * s * s);
      rbcProfile.push(new THREE.Vector2(Math.max(0.001, r), half));
    }
    const top = rbcProfile.slice().reverse().map((v) => new THREE.Vector2(v.x, -v.y));
    const rbcGeo = ctx.track(new THREE.LatheGeometry([...top, ...rbcProfile], 28));
    rbcGeo.rotateX(Math.PI / 2);
    const rbcs = new THREE.InstancedMesh(rbcGeo, mRBC, 4);
    [2.1, 0.35, -0.55, -1.45].forEach((z, i) => setInstance(rbcs, i, new THREE.Vector3(0, 0, z), new THREE.Euler(0.12 * (i - 1.5), 0.1 * i, 0)));
    C.add(rbcs);

    // ---------- anchors ----------
    const face = (g: THREE.Group, r: number, a: number, z: number, ex2 = 1, ey2 = 1) =>
      [g.position.x + r * Math.cos(a) * ex2, g.position.y + r * Math.sin(a) * ey2, z] as const;
    const anchors = {
      'a-externa': { object: anchorAt(root, ...face(A, 2.4, 2.3, AL + 0.01), 'a-externa'), highlight: [externaA] },
      'a-media': { object: anchorAt(root, ...face(A, 1.45, 3.75, AL + 0.01), 'a-media'), highlight: [media] },
      elastic: { object: anchorAt(root, ...face(A, 1.85, 0.75, AL + 0.01), 'elastic'), highlight: [elastic] },
      muscle: { object: anchorAt(root, ...face(A, 1.72, 5.3, AL + 0.02), 'muscle'), highlight: [muscleNuclei] },
      'a-intima': { object: anchorAt(root, ...face(A, 1.02, 1.6, AL + 0.01), 'a-intima'), highlight: [intima] },
      'a-lumen': { object: anchorAt(root, A.position.x - 0.15, -0.1, AL + 0.01, 'a-lumen'), highlight: [intima] },
      'v-wall': { object: anchorAt(root, ...face(V, 2.15, 1.2, VL + 0.01, ex, ey), 'v-wall'), highlight: [vMedia, vExterna] },
      'v-lumen': { object: anchorAt(root, V.position.x - 0.5, 0.35, VL + 0.01, 'v-lumen'), highlight: [vIntima] },
      valve: { object: anchorAt(root, V.position.x + 0.7, -0.9, -0.9, 'valve'), highlight: [valve] },
      'c-wall': { object: anchorAt(root, ...face(C, rEndo - 0.04, 2.4, CL + 0.01), 'c-wall'), highlight: [cells] },
      pore: { object: anchorAt(root, ...face(C, rEndo - 0.02, j1 + pore / 2, CL + 0.01), 'pore'), highlight: [cells] },
      basement: { object: anchorAt(root, ...face(C, rBase, 5.6, CL - 0.6), 'basement'), highlight: [basement] },
      fenestration: { object: anchorAt(root, C.position.x + 0.05, C.position.y - rLum + 0.03, -0.65, 'fenestration'), highlight: [fen] },
      rbc: { object: anchorAt(root, C.position.x, C.position.y + 0.2, -0.55, 'rbc'), highlight: [rbcs] },
    };
    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
