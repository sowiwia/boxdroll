import { decodeHTML } from 'entities';

const BASE_URL = 'https://letterboxd.com';
const MAX_PAGES = 40;
// Letterboxd starts erroring and crawling when the whole fan-out lands at once.
const CONCURRENCY = 6;
const PAGE_TIMEOUT_MS = 8000;
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  'Accept-Language': 'en',
};

// A watchlist is just another wall of posters, so it goes down the same pipe as a list.
const SOURCE_PATH = /^\/([\w-]+)\/(?:list\/([\w-]+)|watchlist)(?:\/|$)/;
const SHORT_LINK = /^(https?:\/\/)?boxd\.it\/([\w-]+)\/?([?#].*)?$/i;
const NAME_WITH_YEAR = /^(.*) \((\d{4})\)$/;
const PAGE_LINK = /\/page\/(\d+)\/?$/;
const FILM_LINK = /^\/film\/([a-z0-9-]+)\/$/;
const FILM_SLUG = /^[a-z0-9-]+$/;
const FILM_ITEMS = ['li.posteritem [data-item-name]', 'li.griditem [data-item-name]'];
const CDATA_COMMENT = /\/\*.*?\*\//g;
const POSTER_HOST = /^([\w-]+\.)*ltrbxd\.com$/;

export class LetterboxdError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

function toUrl(input) {
  try {
    return new URL(input.includes('://') ? input : `https://${input}`);
  } catch {
    throw new LetterboxdError('invalid_url', 400);
  }
}

export function normalizeListUrl(input) {
  const url = toUrl(input);
  const host = url.hostname.replace(/^www\./, '');
  const match = url.pathname.match(SOURCE_PATH);

  if (host !== 'letterboxd.com' || !match) {
    throw new LetterboxdError('invalid_url', 400);
  }

  const [, user, slug] = match;
  return slug ? `${BASE_URL}/${user}/list/${slug}/` : `${BASE_URL}/${user}/watchlist/`;
}

export async function resolveListUrl(input = '') {
  const trimmed = input.trim();
  const shortLink = trimmed.match(SHORT_LINK);
  if (!shortLink) {
    return normalizeListUrl(trimmed);
  }

  const response = await fetch(`https://boxd.it/${shortLink[2]}`, { redirect: 'manual' });
  const location = response.headers.get('Location');
  if (!location) {
    throw new LetterboxdError('invalid_url', 400);
  }
  return normalizeListUrl(location);
}

function toFilm(rawName, link) {
  const url = URL.parse(link ?? '', BASE_URL);
  // The frontend turns this into a clickable link, so only ever hand back Letterboxd pages.
  if (!rawName || url?.origin !== BASE_URL) {
    return null;
  }

  const name = decodeHTML(rawName);
  const match = name.match(NAME_WITH_YEAR);
  return {
    title: match ? match[1] : name,
    year: match ? Number(match[2]) : null,
    slug: link.match(FILM_LINK)?.[1] ?? null,
    url: url.href,
  };
}

export async function parseListPage(response) {
  const page = { name: '', films: [], lastPage: 1 };
  const film = {
    element(el) {
      const parsed = toFilm(el.getAttribute('data-item-name'), el.getAttribute('data-item-link'));
      if (parsed) {
        page.films.push(parsed);
      }
    },
  };

  const rewriter = new HTMLRewriter()
    .on('meta[property="og:title"]', {
      element(el) {
        page.name = decodeHTML(el.getAttribute('content') ?? '');
      },
    })
    .on('.paginate-page a', {
      element(el) {
        const match = el.getAttribute('href')?.match(PAGE_LINK);
        if (match) {
          page.lastPage = Math.max(page.lastPage, Number(match[1]));
        }
      },
    });

  // Lists draw their posters as .posteritem, watchlists as .griditem; the attributes match.
  for (const selector of FILM_ITEMS) {
    rewriter.on(selector, film);
  }

  await rewriter.transform(response).arrayBuffer();

  return page;
}

export function choosePages(lastPage, limit = MAX_PAGES) {
  const pages = Array.from({ length: lastPage - 1 }, (_, i) => i + 2);
  for (let i = pages.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pages[i], pages[j]] = [pages[j], pages[i]];
  }
  return pages.slice(0, limit - 1);
}

async function fetchLetterboxd(url) {
  let response;
  try {
    response = await fetch(url, {
      headers: REQUEST_HEADERS,
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    });
  } catch {
    console.error(`letterboxd timeout ${url}`);
    throw new LetterboxdError('upstream', 502);
  }

  if (response.status === 404) {
    throw new LetterboxdError('not_found', 404);
  }
  if (!response.ok) {
    // Letterboxd's own status never reaches the client, and it is the only clue when a roll fails.
    console.error(`letterboxd ${response.status} ${url}`);
    throw new LetterboxdError('upstream', 502);
  }
  return response;
}

async function fetchPage(listUrl, pageNumber) {
  const url = pageNumber === 1 ? listUrl : `${listUrl}page/${pageNumber}/`;
  return parseListPage(await fetchLetterboxd(url));
}

// A few pages at a time, and a page that fails is simply left out: one flaky page out of forty
// used to sink the whole roll, and forty at once made Letterboxd flaky in the first place.
async function fetchRemainingPages(listUrl, pageNumbers) {
  const queue = [...pageNumbers];
  const films = [];

  const readers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let pageNumber = queue.pop(); pageNumber; pageNumber = queue.pop()) {
      try {
        films.push(...(await fetchPage(listUrl, pageNumber)).films);
      } catch {
        // The roll only needs enough films to spin, not every page.
      }
    }
  });
  await Promise.all(readers);

  return films;
}

export async function fetchList(listUrl) {
  const firstPage = await fetchPage(listUrl, 1);
  const films = [
    ...firstPage.films,
    ...(await fetchRemainingPages(listUrl, choosePages(firstPage.lastPage))),
  ];
  if (films.length === 0) {
    throw new LetterboxdError('empty', 422);
  }

  return { name: firstPage.name, url: listUrl, films };
}

export async function parsePosterUrl(response) {
  let structuredData = '';

  await new HTMLRewriter()
    .on('script[type="application/ld+json"]', {
      text({ text }) {
        structuredData += text;
      },
    })
    .transform(response)
    .arrayBuffer();

  let image;
  try {
    image = JSON.parse(structuredData.replace(CDATA_COMMENT, '')).image;
  } catch {
    return null;
  }

  const url = typeof image === 'string' ? URL.parse(image) : null;
  return url?.protocol === 'https:' && POSTER_HOST.test(url.hostname) ? url.href : null;
}

export async function fetchPosterUrl(slug = '') {
  if (!FILM_SLUG.test(slug)) {
    throw new LetterboxdError('invalid_film', 400);
  }
  return parsePosterUrl(await fetchLetterboxd(`${BASE_URL}/film/${slug}/`));
}
