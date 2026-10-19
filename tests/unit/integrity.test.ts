import { describe, expect, it } from 'vitest';
import { parseSections, parseVisualRefs } from '../../src/lib/integrity';

describe('MDX outline parsing', () => {
  const body = `<Section id="a" title="First" level="SL" covers="B2.1.1 B2.1.2">\n<Viewer3D topic="b2-1" id="membrane" />\n</Section>\n<Section id="b" title="Second" level="AHL" covers="B2.1.11">\n<Sim topic="b2-1" id="fluidity" />\n</Section>`;
  it('reads section metadata', () => {
    expect(parseSections(body)).toEqual([
      { id: 'a', title: 'First', level: 'SL', covers: ['B2.1.1', 'B2.1.2'] },
      { id: 'b', title: 'Second', level: 'AHL', covers: ['B2.1.11'] },
    ]);
  });
  it('finds visual references', () => {
    expect(parseVisualRefs(body)).toEqual(['membrane', 'fluidity']);
  });
});
