import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng } from '../viewer3d/kit';
import { DS, band, capsuleProfile, halfShell, instanced, loopTube, pathTube, ringTube, scatter } from './a2-2-kit';

/*
 * A2.2 rod-shaped Gram-positive bacterium (Bacillus-like), cut lengthways by the plane z = 0.
 * Schematic proportions: 1 unit ≈ 0.4 µm, so the cell is ≈ 3.4 µm long and ≈ 1.2 µm wide.
 * Layers from the outside in: capsule (only some species), thick peptidoglycan cell wall (Gram-positive:
 * no outer membrane), plasma membrane, cytoplasm. The DNA is one closed loop, not enclosed by a membrane.
 */
const L = 8.4;      // length including the rounded ends
const R = 1.45;     // outer radius of the cell wall
const WALL = 0.28;  // wall thickness (drawn several times thicker than the membrane, as in Gram-positive cells)
const MEM = [R - WALL - 0.02, R - WALL - 0.1] as const; // plasma membrane band (outer, inner radius)
const CYTO = MEM[1] - 0.01;

const scene: SceneModule = {
  camera: { position: [3.6, 5.0, 16.6], target: [1.2, -0.1, -0.6], fov: 38, minDistance: 5, maxDistance: 40 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const cell = new THREE.Group();
    cell.position.x = -2;
    root.add(cell);
    const rand = rng(7);
    const ax = { axis: 'x' as const };

    const mWall = ctx.material('tail', { roughness: 0.75 });
    const mWallCut = ctx.material('tail', { roughness: 0.8, metalness: 0.3, side: DS });
    const mMem = ctx.material('head', { roughness: 0.5, side: DS });
    const mCyto = ctx.material('neutral', { roughness: 0.9, side: THREE.BackSide });
    const mCaps = ctx.material('carb', { roughness: 0.6, transparent: true, opacity: 0.28, depthWrite: false, side: DS });
    const mDNA = ctx.material('na', { roughness: 0.45 });
    const mRibo = ctx.material('text', { roughness: 0.6 });
    const mPilus = ctx.material('protein', { roughness: 0.5 });
    const mFlag = ctx.material('protein2', { roughness: 0.45 });

    // ---------- capsule (not universal), cell wall, plasma membrane, cytoplasm ----------
    const capsP = capsuleProfile(R + 0.45, L + 0.9);
    const wallP = capsuleProfile(R, L);
    const wallInP = capsuleProfile(R - WALL, L - 2 * WALL);
    const memOutP = capsuleProfile(MEM[0], L - 2 * (R - MEM[0]));
    const memInP = capsuleProfile(MEM[1], L - 2 * (R - MEM[1]));
    const cytoP = capsuleProfile(CYTO, L - 2 * (R - CYTO));

    const capsule = new THREE.Group();
    capsule.add(new THREE.Mesh(halfShell(ctx, capsP, ax, 48), mCaps), band(ctx, capsP, wallP, mCaps, ax));
    capsule.renderOrder = 2;
    const wall = new THREE.Group();
    wall.add(new THREE.Mesh(halfShell(ctx, wallP, ax, 48), mWall), band(ctx, wallP, wallInP, mWallCut, ax));
    const membrane = band(ctx, memOutP, memInP, mMem, ax);
    membrane.add(new THREE.Mesh(halfShell(ctx, memOutP, ax, 48), mMem));
    const cytoplasm = new THREE.Mesh(halfShell(ctx, cytoP, ax, 48), mCyto);
    cell.add(wall, membrane, cytoplasm, capsule);

    // inside test for the cytoplasm (distance from the long axis, with rounded ends)
    const straight = L / 2 - R;
    const inCyto = (p: THREE.Vector3, margin: number) => {
      const dx = Math.max(0, Math.abs(p.x) - straight);
      return Math.hypot(dx, p.y, p.z) < CYTO - margin && p.z < -0.06;
    };

    // ---------- nucleoid: one naked, circular DNA molecule ----------
    const dna = loopTube(ctx, 11, 34, [2.55, 0.52, 0.48], [0, 0, -0.6], 0.045);
    const nucleoid = new THREE.Mesh(dna.geometry, mDNA);
    cell.add(nucleoid);

    // ---------- plasmids: small extra DNA loops ----------
    const plasmids = new THREE.Group();
    for (const [x, y, z, r, seed] of [[3.35, 0.38, -0.5, 0.27, 3], [-3.25, -0.42, -0.45, 0.24, 8]] as const) {
      const ring = new THREE.Mesh(ringTube(ctx, r, 0.04, 0.12, seed), mDNA);
      ring.position.set(x, y, z);
      ring.rotation.x = -0.35;
      plasmids.add(ring);
    }
    cell.add(plasmids);

    // ---------- 70S ribosomes, scattered through the cytoplasm but sparse in the nucleoid ----------
    const nucleoidZone = (p: THREE.Vector3) => (p.x / 3.0) ** 2 + (p.y / 0.62) ** 2 + ((p.z + 0.6) / 0.42) ** 2 < 1;
    const riboPts = scatter(rand, 170, (p) => inCyto(p, 0.09) && !nucleoidZone(p), [new THREE.Vector3(-L / 2, -CYTO, -CYTO), new THREE.Vector3(L / 2, CYTO, -0.06)],
      plasmids.children.map((c) => ({ c: c.position, r: 0.4 })));
    const ribosomes = instanced(ctx.track(new THREE.SphereGeometry(0.06, 8, 6)), mRibo, riboPts);
    cell.add(ribosomes);
    const riboTarget = new THREE.Vector3(1.9, -0.72, -0.25);
    const riboLabel = riboPts.reduce((b, p) => (p.distanceTo(riboTarget) < b.distanceTo(riboTarget) ? p : b), riboPts[0]!);

    // ---------- pili: short, thin protein projections from the wall ----------
    const pilusGeo = ctx.track(new THREE.CylinderGeometry(0.024, 0.024, 1, 5));
    const pili = new THREE.InstancedMesh(pilusGeo, mPilus, 60);
    const up = new THREE.Vector3(0, 1, 0);
    const m4 = new THREE.Matrix4();
    let np = 0;
    let topPilus = new THREE.Vector3();
    for (let i = 0; i < 60; i++) {
      const x = -straight + rand() * straight * 2;
      const th = Math.PI + 0.12 + rand() * (Math.PI - 0.24); // back half only (z ≤ 0)
      const dir = new THREE.Vector3(0, Math.cos(th), Math.sin(th));
      const len = 0.55 + rand() * 0.35;
      const base = new THREE.Vector3(x, dir.y * R, dir.z * R);
      const mid = base.clone().addScaledVector(dir, len / 2);
      m4.compose(mid, new THREE.Quaternion().setFromUnitVectors(up, dir), new THREE.Vector3(1, len, 1));
      pili.setMatrixAt(np++, m4);
      if (dir.y > 0.85 && x > 1.2 && x < 2.6) topPilus = base.clone().addScaledVector(dir, len * 0.75);
    }
    pili.count = np;
    pili.instanceMatrix.needsUpdate = true;
    if (topPilus.lengthSq() === 0) topPilus.set(0.5, R + 0.6, -0.3);
    cell.add(pili);

    // ---------- flagellum: a long helical protein filament anchored in the wall and membrane ----------
    const flagellum = new THREE.Group();
    const pole = new THREE.Vector3(L / 2 - 0.03, 0, -0.32);
    const fPts: [number, number, number][] = [];
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      const x = pole.x + u * 6.6;
      const amp = 0.55 * Math.min(1, u * 4);
      fPts.push([x, -0.25 * u * 2.4 + amp * Math.sin(u * Math.PI * 5.2), pole.z - amp * Math.cos(u * Math.PI * 5.2) * 0.6 - u * 0.4]);
    }
    const fCurve = new THREE.CatmullRomCurve3(fPts.map((p) => new THREE.Vector3(...p)));
    flagellum.add(new THREE.Mesh(pathTube(ctx, fPts, 0.055, 200), mFlag));
    const basal = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(0.12, 0.12, WALL + 0.18, 12)), mFlag);
    basal.rotation.z = Math.PI / 2;
    basal.position.set(L / 2 - (WALL + 0.18) / 2 + 0.02, 0, -0.3);
    flagellum.add(basal);
    cell.add(flagellum);
    const flagPoint = fCurve.getPoint(0.42);

    // ---------- anchors ----------
    const dnaPoint = dna.curve.getPoint(0.18);
    const anchors = {
      wall: { object: anchorAt(cell, -3.6, R - WALL * 0.75, 0.02, 'wall'), highlight: [wall] },
      membrane: { object: anchorAt(cell, -3.0, -(MEM[0] + MEM[1]) / 2, 0.02, 'membrane'), highlight: [membrane] },
      cytoplasm: { object: anchorAt(cell, -3.3, -0.55, -0.85, 'cytoplasm'), highlight: [cytoplasm] },
      nucleoid: { object: anchorAt(cell, dnaPoint.x, dnaPoint.y, dnaPoint.z + 0.05, 'nucleoid'), highlight: [nucleoid] },
      ribosomes: { object: anchorAt(cell, riboLabel.x, riboLabel.y, riboLabel.z, 'ribosomes'), highlight: [ribosomes] },
      plasmid: { object: anchorAt(cell, 3.35 + 0.27, 0.38, -0.45, 'plasmid'), highlight: [plasmids] },
      flagellum: { object: anchorAt(cell, flagPoint.x, flagPoint.y, flagPoint.z, 'flagellum'), highlight: [flagellum] },
      pili: { object: anchorAt(cell, topPilus.x, topPilus.y, topPilus.z, 'pili'), highlight: [pili] },
      capsule: { object: anchorAt(cell, 1.6, -(R + 0.25), 0.02, 'capsule'), highlight: [capsule] },
    };
    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
