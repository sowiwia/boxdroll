import { decodeHTML } from 'entities';

const BASE_URL = 'https://letterboxd.com';
const MAX_PAGES = 40;
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  'Accept-Language': 'en',
};

const LIST_PATH = /^\/([\w-]+)\/list\/([\w-]+)/;
const SHORT_LINK = /^(https?:\/\/)?boxd\.it\/([\w-]+)\/?([?#].*)?$/i;
const NAME_WITH_YEAR = /^(.*) \((\d{4})\)$/;
const PAGE_LINK = /\/page\/(\d+)\/?$/;
const FILM_LINK = /^\/film\/([a-z0-9-]+)\/$/;
const FILM_SLUG = /^[a-z0-9-]+$/;
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
  const match = url.pathname.match(LIST_PATH);

  if (host !== 'letterboxd.com' || !match) {
    throw new LetterboxdError('invalid_url', 400);
  }

  const [, user, slug] = match;
  return `${BASE_URL}/${user}/list/${slug}/`;
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

  await new HTMLRewriter()
    .on('meta[property="og:title"]', {
      element(el) {
        page.name = decodeHTML(el.getAttribute('content') ?? '');
      },
    })
    .on('li.posteritem [data-item-name]', {
      element(el) {
        const film = toFilm(el.getAttribute('data-item-name'), el.getAttribute('data-item-link'));
        if (film) {
          page.films.push(film);
        }
      },
    })
    .on('.paginate-page a', {
      element(el) {
        const match = el.getAttribute('href')?.match(PAGE_LINK);
        if (match) {
          page.lastPage = Math.max(page.lastPage, Number(match[1]));
        }
      },
    })
    .transform(response)
    .arrayBuffer();

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
  const response = await fetch(url, { headers: REQUEST_HEADERS });

  if (response.status === 404) {
    throw new LetterboxdError('not_found', 404);
  }
  if (!response.ok) {
    throw new LetterboxdError('upstream', 502);
  }
  return response;
}

async function fetchPage(listUrl, pageNumber) {
  const url = pageNumber === 1 ? listUrl : `${listUrl}page/${pageNumber}/`;
  return parseListPage(await fetchLetterboxd(url));
}

export async function fetchList(listUrl) {
  const firstPage = await fetchPage(listUrl, 1);
  const otherPages = await Promise.all(
    choosePages(firstPage.lastPage).map((pageNumber) => fetchPage(listUrl, pageNumber)),
  );

  const films = [firstPage, ...otherPages].flatMap((page) => page.films);
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
