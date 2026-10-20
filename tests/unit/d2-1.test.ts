import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CLUES, DIPLOID, LOOKS, MIDY, MITOTIC, PHASES, countChromosomes, drawCell, makeDeck, record } from '../../src/sims/models/d2-1-phase-id';
import { COLS, ROWS, TISSUES, TOTAL, check, field, inMitosis, mitoticIndex, tissueById } from '../../src/sims/models/d2-1-mitotic-index';
import { maternalAge, positions, shown } from '../../src/anims/d2-1-nondisjunction';
import { PHASES as CYCLE, THRESHOLD, cyclinG1S, cyclinM } from '../../src/anims/d2-1-cell-cycle';
import type { SceneContext, SceneModule } from '../../src/viewer3d/types';
import mitosis from '../../src/scenes/d2-1-mitosis';
import meiosis from '../../src/scenes/d2-1-meiosis';

const ctx = (): SceneContext => ({
  THREE,
  scene: new THREE.Scene(),
  material: (_key, opts) => new THREE.MeshStandardMaterial(opts),
  track: (r) => r,
  reducedMotion: false,
});

/** Visible chromatids (groups of 4 arm segments + a centromere) and their centromere positions. */
async function chromatidsAt(mod: SceneModule, step: number) {
  const c = ctx();
  const built = await mod.build(c);
  built.render!(step, 1);
  c.scene.updateMatrixWorld(true);
  const out: THREE.Vector3[] = [];
  c.scene.traverse((o) => {
    if (o instanceof THREE.Group && o.children.length === 5 && o.children.every((m) => m instanceof THREE.Mesh) && o.visible) {
      out.push((o.children[4] as THREE.Mesh).position.clone());
    }
  });
  return out;
}

describe('mitosis scene (2n = 4)', () => {
  it('has 8 chromatids (4 replicated chromosomes) from prophase to anaphase', async () => {
    for (const step of [1, 2, 3]) expect(await chromatidsAt(mitosis, step)).toHaveLength(8);
  });
  it('lines up 4 chromosomes on the equator in metaphase, sister chromatids either side', async () => {
    const c = await chromatidsAt(mitosis, 2);
    expect(c.every((p) => Math.abs(p.x) < 0.3)).toBe(true);
    expect(c.filter((p) => p.x < 0)).toHaveLength(4);
  });
  it('sends 4 chromatids to each pole in anaphase', async () => {
    const c = await chromatidsAt(mitosis, 3);
    expect(c.filter((p) => p.x < -2)).toHaveLength(4);
    expect(c.filter((p) => p.x > 2)).toHaveLength(4);
  });
  it('shows no condensed chromosomes in interphase or after telophase', async () => {
    expect(await chromatidsAt(mitosis, 0)).toHaveLength(0);
    expect(await chromatidsAt(mitosis, 5)).toHaveLength(0);
  });
});

describe('meiosis scene (2n = 4 → 4 cells with n = 2)', () => {
  const quadrant = (p: THREE.Vector3) => `${p.x < 0 ? 'L' : 'R'}${p.y > 0 ? 'T' : 'B'}`;
  it('keeps 8 chromatids throughout (no replication between divisions)', async () => {
    for (let s = 0; s < 8; s++) expect(await chromatidsAt(meiosis, s)).toHaveLength(8);
  });
  it('puts 2 chromosomes of two chromatids (4 chromatids) in each cell after meiosis I', async () => {
    const c = await chromatidsAt(meiosis, 4);
    expect(c.filter((p) => p.x < 0)).toHaveLength(4);
    expect(c.filter((p) => p.x > 0)).toHaveLength(4);
  });
  it('ends with 2 single-chromatid chromosomes in each of four cells', async () => {
    const c = await chromatidsAt(meiosis, 7);
    const counts: Record<string, number> = {};
    for (const p of c) counts[quadrant(p)] = (counts[quadrant(p)] ?? 0) + 1;
    expect(counts).toEqual({ LT: 2, LB: 2, RT: 2, RB: 2 });
  });
});

