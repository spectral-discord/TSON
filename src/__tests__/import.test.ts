jest.deepUnmock('../export');
jest.deepUnmock('../import');

import { toScala } from '../export';
import { fromScala } from '../import';
import { Scale } from '../tson';

const twelveTet: Scale = {
  reference: { frequency: 300 },
  repeat: 2,
  notes: [
    1,
    '2^(1/12)',
    '2^(2/12)',
    '2^(3/12)',
    '2^(5/12)',
    '2^(6/12)',
    '2^(7/12)',
    '2^(4/12)',
    '2^(8/12)',
    '2^(9/12)',
    '2^(10/12)',
    '2^(11/12)'
  ]
};

describe('Scala export tests', () => {
  test('Should export 12tet', () => {
    const scala = toScala(twelveTet, '12 TET');
    const imported = fromScala(scala, {
      id: 'some id',
      name: '12tet',
      referenceFrequency: parseFloat(String(twelveTet.reference.frequency))
    });

    expect(imported.scales[0].reference.frequency).toBe(twelveTet.reference.frequency);
    expect(imported.scales[0].repeat).toBe('2^(1200/1200)');
    expect(imported.scales[0].notes.length).toBe(12);
    expect(imported.scales[0].notes[0]).toStrictEqual({ ratio: 1 });
    expect(imported.scales[0].notes[imported.scales[0].notes.length - 1]).toStrictEqual({ ratio: '2^(1100/1200)' });
    expect(imported.id).toBe('some id');
    expect(imported.description).toBe('12 TET');
    expect(imported.name).toBe('12tet');
  });
});