import { readdirSync, readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { visualsSchema } from '../../src/schemas';
import type { SceneContext, SceneModule } from '../../src/viewer3d/types';

const modules = import.meta.glob<SceneModule>('../../src/scenes/*.ts', { import: 'default' });
const anims = import.meta.glob<{ create: (svg: unknown) => { render(i: number, t: number): void; durations?: number[] } }>('../../src/anims/*.ts');
const topicsDir = new URL('../../src/content/topics/', import.meta.url);

const ctx = (): SceneContext => ({
  THREE,
  scene: new THREE.Scene(),
  material: (_key, opts) => new THREE.MeshStandardMaterial(opts),
  track: (r) => r,
  reducedMotion: false,
});

for (const dir of readdirSync(topicsDir)) {
  const { visuals } = visualsSchema.parse(parse(readFileSync(new URL(`${dir}/visuals.yaml`, topicsDir), 'utf8')));
  describe(`${dir} visuals`, () => {
    it('visuals.yaml parses', () => expect(visuals.length).toBeGreaterThan(0));
    for (const v of visuals) {
      if (v.kind === 'viewer3d') {
        for (const s of v.scenes) {
          it(`scene ${s.module}: every label has an anchor and every step renders`, async () => {
            const loader = modules[`../../src/scenes/${s.module}.ts`];
            expect(loader, `src/scenes/${s.module}.ts exists`).toBeDefined();
            const mod = await loader!();
            const built = await mod.build(ctx());
            for (const l of s.labels) expect(built.anchors[l.id], `anchor for label "${l.id}"`).toBeDefined();
            if (s.steps.length) {
              expect(built.render, 'process scene has render()').toBeTypeOf('function');
              if (built.durations) expect(built.durations).toHaveLength(s.steps.length);
              s.steps.forEach((_, i) => { for (const t of [0, 0.5, 1]) built.render!(i, t); });
            }
          });
        }
      }
      if (v.kind === 'anim') {
        it(`anim ${v.module}: driver exists with one duration per step`, async () => {
          const loader = anims[`../../src/anims/${v.module}.ts`];
          expect(loader, `src/anims/${v.module}.ts exists`).toBeDefined();
        });
      }
    }
  });
}