describe('phase identification model', () => {
  it('draws 16 chromosomes in prophase and metaphase and 16 per group in anaphase (onion, 2n = 16)', () => {
    for (let s = 1; s < 20; s++) {
      expect(countChromosomes(drawCell('prophase', s))).toBe(DIPLOID);
      expect(countChromosomes(drawCell('metaphase', s))).toBe(DIPLOID);
      const a = drawCell('anaphase', s);
      expect(a.chroms).toHaveLength(2 * DIPLOID);
      const upper = a.chroms.filter((c) => c.pts[1]![1] < MIDY - 15).length;
      const lower = a.chroms.filter((c) => c.pts[1]![1] > MIDY + 15).length;
      expect(upper).toBe(DIPLOID);
      expect(lower).toBe(DIPLOID);
    }
  });
  it('puts metaphase chromosomes on the equator and anaphase centromeres nearer the poles than the arms', () => {
    for (let s = 1; s < 20; s++) {
      const m = drawCell('metaphase', s);
      const ys = m.chroms.map((c) => (c.pts[0]![1] + c.pts[1]![1]) / 2);
      expect(Math.max(...ys.map((y) => Math.abs(y - MIDY)))).toBeLessThan(16);
      for (const c of drawCell('anaphase', s).chroms) {
        const cen = c.pts[1]![1], tip = c.pts[0]![1];
        expect(Math.abs(cen - MIDY)).toBeGreaterThan(Math.abs(tip - MIDY));
      }
    }
  });
  it('shows an intact nucleus with nucleoli only in interphase, and two nuclei plus a cell plate in telophase', () => {
    const i = drawCell('interphase', 3);
    expect(i.nuclei).toHaveLength(1);
    expect(i.nuclei[0]!.faint).toBe(false);
    expect(i.nucleoli.length).toBeGreaterThan(0);
    expect(i.chroms).toHaveLength(0);
    for (const p of MITOTIC) expect(drawCell(p, 3).nucleoli).toHaveLength(0);
    expect(drawCell('metaphase', 3).nuclei).toHaveLength(0);
    const t = drawCell('telophase', 3);
    expect(t.nuclei).toHaveLength(2);
    expect(t.plate).not.toBeNull();
  });
  it('builds decks that include every stage and scores answers', () => {
    const deck = makeDeck(10, 4);
    expect(deck).toHaveLength(10);
    for (const p of PHASES) expect(deck.filter((d) => d.phase === p)).toHaveLength(2);
    let s = { answered: 0, correct: 0 };
    s = record(s, 'metaphase', 'metaphase');
    s = record(s, 'prophase', 'interphase');
    expect(s).toEqual({ answered: 2, correct: 1 });
    for (const p of PHASES) { expect(CLUES[p].length).toBeGreaterThan(40); expect(LOOKS[p].length).toBeGreaterThan(40); }
  });
  it('does not count interphase as a phase of mitosis', () => {
    expect(MITOTIC).not.toContain('interphase');
    expect(MITOTIC).toHaveLength(4);
  });
});

describe('mitotic index model', () => {
  it('is cells in mitosis divided by total cells', () => {
    expect(mitoticIndex(14, 70)).toBeCloseTo(0.2);
    expect(mitoticIndex(0, 50)).toBe(0);
    expect(() => mitoticIndex(5, 0)).toThrow();
    expect(() => mitoticIndex(80, 70)).toThrow();
  });
  it('generates fields with the stated number of dividing cells', () => {
    expect(TOTAL).toBe(COLS * ROWS);
    for (const t of TISSUES) for (const seed of [1, 2, 3]) {
      const f = field(t.id, seed);
      expect(f).toHaveLength(TOTAL);
      expect(f.filter((c) => inMitosis(c.phase))).toHaveLength(t.mitotic);
    }
  });
  it('meristem > zone of elongation and tumour > normal tissue', () => {
    const mi = (id: Parameters<typeof tissueById>[0]) => mitoticIndex(tissueById(id).mitotic, TOTAL);
    expect(mi('meristem')).toBeGreaterThan(5 * mi('elongation'));
    expect(mi('tumour')).toBeGreaterThan(3 * mi('normal'));
  });
  it('checks a student count: perfect, missed and wrongly marked cells', () => {
    const f = field('tumour', 1);
    const truth = new Set(f.filter((c) => inMitosis(c.phase)).map((c) => c.i));
    const perfect = check(f, truth);
    expect(perfect.missed).toHaveLength(0);
    expect(perfect.wrong).toHaveLength(0);
    expect(perfect.yourIndex).toBeCloseTo(perfect.trueIndex);
    const interphase = f.find((c) => !inMitosis(c.phase))!.i;
    const one = [...truth][0]!;
    const sloppy = new Set([...truth].filter((i) => i !== one).concat(interphase));
    const r = check(f, sloppy);
    expect(r.missed).toEqual([one]);
    expect(r.wrong).toEqual([interphase]);
    expect(r.yourIndex).toBeCloseTo(r.trueIndex); // one miss + one false mark cancel out in the count
  });
});

