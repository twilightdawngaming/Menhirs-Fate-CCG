// ---------------------------------------------------------------------------
// battle.js — the duel board: rendering, interaction, AI driver, online duels
// ---------------------------------------------------------------------------
import { newGame, reduce, legalActions, canCast, powerOf, vigilOf, hasKw } from '../src/engine/game.js';
import { aiAction, aiTargets } from '../src/engine/ai.js';
import { instantiate, heroesOf, enemyHeroes } from '../src/engine/ops.js';
import { CARD_BY_ID, NATIONS, SPHERE_INFO, KEYWORDS } from '../src/engine/cards/index.js';
import { DECKS, STARTER_DECK } from '../src/content/decks.js';
import { renderCard, hiddenCard } from './cardview.js';
import { SPHERE_COLOUR, SPHERE_GLYPH } from './art.js';
import { save, show, toast, el, persist } from './store.js';
import { connect } from './net.js';

export const G = {
  state: null, human: 0, mode: 'quick', meta: {}, sel: null, awaitTarget: null,
  attackMode: false, attackers: new Set(), net: null, room: null, finished: false,
  lastRenderedTurn: -1,
};

const $ = (id) => document.getElementById(id);
const mkOption = (label, value) => { const o = document.createElement('option'); o.textContent = label; o.value = value; return o; };

// ---------------------------------------------------------------------------
// starting a duel
// ---------------------------------------------------------------------------
export function startDuel({ mode, chapter, choice, opponent, playerDeck, playerName, playerNation, difficulty }) {
  const opp = opponent || { name: 'The Corrupted', deck: 'tyrant', difficulty: 2 };
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e6)) >>> 0;
  const s = newGame({
    p1: { name: playerName || 'You', deck: (playerDeck && playerDeck.length >= 40) ? playerDeck : STARTER_DECK, ai: false, avatar: playerNation || null },
    p2: {
      name: opp.name || 'The Corrupted', deck: (DECKS[opp.deck] || DECKS.tyrant).list, ai: true,
      difficulty: difficulty || opp.difficulty || 2, avatar: opp.portrait || opp.deck,
    },
    seed,
    options: { startResolve: 20, startResolve2: opp.resolve || 20, chapter: chapter ? chapter.id : null },
  });
  applyPerks(s, opp, 1);
  G.state = s; G.human = 0; G.mode = mode || 'quick';
  G.meta = { chapter, choice, opponent: opp };
  G.sel = null; G.awaitTarget = null; G.attackMode = false; G.attackers = new Set();
  G.net = null; G.finished = false; G.lastRenderedTurn = -1;
  $('modal-layer').classList.remove('on'); $('modal-layer').innerHTML = '';
  show('battle');
  render();
  setTimeout(pumpAI, 700);
}

// Boss perks are implemented as starting conditions on the board.
function applyPerks(s, opp, aiIdx) {
  const perk = (opp.perk && opp.perk.name) || '';
  const p = s.players[aiIdx];
  const addRelic = (id) => { const c = CARD_BY_ID[id]; if (c) p.field.relics.push(instantiate(s, c, aiIdx)); };
  if (perk.includes('Menhir') || perk.includes('Crown') || perk.includes('Three Powers')) addRelic('mn-crown');
  if (perk.includes('Three Powers')) addRelic('mn-valdraeth');
  if (perk.includes('Undeath')) {
    // Athra begins with two of the Fallen already standing
    for (const id of ['fa-husk', 'fa-marrow']) {
      const deckIdx = p.deck.findIndex(c => c.id === id);
      const card = deckIdx >= 0 ? p.deck.splice(deckIdx, 1)[0] : null;
      if (card) { card.sick = false; p.field.heroes.push(card); }
    }
  }
  if (perk.includes('Unwritten')) { p.deck.splice(0, 0); }
  if (opp.menhir) addRelic('mn-circle');
}

