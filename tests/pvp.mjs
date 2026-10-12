import { parseHTML } from 'linkedom';
import fs from 'node:fs';
import WebSocket from 'ws';
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const { window, document, HTMLElement, CustomEvent, Event, Option } = parseHTML(html);
Object.assign(globalThis, { window, document, HTMLElement, CustomEvent, Event, Option });
globalThis.navigator = window.navigator;
globalThis.location = { protocol: 'http:', host: '127.0.0.1:3000', href: 'http://127.0.0.1:3000/' };
const mem = new Map();
globalThis.localStorage = { getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
globalThis.confirm = () => true;
globalThis.WebSocket = WebSocket;

const { newGame, reduce } = await import('../src/engine/game.js');
const { aiAction } = await import('../src/engine/ai.js');
const { DECKS } = await import('../src/content/decks.js');
const battle = await import('../public/js/battle.js');
await import('../public/js/app.js');
const errors = [];
process.on('unhandledRejection', e => errors.push('unhandled: ' + e.message));

// blockers-modal coverage lives in tests/ui-render.mjs; here we test the wire protocol
const open = (ws) => new Promise(r => ws.on('open', r));
const wait = (ws, type, ms = 4000) => new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('timeout waiting for ' + type)), ms);
  ws.on('message', function h(raw) {
    const m = JSON.parse(raw.toString());
    if (m.type === type) { clearTimeout(to); ws.off('message', h); res(m); }
  });
});

const a = new WebSocket('ws://127.0.0.1:3000/ws');
const b = new WebSocket('ws://127.0.0.1:3000/ws');
await open(a); await open(b);
a.send(JSON.stringify({ type: 'create', name: 'Weaver One', deck: DECKS.avereaux.list }));
const created = await wait(a, 'created');
console.log('room code:', created.code, '| seat:', created.you);
b.send(JSON.stringify({ type: 'join', code: created.code, name: 'Weaver Two', deck: DECKS.tyrant.list }));
const startA = await wait(a, 'start');
const startB = await wait(b, 'start');
console.log('both seated:', startA.you === 0, startB.you === 1,
  '| hand sizes hidden to opponent:',
  startA.state.players[1].hand.every(c => c.hidden), '| mine real:', !startA.state.players[0].hand[0].hidden);

// run the online duel: each side plays its AI-stand-in through the server
let sA = startA.state, done = null, turns = 0;
const action = (ws, seat, st) => {
  const who = st.active === seat && (!st.window || st.window.priority === seat) ? seat : (st.window && st.window.priority === seat ? seat : seat);
  const a2 = aiAction(st, seat);
  return a2;
};
b.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.type === 'state') { sB = m.state; stepB(); }
  if (m.type === 'ended') { done = { winner: m.winner, you: m.you }; }
});
a.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.type === 'state') { sA = m.state; stepA(); }
  if (m.type === 'ended') { done = { winner: m.winner, you: m.you }; }
  if (m.type === 'error') errors.push('server error to A: ' + m.message);
});
let sB = startB.state;
function stepA() {
  const act = aiAction(sA, 0);
  if (act) a.send(JSON.stringify({ type: 'action', action: act }));
}
function stepB() {
  const act = aiAction(sB, 1);
  if (act) b.send(JSON.stringify({ type: 'action', action: act }));
}
// kick off: whoever is on priority
const first = aiAction(sA, 0);
if (first) a.send(JSON.stringify({ type: 'action', action: first }));
await new Promise(r => {
  const iv = setInterval(() => { if (done || ++turns > 400) { clearInterval(iv); r(); } }, 25);
});
console.log('online duel finished:', !!done, '| winner seat:', done && done.winner, '| final turn:', sA.turn, '| A resolve:', sA.players[0].resolve, '| B resolve:', sA.players[1].resolve);
console.log(errors.length ? 'ERRORS: ' + errors.join(' | ') : 'no server/protocol errors');
a.close(); b.close();
process.exit(0);
