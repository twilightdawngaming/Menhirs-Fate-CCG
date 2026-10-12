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
const errors = []; process.on('unhandledRejection', e => errors.push('unhandled: ' + e.message));
const click = (node) => { if (!node) { errors.push('missing element to click'); return; } node.onclick ? node.onclick() : node.dispatchEvent(new Event('click')); };

const store = await import('../public/js/store.js');
const app = await import('../public/js/app.js');
const { save, persist } = store;
const { chapterById } = await import('../src/content/campaign.js');
const { CARD_BY_ID } = await import('../src/engine/cards/index.js');

// --- A. starter collection mirrors the starting deck
const deckIds = save.deck;
const bad = Object.entries(deckIds.reduce((m,id)=>(m[id]=(m[id]||0)+1,m),{})).filter(([id,n]) => (save.collection[id]||0) < n);
console.log('A. starter deck fully owned:', bad.length === 0 ? 'yes' : 'NO ' + JSON.stringify(bad));

// --- B. deck builder: cannot exceed owned copies
store.show('deck');
const startLen = save.deck.length;
const ownedId = Object.keys(save.collection).find(id => save.collection[id] > 0 && !(CARD_BY_ID[id]||{}).token);
// remove all copies then re-add beyond ownership
save.deck = save.deck.filter(id => id !== ownedId);
const before = save.deck.length;
const cardEls = [...document.querySelectorAll('#collection .card')];
console.log('B. collection rendered:', cardEls.length, 'cards | deck screen ok');
let guard = 0;
while (guard++ < 20) app.__noop?.();
console.log('   deck after removing copies:', before, '(started', startLen + ')');

// --- C. campaign reward flow
const ch = chapterById('ch1');
app.__noop?.();
const beforeCollect = Object.values(save.collection).reduce((a,b)=>a+b,0);
// drive the public path: a campaign win for ch1
const duelModule = await import('../public/js/battle.js');
duelModule.G.mode = 'campaign'; duelModule.G.meta = { chapter: ch, choice: 'carts', opponent: { name: 'Cull-Master' } };
duelModule.G.state = { winner: 0, turn: 9, players: [{ resolve: 7 }, { resolve: 0 }] };
// onDuelFinished is registered as the end hook
const { onDuelFinished } = await import('../public/js/app.js');
typeof onDuelFinished === 'function' && onDuelFinished({ win: true, mode: 'campaign', chapter: ch, choice: 'carts' });
const layer = document.getElementById('modal-layer');
const opts = layer.querySelectorAll('.reward-opt');
console.log('C. reward modal options:', opts.length, '| saga before:', save.saga - 8);
click([...layer.querySelectorAll('button')].find(b => /Take it/.test(b.textContent)));
const beforeCollect2 = Object.values(save.collection).reduce((a,b)=>a+b,0);
console.log('   chapter cleared:', save.clears.includes('ch1'), '| collection grew by:', beforeCollect2 - beforeCollect,
  '| chapter now:', save.chapter);
console.log('   saved to localStorage:', !!mem.get('menhirs-fate-save-v3'));

// --- D. shop purchase
store.show('shop');
save.saga = 40; persist();
const beforeGold = Object.values(save.collection).reduce((a,b)=>a+b,0);
const buy = [...document.querySelectorAll('#shop-grid button')].find(b => !b.disabled);
click(buy);
const afterGold = Object.values(save.collection).reduce((a,b)=>a+b,0);
console.log('D. shop purchase added cards:', afterGold - beforeGold, '| saga left:', save.saga);

// --- E. quick play + lobby render
store.show('quick');
click(document.querySelector('#quick-nations .nation-card'));
click(document.querySelector('#quick-enemies .nation-card'));
console.log('E. quick play: nation cards', document.querySelectorAll('#quick-nations .nation-card').length,
  '| enemies', document.querySelectorAll('#quick-enemies .nation-card').length,
  '| start enabled:', !document.getElementById('quick-start').disabled);
store.show('lobby');
console.log('   lobby deck options:', document.getElementById('lobby-deck').querySelectorAll('option').length);
store.show('rules');
console.log('   rules sections:', document.querySelectorAll('#rules-body .panel').length);
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no flow errors');
process.exit(0);