// ---------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------
export function render() {
  const s = G.state; if (!s) return;
  const me = G.human, ai = 1 - me;
  const la = legalActions(s, me);
  $('phase-strip').innerHTML = ['rally', 'main', 'clash', 'end']
    .map(p => `<span class="phase${s.phase === p ? ' on' : ''}">${p}</span>`).join('');

  renderPlate($('my-plate'), s, me, me);
  renderPlate($('enemy-plate'), s, ai, me);

  renderZones(s, me);
  renderZones(s, ai);
  renderHand(s, me, la);
  renderLog(s);
  updateControls(s, me, la);
  renderMana(s, me);

  if (G.sel) inspectCard(G.sel);
  else $('inspect').style.display = 'none';

  if (s.winner != null && !G.finished) finishDuel();
}

function spherePool(p) {
  return Object.entries(p.mana || {}).filter(([, v]) => v > 0)
    .map(([k, v]) => `<span class="pip" style="background:${SPHERE_COLOUR[k] || '#888'}" title="${k}">${v}</span>`).join('');
}

function renderMana(s, me) {
  const p = s.players[me];
  const total = Object.values(p.mana || {}).reduce((a, b) => a + b, 0);
  $('mana-pool').innerHTML = total
    ? `Attuned: ${spherePool(p)}`
    : `<span style="opacity:.5">no mana attuned — click your leylines</span>`;
}

function renderPlate(node, s, idx, viewer) {
  const p = s.players[idx];
  const pct = Math.max(0, Math.min(100, (p.resolve / Math.max(1, p.maxResolve)) * 100));
  const nat = p.nation ? (NATIONS[p.nation] || {}) : null;
  node.className = 'player-plate' + (s.active === idx ? ' turn' : '');
  node.innerHTML = `
    <div class="avatar" style="border-color:${(NATIONS[p.avatar] || NATIONS.neutral).colour}">
      ${portrait(p.avatar || p.nation || 'neutral')}
    </div>
    <div>
      <div class="pl-name">${p.name}</div>
      <div class="pl-sub">${p.avatar && NATIONS[p.avatar] ? NATIONS[p.avatar].name : (nat ? nat.name : '')}
        · hand ${p.hand.length} · deck ${p.deck.length} · grave ${p.grave.length}
        ${p.field.heroes.length ? ` · line ${p.field.heroes.length}` : ''}</div>
    </div>
    <div class="resolve-bar"><div class="resolve-fill${pct <= 35 ? ' low' : ''}" style="width:${pct}%"></div>
      <div class="resolve-txt">${p.resolve} / ${p.maxResolve} Resolve</div></div>
    ${spherePool(p)}
  `;
}

const portrait = (key) => ({
  tyrant: '🜂', fallen: '☠', void: '◉', mist: '≈', finale: '✷', oradan: '⌘',
  avereaux: '📖', wonder: '🪶', valdraeth: '🐺', syradonia: '🪔', morvalis: '🍷',
  kairos: '🏛', urdrevan: '🦌', portavas: '🔱', hammerstadt: '⚒', corrupted: '✵', neutral: '✦',
}[key] || '✦');

function renderZones(s, idx) {
  const mine = idx === G.human;
  const heroBox = $(mine ? 'my-heroes' : 'enemy-heroes');
  const supBox = $(mine ? 'my-support' : 'enemy-support');
  heroBox.innerHTML = ''; supBox.innerHTML = '';

  for (const h of s.players[idx].field.heroes) {
    const card = renderCard(h, { size: 'small', power: powerOf(s, h), vigil: vigilOf(s, h) });
    card.classList.add('perm');
    if (h.tapped) card.classList.add('tapped');
    if (h.sick && !hasKw(s, h, 'swift')) card.classList.add('sick');
    if (G.attackMode && mine && canAttackHere(s, h)) card.classList.add('can-act');
    if (G.attackMode && mine && G.attackers.has(h.uid)) card.classList.add('attacker');
    if (isTargetable(s, h)) card.classList.add('targetable');
    card.onclick = () => onPermClick(s, h, idx, mine);
    heroBox.appendChild(card);
  }
  for (const l of s.players[idx].field.leylines) {
    const sp = l.abilities?.[0]?.produce?.[0] || 'wyrd';
    const col = SPHERE_COLOUR[sp] || '#9a7b3f';
    const pod = el('div', `leyline-pod ${l.tapped ? 'spent' : 'live'}`,
      `<div class="rune" style="color:${col};border-color:${col}55">${SPHERE_GLYPH[sp] || '✹'}</div>
       <div class="lbl">${shortName(l.name)}</div>`);
    pod.title = l.name + ' — ' + (l.tapped ? 'spent until your Rally' : 'attuned, ready to yield mana');
    if (mine && !l.tapped && s.active === idx && s.phase === 'main') pod.onclick = () => act({ type: 'attune', uid: l.uid, sphere: preferSphere(s, me) });
    else pod.onclick = () => select(l);
    supBox.appendChild(pod);
  }
  for (const r of s.players[idx].field.relics) {
    const card = renderCard(r, { size: 'small' });
    card.classList.add('perm');
    if (isTargetable(s, r)) card.classList.add('targetable');
    card.onclick = () => onPermClick(s, r, idx, mine);
    supBox.appendChild(card);
  }
  if (!s.players[idx].field.heroes.length && !s.players[idx].field.relics.length && !s.players[idx].field.leylines.length) {
    supBox.appendChild(el('div', 'hint', idx === G.human ? 'Your field is empty. Lay a leyline.' : ''));
  }
}

