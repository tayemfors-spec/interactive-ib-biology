import * as THREE from 'three';
import type { PaletteKey, SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry } from '../viewer3d/kit';
import { ease, lerp, phase } from '../lib/timeline';
import { H_BONDS, baseKit, pool, type NBase } from './d1-2-kit';

/*
 * D1.2 translation of a short mRNA (the transcript made in the transcription model), seven steps:
 *   0 the small ribosomal subunit (carrying the initiator tRNA) binds near the 5′ end of the mRNA
 *   1 it moves to the start codon AUG; the anticodon UAC pairs with it; the large subunit joins
 *   2 a second tRNA enters the A site; its anticodon pairs with the codon there
 *   3 a peptide bond joins Met to Ala (catalysed by rRNA of the large subunit); the chain is now on the A-site tRNA
 *   4 the ribosome moves one codon towards the 3′ end: P-site tRNA → E site, A-site tRNA → P site
 *   5 three more cycles add Phe, Lys and Val; each empty tRNA leaves from the E site
 *   6 the stop codon UAA reaches the A site; a release factor (a protein, not a tRNA) binds; the
 *     polypeptide is released and the subunits separate
 * mRNA runs 5′ (left) → 3′ (right) with its bases pointing up. Codon k occupies nucleotides 4+3k … 6+3k.
 * Anticodons are antiparallel to codons (e.g. codon 5′-AUG-3′ pairs with anticodon 3′-UAC-5′).
 * The ribosome position `pc` is the index of the first nucleotide of the codon in the P site.
 */
const MRNA = 'GACCAUGGCAUUCAAAGUGUAAG'.split('') as NBase[];
const N = MRNA.length;
const PAIR: Record<string, NBase> = { A: 'U', U: 'A', G: 'C', C: 'G' };
const C0 = 4; // first base of the start codon
const codonStart = (k: number) => C0 + 3 * k;
const AA_KEY: PaletteKey[] = ['k', 'water', 'carb', 'na', 'head']; // Met, Ala, Phe, Lys, Val
const S = 0.75;
const AC_Y = 2.2; // height of the anticodon backbone above the mRNA backbone
const AA_Y = 6.0; // height of the amino acid on a seated tRNA
const xOf = (i: number) => (i - (N - 1) / 2) * S;
const xCodon = (k: number) => xOf(codonStart(k) + 1);

interface Trna { k: number; enter: number; leave: number }
interface Snap {
  pc: number; small: number; large: number; // small/large: 1 = in place, 0 = away
  trnas: Trna[];
  chainOn: number; chainLen: number; transfer: number; // chain of residues 0..chainLen-1 on tRNA chainOn, moving to chainOn+1
  rf: number; release: number; separate: number; paired0: number;
}

/** Elongation cycle bringing in tRNA k (k = 1…4), local progress u. */
const cycle = (k: number, u: number): Snap => ({
  pc: codonStart(k - 1) + 3 * ease(phase(u, 0.58, 1)),
  small: 1, large: 1,
  trnas: [
    ...(k >= 2 ? [{ k: k - 2, enter: 1, leave: ease(phase(u, 0, 0.32)) }] : []),
    { k: k - 1, enter: 1, leave: 0 },
    { k, enter: ease(phase(u, 0, 0.3)), leave: 0 },
  ],
  chainOn: k - 1, chainLen: k, transfer: ease(phase(u, 0.32, 0.55)),
  rf: 0, release: 0, separate: 0, paired0: 1,
});

const snap = (index: number, t: number): Snap => {
  const base: Snap = { pc: 0, small: 1, large: 0, trnas: [{ k: 0, enter: 1, leave: 0 }], chainOn: 0, chainLen: 1, transfer: 0, rf: 0, release: 0, separate: 0, paired0: 0 };
  switch (index) {
    case 0: return { ...base, small: ease(phase(t, 0, 0.8)) };
    case 1: return { ...base, pc: lerp(0, C0, ease(phase(t, 0, 0.45))), paired0: ease(phase(t, 0.45, 0.55)), large: ease(phase(t, 0.55, 1)) };
    case 2: return cycle(1, 0.3 * t);
    case 3: return cycle(1, 0.3 + 0.25 * t);
    case 4: return cycle(1, 0.55 + 0.45 * t);
    case 5: {
      const tt = Math.min(2.9999, t * 3);
      const k = 2 + Math.floor(tt);
      return cycle(k, t >= 1 ? 1 : tt - Math.floor(tt));
    }
    default: return {
      pc: codonStart(4), small: 1, large: 1,
      trnas: [{ k: 3, enter: 1, leave: ease(phase(t, 0, 0.25)) }, { k: 4, enter: 1, leave: ease(phase(t, 0.62, 0.9)) }],
      chainOn: 4, chainLen: 5, transfer: 0,
      rf: ease(phase(t, 0.05, 0.3)), release: ease(phase(t, 0.35, 0.65)), separate: ease(phase(t, 0.65, 1)), paired0: 1,
    };
  }
};

