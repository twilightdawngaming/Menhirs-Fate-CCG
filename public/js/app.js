// ---------------------------------------------------------------------------
// app.js — screens: home, campaign map, story, deck builder, shop, quick play
// ---------------------------------------------------------------------------
import { CARDS, CARD_BY_ID, NATIONS, REALMS, SPHERE_INFO, KEYWORDS, ALL_HERO_CARDS } from '/src/engine/cards/index.js';
import { CAMPAIGN, CHAPTER_ORDER, chapterById } from '/src/content/campaign.js';
import { DECKS, STARTER_DECK } from '/src/content/decks.js';
import { renderCard, cardMetaLine, costPips } from './cardview.js';
import { save, persist, grant, addSaga, show, toast, el, resetSave, ownedCount } from './store.js';
import { startDuel, openLobby, startPvpBattle, onDuelEnd } from './battle.js';

// ---------------------------------------------------------------------------
// navigation
// ---------------------------------------------------------------------------
document.addEventListener('click', (e) => {
  const go = e.target.closest && e.target.closest('[data-go]');
  if (!go) return;
  show(go.dataset.go);
});

// every screen renders itself when it becomes visible
document.addEventListener('screen', (e) => {
  switch (e.detail) {
    case 'home': renderHome(); break;
    case 'map': renderMap(); break;
    case 'deck': renderDeck(); break;
    case 'shop': renderShop(); break;
    case 'quick': renderQuick(); break;
    case 'rules': renderRules(); break;
    case 'lobby': openLobby(); break;
    default: break;
  }
});

// ---------------------------------------------------------------------------
// home
// ---------------------------------------------------------------------------
export function renderHome() {
  const done = save.clears.length;
  document.getElementById('home-saga').textContent = save.saga;
  document.getElementById('home-progress').textContent =
    done === 0 ? 'No chapters completed' : `${done} of ${CHAPTER_ORDER.length} chapters completed`;
  const ownedTotal = Object.values(save.collection).reduce((a, b) => a + b, 0);
  document.getElementById('home-deck-sub').textContent =
    `Deck ${save.deck.length} cards · collection ${ownedTotal}`;
  const next = CHAPTER_ORDER.find(id => !save.clears.includes(id));
  const ch = next ? chapterById(next) : null;
  document.getElementById('home-campaign-sub').textContent = ch ? `Next: ${ch.title}` : 'The story is told — replay any chapter';
}

// ---------------------------------------------------------------------------
// campaign map
// ---------------------------------------------------------------------------
function renderMap() {
  const list = document.getElementById('chapter-list');
  list.innerHTML = '';
  document.getElementById('map-progress').textContent =
    `${save.clears.length}/${CHAPTER_ORDER.length} reclaimed · ${save.saga} Saga`;
  CHAPTER_ORDER.forEach((id, i) => {
    const ch = chapterById(id);
    const done = save.clears.includes(id);
    const unlocked = i === 0 || save.clears.includes(CHAPTER_ORDER[i - 1]) || done;
    const card = el('div', 'chapter-card' + (done ? ' done' : '') + (unlocked ? '' : ' locked'));
    card.innerHTML = `
      <div class="chapter-num">${done ? '✓' : roman(i)}</div>
      <div>
        <h4>${ch.title}</h4>
        <p>${ch.subtitle}</p>
      </div>
      <div class="chapter-state">${done ? 'reclaim&nbsp;· replay' : unlocked ? 'begin ›' : 'locked'}</div>`;
    if (unlocked) card.onclick = () => openStory(id);
    list.appendChild(card);
  });
}

const roman = (n) => ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][n] || String(n);

// ---------------------------------------------------------------------------
// story screen
// ---------------------------------------------------------------------------
let storyState = null;

export function openStory(chapterId) {
  const ch = chapterById(chapterId);
  storyState = { ch, idx: 0, chosen: null, showOutcome: false };
  document.getElementById('story-title').textContent = ch.title;
  document.getElementById('story-subtitle').textContent = ch.subtitle;
  document.getElementById('story-body').innerHTML = '';
  document.getElementById('story-briefing').innerHTML = ch.briefing
    ? `<h4>What is at stake</h4><ul>${ch.briefing.map(b => `<li>${b}</li>`).join('')}</ul>` : '';
  document.getElementById('story-choice').innerHTML = '';
  document.getElementById('story-duel').style.display = 'none';
  document.getElementById('story-continue').style.display = 'inline-block';
  document.getElementById('story-continue').textContent = 'Continue';
  show('story');
  advanceStory();
}

