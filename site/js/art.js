// ---------------------------------------------------------------------------
// art.js — heraldic card art, generated as inline SVG (no external images).
// ---------------------------------------------------------------------------
import { NATIONS } from '../src/engine/cards/index.js';

export const SPHERE_COLOUR = {
  fire: '#c8452b', earth: '#4f7a3a', water: '#2b6ea8',
  wind: '#3f8f86', spirit: '#8e7ab5', wyrd: '#9a7b3f',
};
export const SPHERE_GLYPH = { fire: '▲', earth: '■', water: '▼', wind: '◆', spirit: '✦', wyrd: '✹' };

// --- charges (heraldic symbols), drawn in a 60×60 box -----------------------
const CHARGE = {
  book: `<path d="M8 16c8-4 14-4 22 0v30c-8-4-14-4-22 0z"/><path d="M52 16c-8-4-14-4-22 0v30c8-4 14-4 22 0z"/>
    <path d="M30 17v29" stroke-width="1.4" stroke="#0d1412" fill="none"/>`,
  feather: `<path d="M30 6c10 10 14 22 12 34-2 10-8 14-12 14-4 0-10-4-12-14-2-12 2-24 12-34z"/>
    <path d="M30 10v44" stroke-width="1.6" stroke="#0d1412" fill="none"/>`,
  wolf: `<path d="M12 22l6-12 10 8h4l10-8 6 12-4 10c0 10-6 20-14 22-8-2-14-12-14-22z"/>
    <circle cx="23" cy="30" r="2.4" fill="#0d1412"/><circle cx="37" cy="30" r="2.4" fill="#0d1412"/>
    <path d="M26 42h8l-4 5z" fill="#0d1412"/>`,
  lantern: `<path d="M22 14h16v-4H22zM18 18h24l3 32H15z"/><path d="M30 22v22" stroke-width="1.4" stroke="#0d1412" fill="none"/>
    <path d="M30 6v6" stroke-width="2" stroke="#0d1412"/>`,
  chalice: `<path d="M14 12h32c0 14-7 22-16 22s-16-8-16-22z"/><path d="M28 34h4v14h-4z"/><path d="M18 52h24v5H18z"/>`,
  column: `<path d="M14 14h32v5H14zM18 19h24v4H18zM20 23h20v24H20zM14 47h32v5H14z"/>
    <path d="M24 26v18M30 26v18M36 26v18" stroke-width="1.2" stroke="#0d1412" fill="none"/>`,
  antler: `<path d="M30 54c0-14-1-22-4-30M30 54c0-14 1-22 4-30M26 30c-6-2-10-6-12-12M34 30c6-2 10-6 12-12
    M22 20c-4 0-7-2-9-5M38 20c4 0 7-2 9-5" stroke-width="4.2" fill="none" stroke-linecap="round"/>`,
  trident: `<path d="M30 6v48" stroke-width="4" fill="none"/><path d="M14 8c0 12 6 18 16 18s16-6 16-18" stroke-width="4" fill="none"/>
    <path d="M12 8h5M28 8h5M45 8h5" stroke-width="4"/><path d="M24 54h12v5H24z"/>`,
  anvil: `<path d="M10 22h30c4 0 8 2 10 6l-8 4H10z"/><path d="M22 32h16l-2 10H24z"/><path d="M16 44h28v8H16z"/>`,
  eye: `<path d="M6 30c8-12 16-18 24-18s16 6 24 18c-8 12-16 18-24 18S14 42 6 30z"/>
    <circle cx="30" cy="30" r="8" fill="#0d1412"/><circle cx="30" cy="30" r="3" fill="#c8452b"/>`,
  menhir: `<path d="M24 8h12l4 38H20z"/><path d="M14 46h32v6H14z"/><path d="M10 52c4-4 10-4 14 0M36 52c4-4 10-4 14 0" stroke-width="2" fill="none"/>`,
  wave: `<path d="M6 26c6-8 12-8 18 0s12 8 18 0 8-6 12-2" stroke-width="4" fill="none"/>
    <path d="M6 40c6-8 12-8 18 0s12 8 18 0 8-6 12-2" stroke-width="4" fill="none" opacity=".7"/>`,
  flame: `<path d="M30 4c8 12 16 18 16 30 0 10-7 18-16 18s-16-8-16-18C14 22 22 16 30 4z"/>
    <path d="M30 24c4 6 7 9 7 15 0 5-3 9-7 9s-7-4-7-9c0-6 3-9 7-15z" fill="#0d1412" opacity=".5"/>`,
  star: `<path d="M30 4l7 18 19 2-14 13 4 19-16-10-16 10 4-19L4 24l19-2z"/>`,
  knot: `<path d="M30 8c10 0 18 8 18 18s-8 18-18 18-18-8-18-18 8-18 18-18z" fill="none" stroke-width="5"/>
    <path d="M30 14c7 0 12 5 12 12s-5 12-12 12-12-5-12-12 5-12 12-12z" fill="none" stroke-width="3" opacity=".7"/>
    <path d="M14 42c8 6 24 6 32 0" fill="none" stroke-width="4"/>`,
  runner: `<circle cx="30" cy="10" r="6"/><path d="M30 16v20M30 20l-12 8M30 20l12 6M30 36l-10 16M30 36l9 16" stroke-width="4.4" fill="none" stroke-linecap="round"/>`,
  shield: `<path d="M30 6l22 8v18c0 14-9 24-22 30C17 56 8 46 8 32V14z"/>`,
};

