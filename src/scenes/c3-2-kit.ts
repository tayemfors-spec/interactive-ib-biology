import * as THREE from 'three';
import { rng } from '../viewer3d/kit';

/* Shared geometry helpers for the C3.2 scenes (no default export). */

const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _dir = new THREE.Vector3();

/** Instance `i` of a unit-height cylinder mesh drawn as a rod from a to b (scale 0 hides it). */
export function seg(mesh: THREE.InstancedMesh, i: number, a: THREE.Vector3, b: THREE.Vector3, show = 1) {
  _mid.copy(a).add(b).multiplyScalar(0.5);
  _dir.copy(b).sub(a);
  const len = _dir.length();
  if (len < 1e-6 || show <= 0.001) {
    _m.makeScale(0, 0, 0);
    _m.setPosition(_mid);
  } else {
    _q.setFromUnitVectors(UP, _dir.normalize());
    _s.set(show, len, show);
    _m.compose(_mid, _q, _s);
  }
  mesh.setMatrixAt(i, _m);
}

const _fork = new THREE.Vector3();
const _a1 = new THREE.Vector3();
const _a2 = new THREE.Vector3();
const _side = new THREE.Vector3();
const _base = new THREE.Vector3();
const Z = new THREE.Vector3(0, 0, 1);
const X = new THREE.Vector3(1, 0, 0);

/**
 * A Y shape (an antibody or a B-cell receptor) as three rods: instances i0, i0+1, i0+2.
 * `base` is the end of the stem, `dir` points from the stem towards the two arms.
 */
export function yShape(mesh: THREE.InstancedMesh, i0: number, base: THREE.Vector3, dir: THREE.Vector3, size = 1, show = 1, spread = 0.7) {
  const d = _dir.copy(dir).normalize().clone();
  _side.crossVectors(d, Z);
  if (_side.lengthSq() < 1e-4) _side.crossVectors(d, X);
  _side.normalize();
  _base.copy(base);
  _fork.copy(_base).addScaledVector(d, 0.5 * size);
  _a1.copy(_fork).addScaledVector(d, Math.cos(spread) * 0.42 * size).addScaledVector(_side, Math.sin(spread) * 0.42 * size);
  _a2.copy(_fork).addScaledVector(d, Math.cos(spread) * 0.42 * size).addScaledVector(_side, -Math.sin(spread) * 0.42 * size);
  const b = _base.clone(), f = _fork.clone(), p = _a1.clone(), q = _a2.clone();
  seg(mesh, i0, b, f, show);
  seg(mesh, i0 + 1, f, p, show);
  seg(mesh, i0 + 2, f, q, show);
}

/** A sphere with a gently irregular surface, for cells. */
export function lumpySphere(radius: number, seed: number, lumps = 0.08, w = 40, h = 28): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(radius, w, h);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const rand = rng(seed);
  const k = [rand() * 6, rand() * 6, rand() * 6, rand() * 6];
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const n = p.clone().normalize();
    const s = 1 + lumps * (Math.sin(n.x * 3.1 + k[0]!) * Math.sin(n.y * 2.7 + k[1]!) + 0.6 * Math.sin(n.z * 4.3 + n.x * 2 + k[2]!) * Math.cos(n.y * 3.3 + k[3]!));
    pos.setXYZ(i, p.x * s, p.y * s, p.z * s);
  }
  g.computeVertexNormals();
  return g;
}

/** Evenly spread unit vectors over a sphere (Fibonacci lattice). */
export function spherePoints(n: number, seed = 0): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i + seed;
    out.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r));
  }
  return out;
}
