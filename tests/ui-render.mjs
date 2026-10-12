import { parseHTML } from 'linkedom';
import fs from 'node:fs';
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const { window, document, HTMLElement, CustomEvent, Event, Option } = parseHTML(html);
Object.assign(globalThis,{window,document,HTMLElement,CustomEvent,Event,Option});
globalThis.navigator = window.navigator;
globalThis.location = { protocol:'http:', host:'localhost:3000', href:'http://localhost:3000/' };
const mem=new Map(); globalThis.localStorage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
globalThis.confirm=()=>true;
globalThis.WebSocket = class { constructor(){ this.readyState=0; } addEventListener(){} send(){} close(){} };

const { newGame, reduce } = await import('../src/engine/game.js');
const { aiAction } = await import('../src/engine/ai.js');
const { DECKS } = await import('../src/content/decks.js');
const { CAMPAIGN, CHAPTER_ORDER, chapterById } = await import('../src/content/campaign.js');
const { CARD_BY_ID } = await import('../src/engine/cards/index.js');
const battle = await import('../public/js/battle.js');
const app = await import('../public/js/app.js');
const errors = [];

// ---- content validation -------------------------------------------------
for (const id of CHAPTER_ORDER) {
  const ch = chapterById(id);
  if (!DECKS[ch.duel.opponent.deck]) errors.push(`chapter ${id}: missing deck ${ch.duel.opponent.deck}`);
  for (const r of ch.rewards) if (!CARD_BY_ID[r]) errors.push(`chapter ${id}: bad reward ${r}`);
  if (ch.choice) for (const o of ch.choice.options) if (!CARD_BY_ID[o.reward]) errors.push(`chapter ${id}: bad choice reward ${o.reward}`);
}
for (const [k, d] of Object.entries(DECKS)) {
  if (d.list.length !== 40) errors.push(`deck ${k} has ${d.list.length} cards`);
  const leys = d.list.filter(id => CARD_BY_ID[id].type === 'leyline').length;
  if (leys < 12) errors.push(`deck ${k} only ${leys} leylines`);
}
console.log('content validated:', errors.length ? errors : 'all chapter rewards, decks and opponents resolve');

// ---- render a whole duel turn by turn -----------------------------------
let rendered = 0, results = { win: 0, loss: 0 }, maxTurns = 0;
for (let g = 1; g <= 10; g++) {
  let s = newGame({ p1:{name:'You',deck:DECKS.morvalis.list}, p2:{name:'Fallen',deck:DECKS.fallen.list,ai:true,difficulty:3}, seed: g*7919 });
  battle.G.state = s; battle.G.human = 0; battle.G.mode='quick'; battle.G.finished=false;
  battle.G.meta = { opponent:{name:'Crypt Lord Athra'} };
  battle.render(); rendered++;
  let steps = 0;
  while (s.winner == null && steps++ < 600) {
    let acted = false;
    for (const who of [0,1]) {
      const a = aiAction(s, who);
      if (!a) continue;
      const r = reduce(s, a, who);
      if (r.error) { errors.push(`g${g} ${who} ${a.type}: ${r.error}`); break; }
      s = r.state; acted = true; break;
    }
    if (!acted) { errors.push(`g${g} stalled at ${s.phase}/${s.stage}`); break; }
    // render every state the human would see
    if (s.active === 0 || (s.window && s.window.priority === 0) || s.stage === 'blocks') {
      try { battle.G.state = s; battle.render(); rendered++; }
      catch (e) { errors.push(`render g${g}: ${e.message}`); break; }
    }
  }
  maxTurns = Math.max(maxTurns, s.turn);
  if (s.winner === 0) results.win++; else if (s.winner === 1) results.loss++;
}
console.log(`rendered ${rendered} board states across 10 duels | human wins ${results.win} losses ${results.loss} | longest duel ${maxTurns} turns`);

// ---- the defender must be offered the blockers modal -----------------------
let blockState = null;
for (let seed = 3; seed < 200 && !blockState; seed++) {
  let s = newGame({ p1:{name:'You',deck:DECKS.hammerstadt.list}, p2:{name:'Tyrant',deck:DECKS.tyrant.list,ai:true}, seed: seed*613 });
  let steps = 0;
  while (s.winner == null && steps++ < 400) {
    if (s.phase === 'clash' && s.stage === 'blocks' && s.active === 1 && s.players[0].field.heroes.length) { blockState = s; break; }
    let acted = false;
    for (const who of [0,1]) {
      const a = aiAction(s, who);
      if (!a) continue;
      const r = reduce(s, a, who);
      if (r.error) break;
      s = r.state; acted = true; break;
    }
    if (!acted) break;
  }
}
if (!blockState) errors.push('never reached a state where the human must block');
else {
  document.getElementById('modal-layer').classList.remove('on');
  document.getElementById('modal-layer').innerHTML = '';
  battle.G.state = blockState; battle.G.human = 0; battle.G.mode='quick'; battle.G.finished=false;
  battle.G.meta = { opponent:{name:'Tyrant'} };
  battle.render();
  const layer = document.getElementById('modal-layer');
  const rows = layer.querySelectorAll('.blocker-row').length;
  const opts = layer.querySelectorAll('.blocker-row select');
  if (!layer.classList.contains('on')) errors.push('blockers modal did not open');
  if (!rows || !opts.length) errors.push('blockers modal had no attacker rows');
  else console.log(`blockers modal: ${rows} attacker row(s), ${opts[0].querySelectorAll('option').length} defensive options`);
  const resolveBtn = [...layer.querySelectorAll('button')].find(b => /Resolve/.test(b.textContent));
  if (!resolveBtn) errors.push('no resolve button in the blockers modal');
  else { resolveBtn.onclick ? resolveBtn.onclick() : resolveBtn.dispatchEvent(new Event('click')); }
}

// ---- victory / defeat modal ------------------------------------------------
battle.G.state = blockState || newGame({ p1:{name:'You',deck:DECKS.hammerstadt.list}, p2:{name:'Tyrant',deck:DECKS.tyrant.list,ai:true}, seed: 4242 });
battle.G.state.winner = 0; battle.G.finished = false;
try { battle.render(); } catch (e) { errors.push('finish: ' + e.message); }
const modalTxt = document.getElementById('modal-layer').textContent || '';
if (!/field is yours|driven back/.test(modalTxt)) errors.push('no result modal: ' + modalTxt.slice(0, 60));

console.log('result modal:', modalTxt.replace(/\s+/g, ' ').slice(0, 80));

console.log(errors.length ? 'ERRORS:\n' + errors.slice(0,10).join('\n') : 'no errors in full-duel render stress test');
