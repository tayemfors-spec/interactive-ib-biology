import * as THREE from 'three';

/** Deterministic random numbers (mulberry32) so scenes look the same on every load. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A lumpy capsule that reads as a globular protein. `radius`/`height` set the overall size;
 * `lumps` sets how irregular the surface is.
 */
export function blobGeometry(radius: number, height: number, seed = 1, lumps = 0.12, detail = 24): THREE.BufferGeometry {
  const g = new THREE.CapsuleGeometry(radius, Math.max(0.01, height - 2 * radius), 8, detail);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const rand = rng(seed);
  const k = [rand() * 6, rand() * 6, rand() * 6];
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const n = Math.sin(p.x * 2.1 + k[0]!) * Math.sin(p.y * 1.7 + k[1]!) * Math.sin(p.z * 2.3 + k[2]!);
    const s = 1 + lumps * n;
    pos.setXYZ(i, p.x * s, p.y, p.z * s);
  }
  g.computeVertexNormals();
  return g;
}

/** Instance transforms helper: position + optional rotation + scale. */
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const sv = new THREE.Vector3();
export function setInstance(mesh: THREE.InstancedMesh, i: number, pos: THREE.Vector3, rot?: THREE.Euler, scale = 1, sy = scale) {
  q.setFromEuler(rot ?? new THREE.Euler());
  sv.set(scale, sy, scale);
  m.compose(pos, q, sv);
  mesh.setMatrixAt(i, m);
}

/** An empty object used as a label anchor at a given position. */
export function anchorAt(parent: THREE.Object3D, x: number, y: number, z: number, name: string): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = name;
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}
