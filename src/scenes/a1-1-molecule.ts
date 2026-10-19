import * as THREE from 'three';
import type { SceneContext, SceneModule } from '../viewer3d/types';
import { anchorAt } from '../viewer3d/kit';

/*
 * A1.1 single water molecule. Units are ångströms (1 Å = 0.1 nm).
 *  - O–H bond length 0.96 Å; H–O–H bond angle 104.5°.
 *  - Oxygen is more electronegative, so the shared electrons spend more time near O: δ− on O, δ+ on each H.
 *  - Two lone pairs on O point away from the hydrogens, roughly tetrahedrally (perpendicular to the H–O–H plane).
 * The H atoms lie in the xy-plane below O; the lone pairs lie in the yz-plane above it.
 *
 * Also exports the ball-and-stick helpers used by the liquid-water and ice scenes.
 */
export const OH_LEN = 0.96;
export const HALF_ANGLE = THREE.MathUtils.degToRad(104.5 / 2);
export const R_O = 0.36;
export const R_H = 0.22;
export const R_STICK = 0.085;
export const R_DASH = 0.05;

const UP = new THREE.Vector3(0, 1, 0);
const mtx = new THREE.Matrix4();
const qt = new THREE.Quaternion();
const sc = new THREE.Vector3();
const mid = new THREE.Vector3();
const dir = new THREE.Vector3();

/** Place instance i of a unit cylinder (height 1 along y) so it runs from a to b. */
export function placeRod(mesh: THREE.InstancedMesh, i: number, a: THREE.Vector3, b: THREE.Vector3, radiusScale = 1) {
  dir.subVectors(b, a);
  const len = dir.length();
  qt.setFromUnitVectors(UP, dir.normalize());
  mid.addVectors(a, b).multiplyScalar(0.5);
  sc.set(radiusScale, Math.max(1e-4, len), radiusScale);
  mtx.compose(mid, qt, sc);
  mesh.setMatrixAt(i, mtx);
}

/** Hide instance i (scaled to nothing) without changing mesh.count. */
export function hideInstance(mesh: THREE.InstancedMesh, i: number) {
  mtx.makeScale(1e-5, 1e-5, 1e-5);
  mesh.setMatrixAt(i, mtx);
}

export const DASHES = 3;
const pa = new THREE.Vector3();
const pb = new THREE.Vector3();
/**
 * A hydrogen bond drawn as DASHES short rods between the surface of hydrogen atom `h` and the surface
 * of the acceptor oxygen `o`. Uses instances [start, start + DASHES).
 */
export function placeHBond(mesh: THREE.InstancedMesh, start: number, h: THREE.Vector3, o: THREE.Vector3, visible = true) {
  const d = new THREE.Vector3().subVectors(o, h);
  const total = d.length();
  d.normalize();
  const from = R_H + 0.08;
  const usable = Math.max(0.1, total - from - R_O - 0.08);
  const seg = usable / (2 * DASHES - 1);
  for (let k = 0; k < DASHES; k++) {
    if (!visible) { hideInstance(mesh, start + k); continue; }
    pa.copy(h).addScaledVector(d, from + 2 * k * seg);
    pb.copy(h).addScaledVector(d, from + (2 * k + 1) * seg);
    placeRod(mesh, start + k, pa, pb);
  }
}

/** Geometries and materials shared by the water scenes. Colours follow the theme palette. */
export function waterKit(ctx: SceneContext) {
  return {
    oGeo: ctx.track(new THREE.SphereGeometry(R_O, 18, 12)),
    hGeo: ctx.track(new THREE.SphereGeometry(R_H, 12, 8)),
    rodGeo: ctx.track(new THREE.CylinderGeometry(R_STICK, R_STICK, 1, 8, 1)),
    dashGeo: ctx.track(new THREE.CylinderGeometry(R_DASH, R_DASH, 1, 6, 1)),
    mO: ctx.material('k', { roughness: 0.35 }),
    // H atoms glow slightly in their own colour so they stay visible on dark backgrounds
    mH: (() => { const m = ctx.material('neutral', { roughness: 0.35 }); m.emissive.copy(m.color); m.emissiveIntensity = 0.5; return m; })(),
    mBond: ctx.material('text', { roughness: 0.6 }),
    mHB: ctx.material('glucose', { roughness: 0.4 }),
  };
}

/** Unit vectors from O to its two H atoms, given the bisector `b` (pointing between the H atoms) and an in-plane perpendicular `e`. */
export function hDirections(b: THREE.Vector3, e: THREE.Vector3): [THREE.Vector3, THREE.Vector3] {
  const c = Math.cos(HALF_ANGLE), s = Math.sin(HALF_ANGLE);
  return [b.clone().multiplyScalar(c).addScaledVector(e, s).normalize(), b.clone().multiplyScalar(c).addScaledVector(e, -s).normalize()];
}

