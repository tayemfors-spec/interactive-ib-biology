import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry, setInstance } from '../viewer3d/kit';

/*
 * A2.3 HIV-1, an enveloped retrovirus. 1 unit ≈ 10 nm (virion ≈ 110 nm across).
 * From outside in: lipid bilayer envelope taken from the host cell's plasma membrane, carrying
 * envelope glycoprotein spikes (gp120 heads on gp41 stalks; few per virion); a layer of matrix protein;
 * a cone-shaped capsid; inside it TWO copies of single-stranded RNA coated with nucleocapsid protein,
 * plus the viral enzymes reverse transcriptase and integrase. A wedge is cut away to show the inside.
 */
const R_OUT = 5.4;
const R_TAIL = 5.17;
const R_IN = 4.95;
const R_MATRIX = 4.72;
const CAM: [number, number, number] = [7, 5, 20];
const WEDGE = 0.85; // half-width (radians) of the cut-away window
const TH = 1.95; // the window runs from the top down to this polar angle; the lower part is left whole

const scene: SceneModule = {
  camera: { position: CAM, target: [0, 0, 0], fov: 38, minDistance: 8, maxDistance: 46 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);

    const mHead = ctx.material('head', { roughness: 0.5, side: THREE.DoubleSide });
    const mTail = ctx.material('tail', { roughness: 0.75, side: THREE.DoubleSide });
    const mMatrix = ctx.material('protein2', { roughness: 0.55, side: THREE.DoubleSide });
    const mCapsid = ctx.material('protein', { roughness: 0.45, side: THREE.DoubleSide, flatShading: true });
    const mGp41 = ctx.material('water', { roughness: 0.5 });
    const mGp120 = ctx.material('carb', { roughness: 0.5 });
    const mRNA = ctx.material('k', { roughness: 0.4 });
    const mNC = ctx.material('neutral', { roughness: 0.5 });
    const mRT = ctx.material('glucose', { roughness: 0.45 });
    const mInt = ctx.material('chol', { roughness: 0.45 });

    // Sphere/lathe angles: the wedge faces the default camera.
    const view = new THREE.Vector3(...CAM).normalize();
    const phiC = Math.atan2(view.z, -view.x); // SphereGeometry: x = −cos φ sin θ, z = sin φ sin θ
    const phiStart = phiC + WEDGE;
    const phiLen = Math.PI * 2 - 2 * WEDGE;
    const shellAt = (r: number, phi: number, theta: number) =>
      new THREE.Vector3(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta));
    const shell = (r: number, mat: THREE.Material) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(ctx.track(new THREE.SphereGeometry(r, 48, 20, phiStart, phiLen, 0, TH)), mat));
      g.add(new THREE.Mesh(ctx.track(new THREE.SphereGeometry(r, 48, 12, 0, Math.PI * 2, TH, Math.PI - TH)), mat));
      root.add(g);
      return g;
    };

    // ---------- envelope: a phospholipid bilayer from the host plasma membrane ----------
    const envelope = new THREE.Group();
    const outerHeads = shell(R_OUT, mHead);
    const core = shell(R_TAIL, mTail);
    const innerHeads = shell(R_IN, mHead);
    envelope.add(outerHeads, core, innerHeads);
    root.add(envelope);
    const matrix = shell(R_MATRIX, mMatrix);

    // ---------- envelope glycoprotein spikes (gp120 on gp41) ----------
    const inWedge = (dir: THREE.Vector3) => {
      const phi = Math.atan2(dir.z, -dir.x);
      let d = Math.abs(phi - phiC) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      return d < WEDGE + 0.28 && Math.acos(dir.y) < TH + 0.25;
    };
    const stalkGeo = ctx.track(new THREE.CylinderGeometry(0.2, 0.26, 1.15, 10));
    const lobeGeo = ctx.track(new THREE.SphereGeometry(0.4, 14, 10));
    const total = 16;
    const spikes: { dir: THREE.Vector3; group: THREE.Group }[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < total; i++) {
      const y = 1 - (2 * (i + 0.5)) / total;
      const rr = Math.sqrt(1 - y * y);
      const dir = new THREE.Vector3(Math.cos(i * golden) * rr, y, Math.sin(i * golden) * rr);
      if (inWedge(dir)) continue;
      const g = new THREE.Group();
      g.quaternion.setFromUnitVectors(up, dir);
      const stalk = new THREE.Mesh(stalkGeo, mGp41);
      stalk.position.y = R_IN + 0.55;
      g.add(stalk);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        const lobe = new THREE.Mesh(lobeGeo, mGp120);
        lobe.position.set(Math.cos(a) * 0.34, R_OUT + 0.95, Math.sin(a) * 0.34);
        g.add(lobe);
      }
      root.add(g);
      spikes.push({ dir, group: g });
    }
    const facing = [...spikes].sort((a, b) => b.dir.dot(view) - a.dir.dot(view));

    // ---------- cone-shaped capsid ----------
    const coneGroup = new THREE.Group();
    coneGroup.rotation.set(0.15, 0, -0.62);
    root.add(coneGroup);
    coneGroup.updateMatrixWorld(true);
    const profile: THREE.Vector2[] = [];
    for (let k = 0; k <= 6; k++) { const a = -Math.PI / 2 + (k / 6) * (Math.PI / 2); profile.push(new THREE.Vector2(0.78 * Math.cos(a) + 0.01, -3.7 + 0.78 * Math.sin(a))); }
    profile.push(new THREE.Vector2(2.45, 2.95));
    for (let k = 1; k <= 6; k++) { const a = (k / 6) * (Math.PI / 2); profile.push(new THREE.Vector2(2.45 * Math.cos(a) + 0.01, 2.95 + 1.05 * Math.sin(a))); }
    const coneRadius = (y: number) => (y < -3.7 ? 0.5 : y > 2.95 ? 2.0 : 0.78 + ((y + 3.7) / 6.65) * (2.45 - 0.78));
    // local view direction, to open the capsid towards the camera
    const localView = view.clone().applyQuaternion(coneGroup.quaternion.clone().invert());
    const cPhi = Math.atan2(localView.x, localView.z); // lathe: x = r sin φ, z = r cos φ
    const capsid = new THREE.Mesh(ctx.track(new THREE.LatheGeometry(profile, 12, cPhi + 0.95, Math.PI * 2 - 1.9)), mCapsid);
    coneGroup.add(capsid);

    // ---------- two copies of single-stranded RNA, coated with nucleocapsid protein ----------
    const strands: THREE.CatmullRomCurve3[] = [];
    for (let s = 0; s < 2; s++) {
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= 34; j++) {
        const y = -2.9 + (j / 34) * 5.6;
        const rmax = coneRadius(y) - 0.45;
        const th = j * 0.95 + s * Math.PI;
        const rr = rmax * (0.45 + 0.4 * Math.abs(Math.sin(j * 1.27 + s * 2)));
        pts.push(new THREE.Vector3(rr * Math.sin(th), y, rr * Math.cos(th)));
      }
      strands.push(new THREE.CatmullRomCurve3(pts));
    }
    const rnaGroup = new THREE.Group();
    for (const c of strands) rnaGroup.add(new THREE.Mesh(ctx.track(new THREE.TubeGeometry(c, 260, 0.075, 6, false)), mRNA));
    coneGroup.add(rnaGroup);
    const ncGeo = ctx.track(new THREE.SphereGeometry(0.15, 10, 8));
    const nBeads = 46;
    const nc = new THREE.InstancedMesh(ncGeo, mNC, nBeads * 2);
    const tmp = new THREE.Vector3();
    strands.forEach((c, s) => { for (let i = 0; i < nBeads; i++) setInstance(nc, s * nBeads + i, c.getPoint((i + 0.5) / nBeads, tmp)); });
    nc.instanceMatrix.needsUpdate = true;
    coneGroup.add(nc);

    // ---------- viral enzymes inside the capsid ----------
    const rt = new THREE.Group();
    const rtA = new THREE.Mesh(ctx.track(blobGeometry(0.42, 1.1, 71, 0.12, 14)), mRT);
    const rtB = new THREE.Mesh(ctx.track(blobGeometry(0.36, 0.9, 72, 0.12, 14)), mRT);
    rtA.position.set(0, 0, 0); rtB.position.set(0.55, 0.15, 0.1); rtB.rotation.z = 0.6;
    rt.add(rtA, rtB);
    rt.position.set(0.7, 2.1, 0.9);
    const integrase = new THREE.Group();
    for (const [x, y, z] of [[0, 0, 0], [0.42, 0.1, 0.05]] as const) {
      const m = new THREE.Mesh(ctx.track(blobGeometry(0.28, 0.7, 80 + x * 10, 0.12, 12)), mInt);
      m.position.set(x, y, z);
      integrase.add(m);
    }
    integrase.position.set(-1.0, 0.6, 0.7);
    coneGroup.add(rt, integrase);

    // ---------- label anchors ----------
    const envAt = shellAt(R_OUT + 0.02, phiStart + 0.25, 1.05);
    const matrixAt = shellAt(R_MATRIX - 0.05, phiC - 0.35, TH);
    const s1 = facing[0]!, s2 = facing[2] ?? facing[1]!;
    const gp120At = s1.dir.clone().multiplyScalar(R_OUT + 1.35);
    const gp41At = s2.dir.clone().multiplyScalar(R_IN + 0.75);
    const capsidLocal = new THREE.Vector3(2.1 * Math.sin(cPhi + 1.2), 2.4, 2.1 * Math.cos(cPhi + 1.2));
    const rnaLocal = strands[0]!.getPoint(0.33);
    const ncLocal = strands[1]!.getPoint((14 + 0.5) / nBeads);
    const anchors = {
      envelope: { object: anchorAt(root, envAt.x, envAt.y, envAt.z, 'envelope'), highlight: [envelope] },
      gp120: { object: anchorAt(root, gp120At.x, gp120At.y, gp120At.z, 'gp120'), highlight: spikes.map((s) => s.group) },
      gp41: { object: anchorAt(root, gp41At.x, gp41At.y, gp41At.z, 'gp41'), highlight: spikes.map((s) => s.group.children[0]!) },
      matrix: { object: anchorAt(root, matrixAt.x, matrixAt.y, matrixAt.z, 'matrix'), highlight: [matrix] },
      capsid: { object: anchorAt(coneGroup, capsidLocal.x, capsidLocal.y, capsidLocal.z, 'capsid'), highlight: [capsid] },
      rna: { object: anchorAt(coneGroup, rnaLocal.x, rnaLocal.y, rnaLocal.z, 'rna'), highlight: [rnaGroup] },
      nucleocapsid: { object: anchorAt(coneGroup, ncLocal.x, ncLocal.y, ncLocal.z, 'nucleocapsid'), highlight: [nc] },
      rt: { object: anchorAt(rt, 0.2, 0.3, 0.3, 'rt'), highlight: [rt] },
      integrase: { object: anchorAt(integrase, 0.2, 0.2, 0.3, 'integrase'), highlight: [integrase] },
    };

    return {
      anchors,
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