function para(t) {
  const p = el('p');
  if (typeof t === 'string') p.textContent = t;
  else { p.className = 'line'; p.innerHTML = `<span class="who">${t.who}</span>${t.text}`; }
  return p;
}

function advanceStory() {
  const { ch } = storyState;
  const body = document.getElementById('story-body');
  if (storyState.showOutcome) {
    const opt = ch.choice.options.find(o => o.id === storyState.chosen);
    if (storyState.outcomeShown) { finishStory(); return; }
    storyState.outcomeShown = true;
    opt.outcome.forEach(t => { if (typeof t === 'string') body.appendChild(para(t)); });
    body.appendChild(el('p', null, '<i>The duel is upon you.</i>'));
    body.scrollTop = body.scrollHeight;
    document.getElementById('story-duel').style.display = 'inline-block';
    document.getElementById('story-continue').style.display = 'none';
    return;
  }
  if (storyState.idx < ch.intro.length) {
    body.appendChild(para(ch.intro[storyState.idx++]));
    body.scrollTop = body.scrollHeight;
    if (storyState.idx >= ch.intro.length) showChoice();
    return;
  }
  showChoice();
}

function showChoice() {
  const { ch } = storyState;
  if (!ch.choice || storyState.chosen) {
    document.getElementById('story-duel').style.display = 'inline-block';
    document.getElementById('story-continue').style.display = 'none';
    return;
  }
  const box = document.getElementById('story-choice');
  box.innerHTML = `<h4>${ch.choice.prompt}</h4>`;
  for (const opt of ch.choice.options) {
    const b = el('button', 'choice-opt', `<b>${opt.label}</b><span>${opt.text}</span>`);
    b.onclick = () => {
      storyState.chosen = opt.id;
      Object.assign(save.flags, opt.flags || {});
      persist();
      box.querySelectorAll('.choice-opt').forEach(x => x.classList.remove('taken'));
      b.classList.add('taken');
      storyState.showOutcome = true;
      advanceStory();
    };
    box.appendChild(b);
  }
}

function finishStory() {
  document.getElementById('story-duel').style.display = 'inline-block';
  document.getElementById('story-continue').style.display = 'none';
}

document.getElementById('story-continue').onclick = advanceStory;
document.getElementById('story-duel').onclick = () => {
  const { ch, chosen } = storyState;
  startDuel({
    mode: 'campaign',
    chapter: ch,
    choice: chosen,
    playerDeck: save.deck.length >= 40 ? save.deck : STARTER_DECK,
  });
};

// ===========================================================================
// DECK BUILDER
// ===========================================================================
let deckFilter = { q: '', type: '', nation: '', ownedOnly: true };

function renderDeck() {
  const natSel = document.getElementById('deck-filter-nation');
  if (natSel.options.length <= 1) {
    const nations = [...new Set(CARDS.map(c => c.nation))].sort();
    for (const n of nations) {
      const o = document.createElement('option');
      o.value = n; o.textContent = (NATIONS[n] || { name: n }).name;
      natSel.appendChild(o);
    }
  }
  document.getElementById('deck-search').oninput = (e) => { deckFilter.q = e.target.value.toLowerCase(); renderCollection(); };
  document.getElementById('deck-filter-type').onchange = (e) => { deckFilter.type = e.target.value; renderCollection(); };
  natSel.onchange = (e) => { deckFilter.nation = e.target.value; renderCollection(); };
  document.getElementById('deck-owned-only').onchange = (e) => { deckFilter.ownedOnly = e.target.checked; renderCollection(); };
  document.getElementById('deck-autofill').onclick = autoFill;
  document.getElementById('deck-reset').onclick = () => {
    if (!confirm('Reset the deck to the Haven starter deck? Your collection is kept.')) return;
    save.deck = [...STARTER_DECK]; persist(); renderDeck();
  };
  renderDeckList();
  renderCollection();
}