const scene: SceneModule = {
  camera: { position: [1.6, 1.0, 5.4], target: [0, -0.05, 0], fov: 36, minDistance: 3, maxDistance: 14 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const kit = waterKit(ctx);

    const O = new THREE.Vector3(0, 0.25, 0);
    const [d1, d2] = hDirections(new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0));
    const H1 = O.clone().addScaledVector(d1, OH_LEN * 1.6);
    const H2 = O.clone().addScaledVector(d2, OH_LEN * 1.6);
    // The single molecule is drawn 1.6× larger than in the liquid and ice scenes so its parts are easy to see.
    const S = 1.6;

    const oxygen = new THREE.Mesh(kit.oGeo, kit.mO);
    oxygen.position.copy(O);
    oxygen.scale.setScalar(S);
    const h1 = new THREE.Mesh(kit.hGeo, kit.mH);
    h1.position.copy(H1);
    h1.scale.setScalar(S);
    const h2 = h1.clone();
    h2.position.copy(H2);
    root.add(oxygen, h1, h2);

    // Polar covalent bonds (one shared pair of electrons each)
    const bonds = new THREE.InstancedMesh(kit.rodGeo, kit.mBond, 2);
    placeRod(bonds, 0, O, H1, S * 1.1);
    placeRod(bonds, 1, O, H2, S * 1.1);
    root.add(bonds);

    // Bond-angle arc in the H–O–H plane
    const arcR = 0.62;
    const arc = new THREE.Mesh(ctx.track(new THREE.TorusGeometry(arcR, 0.028, 6, 40, THREE.MathUtils.degToRad(104.5))), ctx.material('text', { roughness: 0.6 }));
    arc.position.copy(O);
    arc.rotation.z = Math.atan2(d2.y, d2.x);
    root.add(arc);

    // Partial-charge clouds: electron density is greater around O (δ−) and less around each H (δ+).
    const neg = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(1, 32, 20)), ctx.material('k', { transparent: true, opacity: 0.16, depthWrite: false, roughness: 0.9 }));
    neg.position.copy(O).add(new THREE.Vector3(0, 0.12, 0));
    neg.scale.set(1.2, 1.25, 1.25);
    const mPos = ctx.material('water', { transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.9 });
    const posGeo = ctx.track(new THREE.SphereGeometry(0.62, 24, 16));
    const pos1 = new THREE.Mesh(posGeo, mPos);
    pos1.position.copy(H1).addScaledVector(d1, 0.08);
    const pos2 = new THREE.Mesh(posGeo, mPos);
    pos2.position.copy(H2).addScaledVector(d2, 0.08);
    neg.renderOrder = 2; pos1.renderOrder = 2; pos2.renderOrder = 2;
    root.add(neg, pos1, pos2);

    // Two lone pairs: lobes on the far side of O from the hydrogens, in the plane perpendicular to H–O–H.
    const lobeGeo = ctx.track(new THREE.SphereGeometry(1, 20, 14));
    const mLobe = ctx.material('k', { transparent: true, opacity: 0.42, depthWrite: false, roughness: 0.7 });
    const lonePairs = new THREE.Group();
    const lpHalf = THREE.MathUtils.degToRad(57);
    for (const s of [1, -1]) {
      const u = new THREE.Vector3(0, Math.cos(lpHalf), s * Math.sin(lpHalf));
      const lobe = new THREE.Mesh(lobeGeo, mLobe);
      lobe.scale.set(0.26, 0.44, 0.26);
      lobe.quaternion.setFromUnitVectors(UP, u);
      lobe.position.copy(O).addScaledVector(u, 1.02);
      lobe.renderOrder = 1;
      lonePairs.add(lobe);
      // two small electron dots per lone pair
      for (const k of [-1, 1]) {
        const dot = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(0.06, 8, 6)), ctx.material('text'));
        const side = new THREE.Vector3(1, 0, 0).multiplyScalar(0.09 * k);
        dot.position.copy(O).addScaledVector(u, 1.2).add(side);
        lonePairs.add(dot);
      }
    }
    root.add(lonePairs);

    const bondMid = O.clone().lerp(H2, 0.5);
    const anchors = {
      oxygen: { object: anchorAt(root, O.x + 0.32, O.y + 0.18, 0.45, 'oxygen'), highlight: [oxygen] },
      hydrogen: { object: anchorAt(root, H1.x + 0.2, H1.y - 0.1, 0.32, 'hydrogen'), highlight: [h1, h2] },
      covalent: { object: anchorAt(root, bondMid.x - 0.05, bondMid.y, 0.16, 'covalent'), highlight: [bonds] },
      'delta-minus': { object: anchorAt(root, -0.55, O.y + 0.95, 0.6, 'delta-minus'), highlight: [neg] },
      'delta-plus': { object: anchorAt(root, H2.x - 0.45, H2.y - 0.42, 0.3, 'delta-plus'), highlight: [pos1, pos2] },
      'lone-pairs': { object: anchorAt(root, 0.12, O.y + 0.8, 1.25, 'lone-pairs'), highlight: [lonePairs] },
      angle: { object: anchorAt(root, 0, O.y - arcR - 0.05, 0.05, 'angle'), highlight: [arc] },
    };

    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