// which charge suits which card
export function chargeFor(card) {
  const n = card.nation;
  if (card.type === 'leyline') return card.spheres[0] === 'fire' ? 'flame'
    : card.spheres[0] === 'earth' ? 'menhir' : card.spheres[0] === 'water' ? 'wave'
    : card.spheres[0] === 'wind' ? 'feather' : card.spheres[0] === 'spirit' ? 'star' : 'knot';
  if (n === 'avereaux') return card.type === 'hero' ? 'book' : 'star';
  if (n === 'wonder') return 'feather';
  if (n === 'valdraeth') return 'wolf';
  if (n === 'syradonia') return card.type === 'hero' ? 'lantern' : 'column';
  if (n === 'morvalis') return 'chalice';
  if (n === 'kairos') return card.type === 'hero' ? 'column' : 'star';
  if (n === 'urdrevan') return card.type === 'hero' ? 'antler' : 'wolf';
  if (n === 'portavas') return card.type === 'hero' ? 'trident' : 'wave';
  if (n === 'hammerstadt') return card.type === 'hero' ? 'anvil' : 'flame';
  if (n === 'corrupted') {
    if (card.power === 'void') return 'eye';
    if (card.power === 'fallen') return 'chalice';
    return 'flame';
  }
  if (card.type === 'weaving') return 'knot';
  if (card.type === 'rite') return 'star';
  if (card.type === 'cantrip') return 'flame';
  if (card.type === 'relic') return 'menhir';
  if (card.type === 'hero' && (card.keywords || []).includes('soaring')) return 'feather';
  return 'menhir';
}

const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); };
const shade = (hex, amt) => {
  const c = hex.replace('#', ''); const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
};

