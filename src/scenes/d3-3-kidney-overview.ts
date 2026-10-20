import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt } from '../viewer3d/kit';
import { curve, tube, type V3 } from './d3-3-kit';

/*
 * D3.3.7 (AHL): a kidney cut in half in the frontal plane, seen from the front, with the anterior half
 * removed. The hilum (where vessels and ureter enter and leave) faces the viewer's left, i.e. medially.
 *
 * Topology that matters: an outer cortex; inner medulla made of renal pyramids whose bases face the
 * cortex and whose tips (papillae) open into the cup-like calyces of the renal pelvis; cortex dips
 * between the pyramids (renal columns); the pelvis narrows into the ureter, which leaves at the hilum
 * and runs down to the bladder. At the hilum the renal vein lies in front of the renal artery, and the
 * pelvis/ureter lies behind both. One nephron is drawn far larger than to scale: corpuscle in the
 * cortex, loop of Henle dipping into a pyramid, collecting duct opening at the papilla.
 */
type P2 = [number, number];
const OUTLINE: P2[] = [[-1.2, 4.2], [0.4, 5.0], [2.3, 4.7], [3.6, 3.1], [4.15, 0.6], [3.95, -2.2], [2.95, -4.2], [1.1, -5.05], [-0.7, -4.65], [-1.55, -3.4], [-1.35, -2.0], [-0.7, -1.3], [-0.6, 0.9], [-1.25, 2.0], [-1.6, 3.2]];
const S = new THREE.Vector2(0.45, -0.05); // centre of the renal sinus
const D = 2.2; // depth of the half-kidney behind the cut face
const ANGLES = [112, 76, 38, 0, -38, -76, -112].map((d) => (d * Math.PI) / 180);

