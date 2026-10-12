// ---------------------------------------------------------------------------
// effects.js — resolves a single card effect. Called by game.js.
// ctx = { s, pi, source, targets, card, opts }
// ---------------------------------------------------------------------------
import {
  log, foe, powerOf, vigilOf, keywordsOf, hasKw, destroy, moveToGrave, dealDamageToHero,
  damagePlayer, gainResolve, createToken, createRelicToken, addCounter, removeCounter,
  heroesOf, enemyHeroes, countRelics, countLeylines, commandsMenhir, statics, randInt,
  TOKEN_LOOKUP, instantiate, hasStatic,
} from './ops.js';
import { CARD_BY_ID, CARDS } from './cards/index.js';

const pick = (arr) => (arr.length ? arr[randInt({ rngState: (Math.random() * 1e9) | 0 }, arr.length)] : null);

function strongest(list) {
  return list.slice().sort((a, b) => (b.might + (b.counters.boon || 0)) - (a.might + (a.counters.boon || 0)))[0] || null;
}

// Resolve a target descriptor into one or more instances / player indices.
export function resolveTarget(ctx, target, fallbackAuto = false) {
  const { s, pi, targets, card } = ctx;
  const t = targets || {};
  const auto = (kind) => {
    const eh = enemyHeroes(s, pi), mh = heroesOf(s, pi);
    switch (kind) {
      case 'chosenEnemyHero': case 'chosenEnemyHeroNew': case 'chosenEnemyGuardian':
        return strongest(eh.filter(h => kind !== 'chosenEnemyGuardian' || hasKw(s, h, 'guardian') || true));
      case 'chosenEnemyTapped': return eh.find(h => h.tapped) || null;
      case 'chosenEnemySoaring': return eh.find(h => hasKw(s, h, 'soaring')) || null;
      case 'chosenAlly': return strongest(mh);
      case 'anyHero': return strongest(eh.concat(mh));
      default: return null;
    }
  };
  if (t[target]) {
    const found = [s.players[0].field.heroes, s.players[0].field.relics, s.players[0].field.leylines,
                   s.players[1].field.heroes, s.players[1].field.relics, s.players[1].field.leylines]
      .flat().find(c => c.uid === t[target]);
    if (found) return found;
  }
  if (fallbackAuto || ctx.auto) return auto(target);
  return null;
}

