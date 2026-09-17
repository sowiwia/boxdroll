import { describe, expect, it } from 'vitest';
import {
  LetterboxdError,
  choosePages,
  normalizeListUrl,
  parseListPage,
  parsePosterUrl,
} from '../src/letterboxd.js';
import filmFixture from './fixtures/film-page.html?raw';
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
    expect(() => normalizeListUrl(input)).toThrow(LetterboxdError);
  });
});

describe('parseListPage', () => {
  it('extracts the list name, films and page count', async () => {
    const page = await parseListPage(new Response(fixture));

    expect(page.name).toBe('Horror Movies Everyone Should Watch at Least Once & Twice');
    expect(page.lastPage).toBe(12);
    expect(page.films).toEqual([
      { title: 'X', year: 2022, slug: 'x-2022', url: 'https://letterboxd.com/film/x-2022/' },
      {
        title: "You're Next",
        year: 2011,
        slug: 'youre-next',
        url: 'https://letterboxd.com/film/youre-next/',
      },
      {
        title: 'Untitled Horror Project',
        year: null,
        slug: 'untitled-horror-project',
        url: 'https://letterboxd.com/film/untitled-horror-project/',
      },
    ]);
  });

  it('skips films that link outside letterboxd', async () => {
    const html = `<li class="posteritem">
      <div data-item-name="Bad (2020)" data-item-link="javascript:alert(1)"></div>
    </li><li class="posteritem">
      <div data-item-name="Worse (2020)" data-item-link="https://evil.com/film/worse/"></div>
    </li>`;
    const page = await parseListPage(new Response(html));

    expect(page.films).toEqual([]);
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

describe('parsePosterUrl', () => {
  it('reads the poster from the structured data', async () => {
    expect(await parsePosterUrl(new Response(filmFixture))).toBe(
      'https://a.ltrbxd.com/resized/film-poster/6/8/0/3/5/8/680358-x-0-600-0-900-crop.jpg?v=8ba5e11abf',
    );
  });

  it.each(['javascript:alert(1)', 'http://a.ltrbxd.com/poster.jpg', 'https://evil.com/poster.jpg'])(
    'ignores the untrusted poster url %s',
    async (image) => {
      const page = `<script type="application/ld+json">${JSON.stringify({ image })}</script>`;
      expect(await parsePosterUrl(new Response(page))).toBeNull();
    },
  );

  it('returns null when the page has no poster', async () => {
    expect(await parsePosterUrl(new Response('<html></html>'))).toBeNull();
  });
});
