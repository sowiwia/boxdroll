import { describe, expect, it } from 'vitest';
import { ListError, choosePages, normalizeListUrl, parseListPage } from '../src/letterboxd.js';
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
    expect(page.lastPage).toBe(12);
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

describe('choosePages', () => {
  it('returns every other page when the list is small', () => {
    expect(choosePages(4).sort()).toEqual([2, 3, 4]);
  });

  it('samples distinct pages across the whole list when it is too long', () => {
    const pages = choosePages(1000, 40);

    expect(pages).toHaveLength(39);
    expect(new Set(pages).size).toBe(39);
    expect(pages.every((page) => page >= 2 && page <= 1000)).toBe(true);
  });
});
