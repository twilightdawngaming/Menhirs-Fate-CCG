// ---------------------------------------------------------------------------
// cardview.js — builds a card element from a card definition or a live instance
// ---------------------------------------------------------------------------
import { NATIONS, SPHERE_INFO, KEYWORD_ICON } from '/src/engine/cards/index.js';
import { cardArtSVG, SPHERE_COLOUR } from './art.js';

const pip = (colour, label, title) =>
  `<span class="cost-pip" style="background:${colour}" title="${title || ''}">${label}</span>`;

export function costPips(card) {
  const c = card.cost || {};
  let out = '';
  for (const sp of ['fire', 'earth', 'water', 'wind', 'spirit', 'wyrd']) {
    const n = c[sp] || 0;
    for (let i = 0; i < n; i++) out += pip(SPHERE_COLOUR[sp], SPHERE_INFO[sp].rune, SPHERE_INFO[sp].name);
  }
  if (c.gen) out += pip('#9aa79f', String(c.gen), 'Any sphere');
  if (!out) out = pip('#3f4f48', '0', 'Free');
  return out;
}

export function typeLine(card) {
  const nat = (NATIONS[card.nation] || NATIONS.neutral).name;
  if (card.type === 'hero') return `Hero — ${nat}`;
  const t = { leyline: 'Leyline', cantrip: 'Cantrip', rite: 'Rite', weaving: 'Weaving', weavemark: 'Weavemark', relic: 'Relic' }[card.type] || card.type;
  return card.type === 'leyline' ? `${t} — ${card.spheres.map(s => SPHERE_INFO[s].name).join(' or ')}` : `${t} — ${nat}`;
}

// ---------------------------------------------------------------------------
export function renderCard(card, opts = {}) {
  const el = document.createElement('div');
  el.className = 'card' + (opts.size ? ' ' + opts.size : '') + (card.token ? ' token-vis' : '');
  const nat = NATIONS[card.nation] || NATIONS.neutral;
  el.style.borderColor = card.nation === 'corrupted' ? '#6d2b3c' : nat.colour + '99';
  if (card.uid != null) el.dataset.uid = card.uid;
  el.dataset.cardId = card.id;
  el.title = card.name;

  const kws = (card.keywords || card.kw || []);
  const kwIcons = kws.slice(0, 4).map(k => `<span title="${k}">${KEYWORD_ICON[k] || '✦'}</span>`).join(' ');
  const counters = card.counters && card.counters.boon ? card.counters.boon : 0;

  el.innerHTML = `
    <div class="frame-top" style="background:linear-gradient(90deg,${nat.colour},${nat.colour}22)"></div>
    <div class="c-head">
      <div class="c-name">${esc(card.name)}</div>
      <div class="c-cost">${costPips(card)}</div>
    </div>
    <div class="c-art">${cardArtSVG(card)}</div>
    <div class="c-type">${esc(typeLine(card))}</div>
    <div class="c-text">${esc(card.txt != null ? card.txt : (card.text || ''))}</div>
    <div class="c-foot">
      <div class="kws">${kwIcons}</div>
      ${card.type === 'hero'
        ? `<div class="stats"><div class="stat pow">${opts.power != null ? opts.power : card.might}</div><div class="stat vig">${opts.vigil != null ? opts.vigil : card.vigil}</div></div>`
        : `<div class="stats">${card.type === 'relic' ? '<div class="stat">◈</div>' : ''}</div>`}
    </div>
    ${counters ? `<div class="counter-badge">${counters}</div>` : ''}
    ${card.dmg ? `<div class="dmg-badge">${card.dmg}</div>` : ''}
  `;
  return el;
}

export function hiddenCard() {
  const el = document.createElement('div');
  el.className = 'card small hidden-card';
  el.innerHTML = `<div class="frame-top" style="background:#2b3d36"></div>
    <div class="c-head"><div class="c-name" style="opacity:.5">Unknown</div></div>
    <div class="c-art" style="background:repeating-linear-gradient(45deg,#17231f 0 6px,#131c19 6px 12px);border:none"></div>
    <div class="c-type" style="opacity:.5">Unknown</div>
    <div class="c-text" style="opacity:.4">A card held by your opponent.</div>`;
  return el;
}

export function cardMetaLine(card) {
  const bits = [];
  if (card.might != null) bits.push(`${card.might}/${card.vigil}`);
  bits.push((NATIONS[card.nation] || NATIONS.neutral).name);
  bits.push(card.rarity);
  return bits.join(' · ');
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

export { cardArtSVG };
