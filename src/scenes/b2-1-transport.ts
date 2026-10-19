import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry, rng, setInstance } from '../viewer3d/kit';
import { ease, phase } from '../lib/timeline';

/*
 * B2.1 transport modes, one step each:
 *   0 simple diffusion (O₂ through the bilayer)   1 osmosis through aquaporins
 *   2 facilitated diffusion (K⁺ out through a channel)   3 active transport (Na⁺/K⁺ pump, ATP)
 * Particle counts on each side reflect the concentration difference for that step.
 */
const HEAD_Y = 1.7;
const OUT: [number, number] = [2.7, 5.2]; // extracellular y-range
const IN: [number, number] = [-5.2, -2.7]; // cytoplasm y-range
const CAP = 120; // max particles of one kind in a step
const X = { diffusion: -4.6, aquaporin: -1.55, channel: 1.55, pump: 4.6 };

type Path = THREE.Vector3[];
const at = (path: Path, u: number, out = new THREE.Vector3()) => {
  const k = Math.max(0, Math.min(0.9999, u)) * (path.length - 1);
  const i = Math.floor(k);
  return out.copy(path[i]!).lerp(path[i + 1]!, k - i);
};

const scene: SceneModule = {
  camera: { position: [0, 3.2, 17.5], target: [0, 0, 0], fov: 40, minDistance: 7, maxDistance: 34 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(7);

    // ---------- bilayer slab ----------
    const mHead = ctx.material('head', { roughness: 0.5 });
    const mTail = ctx.material('tail', { roughness: 0.75 });
    const headGeo = ctx.track(new THREE.SphereGeometry(0.33, 12, 8));
    const tailGeo = ctx.track(new THREE.CylinderGeometry(0.07, 0.07, 1.25, 5));
    const slots: { x: number; z: number; s: 1 | -1 }[] = [];
    for (const s of [1, -1] as const)
      for (let x = -7; x <= 7.01; x += 0.72)
        for (let z = -2.6; z <= 2.61; z += 0.72) {
          if (Object.entries(X).some(([k, px]) => k !== 'diffusion' && Math.hypot(x - px, z) < (k === 'pump' ? 1.5 : 1.15))) continue;
          slots.push({ x: x + (rand() - 0.5) * 0.12, z: z + (rand() - 0.5) * 0.12, s });
        }
    const heads = new THREE.InstancedMesh(headGeo, mHead, slots.length);
    const tails = new THREE.InstancedMesh(tailGeo, mTail, slots.length * 2);
    slots.forEach((p, i) => {
      setInstance(heads, i, new THREE.Vector3(p.x, p.s * HEAD_Y, p.z));
      const yT = p.s * (HEAD_Y - 0.25 - 0.62);
      setInstance(tails, 2 * i, new THREE.Vector3(p.x - 0.1, yT, p.z));
      setInstance(tails, 2 * i + 1, new THREE.Vector3(p.x + 0.1, yT, p.z));
    });
    root.add(heads, tails);

    // ---------- proteins (inactive ones fade so the current one stands out) ----------
    const mk = (key: 'protein' | 'protein2' | 'water') => ctx.material(key, { roughness: 0.5, transparent: true });
    const mAqua = mk('water');
    const mChan = mk('protein2');
    const mPump = mk('protein');
    const ring = (n: number, r: number, mat: THREE.Material, x: number, rad: number, h: number, seed: number) => {
      const g = new THREE.Group();
      g.position.x = x;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + 0.3;
        const m = new THREE.Mesh(ctx.track(blobGeometry(rad, h, seed + k, 0.07, 14)), mat);
        m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        g.add(m);
      }
      root.add(g);
      return g;
    };
    const aquaporin = ring(4, 0.5, mAqua, X.aquaporin, 0.44, 4.2, 30);
    // K⁺ channels are tetramers: four subunits around a central pore
    const channel = ring(4, 0.6, mChan, X.channel, 0.42, 4.3, 40);
    const pump = new THREE.Group();
    pump.position.x = X.pump;
    const pumpBody = new THREE.Mesh(ctx.track(blobGeometry(1.05, 4.3, 50)), mPump);
    const pumpFoot = new THREE.Mesh(ctx.track(blobGeometry(0.95, 1.8, 51, 0.15)), mPump);
    pumpFoot.position.set(0.15, -2.75, 0.1);
    pump.add(pumpBody, pumpFoot);
    root.add(pump);

    // ---------- particles ----------
    type Kind = 'o2' | 'water' | 'solute' | 'k' | 'na' | 'atp';
    const geo: Record<Kind, THREE.BufferGeometry> = {
      o2: ctx.track(new THREE.SphereGeometry(0.22, 10, 8)),
      water: ctx.track(new THREE.SphereGeometry(0.19, 8, 6)),
      solute: ctx.track(new THREE.SphereGeometry(0.3, 12, 8)),
      k: ctx.track(new THREE.SphereGeometry(0.22, 10, 8)),
      na: ctx.track(new THREE.SphereGeometry(0.19, 10, 8)),
      atp: ctx.track(new THREE.IcosahedronGeometry(0.34, 0)),
    };
    const mat: Record<Kind, THREE.Material> = {
      o2: ctx.material('neutral', { roughness: 0.4 }),
      water: ctx.material('water', { roughness: 0.3 }),
      solute: ctx.material('glucose', { roughness: 0.5 }),
      k: ctx.material('k', { roughness: 0.4 }),
      na: ctx.material('na', { roughness: 0.4 }),
      atp: ctx.material('head', { roughness: 0.3, emissiveIntensity: 0.2 }),
    };
    const meshes = {} as Record<Kind, THREE.InstancedMesh>;
    for (const k of Object.keys(geo) as Kind[]) {
      meshes[k] = new THREE.InstancedMesh(geo[k], mat[k], CAP);
      meshes[k].count = 0;
      root.add(meshes[k]);
    }

    /** A particle either wanders in one compartment, or follows a path between `t0` and `t1` of the step. */
    type P = { kind: Kind; base?: THREE.Vector3; path?: Path; t0?: number; t1?: number; ph: number };
    const wander = (kind: Kind, side: 'out' | 'in', n: number, xr: [number, number]): P[] =>
      Array.from({ length: n }, () => {
        const [y0, y1] = side === 'out' ? OUT : IN;
        return { kind, base: new THREE.Vector3(xr[0] + rand() * (xr[1] - xr[0]), y0 + rand() * (y1 - y0), -2.2 + rand() * 4.4), ph: rand() * 6.28 };
      });
    const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
    const through = (x: number, from: 'out' | 'in', jitter: number): Path => {
      const top = 3.4 + rand() * 1.4, bot = -3.4 - rand() * 1.4;
      const zx = (rand() - 0.5) * jitter;
      const pts = [v(x + zx * 2, top, zx), v(x, 2.4, 0), v(x, -2.4, 0), v(x - zx * 2, bot, -zx)];
      return from === 'out' ? pts : pts.reverse();
    };
    const stagger = (n: number, span = 0.75, len = 0.32) => Array.from({ length: n }, (_, i) => [0.05 + (i / Math.max(1, n - 1)) * span * (1 - len), 0.05 + (i / Math.max(1, n - 1)) * span * (1 - len) + len] as const);

    const D = X.diffusion, A = X.aquaporin, C = X.channel, Pm = X.pump;
    const steps: P[][] = [
      // 0 · simple diffusion: much more O₂ outside; individual molecules slip between phospholipids
      [
        ...wander('o2', 'out', 22, [D - 2.2, D + 2.2]),
        ...wander('o2', 'in', 6, [D - 2.2, D + 2.2]),
        ...stagger(6).map(([t0, t1], i) => ({ kind: 'o2' as Kind, path: through(D - 1.2 + i * 0.5, 'out', 1.2), t0, t1, ph: 0 })),
        // a few move the other way: diffusion is a net movement
        ...stagger(2, 0.6).map(([t0, t1], i) => ({ kind: 'o2' as Kind, path: through(D + 1.4 - i * 0.6, 'in', 1.2), t0: t0 + 0.2, t1: t1 + 0.2, ph: 0 })),
      ],
      // 1 · osmosis: higher solute concentration inside, so net water movement is inwards through aquaporins
      [
        ...wander('water', 'out', 30, [A - 2.6, A + 2.6]),
        ...wander('water', 'in', 26, [A - 2.6, A + 2.6]),
        ...wander('solute', 'in', 11, [A - 2.6, A + 2.6]),
        ...wander('solute', 'out', 3, [A - 2.6, A + 2.6]),
        ...stagger(7).map(([t0, t1]) => ({ kind: 'water' as Kind, path: through(A, 'out', 0.6), t0, t1, ph: 0 })),
        ...stagger(2, 0.6).map(([t0, t1]) => ({ kind: 'water' as Kind, path: through(A, 'in', 0.6), t0: t0 + 0.2, t1: t1 + 0.2, ph: 0 })),
      ],
      // 2 · facilitated diffusion: K⁺ is more concentrated inside; it diffuses out through the open channel
      [
        ...wander('k', 'in', 18, [C - 2.4, C + 2.4]),
        ...wander('k', 'out', 4, [C - 2.4, C + 2.4]),
        ...stagger(5).map(([t0, t1]) => ({ kind: 'k' as Kind, path: through(C, 'in', 0.6), t0, t1, ph: 0 })),
        ...stagger(1, 0.5).map(([t0, t1]) => ({ kind: 'k' as Kind, path: through(C, 'out', 0.6), t0: t0 + 0.35, t1: t1 + 0.35, ph: 0 })),
      ],
      // 3 · active transport: ATP powers the pump to move 3 Na⁺ out and 2 K⁺ in, both against their gradients
      [
        ...wander('na', 'out', 15, [Pm - 2.2, Pm + 2.2]),
        ...wander('na', 'in', 4, [Pm - 2.2, Pm + 2.2]),
        ...wander('k', 'in', 13, [Pm - 2.2, Pm + 2.2]),
        ...wander('k', 'out', 3, [Pm - 2.2, Pm + 2.2]),
        { kind: 'atp', path: [v(Pm - 2.6, -5, 1.4), v(Pm - 1.1, -3.4, 1.1), v(Pm - 0.6, -2.9, 1.0)], t0: 0.0, t1: 0.2, ph: 0 },
        ...[0, 1, 2].map((i) => ({ kind: 'na' as Kind, path: [v(Pm - 1 + i * 0.6, -4.6, 0.6), v(Pm, -2.2, 0.2), v(Pm, 2.2, 0.2), v(Pm - 1 + i * 0.7, 4.4, 0.8)], t0: 0.2 + i * 0.04, t1: 0.58 + i * 0.04, ph: 0 })),
        ...[0, 1].map((i) => ({ kind: 'k' as Kind, path: [v(Pm + 0.8 - i * 0.7, 4.6, -0.6), v(Pm, 2.2, -0.2), v(Pm, -2.2, -0.2), v(Pm + 0.9 - i * 0.8, -4.4, -0.8)], t0: 0.62 + i * 0.05, t1: 0.95 + i * 0.03, ph: 0 })),
      ],
    ];
    const active: Record<number, THREE.Object3D | null> = { 0: null, 1: aquaporin, 2: channel, 3: pump };
    const tmp = new THREE.Vector3();

    const anchors = {
      bilayer: { object: anchorAt(root, D, HEAD_Y + 0.3, 2.4, 'bilayer'), highlight: [heads, tails] },
      aquaporin: { object: anchorAt(root, A, 2.4, 0, 'aquaporin'), highlight: [aquaporin] },
      channel: { object: anchorAt(root, C, 2.5, 0, 'channel'), highlight: [channel] },
      pump: { object: anchorAt(root, Pm + 0.9, -3.0, 0.9, 'pump'), highlight: [pump] },
      outside: { object: anchorAt(root, 0, 5.8, -2.4, 'outside'), highlight: [] },
      cytoplasm: { object: anchorAt(root, 0, -5.8, -2.4, 'cytoplasm'), highlight: [] },
    };

    return {
      anchors,
      durations: [6, 7, 6, 8],
      render(index, t) {
        // fade every protein except the one in use
        for (const [i, obj] of Object.entries(active)) {
          if (!obj) continue;
          const on = Number(i) === index;
          obj.traverse((o) => { if (o instanceof THREE.Mesh) { (o.material as THREE.MeshStandardMaterial).opacity = on ? 1 : 0.28; (o.material as THREE.MeshStandardMaterial).depthWrite = on; } });
        }
        const counts = {} as Record<Kind, number>;
        for (const k of Object.keys(meshes) as Kind[]) counts[k] = 0;
        for (const p of steps[index]!) {
          const mesh = meshes[p.kind];
          const i = counts[p.kind]++;
          if (i >= CAP) continue;
          if (p.path) {
            const u = ease(phase(t, p.t0!, p.t1!));
            at(p.path, u, tmp);
            // ATP is used up: shrink it once the pump has been phosphorylated
            const s = p.kind === 'atp' ? 1 - phase(t, 0.25, 0.35) : 1;
            setInstance(mesh, i, tmp, undefined, Math.max(0.001, s));
          } else {
            const b = p.base!;
            tmp.set(b.x + 0.25 * Math.sin(t * 6 + p.ph), b.y + 0.2 * Math.cos(t * 5 + p.ph * 1.3), b.z + 0.25 * Math.sin(t * 4 + p.ph * 0.7));
            setInstance(mesh, i, tmp);
          }
        }
        for (const k of Object.keys(meshes) as Kind[]) { meshes[k].count = Math.min(CAP, counts[k]); meshes[k].instanceMatrix.needsUpdate = true; }
      },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
