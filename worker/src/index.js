import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { LetterboxdError, fetchList, fetchPosterUrl, resolveListUrl } from './letterboxd.js';

const HOUR = 60 * 60;
const CACHE_VERSION = 'v2';

const app = new Hono();

app.use('*', (c, next) => cors({ origin: c.env.ALLOWED_ORIGINS.split(',') })(c, next));

async function withCache(c, key, maxAge, load) {
  const cacheKey = new Request(`${new URL(c.req.url).origin}/${CACHE_VERSION}/${key}`);
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) {
    return c.json(await cached.json());
  }

  const data = await load();
  c.executionCtx.waitUntil(
    cache.put(cacheKey, Response.json(data, { headers: { 'Cache-Control': `max-age=${maxAge}` } })),
  );
  return c.json(data);
}

app.get('/list', async (c) => {
  const listUrl = await resolveListUrl(c.req.query('url'));
  return withCache(c, `list?url=${encodeURIComponent(listUrl)}`, HOUR, () => fetchList(listUrl));
});

app.get('/poster', async (c) => {
  const slug = c.req.query('film');
  return withCache(c, `poster?film=${encodeURIComponent(slug)}`, 24 * HOUR, async () => ({
    url: await fetchPosterUrl(slug),
  }));
});

app.onError((err, c) => {
  if (err instanceof LetterboxdError) {
    return c.json({ error: err.code }, err.status);
  }
  console.error(err);
  return c.json({ error: 'unknown' }, 500);
});

export default app;