// ---------------------------------------------------------------------------
export function cardArtSVG(card) {
  const nat = NATIONS[card.nation] || NATIONS.neutral;
  const base = card.nation === 'corrupted' && card.power === 'void' ? '#5a3f7a'
    : card.nation === 'corrupted' && card.power === 'fallen' ? '#6b3446'
    : card.nation === 'corrupted' ? '#8a3a2a' : nat.colour;
  const sp = SPHERE_COLOUR[card.spheres[0]] || base;
  const h = hash(card.id);
  const variant = h % 3;
  const charge = CHARGE[chargeFor(card)] || CHARGE.menhir;
  const uid = 'g' + h.toString(36);
  const isSpell = ['cantrip', 'rite', 'weaving'].includes(card.type);
  const isLey = card.type === 'leyline';
  const isRelic = card.type === 'relic';

  const sky = `<linearGradient id="${uid}a" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${shade(base, -58)}"/><stop offset="60%" stop-color="${shade(base, -34)}"/>
      <stop offset="100%" stop-color="#0a1210"/></linearGradient>`;
  const glow = `<radialGradient id="${uid}b" cx="50%" cy="${40 + variant * 6}%" r="62%">
      <stop offset="0%" stop-color="${sp}" stop-opacity=".55"/><stop offset="100%" stop-color="${sp}" stop-opacity="0"/></radialGradient>`;

  const figure = card.type === 'hero' && !isLey ? `
    <g opacity=".28" fill="#06100d">
      <ellipse cx="100" cy="100" rx="26" ry="7"/>
      <path d="M86 100c-2-22 2-38 8-46 4-6 8-8 12-8s8 2 12 8c6 8 10 24 8 46z"/>
      <circle cx="106" cy="38" r="10"/>
      <path d="M92 60l-16 22 6 4 14-18zM120 60l16 22-6 4-14-18z"/>
    </g>` : '';
  const stand = isLey ? `
    <g opacity=".5" fill="#08110f">
      <path d="M0 96c40-10 70-8 100-2s60 6 100-2v30H0z"/>
      <path d="M60 40l7 54H53zM120 58l6 36h-12z" opacity=".8"/>
    </g>` : '';
  const cracks = card.nation === 'corrupted' ? `
    <g stroke="${shade(base, 60)}" stroke-width="1.1" opacity=".5" fill="none">
      <path d="M0 ${78 + variant * 6} L40 ${70 + variant * 4} L70 ${82} L120 ${72} L170 ${86} L200 ${78}"/>
      <path d="M30 ${92} L58 ${84} L96 ${94}"/>
    </g>` : '';
  const moons = variant === 0
    ? `<circle cx="${160 - variant * 20}" cy="30" r="15" fill="${shade(sp, 40)}" opacity=".22"/>`
    : variant === 1
      ? `<g opacity=".22" fill="${shade(sp, 40)}"><circle cx="40" cy="28" r="12"/><circle cx="160" cy="34" r="9"/></g>`
      : `<path d="M150 14l6 16 17 2-13 12 3 17-13-9-13 9 3-17-13-12 17-2z" fill="${shade(sp, 40)}" opacity=".18"/>`;

  const shield = card.type === 'hero'
    ? `<path d="M100 34l30 10v24c0 20-12 34-30 42-18-8-30-22-30-42V44z" fill="#0e1a16" stroke="${shade(sp, 30)}" stroke-width="2" opacity=".92"/>`
    : isSpell
      ? `<circle cx="100" cy="70" r="42" fill="none" stroke="${shade(sp, 40)}" stroke-width="1.4" opacity=".7"/>
         <circle cx="100" cy="70" r="34" fill="none" stroke="${shade(sp, 20)}" stroke-width="1" opacity=".45" stroke-dasharray="3 5"/>`
      : isRelic
        ? `<rect x="72" y="34" width="56" height="70" rx="6" fill="#0e1a16" stroke="${shade(sp, 30)}" stroke-width="1.6" opacity=".9"/>`
        : '';

  const scale = card.type === 'hero' ? 0.72 : 0.86;
  const cx = 100, cy = card.type === 'hero' ? 72 : 70;

  return `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>${sky}${glow}</defs>
  <rect width="200" height="140" fill="url(#${uid}a)"/>
  <rect width="200" height="140" fill="url(#${uid}b)"/>
  ${moons}
  <ellipse cx="60" cy="118" rx="130" ry="26" fill="#0a1210" opacity=".55"/>
  <ellipse cx="150" cy="126" rx="120" ry="22" fill="#081009" opacity=".5"/>
  ${stand}${figure}${cracks}
  ${shield}
  <g transform="translate(${cx - 30 * scale},${cy - 30 * scale}) scale(${scale})" fill="${shade(sp, 34)}" opacity=".96">${charge}</g>
  <g opacity=".16" stroke="${shade(base, 70)}" stroke-width="1">
    <path d="M0 0h200M0 10h200M0 24h200" opacity=".5"/>
  </g>
  <rect width="200" height="140" fill="none" stroke="rgba(0,0,0,.5)" stroke-width="2"/>
</svg>`;
}