describe('non-disjunction animation data', () => {
  it('gives the n + 1 gamete two copies and the fertilized zygote three copies of chromosome 21', () => {
    // step 4 (meiosis II): A1 and B1 in the first gamete, A2 and B2 in the second
    expect(positions.A1![3]![0]).toBeLessThan(130);
    expect(positions.B1![3]![0]).toBeLessThan(130);
    // step 5 (fertilization): A1, B1 and the sperm's copy are visible
    const visible = Object.keys(positions).filter((k) => shown[k]![4] === 1);
    expect(visible.sort()).toEqual(['A1', 'B1', 'S']);
  });
  it('shows prevalence rising with maternal age', () => {
    for (let i = 1; i < maternalAge.length; i++) expect(maternalAge[i]!.per1000).toBeGreaterThanOrEqual(maternalAge[i - 1]!.per1000);
    for (const d of maternalAge) expect(Math.abs(1000 / d.oneIn - d.per1000) / d.per1000).toBeLessThan(0.1);
  });
});

describe('cell cycle animation data', () => {
  it('orders interphase (G1, S, G2) then mitosis then cytokinesis, filling one cycle', () => {
    expect(CYCLE.map((p) => p.id)).toEqual(['G1', 'S', 'G2', 'M', 'C']);
    for (let i = 1; i < CYCLE.length; i++) expect(CYCLE[i]!.from).toBeCloseTo(CYCLE[i - 1]!.to);
    expect(CYCLE[CYCLE.length - 1]!.to).toBe(1);
  });
  it('each cyclin crosses the threshold at its checkpoint', () => {
    const g1End = CYCLE[0]!.to, g2End = CYCLE[2]!.to;
    expect(cyclinG1S(g1End - 0.05)).toBeLessThan(THRESHOLD);
    expect(cyclinG1S(g1End + 0.02)).toBeGreaterThan(THRESHOLD);
    expect(cyclinG1S(0.7)).toBeLessThan(0.1);
    expect(cyclinM(g2End - 0.03)).toBeLessThan(THRESHOLD);
    expect(cyclinM(g2End + 0.01)).toBeGreaterThan(THRESHOLD);
    expect(cyclinM(0.98)).toBeLessThan(0.1); // destroyed before cytokinesis
  });
});

describe('spindle and nuclear envelope (3D scenes)', () => {
  /** Smallest distance from the cell centre to any microtubule while the parent nuclear envelope is still visible. */
  async function closestWhileEnvelope(mod: SceneModule, step: number, nr: number) {
    const c = ctx();
    const built = await mod.build(c);
    let worst = Infinity;
    for (let i = 0; i <= 40; i++) {
      built.render!(step, i / 40);
      let env: THREE.MeshStandardMaterial | undefined;
      let mts: THREE.InstancedMesh | undefined;
      c.scene.traverse((o) => {
        if (o instanceof THREE.InstancedMesh) mts = o;
        else if (o instanceof THREE.Mesh && o.geometry instanceof THREE.SphereGeometry && o.geometry.parameters.radius === nr) env = o.material as THREE.MeshStandardMaterial;
      });
      if (!env || !env.visible || env.opacity < 0.01 || !mts) continue;
      const m = new THREE.Matrix4(), a = new THREE.Vector3(), b = new THREE.Vector3(), line = new THREE.Line3(), q = new THREE.Vector3();
      for (let k = 0; k < mts.count; k++) {
        mts.getMatrixAt(k, m);
        a.set(0, -0.5, 0).applyMatrix4(m); b.set(0, 0.5, 0).applyMatrix4(m);
        line.set(a, b).closestPointToPoint(new THREE.Vector3(), true, q);
        worst = Math.min(worst, q.length());
      }
    }
    return worst;
  }
  it('mitosis: microtubules do not cross the nuclear envelope before it breaks down', async () => {
    expect(await closestWhileEnvelope(mitosis, 1, 2.3)).toBeGreaterThanOrEqual(2.3);
  });
  it('meiosis: microtubules do not cross the nuclear envelope before it breaks down', async () => {
    expect(await closestWhileEnvelope(meiosis, 1, 2.4)).toBeGreaterThanOrEqual(2.4);
  });
});