const shortName = (n) => n.length > 18 ? n.slice(0, 17) + '…' : n;
const canAttackHere = (s, h) => !h.tapped && (!h.sick || hasKw(s, h, 'swift')) && !h.cantAttackTurn && powerOf(s, h) > 0;

function isTargetable(s, inst) {
  if (!G.awaitTarget) return false;
  const want = G.awaitTarget.side;
  const owner = inst.controller;
  if (want === 'enemy' && owner === G.human) return false;
  if (want === 'ally' && owner !== G.human) return false;
  return inst.type === 'hero' || (want === 'any' || want === 'enemy');
}

function renderHand(s, me, la) {
  const box = $('hand');
  box.innerHTML = '';
  const p = s.players[me];
  const windowOpen = s.window && s.window.priority === me;
  for (const c of p.hand) {
    const playable = la.castable.includes(c.uid) || la.leylines.includes(c.uid);
    const card = renderCard(c, { size: '' });
    card.classList.add(playable ? 'playable' : 'unplayable');
    if (G.sel && G.sel.uid === c.uid) card.classList.add('selected');
    card.onclick = () => { G.sel = c; G.awaitTarget = null; render(); };
    card.ondblclick = () => { const r = tryPlay(c.uid, {}); if (!r) render(); };
    box.appendChild(card);
  }
}

function renderLog(s) {
  const box = $('log-strip');
  box.innerHTML = s.log.slice(-3).map(l => `<div class="log-line">${l.text}</div>`).join('');
}

function inspectCard(card) {
  const box = $('inspect');
  box.innerHTML = '';
  const wrap = el('div', 'inspect-wrap');
  wrap.appendChild(renderCard(card, { size: 'big' }));
  const s = G.state, me = G.human;
  const inHand = s.players[me].hand.some(c => c.uid === card.uid);
  if (inHand) {
    const bar = el('div', 'inspect-bar');
    const windowOpen = s.window && s.window.priority === me;
    const why = canCast(s, me, card, { asReaction: !!windowOpen });
    const mine = s.active === me && s.phase === 'main' && !s.window;
    const isLey = card.type === 'leyline';
    const legalLey = isLey && mine && s.players[me].leylinesPlayed < s.players[me].leylineLimit;
    const play = el('button', 'btn big gold', isLey ? 'Lay this leyline' : 'Play');
    play.disabled = isLey ? !legalLey : !!why;
    play.title = isLey ? (legalLey ? '' : 'One leyline per turn, during your Main phase.') : (why || '');
    play.onclick = () => { tryPlay(card.uid, {}); };
    const cancel = el('button', 'btn', 'Cancel');
    cancel.onclick = () => { G.sel = null; G.awaitTarget = null; render(); };
    bar.appendChild(play); bar.appendChild(cancel);
    if (why && !legalLey) bar.appendChild(el('span', 'hint', why));
    wrap.appendChild(bar);
  }
  box.appendChild(wrap);
  box.style.display = 'block';
}

