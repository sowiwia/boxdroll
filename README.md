# boxdroll

Paste a Letterboxd list, spin the reel, watch whatever it lands on.

Existing randomizers only pick from your own watchlist. boxdroll works with any public list.

## How it works

```
browser (GitHub Pages)  ──►  Cloudflare Worker  ──►  letterboxd.com
     web/                        worker/
```

Browsers can't read Letterboxd pages directly (CORS), so a small Worker fetches the list, parses every page with `HTMLRewriter` and returns JSON:

```
GET /list?url=https://letterboxd.com/user/list/some-list/

{ "name": "...", "url": "...", "films": [{ "title": "...", "year": 2022, "url": "..." }] }
```

Responses are cached for an hour. Short `boxd.it` links work too.

The frontend is plain HTML, CSS and JavaScript modules with no build step.

## Stack

- **web**: HTML, CSS, JS modules, [canvas-confetti](https://github.com/catdad/canvas-confetti), [Monocraft](https://github.com/IdreesInc/Monocraft) font
- **worker**: [Hono](https://hono.dev) on Cloudflare Workers, [entities](https://github.com/fb55/entities)
- **tooling**: Vitest (running inside the Workers runtime), Prettier, GitHub Actions

## Development

Requires Node 24.

```sh
npm install
npm run dev:worker   # http://localhost:8787
npm run dev:web      # http://localhost:3000
```

On localhost the site talks to the local Worker automatically.

```sh
npm test
npm run format
```

## Deployment

Pushing to `main` deploys automatically:

- `web/` changes → GitHub Pages
- `worker/` changes → Cloudflare Workers (needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets)

## License

Code under MIT. Monocraft is licensed under the SIL Open Font License (`web/fonts/OFL.txt`).
