// ---------------------------------------------------------------------------
// store.js — persisted player state, screen routing, toasts
// ---------------------------------------------------------------------------
import { STARTER_DECK } from '../src/content/decks.js';

const KEY = 'menhirs-fate-save-v3';

const countUp = (list) => { const m = {}; for (const id of list) m[id] = (m[id] || 0) + 1; return m; };

const FRESH = () => ({
  collection: countUp(STARTER_DECK),      // id -> how many copies you own
  deck: [...STARTER_DECK],
  clears: [],            // chapter ids beaten
  chapter: 'prologue',
  flags: {},
  saga: 0,
  pvpDeck: null,
  wins: 0, losses: 0,
});

export let save = (() => {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem('menhirs-fate-save-v2');
    if (!raw) return FRESH();
    const parsed = JSON.parse(raw);
    // migrate an older array-based collection into copy counts
    if (Array.isArray(parsed.collection)) parsed.collection = countUp(parsed.collection);
    return { ...FRESH(), ...parsed };
  } catch (e) { return FRESH(); }
})();

export const ownedCount = (id) => save.collection[id] || 0;

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ }
}
export function resetSave() { save = FRESH(); persist(); }

export function grant(cardId, { toDeck = true, copies = 1 } = {}) {
  save.collection[cardId] = (save.collection[cardId] || 0) + copies;
  if (toDeck && save.deck.length < 60) save.deck.push(cardId);
  persist();
}

export function addSaga(n) { save.saga += n; persist(); }

// ---------------------------------------------------------------------------
export function show(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + screenId);
  if (el) el.classList.add('active');
  document.dispatchEvent(new CustomEvent('screen', { detail: screenId }));
}

let toastTimer = null;
export function toast(msg, ms = 2600) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}

export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