// ---------------------------------------------------------------------------
export function applyEffect(ctx, e) {
  const { s, pi, source } = ctx;
  const me = s.players[pi], them = s.players[foe(pi)];

  switch (e.type) {
    // ---- damage ------------------------------------------------------------
    case 'dealDamage': {
      let tgt = resolveTarget(ctx, e.target, ctx.auto);
      if (!tgt && e.target === 'chosenEnemyGuardian') tgt = resolveTarget(ctx, 'chosenEnemyHero', true);
      if (!tgt) { log(s, `Nothing to strike.`, 'fizzle'); return; }
      let amount = e.amount;
      if (e.bonusVsRelicHero && tgt.type === 'relic') amount += e.bonusVsRelicHero;
      if (e.multiplier) amount = powerOf(s, source) * e.multiplier;
      tgt.lastDamagedBy = source ? source.uid : null;
      const dealt = dealDamageToHero(s, tgt, amount, source);
      log(s, `${source ? source.name + ' strikes' : 'A working strikes'} ${tgt.name} for ${dealt}.`, 'damage');
      break;
    }
    case 'dealDamageAll': {
      const list = e.side === 'enemy' ? enemyHeroes(s, pi) : heroesOf(s, pi);
      log(s, `${source ? source.name : 'A working'} washes over ${list.length} hero${list.length === 1 ? '' : 'es'}.`, 'damage');
      for (const h of list.slice()) dealDamageToHero(s, h, e.amount, source);
      break;
    }
    case 'dealDamagePerLeyline': {
      const tgt = resolveTarget(ctx, e.target, ctx.auto); if (!tgt) return;
      const n = countLeylines(s, pi) * (e.damagePer || 1);
      dealDamageToHero(s, tgt, n, source);
      log(s, `Deepstone Rebuke hits ${tgt.name} for ${n}.`, 'damage');
      break;
    }
    case 'damagePlayer': {
      const who = e.who === 'foe' ? foe(pi) : pi;
      damagePlayer(s, who, e.amount);
      log(s, `${s.players[who].name} loses ${e.amount} Resolve.`, 'damage');
      break;
    }
    case 'damagePlayerPerCounters': {
      const total = heroesOf(s, pi).reduce((a, h) => a + (h.counters.boon || 0), 0) * (e.per || 1);
      if (total > 0) { damagePlayer(s, foe(pi), total); log(s, `Reckoning lands for ${total}.`, 'damage'); }
      break;
    }
    case 'drainResolve': {
      const pools = [pi, foe(pi)];
      const who = me.resolve >= them.resolve ? foe(pi) : pi;
      damagePlayer(s, who, e.amount);
      log(s, `The Tollmaster takes ${e.amount} from ${s.players[who].name}.`, 'damage');
      break;
    }
    case 'vengeance': {
      const killerUid = source?.lastDamagedBy;
      if (killerUid == null) break;
      const killer = enemyHeroes(s, pi).find(h => h.uid === killerUid);
      if (killer) { dealDamageToHero(s, killer, e.amount, source); log(s, `${source.name} takes one with them.`, 'damage'); }
      break;
    }
    case 'strikeHighest': {
      const who = me.resolve <= them.resolve ? pi : foe(pi);
      const n = powerOf(s, source) * (e.multiplier || 1);
      damagePlayer(s, who, n);
      log(s, `${source.name} strikes ${s.players[who].name} for ${n}.`, 'damage');
      break;
    }

    // ---- resolve -----------------------------------------------------------
    case 'gainResolve': gainResolve(s, pi, e.amount); log(s, `${me.name} gains ${e.amount} Resolve.`, 'heal'); break;
    case 'loseResolve': me.resolve = Math.max(0, me.resolve - e.amount); break;
    case 'payResolve': me.resolve = Math.max(0, me.resolve - e.amount); break;
    case 'gainResolvePerRelic': {
      const n = countRelics(s, pi) * e.amount;
      if (n) { gainResolve(s, pi, n); log(s, `Relics yield ${n} Resolve.`, 'heal'); }
      break;
    }
    case 'healPerBoosted': {
      const n = Math.min(e.max || 99, heroesOf(s, pi).filter(h => (h.counters.boon || 0) > 0).length);
      if (n) { gainResolve(s, pi, n); log(s, `${me.name} gains ${n} Resolve.`, 'heal'); }
      break;
    }
    case 'resolveIfAlone': if (heroesOf(s, pi).length <= 1) { gainResolve(s, pi, e.amount); log(s, `The lone company is paid ${e.amount}.`, 'heal'); } break;

    // ---- cards -------------------------------------------------------------
    case 'draw': {
      let n = e.amount;
      for (let k = 0; k < n; k++) drawOne(s, pi);
      break;
    }
    case 'drawBoth': { for (let k = 0; k < e.amount; k++) { drawOne(s, pi); drawOne(s, foe(pi)); } break; }
    case 'drawIfRelic': { const has = countRelics(s, pi) > 0; for (let k = 0; k < (has ? e.amount : (e.fallback || 1)); k++) drawOne(s, pi); break; }
    case 'drawIfRelics': { if (countRelics(s, pi) >= (e.amount || 2)) { for (let k = 0; k < (e.draw || 1); k++) drawOne(s, pi); } break; }
    case 'drawIfMenhir': { const has = commandsMenhir(s, pi); for (let k = 0; k < (has ? e.amount : (e.fallback || 1)); k++) drawOne(s, pi); break; }
    case 'drawIfBehind': { if (me.hand.length < them.hand.length) drawOne(s, pi); break; }
    case 'gambleDraw': { drawOne(s, pi); log(s, `The Riddlekeeper accepts the answer.`, 'draw'); break; }
    case 'exileFromGraveDraw': {
      if (me.grave.length) { me.exile.push(me.grave.pop()); drawOne(s, pi); log(s, `A deed is set aside; a new one is read.`, 'draw'); }
      break;
    }
    case 'discard': {
      const who = e.who === 'foe' ? foe(pi) : pi;
      const p = s.players[who];
      if (!p.hand.length) break;
      let idx = e.random ? randInt(s, p.hand.length) : worstIndex(p.hand);
      const [c] = p.hand.splice(idx, 1);
      p.grave.push(c);
      log(s, `${p.name} discards ${who === foe(pi) ? c.name : c.name}.`, 'discard');
      break;
    }
    case 'searchTop': {
      const n = Math.min(e.amount, me.deck.length);
      const top = me.deck.splice(0, n);
      const take = e.take === 'one' ? 1 : e.take === 'hero' ? 1 : n;
      let taken = 0;
      for (let i = top.length - 1; i >= 0; i--) {
        const c = top[i];
        const isHero = c.type === 'hero';
        if (e.take === 'hero' && !isHero) continue;
        if (taken >= take) continue;
        me.hand.push(c); top.splice(i, 1); taken++;
        if (e.take === 'hero') break;
      }
      for (const c of top) {
        if (e.rest === 'grave') me.grave.push(c); else me.deck.push(c);
      }
      if (taken) log(s, `${me.name} reads the next pages (${taken} card${taken === 1 ? '' : 's'}).`, 'draw');
      break;
    }
    case 'searchLeyline': { searchDeck(s, pi, c => c.type === 'leyline', e.to || 'hand', e.count || 1, 'leyline'); break; }
    case 'searchType': { searchDeck(s, pi, c => c.type === e.kind, e.to || 'hand', e.count || 1, e.kind); break; }
    case 'exileRandomHand': {
      const p = s.players[foe(pi)];
      if (!p.hand.length) break;
      const i = randInt(s, p.hand.length);
      const [c] = p.hand.splice(i, 1);
      p.exile.push(c);
      log(s, `A card is unmade from ${p.name}'s hand.`, 'void');
      break;
    }
    case 'exileHandThenDraw': {
      const who = e.who === 'foe' ? foe(pi) : pi, p = s.players[who];
      p.exile.push(...p.hand.splice(0));
      for (let k = 0; k < (e.draw || 0); k++) drawOne(s, who);
      log(s, `${p.name}'s hand is unmade and refilled.`, 'void');
      break;
    }
    case 'revealHand': log(s, `${them.name} reveals their hand to ${me.name}.`, 'info'); s.revealTo = pi; break;
    case 'nameAndExile': break;

    // ---- zone movement -----------------------------------------------------
    case 'returnFromGrave': {
      const heroes = me.grave.filter(c => c.type === 'hero');
      if (heroes.length) { const c = heroes[heroes.length - 1]; me.grave.splice(me.grave.indexOf(c), 1); me.hand.push(c); log(s, `${c.name} is remembered.`, 'recur'); }
      break;
    }
    case 'recurGraveHero': {
      const heroes = me.grave.filter(c => c.type === 'hero' && !c.sealed);
      if (heroes.length) { const c = strongest(heroes) || heroes[0]; me.grave.splice(me.grave.indexOf(c), 1); me.hand.push(c); log(s, `${c.name} is called back to service.`, 'recur'); }
      break;
    }
    case 'reanimate': {
      const heroes = me.grave.filter(c => c.type === 'hero');
      if (heroes.length) { const c = strongest(heroes); me.grave.splice(me.grave.indexOf(c), 1); revivify(s, pi, c, e.counters || 0); }
      break;
    }
    case 'massReanimate': {
      const heroes = me.grave.filter(c => c.type === 'hero');
      me.grave = me.grave.filter(c => c.type !== 'hero');
      for (const c of heroes) revivify(s, pi, c, e.counters || 0, true);
      log(s, `${heroes.length} heroes return from the mist.`, 'recur');
      break;
    }
    case 'selfReanimate': { source.returnAtNextClash = true; break; }
    case 'cheatHero': {
      const heroes = me.hand.filter(c => c.type === 'hero');
      if (heroes.length) {
        const c = strongest(heroes); me.hand.splice(me.hand.indexOf(c), 1);
        revivify(s, pi, c, e.counters || 0);
        log(s, `${c.name} steps out of the bargain.`, 'summon');
      }
      break;
    }
    case 'sealGrave': { them.graveSealed = true; log(s, `${them.name}'s graves are sealed.`, 'void'); break; }
    case 'exileAllGraves': {
      for (const p of s.players) { p.exile.push(...p.grave.splice(0)); }
      log(s, `Every ledger is closed.`, 'void'); break;
    }
    case 'bounceAllEnemyHeroes': {
      const list = enemyHeroes(s, pi);
      for (const h of list.slice()) { them.hand.push(h); moveToGrave(s, h, them); them.grave.pop(); }
      log(s, `${list.length} heroes are swept back to their owner's hand.`, 'info');
      break;
    }

    // ---- destruction -------------------------------------------------------
    case 'destroy': {
      const t = resolveTarget(ctx, e.target, ctx.auto);
      if (!t) { log(s, `Nothing falls.`, 'fizzle'); break; }
      if (destroy(s, t, {})) log(s, `${t.name} is felled.`, 'destroy');
      else log(s, `${t.name} cannot be felled.`, 'ward');
      break;
    }
    case 'destroyHighestMight': {
      const all = heroesOf(s, 0).concat(heroesOf(s, 1));
      const t = strongest(all);
      if (t && destroy(s, t, {})) log(s, `The Trial claims ${t.name}.`, 'destroy');
      break;
    }
    case 'destroyAllEnemyHeroes': {
      for (const h of enemyHeroes(s, pi).slice()) destroy(s, h, {});
      log(s, `Unmaking. The enemy line is gone.`, 'destroy');
      break;
    }
    case 'destroyAllNonHeroes': {
      for (const p of s.players) {
        for (const r of p.field.relics.slice()) destroy(s, r, {});
        for (const l of p.field.leylines.slice()) destroy(s, l, {});
      }
      log(s, `Void Tide takes the relics and the leylines.`, 'destroy');
      break;
    }
    case 'destroyEnemyRelicOrLeyline': {
      const list = them.field.relics.concat(them.field.leylines);
      if (list.length) { const t = list[0]; destroy(s, t, {}); log(s, `${t.name} is shattered.`, 'destroy'); }
      break;
    }
    case 'sacrificeSelf': destroy(s, source, {}); break;

    // ---- counters / stats ---------------------------------------------------
    case 'addCounters': {
      const t = e.target === 'self' ? source : e.target === 'triggerSource' ? ctx.triggerCard : resolveTarget(ctx, e.target, true);
      if (t) { addCounter(s, t, e.kind, e.amount); log(s, `${t.name} gains ${e.amount} ${e.kind} counter${e.amount === 1 ? '' : 's'}.`, 'buff'); }
      break;
    }
    case 'selfCounters': {
      let n = e.amount || 0;
      if (e.amountFrom === 'leylinesThisDuel') n = me.leylinesPlayed || 0;
      addCounter(s, source, e.kind, n);
      break;
    }
    case 'addCountersAll': {
      const list = e.side === 'ally' ? heroesOf(s, pi) : enemyHeroes(s, pi);
      for (const h of list) addCounter(s, h, e.kind, e.amount);
      if (list.length) log(s, `${list.length} heroes gain ${e.amount} ${e.kind} counter${e.amount === 1 ? '' : 's'}.`, 'buff');
      break;
    }
    case 'addCountersGuarded': {
      const list = heroesOf(s, pi).filter(h => h !== source && hasKw(s, h, 'guardian'));
      for (const h of list) addCounter(s, h, e.kind, e.amount);
      if (list.length) log(s, `The guarded gain ${e.amount} counter${e.amount === 1 ? '' : 's'}.`, 'buff');
      break;
    }
    case 'addCountersStrongest': {
      const t = strongest(heroesOf(s, pi));
      if (t) { addCounter(s, t, e.kind, e.amount); log(s, `${t.name} gains a ${e.kind} counter.`, 'buff'); }
      break;
    }
    case 'addCountersIfMenhir': { if (commandsMenhir(s, pi)) { addCounter(s, source, e.kind, e.amount); log(s, `The stone answers: +${e.amount}.`, 'buff'); } break; }
    case 'addCountersFromRealms': {
      const realms = new Set(heroesOf(s, pi).map(h => h.nation));
      addCounter(s, source, e.kind, Math.max(1, realms.size));
      log(s, `The muster answers from ${realms.size} nations.`, 'buff');
      break;
    }
    case 'countersIfNoRelic': { if (countRelics(s, pi) === 0) { addCounter(s, source, e.kind, e.amount); log(s, `Unburdened, ${source.name} gains ${e.amount} counters.`, 'buff'); } break; }
    case 'counterIfRelic': { const t = e.target === 'self' ? source : resolveTarget(ctx, e.target, true); if (t && countRelics(s, pi) > 0) { addCounter(s, t, e.kind, e.amount); } break; }
    case 'removeEnemyCounter': {
      const t = strongest(enemyHeroes(s, pi).filter(h => Object.values(h.counters).some(v => v > 0)));
      if (t) { removeCounter(s, t, 'boon', e.amount); log(s, `A boon is unpicked from ${t.name}.`, 'debuff'); }
      break;
    }
    case 'stripAndGain': {
      const t = resolveTarget(ctx, e.target, true); if (!t) break;
      const n = (t.counters.boon || 0) * (e.per || 1);
      removeCounter(s, t, 'boon', 999); if (n) { gainResolve(s, pi, n); log(s, `Harvest: ${n} Resolve.`, 'heal'); }
      break;
    }
    case 'pump': {
      const t = resolveTarget(ctx, e.target, true); if (!t) break;
      t.buffs.push({ might: e.might, vigil: e.vigil, turn: e.duration === 'turn' ? s.turn : null });
      log(s, `${t.name} is strengthened (+${e.might}/+${e.vigil}).`, 'buff');
      break;
    }
    case 'pumpAll': {
      const list = heroesOf(s, pi);
      for (const h of list) h.buffs.push({ might: e.might, vigil: e.vigil, turn: e.duration === 'turn' ? s.turn : null });
      break;
    }
    case 'debuffAllEnemies': {
      for (const h of enemyHeroes(s, pi)) h.buffs.push({ might: e.might, vigil: 0, turn: s.turn });
      break;
    }
    case 'buffHeroPermanent': {
      const t = resolveTarget(ctx, e.target, true); if (!t) break;
      t.might += e.might; t.vigil += e.vigil;
      for (const k of e.keywords || []) t.granted.push(k);
      log(s, `${t.name} is bound into a new fate.`, 'buff');
      break;
    }
    case 'grantKeyword': {
      const t = resolveTarget(ctx, e.target, true); if (!t) break;
      t.granted.push(e.keyword);
      if (e.duration !== 'turn') t.permanentKeywords = true;
      break;
    }
    case 'grantAllKeyword': {
      for (const h of heroesOf(s, pi)) h.granted.push(e.keyword);
      break;
    }
    case 'cantBlock': { const t = resolveTarget(ctx, e.target, true); if (t) t.cantBlock = true; break; }
    case 'grantKeywordAttached': {
      const host = source.attachedTo; if (host) host.granted.push(e.keyword);
      break;
    }
    case 'stripKeywordsAttached': { const host = source.attachedTo; if (host) host.stripped = true; break; }
    case 'attachPump': break; // handled by powerOf/vigilOf reading attachments
    case 'attachDeathRattle': break; // handled in destroy()
    case 'deathRattleThisTurn': {
      const t = resolveTarget(ctx, 'chosenAlly', true); if (t) t.deathRattle = { amount: e.amount, turn: s.turn };
      break;
    }

    // ---- protection --------------------------------------------------------
    case 'preventDamage': { const t = resolveTarget(ctx, e.target, true); if (t) { t.prevent += e.amount; log(s, `${t.name} is warded (${e.amount}).`, 'ward'); } break; }
    case 'preventAll': { for (const h of heroesOf(s, pi)) { h.preventAll = true; h.preventAllTurn = s.turn; } log(s, `A ward settles over the whole line.`, 'ward'); break; }

    // ---- tokens / relics ---------------------------------------------------
    case 'createToken': {
      const tc = TOKEN_LOOKUP[e.token] || TOKEN_LOOKUP['tok-wisp'];
      for (let k = 0; k < e.count; k++) createToken(s, e.target === 'foe' ? foe(pi) : pi, tc);
      break;
    }
    case 'createRelic': {
      const rc = TOKEN_LOOKUP[e.relic] || CARDS.find(c => c.type === 'relic');
      createRelicToken(s, pi, rc);
      break;
    }

    // ---- mana / leylines ---------------------------------------------------
    case 'attuneLeyline': {
      const untapped = me.field.leylines.filter(l => !l.tapped);
      const list = untapped.slice(0, e.amount === 99 ? untapped.length : e.amount);
      for (const l of list) attuneLeyline(s, pi, l);
      if (list.length) log(s, `${list.length} leyline${list.length === 1 ? '' : 's'} attuned.`, 'mana');
      break;
    }
    case 'attuneOrDraw': {
      const untapped = me.field.leylines.filter(l => !l.tapped);
      if (untapped.length) { attuneLeyline(s, pi, untapped[0]); log(s, `A leyline is attuned.`, 'mana'); }
      else drawOne(s, pi);
      break;
    }
    case 'gainMana': {
      const sp = e.anySphere ? (me.manaChoice || 'wyrd') : (e.sphere || 'wyrd');
      me.mana[sp] = (me.mana[sp] || 0) + e.amount;
      log(s, `${me.name} gathers ${e.amount} ${sp} mana.`, 'mana');
      break;
    }
    case 'sphereShift': { me.sphereLock = 'any'; log(s, `The Councillor bends the ley lines.`, 'mana'); break; }

    // ---- misc --------------------------------------------------------------
    case 'scryDraw': { drawOne(s, pi); break; }
    case 'bankerClash': { if (countRelics(s, pi) > 0) gainResolve(s, pi, 1); if (countRelics(s, pi) > 1) drawOne(s, pi); break; }
    case 'payCounter': {
      if (countAvailableMana(me) >= (e.cost || 1)) {
        spendAny(me, e.cost || 1);
        const t = resolveTarget(ctx, e.target, true) || source;
        addCounter(s, t, e.kind, e.amount);
      }
      break;
    }
    case 'optionalCounter': {
      if (countAvailableMana(me) >= 1) { spendAny(me, 1); addCounter(s, ctx.triggerCard || source, e.kind, e.amount); }
      break;
    }
    case 'tapEnemyNoReady': {
      const t = resolveTarget(ctx, e.target, true) || strongest(enemyHeroes(s, pi));
      if (t) { t.tapped = true; t.skippedRally = true; log(s, `${t.name} is bound in the tide.`, 'debuff'); }
      break;
    }
    case 'readyAlly': {
      const t = resolveTarget(ctx, 'chosenAlly', true);
      if (t) { t.tapped = false; log(s, `${t.name} recovers.`, 'info'); }
      break;
    }
    case 'readyAllyOrSwift': {
      const t = resolveTarget(ctx, e.target || 'chosenAlly', true);
      if (t) { if (t.tapped) { t.tapped = false; } else { t.granted.push('swift'); } log(s, `${t.name} moves again.`, 'info'); }
      break;
    }
    case 'mustAttack': { const t = resolveTarget(ctx, e.target, true); if (t) { t.mustAttack = true; log(s, `${t.name} is compelled.`, 'debuff'); } break; }
    case 'preventAttack': { const t = resolveTarget(ctx, e.target, true); if (t) { t.cantAttackTurn = true; log(s, `${t.name} is bound by clause fourteen.`, 'debuff'); } break; }
    case 'tauntSelf': { source.taunting = true; log(s, `${source.name} demands the whole line.`, 'info'); break; }
    case 'tollOrDestroy': {
      const t = resolveTarget(ctx, e.target, true); if (!t) break;
      if (powerOf(s, t) <= 3) { destroy(s, t, {}); log(s, `${t.name} cannot pay the toll.`, 'destroy'); }
      else { t.tapped = true; t.skippedRally = true; log(s, `${t.name} pays. It will not move next Rally.`, 'debuff'); }
      break;
    }
    case 'counterSpell': {
      if (s.stack.length) {
        const item = s.stack[s.stack.length - 1];
        s.stack.pop();
        s.players[item.pi].grave.push(item.card)
        log(s, `${item.card.name} is unspooled before it lands.`, 'counter');
        if (e.compensates) drawOne(s, item.pi);
      } else log(s, `Nothing on the thread to unspool.`, 'fizzle');
      break;
    }
    case 'retarget': {
      if (s.stack.length) { const item = s.stack[s.stack.length - 1]; item.retargeted = true; log(s, `The working is turned aside.`, 'counter'); }
      break;
    }
    case 'chooseOne': { const opt = e.options[ctx.choice || 0] || e.options[0]; for (const sub of opt) applyEffect(ctx, sub); break; }
    case 'pumpIfNoCounters': {
      if (source && (source.counters.boon || 0) === 0) { source.might += e.might; log(s, `${source.name} grows feral.`, 'buff'); }
      break;
    }
    case 'selfReturnNextClash': break;
    case 'protectOwn': case 'enablesWeavings': case 'boostMenhirs': break;
    default:
      break;
  }
}

