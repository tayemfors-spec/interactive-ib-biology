import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt } from '../viewer3d/kit';
import { DS, cutChloroplast, cutMitochondrion, cutNucleus, golgi, halfShell, rim, roughER, roundedProfile } from './a2-2-kit';

/*
 * A2.2 plant (leaf mesophyll) cell, cut open by the plane z = 0. Schematic: 1 unit ≈ 4 µm, so the cell
 * is ≈ 40 µm wide, chloroplasts ≈ 10 µm long (drawn a little large) and the nucleus ≈ 8 µm across.
 * The large permanent vacuole fills most of the cell, so the cytoplasm (with chloroplasts, mitochondria,
 * the nucleus, ER and Golgi) is a thin layer squeezed between the tonoplast and the plasma membrane.
 * The plasma membrane is pressed against the cellulose cell wall. There are no centrioles.
 */
const W = 5, H = 3.5, D = 5; // inner half-width, half-height and full depth of the space inside the wall
const T = 0.45;              // wall thickness
const M = 0.1;               // plasma membrane slab thickness (drawn thick enough to see)

const scene: SceneModule = {
  camera: { position: [4.0, 5.0, 18.2], target: [0, -0.3, -2.0], fov: 38, minDistance: 5, maxDistance: 40 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);

    const mWall = ctx.material('tail', { roughness: 0.8 });
    const mMem = ctx.material('head', { roughness: 0.55 });
    const mCyto = ctx.material('neutral', { roughness: 0.9 });
    const mVac = ctx.material('water', { roughness: 0.3, transparent: true, opacity: 0.42, depthWrite: false, side: DS });
    const mTono = ctx.material('water', { roughness: 0.4 });
    const mChl = ctx.material('carb', { roughness: 0.55, side: DS });
    const mThy = ctx.material('carb', { roughness: 0.5, metalness: 0.6 });
    const mStroma = ctx.material('neutral', { roughness: 0.8, side: DS });
    const mStarch = ctx.material('glucose', { roughness: 0.6 });
    const mNuc = ctx.material('na', { roughness: 0.5, side: DS });
    const mDense = ctx.material('text', { roughness: 0.6 });
    const mChrom = ctx.material('na', { roughness: 0.5, metalness: 0.35 });
    const mMito = ctx.material('chol', { roughness: 0.5, side: DS });
    const mCrista = ctx.material('chol', { roughness: 0.5, metalness: 0.35, side: DS });
    const mGolgi = ctx.material('glucose', { roughness: 0.5 });
    const mRER = ctx.material('protein', { roughness: 0.5 });

    const box = (mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number) => {
      const b = new THREE.Mesh(ctx.track(new THREE.BoxGeometry(w, h, d)), mat);
      b.position.set(x, y, z);
      return b;
    };

    // ---------- cellulose cell wall: five slabs (the front one is cut away) ----------
    const wall = new THREE.Group();
    wall.add(
      box(mWall, 2 * (W + T), 2 * (H + T), T, 0, 0, -D - T / 2),
      box(mWall, T, 2 * (H + T), D, -W - T / 2, 0, -D / 2),
      box(mWall, T, 2 * (H + T), D, W + T / 2, 0, -D / 2),
      box(mWall, 2 * W, T, D, 0, H + T / 2, -D / 2),
      box(mWall, 2 * W, T, D, 0, -H - T / 2, -D / 2),
    );
    root.add(wall);

    // ---------- plasma membrane pressed against the wall, lined on the inside by cytoplasm ----------
    const membrane = new THREE.Group();
    membrane.add(
      box(mMem, 2 * W, 2 * H, M, 0, 0, -D + M / 2),
      box(mMem, M, 2 * H, D - M, -W + M / 2, 0, -(D - M) / 2),
      box(mMem, M, 2 * H, D - M, W - M / 2, 0, -(D - M) / 2),
      box(mMem, 2 * W - 2 * M, M, D - M, 0, H - M / 2, -(D - M) / 2),
      box(mMem, 2 * W - 2 * M, M, D - M, 0, -H + M / 2, -(D - M) / 2),
    );
    root.add(membrane);
    const cytoplasm = new THREE.Group();
    const c = 0.03, w2 = W - M, h2 = H - M, d2 = D - M;
    cytoplasm.add(
      box(mCyto, 2 * w2, 2 * h2, c, 0, 0, -d2 + c / 2),
      box(mCyto, c, 2 * h2, d2 - c - 0.02, -w2 + c / 2, 0, -(d2 - c) / 2 - 0.02),
      box(mCyto, c, 2 * h2, d2 - c - 0.02, w2 - c / 2, 0, -(d2 - c) / 2 - 0.02),
      box(mCyto, 2 * w2 - 2 * c, c, d2 - c - 0.02, 0, h2 - c / 2, -(d2 - c) / 2 - 0.02),
      box(mCyto, 2 * w2 - 2 * c, c, d2 - c - 0.02, 0, -h2 + c / 2, -(d2 - c) / 2 - 0.02),
    );
    root.add(cytoplasm);

    // ---------- plasmodesmata: membrane-lined channels through the wall (shown on the cut face) ----------
    const plasmodesmata = new THREE.Group();
    const pdTop = [-3.6, 0.3, 2.45];
    for (const x of pdTop) {
      plasmodesmata.add(box(mMem, 0.13, T + 0.02, 0.03, x, H + T / 2, 0.016));
      plasmodesmata.add(box(mDense, 0.04, T + 0.02, 0.035, x, H + T / 2, 0.02));
    }
    for (const y of [2.3, -1.9]) {
      plasmodesmata.add(box(mMem, T + 0.02, 0.13, 0.03, W + T / 2, y, 0.016));
      plasmodesmata.add(box(mDense, T + 0.02, 0.04, 0.035, W + T / 2, y, 0.02));
    }
    root.add(plasmodesmata);

    // ---------- large permanent vacuole, bounded by the tonoplast ----------
    const vacP = roundedProfile(3.5, 2.2, 1.3);
    const vz = 3.85 / 3.5;
    const vacuole = new THREE.Mesh(halfShell(ctx, vacP, { zScale: vz }, 56), mVac);
    vacuole.renderOrder = 2;
    const tonoplast = rim(ctx, vacP, 0.055, mTono);
    root.add(vacuole, tonoplast);

    // ---------- chloroplasts: cut ones in the cytoplasm at the cut face, whole ones further back ----------
    const chloroplasts = new THREE.Group();
    const RXc = 1.25, RYc = 0.48;
    const cutChl = [
      { at: [-1.7, 2.85, 0], rot: 0 },
      { at: [1.5, 2.88, 0], rot: 0.03 },
      { at: [1.3, -2.85, 0], rot: -0.03 },
      { at: [-4.25, 0.5, 0], rot: Math.PI / 2 },
      { at: [4.25, -0.1, 0], rot: Math.PI / 2 },
    ] as const;
    const cutParts = cutChl.map((d) => {
      const ch = cutChloroplast(ctx, RXc, RYc, { envelope: mChl, thylakoid: mThy, starch: mStarch, stroma: mStroma });
      ch.group.position.set(d.at[0], d.at[1], d.at[2]);
      ch.group.rotation.z = d.rot;
      chloroplasts.add(ch.group);
      return ch;
    });
    const wholeChl: { at: [number, number, number]; rot?: [number, number, number] }[] = [
      { at: [-0.2, 2.92, -2.3] }, { at: [2.9, 2.9, -3.4] }, { at: [-3.1, 2.88, -3.6] },
      { at: [-1.6, -2.9, -2.4] }, { at: [3.0, -2.92, -3.3] },
      { at: [-4.3, -1.5, -2.7], rot: [0, 0, Math.PI / 2] }, { at: [4.3, 1.9, -2.9], rot: [0, 0, Math.PI / 2] },
    ];
    for (const d of wholeChl) {
      const ch = cutChloroplast(ctx, RXc, RYc, { envelope: mChl, thylakoid: mThy, starch: mStarch }, false);
      ch.group.position.set(d.at[0], d.at[1], d.at[2]);
      if (d.rot) ch.group.rotation.set(...d.rot);
      chloroplasts.add(ch.group);
    }
    root.add(chloroplasts);

    // ---------- nucleus, pushed to the side by the vacuole ----------
    const NUC = new THREE.Vector3(-3.85, -2.4, 0);
    const nuc = cutNucleus(ctx, 0.98, { envelope: mNuc, pore: mDense, nucleolus: mDense, chromatin: mChrom }, 12);
    nuc.group.position.copy(NUC);
    root.add(nuc.group);

    // ---------- mitochondria ----------
    const mitos = new THREE.Group();
    const mitoDefs = [
      { at: [-4.1, 2.7, 0], rot: 0.55, len: 1.25, r: 0.3, cut: true },
      { at: [3.85, 2.75, 0], rot: -0.4, len: 1.25, r: 0.3, cut: true },
      { at: [-1.55, -2.95, 0], rot: 0.08, len: 1.3, r: 0.3, cut: true },
      { at: [3.0, 2.95, -1.4], rot: 0.1, len: 1.1, r: 0.28, cut: false },
      { at: [0.7, -2.95, -3.6], rot: -0.2, len: 1.1, r: 0.28, cut: false },
    ] as const;
    for (const d of mitoDefs) {
      const m = cutMitochondrion(ctx, d.len, d.r, mMito, mCrista, d.cut);
      m.group.position.set(d.at[0], d.at[1], d.at[2]);
      m.group.rotation.z = d.rot;
      mitos.add(m.group);
    }
    root.add(mitos);

    // ---------- Golgi apparatus and rough ER ----------
    const gol = golgi(ctx, 0.42, mGolgi, mGolgi, 6);
    gol.group.position.set(3.9, -2.6, -1.0);
    gol.group.rotation.z = 0.3;
    root.add(gol.group);
    const rer = roughER(ctx, [
      { at: [-2.3, -2.72, -1.6], size: [0.95, 0.07, 0.6], rot: 0.04 },
      { at: [-2.25, -3.02, -1.8], size: [0.85, 0.07, 0.55], rot: 0.02 },
    ], mRER, mDense, 4);
    root.add(rer.group);

    // ---------- anchors ----------
    const chlB = cutParts[1]!;
    const granum = chlB.grana.children[Math.min(9, chlB.grana.children.length - 1)]!.position.clone().add(new THREE.Vector3(...cutChl[1].at));
    root.updateMatrixWorld(true);
    const starch = cutParts[4]!.starch.getWorldPosition(new THREE.Vector3());
    const ang = (200 * Math.PI) / 180;
    const mA = mitoDefs[0];
    const anchors = {
      wall: { object: anchorAt(root, -W - T * 0.65, 2.0, 0.02, 'wall'), highlight: [wall] },
      membrane: { object: anchorAt(root, -1.2, -H + M / 2, 0.03, 'membrane'), highlight: [membrane] },
      vacuole: { object: anchorAt(root, -0.6, 0.6, -3.6, 'vacuole'), highlight: [vacuole] },
      tonoplast: { object: anchorAt(root, 2.2 + 1.3 * Math.cos(0.8), 0.9 + 1.3 * Math.sin(0.8), 0.03, 'tonoplast'), highlight: [tonoplast, vacuole] },
      chloroplast: { object: anchorAt(root, cutChl[3].at[0] + RYc, 0.6, 0.03, 'chloroplast'), highlight: [chloroplasts] },
      grana: { object: anchorAt(root, granum.x, granum.y, granum.z + 0.03, 'grana'), highlight: cutParts.map((p) => p.grana) },
      nucleus: { object: anchorAt(root, NUC.x + 0.98 * Math.cos(ang), NUC.y + 0.9 * Math.sin(ang), 0.02, 'nucleus'), highlight: [nuc.group] },
      mitochondrion: { object: anchorAt(root, mA.at[0] - 0.3 * Math.sin(mA.rot), mA.at[1] + 0.3 * Math.cos(mA.rot), 0.02, 'mitochondrion'), highlight: [mitos] },
      plasmodesmata: { object: anchorAt(root, pdTop[1]!, H + T / 2, 0.04, 'plasmodesmata'), highlight: [plasmodesmata] },
      golgi: { object: anchorAt(root, 3.9, -2.5, -0.55, 'golgi'), highlight: [gol.group] },
      starch: { object: anchorAt(root, starch.x, starch.y, starch.z + 0.2, 'starch'), highlight: cutParts.map((p) => p.starch) },
    };
    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
