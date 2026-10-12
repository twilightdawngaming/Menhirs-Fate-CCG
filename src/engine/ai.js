// ---------------------------------------------------------------------------
// ai.js — the Corrupted's generals. Heuristic, but they will punish you.
// ---------------------------------------------------------------------------
import {
  foe, powerOf, vigilOf, hasKw, heroesOf, enemyHeroes, canPay, effectiveCost,
  commandsMenhir, countRelics, countLeylines, statics,
} from './ops.js';
import { canCast } from './game.js';

const allHeroes = (s) => s.players.flatMap(p => p.field.heroes);

export function aiAction(s, pi) {
  if (s.winner != null) return null;
  const p = s.players[pi];
  const skill = p.difficulty || 1;   // 1..3

  // --- reaction windows -----------------------------------------------------
  if (s.window) {
    if (s.window.priority !== pi) return null;          // not our priority
    const r = pickReaction(s, pi, skill);
    return r || { type: 'pass' };
  }
  // --- assigned as defender -------------------------------------------------
  if (s.phase === 'clash' && s.stage === 'blocks' && s.active !== pi) {
    return { type: 'assignBlocks', blocks: pickBlocks(s, pi, skill) };
  }
  if (s.active !== pi) return null;

  if (s.phase === 'main') {
    if (p.leylinesPlayed < p.leylineLimit) {
      const l = p.hand.filter(c => c.type === 'leyline')
        .sort((a, b) => (b.id === 'ley-haven' ? 1 : 0) - (a.id === 'ley-haven' ? 1 : 0))[0];
      if (l) return { type: 'playLeyline', uid: l.uid };
    }
    if (p.field.leylines.some(l => !l.tapped)) return { type: 'attuneAll', sphere: bestSphere(s, pi) };
    const cast = pickCast(s, pi, skill);
    if (cast) return cast;
    return { type: 'advance' };
  }
  if (s.phase === 'clash' && s.stage === 'declare') return { type: 'attack', attackers: pickAttackers(s, pi, skill) };
  if (s.phase === 'end') return { type: 'advance' };
  return null;
}

// ---------------------------------------------------------------------------
function bestSphere(s, pi) {
  const p = s.players[pi];
  const want = { fire: 0, earth: 1, water: 1, wind: 1, spirit: 0, wyrd: 0 };
  for (const c of p.hand) for (const [sp, n] of Object.entries(c.cost || {})) want[sp] = (want[sp] || 0) + n;
  return Object.entries(want).sort((a, b) => b[1] - a[1])[0][0];
}

function targetKeyOf(card) {
  const keys = ['chosenEnemyHero', 'chosenEnemyHeroNew', 'chosenEnemyGuardian', 'chosenEnemyTapped',
    'chosenEnemySoaring', 'chosenAlly', 'anyHero', 'attachTo'];
  const found = new Set();
  const walk = (effs) => {
    for (const e of effs || []) {
      if (e.target && keys.includes(e.target)) found.add(e.target);
      if (e.options) e.options.forEach(walk);
    }
  };
  for (const ab of card.abilities || []) walk(ab.effects);
  if (card.type === 'weavemark') found.add('attachTo');
  return [...found];
}

function bestEnemyFor(s, pi, amount) {
  const list = enemyHeroes(s, pi);
  if (!list.length) return null;
  const killers = list.filter(h => vigilOf(s, h) <= amount);
  const pool = killers.length ? killers : list;
  return pool.sort((a, b) => powerOf(s, b) - powerOf(s, a))[0];
}

export function aiTargets(s, pi, card) {
  const t = {};
  const keys = targetKeyOf(card);
  for (const k of keys) {
    if (k === 'chosenEnemyHero') {
      let amount = 0;
      for (const ab of card.abilities || []) for (const e of ab.effects || []) if (e.type === 'dealDamage') amount = Math.max(amount, e.amount || 0);
      if (card.abilities?.[0]?.effects?.some(e => e.type === 'destroy')) amount = 99;
      const tgt = bestEnemyFor(s, pi, amount);
      if (tgt) t[k] = tgt.uid;
    } else if (k === 'chosenEnemyHeroNew') {
      const fresh = enemyHeroes(s, pi).filter(h => h.sick);
      const tgt = fresh.sort((a, b) => powerOf(s, b) - powerOf(s, a))[0] || enemyHeroes(s, pi)[0];
      if (tgt) t[k] = tgt.uid;
    } else if (k === 'chosenEnemyGuardian') {
      const g = enemyHeroes(s, pi).filter(h => hasKw(s, h, 'guardian'));
      const tgt = g.sort((a, b) => powerOf(s, b) - powerOf(s, a))[0];
      if (tgt) t[k] = tgt.uid;
    } else if (k === 'chosenEnemyTapped') {
      const g = enemyHeroes(s, pi).filter(h => h.tapped);
      if (g[0]) t[k] = g[0].uid;
    } else if (k === 'chosenEnemySoaring') {
      const g = enemyHeroes(s, pi).filter(h => hasKw(s, h, 'soaring'));
      if (g[0]) t[k] = g[0].uid;
    } else if (k === 'chosenAlly') {
      const g = heroesOf(s, pi).sort((a, b) => powerOf(s, b) - powerOf(s, a));
      if (g[0]) t[k] = g[0].uid;
    } else if (k === 'anyHero') {
      const mine = heroesOf(s, pi).sort((a, b) => powerOf(s, b) - powerOf(a, b))[0];
      if (mine) t[k] = mine.uid;
    } else if (k === 'attachTo') {
      if (card.abilities?.[0]?.attach === 'enemy') {
        const g = enemyHeroes(s, pi).sort((a, b) => powerOf(s, b) - powerOf(s, a))[0];
        if (g) t[k] = g.uid;
      } else {
        const g = heroesOf(s, pi).sort((a, b) => powerOf(s, b) - powerOf(s, a))[0];
        if (g) t[k] = g.uid;
      }
    }
  }
  return t;
}

