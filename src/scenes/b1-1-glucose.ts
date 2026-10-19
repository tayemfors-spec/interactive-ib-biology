import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt } from '../viewer3d/kit';
import { LEN, molKit, type Part } from './b1-1-kit';

/*
 * B1.1 α-D-glucose and β-D-glucose (pyranose ring forms), side by side. Units: ångströms.
 * The ring is drawn flat, as in the Haworth projection used in exams (the real ring is puckered into a
 * chair). Ring plane = xz; +y is "above the ring"; +z faces the camera, so the C2–C3 edge is nearest.
 * Ring order (Haworth): C1 right, C2 front-right, C3 front-left, C4 left, C5 back-left, ring O back-right.
 * Substituents of D-glucose (above / below the ring):
 *   C1  α: H above, OH below      β: OH above, H below   ← the only difference
 *   C2  H above, OH below
 *   C3  OH above, H below
 *   C4  H above, OH below
 *   C5  CH₂OH (C6) above, H below
 * Formula C₆H₁₂O₆ — each molecule has 6 C, 6 O and 12 H.
 */
const R = 1.48; // ring radius = ring bond length
const RING_ANGLES = { C1: 0, C2: 60, C3: 120, C4: 180, C5: 240, O5: 300 } as const;
const TILT = THREE.MathUtils.degToRad(14);
const SEP = 4.1; // half the distance between the two molecules

type Up = 1 | -1;

