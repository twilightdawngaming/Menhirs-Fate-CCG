import { mk } from './schema.js';

// ---------------------------------------------------------------------------
// LEYLINES — the land-equivalents of Elandra. A leyline is played from hand for
// no cost (one per Rally unless a card says otherwise) and yields one sphere of
// mana when attuned.  Characters "attune" their leylines once per turn.
// ---------------------------------------------------------------------------

const L = (id, n, sp, produce, kind, fl, rarity) => mk({
  id, n, sp: [sp], cost: {}, type: 'leyline', kind: 'Leyline — ' + produce,
  txt: 'Attune: add one ' + produce + ' mana.',
  flavour: fl || '', rarity: rarity || 'common',
  abilities: [{ static: 'mana', produce: [sp] }],
});

export const LEYLINES = [
  // --- the five basic leylines -------------------------------------------------
  L('ley-ember', 'Ember Leyline', 'fire', 'Fire', 'Ashfall',
    'Where the Crowned burned the orchard, the ground still remembers heat.'),
  L('ley-stone', 'Stone Leyline', 'earth', 'Earth', 'Deepstone',
    'Syradonian delvers cut these channels before the nations had names.'),
  L('ley-tide', 'Tide Leyline', 'water', 'Water', 'Pearl Shallows',
    'The tide arrives, the tide withdraws; Portavas plans around both.'),
  L('ley-gale', 'Gale Leyline', 'wind', 'Wind', 'Highreach',
    'The Wonder\u2019s breezes carry rumours, and sometimes the rumours are true.'),
  L('ley-soul', 'Soul Leyline', 'spirit', 'Spirit', 'Hallowed Ground',
    'Every deed done here is written down somewhere. Avereaux sees to it.'),

  // --- wild wyrd ---------------------------------------------------------------
  mk({
    id: 'ley-wild', n: 'Wild Leyline', sp: ['wyrd'], cost: {}, type: 'leyline',
    kind: 'Leyline — Wyrd', rarity: 'common',
    txt: 'Attune: add one Wyrd mana (pays for anything).',
    flavour: 'Fate, unbound. It pays for sins of every colour.',
    abilities: [{ static: 'mana', produce: ['wyrd'] }],
  }),

  // --- dual leylines -----------------------------------------------------------
  mk({
    id: 'ley-cinderfall', n: 'Cinderfall Leyline', sp: ['fire', 'spirit'], cost: {},
    type: 'leyline', kind: 'Leyline — Fire or Spirit', rarity: 'uncommon',
    txt: 'Attune: add one Fire or one Spirit mana. Arrives attuned only if you command another Leyline.',
    flavour: 'Valdraeth keeps its dead where the fire can find them.',
    abilities: [{ static: 'mana', produce: ['fire', 'spirit'] }],
  }),
  mk({
    id: 'ley-undermarket', n: 'Undermarket Leyline', sp: ['earth', 'fire'], cost: {},
    type: 'leyline', kind: 'Leyline — Earth or Fire', rarity: 'uncommon',
    txt: 'Attune: add one Earth or one Fire mana.',
    flavour: 'Four Orders, one bazaar, no receipts.',
    abilities: [{ static: 'mana', produce: ['earth', 'fire'] }],
  }),
  mk({
    id: 'ley-pearlshallow', n: 'Pearl-Shallow Leyline', sp: ['water', 'wind'], cost: {},
    type: 'leyline', kind: 'Leyline — Water or Wind', rarity: 'uncommon',
    txt: 'Attune: add one Water or one Wind mana.',
    flavour: 'The Republic\u2019s debt is written in the language of tides.',
    abilities: [{ static: 'mana', produce: ['water', 'wind'] }],
  }),
  mk({
    id: 'ley-kingsroad', n: 'The King\u2019s Road', sp: ['spirit', 'wind'], cost: {},
    type: 'leyline', kind: 'Leyline — Spirit or Wind', rarity: 'uncommon',
    txt: 'Attune: add one Spirit or one Wind mana.',
    flavour: 'Nine nations paved it. None of them can agree who owns it.',
    abilities: [{ static: 'mana', produce: ['spirit', 'wind'] }],
  }),
  mk({
    id: 'ley-glimmerwood', n: 'Glimmerwood Leyline', sp: ['wind', 'wyrd'], cost: {},
    type: 'leyline', kind: 'Leyline — Wind or Wyrd', rarity: 'uncommon',
    txt: 'Attune: add one Wind or one Wyrd mana.',
    flavour: 'The Wonder does not keep maps. It keeps promises.',
    abilities: [{ static: 'mana', produce: ['wind', 'wyrd'] }],
  }),
  mk({
    id: 'ley-ossuary', n: 'Ossuary Leyline', sp: ['spirit', 'wyrd'], cost: {},
    type: 'leyline', kind: 'Leyline — Spirit or Wyrd', rarity: 'uncommon',
    txt: 'Attune: add one Spirit or one Wyrd mana.',
    flavour: 'Morvalis calls it a library. The books have teeth.',
    abilities: [{ static: 'mana', produce: ['spirit', 'wyrd'] }],
  }),
  mk({
    id: 'ley-deepstone', n: 'Deepstone Leyline', sp: ['earth', 'spirit'], cost: {},
    type: 'leyline', kind: 'Leyline — Earth or Spirit', rarity: 'uncommon',
    txt: 'Attune: add one Earth or one Spirit mana.',
    flavour: 'The Orders chant as they dig. The stone answers kindly.',
    abilities: [{ static: 'mana', produce: ['earth', 'spirit'] }],
  }),
  mk({
    id: 'ley-kolossi', n: 'Kolossi Leyline', sp: ['earth', 'water'], cost: {},
    type: 'leyline', kind: 'Leyline — Earth or Water', rarity: 'uncommon',
    txt: 'Attune: add one Earth or one Water mana.',
    flavour: 'Kairos builds its heroes out of the very best marble.',
    abilities: [{ static: 'mana', produce: ['earth', 'water'] }],
  }),
  mk({
    id: 'ley-anvil', n: 'Anvil Ward Leyline', sp: ['fire', 'earth'], cost: {},
    type: 'leyline', kind: 'Leyline — Fire or Earth', rarity: 'uncommon',
    txt: 'Attune: add one Fire or one Earth mana.',
    flavour: 'Hammerstadt: thirty forges, one shift bell, no idle hands.',
    abilities: [{ static: 'mana', produce: ['fire', 'earth'] }],
  }),
  mk({
    id: 'ley-wildreach', n: 'Wildreach Leyline', sp: ['earth', 'fire'], cost: {},
    type: 'leyline', kind: 'Leyline — Earth or Fire', rarity: 'uncommon',
    txt: 'Attune: add one Earth or one Fire mana.',
    flavour: 'The Urdrevan plant nothing. Everything grows anyway.',
    abilities: [{ static: 'mana', produce: ['earth', 'fire'] }],
  }),
  mk({
    id: 'ley-haven', n: 'Haven Crossroads', sp: ['wyrd'], cost: {}, type: 'leyline',
    kind: 'Leyline — Any Sphere', rarity: 'rare',
    txt: 'Attune: add one mana of any sphere. Arrives with one Boon counter on it for every Leyline that has entered your field this duel.',
    flavour: 'The Gods made one field where every road of Elandra meets.',
    abilities: [
      { static: 'mana', produce: ['fire', 'earth', 'water', 'wind', 'spirit', 'wyrd'] },
      { trigger: 'etb', effects: [{ type: 'selfCounters', kind: 'boon', amountFrom: 'leylinesThisDuel' }] },
    ],
  }),
];
