// ---------------------------------------------------------------------------
// tools/verify-deployment.mjs — check a deployed copy of the game end to end.
//
//   node tools/verify-deployment.mjs https://your-site.example
//   node tools/verify-deployment.mjs http://localhost:3000
//
// Verifies: the page and its assets are served, the shared engine modules are
// reachable, and (if the target hosts duel rooms) that a websocket can create
// a room. Exits non-zero on failure so it can gate a deploy.
// ---------------------------------------------------------------------------
import WebSocket from 'ws';

const target = (process.argv[2] || '').replace(/\/$/, '');
if (!target) {
  console.error('usage: node tools/verify-deployment.mjs <https://your-site>');
  process.exit(2);
}

const problems = [];
const ok = (label, detail = '') => console.log(`  \u2713 ${label}${detail ? '  ' + detail : ''}`);
const bad = (label, detail = '') => { problems.push(label); console.log(`  \u2717 ${label}${detail ? '  ' + detail : ''}`); };

console.log(`verifying ${target}\n`);

// ---- 1. the page ------------------------------------------------------------
let indexBody = '';
try {
  const res = await fetch(target + '/');
  if (!res.ok) bad(`page returned HTTP ${res.status}`);
  else {
    indexBody = await res.text();
    if (/Menhirs Fate/.test(indexBody)) ok('page served', `${(indexBody.length / 1024).toFixed(0)} KB`);
    else bad('page served but does not look like the game');
  }
} catch (err) { bad('could not reach the site', err.message); }

// ---- 2. assets + shared engine ---------------------------------------------
if (indexBody) {
  const assets = [...indexBody.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]).filter(u => !u.startsWith('data:'));
  for (const a of assets) {
    const url = `${target}/${a.replace(/^\.?\//, '')}`;
    try {
      const r = await fetch(url);
      if (r.ok) ok(`asset ${a}`);
      else bad(`asset ${a} returned ${r.status}`);
    } catch (err) { bad(`asset ${a} unreachable`, err.message); }
  }
  const modules = ['src/engine/game.js', 'src/engine/cards/index.js', 'src/content/campaign.js'];
  for (const m of modules) {
    try {
      const r = await fetch(`${target}/${m}`);
      if (r.ok) {
        const text = await r.text();
        // a static host that rewrites to index.html would serve HTML here
        if (/^\s*<(!doctype|html)/i.test(text)) bad(`module ${m} served HTML — check the base path / 404 handling`);
        else ok(`module ${m}`);
      } else bad(`module ${m} returned ${r.status}`);
    } catch (err) { bad(`module ${m} unreachable`, err.message); }
  }
}

// ---- 3. duel rooms over websockets -----------------------------------------
const wsTarget = target.replace(/^http/, 'ws') + '/ws';
await new Promise((resolve) => {
  const ws = new WebSocket(wsTarget);
  const done = (fn) => { try { ws.close(); } catch (e) { /* ignore */ } fn(); resolve(); };
  const timer = setTimeout(() => done(() => bad('websocket timed out — the server may not host duel rooms')), 6000);
  ws.on('open', () => ws.send(JSON.stringify({ type: 'create', name: 'deployment-check', deck: [] })));
  ws.on('message', (raw) => {
    let msg = null;
    try { msg = JSON.parse(raw.toString()); } catch (e) { /* ignore */ }
    if (msg && msg.type === 'created') {
      clearTimeout(timer);
      done(() => ok('duel rooms available', `room ${msg.code} created`));
    }
  });
  ws.on('error', (err) => {
    clearTimeout(timer);
    done(() => {
      if (/static|not.*(ws|socket)/i.test(err.message) || /ECONNREFUSED|Unexpected server response: (200|403|404|405)/.test(err.message)) {
        console.log('  \u2013 duel rooms not hosted here (this looks like a static deployment)');
        console.log('    the story campaign and AI duels still work; see README for hosting the duel server');
      } else bad('websocket error', err.message);
    });
  });
});

console.log(problems.length ? `\nFAILED: ${problems.length} problem(s)` : '\nALL CHECKS PASSED');
process.exit(problems.length ? 1 : 0);
