import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt } from '../viewer3d/kit';
import { ease, lerp, phase } from '../lib/timeline';
import { between, curve3, frameAt, halfTube } from './b3-2-kit';

/*
 * B3.2.15 mammalian heart in frontal section (AHL), seen from the front (anterior view).
 *
 * ORIENTATION: +x is the viewer's right, which is the HEART'S LEFT side. So the right atrium and right
 * ventricle are on the viewer's left, the left atrium and left ventricle on the viewer's right, and the
 * apex (formed by the left ventricle) points down and to the viewer's right.
 *
 * The plane z = 0 is the cut face; the anterior half has been removed and we look into the posterior
 * half. Myocardium is a slab from z = −D to 0 with the chambers as recesses; a back wall closes them.
 * Vessels lying in the cut plane are cut open lengthways (only their back half is drawn). The pulmonary
 * trunk lies in front of the aorta, so it is drawn crossing over it; the right pulmonary artery and the
 * pulmonary veins lie behind the heart and are drawn whole. Pulmonary veins open into the back wall of
 * the left atrium (as they do in life).
 *
 * Topology that matters: SVC + IVC → RA → tricuspid valve → RV → pulmonary valve → pulmonary trunk →
 * pulmonary arteries; pulmonary veins → LA → bicuspid (mitral) valve → LV → aortic valve → aorta.
 * LV wall ≈ 2× RV wall; thick interventricular septum; AV valve leaflets tethered by chordae tendineae;
 * coronary arteries leave the aorta just above the aortic valve and run over the outer surface;
 * SAN in the wall of the right atrium near the entry of the superior vena cava.
 */
type P2 = [number, number];
const D = 1.8; // slab depth

// ---------- boundary segments of the cut face (each starts where the previous one ends) ----------
const OUT_MAIN: P2[] = [[-4.8, 0.9], [-4.72, 0], [-4.45, -1.6], [-3.95, -3.2], [-3.0, -4.75], [-1.6, -6.05], [0, -6.85], [1.35, -7.1], [2.3, -6.8], [3.45, -5.6], [4.35, -3.9], [4.95, -2.0], [5.15, -0.3], [5.0, 1.0], [4.95, 2.2], [5.0, 3.2], [4.6, 4.0], [3.6, 4.35], [2.2, 4.35], [1.05, 4.2]];
const ROOT_R: P2[] = [[1.05, 4.2], [1.0, 3.0], [0.97, 1.6], [1.0, 1.0]];
const TIP: P2[] = [[1.0, 1.0], [1.15, 0.72], [1.4, 0.95]];
const LA_L: P2[] = [[1.4, 0.95], [1.5, 2.0], [1.55, 3.35]];
const LA_ROOF: P2[] = [[1.55, 3.35], [2.4, 3.6], [3.6, 3.55], [4.3, 3.1]];
const LA_LAT: P2[] = [[4.3, 3.1], [4.35, 2.0], [4.2, 1.1], [3.95, 0.7]];
const LV_LAT: P2[] = [[3.95, 0.7], [3.45, -0.6], [3.2, -2.4], [2.8, -4.2], [2.2, -5.35], [1.75, -5.6]];
const LV_SEP: P2[] = [[1.75, -5.6], [1.2, -5.0], [0.7, -3.6], [0.45, -2.2], [0.4, -0.7]];
const ROOT_L: P2[] = [[0.4, -0.7], [0.0, 0.2], [-0.45, 1.0], [-0.5, 2.4], [-0.55, 4.2]];
const TOP_MID: P2[] = [[-0.55, 4.2], [-1.4, 4.3], [-2.2, 4.2]];
const SVC_R: P2[] = [[-2.2, 4.2], [-2.2, 3.55]];
const RA_MED: P2[] = [[-2.2, 3.55], [-1.7, 3.2], [-1.55, 2.0], [-1.6, 0.9], [-1.75, 0.4]];
const RV_SEP: P2[] = [[-1.75, 0.4], [-1.05, -0.3], [-0.9, -1.6], [-0.95, -3.2], [-1.25, -4.6]];
const RV_FREE: P2[] = [[-1.25, -4.6], [-2.1, -4.25], [-3.25, -3.0], [-3.8, -1.6], [-4.0, -0.2], [-4.05, 0.4]];
const RA_LAT_LO: P2[] = [[-4.05, 0.4], [-4.3, 0.65], [-4.3, 0.9]];
const IVC_B: P2[] = [[-4.3, 0.9], [-4.8, 0.9]];
// the lateral wall of the right atrium, between the SVC and IVC openings
const P1: P2[][] = [
  [[-3.6, 4.15], [-4.2, 4.05], [-4.65, 3.5], [-4.85, 2.6], [-4.85, 1.9]],
  [[-4.85, 1.9], [-4.3, 1.9]],
  [[-4.3, 1.9], [-4.35, 2.8], [-4.1, 3.35], [-3.6, 3.6]],
  [[-3.6, 3.6], [-3.6, 4.15]],
];