// ---------------------------------------------------------------------------
function scoreCard(s, pi, c) {
  const them = s.players[foe(pi)];
  const myHeroes = heroesOf(s, pi);
  const theirHeroes = enemyHeroes(s, pi);
  const biggest = theirHeroes.slice().sort((a, b) => powerOf(s, b) - powerOf(s, a))[0];
  let score = 0;
  const effects = (c.abilities || []).flatMap(a => a.effects || []);
  const has = (t) => effects.some(e => e.type === t || (e.options || []).some(o => o.some(x => x.type === t)));

  if (c.type === 'hero') score = 10 + (c.might || 0) + (c.vigil || 0) * 0.5;
  if (c.type === 'relic') score = 9 + (c.id.startsWith('mn-') ? 6 : 0);
  if (c.type === 'weavemark') score = myHeroes.length ? 7 : -5;
  if (c.type === 'weaving') score = 30;
  if (c.type === 'cantrip') score = 3;
  if (c.type === 'rite') score = 11;
  if (has('draw') || has('drawIfRelic')) score += 3;
  if (has('dealDamage') || has('dealDamageAll')) score += biggest ? Math.min(12, 4 + powerOf(s, biggest)) : -4;
  if (has('destroy')) score += biggest ? 6 + powerOf(s, biggest) : -6;
  if (has('destroyAllEnemyHeroes')) score += theirHeroes.length * 3;
  if (has('pump') || has('grantKeyword')) {
    const attackersReady = myHeroes.filter(h => !h.sick).length;
    score += attackersReady ? 3 : -3;
  }
  if (has('gainResolve') || has('preventDamage')) score += s.players[pi].resolve <= 10 ? 7 : 2;
  if (has('massReanimate')) score += s.players[pi].grave.length * 3;
  if (has('createToken')) score += 4;
  if (c.type === 'weaving' && !commandsMenhir(s, pi)) return -99;
  if (c.requiresMenhir && !commandsMenhir(s, pi)) return -99;
  return score;
}

function pickCast(s, pi, skill) {
  const p = s.players[pi];
  const options = [];
  for (const c of p.hand) {
    if (c.type === 'leyline') continue;
    const cost = effectiveCost(s, pi, c);
    if (!canPay(s, pi, cost)) continue;
    if (canCast(s, pi, c, { asReaction: false })) continue;
    let sc = scoreCard(s, pi, c);
    // a small taste for holding removal until it matters
    if (skill >= 2 && sc < 3) continue;
    if (skill === 1) sc += Math.random() * 3;
    options.push({ c, sc, cost: Object.values(cost).reduce((a, b) => a + b, 0) });
  }
  if (!options.length) return null;
  options.sort((a, b) => (b.sc - a.sc) || (b.cost - a.cost));
  // don't dump a hero when the line is full and something better is coming
  const chosen = options[0].c;
  if (skill >= 3 && chosen.type === 'hero' && heroesOf(s, pi).length >= 6) {
    const alt = options.find(o => o.c.type !== 'hero');
    if (alt) return { type: 'cast', uid: alt.c.uid, targets: aiTargets(s, pi, alt.c) };
  }
  return { type: 'cast', uid: chosen.uid, targets: aiTargets(s, pi, chosen) };
}