const scene: SceneModule = {
  camera: { position: [1.2, 7.6, 20.5], target: [1.2, 0.1, 0], fov: 38, minDistance: 6, maxDistance: 32 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const kit = molKit(ctx);
    const plateGeo = ctx.track(new THREE.CylinderGeometry(R * 1.06, R * 1.06, 0.04, 6));
    const plateMat = ctx.material('carb', { transparent: true, opacity: 0.2, depthWrite: false, roughness: 0.9, side: THREE.DoubleSide });

    const Y = new THREE.Vector3(0, 1, 0);
    const molecule = (cx: number, beta: boolean) => {
      const g = new THREE.Group();
      g.position.x = cx;
      root.add(g);
      const main = kit.part(g);
      const carbonPart: Record<string, Part> = {};
      for (const k of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'O5']) carbonPart[k] = kit.part(g);
      const c1oh = kit.part(g);
      const ohs = kit.part(g);

      const ring: Record<string, THREE.Vector3> = {};
      const radial: Record<string, THREE.Vector3> = {};
      for (const [k, deg] of Object.entries(RING_ANGLES)) {
        const a = THREE.MathUtils.degToRad(deg);
        radial[k] = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        ring[k] = radial[k]!.clone().multiplyScalar(R);
      }
      const order = ['C1', 'C2', 'C3', 'C4', 'C5', 'O5'];
      order.forEach((k, i) => {
        carbonPart[k]!.atom(k === 'O5' ? 'O' : 'C', ring[k]!);
        main.bond(ring[k]!, ring[order[(i + 1) % 6]!]!);
      });
      // a faint plate marks the plane of the ring, so "above" and "below" are easy to see
      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.rotation.y = Math.PI / 6;
      plate.renderOrder = 3;
      g.add(plate);

      /** Vertical direction above (+1) or below (−1) the ring at carbon k, leaning slightly outwards. */
      const vert = (k: string, up: Up) => Y.clone().multiplyScalar(up * Math.cos(TILT)).addScaledVector(radial[k]!, Math.sin(TILT));
      const addH = (k: string, up: Up) => {
        const h = ring[k]!.clone().addScaledVector(vert(k, up), LEN.CH);
        main.atom('H', h);
        main.bond(ring[k]!, h);
      };
      const addOH = (k: string, up: Up, part: Part) => {
        const o = ring[k]!.clone().addScaledVector(vert(k, up), LEN.CO);
        part.atom('O', o);
        main.bond(ring[k]!, o);
        // C–O–H angle ≈ 109°: the H points outwards from the ring and slightly further from the plane
        const h = o.clone().addScaledVector(Y.clone().multiplyScalar(up * 0.33).addScaledVector(radial[k]!, 0.94).normalize(), LEN.OH);
        part.atom('H', h);
        main.bond(o, h);
        return o;
      };

      const oC1 = beta ? addOH('C1', 1, c1oh) : addOH('C1', -1, c1oh);
      addH('C1', beta ? -1 : 1);
      const oC2 = addOH('C2', -1, ohs); addH('C2', 1);
      const oC3 = addOH('C3', 1, ohs); addH('C3', -1);
      const oC4 = addOH('C4', -1, ohs); addH('C4', 1);
      addH('C5', -1);
      // C6 (CH₂OH) above carbon 5
      const c6 = ring.C5!.clone().addScaledVector(vert('C5', 1), LEN.CC);
      carbonPart.C6!.atom('C', c6);
      main.bond(ring.C5!, c6);
      const o6 = c6.clone().addScaledVector(radial.C5!.clone().addScaledVector(Y, 0.12).normalize(), LEN.CO);
      ohs.atom('O', o6);
      main.bond(c6, o6);
      const h6o = o6.clone().addScaledVector(Y.clone().multiplyScalar(0.94).addScaledVector(radial.C5!, 0.34).normalize(), LEN.OH);
      ohs.atom('H', h6o);
      main.bond(o6, h6o);
      const tangent = new THREE.Vector3().crossVectors(Y, radial.C5!).normalize();
      for (const s of [1, -1]) {
        const h = c6.clone().addScaledVector(Y.clone().multiplyScalar(0.45).addScaledVector(radial.C5!, -0.35).addScaledVector(tangent, s * 0.82).normalize(), LEN.CH);
        main.atom('H', h);
        main.bond(c6, h);
      }
      return { g, ring, c6, o6, oC1, oC2, oC3, oC4, carbonPart, c1oh, ohs };
    };

    const a = molecule(-SEP, false);
    const b = molecule(SEP, true);
    kit.finish();

    const at = (m: typeof a, name: string, p: THREE.Vector3, dx = 0, dy = 0, dz = 0) => anchorAt(m.g, p.x + dx, p.y + dy, p.z + dz, name);
    const anchors = {
      alpha: { object: anchorAt(root, -SEP - 0.4, 3.0, -0.6, 'alpha'), highlight: [a.g] },
      beta: { object: anchorAt(root, SEP - 0.4, 3.0, -0.6, 'beta'), highlight: [b.g] },
      'c1-alpha': { object: at(a, 'c1-alpha', a.oC1, 0.15, -0.2, 0.3), highlight: [a.c1oh.group, a.carbonPart.C1!.group] },
      'c1-beta': { object: at(b, 'c1-beta', b.oC1, 0.15, 0.25, 0.3), highlight: [b.c1oh.group, b.carbonPart.C1!.group] },
      c2: { object: at(a, 'c2', a.ring.C2!, 0.1, 0, 0.4), highlight: [a.carbonPart.C2!.group] },
      c3: { object: at(a, 'c3', a.ring.C3!, -0.1, 0, 0.4), highlight: [a.carbonPart.C3!.group] },
      c4: { object: at(a, 'c4', a.ring.C4!, -0.35, 0, 0.2), highlight: [a.carbonPart.C4!.group] },
      c5: { object: at(b, 'c5', b.ring.C5!, -0.3, -0.1, 0.2), highlight: [b.carbonPart.C5!.group] },
      c6: { object: at(b, 'c6', b.c6, 0, 0.2, 0.3), highlight: [b.carbonPart.C6!.group] },
      'ring-o': { object: at(b, 'ring-o', b.ring.O5!, 0.2, 0.05, 0.1), highlight: [b.carbonPart.O5!.group] },
      hydroxyl: { object: at(b, 'hydroxyl', b.oC2, 0.1, -0.25, 0.3), highlight: [a.ohs.group, b.ohs.group, a.c1oh.group, b.c1oh.group] },
    };

    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