function inside(p: THREE.Vector2, poly: THREE.Vector2[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!, b = poly[j]!;
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

const scene: SceneModule = {
  camera: { position: [-3.2, 1.2, 21], target: [0.2, -0.9, -0.6], fov: 38, minDistance: 7, maxDistance: 45 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const mCortex = ctx.material('head', { roughness: 0.75 });
    const mMed = ctx.material('chol', { roughness: 0.7 });
    const mStria = ctx.material('k', { roughness: 0.7 });
    const mPelvis = ctx.material('tail', { roughness: 0.6, side: THREE.DoubleSide });
    const mArt = ctx.material('k', { roughness: 0.45 });
    const mVein = ctx.material('protein', { roughness: 0.45 });
    const mNeph = ctx.material('carb', { roughness: 0.4 });

    const smoothClosed = (pts: P2[], n = 160) => new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal').getSpacedPoints(n).slice(0, -1).map((p) => new THREE.Vector2(p.x, p.y));
    const outline = smoothClosed(OUTLINE);

    // kidney body: cut face at z = 0, rounded back
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(outline), { depth: D, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.35, bevelSegments: 4, curveSegments: 1 });
    g.translate(0, 0, -D - 0.0);
    // the bevel adds 0.6 in front of z = 0 too: flatten the front so the cut face is exactly at z = 0
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) if (pos.getZ(i) > 0) pos.setZ(i, 0);
    g.computeVertexNormals();
    const body = new THREE.Mesh(ctx.track(g), mCortex);
    root.add(body);

    const flat = (pts: THREE.Vector2[], z: number, m: THREE.Material, parent: THREE.Object3D = root) => {
      const sg = new THREE.ShapeGeometry(new THREE.Shape(pts));
      sg.translate(0, 0, z);
      const mesh = new THREE.Mesh(ctx.track(sg), m);
      parent.add(mesh);
      return mesh;
    };

    // distance from the sinus centre to the outline along a direction
    const reach = (dir: THREE.Vector2) => { let r = 0.5; while (r < 8 && inside(S.clone().addScaledVector(dir, r), outline)) r += 0.02; return r; };

    // ---------- medulla: renal pyramids ----------
    const medulla = new THREE.Group();
    root.add(medulla);
    const apexes: { a: number; apex: THREE.Vector2; base: number }[] = [];
    for (const a of ANGLES) {
      const dir = new THREE.Vector2(Math.cos(a), Math.sin(a));
      const perp = new THREE.Vector2(-dir.y, dir.x);
      const R = reach(dir);
      const baseR = Math.max(2.1, R - 0.8), apexR = 1.3;
      const half = 0.6 + 0.08 * (baseR - 2);
      const apex = S.clone().addScaledVector(dir, apexR);
      const pts: THREE.Vector2[] = [apex.clone().addScaledVector(perp, 0.12)];
      for (let k = 0; k <= 8; k++) {
        const s = 1 - (2 * k) / 8;
        pts.push(S.clone().addScaledVector(dir, baseR + 0.18 * (1 - s * s)).addScaledVector(perp, half * s));
      }
      pts.push(apex.clone().addScaledVector(perp, -0.12));
      flat(pts, 0.01, mMed, medulla);
      // striations: collecting ducts and loops of Henle running from base to tip
      for (const s of [-0.5, -0.2, 0.1, 0.4]) {
        const from = S.clone().addScaledVector(dir, baseR - 0.1).addScaledVector(perp, half * s);
        const to = apex.clone().addScaledVector(perp, 0.05 * s);
        const st = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(0.018, 0.018, 1, 4)), mStria);
        const mid = from.clone().add(to).multiplyScalar(0.5);
        st.position.set(mid.x, mid.y, 0.02);
        st.scale.y = from.distanceTo(to);
        st.rotation.z = Math.atan2(to.y - from.y, to.x - from.x) - Math.PI / 2;
        medulla.add(st);
      }
      apexes.push({ a, apex, base: baseR });
    }

    // ---------- renal pelvis with calyces, opening at the hilum ----------
    const pelvisPts: THREE.Vector2[] = [new THREE.Vector2(-0.95, -0.35)];
    for (const { a } of apexes) {
      const at = (r: number, da: number) => S.clone().add(new THREE.Vector2(Math.cos(a + da), Math.sin(a + da)).multiplyScalar(r));
      pelvisPts.push(at(1.0, 0.3), at(1.62, 0.24), at(1.38, 0), at(1.62, -0.24), at(1.0, -0.3));
    }
    pelvisPts.push(new THREE.Vector2(-0.9, -1.75));
    const pelvisFace = flat(pelvisPts, 0.005, mPelvis);
    const pelvisBack = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(1.0, 20, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), mPelvis);
    pelvisBack.rotation.x = -Math.PI / 2;
    pelvisBack.position.set(0.0, -0.4, 0);
    pelvisBack.scale.set(1.2, 1.2, 0.8);
    root.add(pelvisBack);
    const pelvis = new THREE.Group();
    pelvis.add(pelvisFace);

    // ureter: leaves the pelvis at the hilum (behind the vessels) and runs down to the bladder
    const ureterC = curve([[-0.6, -1.2, -0.5], [-1.4, -1.9, -0.6], [-1.9, -3.2, -0.6], [-2.1, -5.0, -0.6], [-2.15, -7.2, -0.6]]);
    const ureter = tube(ctx, root, ureterC, 0.26, mPelvis, 60);

    // ---------- blood vessels ----------
    const artery = new THREE.Group();
    root.add(artery);
    tube(ctx, artery, curve([[-5.0, 1.05, -0.4], [-2.6, 1.0, -0.35], [-1.0, 0.75, -0.25], [-0.2, 0.55, -0.05]]), 0.24, mArt, 50);
    // interlobar arteries in the renal columns between pyramids, arching (arcuate) along the pyramid bases
    for (let i = 0; i < apexes.length - 1; i++) {
      const a = (apexes[i]!.a + apexes[i + 1]!.a) / 2;
      const dir = new THREE.Vector2(Math.cos(a), Math.sin(a));
      const r1 = Math.min(apexes[i]!.base, apexes[i + 1]!.base) + 0.05;
      const pts: V3[] = [[S.x + dir.x * 1.1, S.y + dir.y * 1.1, 0.04], [S.x + dir.x * (r1 * 0.6 + 0.4), S.y + dir.y * (r1 * 0.6 + 0.4), 0.04], [S.x + dir.x * r1, S.y + dir.y * r1, 0.04]];
      tube(ctx, artery, curve(pts), 0.05, mArt, 16, 6);
    }
    const vein = new THREE.Group();
    root.add(vein);
    tube(ctx, vein, curve([[-0.3, -0.25, 0.25], [-1.1, -0.35, 0.5], [-2.6, -0.4, 0.65], [-5.0, -0.45, 0.7]]), 0.32, mVein, 50);

    // ---------- one nephron (not to scale) in the pyramid pointing right ----------
    const nephron = new THREE.Group();
    root.add(nephron);
    const pr = apexes[3]!; // angle 0
    const top = pr.base + 0.45;
    const nx = (r: number) => S.x + r;
    const corp = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(0.17, 14, 10)), mNeph);
    corp.position.set(nx(top), S.y + 0.42, 0.06);
    nephron.add(corp);
    tube(ctx, nephron, curve([[nx(top), S.y + 0.42, 0.06], [nx(top + 0.15), S.y + 0.2, 0.06], [nx(top - 0.05), S.y + 0.05, 0.06], [nx(1.75), S.y + 0.02, 0.06], [nx(1.6), S.y - 0.12, 0.06], [nx(pr.base + 0.2), S.y - 0.2, 0.06], [nx(top - 0.1), S.y - 0.35, 0.06], [nx(top + 0.05), S.y - 0.55, 0.06]]), 0.045, mNeph, 80, 6);
    tube(ctx, nephron, curve([[nx(top + 0.05), S.y - 0.55, 0.06], [nx(pr.base - 0.2), S.y - 0.62, 0.06], [nx(1.45), S.y - 0.3, 0.06]]), 0.06, ctx.material('glucose', { roughness: 0.4 }), 40, 6);

    const anchors = {
      cortex: { object: anchorAt(root, 2.7, 4.15, 0.05, 'cortex'), highlight: [body] },
      medulla: { object: anchorAt(root, S.x + Math.cos(ANGLES[5]!) * 2.3, S.y + Math.sin(ANGLES[5]!) * 2.3, 0.06, 'medulla'), highlight: [medulla] },
      pelvis: { object: anchorAt(root, -0.1, 0.05, 0.08, 'pelvis'), highlight: [pelvis, pelvisBack] },
      ureter: { object: anchorAt(root, -2.1, -5.5, -0.3, 'ureter'), highlight: [ureter] },
      artery: { object: anchorAt(root, -3.6, 1.05, -0.1, 'artery'), highlight: [artery] },
      vein: { object: anchorAt(root, -3.9, -0.42, 1.0, 'vein'), highlight: [vein] },
      nephron: { object: anchorAt(root, nx(top), S.y + 0.42, 0.25, 'nephron'), highlight: [nephron] },
    };
    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
