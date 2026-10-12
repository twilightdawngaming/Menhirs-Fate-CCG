# Deploying Menhirs Fate as a website

Two decisions, then it's copy-paste.

## Decision 1 — do you want online duels?

| | Static site | Full server |
|---|---|---|
| Story campaign | ✅ | ✅ |
| AI duels, deck builder, Bank | ✅ | ✅ |
| Room-code duels vs a friend | ❌ | ✅ |
| Hosts | Netlify, GitHub Pages, Cloudflare Pages, Vercel | Render, Fly.io, Railway, any VPS |
| Cost | free | free tier, then a few pounds a month |

The reason for the split: the **campaign and AI duels run entirely in the browser** — the rules
engine is shared client/server code, so the single-player half of the game needs nothing but files.
**Online duels** need a Node process to hold the room and adjudicate, because that's what makes them
cheatable-proof.

You can do both: put the static site on Netlify/GitHub Pages and a duel server on Render, then point
the site at it with one config value.

## Decision 2 — deploy the built site as-is, or from source?

I've included a **pre-built website in `site/`** (312 KB, no build step). It works right now:

```
npm run serve:site      # → http://localhost:4173  (preview the static build)
npm start               # → http://localhost:3000  (full game with duel rooms)
```

Rebuild it any time with `npm run build` — set `WS_URL` first if you want duel rooms baked in:

```bash
WS_URL=wss://your-duel-server.example.com/ws npm run build
```

---

## Option A — Full game, one click (recommended)

Everything works, including online duels, from a single URL.

### A1. Render  *(easiest — free tier, websockets included)*

1. Push this folder to a GitHub repository:
   ```bash
   git init && git add . && git commit -m "Menhirs Fate: Weavers of Elandra"
   git remote add origin git@github.com:you/menhirs-fate.git && git push -u origin main
   ```
2. On [render.com](https://render.com): **New → Blueprint**, pick the repo.
   `render.yaml` is already in the project, so Render builds the `Dockerfile` and gives you an
   `https://menhirs-fate.onrender.com` URL. Health checks and websocket upgrades are configured.
3. Open the URL. Online duel → *Create a room* → share the four-letter code.

> Free Render services sleep after inactivity and take ~30s to wake. That's the price of free.

### A2. Any VPS, Fly.io, Railway or your own machine

```bash
docker build -t menhirs-fate .
docker run -p 3000:3000 menhirs-fate        # → http://localhost:3000
```

Without Docker: `npm ci && npm start`, then put Nginx/Caddy in front and **forward the websocket
upgrade header** — this is the one step people forget:

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;      # ← room-code duels need these three
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

```caddyfile
menhirs.example.com {
    reverse_proxy 127.0.0.1:3000      # Caddy handles websockets automatically
}
```

### A3. Health check and post-deploy verification

The server exposes `GET /health` (used by the Docker healthcheck). After deploying, run the
verifier against your live URL — it checks the page, every asset, the shared engine modules, and
creates a real room over a websocket:

```bash
node tools/verify-deployment.mjs https://menhirs-fate.onrender.com
```

```
verifying https://menhirs-fate.onrender.com
  ✓ page served  11 KB
  ✓ asset js/app.js
  ✓ module src/engine/cards/index.js
  ✓ duel rooms available  room ADTK created
ALL CHECKS PASSED
```

---

## Option B — Static site only (free, fast, no server)

Story campaign and AI duels only; the Online Duel screen will tell players that duel rooms aren't
hosted there.

### B1. GitHub Pages

1. Push to GitHub (as above).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. The included workflow (`.github/workflows/pages.yml`) builds `site/` and deploys it on every push.
   Your game lands at `https://you.github.io/menhirs-fate/`.
   The build uses relative paths, so it works in a sub-folder like that with no changes.
4. *(Optional)* **Settings → Secrets and variables → Actions → Variables → New variable:**
   `WS_URL` = `wss://your-duel-server.example.com/ws` if you're running a duel server elsewhere.

### B2. Netlify

Netlify reads the included `netlify.toml`: build `node tools/build-static.mjs`, publish `site/`.

* **Drag and drop:** open [app.netlify.com/drop](https://app.netlify.com/drop) and drag the `site/`
  folder in. Done — that's a live URL in about ten seconds.
* **From Git:** *Add new site → Import an existing project → GitHub → pick the repo.* Netlify uses
  the config file automatically. Add a `WS_URL` environment variable if you want duel rooms.

### B3. Cloudflare Pages / Vercel

Same idea — build command `node tools/build-static.mjs`, output directory `site`.

---

## Adding a custom domain

Then, on whichever host you chose: add the domain, and point DNS at it.

* **Render:** Settings → Custom Domain → add `menhirs.example.com`, then at your registrar create a
  `CNAME` record pointing to your `*.onrender.com` hostname. TLS is automatic.
* **GitHub Pages:** repo Settings → Pages → Custom domain (writes a `CNAME` file), then a `CNAME`
  DNS record to `you.github.io`.
* **Netlify:** Domain settings → Add domain → follow the DNS instructions; HTTPS is issued free.

---

## How the pieces fit together (for when you want to change something)

```
public/              the client (HTML, CSS, JS, generated SVG card art)
src/                 the rules engine + all 254 cards + the campaign script
  engine/            share-by-design: the browser and the server run the same code
  content/decks.js   13 preconstructed decks, graded campaign opposition, starter deck
  content/campaign.js  the story, branches, rewards, endings
server.js            static host + authoritative duel rooms over /ws
tools/build-static.mjs   produces site/ (rewrites /src imports, writes config.js)
tools/verify-deployment.mjs   post-deploy smoke test
Dockerfile / render.yaml / netlify.toml / .github/workflows/pages.yml
```

To change the game, edit `src/` or `public/` and re-run `npm run build` (static) or restart
`npm start` (server) — there is no bundler, no compilation, and no dependency beyond Express and `ws`.

### A note on saves

Player progress (chapters cleared, collection, deck, Saga, story flags) lives in the browser's
`localStorage`. That means it is per-device and per-address: moving from a `localhost` playtest to
your live site starts a fresh character, which is correct behaviour but worth knowing before you
wonder where your deck went. A server-side save would need a database — the natural next step if you
ever want accounts.
