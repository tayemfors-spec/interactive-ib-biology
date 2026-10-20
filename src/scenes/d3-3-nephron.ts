import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng } from '../viewer3d/kit';
import { ease, phase } from '../lib/timeline';
import { curve, flowAlong, joint, placeAt, tube, windAround, type V3 } from './d3-3-kit';

/*
 * D3.3.7–D3.3.10 (AHL): one nephron with its blood supply, schematic but topologically correct.
 *
 * ORIENTATION: y is up. The cortex is the region y > 1 (top), the medulla y < 1 (below), shown by a
 * backdrop whose grey deepens towards the bottom: the solute concentration of medullary tissue fluid
 * rises towards the inner medulla. The outer surface of the kidney is above the model; the renal
 * pelvis is below it.
 *
 * Topology that matters:
 * - In the cortex: renal corpuscle (glomerulus inside Bowman's capsule), proximal convoluted tubule,
 *   distal convoluted tubule. In the medulla: the loop of Henle and most of the collecting duct.
 * - Blood: afferent arteriole (wider) → glomerulus → efferent arteriole (narrower) → peritubular
 *   capillaries round the convoluted tubules and the vasa recta beside the loop → venules.
 * - Filtrate: Bowman's capsule → PCT → descending limb → hairpin → ascending limb → DCT, which passes
 *   back close to its own corpuscle → collecting duct, which runs down through the medulla to the pelvis.
 * Enlarged insets (shown only in their step): the filtration barrier — fenestrated capillary
 * endothelium, basement membrane, podocyte foot processes with slits; and a PCT cross-section with
 * microvilli facing the lumen and mitochondria near the base of the cells.
 */

const C = new THREE.Vector3(-2.2, 4.6, 0); // centre of the renal corpuscle
const CAPSULE_R = 1.15;

