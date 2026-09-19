import { describe, expect, it } from 'vitest';
import {
  LetterboxdError,
  choosePages,
  fetchList,
  normalizeListUrl,
  parseListPage,
  parsePosterUrl,
} from '../src/letterboxd.js';
import filmFixture from './fixtures/film-page.html?raw';
import fixture from './fixtures/list-page.html?raw';
import watchlistFixture from './fixtures/watchlist-page.html?raw';

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
    'https://letterboxd.com/dave/watchlist/',
    'https://www.letterboxd.com/dave/watchlist',
    'letterboxd.com/dave/watchlist/page/4/',
    'https://letterboxd.com/dave/watchlist/by/rating/',
  ])('normalizes the watchlist %s', (input) => {
    expect(normalizeListUrl(input)).toBe('https://letterboxd.com/dave/watchlist/');
  });

  it.each([
    'not a url',
    'https://letterboxd.com/dave/',
    'https://letterboxd.com/dave/watchlisted/',
    'https://letterboxd.com/dave/films/',
    'https://evil.com/dave/list/top-250/',
    'https://evil.com/dave/watchlist/',
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

describe('parseListPage on a watchlist', () => {
  it('reads the grid watchlists render instead of a poster list', async () => {
    const page = await parseListPage(new Response(watchlistFixture));

    expect(page.name).toBe('James (Schaffrillas)\u2019s Watchlist');
    expect(page.lastPage).toBe(7);
    expect(page.films).toEqual([
      {
        title: 'Sita Sings the Blues',
        year: 2008,
        slug: 'sita-sings-the-blues',
        url: 'https://letterboxd.com/film/sita-sings-the-blues/',
      },
      {
        title: 'Frankenstein',
        year: 2022,
        slug: 'frankenstein-2022',
        url: 'https://letterboxd.com/film/frankenstein-2022/',
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

describe('fetchList', () => {
  const page = (films, lastPage) =>
    new Response(
      `<meta property="og:title" content="Long list" />
       ${films.map((film) => `<li class="griditem"><div data-item-name="${film} (2020)" data-item-link="/film/${film}/"></div></li>`).join('')}
       <li class="paginate-page"><a href="/dave/watchlist/page/${lastPage}/">${lastPage}</a></li>`,
    );

  it('keeps the pages that loaded when letterboxd fails one of them', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (url.endsWith('/page/2/')) {
        return new Response('nope', { status: 500 });
      }
      return url.endsWith('/page/3/') ? page(['third'], 3) : page(['first'], 3);
    };

    try {
      const list = await fetchList('https://letterboxd.com/dave/watchlist/');
      expect(list.films.map((film) => film.slug)).toEqual(['first', 'third']);
    } finally {
      globalThis.fetch = original;
    }
  });

  it('still fails when the first page does', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => new Response('nope', { status: 500 });

    try {
      await expect(fetchList('https://letterboxd.com/dave/watchlist/')).rejects.toThrow(
        LetterboxdError,
      );
    } finally {
      globalThis.fetch = original;
    }
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