// ---------------------------------------------------------------------------
// controls
// ---------------------------------------------------------------------------
function updateControls(s, me, la) {
  const mine = s.active === me;
  const windowOpen = s.window && s.window.priority === me;
  const main = $('btn-main'), atk = $('btn-attack'), pas = $('btn-pass'), att = $('btn-attune');
  main.disabled = atk.disabled = pas.disabled = att.disabled = true;
  main.onclick = atk.onclick = pas.onclick = att.onclick = null;
  const hint = $('hint-strip');
  hint.textContent = '';

  if (s.winner != null) { hint.textContent = s.winner === me ? 'Victory.' : 'Defeat.'; return; }

  if (windowOpen) {
    pas.disabled = false;
    pas.onclick = () => act({ type: 'pass' });
    hint.textContent = s.stack.length
      ? 'A Cantrip is on the thread — you may respond, or pass.'
      : 'Reaction window: you may play a Cantrip.';
    return;
  }
  // the defender must be offered blockers even though it is not their turn
  if (s.phase === 'clash' && s.stage === 'blocks' && s.active !== me) { showBlockModal(s, me); return; }
  if (!mine) { hint.textContent = `${s.players[1 - me].name} is deliberating…`; return; }

  if (s.phase === 'main') {
    att.disabled = !la.canAttune.length;
    att.onclick = () => act({ type: 'attuneAll', sphere: preferSphere(s, me) });
    main.disabled = false;
    main.textContent = 'To the Clash';
    main.onclick = () => act({ type: 'advance' });
    hint.textContent = 'Main phase: lay a leyline, attune, call heroes, work Rites.';
    return;
  }
  if (s.phase === 'clash' && s.stage === 'declare') {
    atk.textContent = 'Declare Attack';
    atk.disabled = !la.attackers.length && !la.mustAttackers.length;
    atk.onclick = () => { G.attackMode = true; G.attackers = new Set(la.mustAttackers); render(); };
    main.disabled = false; main.textContent = 'Make no attack';
    main.onclick = () => act({ type: 'attack', attackers: [] });
    if (G.attackMode) {
      atk.disabled = false;
      atk.textContent = `Attack with ${G.attackers.size}`;
      atk.onclick = () => { act({ type: 'attack', attackers: [...G.attackers] }); G.attackMode = false; };
      hint.textContent = 'Choose which heroes strike. Feral heroes must go.';
    }
    return;
  }
  if (s.phase === 'clash' && s.stage === 'blocks' && s.active !== me) { showBlockModal(s, me); return; }
  if (s.phase === 'clash' && s.stage === 'blocks') { hint.textContent = 'Waiting for blockers…'; return; }
  if (s.phase === 'clash') { hint.textContent = 'The Clash resolves…'; return; }
  if (s.phase === 'end') {
    main.disabled = false; main.textContent = 'End Turn';
    main.onclick = () => act({ type: 'advance' });
  }
}

function preferSphere(s, me) {
  const counts = {};
  for (const c of s.players[me].hand) for (const [sp, n] of Object.entries(c.cost || {})) counts[sp] = (counts[sp] || 0) + n;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'wyrd';
}

// ---------------------------------------------------------------------------
// interaction
// ---------------------------------------------------------------------------
function onPermClick(s, inst, ownerIdx, mine) {
  if (G.awaitTarget && isTargetable(s, inst)) {
    const key = G.awaitTarget.key;
    const uid = G.awaitTarget.uid;
    G.awaitTarget = null;
    tryPlay(uid, { [key]: inst.uid });
    return;
  }
  if (G.attackMode && mine && canAttackHere(s, inst)) {
    if (G.attackers.has(inst.uid)) G.attackers.delete(inst.uid); else G.attackers.add(inst.uid);
    render(); return;
  }
  G.sel = inst; render();
}