function countAvailableMana(p) { return Object.values(p.mana).reduce((a, b) => a + b, 0); }
function spendAny(p, n) {
  for (const sp of ['wyrd', 'fire', 'earth', 'water', 'wind', 'spirit']) {
    if (n <= 0) break;
    const t = Math.min(n, p.mana[sp] || 0); p.mana[sp] = (p.mana[sp] || 0) - t; n -= t;
  }
}

export function worstIndex(hand) {
  let best = 0, bestScore = 1e9;
  hand.forEach((c, i) => {
    let score = 0;
    if (c.type === 'leyline') score = c.cost && Object.keys(c.cost).length ? 1 : (c.id === 'ley-haven' ? 9 : 2);
    else score = (Object.values(c.cost || {}).reduce((a, b) => a + b, 0)) + (c.type === 'hero' ? (c.might || 0) : 0);
    if (c.id === 'c-unspool' || c.id === 'wv-coronation' || c.id === 'mn-haven') score += 20;
    if (score < bestScore) { bestScore = score; best = i; }
  });
  return best;
}

export function drawOne(s, pi) {
  const p = s.players[pi];
  if (!p.deck.length) {
    if (p.grave.length) { p.deck = p.grave.splice(0); }
    else { damagePlayer(s, pi, 2); log(s, `${p.name} has no cards left: the mists take 2 Resolve.`, 'damage'); return; }
  }
  const c = p.deck.shift();
  p.hand.push(c);
  p.drewThisTurn = (p.drewThisTurn || 0) + 1;
  for (const ab of statics(s, foe(pi), 'punishDraw')) {
    damagePlayer(s, pi, ab.ab.amount || 1);
  }
  if (p.drewThisTurn === 2) {
    const n = statics(s, pi, 'secondDrawResolve').reduce((a, x) => a + (x.ab.amount || 0), 0);
    if (n) gainResolve(s, pi, n);
  }
  return c;
}