const scene: SceneModule = {
  camera: { position: [1.6, 0.2, 24.5], target: [0.8, -0.7, 0], fov: 38, minDistance: 8, maxDistance: 55 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const DS = THREE.DoubleSide;
    const mCapsule = ctx.material('tail', { roughness: 0.6, side: DS, transparent: true, opacity: 0.85 });
    const mPCT = ctx.material('head', { roughness: 0.55 });
    const mDesc = ctx.material('water', { roughness: 0.5 });
    const mAsc = ctx.material('na', { roughness: 0.5 });
    const mDCT = ctx.material('carb', { roughness: 0.55 });
    const mCD = ctx.material('glucose', { roughness: 0.55 });
    const mArt = ctx.material('k', { roughness: 0.45 });
    const mCap = ctx.material('chol', { roughness: 0.5 });
    const mVen = ctx.material('protein', { roughness: 0.5 });
    const mCortex = ctx.material('tail', { roughness: 1, transparent: true, opacity: 0.22, depthWrite: false });
    const mMed = [0.12, 0.2, 0.3, 0.4, 0.52].map((op) => ctx.material('neutral', { roughness: 1, transparent: true, opacity: op, depthWrite: false }));

    // ---------- backdrop: cortex above, medulla below (darker = higher solute concentration) ----------
    const back = new THREE.Group();
    root.add(back);
    const plane = (w: number, h: number) => ctx.track(new THREE.PlaneGeometry(w, h));
    const cortex = new THREE.Mesh(plane(17.5, 6.4), mCortex);
    cortex.position.set(0.9, 4.2, -1.6);
    back.add(cortex);
    const medulla = new THREE.Group();
    back.add(medulla);
    mMed.forEach((m, i) => { const b = new THREE.Mesh(plane(17.5, 2), m); b.position.set(0.9, 0 - i * 2, -1.6); medulla.add(b); });

    // ---------- renal corpuscle ----------
    const corpuscle = new THREE.Group();
    root.add(corpuscle);
    // Bowman's capsule: a cup, cut open towards the viewer, with an opening at the top (vascular pole)
    const capsule = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(CAPSULE_R, 40, 28, Math.PI * 0.8, Math.PI * 1.4, 0.42, Math.PI - 0.42)), mCapsule);
    capsule.position.copy(C);
    corpuscle.add(capsule);
    const rand = rng(33);
    const knotPts: V3[] = [[-2.0, 5.6, 0.1]];
    for (let i = 0; i < 16; i++) {
      const a = rand() * Math.PI * 2, b = Math.acos(2 * rand() - 1), r = 0.35 + 0.4 * rand();
      knotPts.push([C.x + r * Math.sin(b) * Math.cos(a), C.y + r * Math.cos(b) * 0.9, C.z + r * Math.sin(b) * Math.sin(a)]);
    }
    knotPts.push([-2.45, 5.6, -0.05]);
    const glomC = curve(knotPts);
    const glomerulus = tube(ctx, corpuscle, glomC, 0.11, mArt, 260, 10);

    // ---------- blood vessels ----------
    const vessels = new THREE.Group();
    root.add(vessels);
    const affC = curve([[0.8, 7.4, 0], [-0.4, 6.9, 0], [-1.4, 6.3, 0.05], [-2.0, 5.6, 0.1]]);
    const afferent = tube(ctx, vessels, affC, 0.24, mArt, 60);
    const effC = curve([[-2.45, 5.6, -0.05], [-3.0, 6.3, 0], [-3.9, 6.75, 0], [-4.9, 6.6, 0]]);
    const efferent = tube(ctx, vessels, effC, 0.13, mArt, 60);

    // ---------- tubule ----------
    const tubule = new THREE.Group();
    root.add(tubule);
    const pctC = curve([[-2.2, 3.45, 0], [-2.9, 3.0, 0.5], [-3.9, 3.5, 0.7], [-4.6, 4.5, 0.3], [-4.1, 5.4, -0.4], [-5.0, 6.0, 0.1], [-5.9, 5.1, 0.5], [-5.5, 3.9, 0.2], [-6.0, 2.8, -0.2], [-5.0, 2.05, 0.3], [-3.9, 1.9, 0], [-3.4, 1.2, 0]]);
    const pct = tube(ctx, tubule, pctC, 0.32, mPCT, 200);
    const descC = curve([[-3.4, 1.2, 0], [-3.4, -2.5, 0], [-3.4, -6.6, 0], [-3.3, -7.45, 0]]);
    const bendC = curve([[-3.3, -7.45, 0], [-2.5, -8.15, 0], [-1.7, -7.45, 0]]);
    const ascC = curve([[-1.7, -7.45, 0], [-1.6, -6.6, 0], [-1.6, -2.5, 0], [-1.6, 1.4, 0], [-1.5, 2.3, 0]]);
    const desc = tube(ctx, tubule, descC, 0.17, mDesc, 80);
    const bend = tube(ctx, tubule, bendC, 0.17, mDesc, 40);
    const asc = tube(ctx, tubule, ascC, 0.25, mAsc, 80);
    joint(ctx, tubule, new THREE.Vector3(-3.4, 1.2, 0), 0.3, mPCT);
    joint(ctx, tubule, new THREE.Vector3(-1.7, -7.45, 0), 0.24, mAsc);
    const dctC = curve([[-1.5, 2.3, 0], [-0.7, 3.0, 0.45], [-0.75, 4.3, -0.2], [-0.15, 5.15, 0.35], [0.9, 4.6, 0], [0.55, 3.4, 0.45], [1.4, 2.6, 0], [2.4, 3.1, -0.2], [3.25, 3.7, 0]]);
    const dct = tube(ctx, tubule, dctC, 0.27, mDCT, 160);
    joint(ctx, tubule, new THREE.Vector3(-1.5, 2.3, 0), 0.25, mAsc);
    const cdC = curve([[3.6, 7.2, 0], [3.6, 3.7, 0], [3.6, -2.0, 0], [3.65, -8.0, 0], [3.7, -8.9, 0]]);
    const cd = tube(ctx, tubule, cdC, 0.36, mCD, 100);
    // a second nephron's connecting tubule joining the duct higher up (collecting ducts are shared)
    tube(ctx, tubule, curve([[5.0, 6.9, 0.2], [4.4, 6.4, 0.1], [3.6, 6.0, 0]]), 0.2, mDCT, 30);

    // peritubular capillaries round the PCT and DCT, fed by the efferent arteriole, draining to a venule
    const ptc = new THREE.Group();
    root.add(ptc);
    const ptcCurves = [windAround(pctC, 0.48, 4, 0, 0, 0.95), windAround(pctC, 0.48, 4, Math.PI, 0.05, 0.95), windAround(dctC, 0.44, 3, 0.6)];
    for (const c of ptcCurves) tube(ctx, ptc, c, 0.06, mCap, 400, 6);
    const effToPtc = curve([[-4.9, 6.6, 0], [-5.6, 6.4, 0.2], ptcCurves[0]!.getPointAt(0.35).toArray() as V3]);
    tube(ctx, ptc, effToPtc, 0.08, mCap, 40, 6);
    const venC = curve([[3.0, 3.9, 0.42], [2.7, 5.2, 0.5], [2.5, 6.5, 0.5], [2.5, 7.5, 0.5]]);
    const venule = tube(ctx, ptc, venC, 0.16, mVen, 40);
    // vasa recta: a hairpin of capillaries beside the loop of Henle (behind it)
    const vasaC = curve([[-3.0, 1.5, -0.75], [-3.0, -3.0, -0.75], [-2.95, -6.7, -0.75], [-2.5, -7.35, -0.75], [-2.05, -6.7, -0.75], [-2.0, -3.0, -0.75], [-2.0, 1.5, -0.75]]);
    const vasa = tube(ctx, root, vasaC, 0.09, mCap, 160, 8);

    // ---------- inset 1: filtration barrier (enlarged), at the right ----------
    const I1 = new THREE.Vector3(5.9, 4.4, 0.4);
    const inset1 = new THREE.Group();
    inset1.position.copy(I1);
    inset1.scale.setScalar(1.3);
    root.add(inset1);
    const endo = new THREE.Group();
    inset1.add(endo);
    const mEndo = ctx.material('k', { roughness: 0.6 });
    const pieceGeo = ctx.track(new THREE.BoxGeometry(0.42, 0.2, 1.2));
    for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(pieceGeo, mEndo); p.position.set(-1.12 + i * 0.56, -0.55, 0); endo.add(p); } // gaps = fenestrations
    const basement = new THREE.Mesh(ctx.track(new THREE.BoxGeometry(2.8, 0.16, 1.2)), ctx.material('protein2', { roughness: 0.7 }));
    basement.position.set(0, -0.32, 0);
    inset1.add(basement);
    const podo = new THREE.Group();
    inset1.add(podo);
    const mPodo = ctx.material('tail', { roughness: 0.55 });
    const footGeo = ctx.track(new THREE.BoxGeometry(0.17, 0.24, 1.2));
    for (let i = 0; i < 11; i++) { const f = new THREE.Mesh(footGeo, mPodo); f.position.set(-1.3 + i * 0.26, -0.11, 0); podo.add(f); } // narrow gaps = filtration slits
    const body = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(0.42, 20, 14)), mPodo);
    body.position.set(0.1, 0.62, 0);
    body.scale.set(1.3, 0.8, 1);
    podo.add(body);
    for (const x of [-0.9, -0.35, 0.55, 1.05]) tube(ctx, podo, curve([[0.1, 0.5, 0], [x * 0.6, 0.25, 0], [x, 0.02, 0]]), 0.07, mPodo, 12, 6);
    const pFilt = ctx.track(new THREE.SphereGeometry(0.07, 8, 6));
    const filtInset = new THREE.InstancedMesh(pFilt, ctx.material('water', { roughness: 0.3 }), 8);
    const bigProtein = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(0.2, 14, 10)), ctx.material('protein', { roughness: 0.4 }));
    bigProtein.position.set(-0.6, -0.95, 0.3);
    const rbc = new THREE.Mesh(ctx.track(new THREE.TorusGeometry(0.28, 0.13, 10, 20)), mArt);
    rbc.position.set(0.7, -1.1, 0.2);
    inset1.add(filtInset, bigProtein, rbc);

    // ---------- inset 2: PCT wall in cross-section (enlarged), same place ----------
    const inset2 = new THREE.Group();
    inset2.position.set(6.0, 4.4, 0.2);
    inset2.scale.setScalar(1.25);
    root.add(inset2);
    const nCells = 10;
    const mPctCell = ctx.material('head', { roughness: 0.65 });
    for (let i = 0; i < nCells; i++) {
      const a0 = (i / nCells) * Math.PI * 2 + 0.03, a1 = ((i + 1) / nCells) * Math.PI * 2 - 0.03;
      const sh = new THREE.Shape();
      const r0 = 0.55, r1 = 1.25;
      sh.moveTo(r0 * Math.cos(a0), r0 * Math.sin(a0));
      sh.absarc(0, 0, r1, a0, a1, false);
      sh.lineTo(r0 * Math.cos(a1), r0 * Math.sin(a1));
      sh.absarc(0, 0, r0, a1, a0, true);
      const g = ctx.track(new THREE.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: false, curveSegments: 6 }));
      g.translate(0, 0, -0.35);
      inset2.add(new THREE.Mesh(g, mPctCell));
    }
    const mv = new THREE.InstancedMesh(ctx.track(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 5)), ctx.material('head', { roughness: 0.4 }), 120);
    const mito = new THREE.InstancedMesh(ctx.track(new THREE.SphereGeometry(0.07, 10, 8)), ctx.material('chol', { roughness: 0.5 }), 40);
    const nuc = new THREE.InstancedMesh(ctx.track(new THREE.SphereGeometry(0.1, 10, 8)), ctx.material('protein2', { roughness: 0.5 }), nCells);
    {
      const o = new THREE.Object3D();
      let k = 0;
      for (let i = 0; i < 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        o.position.set(0.48 * Math.cos(a), 0.48 * Math.sin(a), 0.02);
        o.rotation.set(0, 0, a + Math.PI / 2);
        o.updateMatrix();
        mv.setMatrixAt(i, o.matrix);
      }
      for (let c = 0; c < nCells; c++) {
        const mid = ((c + 0.5) / nCells) * Math.PI * 2;
        for (const da of [-0.17, 0, 0.17]) for (const rr of [1.05, 1.16]) {
          if (k >= 40) break;
          o.position.set(rr * Math.cos(mid + da), rr * Math.sin(mid + da), 0.03);
          o.rotation.set(0, 0, mid + da);
          o.scale.set(1.6, 0.7, 0.7);
          o.updateMatrix();
          mito.setMatrixAt(k++, o.matrix);
        }
        o.scale.set(1, 1, 1);
        o.position.set(0.85 * Math.cos(mid), 0.85 * Math.sin(mid), 0.03);
        o.updateMatrix();
        nuc.setMatrixAt(c, o.matrix);
      }
      mito.count = k;
    }
    inset2.add(mv, mito, nuc);
    const capX = new THREE.Mesh(ctx.track(new THREE.TorusGeometry(0.28, 0.07, 10, 24)), mCap);
    capX.position.set(1.15, -1.15, 0);
    inset2.add(capX);

    // ---------- moving particles ----------
    const sGeo = ctx.track(new THREE.SphereGeometry(0.16, 10, 8));
    const make = (key: Parameters<typeof ctx.material>[0], n: number) => {
      const im = new THREE.InstancedMesh(sGeo, ctx.material(key, { roughness: 0.3, emissive: new THREE.Color(0x111111) }), n);
      im.count = 0;
      root.add(im);
      return im;
    };
    const pBlood = make('k', 160);
    const pFiltrate = make('neutral', 160);
    const pWater = make('water', 80);
    const pGlu = make('glucose', 60);
    const pNa = make('na', 60);
    const all = [pBlood, pFiltrate, pWater, pGlu, pNa];

    /** Particles leaving a curve sideways (reabsorption): `dir` fixed, or radial when null. */
    const leaving = (im: THREE.InstancedMesh, start: number, c: THREE.Curve<THREE.Vector3>, n: number, t: number, dist: number, dir: THREE.Vector3 | null, from = 0, to = 1, seed = 0) => {
      const r = rng(seed + 7);
      let k = start;
      for (let i = 0; i < n; i++) {
        const u = from + (to - from) * ((i + 0.5) / n);
        const p = c.getPointAt(u);
        const d = dir ? dir.clone() : new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
        const f = ((t * 1.5 + r()) % 1);
        placeAt(im, k++, p.addScaledVector(d, 0.15 + dist * f), 0.85);
      }
      return k;
    };

    const ptcAll = [effToPtc, ...ptcCurves];
    const render = (index: number, t: number) => {
      for (const im of all) im.count = 0;
      inset1.visible = index === 1;
      inset2.visible = index === 2;
      // blood is always flowing; which vessels are shown depends on the step
      const blood = index === 0 ? [affC, glomC] : index === 1 ? [glomC, effC] : index === 6 ? [effC, ...ptcAll, vasaC, venC] : index === 2 ? ptcCurves.slice(0, 2) : index === 3 ? [vasaC] : [];
      pBlood.count = flowAlong(pBlood, 0, blood, index === 6 ? 1.2 : 2.2, t, 1, 0.9);
      if (index === 1) {
        // filtrate forms in the capsule and enters the PCT; small solutes pass the barrier in the inset
        const into = curve([[C.x + 0.2, C.y - 0.2, 0.3], [C.x + 0.1, C.y - 0.95, 0.35], [-2.2, 3.45, 0]]);
        const firstPct = new THREE.CatmullRomCurve3(pctC.getSpacedPoints(60).slice(0, 18));
        pFiltrate.count = flowAlong(pFiltrate, 0, [into, firstPct], 3, t, 1, 0.8);
        const k = ease(phase(t, 0, 1));
        for (let i = 0; i < 8; i++) {
          const x = -0.84 + (i % 4) * 0.56 + 0.0, y = -1.0 + ((k * 1.6 + i * 0.37) % 1.6);
          placeAt(filtInset, i, new THREE.Vector3(x + (i > 3 ? 0.13 : 0), y, 0.35), 1);
        }
        filtInset.count = 8;
        filtInset.instanceMatrix.needsUpdate = true;
      }
      if (index === 2) {
        pFiltrate.count = flowAlong(pFiltrate, 0, [pctC], 1.6, t, 1, 0.8);
        pGlu.count = leaving(pGlu, 0, pctC, 22, t, 0.5, null, 0.04, 0.92, 1);
        pWater.count = leaving(pWater, 0, pctC, 26, t, 0.5, null, 0.06, 0.95, 2);
        pNa.count = leaving(pNa, 0, pctC, 18, t, 0.5, null, 0.08, 0.9, 3);
      }
      if (index === 3) {
        pFiltrate.count = flowAlong(pFiltrate, 0, [descC, bendC, ascC], 1.2, t, 1, 0.8);
        pWater.count = leaving(pWater, 0, descC, 24, t, 0.9, new THREE.Vector3(-1, 0, 0), 0.05, 0.98, 4);
        pNa.count = leaving(pNa, 0, ascC, 24, t, 0.9, new THREE.Vector3(1, 0, 0), 0.02, 0.95, 5);
      }
      if (index === 4) pFiltrate.count = flowAlong(pFiltrate, 0, [dctC], 2.2, t, 1, 0.8);
      if (index === 5) {
        pFiltrate.count = flowAlong(pFiltrate, 0, [cdC], 1.3, t, 1, 0.8);
        // water leaves the duct by osmosis, more in the deeper (more concentrated) medulla
        pWater.count = leaving(pWater, 0, cdC, 26, t, 1.1, new THREE.Vector3(1, 0, 0.15), 0.4, 0.96, 6);
      }
      for (const im of all) im.instanceMatrix.needsUpdate = true;
    };
    render(0, 0);

    const anchors = {
      cortex: { object: anchorAt(root, 6.6, 6.7, -1.5, 'cortex'), highlight: [cortex] },
      medulla: { object: anchorAt(root, 6.4, -5.5, -1.5, 'medulla'), highlight: [medulla] },
      afferent: { object: anchorAt(root, -0.4, 6.95, 0.15, 'afferent'), highlight: [afferent] },
      efferent: { object: anchorAt(root, -3.9, 6.8, 0.1, 'efferent'), highlight: [efferent] },
      glomerulus: { object: anchorAt(root, C.x + 0.2, C.y, 0.75, 'glomerulus'), highlight: [glomerulus] },
      bowmans: { object: anchorAt(root, C.x - 0.95, C.y - 0.6, 0.35, 'bowmans'), highlight: [capsule] },
      fenestrations: { object: anchorAt(inset1, -1.2, -0.62, 0.6, 'fenestrations'), highlight: [endo] },
      basement: { object: anchorAt(inset1, 1.35, -0.32, 0.6, 'basement'), highlight: [basement] },
      podocytes: { object: anchorAt(inset1, 0.4, 0.75, 0.4, 'podocytes'), highlight: [podo] },
      pct: { object: anchorAt(root, -5.9, 5.1, 0.85, 'pct'), highlight: [pct] },
      'pct-cell': { object: anchorAt(inset2, -0.9, 0.9, 0.1, 'pct-cell'), highlight: [inset2] },
      descending: { object: anchorAt(root, -3.55, -4.0, 0.2, 'descending'), highlight: [desc, bend] },
      ascending: { object: anchorAt(root, -1.45, -2.0, 0.25, 'ascending'), highlight: [asc] },
      dct: { object: anchorAt(root, 0.9, 4.6, 0.3, 'dct'), highlight: [dct] },
      'collecting-duct': { object: anchorAt(root, 3.95, -3.5, 0.3, 'collecting-duct'), highlight: [cd] },
      peritubular: { object: anchorAt(root, -4.6, 3.3, 1.1, 'peritubular'), highlight: [ptc, venule] },
      'vasa-recta': { object: anchorAt(root, -2.5, -6.9, -0.6, 'vasa-recta'), highlight: [vasa] },
    };
    return { anchors, durations: [4, 5, 6, 6, 4, 6, 5], render, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
