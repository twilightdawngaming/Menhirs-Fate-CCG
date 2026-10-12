// ---------------------------------------------------------------------------
// server.js — serves the game and runs authoritative online duels.
// ---------------------------------------------------------------------------
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';

import { newGame, reduce, redact } from './src/engine/game.js';
import { CARD_BY_ID } from './src/engine/cards/index.js';
import { DECKS } from './src/content/decks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
// the engine is shared, verbatim, with the browser client
app.use('/src', express.static(path.join(__dirname, 'src')));
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size, uptime: process.uptime() }));
app.get('/api/decks', (_req, res) => res.json(
  Object.fromEntries(Object.entries(DECKS).map(([k, d]) => [k, { name: d.name, nation: d.nation, list: d.list }])),
));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// ---------------------------------------------------------------------------
// rooms
// ---------------------------------------------------------------------------
const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function makeCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function sanitiseDeck(list) {
  if (!Array.isArray(list)) return null;
  const clean = list.filter(id => typeof id === 'string' && CARD_BY_ID[id] && !CARD_BY_ID[id].token);
  if (clean.length < 40) return null;
  return clean.slice(0, 60);
}

function send(ws, obj) { try { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch (e) { /* gone */ } }

function broadcastState(room) {
  room.seats.forEach((seat, i) => {
    if (!seat || !seat.ws) return;
    send(seat.ws, { type: 'state', state: redact(room.state, i) });
  });
}

wss.on('connection', (ws) => {
  ws.seat = null; ws.room = null; ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (e) { return send(ws, { type: 'error', message: 'Malformed message.' }); }
    try { handle(ws, msg); } catch (err) {
      console.error('handler error', err);
      send(ws, { type: 'error', message: 'The Gods are briefly unavailable.' });
    }
  });

  ws.on('close', () => {
    const room = ws.room && rooms.get(ws.room);
    if (!room) return;
    room.seats.forEach((seat, i) => {
      if (seat && seat.ws && seat.ws !== ws) send(seat.ws, { type: 'opponentLeft' });
    });
    room.seats = room.seats.map(s => (s && s.ws === ws ? null : s));
    if (!room.seats.some(Boolean)) rooms.delete(room.code);
  });
});

function handle(ws, msg) {
  if (msg.type === 'create') {
    const deck = sanitiseDeck(msg.deck) || DECKS.avereaux.list;
    const code = makeCode();
    const room = { code, seats: [{ name: (msg.name || 'A Weaver').slice(0, 24), deck, ws }], state: null, started: false };
    rooms.set(code, room);
    ws.room = code; ws.seat = 0;
    send(ws, { type: 'created', code, you: 0 });
    return;
  }
  if (msg.type === 'join') {
    const code = String(msg.code || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) return send(ws, { type: 'error', message: 'No such room. Check the code.' });
    if (room.seats.length > 1 && room.seats[1]) return send(ws, { type: 'error', message: 'That room is already full.' });
    const deck = sanitiseDeck(msg.deck) || DECKS.tyrant.list;
    room.seats[1] = { name: (msg.name || 'A Weaver').slice(0, 24), deck, ws };
    ws.room = code; ws.seat = 1;
    send(ws, { type: 'joined', code, you: 1 });
    // deal them in
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e6)) >>> 0;
    room.state = newGame({
      p1: { name: room.seats[0].name, deck: room.seats[0].deck, ai: false },
      p2: { name: room.seats[1].name, deck: room.seats[1].deck, ai: false },
      seed,
    });
    room.started = true;
    room.seats.forEach((seat, i) => {
      send(seat.ws, {
        type: 'start', you: i, state: redact(room.state, i),
        opponentName: room.seats[1 - i].name,
      });
    });
    return;
  }
  if (msg.type === 'action') {
    const room = ws.room && rooms.get(ws.room);
    if (!room || !room.started || !room.state) return send(ws, { type: 'error', message: 'No duel in progress.' });
    const seat = ws.seat;
    const r = reduce(room.state, msg.action, seat);
    if (r.error) return send(ws, { type: 'error', message: r.error });
    room.state = r.state;
    broadcastState(room);
    if (room.state.winner != null) {
      room.seats.forEach((s, i) => s && s.ws && send(s.ws, {
        type: 'ended', winner: room.state.winner, you: i,
      }));
    }
    return;
  }
  if (msg.type === 'chat') {
    const room = ws.room && rooms.get(ws.room);
    if (!room) return;
    const text = String(msg.text || '').slice(0, 300);
    room.seats.forEach((s, i) => s && s.ws && send(s.ws, { type: 'chat', from: s.name, text }));
    return;
  }
  if (msg.type === 'leave') {
    const room = ws.room && rooms.get(ws.room);
    if (!room) return;
    room.seats.forEach(s => { if (s && s.ws !== ws) send(s.ws, { type: 'opponentLeft' }); });
    ws.room = null;
    return;
  }
  send(ws, { type: 'error', message: 'Unknown request.' });
}

// keepalive so a dropped player does not hold a room forever
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.alive === false) return ws.terminate();
    ws.alive = false;
    try { ws.ping(); } catch (e) { /* ignore */ }
  });
}, 30000);

server.listen(PORT, HOST, () => {
  console.log(`Menhirs Fate: Weavers of Elandra — listening on http://${HOST}:${PORT}`);
});