function countMap(list) { const m = new Map(); for (const id of list) m.set(id, (m.get(id) || 0) + 1); return m; }

function renderDeckList() {
  const box = document.getElementById('deck-list');
  const counts = countMap(save.deck);
  box.innerHTML = '';
  const entries = [...counts.entries()].sort((a, b) => {
    const ca = CARD_BY_ID[a[0]], cb = CARD_BY_ID[b[0]];
    const order = { leyline: 0, hero: 1, cantrip: 2, rite: 3, weavemark: 4, relic: 5, weaving: 6 };
    return (order[ca.type] - order[cb.type]) || (ca.name || '').localeCompare(cb.name || '');
  });
  for (const [id, n] of entries) {
    const c = CARD_BY_ID[id]; if (!c) continue;
    const row = el('div', 'deck-row', `<span class="cnt">${n}</span><span class="nm">${c.name}</span>
      <span class="owned-count">${costPips(c).replace(/class="cost-pip"/g, 'class="cost-pip" style="width:10px;height:10px;font-size:7px"')}</span>`);
    const rm = el('button', 'rm', '✕');
    rm.onclick = () => { removeOne(id); };
    row.appendChild(rm);
    box.appendChild(row);
  }
  const stats = document.getElementById('deck-stats');
  const byType = {};
  for (const id of save.deck) { const c = CARD_BY_ID[id]; if (c) byType[c.type] = (byType[c.type] || 0) + 1; }
  const curve = {};
  for (const id of save.deck) {
    const c = CARD_BY_ID[id]; if (!c || c.type === 'leyline') continue;
    const cmc = Object.values(c.cost || {}).reduce((a, b) => a + b, 0);
    curve[cmc] = (curve[cmc] || 0) + 1;
  }
  stats.innerHTML = `<span><b>${save.deck.length}</b> cards</span>` +
    Object.entries(byType).map(([t, n]) => `<span>${n} ${t}</span>`).join('') +
    `<span>curve ${Object.entries(curve).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' ')}</span>`;
  const totalOwned = Object.values(save.collection).reduce((a, b) => a + b, 0);
  document.getElementById('deck-count').textContent = `${save.deck.length} / 40–60 · ${totalOwned} cards in collection`;
}

function addOne(id) {
  if (save.deck.length >= 60) { toast('A deck holds at most sixty cards. Elandra has standards.'); return; }
  const inDeck = countMap(save.deck).get(id) || 0;
  if (inDeck >= ownedCount(id)) { toast(`You own ${ownedCount(id)} of those. The Bank sells more.`); return; }
  save.deck.push(id); persist(); renderDeckList(); renderCollection();
}
function removeOne(id) {
  const i = save.deck.lastIndexOf(id);
  if (i >= 0 && save.deck.length > 40) { save.deck.splice(i, 1); persist(); renderDeckList(); }
  else if (save.deck.length <= 40) toast('Forty cards is the floor. Remove something else first.');
}

function autoFill() {
  const pool = Object.entries(save.collection).flatMap(([id, n]) => Array.from({ length: n }, () => CARD_BY_ID[id])).filter(Boolean);
  const basics = { fire: 'ley-ember', earth: 'ley-stone', water: 'ley-tide', wind: 'ley-gale', spirit: 'ley-soul', wyrd: 'ley-wild' };
  const use = [];
  for (const c of pool) if (c.type === 'leyline' && c.kind.includes('—') && !c.id.startsWith('ley-haven')) use.push(c.id);
  let deck = save.deck.slice(0, 40);
  const avail = new Map();
  for (const c of Object.values(save.collection)) { /* no-op: keeps shape obvious */ }
  for (const [id, n] of Object.entries(save.collection)) avail.set(id, n);
  for (const id of deck) avail.set(id, (avail.get(id) || 0) - 1);
  let guard = 0;
  while (deck.length < 40 && guard++ < 500) {
    const [id, n] = [...avail.entries()].filter(([, v]) => v > 0)[Math.floor(Math.random() * Math.max(1, [...avail.entries()].filter(([, v]) => v > 0).length))] || [];
    if (!id) break;
    deck.push(id); avail.set(id, n - 1);
  }
  // ensure at least 15 leylines
  let leys = deck.filter(id => (CARD_BY_ID[id] || {}).type === 'leyline').length;
  while (leys < 16) {
    const sp = ['fire', 'earth', 'water', 'wind', 'spirit', 'wyrd'][leys % 6];
    deck[deck.length - 1 - (leys % 6)] = basics[sp];
    leys++;
  }
  save.deck = deck.slice(0, 60); persist(); renderDeck();
  toast('The deck has been made legal. Whether it is wise is another matter.');
}

