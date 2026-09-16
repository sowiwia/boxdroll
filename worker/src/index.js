import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ListError, fetchList, resolveListUrl } from './letterboxd.js';

const CACHE_SECONDS = 60 * 60;

const app = new Hono();

app.use('*', (c, next) => cors({ origin: c.env.ALLOWED_ORIGINS.split(',') })(c, next));

app.get('/list', async (c) => {
  const listUrl = await resolveListUrl(c.req.query('url'));
  const cacheKey = new Request(
    `${new URL(c.req.url).origin}/list?url=${encodeURIComponent(listUrl)}`,
  );
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) {
    return c.json(await cached.json());
  }

  const list = await fetchList(listUrl);
  c.executionCtx.waitUntil(
    cache.put(
      cacheKey,
      Response.json(list, { headers: { 'Cache-Control': `max-age=${CACHE_SECONDS}` } }),
    ),
  );
  return c.json(list);
});

app.onError((err, c) => {
  if (err instanceof ListError) {
    return c.json({ error: err.code }, err.status);
  }
  console.error(err);
  return c.json({ error: 'unknown' }, 500);
});

export default app;
