// ---------------------------------------------------------------------------
// game.js — the authoritative rules engine.
//   Phases:  Rally → Main → Clash → End
//   The stack holds Cantrips only; Rites, heroes and relics are Main-phase.
// ---------------------------------------------------------------------------
import {
  instantiate, findInst, log, foe, randInt, shuffle, powerOf, vigilOf, keywordsOf, hasKw,
  destroy, dealDamageToHero, damagePlayer, gainResolve, createToken, heroesOf, enemyHeroes,
  canPay, effectiveCost, spendMana, commandsMenhir, countRelics, countLeylines, statics, hasStatic,
  moveToGrave, TOKEN_LOOKUP, allFieldCards,
} from './ops.js';
import { applyEffect, drawOne, attuneLeyline, resolveTarget } from './effects.js';
import { CARD_BY_ID } from './cards/index.js';

export const PHASES = ['rally', 'main', 'clash', 'end'];
export const START_RESOLVE = 20;
export const START_HAND = 5;
export const DECK_SIZE = 40;

// ---------------------------------------------------------------------------
export function newGame({ p1, p2, seed = 12345, options = {} }) {
  const s = {
    seed, rngState: seed >>> 0, nextUid: 1, turn: 0, active: 0, phase: 'rally',
    stage: null, log: [], queue: [], stack: [], window: null, winner: null, winReason: null,
    revealTo: null, chapter: options.chapter || null, options,
    players: [], startResolve: options.startResolve || START_RESOLVE, history: [],
  };
  s.players[0] = mkPlayer(s, p1, 0, options);
  s.players[1] = mkPlayer(s, p2, 1, options);
  s.players.forEach((p, i) => { p.resolve = i === 0 ? (options.startResolve || START_RESOLVE) : (options.startResolve2 ?? options.startResolve ?? START_RESOLVE); p.maxResolve = p.resolve; });
  beginTurn(s, 0, true);
  return s;
}

function mkPlayer(s, spec, idx, options) {
  const deck = (spec.deck || []).map(id => CARD_BY_ID[id] || CARD_BY_ID['ley-wild']).filter(Boolean).map(c => instantiate(s, c, idx));
  shuffle(s, deck);
  const p = {
    name: spec.name || `Player ${idx + 1}`, ai: !!spec.ai, difficulty: spec.difficulty || 1,
    deck: [], hand: [], field: { leylines: [], relics: [], heroes: [] }, grave: [], exile: [],
    resolve: options.startResolve || START_RESOLVE, maxResolve: options.startResolve || START_RESOLVE,
    mana: {}, leylinesPlayed: 0, leylineLimit: 1, drewThisTurn: 0, weavings: 0,
    reserve: spec.reserve || 0, avatar: spec.avatar || null, nation: spec.nation || null,
    portrait: spec.portrait || null,
  };
  const handSize = options.handSize != null ? options.handSize : START_HAND;
  s.players = s.players || [];
  s.players[idx] = p;
  p.deck = deck;
  p.hand = deck.splice(0, handSize);
  return p;
}

// ---------------------------------------------------------------------------
function beginTurn(s, pi, first = false) {
  s.turn += 1; s.active = pi; s.phase = 'rally'; s.stage = null; s.stack = []; s.window = null;
  const p = s.players[pi];
  p.leylinesPlayed = 0; p.drewThisTurn = 0; p.mana = {}; p.sphereLock = null;
  for (const l of p.field.leylines) l.tapped = false;
  for (const h of p.field.heroes) {
    if (h.skippedRally) { h.skippedRally = false; continue; }
    h.tapped = false; h.sick = false; h.cantAttackTurn = false;
  }
  for (const p2 of s.players) { p2.graveSealed = false; }
  log(s, `— Turn ${s.turn}: ${p.name} —`, 'turn');
  if (!(first && pi === 0)) drawOne(s, pi);
  // heroes scheduled to return
  for (const c of p.grave.slice()) if (c.returnAtNextClash) { /* handled at clash */ }
  s.phase = 'main';
}