function renderCollection() {
  const box = document.getElementById('collection');
  box.innerHTML = '';
  const list = CARDS.filter(c => {
    if (c.token) return false;
    if (deckFilter.ownedOnly && ownedCount(c.id) === 0) return false;
    if (deckFilter.type && c.type !== deckFilter.type) return false;
    if (deckFilter.nation && c.nation !== deckFilter.nation) return false;
    if (deckFilter.q && !(c.name + ' ' + (c.txt || '') + ' ' + (c.flavour || '')).toLowerCase().includes(deckFilter.q)) return false;
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));
  for (const c of list) {
    const wrap = el('div');
    const card = renderCard(c, { size: 'small' });
    const owned = ownedCount(c.id);
    const inDeck = countMap(save.deck).get(c.id) || 0;
    card.classList.toggle('unplayable', owned === 0 || inDeck >= owned);
    card.onclick = () => {
      if (owned === 0) { toast('You do not own that. The Bank may have salvage.'); return; }
      addOne(c.id);
    };
    wrap.appendChild(card);
    wrap.appendChild(el('div', 'owned-count', owned
      ? `owned ×${owned}${inDeck ? ` · in deck ${inDeck}` : ''}` : 'not owned'));
    box.appendChild(wrap);
  }
}

// ===========================================================================
// BANK OF HAVEN
// ===========================================================================
const PRICE = { common: 3, uncommon: 6, rare: 10, mythic: 18 };
const SHOP_STOCK = ALL_HERO_CARDS.filter(c => ['uncommon', 'rare', 'mythic'].includes(c.rarity)).slice(0, 60);

function renderShop() {
  document.getElementById('shop-saga').textContent = save.saga;
  const grid = document.getElementById('shop-grid');
  grid.innerHTML = '';
  const stocked = SHOP_STOCK.filter(c => ownedCount(c.id) === 0 || c.rarity === 'mythic').slice(0, 24);
  for (const c of stocked) {
    const price = PRICE[c.rarity] || 6;
    const item = el('div', 'shop-item');
    item.innerHTML = `<h5>${c.name}</h5><p>${c.txt || c.flavour || ''}</p>
      <div class="shop-price">${price} Saga · ${c.rarity}</div>`;
    const btn = el('button', 'btn', ownedCount(c.id) ? `Buy another copy (own ${ownedCount(c.id)})` : 'Buy');
    btn.disabled = save.saga < price;
    btn.onclick = () => {
      if (save.saga < price) { toast('You cannot afford that. The Guild is sympathetic but not generous.'); return; }
      save.saga -= price; grant(c.id); renderShop();
      toast(`${c.name} enters your collection.`);
    };
    item.appendChild(btn);
    item.appendChild(renderCard(c, { size: 'small' }));
    grid.appendChild(item);
  }
}

// ===========================================================================
// QUICK PLAY
// ===========================================================================
const ENEMIES = [
  { key: 'tyrant', name: 'The Iron Census', leader: 'Warlord Kurrash the Boreal', faction: 'Tyrant' },
  { key: 'fallen', name: 'The Fallen Tide', leader: 'Crypt Lord Athra', faction: 'Fallen' },
  { key: 'void', name: 'The Unwriting', leader: 'Devourer of Names', faction: 'Void' },
];
let quickPick = { nation: 'avereaux', enemy: 'tyrant', difficulty: 2, owned: true };

