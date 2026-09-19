import { describe, expect, it } from 'vitest';
import { parseUsername, watchlistUrl } from '../js/letterboxd.js';

describe('parseUsername', () => {
  it.each([
    'dave',
    '  dave  ',
    '@dave',
    'Dave',
    'letterboxd.com/dave',
    'letterboxd.com/dave/',
    'https://letterboxd.com/dave/watchlist/',
    'https://www.letterboxd.com/dave/films/',
  ])('reads the username out of %s', (input) => {
    expect(parseUsername(input)).toBe('dave');
  });

  it.each(['', '   ', 'letterboxd.com/', 'dave rules', 'https://evil.com/dave/'])(
    'rejects %s',
    (input) => {
      expect(parseUsername(input)).toBeNull();
    },
  );
});

describe('watchlistUrl', () => {
  it('builds a url the worker accepts', () => {
    expect(watchlistUrl('dave')).toBe('https://letterboxd.com/dave/watchlist/');
  });
});