function startClash(s, pi) {
  s.phase = 'clash'; s.stage = 'declare'; s.attackers = null; s.blocks = null;
  const p = s.players[pi];
  // returns from the grave
  for (const c of p.grave.slice()) {
    if (c.returnAtNextClash) {
      p.grave.splice(p.grave.indexOf(c), 1);
      const inst = instantiate(s, CARD_BY_ID[c.id], pi);
      inst.sick = false; inst.counters.boon = c.returnCounters || 0;
      p.field.heroes.push(inst);
      log(s, `${inst.name} drags itself back onto the field.`, 'recur');
    }
  }
  for (const ab of statics(s, pi, 'clashStart')) {
    if (ab.ab.optional && s.players[pi].ai === false) {
      // human optional triggered abilities auto-decline only if unaffordable
    }
    const ctx = { s, pi, source: ab.card, card: ab.card, targets: {}, auto: true };
    for (const e of ab.ab.effects || []) applyEffect(ctx, e);
  }
  flush(s);
}

// ---------------------------------------------------------------------------
function flush(s) {
  let guard = 0;
  while (s.queue.length && guard++ < 60) {
    const q = s.queue.shift();
    const src = q.card;
    const ctx = { s, pi: q.controller, source: src, card: src, targets: {}, auto: true, triggerCard: q.card };
    const effects = q.inlineEffects || (src.abilities || []).filter(a => a.trigger === q.trigger).flatMap(a => a.effects || []);
    for (const e of effects) applyEffect(ctx, e);
    // arrival triggers for the card itself
    if (q.isArrival) {
      for (const ab of (src.abilities || [])) {
        if (ab.trigger === 'etb') continue;                 // already fired on cast
        if (ab.trigger === 'allyEtb' && src !== q.card) for (const e of ab.effects || []) applyEffect(ctx, e);
      }
    }
  }
  for (const p of s.players) {
    for (const z of ['heroes', 'relics', 'leylines']) {
      for (const c of p.field[z]) {
        if (c.type === 'hero' && c.dmg >= vigilOf(s, c)) destroy(s, c, {});
      }
    }
  }
  checkWin(s);
}

function checkWin(s) {
  if (s.winner != null) return;
  for (let i = 0; i < 2; i++) if (s.players[i].resolve <= 0) { s.players[i].resolve = 0; s.winner = foe(i); s.winReason = 'the last of their Resolve spent'; }
}

function pushETB(s, pi, inst, card) {
  for (const ab of card.abilities || []) {
    if (ab.trigger === 'etb') s.queue.push({ trigger: 'etb', controller: pi, sourceUid: inst.uid, card: inst, isArrival: true });
  }
  for (const ab of statics(s, pi, 'allyEtb')) {
    if (ab.card.uid === inst.uid) continue;
    for (const e of ab.ab.effects || []) {
      s.queue.push({ trigger: 'allyEtb', controller: pi, sourceUid: ab.card.uid, card: ab.card, inlineEffects: [e], triggerCard: inst });
    }
  }
}

function openWindow(s, kind, firstPriority) {
  s.window = { kind, priority: firstPriority, passed: [] };
}

// ---------------------------------------------------------------------------
// Legality
// ---------------------------------------------------------------------------
export function canCast(s, pi, inst, { asReaction = false } = {}) {
  if (s.winner != null) return 'The duel is over.';
  const p = s.players[pi];
  const isCantrip = inst.type === 'cantrip';
  if (asReaction && !isCantrip) return 'Only Cantrips may be played in reaction.';
  if (!asReaction) {
    if (s.active !== pi || s.phase !== 'main') return 'You may only play this during your Main phase.';
    if (s.window) return 'A reaction window is open.';
    if (!isCantrip && s.stack.length) return 'Wait for the thread to settle.';
  }
  if (inst.type === 'weaving' || inst.requiresMenhir) {
    if (!commandsMenhir(s, pi)) return 'Weavings require a Menhir under your command.';
  }
  const cost = effectiveCost(s, pi, inst);
  if (!canPay(s, pi, cost)) return 'Not enough attuned mana.';
  if (inst.type === 'weavemark') {
    const wantsEnemy = inst.abilities?.[0]?.attach === 'enemy';
    const hasTarget = wantsEnemy ? enemyHeroes(s, pi).length > 0 : heroesOf(s, pi).length > 0;
    if (!hasTarget) return 'There is no hero to mark.';
  }
  return null;
}

export function canAttack(s, pi, inst) {
  if (inst.tapped || inst.sick && !hasKw(s, inst, 'swift')) return false;
  if (inst.cantAttackTurn) return false;
  if (powerOf(s, inst) <= 0) return false;
  return true;
}

export function mustAttack(s, pi, inst) { return hasKw(s, inst, 'feral') || inst.mustAttack; }

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
export function reduce(state, action, actor = null) {
  const s = structuredClone(state);
  const err = apply(s, action, actor);
  if (err) return { state, error: err };
  s.history.push(action.type);
  return { state: s };
}