function renderQuick() {
  const nat = document.getElementById('quick-nations');
  nat.innerHTML = '';
  for (const key of Object.keys(DECKS).filter(k => (DECKS[k].nation || '') !== 'corrupted')) {
    const n = NATIONS[key] || { name: key };
    const b = el('button', 'nation-card' + (quickPick.nation === key ? ' sel' : ''),
      `<h5>${n.name}</h5><p>${n.blurb || ''}</p>`);
    b.onclick = () => { quickPick.nation = key; renderQuick(); };
    nat.appendChild(b);
  }
  const en = document.getElementById('quick-enemies');
  en.innerHTML = '';
  for (const e of ENEMIES) {
    const b = el('button', 'nation-card' + (quickPick.enemy === e.key ? ' sel' : ''),
      `<h5>${e.leader}</h5><p>${e.name} — ${e.faction}. Difficulty ${e.key === 'void' ? 3 : 2}.</p>`);
    b.onclick = () => { quickPick.enemy = e.key; renderQuick(); };
    en.appendChild(b);
  }
  const start = document.getElementById('quick-start');
  start.disabled = false;
  start.onclick = () => {
    const owned = document.getElementById('quick-owned').checked;
    startDuel({
      mode: 'quick',
      opponent: { name: (ENEMIES.find(e => e.key === quickPick.enemy) || {}).leader || 'The Corrupted', deck: quickPick.enemy, difficulty: quickPick.enemy === 'void' ? 3 : 2, portrait: quickPick.enemy },
      playerDeck: owned && save.deck.length >= 40 ? save.deck : DECKS[quickPick.nation].list,
      playerName: (NATIONS[quickPick.nation] || {}).name,
      playerNation: quickPick.nation,
    });
  };
}

// ===========================================================================
// RULES
// ===========================================================================
function renderRules() {
  const box = document.getElementById('rules-body');
  box.innerHTML = `
    <div class="panel">
      <h4>The aim</h4>
      <p class="hint">Reduce your opponent&rsquo;s <b>Resolve</b> from 20 to zero. That is the whole of it —
      everything else is ways of doing it that Elandra will write poems about.</p>
      <h4>The four phases of a turn</h4>
      <ul>
        <li><b>Rally</b> — your leylines and heroes ready; you draw one card.</li>
        <li><b>Main</b> — lay one Leyline, attune your leylines for mana, call heroes, set down relics,
        work Rites and Weavings.</li>
        <li><b>Clash</b> — declare attackers. The defender assigns blockers. Then a reaction window opens
        where both players may play <b>Cantrips</b>. Then damage lands: unblocked attackers take Resolve
        straight off the opponent.</li>
        <li><b>End</b> — temporary blessings expire. Mana is wiped. The turn passes.</li>
      </ul>
      <h4>The five spheres and the Wyrd</h4>
      <p class="hint">${['fire', 'earth', 'water', 'wind', 'spirit', 'wyrd'].map(s => `<b style="color:${SPHERE_INFO[s].colour}">${SPHERE_INFO[s].name}</b> — ${SPHERE_INFO[s].blurb}`).join('<br>')}
      <br><br>Leylines give one mana when attuned. <b>Wyrd</b> pays for anything. Coloured mana pays only
      for its own colour, which is why a two-nation deck is a commitment.</p>
      <h4>Menhirs &amp; Weavings</h4>
      <p class="hint">A <b>Menhir</b> under your command is the standing stone that lets you weave. Without one
      you cannot cast <b>Weavings</b> — the great workings that decide duels. Menhirs are expensive, they are
      the first thing a competent opponent kills, and no campaign was ever won without one.</p>
      <h4>Boon counters</h4>
      <p class="hint">Many effects add <b>Boon counters</b> to a hero. Each counter is +1/+1 permanently —
      a hero that survives three clashes is a different creature to the one that arrived.</p>
    </div>
    <div class="panel">
      <h4>Keyword calls</h4>
      <ul>${Object.entries(KEYWORDS).map(([k, v]) => `<li><b>${v.name}</b> — ${v.text}</li>`).join('')}</ul>
    </div>
    <div class="panel">
      <h4>The nine nations &amp; the realms</h4>
      <ul>${Object.entries(REALMS).map(([r, v]) => `<li><b style="color:${v.colour}">${r}</b> — ${v.nations.map(n => (NATIONS[n] || { name: n }).name).join(', ')}</li>`).join('')}</ul>
      <p class="hint">Every nation plays to its own temperament: Avereaux builds legends that grow, The Wonder
      tricks and flies, Valdraeth swings, Syradonia endures behind Guardians, Morvalis recurses out of its own
      graveyard, Kairos grows tall, the Urdrevan is fast and feral, Portavas is clever and evasive, and
      Hammerstadt builds relics that make everything else better.</p>
    </div>
    <div class="panel">
      <h4>Terms &amp; small print</h4>
      <ul>
        <li><b>Resolve</b> — your life total.</li>
        <li><b>Might / Vigil</b> — a hero&rsquo;s power and its endurance.</li>
        <li><b>Attuning</b> — spending a leyline for one mana; it readies again next Rally.</li>
        <li><b>Arrival sickness</b> — a hero cannot attack the turn it arrives unless it has <b>Swift</b>.</li>
        <li><b>Fated</b> — the Void&rsquo;s cruelty: any damage at all fells a hero.</li>
      </ul>
    </div>`;
}

