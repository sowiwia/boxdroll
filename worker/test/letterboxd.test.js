import { describe, expect, it } from 'vitest';
import { ListError, normalizeListUrl, parseListPage } from '../src/letterboxd.js';
import fixture from './fixtures/list-page.html?raw';

describe('normalizeListUrl', () => {
  it.each([
    'https://letterboxd.com/dave/list/top-250/',
    'https://www.letterboxd.com/dave/list/top-250',
    'letterboxd.com/dave/list/top-250/detail/',
    'https://letterboxd.com/dave/list/top-250/page/3/',
    'https://letterboxd.com/dave/list/top-250/by/rating/',
  ])('normalizes %s', (input) => {
    expect(normalizeListUrl(input)).toBe('https://letterboxd.com/dave/list/top-250/');
  });

  it.each([
    'not a url',
    'https://letterboxd.com/dave/',
    'https://letterboxd.com/dave/watchlist/',
    'https://evil.com/dave/list/top-250/',
  ])('rejects %s', (input) => {
    expect(() => normalizeListUrl(input)).toThrow(ListError);
  });
});

describe('parseListPage', () => {
  it('extracts the list name, films and page count', async () => {
    const page = await parseListPage(new Response(fixture));

    expect(page.name).toBe('Horror Movies Everyone Should Watch at Least Once & Twice');
    expect(page.lastPage).toBe(3);
    expect(page.films).toEqual([
      { title: 'X', year: 2022, url: 'https://letterboxd.com/film/x-2022/' },
      { title: "You're Next", year: 2011, url: 'https://letterboxd.com/film/youre-next/' },
      {
        title: 'Untitled Horror Project',
        year: null,
        url: 'https://letterboxd.com/film/untitled-horror-project/',
      },
    ]);
  });
});
