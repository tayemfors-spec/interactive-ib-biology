/**
 * Schematic top-view drawings (viewBox 0 0 120 90) of the eight specimens in the A3.1 key.
 * The features the key uses are drawn faithfully: number of leg pairs, legs per segment, shell,
 * wing cases and waist. Classes are styled by the sim: .o (outline), .b (body), .s (shell),
 * .r (wing cases), .d (dark marks), .l (legs/antennae).
 */

const f = (n: number) => n.toFixed(1);
const leg = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) =>
  `<path class="l" d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} L${f(x3)} ${f(y3)}"/>`;

function snail() {
  return `<path class="b" d="M14 66 C 20 58, 60 56, 98 60 C 108 61, 112 66, 106 70 C 80 74, 30 74, 14 70 Z"/>
    <path class="l" d="M102 60 L108 44 M98 60 L100 46"/><circle class="d" cx="108" cy="44" r="2"/><circle class="d" cx="100" cy="46" r="2"/>
    <circle class="s" cx="52" cy="40" r="24"/>
    <path class="o" fill="none" d="M52 40 m0 0 a4 4 0 1 1 6 3 a9 9 0 1 1 -14 -9 a15 15 0 1 1 22 17 a21 21 0 1 1 -30 -26"/>`;
}

function worm() {
  let rings = '';
  for (let i = 0; i <= 26; i++) {
    const x = 10 + i * 3.8;
    const y = 45 + Math.sin(i / 4) * 10;
    rings += `<path class="o" d="M${f(x)} ${f(y - 6)} L${f(x)} ${f(y + 6)}"/>`;
  }
  const top = Array.from({ length: 27 }, (_, i) => `${f(10 + i * 3.8)} ${f(45 + Math.sin(i / 4) * 10 - 6)}`);
  const bottom = Array.from({ length: 27 }, (_, i) => `${f(10 + (26 - i) * 3.8)} ${f(45 + Math.sin((26 - i) / 4) * 10 + 6)}`);
  return `<path class="b" d="M${top.join(' L')} L${bottom.join(' L')} Z"/>${rings}
    <rect class="s" x="${f(10 + 7 * 3.8)}" y="${f(45 + Math.sin(7 / 4) * 10 - 7)}" width="15" height="14" rx="4"/>`;
}

function ladybird() {
  let legs = '';
  for (const [i, y] of [36, 46, 56].entries()) {
    legs += leg(52, y, 34, y - 6 + i * 4, 26, y + 2 + i * 3);
    legs += leg(68, y, 86, y - 6 + i * 4, 94, y + 2 + i * 3);
  }
  return `${legs}<path class="l" d="M54 22 L46 12 M66 22 L74 12"/>
    <ellipse class="d" cx="60" cy="24" rx="10" ry="6"/>
    <ellipse class="r" cx="60" cy="50" rx="24" ry="27"/>
    <path class="o" d="M60 24 L60 77"/>
    <circle class="d" cx="60" cy="30" r="4"/>
    <circle class="d" cx="48" cy="42" r="4"/><circle class="d" cx="72" cy="42" r="4"/>
    <circle class="d" cx="45" cy="57" r="4"/><circle class="d" cx="75" cy="57" r="4"/>
    <circle class="d" cx="53" cy="68" r="3.5"/><circle class="d" cx="67" cy="68" r="3.5"/>`;
}

function ant() {
  let legs = '';
  for (const [i, x] of [44, 50, 56].entries()) {
    legs += leg(x, 45, x - 8 + i * 6, 30, x - 16 + i * 10, 18);
    legs += leg(x, 45, x - 8 + i * 6, 60, x - 16 + i * 10, 72);
  }
  return `${legs}<path class="l" d="M22 42 L14 34 L6 36 M22 48 L14 56 L6 54"/>
    <ellipse class="d" cx="25" cy="45" rx="8" ry="7"/>
    <ellipse class="d" cx="50" cy="45" rx="15" ry="6"/>
    <path class="d" d="M64 43 L71 43 L71 47 L64 47 Z"/>
    <ellipse class="d" cx="70" cy="45" rx="3" ry="4.5"/>
    <ellipse class="d" cx="92" cy="45" rx="18" ry="13"/>`;
}

