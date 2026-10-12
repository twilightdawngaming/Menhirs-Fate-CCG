// ---------------------------------------------------------------------------
// ops.js — primitive operations shared by the effect system and the reducer.
// Everything mutates a plain state object; the reducer clones before calling.
// ---------------------------------------------------------------------------
import { TOKEN_BY_ID } from './cards/index.js';

// Tokens (and relic tokens) referenceable by card effects, e.g. {createToken:'wisp'}.
export const TOKEN_LOOKUP = {
  wisp: TOKEN_BY_ID['tok-wisp'], ashHound: TOKEN_BY_ID['tok-ashhound'], frostwolf: TOKEN_BY_ID['tok-frostwolf'],
  sailor: TOKEN_BY_ID['tok-sailor'], thrall: TOKEN_BY_ID['tok-thrall'], legion: TOKEN_BY_ID['tok-legion'],
  voidling: TOKEN_BY_ID['tok-voidling'], menhirshard: TOKEN_BY_ID['tok-menhirshard'],
  anvilward: TOKEN_BY_ID['rl-anvilward'], charterblade: TOKEN_BY_ID['rl-charterblade'],
};

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rand = (s) => { s.rngState = (s.rngState * 1103515245 + 12345) & 0x7fffffff; return s.rngState / 0x7fffffff; };
export const randInt = (s, n) => Math.floor(rand(s) * n);
export function shuffle(s, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(s, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const log = (s, text, kind = 'info') => {
  s.log.push({ t: s.log.length, text, kind, turn: s.turn, phase: s.phase });
  if (s.log.length > 400) s.log.splice(0, 100);
};

export const foe = (i) => 1 - i;
export const other = (s, i) => s.players[foe(i)];

// ------------------------------- instances ---------------------------------
export function instantiate(s, card, controller) {
  return {
    uid: s.nextUid++, id: card.id, name: card.name, type: card.type, kind: card.kind,
    nation: card.nation, spheres: card.spheres, cost: card.cost, txt: card.text, text: card.text,
    flavour: card.flavour, rarity: card.rarity, abilities: card.abilities || [],
    might: card.might, vigil: card.vigil, kw: [...(card.keywords || [])], keywords: [...(card.keywords || [])],
    counters: { boon: 0 }, tapped: false, sick: true, dmg: 0, token: !!card.token,
    buffs: [], attachments: [], granted: [], stripped: false,
    controller, attachmentsOwner: null, sealed: false, permanent: false, cantBlock: false,
    mustAttack: false, prevent: 0, preventAll: false, attacksThisTurn: 0, returnedBy: null,
    requiresMenhir: !!card.requiresMenhir, isCard: true,
  };
}

export function findInst(state, uid) {
  for (const p of state.players) {
    for (const zone of ['leylines', 'relics', 'heroes']) {
      const found = p.field[zone].find(c => c.uid === uid);
      if (found) return { inst: found, owner: p, zone };
    }
    const h = p.hand.find(c => c.uid === uid);
    if (h) return { inst: h, owner: p, zone: 'hand' };
  }
  return null;
}

export const allFieldCards = (s) => s.players.flatMap(p => p.field.heroes.concat(p.field.relics, p.field.leylines));
export const heroesOf = (s, i) => s.players[i].field.heroes;
export const enemyHeroes = (s, i) => s.players[foe(i)].field.heroes;

// ------------------------------- statics -----------------------------------
export function statics(state, pi, key) {
  const out = [];
  for (const zone of ['relics', 'heroes']) {
    for (const c of state.players[pi].field[zone]) {
      for (const ab of c.abilities || []) if (ab.static === key) out.push({ card: c, ab });
    }
  }
  return out;
}
export const hasStatic = (s, pi, key) => statics(s, pi, key).length > 0;
export const staticSum = (s, pi, key, field = 'amount') =>
  statics(s, pi, key).reduce((a, x) => a + (x.ab[field] || 0), 0);

export const commandsMenhir = (s, pi) =>
  s.players[pi].field.relics.some(c => c.id.startsWith('mn-'));
export const countRelics = (s, pi) => s.players[pi].field.relics.length;
export const countLeylines = (s, pi) => s.players[pi].field.leylines.length;

// ------------------------------- stats -------------------------------------
export function powerOf(state, inst) {
  if (inst.type !== 'hero') return 0;
  let n = inst.might + (inst.counters.boon || 0);
  for (const b of inst.buffs) n += b.might;
  for (const a of inst.attachments) for (const e of a.abilities?.[0]?.effects || []) {
    if (e.type === 'attachPump') n += e.might;
  }
  // blanket pumps from own relics/heroes
  n += staticSum(state, inst.controller, 'pumpAll', 'might');
  // conditional pumps
  for (const ab of inst.abilities || []) {
    if (ab.static === 'pumpIfAllyCount' && heroesOf(state, inst.controller).length > ab.atLeast) n += ab.might;
  }
  // enemy debuffs
  n -= staticSum(state, foe(inst.controller), 'debuffEnemies', 'might'); // debuffEnemies stores might:-1
  return Math.max(0, n);
}

export function vigilOf(state, inst) {
  if (inst.type !== 'hero') return 0;
  let n = inst.vigil + (inst.counters.boon || 0);
  for (const b of inst.buffs) n += b.vigil;
  for (const a of inst.attachments) for (const e of a.abilities?.[0]?.effects || []) {
    if (e.type === 'attachPump') n += e.vigil;
  }
  n += staticSum(state, inst.controller, 'pumpAll', 'vigil');
  return Math.max(0, n);
}

export function keywordsOf(state, inst) {
  if (inst.stripped) return [];
  const set = new Set(inst.kw);
  for (const k of inst.granted) set.add(k);
  for (const a of inst.attachments) for (const e of a.abilities?.[0]?.effects || []) {
    if (e.type === 'grantKeywordAttached') set.add(e.keyword);
  }
  if (hasStatic(state, inst.controller, 'grantAll')) {
    for (const ab of statics(state, inst.controller, 'grantAll')) set.add(ab.ab.keyword);
  }
  return [...set];
}
export const hasKw = (state, inst, k) => keywordsOf(state, inst).includes(k);

// ------------------------------- zones -------------------------------------
export function moveToGrave(s, inst, owner) {
  const o = s.players[inst.controller];
  for (const z of ['heroes', 'relics', 'leylines']) {
    const i = o.field[z].indexOf(inst);
    if (i >= 0) o.field[z].splice(i, 1);
  }
  if (inst.type === 'hero' || inst.type === 'relic') o.grave.push(inst);
  else o.grave.push(inst);
  // detach weavemarks on it
  for (const a of inst.attachments.slice()) {
    const ao = s.players[a.controller];
    ao.grave.push(a);
  }
  inst.attachments = [];
  for (const p of s.players) {
    for (const list of [p.field.heroes, p.field.relics]) {
      for (const h of list) {
        const j = h.attachments.indexOf(inst);
        if (j >= 0) h.attachments.splice(j, 1);
      }
    }
  }
  return o;
}

export function destroy(s, inst, opts = {}) {
  const kw = keywordsOf(s, inst);
  if (kw.includes('unbreakable') && !opts.force) return false;
  const wasHero = inst.type === 'hero';
  const owner = s.players[inst.controller];
  const snapshot = { ...inst, might: powerOf(s, inst), vigil: vigilOf(s, inst) };
  moveToGrave(s, inst, owner);
  inst.returnAtClash = null;
  if (wasHero) {
    for (const ab of inst.abilities || []) {
      if (ab.trigger === 'dies') {
        s.queue.push({ sourceUid: inst.uid, controller: inst.controller, trigger: 'dies', card: snapshot });
      }
    }
    for (const a of snapshot.attachments || []) {
      for (const e of a.abilities?.[0]?.effects || []) {
        if (e.type === 'attachDeathRattle') {
          s.queue.push({ sourceUid: inst.uid, controller: inst.controller, trigger: 'dies', card: snapshot, inlineEffects: [e.effect] });
        }
      }
    }
    for (const ab of statics(s, inst.controller, 'allyDies')) {
      s.queue.push({ sourceUid: ab.card.uid, controller: inst.controller, trigger: 'allyDies', card: ab.card });
    }
  }
  return true;
}

export function dealDamageToHero(s, target, amount, source = null) {
  if (target.preventAll) return 0;
  let dmg = amount;
  if (target.prevent > 0) {
    const absorbed = Math.min(target.prevent, dmg);
    target.prevent -= absorbed; dmg -= absorbed;
    if (absorbed) log(s, `Ward absorbs ${absorbed} damage.`, 'ward');
  }
  if (dmg <= 0) return 0;
  const kw = keywordsOf(s, target);
  if (source && kw.includes('fated')) { /* fated is on the source */ }
  if (source && keywordsOf(s, source).includes('fated')) dmg = Math.max(dmg, vigilOf(s, target));
  target.dmg += dmg;
  if (target.dmg >= vigilOf(s, target)) destroy(s, target, { source });
  return dmg;
}

export function damagePlayer(s, pi, amount) {
  const p = s.players[pi];
  p.resolve -= amount;
  if (p.resolve <= 0) { p.resolve = 0; s.winner = foe(pi); s.winReason = 'resolve'; }
}

export function gainResolve(s, pi, amount) {
  const p = s.players[pi];
  p.resolve = Math.min(p.maxResolve, p.resolve + amount);
}

export function createToken(s, pi, tokenCard, ownerIdx = null) {
  const inst = instantiate(s, tokenCard, pi);
  inst.sick = !hasKw(s, inst, 'swift') && !statics(s, pi, 'grantAll').some(a => a.ab.keyword === 'swift');
  inst.sick = !(keywordsOf(s, inst).includes('swift'));
  s.players[pi].field.heroes.push(inst);
  log(s, `${s.players[pi].name} summons ${inst.name}.`, 'summon');
  s.queue.push({ trigger: 'allyEtb', controller: pi, sourceUid: inst.uid, card: inst, isArrival: true });
  return inst;
}

export function createRelicToken(s, pi, relicCard) {
  const inst = instantiate(s, relicCard, pi);
  inst.sick = false;
  s.players[pi].field.relics.push(inst);
  log(s, `${s.players[pi].name} forges ${inst.name}.`, 'summon');
  return inst;
}

export function addCounter(s, inst, kind, amount) {
  inst.counters[kind] = (inst.counters[kind] || 0) + amount;
}
export function removeCounter(s, inst, kind, amount) {
  inst.counters[kind] = Math.max(0, (inst.counters[kind] || 0) - amount);
}

// Mana helpers ---------------------------------------------------------------
export function manaTotal(s, pi) {
  const p = s.players[pi];
  return Object.values(p.mana).reduce((a, b) => a + b, 0);
}
export function spendMana(s, pi, cost) {
  const p = s.players[pi];
  const pool = p.mana;
  // wyrd first, then "any", then exact colours, then generic from whatever is left
  let need = {};
  for (const [k, v] of Object.entries(cost)) if (v) need[k] = v;
  for (const sp of ['wyrd']) {
    if (need[sp]) { const t = Math.min(need[sp], pool[sp] || 0); pool[sp] -= t; need[sp] -= t; }
  }
  for (const sp of ['fire', 'earth', 'water', 'wind', 'spirit']) {
    if (need[sp]) {
      const t = Math.min(need[sp], pool[sp] || 0);
      pool[sp] -= t; need[sp] -= t;
      if (need[sp] > 0 && (pool.wyrd || 0) > 0) {
        const u = Math.min(need[sp], pool.wyrd); pool.wyrd -= u; need[sp] -= u;
      }
    }
  }
  let generic = (need.gen || 0);
  if (generic > 0) {
    if (pool.wyrd) { const t = Math.min(generic, pool.wyrd); pool.wyrd -= t; generic -= t; }
    for (const sp of ['fire', 'earth', 'water', 'wind', 'spirit']) {
      if (generic <= 0) break;
      const t = Math.min(generic, pool[sp] || 0); pool[sp] -= t; generic -= t;
    }
  }
  let over = generic + Object.entries(need).filter(([k]) => k !== 'gen').reduce((a, [, v]) => a + v, 0);
  if (over > 0 && pool.wyrd) { /* already spent */ }
  return over <= 0;
}

export function canPay(s, pi, cost) {
  const pool = { ...s.players[pi].mana };
  let generic = cost.gen || 0;
  for (const sp of ['fire', 'earth', 'water', 'wind', 'spirit']) {
    let need = cost[sp] || 0;
    const have = pool[sp] || 0;
    const take = Math.min(need, have);
    pool[sp] -= take; need -= take; generic += need;
  }
  generic = Math.max(0, generic - (pool.wyrd || 0));
  if (generic <= 0) return true;
  const slack = ['fire', 'earth', 'water', 'wind', 'spirit'].reduce((a, sp) => a + Math.max(0, pool[sp] || 0), 0);
  return slack >= generic;
}

export function effectiveCost(s, pi, card) {
  const cost = { ...(card.cost || {}) };
  let discount = 0;
  if (card.type === 'relic') discount += staticSum(s, pi, 'relicCost', 'amount');   // negative
  if (card.type === 'weaving') discount += staticSum(s, pi, 'weavingCost', 'amount');
  if (card.type === 'cantrip') discount += staticSum(s, pi, 'cantripCost', 'amount');
  let tax = 0;
  if (card.type === 'cantrip' || card.type === 'rite') tax += staticSum(s, foe(pi), 'taxEnemySpells', 'amount');
  let extras = discount + tax;
  if (extras < 0) {
    // apply discount to generic first, then to the smallest coloured pip
    let d = -extras;
    const gen = cost.gen || 0;
    const take = Math.min(d, gen); cost.gen = gen - take; d -= take;
    for (const sp of ['fire', 'earth', 'water', 'wind', 'spirit', 'wyrd']) {
      if (d <= 0) break;
      if (cost[sp]) { cost[sp] -= 1; d -= 1; }
    }
  } else if (extras > 0) {
    cost.gen = (cost.gen || 0) + extras;
  }
  for (const k of Object.keys(cost)) if (!cost[k]) delete cost[k];
  return cost;
}

export function hasBoonCountersAnywhere(s, pi) {
  return heroesOf(s, pi).some(h => (h.counters.boon || 0) > 0);
}

export const realmsPresent = (s, pi) => {
  const set = new Set();
  for (const h of heroesOf(s, pi)) set.add(h.nation === 'corrupted' ? 'The Mists' : h.nation);
  return set;
};
