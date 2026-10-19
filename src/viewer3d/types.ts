import type * as THREE from 'three';

/** Colour roles shared by all scenes; values come from the CSS --bio-* tokens so they follow the theme. */
export const PALETTE_KEYS = ['head', 'tail', 'protein', 'protein2', 'carb', 'chol', 'na', 'k', 'water', 'glucose', 'neutral', 'text'] as const;
export type PaletteKey = (typeof PALETTE_KEYS)[number];

export interface SceneContext {
  THREE: typeof THREE;
  scene: THREE.Scene;
  /** Create a material whose colour tracks the theme palette. */
  material(key: PaletteKey, opts?: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial;
  /** Register geometry/materials/textures so they are disposed with the scene. */
  track<T extends { dispose(): void }>(resource: T): T;
  reducedMotion: boolean;
}

export interface Anchor {
  /** The point the label attaches to (its world position is projected to the screen). */
  object: THREE.Object3D;
  /** Meshes to highlight when the label is selected (defaults to `object` if it is a mesh). */
  highlight?: THREE.Object3D[];
}

export interface BuiltScene {
  /** Keyed by label id from visuals.yaml. Every label must have an anchor (checked by tests). */
  anchors: Record<string, Anchor>;
  /** For process scenes: draw the full state of step `index` at progress t ∈ [0, 1]. */
  render?(index: number, t: number): void;
  /** Seconds each step lasts at 1× speed. */
  durations?: number[];
  /** Optional ambient motion (e.g. lipids drifting); only runs when the reader turns it on. */
  idle?(dt: number): void;
  dispose?(): void;
}

export interface SceneModule {
  camera: { position: [number, number, number]; target: [number, number, number]; fov?: number; minDistance: number; maxDistance: number };
  build(ctx: SceneContext): BuiltScene | Promise<BuiltScene>;
}
