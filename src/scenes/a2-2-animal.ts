import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng } from '../viewer3d/kit';
import {
  DS, cutMitochondrion, cutNucleus, ellipseProfile, golgi, halfShell, instanced, pathTube, rim, roughER, scatter,
} from './a2-2-kit';

/*
 * A2.2 animal cell, cut in half by the plane z = 0 (the reader looks into the back half).
 * Schematic proportions: 1 unit ≈ 1.5 µm, so the cell is ≈ 20 µm across and the nucleus ≈ 6 µm.
 * Ribosomes (really ≈ 25 nm) are drawn far too large so they can be seen.
 * Topology that matters: the nucleus and mitochondria have double membranes; ER, Golgi, lysosomes and
 * vesicles have single membranes; ribosomes have none; ribosomes stud the cytoplasmic face of the rough ER.
 */
const RX = 6.5, RY = 4.8, RZ = 5;

const scene: SceneModule = {
  camera: { position: [3.2, 4.6, 17.5], target: [0, -0.2, -1.2], fov: 38, minDistance: 5, maxDistance: 40 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(41);

    const mMem = ctx.material('head', { roughness: 0.55 });
    const mCyto = ctx.material('neutral', { roughness: 0.9, side: THREE.BackSide });
    const mNuc = ctx.material('na', { roughness: 0.5, side: DS });
    const mDense = ctx.material('text', { roughness: 0.6 });
    const mChrom = ctx.material('na', { roughness: 0.5, metalness: 0.35 });
    const mMito = ctx.material('chol', { roughness: 0.5, side: DS });
    const mCrista = ctx.material('chol', { roughness: 0.5, metalness: 0.35, side: DS });
    const mRER = ctx.material('protein', { roughness: 0.5 });
    const mSER = ctx.material('water', { roughness: 0.45 });
    const mGolgi = ctx.material('glucose', { roughness: 0.5 });
    const mLyso = ctx.material('k', { roughness: 0.45 });
    const mCyto2 = ctx.material('protein2', { roughness: 0.5 });

    // ---------- plasma membrane and cytoplasm ----------
    const cellP = ellipseProfile(RX, RY, 40);
    const zs = RZ / RX;
    const membrane = new THREE.Group();
    membrane.add(new THREE.Mesh(halfShell(ctx, cellP, { zScale: zs }, 64), mMem));
    membrane.add(rim(ctx, cellP, 0.07, mMem));
    root.add(membrane);
    const cytoP = ellipseProfile(RX - 0.08, RY - 0.08, 40);
    const cytoplasm = new THREE.Mesh(halfShell(ctx, cytoP, { zScale: (RZ - 0.08) / (RX - 0.08) }, 64), mCyto);
    root.add(cytoplasm);
    const insideCell = (p: THREE.Vector3, k = 0.94) => (p.x / (RX * k)) ** 2 + (p.y / (RY * k)) ** 2 + (p.z / (RZ * k)) ** 2 < 1;

    // ---------- nucleus ----------
    const NUC = new THREE.Vector3(-1.2, 0.5, 0);
    const NR = 2.0;
    const nuc = cutNucleus(ctx, NR, { envelope: mNuc, pore: mDense, nucleolus: mDense, chromatin: mChrom });
    nuc.group.position.copy(NUC);
    root.add(nuc.group);

    // ---------- rough ER: sheets beside the nucleus, studded with 80S ribosomes ----------
    const rer = roughER(ctx, [
      { at: [1.9, 2.25, -1.2], size: [1.55, 0.11, 0.85], rot: -0.18 },
      { at: [2.25, 1.6, -1.0], size: [1.6, 0.11, 0.8], rot: -0.22 },
      { at: [2.6, 0.95, -0.85], size: [1.5, 0.11, 0.75], rot: -0.26 },
    ], mRER, mDense);
    root.add(rer.group);

    // ---------- smooth ER: branching tubules ----------
    const SER = new THREE.Vector3(2.2, -2.6, -1.5);
    const ser = new THREE.Group();
    const serPaths: [number, number, number][][] = [
      [[-1.2, 0.2, 0], [-0.5, 0.5, 0.2], [0.3, 0.1, -0.1], [1.1, 0.4, 0.1]],
      [[-0.5, 0.5, 0.2], [-0.2, 1.0, -0.2], [0.25, 1.3, 0]],
      [[0.3, 0.1, -0.1], [0.5, -0.45, 0.2], [1.0, -0.7, 0]],
      [[-1.2, 0.2, 0], [-1.35, -0.35, -0.2], [-0.9, -0.8, 0.1]],
      [[1.1, 0.4, 0.1], [1.35, 0.95, -0.1]],
    ];
    for (const p of serPaths) ser.add(new THREE.Mesh(pathTube(ctx, p, 0.12, 40), mSER));
    ser.position.copy(SER);
    root.add(ser);

    // ---------- Golgi apparatus (concave trans face towards the plasma membrane) ----------
    const GOL = new THREE.Vector3(3.5, -0.55, -1.4);
    const gol = golgi(ctx, 0.95, mGolgi, mGolgi, 8);
    gol.group.position.copy(GOL);
    gol.group.rotation.z = -Math.PI / 2;
    root.add(gol.group);
    // secretory vesicles on their way to the plasma membrane
    const vesGeo = ctx.track(new THREE.SphereGeometry(0.19, 14, 10));
    const vesicles = new THREE.Group();
    const vesPos: [number, number, number][] = [[5.05, -0.25, -1.0], [5.45, 0.85, -0.9], [5.2, -1.45, -1.2], [4.7, 0.5, -1.6]];
    for (const p of vesPos) { const v = new THREE.Mesh(vesGeo, mGolgi); v.position.set(...p); vesicles.add(v); }
    root.add(vesicles);

    // ---------- mitochondria (cut lengthways to show the double membrane and cristae) ----------
    const mitoDefs = [
      { at: [-4.3, 1.75, 0], rot: 0.5, len: 2.5, r: 0.56 },
      { at: [-2.5, -2.95, 0], rot: -0.12, len: 2.4, r: 0.55 },
      { at: [1.3, 3.45, 0], rot: -0.08, len: 2.1, r: 0.5 },
      { at: [4.45, -2.6, -0.3], rot: 0.65, len: 1.7, r: 0.45 },
    ] as const;
    const mitos = new THREE.Group();
    const mitoList = mitoDefs.map((d) => {
      const m = cutMitochondrion(ctx, d.len, d.r, mMito, mCrista);
      m.group.position.set(d.at[0], d.at[1], d.at[2]);
      m.group.rotation.z = d.rot;
      mitos.add(m.group);
      return m;
    });
    root.add(mitos);

    // ---------- lysosomes ----------
    const lysosomes = new THREE.Group();
    for (const [x, y, z, r] of [[-4.45, -1.0, -1.0, 0.45], [0.15, -3.55, -1.2, 0.36], [-3.4, -1.9, -2.6, 0.33]] as const) {
      const l = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(r, 20, 14)), mLyso);
      l.position.set(x, y, z);
      lysosomes.add(l);
    }
    root.add(lysosomes);

    // ---------- centrosome: two centrioles at right angles ----------
    const CEN = new THREE.Vector3(1.35, -1.5, -1.1);
    const centrioles = new THREE.Group();
    const tripletGeo = ctx.track(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6));
    for (let c = 0; c < 2; c++) {
      const one = new THREE.Group();
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        const rod = new THREE.Mesh(tripletGeo, mCyto2);
        rod.position.set(Math.cos(a) * 0.19, 0, Math.sin(a) * 0.19);
        one.add(rod);
      }
      if (c === 1) { one.rotation.z = Math.PI / 2; one.position.set(0.5, -0.15, 0.1); }
      centrioles.add(one);
    }
    centrioles.position.copy(CEN);
    root.add(centrioles);

    // ---------- cytoskeleton: microtubules radiating from the centrosome, behind the organelles ----------
    const cytoskeleton = new THREE.Group();
    const mtEnds: THREE.Vector3[] = [];
    for (let i = 0; i < 13; i++) {
      const a = -2.2 + (i / 12) * 4.2 + (rand() - 0.5) * 0.15;
      const end = new THREE.Vector3(Math.cos(a) * RX * 0.74, Math.sin(a) * RY * 0.74, -2.9);
      const mid = new THREE.Vector3().lerpVectors(CEN, end, 0.35).setZ(-2.7);
      mid.y += (rand() - 0.5) * 0.6;
      cytoskeleton.add(new THREE.Mesh(pathTube(ctx, [[CEN.x, CEN.y, CEN.z - 0.3], [mid.x, mid.y, mid.z], [end.x, end.y, end.z]], 0.03, 30), mCyto2));
      mtEnds.push(end);
    }
    // a few going behind the nucleus to the left side
    for (const a of [2.4, 2.9, 3.5]) {
      const end = new THREE.Vector3(Math.cos(a) * RX * 0.72, Math.sin(a) * RY * 0.72, -3.0);
      cytoskeleton.add(new THREE.Mesh(pathTube(ctx, [[CEN.x, CEN.y, CEN.z - 0.3], [CEN.x - 1.5, CEN.y - 0.4, -2.7], [end.x, end.y, end.z]], 0.03, 30), mCyto2));
    }
    root.add(cytoskeleton);

    // ---------- free ribosomes (80S) ----------
    const avoid = [
      { c: NUC, r: NR + 0.25 },
      ...mitoDefs.map((d) => ({ c: new THREE.Vector3(...d.at), r: d.len / 2 + 0.2 })),
      { c: GOL, r: 1.7 }, { c: SER, r: 1.6 }, { c: CEN, r: 0.8 },
      { c: new THREE.Vector3(2.25, 1.6, -1.0), r: 1.9 },
      ...lysosomes.children.map((l) => ({ c: l.position, r: 0.6 })),
      ...vesicles.children.map((v) => ({ c: v.position, r: 0.35 })),
    ];
    const riboPts = scatter(rand, 230, (p) => insideCell(p), [new THREE.Vector3(-RX, -RY, -3.6), new THREE.Vector3(RX, RY, -0.08)], avoid);
    const ribosomes = instanced(ctx.track(new THREE.SphereGeometry(0.075, 8, 6)), mDense, riboPts);
    root.add(ribosomes);
    const near = (target: THREE.Vector3) => riboPts.reduce((best, p) => (p.distanceTo(target) < best.distanceTo(target) ? p : best), riboPts[0]!);
    const riboLabel = near(new THREE.Vector3(-3.6, -0.3, -0.2));

    // ---------- anchors ----------
    const at = (v: THREE.Vector3, dx = 0, dy = 0, dz = 0): [number, number, number] => [v.x + dx, v.y + dy, v.z + dz];
    const nucRim = (deg: number) => at(NUC, Math.cos((deg * Math.PI) / 180) * NR, Math.sin((deg * Math.PI) / 180) * NR * 0.92, 0);
    const mitoA = mitoDefs[0];
    const pore = nuc.firstPore.clone().add(NUC);
    const nucleolusFront = nuc.nucleolus.position.clone().add(NUC).add(new THREE.Vector3(0.1, 0.15, NR * 0.3));
    const mt = (mtEnds[9] ?? mtEnds[0]!).clone().lerp(new THREE.Vector3(CEN.x, CEN.y, -2.5), 0.3);
    const anchors = {
      nucleus: { object: anchorAt(root, ...nucRim(205), 'nucleus'), highlight: [nuc.envelope, nuc.pores] },
      membrane: { object: anchorAt(root, RX * Math.cos(5.15), RY * Math.sin(5.15), 0, 'membrane'), highlight: [membrane] },
      mitochondrion: { object: anchorAt(root, mitoA.at[0] - 0.62 * Math.sin(mitoA.rot), mitoA.at[1] + 0.62 * Math.cos(mitoA.rot), 0, 'mitochondrion'), highlight: [mitos] },
      rer: { object: anchorAt(root, 2.55, 2.2, -0.45, 'rer'), highlight: [rer.group] },
      ribosomes: { object: anchorAt(root, riboLabel.x, riboLabel.y, riboLabel.z, 'ribosomes'), highlight: [ribosomes] },
      golgi: { object: anchorAt(root, GOL.x + 0.1, GOL.y - 0.2, -0.85, 'golgi'), highlight: [gol.group] },
      ser: { object: anchorAt(root, SER.x + 0.3, SER.y + 0.15, SER.z + 0.2, 'ser'), highlight: [ser] },
      lysosome: { object: anchorAt(root, -4.45, -1.0, -0.55, 'lysosome'), highlight: [lysosomes] },
      vesicles: { object: anchorAt(root, 5.05, -0.25, -0.8, 'vesicles'), highlight: [vesicles, gol.vesicles] },
      nucleolus: { object: anchorAt(root, nucleolusFront.x, nucleolusFront.y, nucleolusFront.z, 'nucleolus'), highlight: [nuc.nucleolus] },
      pore: { object: anchorAt(root, pore.x, pore.y, pore.z + 0.05, 'pore'), highlight: [nuc.pores] },
      centrioles: { object: anchorAt(root, CEN.x + 0.25, CEN.y - 0.1, CEN.z + 0.35, 'centrioles'), highlight: [centrioles] },
      cytoskeleton: { object: anchorAt(root, mt.x, mt.y, mt.z, 'cytoskeleton'), highlight: [cytoskeleton] },
      cytoplasm: { object: anchorAt(root, -3.0, -1.6, -3.85, 'cytoplasm'), highlight: [cytoplasm] },
    };
    void mitoList;
    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