function apply(s, a, actor) {
  if (a.type === 'concede') { s.winner = foe(actor); s.winReason = 'concession'; log(s, `${s.players[actor].name} concedes.`, 'turn'); return null; }
  if (s.winner != null) return 'The duel is over.';

  switch (a.type) {
    case 'playLeyline': {
      const pi = checkTurn(s, actor); if (typeof pi === 'string') return pi;
      const p = s.players[pi];
      if (s.phase !== 'main' || s.window) return 'Not now.';
      if (p.leylinesPlayed >= p.leylineLimit) return 'You may only lay one leyline each turn.';
      const idx = p.hand.findIndex(c => c.uid === a.uid); if (idx < 0) return 'Not in hand.';
      const card = p.hand[idx]; if (card.type !== 'leyline') return 'That is not a leyline.';
      p.hand.splice(idx, 1);
      p.field.leylines.push(card);
      card.sick = false;
      card.tapped = hasStatic(s, pi, 'leylinesAttuned') || (hasStatic(s, pi, 'leylinesAttunedIfMenhir') && commandsMenhir(s, pi));
      p.leylinesPlayed += 1; p.leylinesTotal = (p.leylinesTotal || 0) + 1;
      log(s, `${p.name} lays ${card.name}.`, 'land');
      flush(s);
      return null;
    }
    case 'attune': {
      const pi = checkTurn(s, actor); if (typeof pi === 'string') return pi;
      if (s.phase !== 'main') return 'Attune during your Main phase.';
      const found = findInst(s, a.uid); if (!found || found.inst.controller !== pi || found.inst.type !== 'leyline') return 'Not your leyline.';
      if (found.inst.tapped) return 'Already attuned.';
      const sp = attuneLeyline(s, pi, found.inst, a.sphere);
      if (sp) log(s, `${found.inst.name} yields ${sp} mana.`, 'mana');
      return null;
    }
    case 'attuneAll': {
      const pi = checkTurn(s, actor); if (typeof pi === 'string') return pi;
      if (s.phase !== 'main') return 'Attune during your Main phase.';
      for (const l of s.players[pi].field.leylines) if (!l.tapped) { const sp = attuneLeyline(s, pi, l, a.sphere); if (sp) log(s, `${l.name} yields ${sp}.`, 'mana'); }
      return null;
    }
    case 'cast': return doCast(s, actor, a);
    case 'pass': {
      if (!s.window) return 'Nothing to react to.';
      if (s.window.priority !== actor) return 'Not your priority.';
      s.window.passed.push(actor);
      if (s.window.passed.length >= 2) { resolveWindow(s); }
      else { s.window.priority = foe(actor); }
      return null;
    }
    case 'attack': {
      const pi = checkTurn(s, actor); if (typeof pi === 'string') return pi;
      if (s.phase !== 'clash' || s.stage !== 'declare') return 'Not the Clash.';
      const p = s.players[pi];
      const list = (a.attackers || []).map(uid => p.field.heroes.find(h => h.uid === uid)).filter(Boolean);
      for (const h of list) if (!canAttack(s, pi, h)) return `${h.name} cannot attack.`;
      const forced = p.field.heroes.filter(h => mustAttack(s, pi, h) && canAttack(s, pi, h));
      for (const f of forced) if (!list.includes(f)) return `${f.name} must attack (Feral).`;
      s.attackers = list.map(h => h.uid);
      for (const h of list) { h.tapped = true; h.attacksThisTurn = (h.attacksThisTurn || 0) + 1; }
      if (!list.length) { log(s, `${p.name} holds the line.`, 'info'); s.stage = 'done'; s.phase = 'end'; return null; }
      log(s, `${p.name} attacks with ${list.map(h => h.name).join(', ')}.`, 'combat');
      for (const h of list) for (const ab of statics(s, pi, 'allyAttacks')) {
        const ctx = { s, pi, source: ab.card, card: ab.card, targets: {}, auto: true, triggerCard: h };
        for (const e of ab.ab.effects || []) applyEffect(ctx, e);
      }
      s.stage = 'react';
      openWindow(s, 'clash-react', foe(pi));
      flush(s);
      return null;
    }
    case 'assignBlocks': {
      if (s.phase !== 'clash' || s.stage !== 'blocks') return 'No blocks to assign.';
      const defIdx = foe(s.active);
      if (actor != null && actor !== defIdx && !(actor === s.active && s.players[defIdx].ai)) return 'Only the defender may assign blockers.';
      return doBlocks(s, a.blocks || {});
    }
    case 'advance': {
      const pi = checkTurn(s, actor); if (typeof pi === 'string') return pi;
      if (s.phase === 'main') { startClash(s, pi); return null; }
      if (s.phase === 'clash' && s.stage === 'declare') { log(s, `${s.players[pi].name} makes no attack.`, 'info'); s.phase = 'end'; return null; }
      if (s.phase === 'clash') return 'Resolve the Clash first.';
      if (s.phase === 'end') { endTurn(s, pi); return null; }
      return 'Nothing to advance.';
    }
    default: return 'Unknown action.';
  }
}

