import type * as Greeting from '../main';
const { greeting } = jest.requireActual<typeof Greeting>('../main');

describe('greeting function', () => {
  test('Says hello', () => {
    expect(greeting()).toBe('Hello World!');
  });
});

export {};