export function searchDeck(s, pi, pred, to, count, label) {
  const p = s.players[pi];
  const found = p.deck.filter(pred).slice(0, count);
  for (const c of found) {
    p.deck.splice(p.deck.indexOf(c), 1);
    if (to === 'field') {
      if (c.type === 'leyline') { const inst = instantiateFor(s, c, pi); inst.tapped = !hasStaticLike(s, pi); p.field.leylines.push(inst); p.leylinesPlayed++; }
      else if (c.type === 'relic') { const inst = instantiateFor(s, c, pi); p.field.relics.push(inst); }
      else p.hand.push(c);
    } else p.hand.push(c);
  }
  if (found.length) log(s, `${p.name} finds ${found.length} ${label}${found.length === 1 ? '' : 's'}.`, 'draw');
  return found;
}
function hasStaticLike(s, pi) { return statics(s, pi, 'leylinesAttuned').length > 0 || statics(s, pi, 'leylinesAttunedIfMenhir').length > 0; }

function revivify(s, pi, card, counters, silent) {
  const inst = instantiateFor(s, card, pi);
  inst.sick = false; inst.counters.boon = counters || 0;
  s.players[pi].field.heroes.push(inst);
  if (!silent) log(s, `${inst.name} rises from the mist.`, 'summon');
  s.queue.push({ trigger: 'allyEtb', controller: pi, sourceUid: inst.uid, card: inst, isArrival: true });
  return inst;
}

function instantiateFor(s, card, pi) { return instantiate(s, card, pi); }

export function attuneLeyline(s, pi, leyline, sphere) {
  const p = s.players[pi];
  if (leyline.tapped) return null;
  const produce = leyline.abilities?.[0]?.produce || ['wyrd'];
  let sp = sphere || p.sphereLock === 'any' ? (sphere || produce[produce.length - 1]) : produce[0];
  if (p.sphereLock === 'any' && !sphere) sp = 'wyrd';
  if (!produce.includes(sp) && sp !== 'wyrd') sp = produce[0];
  if (p.sphereLock === 'any') sp = sphere || 'wyrd';
  leyline.tapped = true;
  p.mana[sp] = (p.mana[sp] || 0) + 1;
  return sp;
}