function checkTurn(s, actor) {
  if (actor == null) return 'No actor.';
  if (s.active !== actor) return 'Not your turn.';
  return actor;
}

// ---------------------------------------------------------------------------
function doCast(s, actor, a) {
  if (s.winner != null) return 'The duel is over.';
  const found = findInst(s, a.uid);
  if (!found) return 'No such card.';
  const pi = found.inst.controller;
  if (actor != null && actor !== pi) return 'Not your card.';
  const asReaction = s.window && s.window.priority === pi && s.phase !== 'main';
  const reactionOk = s.window && s.window.priority === pi;
  const check = canCast(s, pi, found.inst, { asReaction: !!reactionOk });
  if (check) return check;

  if (found.zone !== 'hand') return 'Not in hand.';
  const p = s.players[pi];
  const card = found.inst;
  const cost = effectiveCost(s, pi, card);

  // Weavemarks need a host.
  if (card.type === 'weavemark') {
    const hostUid = a.targets && a.targets.attachTo;
    const wanted = card.abilities[0].attach === 'enemy' ? enemyHeroes(s, pi) : heroesOf(s, pi);
    const host = wanted.find(h => h.uid === hostUid) || wanted.sort((x, y) => powerOf(s, y) - powerOf(s, x))[0];
    if (!host) return 'No hero to mark.';
    if (!reactionOk && s.phase !== 'main') return 'Not now.';
    p.hand.splice(p.hand.indexOf(card), 1);
    spendMana(s, pi, cost);
    card.attachedTo = host; card.controller = pi;
    host.attachments.push(card);
    for (const ab of card.abilities) for (const e of ab.effects || []) applyEffect({ s, pi, source: card, card, targets: a.targets || {}, auto: false }, e);
    log(s, `${p.name} lays a Weavemark on ${host.name}.`, 'cast');
    if (s.window) { s.window.passed = [foe(pi)]; s.window.priority = foe(pi); }
    flush(s);
    return null;
  }

  if (card.type === 'cantrip') {
    if (!reactionOk && !(s.active === pi && s.phase === 'main' && !s.window)) return 'You may only play that during your Main phase.';
    p.hand.splice(p.hand.indexOf(card), 1);
    spendMana(s, pi, cost);
    s.stack.push({ card, pi, targets: a.targets || {}, sourceUid: card.uid });
    log(s, `${p.name} begins a Cantrip: ${card.name}.`, 'cast');
    openWindow(s, 'spell', foe(pi));
    return null;
  }

  // sorcery-speed
  if (s.active !== pi || s.phase !== 'main' || s.window) return 'That may only be played during your Main phase.';
  p.hand.splice(p.hand.indexOf(card), 1);
  spendMana(s, pi, cost);

  if (card.type === 'hero') {
    card.sick = !hasKw(s, card, 'swift') && !statics(s, pi, 'grantAll').some(x => x.ab.keyword === 'swift');
    card.tapped = false;
    p.field.heroes.push(card);
    log(s, `${p.name} calls forth ${card.name}.`, 'summon');
    pushETB(s, pi, card, card);
  } else if (card.type === 'relic') {
    card.sick = false;
    p.field.relics.push(card);
    log(s, `${p.name} sets down ${card.name}.`, 'cast');
    pushETB(s, pi, card, card);
  } else {
    // Rites and Weavings resolve immediately, leaving their card in the graveyard.
    log(s, `${p.name} performs ${card.name}.`, 'cast');
    const ctx = { s, pi, source: card, card, targets: a.targets || {}, auto: false };
    for (const ab of card.abilities || []) for (const e of ab.effects || []) applyEffect(ctx, e);
    if (card.type === 'weaving') { p.weavings += 1; log(s, `A Weaving is completed. The mists stir.`, 'weaving'); }
    p.grave.push(card);
  }
  flush(s);
  return null;
}