function spider() {
  let legs = '';
  const ys = [36, 41, 47, 52];
  ys.forEach((y, i) => {
    const up = i < 2;
    legs += leg(46, y, 30, up ? y - 20 + i * 6 : y + 8 + (i - 2) * 6, 12 + i * 4, up ? y - 6 + i * 4 : y + 26 + (i - 2) * 4);
    legs += leg(54, y, 70, up ? y - 20 + i * 6 : y + 8 + (i - 2) * 6, 88 - i * 4, up ? y - 6 + i * 4 : y + 26 + (i - 2) * 4);
  });
  return `${legs}
    <ellipse class="b" cx="50" cy="44" rx="10" ry="12"/>
    <ellipse class="b" cx="78" cy="44" rx="20" ry="17" transform="rotate(0 78 44)"/>
    <path class="o" fill="none" d="M70 44 L88 44 M78 34 L78 54 M72 38 L84 50 M84 38 L72 50"/>
    <circle class="d" cx="44" cy="40" r="1.6"/><circle class="d" cx="44" cy="48" r="1.6"/>`;
}

function woodlouse() {
  let legs = '';
  let plates = '';
  for (let i = 0; i < 7; i++) {
    const x = 34 + i * 8;
    legs += leg(x, 32, x - 2, 20, x - 6, 14);
    legs += leg(x, 58, x - 2, 70, x - 6, 76);
  }
  for (let i = 0; i < 10; i++) {
    const x = 28 + i * 7;
    plates += `<path class="o" fill="none" d="M${x} 24 Q ${x + 3} 45 ${x} 66"/>`;
  }
  return `${legs}<path class="l" d="M22 40 L10 30 L4 32 M22 50 L10 60 L4 58"/>
    <ellipse class="b" cx="58" cy="45" rx="38" ry="22"/>${plates}
    <path class="l" d="M96 42 L106 38 M96 48 L106 52"/>`;
}

function centipede() {
  let s = '';
  const n = 15;
  for (let i = 0; i < n; i++) {
    const x = 18 + i * 6;
    s += leg(x + 2, 40, x - 1, 30, x - 5, 26);
    s += leg(x + 2, 50, x - 1, 60, x - 5, 64);
  }
  s += `<path class="l" d="M14 43 L4 30 M14 47 L4 60"/><path class="l" d="M108 43 L116 34 M108 47 L116 56"/>`;
  s += `<rect class="b" x="12" y="39" width="${n * 6 + 4}" height="12" rx="5"/>`;
  for (let i = 1; i < n; i++) s += `<path class="o" d="M${15 + i * 6} 39 L${15 + i * 6} 51"/>`;
  return s;
}

function millipede() {
  let s = '';
  const n = 16;
  for (let i = 0; i < n; i++) {
    const x = 20 + i * 5.5;
    for (const dx of [0, 2.6]) {
      s += leg(x + dx, 41, x + dx - 1, 34, x + dx - 2, 31);
      s += leg(x + dx, 49, x + dx - 1, 56, x + dx - 2, 59);
    }
  }
  s += `<path class="l" d="M14 43 L8 37 M14 47 L8 53"/>`;
  s += `<rect class="d" x="12" y="39" width="${n * 5.5 + 8}" height="12" rx="6"/>`;
  for (let i = 1; i < n; i++) s += `<path class="seg" d="M${f(18 + i * 5.5)} 40 L${f(18 + i * 5.5)} 50"/>`;
  return s;
}

export const art: Record<string, () => string> = { snail, worm, ladybird, ant, spider, woodlouse, centipede, millipede };