// Try to play the selected card, prompting for a target if one is required.
function tryPlay(uid, targets) {
  const s = G.state;
  const found = s.players[G.human].hand.find(c => c.uid === uid);
  if (!found) return false;
  const keys = requiredTargets(found);
  const missing = keys.filter(k => targets[k] == null);
  if (missing.length) {
    const k = missing[0];
    G.awaitTarget = { key: k, uid, side: sideFor(found, k) };
    G.sel = found;
    render();
    toast(k === 'chosenAlly' || k === 'attachTo' ? 'Choose a hero of yours to bear it.' : 'Choose a target in the enemy line.');
    return true;
  }
  if (found.type === 'leyline') { act({ type: 'playLeyline', uid }); return true; }
  act({ type: 'cast', uid, targets });
  return true;
}

function requiredTargets(card) {
  const out = new Set();
  const walk = (effs) => { for (const e of effs || []) {
    if (e.target && e.target !== 'self' && e.target !== 'triggerSource' && e.target !== 'same' && !e.target.startsWith('all')) out.add(e.target);
    if (e.options) e.options.forEach(walk);
  } };
  for (const ab of card.abilities || []) walk(ab.effects);
  if (card.type === 'weavemark') out.add('attachTo');
  return [...out];
}
function sideFor(card, key) {
  if (key === 'chosenAlly') return 'ally';
  if (key === 'attachTo') return card.abilities?.[0]?.attach === 'enemy' ? 'enemy' : 'ally';
  if (key === 'anyHero') return 'any';
  return 'enemy';
}

// ---------------------------------------------------------------------------
// actions
// ---------------------------------------------------------------------------
function act(action) {
  if (G.net) {
    G.net.send({ type: 'action', action });
    return;
  }
  const r = reduce(G.state, action, G.human);
  if (r.error) { toast(r.error); return; }
  G.state = r.state;
  G.sel = null; G.awaitTarget = null;
  render();
  if (action.type === 'attack') G.attackMode = false;
  setTimeout(pumpAI, 420);
}

// ---------------------------------------------------------------------------
// AI driver
// ---------------------------------------------------------------------------
function pumpAI() {
  const s = G.state;
  if (!s || G.mode === 'pvp') return;
  if (s.winner != null) { render(); return; }
  let guard = 0;
  while (guard++ < 24) {
    const a = aiAction(s, 1 - G.human);
    if (!a) break;
    const r = reduce(G.state, a, 1 - G.human);
    if (r.error) { console.warn('AI rejected:', r.error, a); break; }
    G.state = r.state;
    if (G.state.winner != null) break;
    if (a.type === 'attack' || a.type === 'assignBlocks' || (a.type === 'cast' && guard > 6)) break;
  }
  render();
  if (G.state.winner == null && needsAI()) setTimeout(pumpAI, 460);
}

function needsAI() {
  const s = G.state; if (!s) return false;
  const ai = 1 - G.human;
  if (s.window && s.window.priority === ai) return true;
  if (s.active !== ai) return false;
  if (s.phase === 'main') return true;
  if (s.phase === 'clash' && s.stage === 'declare') return true;
  if (s.phase === 'end') return true;
  return false;
}

