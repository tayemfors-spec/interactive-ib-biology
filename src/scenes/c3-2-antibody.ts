import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry } from '../viewer3d/kit';

/*
 * C3.2 an antibody (IgG), schematic. Topology that matters: four polypeptide chains — two identical
 * heavy chains (four domains each: VH, CH1 in the arm; CH2, CH3 in the stem) and two identical light
 * chains (two domains each: VL, CL, on the outer side of each arm). Disulfide bonds join each light
 * chain to a heavy chain, and the two heavy chains to each other at the flexible hinge. The variable
 * domains (VH + VL) at the tip of each arm form two identical antigen-binding sites; one antigen is bound.
 * The rest (the constant region) is the same in all antibodies of this class.
 */
const ARM_ANGLE = 0.72; // radians from vertical
const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

const scene: SceneModule = {
  camera: { position: [0, 0.6, 19], target: [0, 0.6, 0], fov: 38, minDistance: 8, maxDistance: 36 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const mHeavy = ctx.material('protein', { roughness: 0.5 });
    const mLight = ctx.material('protein2', { roughness: 0.5 });
    const mVar = ctx.material('carb', { roughness: 0.45 });
    const mSS = ctx.material('glucose', { roughness: 0.4 });
    const mAntigen = ctx.material('k', { roughness: 0.5 });
    const mHinge = ctx.material('protein', { roughness: 0.5 });

    // one immunoglobulin domain ≈ a lumpy ellipsoid
    const dom = (seed: number) => ctx.track(blobGeometry(0.62, 1.75, seed, 0.1, 18));
    const place = (mesh: THREE.Mesh, pos: THREE.Vector3, along: THREE.Vector3) => {
      mesh.position.copy(pos);
      mesh.quaternion.setFromUnitVectors(v(0, 1, 0), along.clone().normalize());
      root.add(mesh);
      return mesh;
    };

    const heavy: THREE.Object3D[][] = [[], []];
    const light: THREE.Object3D[][] = [[], []];
    const variable: THREE.Object3D[] = [];
    const ss: THREE.Object3D[] = [];
    const ssGeo = ctx.track(new THREE.CylinderGeometry(0.15, 0.15, 1, 10));
    const bond = (a: THREE.Vector3, b: THREE.Vector3) => {
      const m = new THREE.Mesh(ssGeo, mSS);
      const d = b.clone().sub(a);
      m.scale.set(1, d.length(), 1);
      place(m, a.clone().add(b).multiplyScalar(0.5), d);
      ss.push(m);
    };

    const hinge = v(0, 0.2);
    let tipLeft = v(0, 0), siteLeft = v(0, 0), constLabel = v(0, 0), varLabel = v(0, 0), lightLabel = v(0, 0), heavyLabel = v(0, 0);
    ([-1, 1] as const).forEach((side, k) => {
      const d = v(side * Math.sin(ARM_ANGLE), Math.cos(ARM_ANGLE)); // along the arm, outwards
      const out = v(side * Math.cos(ARM_ANGLE), -Math.sin(ARM_ANGLE)); // across the arm, away from the centre line
      const armPt = (s: number, o: number) => hinge.clone().addScaledVector(d, s).addScaledVector(out, o);
      // heavy chain: inner half of the arm (CH1, VH)
      const ch1 = place(new THREE.Mesh(dom(10 + k), mHeavy), armPt(1.6, -0.36), d);
      const vh = place(new THREE.Mesh(dom(20 + k), mVar), armPt(3.55, -0.36), d);
      // light chain: outer half of the arm (CL, VL)
      const cl = place(new THREE.Mesh(dom(30 + k), mLight), armPt(1.6, 0.86), d);
      const vl = place(new THREE.Mesh(dom(40 + k), mVar), armPt(3.55, 0.86), d);
      vl.scale.setScalar(0.96);
      // hinge segment of the heavy chain, joining CH1 to the stem
      const top = armPt(0.75, -0.36);
      const bottom = v(side * 0.62, -0.75);
      const hs = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(0.2, 0.2, 1, 10)), mHinge);
      hs.scale.set(1, top.distanceTo(bottom), 1);
      place(hs, top.clone().add(bottom).multiplyScalar(0.5), top.clone().sub(bottom));
      // heavy chain in the stem: CH2, CH3
      const ch2 = place(new THREE.Mesh(dom(50 + k), mHeavy), v(side * 0.66, -1.95), v(side * 0.12, 1));
      const ch3 = place(new THREE.Mesh(dom(60 + k), mHeavy), v(side * 0.66, -3.85), v(0, 1));
      heavy[k]!.push(ch1, vh, hs, ch2, ch3);
      light[k]!.push(cl, vl);
      variable.push(vh, vl);
      // light chain to heavy chain disulfide bond, just below the base of CL and CH1 and slightly towards
      // the viewer, so it is not hidden inside the domains
      const lz = v(0, 0, 0.32);
      bond(armPt(0.62, 0.86).add(lz), armPt(0.72, -0.36).add(lz));
      // the light chain's variable and constant halves are one polypeptide: a short link
      if (side === -1) {
        tipLeft = armPt(4.55, 0.25);
        siteLeft = armPt(4.5, 0.25);
        varLabel = armPt(3.55, 0.86).add(v(0, 0, 0.62));
        lightLabel = armPt(1.6, 0.86).add(v(0, 0, 0.62));
        heavyLabel = v(side * 0.66, -2.9, 0.62);
      }
      if (side === 1) constLabel = v(0.66, -3.85, 0.62);
    });
    // two disulfide bonds between the heavy chains at the hinge
    bond(v(-0.55, -0.45), v(0.55, -0.45));
    bond(v(-0.58, -0.85), v(0.58, -0.85));

    // an antigen (part of a pathogen's surface protein) in the left binding site
    const antigen = new THREE.Mesh(ctx.track(blobGeometry(0.75, 1.6, 77, 0.18, 18)), mAntigen);
    const dl = v(-Math.sin(ARM_ANGLE), Math.cos(ARM_ANGLE));
    antigen.position.copy(tipLeft).addScaledVector(dl, 0.95);
    antigen.rotation.z = 0.9;
    root.add(antigen);
    // the right binding site is empty: mark its pocket with a small ring
    const dr = v(Math.sin(ARM_ANGLE), Math.cos(ARM_ANGLE));
    const outR = v(Math.cos(ARM_ANGLE), -Math.sin(ARM_ANGLE));
    const siteRight = hinge.clone().addScaledVector(dr, 4.5).addScaledVector(outR, 0.25);
    const pocket = new THREE.Mesh(ctx.track(new THREE.TorusGeometry(0.55, 0.1, 10, 28)), mSS);
    pocket.position.copy(siteRight).addScaledVector(dr, 0.1);
    // tilt the ring towards the camera so the empty site reads as a pocket
    pocket.quaternion.setFromUnitVectors(v(0, 0, 1), dr.clone().add(v(0, 0, 1.1)).normalize());
    root.add(pocket);

    const anchors = {
      heavy: { object: anchorAt(root, heavyLabel.x, heavyLabel.y, heavyLabel.z, 'heavy'), highlight: [...heavy[0]!, ...heavy[1]!] },
      light: { object: anchorAt(root, lightLabel.x, lightLabel.y, lightLabel.z, 'light'), highlight: [...light[0]!, ...light[1]!] },
      variable: { object: anchorAt(root, varLabel.x, varLabel.y, varLabel.z, 'variable'), highlight: variable },
      site: { object: anchorAt(root, siteRight.x, siteRight.y, siteRight.z + 0.3, 'site'), highlight: [pocket, ...variable] },
      antigen: { object: anchorAt(root, siteLeft.x - 0.7, siteLeft.y + 1.1, 0.7, 'antigen'), highlight: [antigen] },
      constant: { object: anchorAt(root, constLabel.x, constLabel.y, constLabel.z, 'constant'), highlight: [...heavy[0]!.slice(2), ...heavy[1]!.slice(2), heavy[0]![0]!, heavy[1]![0]!, light[0]![0]!, light[1]![0]!] },
      hinge: { object: anchorAt(root, 0.9, -0.2, 0.3, 'hinge'), highlight: [heavy[0]![2]!, heavy[1]![2]!] },
      disulfide: { object: anchorAt(root, 0, -0.85, 0.25, 'disulfide'), highlight: ss },
    };
    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
