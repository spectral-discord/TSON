jest.deepUnmock('../export');

import { toScala } from '../export';
import { Scale } from '../tson';

const twelveTet: Scale = {
  reference: 300,
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

const twelveTetPlusHalf: Scale = {
  reference: 300,
  repeat: 2,
  notes: [
    '2 - 2^(7/12)',
    1,
    '2^(1/12)',
    '2^(3/12)',
    '2^(4/12)',
    '2^(5/12)',
    '2^(6/12)',
    '2^(7/12)',
    '2^(8/12)',
    '2^(9/12)',
    '2^(2/12)',
    '2^(10/12)',
    '2^(11/12)'
  ]
};

const twelveTetWithoutRoot: Scale = {
  reference: 300,
  repeat: 2,
  notes: [
    '2^(1/12)',
    '2^(2/12)',
    '2^(3/12)',
    '2^(7/12)',
    '2^(8/12)',
    '2^(9/12)',
    '2^(10/12)',
    '2^(4/12)',
    '2^(5/12)',
    '2^(6/12)',
    '2^(11/12)'
  ]
};

describe('Export to .scl', () => {
  test('Should export 12tet', () => {
    expect(toScala(twelveTet, '12 TET')).toBe('12 TET\n12\n100.\n200.\n300.\n400.\n500.\n600.\n700.\n800.\n900.\n1000.\n1100.\n1200.');
  });

  test('Should export 12tet without the root', () => {
    expect(toScala(twelveTetWithoutRoot)).toBe('\n11\n100.\n200.\n300.\n400.\n500.\n600.\n700.\n800.\n900.\n1000.\n1200.');
  });

  test('Should export 12tet With an additional note at .5 ratio', () => {
    expect(toScala(twelveTetPlusHalf, '12 TET Plus 0.5 Ratio')).toBe('12 TET Plus 0.5 Ratio\n13\n700.\n800.\n900.\n1000.\n1100.\n1200.\n1300.\n1400.\n1500.\n1600.\n1700.\n1800.\n1900.');
  });
});