/** Sample a smooth open curve through the points (about `per` samples per unit length). */
function smooth(pts: P2[], per = 7): THREE.Vector2[] {
  if (pts.length === 2) {
    const [a, b] = pts as [P2, P2];
    const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * per));
    return Array.from({ length: n + 1 }, (_, i) => new THREE.Vector2(lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)));
  }
  const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
  const n = Math.max(4, Math.ceil(c.getLength() * per));
  return c.getSpacedPoints(n).map((p) => new THREE.Vector2(p.x, p.y));
}
const chain = (segs: P2[][]) => segs.flatMap((s) => smooth(s).slice(0, -1));
const closedSmooth = (pts: P2[], per = 7) => {
  const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal');
  return c.getSpacedPoints(Math.ceil(c.getLength() * per)).slice(0, -1).map((p) => new THREE.Vector2(p.x, p.y));
};

const scene: SceneModule = {
  camera: { position: [6.8, 3.6, 26.5], target: [0.4, 0.4, -1], fov: 38, minDistance: 8, maxDistance: 60 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const DS = THREE.DoubleSide;
    const mWall = ctx.material('head', { roughness: 0.75 });
    const mDeoxy = ctx.material('protein', { roughness: 0.55 });
    const mOxy = ctx.material('k', { roughness: 0.55 });
    const mDeoxyV = ctx.material('protein', { roughness: 0.5, side: DS });
    const mOxyV = ctx.material('k', { roughness: 0.5, side: DS });
    const mValve = ctx.material('tail', { roughness: 0.5, side: DS });
    const mCord = ctx.material('tail', { roughness: 0.6 });
    const mNode = ctx.material('glucose', { roughness: 0.4, emissive: new THREE.Color(0x3a2a00) });
    const mCoronary = ctx.material('k', { roughness: 0.4 });
    const mHole = ctx.material('text', { roughness: 0.8 });
    const mPartR = ctx.material('protein', { roughness: 0.3 });
    const mPartL = ctx.material('k', { roughness: 0.3, emissive: new THREE.Color(0x551018) });

    const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D = root) => { const o = new THREE.Mesh(g, m); parent.add(o); return o; };
    const extrude = (pts: THREE.Vector2[], z0: number, z1: number) => {
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: z1 - z0, bevelEnabled: false, curveSegments: 1 });
      g.translate(0, 0, z0);
      return ctx.track(g);
    };
    const flat = (pts: THREE.Vector2[], z: number) => { const g = new THREE.ShapeGeometry(new THREE.Shape(pts)); g.translate(0, 0, z); return ctx.track(g); };

    // ---------- myocardium (cut face) ----------
    const mainPts = chain([OUT_MAIN, ROOT_R, TIP, LA_L, LA_ROOF, LA_LAT, LV_LAT, LV_SEP, ROOT_L, TOP_MID, SVC_R, RA_MED, RV_SEP, RV_FREE, RA_LAT_LO, IVC_B]);
    const myocardium = new THREE.Group();
    root.add(myocardium);
    mesh(extrude(mainPts, -D, 0), mWall, myocardium);
    const raWall = mesh(extrude(chain(P1), -D, 0), mWall, myocardium);
    // back wall: the whole silhouette, slightly rounded
    const sil = chain([OUT_MAIN, [[1.05, 4.2], [-0.55, 4.2]], TOP_MID, [[-2.2, 4.2], [-3.6, 4.15]], P1[0]!, [[-4.85, 1.9], [-4.8, 0.9]]]);
    const cx = 0.2, cy = -1.2;
    const backShape = new THREE.Shape(sil.map((p) => new THREE.Vector2(cx + (p.x - cx) * 0.965, cy + (p.y - cy) * 0.97)));
    const backGeo = new THREE.ExtrudeGeometry(backShape, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.18, bevelSegments: 3, curveSegments: 1 });
    backGeo.translate(0, 0, -D - 0.35 - 0.3);
    mesh(ctx.track(backGeo), mWall, myocardium);

    // overlays (same colour as the wall) so the septum and LV wall can be highlighted on their own
    const septumPts = [
      ...smooth(RV_SEP).filter((p) => p.y <= -0.3),
      new THREE.Vector2(0.3, -5.45),
      ...smooth(LV_SEP).filter((p) => p.y <= -0.7 && p.x < 1.25),
    ];
    const septum = mesh(flat(septumPts, 0.006), mWall);
    const outSel = smooth(OUT_MAIN).filter((p) => p.x > 1.7 && p.y < 0.95);
    const lvWall = mesh(flat([...smooth(LV_LAT), ...outSel], 0.006), mWall);

    // ---------- chamber floors: blue = deoxygenated (right side), red = oxygenated (left side) ----------
    const zf = -D + 0.012;
    const raFloor = mesh(flat(closedSmooth([[-4.4, 0.35], [-4.4, 0.95], [-4.8, 0.95], [-4.8, 1.9], [-4.4, 1.9], [-4.4, 3.5], [-3.7, 3.8], [-3.7, 4.15], [-2.1, 4.15], [-2.1, 3.6], [-1.5, 3.2], [-1.45, 0.9], [-1.7, 0.35]], 5), zf), mDeoxy);
    const rvFloor = mesh(flat(closedSmooth([[-4.1, 0.42], [-1.7, 0.42], [-0.98, -0.3], [-0.85, -1.6], [-0.9, -3.2], [-1.2, -4.7], [-2.1, -4.35], [-3.3, -3.05], [-3.88, -1.6], [-4.1, -0.2]], 5), zf), mDeoxy);
    const laFloor = mesh(flat(closedSmooth([[1.4, 0.8], [1.45, 3.45], [2.4, 3.7], [3.6, 3.65], [4.4, 3.15], [4.45, 2.0], [4.3, 1.0], [3.95, 0.74]], 5), zf), mOxy);
    const lvFloor = mesh(flat(closedSmooth([[3.95, 0.68], [3.55, -0.6], [3.3, -2.4], [2.9, -4.2], [2.25, -5.45], [1.75, -5.7], [1.1, -5.05], [0.6, -3.6], [0.35, -2.2], [0.3, -0.7], [-0.1, 0.2], [-0.55, 1.0], [-0.6, 2.4], [-0.6, 4.15], [1.1, 4.15], [1.05, 1.0], [1.15, 0.7]], 5), zf), mOxy);

    // ---------- great vessels ----------
    const aortaC = curve3([[0.25, 1.0, 0], [0.25, 3.5, 0], [0.3, 5.6, 0], [0.8, 7.1, -0.1], [2.0, 7.9, -0.2], [3.5, 7.65, -0.35], [4.4, 6.8, -0.6], [5.0, 5.8, -1.8], [5.2, 3.5, -3.2]]);
    const aorta = new THREE.Group();
    root.add(aorta);
    mesh(halfTube(ctx, aortaC, 0.75, 120), mOxyV, aorta);
    const branchGeo = ctx.track(new THREE.CylinderGeometry(0.28, 0.3, 1, 14, 1, true));
    // three branches from the top of the arch (to the head and arms)
    const archPts = aortaC.getSpacedPoints(200);
    for (const [x, h] of [[1.25, 1.3], [2.1, 1.25], [2.95, 1.15]] as const) {
      const top = archPts.filter((p) => p.y > 6.5).reduce((b, p) => (Math.abs(p.x - x) < Math.abs(b.x - x) ? p : b));
      const b = new THREE.Mesh(branchGeo, mOxyV);
      const base = new THREE.Vector3(top.x, top.y + 0.45, top.z - 0.25);
      between(b, base, base.clone().add(new THREE.Vector3(0.05 * (x - 2), h, 0)), 1);
      aorta.add(b);
    }
    const trunkC = curve3([[-1.25, -1.1, -0.7], [-1.15, -0.1, 0.5], [-0.85, 1.1, 1.25], [-0.1, 2.5, 1.45], [0.9, 3.75, 1.3], [1.65, 4.75, 0.7]]);
    const lpaC = curve3([[1.65, 4.75, 0.7], [2.6, 5.05, 0.3], [4.2, 5.0, 0.0], [6.1, 4.85, -0.3]]);
    const rpaC = curve3([[1.65, 4.75, 0.7], [2.05, 5.0, -0.5], [1.2, 5.1, -1.95], [-1.0, 5.1, -2.05], [-3.5, 5.05, -1.95], [-6.0, 4.85, -1.6]]);
    const pulmonary = new THREE.Group();
    root.add(pulmonary);
    mesh(halfTube(ctx, trunkC, 0.7, 70), mDeoxyV, pulmonary);
    mesh(halfTube(ctx, lpaC, 0.55, 50), mDeoxyV, pulmonary);
    mesh(ctx.track(new THREE.TubeGeometry(rpaC, 70, 0.55, 16, false)), mDeoxyV, pulmonary);
    const svcC = curve3([[-2.9, 3.3, 0], [-2.9, 5.5, 0], [-2.9, 7.4, 0]]);
    const ivcC = curve3([[-3.9, 1.4, 0], [-4.9, 1.4, 0], [-5.55, 0.9, 0], [-5.7, -0.6, 0], [-5.6, -3.6, 0]]);
    const cavae = new THREE.Group();
    root.add(cavae);
    mesh(halfTube(ctx, svcC, 0.7, 40), mDeoxyV, cavae);
    mesh(halfTube(ctx, ivcC, 0.5, 60), mDeoxyV, cavae);
    // four pulmonary veins, from behind the heart into the back wall of the left atrium
    const veins = new THREE.Group();
    root.add(veins);
    const veinEnds: [number, number][] = [[1.95, 2.85], [1.95, 1.65], [3.65, 2.95], [3.65, 1.75]];
    const veinCurves = veinEnds.map(([x, y], i) => {
      const fromLeft = i < 2; // right pulmonary veins come from the right lung (viewer's left)
      const sx = fromLeft ? -6.2 : 6.4;
      return curve3([[sx, y + 0.3, -2.4], [fromLeft ? -3.0 : 5.2, y + 0.15, -2.7], [x, y, -2.75], [x, y, -1.9]], 0.3);
    });
    for (const c of veinCurves) mesh(ctx.track(new THREE.TubeGeometry(c, 60, 0.3, 12, false)), mOxyV, veins);
    const openGeo = ctx.track(new THREE.CircleGeometry(0.27, 20));
    const rimGeo = ctx.track(new THREE.TorusGeometry(0.3, 0.05, 8, 24));
    for (const [x, y] of veinEnds) {
      const o = new THREE.Mesh(openGeo, mHole); o.position.set(x, y, zf + 0.008); veins.add(o);
      const r = new THREE.Mesh(rimGeo, mOxyV); r.position.set(x, y, zf + 0.01); veins.add(r);
    }

    // ---------- coronary arteries on the outer surface (sectioned where the anterior half was removed) ----------
    const coronary = new THREE.Group();
    root.add(coronary);
    const outline = smooth(OUT_MAIN, 10);
    const offsetAlong = (from: P2, to: P2, z: number, push = 0.14) => {
      // walk the outline between the two nearest points, pushed outwards
      const near = (q: P2) => outline.reduce((bi, p, i) => (p.distanceTo(new THREE.Vector2(...q)) < outline[bi]!.distanceTo(new THREE.Vector2(...q)) ? i : bi), 0);
      const a = near(from), b = near(to);
      const pts: THREE.Vector3[] = [];
      const step = a < b ? 1 : -1;
      for (let i = a; step > 0 ? i <= b : i >= b; i += step * 3) {
        const p = outline[i]!;
        const q = outline[Math.min(outline.length - 1, i + 1)]!, r = outline[Math.max(0, i - 1)]!;
        const t = new THREE.Vector2().subVectors(q, r).normalize();
        const n = new THREE.Vector2(t.y, -t.x); // outward for this winding
        pts.push(new THREE.Vector3(p.x + n.x * push, p.y + n.y * push, z));
      }
      return pts;
    };
    const tube = (pts: THREE.Vector3[], r = 0.12) => mesh(ctx.track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(20, pts.length * 4), r, 10, false)), mCoronary, coronary);
    // left coronary: circumflex round the left atrioventricular groove, and a marginal branch down the left side
    tube([new THREE.Vector3(5.16, 0.85, -0.05), new THREE.Vector3(5.16, 0.85, -1.2), new THREE.Vector3(5.12, 0.85, -2.3), new THREE.Vector3(4.6, 0.8, -2.85), new THREE.Vector3(2.2, 0.7, -2.95), new THREE.Vector3(0.2, 0.55, -2.95)]);
    tube(offsetAlong([5.1, 0.4], [2.4, -6.75], -0.55));
    // right coronary: round the right atrioventricular groove to the back, a branch down the right border,
    // and the posterior interventricular branch on the back of the heart
    tube([new THREE.Vector3(-4.88, 0.55, -0.05), new THREE.Vector3(-4.9, 0.55, -1.2), new THREE.Vector3(-4.85, 0.5, -2.3), new THREE.Vector3(-4.3, 0.45, -2.85), new THREE.Vector3(-2.0, 0.45, -2.95), new THREE.Vector3(-0.3, 0.4, -2.95)]);
    tube(offsetAlong([-4.75, 0.2], [-2.6, -5.1], -0.55));
    tube([new THREE.Vector3(-0.3, 0.4, -2.95), new THREE.Vector3(-0.15, -2.5, -2.95), new THREE.Vector3(0.4, -5.6, -2.85), new THREE.Vector3(0.9, -6.6, -2.4)], 0.1);
    // openings (ostia) in the aortic root, just above the aortic valve
    for (const x of [-0.42, 0.92]) { const o = new THREE.Mesh(ctx.track(new THREE.CircleGeometry(0.11, 14)), mHole); o.position.set(x, 1.78, -0.3); o.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; coronary.add(o); }

    // ---------- sinoatrial and atrioventricular nodes ----------
    const nodeGeo = ctx.track(new THREE.SphereGeometry(1, 20, 12));
    const san = new THREE.Mesh(nodeGeo, mNode);
    san.position.set(-3.98, 3.78, 0.0);
    san.scale.set(0.34, 0.2, 0.09);
    root.add(san);
    const avn = new THREE.Mesh(nodeGeo, mNode);
    avn.position.set(-1.2, 0.75, 0.0);
    avn.scale.set(0.2, 0.13, 0.07);
    root.add(avn);

    // ---------- valves ----------
    type Leaf = { pivot: THREE.Group; open: number; closed: number };
    const leaf = (parent: THREE.Object3D, at: P2, len: number, open: number, closed: number, z0: number, z1: number, thick = 0.07): Leaf => {
      const pivot = new THREE.Group();
      pivot.position.set(at[0], at[1], 0);
      const g = ctx.track(new THREE.BoxGeometry(len, thick, z1 - z0));
      g.translate(len / 2, 0, (z0 + z1) / 2);
      pivot.add(new THREE.Mesh(g, mValve));
      parent.add(pivot);
      return { pivot, open, closed };
    };
    const deg = Math.PI / 180;
    const tricuspid = new THREE.Group(), bicuspid = new THREE.Group(), aorticV = new THREE.Group(), pulmonaryV = new THREE.Group();
    root.add(tricuspid, bicuspid, aorticV, pulmonaryV);
    const triL = [leaf(tricuspid, [-4.05, 0.4], 1.22, -78 * deg, -12 * deg, -0.12, -1.65), leaf(tricuspid, [-1.75, 0.4], 1.22, -102 * deg, -168 * deg, -0.12, -1.65)];
    const mitL = [leaf(bicuspid, [1.15, 0.72], 1.45, -80 * deg, -6 * deg, -0.12, -1.65), leaf(bicuspid, [3.95, 0.7], 1.45, -100 * deg, -174 * deg, -0.12, -1.65)];
    const aorL = [leaf(aorticV, [-0.45, 1.22], 0.74, 84 * deg, 16 * deg, -0.04, -0.68, 0.06), leaf(aorticV, [0.95, 1.22], 0.74, 96 * deg, 164 * deg, -0.04, -0.68, 0.06)];
    // pulmonary valve: built in the trunk's own frame (x = N, y = T, z = B), back half only
    const pf = frameAt(trunkC, 0.24);
    const pBasis = new THREE.Matrix4().makeBasis(pf.N, pf.T, pf.B);
    pulmonaryV.position.copy(pf.P);
    pulmonaryV.quaternion.setFromRotationMatrix(pBasis);
    const pulL = [leaf(pulmonaryV, [-0.66, 0], 0.7, 84 * deg, 16 * deg, -0.04, -0.62, 0.06), leaf(pulmonaryV, [0.66, 0], 0.7, 96 * deg, 164 * deg, -0.04, -0.62, 0.06)];

    // chordae tendineae from papillary muscles to the AV leaflet tips
    const papGeo = ctx.track(new THREE.ConeGeometry(0.28, 1.0, 12));
    const cordGeo = ctx.track(new THREE.CylinderGeometry(0.025, 0.025, 1, 5));
    type Cord = { leaf: Leaf; len: number; base: THREE.Vector3; mesh: THREE.Mesh };
    const cords: Cord[] = [];
    const papillary = (parent: THREE.Object3D, base: P2, dir: number, targets: { leaf: Leaf; len: number }[]) => {
      const p = new THREE.Mesh(papGeo, mWall);
      p.position.set(base[0], base[1], -0.9);
      p.rotation.z = dir;
      parent.add(p);
      const tip = new THREE.Vector3(base[0] - Math.sin(dir) * 0.45, base[1] + Math.cos(dir) * 0.45, -0.9);
      for (const t of targets) for (const z of [-0.5, -1.3]) {
        const m = new THREE.Mesh(cordGeo, mCord);
        parent.add(m);
        cords.push({ leaf: t.leaf, len: t.len, base: tip.clone().setZ(z * 0.6 - 0.6), mesh: m });
      }
    };
    papillary(tricuspid, [-3.15, -2.55], -0.5, [{ leaf: triL[0]!, len: 1.22 }]);
    papillary(tricuspid, [-1.35, -2.3], 0.25, [{ leaf: triL[1]!, len: 1.22 }]);
    papillary(bicuspid, [2.85, -2.75], 0.35, [{ leaf: mitL[1]!, len: 1.45 }]);
    papillary(bicuspid, [1.05, -2.6], -0.3, [{ leaf: mitL[0]!, len: 1.45 }]);

    const setValves = (k: { av: number; sl: number }) => {
      // 1 = open, 0 = closed
      for (const l of [...triL, ...mitL]) l.pivot.rotation.z = lerp(l.closed, l.open, k.av);
      for (const l of [...aorL, ...pulL]) l.pivot.rotation.z = lerp(l.closed, l.open, k.sl);
      for (const c of cords) {
        const a = c.leaf.pivot.rotation.z;
        const tip = new THREE.Vector3(c.leaf.pivot.position.x + Math.cos(a) * c.len * 0.92, c.leaf.pivot.position.y + Math.sin(a) * c.len * 0.92, c.base.z);
        between(c.mesh, c.base, tip);
      }
    };

    // ---------- blood flow, step by step ----------
    const pts = (c: THREE.Curve<THREE.Vector3>, n = 12) => c.getSpacedPoints(n).map((p) => [p.x, p.y, p.z] as [number, number, number]);
    const flows: { curves: THREE.CatmullRomCurve3[]; left: boolean }[] = [
      { left: false, curves: [curve3([[-2.9, 7.2, -0.2], [-2.9, 4.6, -0.35], [-2.95, 2.6, -0.9]]), curve3([[-5.6, -3.4, -0.2], [-5.65, -0.4, -0.25], [-5.3, 1.15, -0.3], [-4.3, 1.4, -0.6], [-3.2, 1.75, -0.9]])] },
      { left: false, curves: [curve3([[-3.0, 2.5, -0.9], [-2.9, 0.4, -0.9], [-2.6, -1.6, -0.9], [-2.1, -3.4, -0.9]])] },
      { left: false, curves: [curve3([[-2.4, -3.2, -0.9], [-1.6, -1.9, -0.8], ...pts(trunkC).slice(1), ...pts(lpaC).slice(1)]), curve3([[-2.4, -3.2, -0.9], [-1.6, -1.9, -0.8], ...pts(trunkC).slice(1), ...pts(rpaC).slice(1)])] },
      { left: true, curves: veinCurves.map((c) => { const e = c.getPointAt(1); return curve3([...pts(c, 8), [e.x, e.y, -1.2], [lerp(e.x, 2.8, 0.6), lerp(e.y, 2.2, 0.6), -0.9]]); }) },
      { left: true, curves: [curve3([[3.0, 2.6, -0.9], [2.7, 0.8, -0.9], [2.5, -1.5, -0.9], [2.0, -4.2, -0.9]])] },
      { left: true, curves: [curve3([[2.1, -4.3, -0.9], [1.7, -2.0, -0.9], [0.8, -0.3, -0.7], [0.25, 1.15, -0.35], ...pts(aortaC, 16).slice(1)])] },
    ];
    // valve state during each step (1 open, 0 closed): the two sides of the heart work together
    const VALVES = [{ av: 0, sl: 1 }, { av: 1, sl: 0 }, { av: 0, sl: 1 }, { av: 0, sl: 1 }, { av: 1, sl: 0 }, { av: 0, sl: 1 }];
    const partGeo = ctx.track(new THREE.SphereGeometry(0.17, 10, 8));
    const partR = new THREE.InstancedMesh(partGeo, mPartR, 120);
    const partL = new THREE.InstancedMesh(partGeo, mPartL, 120);
    partR.count = 0; partL.count = 0;
    root.add(partR, partL);
    const headGeo = ctx.track(new THREE.ConeGeometry(0.3, 0.7, 14));
    const heads = flows.map((f) => f.curves.map((c) => {
      const h = new THREE.Mesh(headGeo, f.left ? mPartL : mPartR);
      const e = c.getPointAt(1);
      h.position.copy(e);
      h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.getTangentAt(1));
      h.visible = false;
      root.add(h);
      return h;
    }));
    const o = new THREE.Object3D();

    const render = (index: number, t: number) => {
      const prev = VALVES[(index + VALVES.length - 1) % VALVES.length]!;
      const cur = VALVES[index]!;
      const k = ease(phase(t, 0, 0.25));
      setValves({ av: lerp(prev.av, cur.av, k), sl: lerp(prev.sl, cur.sl, k) });
      const f = flows[index]!;
      const im = f.left ? partL : partR;
      (f.left ? partR : partL).count = 0;
      let n = 0;
      for (const c of f.curves) {
        const count = Math.max(6, Math.round(c.getLength() * 1.4));
        for (let i = 0; i < count && n < 120; i++) {
          const u = ((i + t * 3) / count) % 1;
          o.position.copy(c.getPointAt(u));
          o.updateMatrix();
          im.setMatrixAt(n++, o.matrix);
        }
      }
      im.count = n;
      im.instanceMatrix.needsUpdate = true;
      heads.forEach((hs, i) => hs.forEach((h) => (h.visible = i === index)));
    };
    render(0, 0);

    const anchors = {
      ra: { object: anchorAt(root, -3.1, 2.3, -0.6, 'ra'), highlight: [raFloor, raWall] },
      la: { object: anchorAt(root, 3.0, 2.4, -0.6, 'la'), highlight: [laFloor] },
      rv: { object: anchorAt(root, -2.55, -2.0, -0.6, 'rv'), highlight: [rvFloor] },
      // on the thick LV wall's cut face, lower down (cavity edge x ≈ 2.8, outer edge x ≈ 4.1 at y = -4.4), so it no longer crowds the coronary label
      lv: { object: anchorAt(root, 3.45, -4.4, 0.02, 'lv'), highlight: [lvWall, lvFloor] },
      septum: { object: anchorAt(root, -0.25, -3.3, 0.02, 'septum'), highlight: [septum] },
      tricuspid: { object: anchorAt(root, -2.3, 0.15, -0.2, 'tricuspid'), highlight: [tricuspid] },
      bicuspid: { object: anchorAt(root, 2.2, 0.35, -0.2, 'bicuspid'), highlight: [bicuspid] },
      semilunar: { object: anchorAt(root, 0.25, 1.45, -0.15, 'semilunar'), highlight: [aorticV, pulmonaryV] },
      'vena-cava': { object: anchorAt(root, -2.9, 6.2, -0.05, 'vena-cava'), highlight: [cavae] },
      'pulmonary-artery': { object: anchorAt(root, 0.45, 3.2, 1.5, 'pulmonary-artery'), highlight: [pulmonary] },
      'pulmonary-veins': { object: anchorAt(root, 5.9, 3.05, -2.2, 'pulmonary-veins'), highlight: [veins] },
      aorta: { object: anchorAt(root, 2.3, 7.9, -0.2, 'aorta'), highlight: [aorta] },
      coronary: { object: anchorAt(root, 5.0, -2.5, -0.55, 'coronary'), highlight: [coronary] },
      san: { object: anchorAt(root, -3.98, 3.78, 0.1, 'san'), highlight: [san] },
    };
    return { anchors, durations: [5, 5, 6, 5, 5, 6], render, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