// ---------------------------------------------------------------------------
function resolveWindow(s) {
  const w = s.window;
  if (!w) return;
  if (w.kind === 'spell') {
    const item = s.stack.pop();
    if (item) {
      const ctx = { s, pi: item.pi, source: item.card, card: item.card, targets: item.targets || {}, auto: false };
      for (const ab of item.card.abilities || []) for (const e of ab.effects || []) applyEffect(ctx, e);
      s.players[item.pi].grave.push(item.card);
      flush(s);
    }
    if (s.stack.length) { openWindow(s, 'spell', s.active); return; }
    s.window = null;
    afterStackEmpty(s);
    return;
  }
  if (w.kind === 'clash-react') {
    s.window = null;
    s.stage = 'blocks';
    log(s, `Attackers are locked in. Blockers?`, 'combat');
    // hand over to the defender
    return;
  }
  if (w.kind === 'clash-react2') {
    s.window = null;
    resolveCombat(s);
    return;
  }
}

function afterStackEmpty(s) {
  if (s.phase === 'clash' && s.stage === 'react') { s.stage = 'blocks'; log(s, `Attackers are locked in. Blockers?`, 'combat'); }
  else if (s.phase === 'clash' && s.stage === 'react2') { resolveCombat(s); }
}

function doBlocks(s, blockMap) {
  const pi = s.active, defIdx = foe(pi);
  const def = s.players[defIdx];
  const attackers = s.players[pi].field.heroes.filter(h => s.attackers.includes(h.uid));
  const blocks = {};
  const used = new Set();
  for (const [blockerUid, attackerUid] of Object.entries(blockMap)) {
    const blocker = def.field.heroes.find(h => h.uid === Number(blockerUid));
    const attacker = attackers.find(h => h.uid === Number(attackerUid));
    if (!blocker || !attacker || used.has(blocker.uid)) continue;
    if (blocker.cantBlock) continue;
    if (hasKw(s, attacker, 'soaring') && !(hasKw(s, blocker, 'soaring') || hasKw(s, blocker, 'anchor'))) continue;
    blocks[attacker.uid] = blocker.uid; used.add(blocker.uid);
  }
  // Guardian: any un-blocked guardian attacker must be blocked if an able blocker remains
  for (const a of attackers) {
    if (blocks[a.uid]) continue;
    if (!hasKw(s, a, 'guardian')) continue;
    const able = def.field.heroes.find(h => !used.has(h.uid) && !h.cantBlock &&
      (!hasKw(s, a, 'soaring') || hasKw(s, h, 'soaring') || hasKw(s, h, 'anchor')));
    if (able) { blocks[a.uid] = able.uid; used.add(able.uid); }
  }
  s.blocks = blocks;
  const count = Object.keys(blocks).length;
  log(s, count ? `${def.name} assigns ${count} blocker${count === 1 ? '' : 's'}.` : `${def.name} cannot block.`, 'combat');
  s.window = null;
  s.stage = 'react2';
  openWindow(s, 'clash-react2', defIdx);
}

