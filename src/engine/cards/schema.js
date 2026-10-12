// ---------------------------------------------------------------------------
// Menhirs Fate: Weavers of Elandra — card schema + helpers
// ---------------------------------------------------------------------------
// Every card is a plain object so that it can be serialised across the wire and
// interpreted by both the browser client and the authoritative Node server.

export const SPHERES = ['fire', 'earth', 'water', 'wind', 'spirit', 'wyrd'];

export const SPHERE_INFO = {
  fire:   { name: 'Fire',   colour: '#c8452b', glow: '#ff8a5c', rune: '\u25B2', glyph: 'flame',
            blurb: 'Passion, forge-craft and fury.' },
  earth:  { name: 'Earth',  colour: '#4f7a3a', glow: '#a8d47a', rune: '\u25A0', glyph: 'stone',
            blurb: 'Endurance, stone and the slow deep roots.' },
  water:  { name: 'Water',  colour: '#2b6ea8', glow: '#6fc3f0', rune: '\u25BC', glyph: 'wave',
            blurb: 'Tide, trade and the patience of the sea.' },
  wind:   { name: 'Wind',   colour: '#3f8f86', glow: '#84e3d3', rune: '\u25C6', glyph: 'feather',
            blurb: 'Whim, whisper and the swift unfettered.' },
  spirit: { name: 'Spirit', colour: '#8e7ab5', glow: '#d6c2ff', rune: '\u2726', glyph: 'star',
            blurb: 'Memory, oath, legacy and the gods above.' },
  wyrd:   { name: 'Wyrd',   colour: '#9a7b3f', glow: '#f2d492', rune: '\u2739', glyph: 'knot',
            blurb: 'The wild fate that was never written. Pays for anything.' },
};

export const TYPES = {
  leyline:   { name: 'Leyline',  line: 'Leyline' },
  cantrip:   { name: 'Cantrip',  line: 'Cantrip' },
  rite:      { name: 'Rite',     line: 'Rite' },
  weaving:   { name: 'Weaving',  line: 'Weaving' },
  weavemark: { name: 'Weavemark',line: 'Weavemark' },
  relic:     { name: 'Relic',    line: 'Relic' },
  hero:      { name: 'Hero',     line: 'Hero' },
};

// Keyword glossary — used by the engine, the rules panel and the card renderer.
export const KEYWORDS = {
  guardian:  { name: 'Guardian',    text: 'Creatures your foes command must block this hero if able, and it may block Soaring heroes.' },
  swift:     { name: 'Swift',       text: 'This hero may attack the turn it arrives.' },
  soaring:   { name: 'Soaring',     text: 'Can only be blocked by heroes with Soaring or Anchor.' },
  duelist:   { name: 'Duelist',     text: 'Strikes first in a clash.' },
  overrun:   { name: 'Overrun',     text: 'Excess combat damage rolls over onto the defender\u2019s Resolve.' },
  anchor:    { name: 'Anchor',      text: 'May block heroes with Soaring.' },
  drain:     { name: 'Drain',       text: 'Damage dealt also restores that much Resolve to its controller.' },
  fated:     { name: 'Fated',       text: 'Any damage this deals to a hero is enough to fell it.' },
  unbreakable:{ name: 'Unbreakable',text: 'Cannot be destroyed by damage or by "destroy" effects.' },
  warded:    { name: 'Warded',      text: 'Cannot be chosen as the target of enemy Cantrips or Rites.' },
  renown:    { name: 'Renown',      text: 'Whenever this hero deals combat damage to a player, put a Boon counter on it.' },
  feral:     { name: 'Feral',       text: 'Must attack each Clash if able.' },
  chorus:    { name: 'Chorus',      text: 'When this hero falls, you may return a hero from your graveyard to your hand.' },
};

export const KEYWORD_ICON = {
  guardian: '\u26E8', swift: '\u27A4', soaring: '\u2708', duelist: '\u2694',
  overrun: '\u29C9', anchor: '\u2693', drain: '\u2665', fated: '\u2620',
  unbreakable: '\u25C9', warded: '\u2749', renown: '\u2605', feral: '\u26A1',
  chorus: '\u266A',
};

let AUTO_ID = 0;

// mk() normalises a card, filling in every default so card files stay terse.
export function mk(o) {
  const c = {
    id: o.id || ('x' + (AUTO_ID++)),
    name: o.n,
    nation: o.nation || 'neutral',
    spheres: o.sp || ['wyrd'],
    cost: o.cost || {},
    type: o.type || 'hero',
    kind: o.kind || '',
    might: o.might ?? null,
    vigil: o.vigil ?? null,
    keywords: o.kw || [],
    text: o.txt || '',
    abilities: o.ab || [],
    flavour: o.fl || '',
    rarity: o.rarity || 'common',
    token: !!o.token,
    unique: !!o.unique,
    art: o.art || null,
  };
  if (c.type === 'leyline') c.kind = c.kind || 'Leyline';
  if (!c.kind) c.kind = TYPES[c.type] ? TYPES[c.type].name : '';
  return c;
}

// Total converted cost (used by the AI and by mana-curve displays).
export function cmc(card) {
  return Object.values(card.cost || {}).reduce((a, b) => a + b, 0);
}

// Does a card's cost fit inside the available mana pool?
export function costFits(cost, pool) {
  const p = { ...pool };
  let generic = cost.gen || 0;
  for (const sp of SPHERES) {
    const need = cost[sp] || 0;
    if (!need) continue;
    const have = p[sp] || 0;
    const take = Math.min(need, have);
    p[sp] -= take;
    generic += need - take;                 // hoover up slack as generic
  }
  const wyrd = p.wyrd || 0;                 // Wyrd pays for anything
  const any = p._any || 0;                  // "any sphere" mana
  const total = generic - Math.min(generic, wyrd + any);
  if (total <= 0) return true;
  // remaining generic can be paid from leftover coloured mana
  let slack = 0;
  for (const sp of SPHERES) slack += Math.max(0, p[sp] || 0);
  return slack >= total;
}

export function costString(card) {
  const c = card.cost || {};
  const parts = [];
  if (c.gen) parts.push(String(c.gen));
  for (const sp of SPHERES) if (c[sp]) parts.push(`${c[sp]}${SPHERE_INFO[sp].name[0]}`);
  return parts.join(' ') || '0';
}