// ---------------------------------------------------------------------------
// blockers modal
// ---------------------------------------------------------------------------
function showBlockModal(s, me) {
  if ($('modal-layer').classList.contains('on')) return;
  const attackers = s.players[s.active].field.heroes.filter(h => (s.attackers || []).includes(h.uid));
  const mine = s.players[me].field.heroes.filter(h => !h.cantBlock);
  const layer = $('modal-layer');
  const m = el('div', 'modal');
  m.innerHTML = `<h3>Assign blockers</h3><p>${s.players[s.active].name} attacks with ${attackers.length}
    hero${attackers.length === 1 ? '' : 'es'}. Guardians must be blocked; Soaring heroes can only be stopped by
    Soaring or Anchor.</p>`;
  const selects = [];
  for (const a of attackers) {
    const row = el('div', 'blocker-row');
    const aCard = renderCard(a, { size: 'small', power: powerOf(s, a), vigil: vigilOf(s, a) });
    const note = el('div', 'hint', `${powerOf(s, a)}/${vigilOf(s, a)}${hasKw(s, a, 'guardian') ? ' · Guardian' : ''}${hasKw(s, a, 'soaring') ? ' · Soaring' : ''}`);
    const sel = document.createElement('select');
    sel.dataset.attacker = a.uid;
    sel.appendChild(mkOption('— no block —', ''));
    for (const b of mine) {
      const legal = !(hasKw(s, a, 'soaring') && !(hasKw(s, b, 'soaring') || hasKw(s, b, 'anchor')));
      if (!legal) continue;
      sel.appendChild(mkOption(`${b.name} (${powerOf(s, b)}/${vigilOf(s, b)})`, b.uid));
    }
    selects.push(sel);
    row.appendChild(aCard); row.appendChild(note); row.appendChild(sel);
    m.appendChild(row);
  }
  const row = el('div', 'row center');
  const go = el('button', 'btn big gold', 'Resolve the Clash');
  go.onclick = () => {
    const blocks = {};
    for (const sel of selects) if (sel.value) blocks[sel.value] = Number(sel.dataset.attacker);
    layer.classList.remove('on'); layer.innerHTML = '';
    act({ type: 'assignBlocks', blocks });
  };
  const none = el('button', 'btn', 'Take it on the chin');
  none.onclick = () => { layer.classList.remove('on'); layer.innerHTML = ''; act({ type: 'assignBlocks', blocks: {} }); };
  row.appendChild(go); row.appendChild(none);
  m.appendChild(row);
  layer.innerHTML = ''; layer.appendChild(m);
  layer.classList.add('on');
}

// ---------------------------------------------------------------------------
// finish
// ---------------------------------------------------------------------------
function finishDuel() {
  G.finished = true;
  const s = G.state;
  const win = s.winner === G.human;
  const layer = $('modal-layer');
  const m = el('div', 'modal');
  const m2 = G.meta.opponent || {};
  m.innerHTML = `<h3>${win ? 'The field is yours' : 'You are driven back'}</h3>
    <p>${win
      ? `The last of ${m2.name || 'your opponent'}&rsquo;s line comes apart. Their Resolve is spent. Elandra keeps one more field.`
      : `${m2.name || 'Your opponent'} holds. Your line breaks, and Haven falls back to the next ridge — alive, angrier, and slightly wiser.`}</p>
    <p class="hint">Turns: ${s.turn} · Your Resolve ${s.players[G.human].resolve} · Their Resolve ${s.players[1 - G.human].resolve}</p>`;
  const row = el('div', 'row center');
  if (G.mode === 'pvp') {
    const out = el('button', 'btn big gold', 'Return to Haven');
    out.onclick = () => { layer.classList.remove('on'); layer.innerHTML = ''; show('home'); };
    row.appendChild(out);
  } else if (win && G.mode === 'campaign') {
    const out = el('button', 'btn big gold', 'Claim the field');
    out.onclick = () => { layer.classList.remove('on'); layer.innerHTML = ''; fireHook(win); };
    row.appendChild(out);
  } else {
    const again = el('button', 'btn big gold', win ? 'Duel another' : 'Try again');
    again.onclick = () => {
      layer.classList.remove('on'); layer.innerHTML = '';
      if (G.mode === 'campaign') startDuel({ ...G.meta, mode: 'campaign', playerDeck: save.deck });
      else startDuel({ mode: 'quick', opponent: m2, playerDeck: save.deck.length >= 40 ? save.deck : undefined });
    };
    const out = el('button', 'btn', 'Return to Haven');
    out.onclick = () => { layer.classList.remove('on'); layer.innerHTML = ''; fireHook(win); };
    row.appendChild(again); row.appendChild(out);
  }
  m.appendChild(row);
  layer.innerHTML = ''; layer.appendChild(m); layer.classList.add('on');
  if (G.mode === 'pvp') fireHook(win);
}

let hooks = { finished: null };
export function onDuelEnd(fn) { hooks.finished = fn; }
function fireHook(win) {
  if (hooks.finished) hooks.finished({ win, mode: G.mode, chapter: G.meta.chapter, choice: G.meta.choice, opponent: G.meta.opponent });
  else show('home');
}

