<h1 align="center">⋆˙⟡ boxdroll ⟡˙⋆</h1>

<p align="center">
paste a letterboxd list. let fate pick.
</p>

<p align="center">
<a href="https://sowiwia.github.io/boxdroll/"><img alt="live" src="https://img.shields.io/badge/▶_roll_now-000000.svg?style=flat"></a>
<img alt="Cloudflare Workers" src="https://img.shields.io/badge/Workers-ff8000.svg?style=flat&logo=cloudflare&logoColor=000000">
<img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-00e054.svg?style=flat&logo=javascript&logoColor=000000">
<img alt="Hono" src="https://img.shields.io/badge/Hono-40bcf4.svg?style=flat&logo=hono&logoColor=000000">
</p>

<p align="center">
<img width="600" src="docs/preview.gif" alt="boxdroll rolling a list"/>
</p>

<h2 align="center">🎞 what</h2>

<p align="center">
other randomizers only pick from your watchlist.<br/>
boxdroll takes <b>any</b> public letterboxd list (or a <code>boxd.it</code> link), spins a pixel slot machine<br/>
and lands on a movie. in english & español.<br/>
⊹₊˚‧︵‿₊୨ᰔ୧₊‿︵‧˚₊⊹
</p>

<h2 align="center">⚙ how</h2>

```
web/  (github pages)  ──►  worker/  (cloudflare)  ──►  letterboxd.com
 html · css · js           hono · htmlrewriter         every page of the list
```

<p align="center">
browsers can't read letterboxd directly (cors), so a tiny worker scrapes the list,<br/>
caches it for an hour and hands back json. the frontend has no build step.
</p>

<h2 align="center">⋆ run it ⋆</h2>

```sh
npm install
npm run dev:worker   # localhost:8787
npm run dev:web      # localhost:3000
npm test
```

<h2 align="center">☕ support</h2>

<p align="center">
if boxdroll picked something good, <a href="https://cafecito.app/sowiwia">buy me a cafecito</a> ♡
</p>

<p align="center">
<sub>MIT · font: <a href="https://github.com/IdreesInc/Monocraft">Monocraft</a> (OFL)</sub>
</p>