// ---------------------------------------------------------------------------
function pickAttackers(s, pi, skill) {
  const p = s.players[pi];
  const defenders = enemyHeroes(s, pi).filter(h => !h.tapped);
  const canGo = p.field.heroes.filter(h => !h.tapped && !h.cantAttackTurn && powerOf(s, h) > 0 &&
    (!h.sick || hasKw(s, h, 'swift')));
  const forced = canGo.filter(h => hasKw(s, h, 'feral') || h.mustAttack);
  const total = canGo.reduce((a, h) => a + powerOf(s, h), 0);
  if (total >= s.players[foe(pi)].resolve) return canGo.map(h => h.uid);   // lethal
  const chosen = new Set(forced.map(h => h.uid));
  for (const h of canGo) {
    if (chosen.has(h.uid)) continue;
    const pow = powerOf(s, h);
    if (!defenders.length) { chosen.add(h.uid); continue; }
    if (hasKw(s, h, 'soaring') && !defenders.some(d => hasKw(s, d, 'soaring') || hasKw(s, d, 'anchor'))) { chosen.add(h.uid); continue; }
    const bestBlocker = defenders.slice().sort((a, b) => vigilOf(s, b) - vigilOf(s, a))[0];
    const beats = defenders.some(d => pow >= vigilOf(s, d) && powerOf(s, d) < vigilOf(s, h));
    if (beats) { chosen.add(h.uid); continue; }
    if (pow > vigilOf(s, bestBlocker)) { chosen.add(h.uid); continue; }
    if (skill >= 3 && s.players[foe(pi)].resolve <= 8) { chosen.add(h.uid); }  // press the advantage
  }
  return [...chosen];
}

function pickBlocks(s, pi, skill) {
  const attackers = heroesOf(s, foe(pi)).filter(h => (s.attackers || []).includes(h.uid));
  const mine = heroesOf(s, pi).filter(h => !h.cantBlock);
  const blocks = {};
  const used = new Set();
  const sorted = attackers.slice().sort((a, b) => powerOf(s, b) - powerOf(s, a));
  const incoming = attackers.reduce((a, h) => a + powerOf(s, h) - (blocks[h.uid] ? 0 : 0), 0);
  const doomed = incoming >= s.players[pi].resolve;
  for (const a of sorted) {
    const legal = mine.filter(h => !used.has(h.uid) &&
      (!hasKw(s, a, 'soaring') || hasKw(s, h, 'soaring') || hasKw(s, h, 'anchor')));
    if (!legal.length) continue;
    const pow = powerOf(s, a);
    const killer = legal.filter(h => powerOf(s, h) >= vigilOf(s, a) && vigilOf(s, h) > pow)
      .sort((x, y) => (powerOf(s, x) - vigilOf(s, x)) - (powerOf(s, y) - vigilOf(s, y)))[0];
    if (killer) { blocks[a.uid] = killer.uid; used.add(killer.uid); continue; }
    const trader = legal.filter(h => powerOf(s, h) >= vigilOf(s, a)).sort((x, y) => vigilOf(s, x) - vigilOf(s, y))[0];
    if (trader && pow >= vigilOf(s, trader)) { blocks[a.uid] = trader.uid; used.add(trader.uid); continue; }
    if (doomed || (skill >= 2 && pow >= 4)) {
      const chump = legal.sort((x, y) => powerOf(s, x) - powerOf(s, y))[0];
      if (chump) { blocks[a.uid] = chump.uid; used.add(chump.uid); }
    }
  }
  return blocks;
}

function pickReaction(s, pi, skill) {
  const p = s.players[pi];
  const stack = s.stack;
  const affordable = p.hand.filter(c => c.type === 'cantrip' && canPay(s, pi, effectiveCost(s, pi, c))
    && !canCast(s, pi, c, { asReaction: true }));
  if (!affordable.length) return null;

  if (stack.length) {
    const spell = stack[stack.length - 1];
    if (spell.pi !== pi) {
      const counter = affordable.find(c => (c.abilities || []).some(ab => (ab.effects || []).some(e => e.type === 'counterSpell')));
      const big = (spell.card.type === 'cantrip' && /dealDamage|destroy/.test(JSON.stringify(spell.card.abilities)));
      if (counter && big) return { type: 'cast', uid: counter.uid, targets: {} };
    }
    return null;
  }

  // combat reaction: protect or pump
  if (s.phase === 'clash') {
    const attackers = heroesOf(s, foe(pi)).filter(h => (s.attackers || []).includes(h.uid));
    const incoming = attackers.reduce((a, h) => a + powerOf(s, h), 0);
    const myResolve = s.players[pi].resolve;
    const def = affordable.filter(c => /preventDamage|pump|grantKeyword|preventAll|dealDamage/.test(JSON.stringify(c.abilities)));
    if (def.length && (incoming >= myResolve - 2 || skill >= 3)) {
      const pick = def.sort((a, b) => JSON.stringify(b.abilities).length - JSON.stringify(a.abilities).length)[0];
      return { type: 'cast', uid: pick.uid, targets: aiTargets(s, pi, pick) };
    }
  }
  return null;
}