function resolveCombat(s) {
  const pi = s.active, di = foe(pi);
  const atk = s.players[pi].field.heroes.filter(h => s.attackers.includes(h.uid));
  const blocks = s.blocks || {};
  let playerDamage = 0;
  const toPlayer = [];
  for (const a of atk) {
    const blockerUid = blocks[a.uid];
    const blocker = blockerUid ? s.players[di].field.heroes.find(h => h.uid === blockerUid) : null;
    if (!blocker) { toPlayer.push(a); continue; }
    const aFirst = hasKw(s, a, 'duelist'), bFirst = hasKw(s, blocker, 'duelist');
    const aPow = powerOf(s, a), bPow = powerOf(s, blocker);
    let aAlive = true, bAlive = true;
    const strikeA = () => { const d = dealDamageToHero(s, blocker, aPow, a); log(s, `${a.name} strikes ${blocker.name} for ${d}.`, 'combat'); if (a.overrun || hasKw(s, a, 'overrun')) { const over = aPow - vigilOf(s, blocker); if (over > 0) { playerDamage += over; log(s, `${a.name} overruns for ${over}.`, 'combat'); } } };
    const strikeB = () => { const d = dealDamageToHero(s, a, bPow, blocker); log(s, `${blocker.name} strikes ${a.name} for ${d}.`, 'combat'); };
    if (aFirst && !bFirst) { strikeA(); if (blocker.dmg >= vigilOf(s, blocker)) bAlive = false; if (bAlive) strikeB(); }
    else if (bFirst && !aFirst) { strikeB(); if (a.dmg >= vigilOf(s, a)) aAlive = false; if (aAlive) strikeA(); }
    else { strikeA(); strikeB(); }
    if (hasKw(s, a, 'drain')) gainResolve(s, pi, 0);
  }
  for (const a of toPlayer) {
    const pow = powerOf(s, a);
    damagePlayer(s, di, pow);
    log(s, `${a.name} hits ${s.players[di].name} for ${pow} Resolve.`, 'combat');
    if (hasKw(s, a, 'drain')) gainResolve(s, pi, pow);
    if (hasKw(s, a, 'renown')) { a.counters.boon = (a.counters.boon || 0) + 1; log(s, `${a.name} earns renown.`, 'buff'); }
    for (const ab of statics(s, pi, 'allyDamageToPlayer')) {
      const ctx = { s, pi, source: ab.card, card: ab.card, targets: {}, auto: true, triggerCard: a };
      for (const e of ab.ab.effects || []) applyEffect(ctx, e);
    }
  }
  // blockers with drain
  for (const uid of Object.values(blocks)) {
    const b = s.players[di].field.heroes.find(h => h.uid === uid);
    if (b && hasKw(s, b, 'drain')) gainResolve(s, di, powerOf(s, b));
  }
  flush(s);
  if (s.winner != null) return;
  s.phase = 'end';
  log(s, `The Clash is over.`, 'combat');
  checkWin(s);
}

function endTurn(s, pi) {
  const p = s.players[pi];
  for (const h of p.field.heroes) {
    h.buffs = h.buffs.filter(b => b.turn == null);
    h.granted = h.granted.filter(k => !h.tempKeywords || true);
    h.cantBlock = false;
    if (h.preventAllTurn != null && h.preventAllTurn !== s.turn) h.preventAll = false;
    h.deathRattle = null;
  }
  // turn-scoped keywords expire
  for (const h of p.field.heroes) h.granted = [];
  for (const l of p.field.leylines) l.granted = [];
  p.mana = {};
  log(s, `${p.name} ends their turn.`, 'turn');
  if (s.winner != null) return;
  beginTurn(s, foe(pi));
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------
export function redact(state, viewer) {
  const s = structuredClone(state);
  s.rngState = 0;
  s.queue = [];
  s.players.forEach((p, i) => {
    if (i !== viewer) {
      p.hand = p.hand.map(c => ({ uid: c.uid, hidden: true, type: c.type }));
      p.deck = p.deck.map(() => ({ hidden: true }));
    } else {
      p.deck = p.deck.map(() => ({ hidden: true }));
    }
  });
  if (s.revealTo !== viewer) s.revealTo = null;
  return s;
}

export function legalActions(state, pi) {
  const s = state;
  const p = s.players[pi];
  const mine = s.active === pi;
  const out = { castable: [], leylines: [], canAttune: [], attackers: [], mustAttackers: [], canAdvance: false, window: null };
  const windowOpen = s.window && s.window.priority === pi;
  for (const c of p.hand) {
    const err = canCast(s, pi, c, { asReaction: !!windowOpen });
    if (!err) out.castable.push(c.uid);
  }
  if (mine && s.phase === 'main' && !s.window) {
    if (p.leylinesPlayed < p.leylineLimit) out.leylines = p.hand.filter(c => c.type === 'leyline').map(c => c.uid);
    out.canAttune = p.field.leylines.filter(l => !l.tapped).map(l => l.uid);
    out.canAdvance = true;
  }
  if (mine && s.phase === 'clash' && s.stage === 'declare') {
    out.attackers = p.field.heroes.filter(h => canAttack(s, pi, h)).map(h => h.uid);
    out.mustAttackers = p.field.heroes.filter(h => mustAttack(s, pi, h) && canAttack(s, pi, h)).map(h => h.uid);
  }
  if (windowOpen) out.window = { kind: s.window.kind, canPass: true };
  return out;
}

export function isOver(state) { return state.winner != null; }
export { powerOf, vigilOf, keywordsOf, hasKw, heroesOf, enemyHeroes, countRelics, countLeylines, commandsMenhir };