const scene: SceneModule = {
  camera: { position: [0, 3.6, 22.5], target: [0, 2.8, 0], fov: 38, minDistance: 8, maxDistance: 48 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const bead = ctx.track(new THREE.SphereGeometry(0.2, 12, 8));
    const stickGeo = ctx.track(new THREE.CylinderGeometry(0.075, 0.075, 1, 6));
    const mBeads = pool(ctx, root, bead, 'chol', N, { roughness: 0.35 });
    const mSticks = pool(ctx, root, stickGeo, 'chol', N);
    const acBeads = pool(ctx, root, bead, 'chol', 24, { roughness: 0.35 });
    const aaGeo = ctx.track(new THREE.SphereGeometry(0.42, 18, 12));
    const aaPools = AA_KEY.map((key) => pool(ctx, root, aaGeo, key, 2, { roughness: 0.4 }));
    const pepBonds = pool(ctx, root, ctx.track(new THREE.CylinderGeometry(0.1, 0.1, 1, 8)), 'text', 12);
    const bases = baseKit(ctx, root, 60);
    const GAP = AC_Y - 0.36;

    // ribosome: two subunits of rRNA + protein, translucent so the tRNAs and mRNA show through
    const small = new THREE.Mesh(ctx.track(blobGeometry(1.35, 8.8, 61, 0.1)), ctx.material('neutral', { roughness: 0.7, transparent: true, opacity: 0.55, depthWrite: false }));
    small.rotation.z = Math.PI / 2;
    const large = new THREE.Mesh(ctx.track(blobGeometry(3.0, 9.8, 62, 0.12)), ctx.material('neutral', { roughness: 0.7, transparent: true, opacity: 0.24, depthWrite: false }));
    large.rotation.z = Math.PI / 2;
    root.add(small, large);

    // tRNAs: a cloverleaf-like body (anticodon loop at the bottom, amino acid attachment site at the top)
    const tMat = ctx.material('tail', { roughness: 0.55 });
    const makeTrna = (seed: number, mat: THREE.Material = tMat) => {
      const g = new THREE.Group();
      const stem = new THREE.Mesh(ctx.track(blobGeometry(0.42, 3.0, seed, 0.08, 14)), mat);
      stem.position.y = AC_Y + 1.9;
      const armL = new THREE.Mesh(ctx.track(blobGeometry(0.3, 1.2, seed + 1, 0.08, 12)), mat);
      armL.position.set(-0.62, AC_Y + 2.0, 0); armL.rotation.z = Math.PI / 2;
      const armR = new THREE.Mesh(ctx.track(blobGeometry(0.3, 1.2, seed + 2, 0.08, 12)), mat);
      armR.position.set(0.62, AC_Y + 2.0, 0); armR.rotation.z = Math.PI / 2;
      const loop = new THREE.Mesh(ctx.track(new THREE.TorusGeometry(0.62, 0.13, 8, 20, Math.PI)), mat);
      loop.position.y = AC_Y + 0.15; loop.rotation.z = Math.PI; // U-shaped anticodon loop opening downwards
      g.add(stem, armL, armR, loop);
      g.visible = false;
      root.add(g);
      return g;
    };
    const trnas = [0, 1, 2, 3, 4].map((k) => makeTrna(70 + k * 5));
    const rfMat = ctx.material('protein', { roughness: 0.55 });
    const rf = new THREE.Group();
    const rfBody = new THREE.Mesh(ctx.track(blobGeometry(0.7, 3.6, 90, 0.12, 16)), rfMat);
    rfBody.position.y = AC_Y + 1.7;
    rf.add(rfBody);
    rf.visible = false;
    root.add(rf);

    const mrnaPts = MRNA.map((_, i) => v(xOf(i), 0, 0));
    const anticodon = (k: number) => [0, 1, 2].map((j) => PAIR[MRNA[codonStart(k) + j]!]!);

    const A = (name: string) => anchorAt(root, 0, 0, 0, name);
    const an = {
      mrna: A('mrna'), five: A('five-prime'), small: A('small-subunit'), large: A('large-subunit'), start: A('start-codon'),
      codon: A('codon'), anticodon: A('anticodon'), trna: A('trna'), a: A('a-site'), p: A('p-site'), e: A('e-site'),
      bond: A('peptide-bond'), chain: A('polypeptide'), stop: A('stop-codon'), rf: A('release-factor'),
    };
    an.five.position.set(xOf(0) - 0.5, -0.3, 0.4);
    an.mrna.position.set(xOf(N - 2), 0.1, 0.5);
    an.start.position.set(xCodon(0), 0.5, 0.5);
    an.stop.position.set(xCodon(5), 0.5, 0.5);

    const render = (index: number, t: number) => {
      const sn = snap(index, t);
      for (const p of [mBeads, mSticks, acBeads, pepBonds, ...aaPools]) p.begin();
      bases.begin();

      // mRNA
      mrnaPts.forEach((p, i) => {
        mBeads.dot(p);
        if (i > 0) mSticks.span(mrnaPts[i - 1]!, p);
        bases.base(MRNA[i]!, p, v(0, 1, 0), GAP);
      });

      // ribosome
      const xp = xOf(sn.pc + 1);
      small.position.set(xp, -1.15 - 6 * (1 - sn.small) - 1.4 * sn.separate, -0.7);
      large.position.set(xp - 0.2, 3.5 + 7 * (1 - sn.large) + 1.6 * sn.separate, -0.6);
      (large.material as THREE.MeshStandardMaterial).opacity = 0.24 * Math.min(1, sn.large * 1.5);
      large.visible = sn.large > 0.01;
      small.visible = sn.small > 0.01 || index > 0;

      // tRNAs
      const aaTop = new Map<number, THREE.Vector3>();
      for (const g of trnas) g.visible = false;
      for (const tr of sn.trnas) {
        const g = trnas[tr.k]!;
        const seated = v(xCodon(tr.k), 0, 0);
        let pos: THREE.Vector3;
        if (tr.k === 0 && sn.paired0 < 1) {
          // the initiator tRNA rides on the small subunit until the start codon is reached
          pos = v(xp, 0.5 * (1 - sn.paired0) - 6 * (1 - sn.small), 0);
        } else {
          pos = seated.clone().add(v(2.2, 5.5, 2.5).multiplyScalar(1 - tr.enter)).add(v(-3.2, 5.5, 2.5).multiplyScalar(tr.leave));
        }
        if (tr.leave >= 0.999) continue;
        g.visible = true;
        g.position.copy(pos);
        aaTop.set(tr.k, pos.clone().add(v(0, AA_Y, 0)));
        // anticodon: three bases pointing down, antiparallel to the codon
        const ac = anticodon(tr.k);
        ac.forEach((b, j) => {
          const p = pos.clone().add(v((j - 1) * S, AC_Y, 0));
          acBeads.dot(p);
          const tip = bases.base(b, p, v(0, -1, 0), GAP);
          const cod = MRNA[codonStart(tr.k) + j]!;
          const close = tr.enter > 0.98 && tr.leave < 0.02 && (tr.k !== 0 || sn.paired0 > 0.98) && sn.separate < 0.05;
          if (close) bases.bonds(H_BONDS(b, cod), tip, mrnaPts[codonStart(tr.k) + j]!.clone().add(v(0, 0.18 + GAP * (cod === 'A' || cod === 'G' ? 0.56 : 0.36), 0)), v(1, 0, 0));
        });
      }
      // release factor in the A site at termination
      rf.visible = sn.rf > 0.001;
      rf.position.copy(v(xCodon(5), 0, 0).add(v(2.2, 5.5, 2.5).multiplyScalar(1 - sn.rf)).add(v(0, 0.3, 0).multiplyScalar(sn.separate)));
      // label sits on the front face of the capsule, upper half (clear of the stop-codon label below)
      an.rf.position.copy(rf.position).add(v(0.55, AC_Y + 2.4, 0.6));

      // amino acids: free ones sit on their tRNA; the chain is on tRNA chainOn (moving to chainOn+1)
      const chainPos = (attach: THREE.Vector3, d: number) => attach.clone().add(v(-0.42 * d, 0.62 * d, (d % 2 ? 0.25 : -0.05)));
      const resPts: THREE.Vector3[] = [];
      const from = aaTop.get(sn.chainOn) ?? v(xCodon(sn.chainOn), AA_Y, 0);
      const to = aaTop.get(sn.chainOn + 1);
      const fly = v(-4.5, 0.2, 2.5).multiplyScalar(sn.release);
      for (let j = 0; j < sn.chainLen; j++) {
        const d = sn.chainLen - 1 - j;
        let p = chainPos(from, d);
        if (to && sn.transfer > 0) p = p.lerp(chainPos(to, d + 1), sn.transfer);
        p.add(fly);
        resPts.push(p);
        aaPools[j]!.dot(p);
      }
      for (const tr of sn.trnas) {
        if (tr.k < sn.chainLen || tr.leave >= 0.999) continue; // already part of the chain
        const p = aaTop.get(tr.k);
        if (!p) continue;
        aaPools[tr.k]!.dot(p);
        if (sn.transfer > 0.5 && tr.k === sn.chainOn + 1) resPts.push(p);
      }
      for (let j = 1; j < resPts.length; j++) pepBonds.span(resPts[j - 1]!, resPts[j]!, 1);

      for (const p of [mBeads, mSticks, acBeads, pepBonds, ...aaPools]) p.end();
      bases.end();

      // anchors that move with the ribosome
      an.small.position.set(xp + 2.6, -1.9 - 6 * (1 - sn.small) - 1.4 * sn.separate, 0.4);
      an.large.position.set(xp + 3.1, 5.6 + 7 * (1 - sn.large) + 1.6 * sn.separate, 2.4);
      an.e.position.set(xOf(sn.pc - 2), 3.0, 3.3);
      an.p.position.set(xp, 3.0, 3.3);
      an.a.position.set(xOf(sn.pc + 4), 3.0, 3.3);
      const aK = Math.round((sn.pc - C0) / 3) + 1;
      an.codon.position.set(xCodon(Math.min(5, aK)), 0.6, 0.5);
      const aT = trnas[Math.min(4, aK)]!;
      an.anticodon.position.copy((index <= 1 ? trnas[0]! : aT).position).add(v(0.9, AC_Y - 0.1, 0.4));
      const pT = trnas[Math.max(0, Math.min(4, aK - 1))]!;
      an.trna.position.copy(pT.position).add(v(0.7, AC_Y + 3.0, 3.0));
      const last = resPts.length - 1;
      an.bond.position.copy(last >= 1 ? resPts[last]!.clone().lerp(resPts[last - 1]!, 0.5) : v(xp, AA_Y, 0)).add(v(0, 0, 0.4));
      an.chain.position.copy(resPts[Math.max(0, Math.floor(last / 2))] ?? v(xp, AA_Y, 0)).add(v(0, 0, 0.6));
    };

    return {
      anchors: {
        mrna: { object: an.mrna, highlight: [mBeads.mesh, mSticks.mesh] },
        'five-prime': { object: an.five, highlight: [] },
        'small-subunit': { object: an.small, highlight: [small] },
        'large-subunit': { object: an.large, highlight: [large] },
        'start-codon': { object: an.start, highlight: [] },
        codon: { object: an.codon, highlight: [] },
        anticodon: { object: an.anticodon, highlight: [acBeads.mesh] },
        trna: { object: an.trna, highlight: trnas },
        'a-site': { object: an.a, highlight: [] },
        'p-site': { object: an.p, highlight: [] },
        'e-site': { object: an.e, highlight: [] },
        'peptide-bond': { object: an.bond, highlight: [pepBonds.mesh] },
        polypeptide: { object: an.chain, highlight: aaPools.map((p) => p.mesh) },
        'stop-codon': { object: an.stop, highlight: [] },
        'release-factor': { object: an.rf, highlight: [rfBody] },
      },
      durations: [4, 6, 4, 4, 4, 12, 7],
      render,
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
