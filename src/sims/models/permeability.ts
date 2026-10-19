/** How common particles cross a phospholipid bilayer. Facts reviewed against standard textbooks. */
export type Route = 'bilayer' | 'bilayer-slow' | 'protein' | 'vesicle';
export interface Particle {
  id: string;
  name: string;
  formula: string;
  size: 'small' | 'medium' | 'large';
  polarity: 'non-polar' | 'polar' | 'charged';
  route: Route;
  /** Passes through the hydrophobic core unaided? */
  crossesBilayer: boolean;
  how: string;
  why: string;
}

export const particles: Particle[] = [
  { id: 'o2', name: 'Oxygen', formula: 'O₂', size: 'small', polarity: 'non-polar', route: 'bilayer', crossesBilayer: true,
    how: 'Simple diffusion straight through the bilayer.',
    why: 'Small and non-polar, so it dissolves in the hydrophobic core and slips between the phospholipids.' },
  { id: 'co2', name: 'Carbon dioxide', formula: 'CO₂', size: 'small', polarity: 'non-polar', route: 'bilayer', crossesBilayer: true,
    how: 'Simple diffusion straight through the bilayer.',
    why: 'Its C=O bonds are polar, but the molecule is linear so the bond dipoles cancel: overall it is non-polar and small.' },
  { id: 'steroid', name: 'Steroid hormone (e.g. oestradiol)', formula: 'C₁₈H₂₄O₂', size: 'medium', polarity: 'non-polar', route: 'bilayer', crossesBilayer: true,
    how: 'Simple diffusion through the bilayer.',
    why: 'Steroids are lipids, mostly hydrophobic, so they dissolve in the membrane core despite being larger than O₂.' },
  { id: 'water', name: 'Water', formula: 'H₂O', size: 'small', polarity: 'polar', route: 'bilayer-slow', crossesBilayer: true,
    how: 'Osmosis: slowly through the bilayer, and much faster through aquaporins.',
    why: 'Water is polar, which slows its passage through the hydrophobic core, but it is so small that some molecules still get through. Aquaporins raise the rate greatly.' },
  { id: 'glucose', name: 'Glucose', formula: 'C₆H₁₂O₆', size: 'medium', polarity: 'polar', route: 'protein', crossesBilayer: false,
    how: 'Needs a membrane protein: facilitated diffusion through glucose transporters, or cotransport with Na⁺.',
    why: 'Glucose is polar (many –OH groups) and fairly large, so the hydrophobic core is almost impermeable to it.' },
  { id: 'na', name: 'Sodium ion', formula: 'Na⁺', size: 'small', polarity: 'charged', route: 'protein', crossesBilayer: false,
    how: 'Needs a membrane protein: channels (facilitated diffusion) or pumps (active transport).',
    why: 'Ions are charged and surrounded by a shell of water molecules, so they cannot enter the hydrophobic core even though they are small.' },
  { id: 'protein', name: 'Protein (e.g. an enzyme)', formula: '—', size: 'large', polarity: 'polar', route: 'vesicle', crossesBilayer: false,
    how: 'Too large for membrane transport proteins: taken in by endocytosis or released by exocytosis.',
    why: 'Proteins are very large and have many polar and charged groups on their surface.' },
];

export const routeLabel: Record<Route, string> = {
  bilayer: 'Crosses the bilayer freely',
  'bilayer-slow': 'Crosses slowly (fast via aquaporins)',
  protein: 'Blocked by the bilayer: needs a protein',
  vesicle: 'Blocked: moved in vesicles',
};