// ---------------------------------------------------------------------------
// wire lobby/quick/pvp
// ---------------------------------------------------------------------------
export function onDuelFinished(result) {
  // result: { win, chapter, choice, mode, opponent }
  if (result.mode === 'pvp') return;
  if (result.win) {
    save.wins = (save.wins || 0) + 1;
    if (result.mode === 'campaign' && result.chapter) {
      const ch = result.chapter;
      if (!save.clears.includes(ch.id)) save.clears.push(ch.id);
      const nextIdx = CHAPTER_ORDER.indexOf(ch.id) + 1;
      save.chapter = CHAPTER_ORDER[nextIdx] || ch.id;
      addSaga(8);
      offerRewards(ch, result);
    } else {
      addSaga(3); persist();
    }
  } else {
    save.losses = (save.losses || 0) + 1; addSaga(1);
  }
  persist();
}

function offerRewards(ch, result) {
  const layer = document.getElementById('modal-layer');
  layer.classList.add('on');
  let picked = null;
  const render = () => {
    layer.innerHTML = '';
    const m = el('div', 'modal');
    const opt = ch.choice && ch.choice.options.find(o => o.id === result.choice);
    m.innerHTML = `<h3>${ch.title} — reclaimed</h3>
      <p>${opt ? `Your choice: <b>${opt.label}</b>. ` : ''}The Corrupted withdraw. Haven
      counts its dead and its grams and finds the totals survivable.</p>
      <p class="hint">${ch.rewardNote || ''} Take <b>one</b> into your collection, and eight Saga into your purse.</p>`;
    const grid = el('div', 'reward-grid');
    for (const id of ch.rewards) {
      const c = CARD_BY_ID[id]; if (!c) continue;
      const o = el('div', 'reward-opt' + (picked === id ? ' sel' : ''));
      o.appendChild(renderCard(c, { size: 'small' }));
      o.appendChild(el('div', 'nm', c.name));
      o.onclick = () => { picked = id; render(); };
      grid.appendChild(o);
    }
    m.appendChild(grid);
    const row = el('div', 'row center');
    const take = el('button', 'btn big gold', 'Take it, and add it to my deck');
    take.disabled = !picked;
    take.onclick = () => {
      grant(picked); save.saga += 8; persist();
      layer.classList.remove('on'); layer.innerHTML = '';
      show('map'); renderMap(); renderHome();
    };
    const skip = el('button', 'btn', 'Take none — the holding of it is enough');
    skip.onclick = () => { save.saga += 8; persist(); layer.classList.remove('on'); layer.innerHTML = ''; show('map'); renderMap(); renderHome(); };
    row.appendChild(take); row.appendChild(skip);
    m.appendChild(row);
    layer.appendChild(m);
  };
  render();
}

// boot -----------------------------------------------------------------------
onDuelEnd((r) => onDuelFinished(r));
renderHome();
show('home');
window.MF = { save, resetSave, CARDS, CARD_BY_ID, startDuel, startPvpBattle };
