import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt } from '../viewer3d/kit';
import { nucleotideKit, type Base } from './a1-2-double-helix';

/*
 * A1.2 single-stranded RNA for comparison with DNA: 12 nucleotides, 5′ (left) → 3′ (right).
 * Same colour code and shapes as the double helix (uracil replaces thymine), but each ribose carries an
 * extra –OH on carbon 2′ (red bead). There is no second strand, so every base is unpaired.
 * The strand is laid out like the textbook drawing — backbone along the bottom, bases projecting up —
 * with a gentle wave so it reads as a flexible 3D chain. It is built with the backbone along local x and
 * the bases pointing along local +z, then turned −90° about x so the bases point up and face the camera.
 */
const SEQ: Base[] = 'AUGGCUACGUCA'.split('') as Base[];
const STEP = 1.6;

const scene: SceneModule = {
  camera: { position: [0.6, 3.5, 23], target: [0.6, 0.4, 0], fov: 38, minDistance: 6, maxDistance: 40 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const strand = new THREE.Group();
    strand.rotation.x = -Math.PI / 2; // local +z (base direction) → up; local −y → towards the camera
    strand.position.y = -1.6;
    root.add(strand);

    const N = SEQ.length;
    const kit = nucleotideKit(ctx, strand, N + 2);
    const { meshes, push, stick } = kit;
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const xOf = (i: number) => (i - (N - 1) / 2) * STEP;
    const wave = (i: number) => 0.9 * Math.sin(i * 0.7); // depth wiggle (local y)
    const sug: THREE.Vector3[] = [];
    const pho: THREE.Vector3[] = [];
    const ohs: THREE.Vector3[] = [];
    for (let i = 0; i < N; i++) {
      sug.push(v(xOf(i), wave(i), 0));
      // each phosphate sits on the 5′ side (left) of its ribose, below the line of sugars
      pho.push(v(xOf(i) - STEP / 2, (wave(i) + wave(i - 1)) / 2, -0.95));
    }
    const up = v(0, 0, 1);
    for (let i = 0; i < N; i++) {
      const s = sug[i]!;
      push(meshes.sugar, s, 0.3 * i);
      push(meshes.phos, pho[i]!);
      stick(meshes.stick, pho[i]!, s);
      if (i > 0) stick(meshes.stick, pho[i]!, sug[i - 1]!);
      kit.base(SEQ[i]!, s, up);
      // 2′-OH: on the ring carbon next to C1′, pointing towards the viewer
      const oh = s.clone().add(v(0.42, -0.62, -0.28));
      ohs.push(oh);
      push(meshes.oh, oh);
      stick(meshes.stick, s, oh, 0.7);
    }
    // free 3′-OH on the last ribose
    const oh3 = v(xOf(N - 1) + STEP / 2, wave(N - 1), -0.95);
    push(meshes.oh, oh3);
    stick(meshes.stick, sug[N - 1]!, oh3);
    kit.finish();

    const at = (name: string, p: THREE.Vector3) => anchorAt(strand, p.x, p.y, p.z, name);
    const baseAt = (i: number, h: number) => sug[i]!.clone().add(v(0, -0.15, h));
    const iOf = (b: Base, from = 0) => SEQ.findIndex((x, k) => k >= from && x === b);
    const hex = meshes.hex, pent = meshes.pent;
    const anchors = {
      'five-prime': { object: at('five-prime', pho[0]!.clone().add(v(-0.4, 0, -0.4))), highlight: [] },
      'three-prime': { object: at('three-prime', oh3.clone().add(v(0.3, 0, -0.3))), highlight: [] },
      single: { object: at('single', baseAt(9, 3.2)), highlight: [] },
      ribose: { object: at('ribose', sug[5]!.clone().add(v(-0.1, -0.3, -0.35))), highlight: [meshes.sugar] },
      'two-oh': { object: at('two-oh', ohs[7]!), highlight: [meshes.oh] },
      phosphate: { object: at('phosphate', pho[3]!.clone().add(v(0, -0.3, -0.3))), highlight: [meshes.phos, meshes.stick] },
      uracil: { object: at('uracil', baseAt(iOf('U'), 1.3)), highlight: [hex.U] },
      adenine: { object: at('adenine', baseAt(iOf('A', 6), 1.8)), highlight: [hex.A, pent.A!] },
      guanine: { object: at('guanine', baseAt(iOf('G', 3), 1.8)), highlight: [hex.G, pent.G!] },
      cytosine: { object: at('cytosine', baseAt(iOf('C', 8), 1.3)), highlight: [hex.C] },
    };
    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