document.addEventListener('keydown', (e) => {
  if (!G.state || G.state.winner != null) return;
  if (e.key === 'Escape') { G.sel = null; G.awaitTarget = null; G.attackMode = false; render(); }
  if (e.key === ' ' && !$('modal-layer').classList.contains('on')) {
    e.preventDefault();
    const main = $('btn-main');
    if (!main.disabled) main.click();
  }
  if (e.key === 'a' && !$('btn-attune').disabled) $('btn-attune').click();
});

document.getElementById('btn-concede').onclick = () => {
  if (!confirm('Concede the duel?')) return;
  if (G.net) G.net.send({ type: 'action', action: { type: 'concede' } });
  else act({ type: 'concede' });
};

// ---------------------------------------------------------------------------
// ONLINE DUELS
// ---------------------------------------------------------------------------
let conn = null;
export function openLobby() {
  const sel = $('lobby-deck');
  if (!sel.options.length) {
    for (const [key, d] of Object.entries(DECKS)) {
      sel.appendChild(mkOption(`${(NATIONS[key] || { name: key }).name} — ${d.name}`, key));
    }
  }
  $('lobby-status').textContent = conn ? 'connected' : 'not connected';
  const log = (t) => {
    const box = $('lobby-log');
    box.innerHTML += `<div>${t}</div>`;
    box.scrollTop = box.scrollHeight;
  };
  if (conn) return;
  conn = connect();
  conn.on('open', () => { $('lobby-status').textContent = 'connected'; log('The menhirs are listening.'); });
  conn.on('created', (m) => { G.room = m.code; G.human = m.you; log(`Room <b>${m.code}</b> created. Share it.`); $('lobby-code').value = m.code; });
  conn.on('joined', (m) => { G.room = m.code; G.human = m.you; log(`Joined room <b>${m.code}</b>.`); });
  conn.on('start', (m) => { log('Your opponent arrives. The duel begins.'); startPvpBattle(conn, m); });
  conn.on('state', (m) => { G.state = m.state; render(); });
  conn.on('opponentLeft', () => { log('<b>Your opponent has left the field.</b>'); });
  conn.on('error', (m) => { log(`<b>${m.message}</b>`); toast(m.message); });
  conn.ws.addEventListener('close', () => {
    $('lobby-status').textContent = 'disconnected';
    log('<b>The connection to the menhirs dropped.</b> If you are behind a proxy that blocks WebSockets, online duels will not connect — the campaign and AI duels work regardless.');
  });
  conn.ws.addEventListener('error', () => {
    $('lobby-status').textContent = 'connection failed';
    const configured = (window.MF_CONFIG && window.MF_CONFIG.wsUrl) || '';
    log(configured
      ? `<b>Could not reach the duel server at ${configured}.</b> Check that it is running and reachable.`
      : '<b>Could not open the duel channel.</b> Online duels need the game server running (npm start). The campaign and AI duels work without it.');
  });
  conn.on('chat', (m) => { log(`${m.from}: ${m.text}`); });

  $('lobby-create').onclick = () => {
    const name = $('lobby-name').value || 'A Weaver';
    const deck = deckChoice();
    if (conn.ws.readyState !== 1) { toast('Not connected yet — one moment.'); return; }
    conn.send({ type: 'create', name, deck });
  };
  $('lobby-join').onclick = () => {
    const code = ($('lobby-code').value || '').toUpperCase().trim();
    if (code.length !== 4) { toast('A room code is four letters.'); return; }
    conn.send({ type: 'join', code, name: $('lobby-name').value || 'A Weaver', deck: deckChoice() });
  };
}

function deckChoice() {
  if ($('lobby-campaign-deck').checked && save.deck.length >= 40) return save.deck;
  return DECKS[$('lobby-deck').value].list;
}

export function startPvpBattle(connRef, msg) {
  G.state = msg.state; G.human = msg.you; G.mode = 'pvp'; G.net = connRef;
  G.meta = { opponent: { name: msg.opponentName || 'Your opponent' } };
  G.finished = false; G.sel = null; G.awaitTarget = null; G.attackMode = false; G.attackers = new Set();
  $('modal-layer').classList.remove('on'); $('modal-layer').innerHTML = '';
  show('battle');
  render();
}
