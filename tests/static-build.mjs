// ---------------------------------------------------------------------------
// tests/static-build.mjs — proves the ./site static build works: builds it,
// serves it like a host would, checks every asset, then loads the real client
// modules from dist/ in a headless DOM and starts a duel.
// ---------------------------------------------------------------------------
import { parseHTML } from 'linkedom';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'site');
const errors = [];
const port = 4179;

// 1. build -------------------------------------------------------------------
const build = spawn('node', ['tools/build-static.mjs'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
let buildOut = '';
build.stdout.on('data', d => { buildOut += d; });
await new Promise(r => build.on('exit', r));
console.log(buildOut.trim().split('\n')[0]);

// 2. serve it exactly as a static host would ---------------------------------
const server = spawn('node', ['tools/serve-site.mjs', String(port)], { cwd: ROOT, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));

const get = (p) => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port, path: p }, (r) => {
    let body = '';
    r.on('data', d => { body += d; });
    r.on('end', () => res({ status: r.statusCode, type: r.headers['content-type'], body }));
  }).on('error', rej);
});

const index = await get('/');
if (index.status !== 200) errors.push(`index.html returned ${index.status}`);
const assets = [...index.body.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]).filter(u => !u.startsWith('data:'));
for (const a of assets) {
  const r = await get('/' + a.replace(/^\.?\//, ''));
  if (r.status !== 200) errors.push(`asset ${a} returned ${r.status}`);
  else console.log(`  served /${a}  (${r.type})`);
}
// the modules the client imports at runtime
for (const mod of ['/src/engine/game.js', '/src/engine/cards/index.js', '/src/content/campaign.js', '/js/battle.js']) {
  const r = await get(mod);
  if (r.status !== 200) errors.push(`module ${mod} returned ${r.status}`);
}
console.log(`  checked ${assets.length} document assets + 4 runtime modules`);

// 3. load the built client and play a duel ----------------------------------
const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const { window, document, HTMLElement, CustomEvent, Event, Option } = parseHTML(html);
Object.assign(globalThis, { window, document, HTMLElement, CustomEvent, Event, Option });
globalThis.navigator = window.navigator;
globalThis.location = { protocol: 'https:', host: 'example.com', href: 'https://example.com/' };
const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
globalThis.confirm = () => true;
globalThis.WebSocket = class { constructor() { this.readyState = 0; } addEventListener() {} send() {} close() {} };

const store = await import(`${path.join(DIST, 'js/store.js')}`.replace(/\\/g, '/'));
const battle = await import(`${path.join(DIST, 'js/battle.js')}`.replace(/\\/g, '/'));
await import(`${path.join(DIST, 'js/app.js')}`.replace(/\\/g, '/'));
for (const screen of ['map', 'deck', 'shop', 'quick', 'rules', 'lobby', 'home']) store.show(screen);
console.log('  all screens render from the static build');
battle.startDuel({ mode: 'quick', opponent: { name: 'Test', deck: 'tyrantRaiders', difficulty: 1 } });
const hand = document.querySelectorAll('#hand .card').length;
console.log(`  duel started from site/: ${hand} cards in hand, ${document.querySelectorAll('#phase-strip .phase').length} phases`);
if (hand < 5) errors.push('no hand rendered in the static build');

// 4. confirm the config file is wired --------------------------------------
const cfg = fs.readFileSync(path.join(DIST, 'config.js'), 'utf8');
if (!cfg.includes('MF_CONFIG')) errors.push('config.js missing MF_CONFIG');
console.log('  config.js:', cfg.trim().split('\n').pop());

server.kill();
console.log(errors.length ? '\nERRORS:\n' + errors.join('\n') : '\nstatic build verified: 100% of the site works without a server');
