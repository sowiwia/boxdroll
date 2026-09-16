import { decodeHTML } from 'entities';

const BASE_URL = 'https://letterboxd.com';
const MAX_PAGES = 40;
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  'Accept-Language': 'en',
};

const LIST_PATH = /^\/([\w-]+)\/list\/([\w-]+)/;
const SHORT_LINK = /^(https?:\/\/)?boxd\.it\//i;
const NAME_WITH_YEAR = /^(.*) \((\d{4})\)$/;

export class ListError extends Error {
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
    throw new ListError('invalid_url', 400);
  }
}

export function normalizeListUrl(input) {
  const url = toUrl(input);
  const host = url.hostname.replace(/^www\./, '');
  const match = url.pathname.match(LIST_PATH);

  if (host !== 'letterboxd.com' || !match) {
    throw new ListError('invalid_url', 400);
  }

  const [, user, slug] = match;
  return `${BASE_URL}/${user}/list/${slug}/`;
}

export async function resolveListUrl(input = '') {
  const trimmed = input.trim();
  if (!SHORT_LINK.test(trimmed)) {
    return normalizeListUrl(trimmed);
  }

  const response = await fetch(toUrl(trimmed), { redirect: 'manual' });
  const location = response.headers.get('Location');
  if (!location) {
    throw new ListError('invalid_url', 400);
  }
  return normalizeListUrl(location);
}

function toFilm(rawName, link) {
  const name = decodeHTML(rawName);
  const match = name.match(NAME_WITH_YEAR);
  return {
    title: match ? match[1] : name,
    year: match ? Number(match[2]) : null,
    url: new URL(link, BASE_URL).href,
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
        page.films.push(
          toFilm(el.getAttribute('data-item-name'), el.getAttribute('data-item-link')),
        );
      },
    })
    .on('.paginate-page a', {
      text({ text }) {
        page.lastPage = Math.max(page.lastPage, Number(text) || 0);
      },
    })
    .transform(response)
    .arrayBuffer();

  return page;
}

async function fetchPage(listUrl, pageNumber) {
  const url = pageNumber === 1 ? listUrl : `${listUrl}page/${pageNumber}/`;
  const response = await fetch(url, { headers: REQUEST_HEADERS });

  if (response.status === 404) {
    throw new ListError('not_found', 404);
  }
  if (!response.ok) {
    throw new ListError('upstream', 502);
  }
  return parseListPage(response);
}

export async function fetchList(listUrl) {
  const firstPage = await fetchPage(listUrl, 1);
  const pageCount = Math.min(firstPage.lastPage, MAX_PAGES);
  const otherPages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, i) => fetchPage(listUrl, i + 2)),
  );

  const films = [firstPage, ...otherPages].flatMap((page) => page.films);
  if (films.length === 0) {
    throw new ListError('empty', 422);
  }

  return { name: firstPage.name, url: listUrl, films };
}
