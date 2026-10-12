import { LEYLINES } from './leylines.js';
import {
  HEROES_AVEREAUX, HEROES_WONDER, HEROES_VALDRAETH, HEROES_CROWN,
  HEROES_SYRADONIA, HEROES_MORVALIS, HEROES_KAIROS, HEROES_URDREVAN,
  HEROES_PORTAVAS, HEROES_HAMMERSTADT,
} from './heroes.js';
import { HEROES_CORRUPTED, HEROES_NEUTRAL, TOKENS } from './corrupted.js';
import { CANTRIPS, RITES, WEAVEMARKS, RELICS, MENHIRS, WEAVINGS } from './spells.js';

export const ALL_HERO_CARDS = [
  ...HEROES_AVEREAUX, ...HEROES_WONDER, ...HEROES_VALDRAETH, ...HEROES_SYRADONIA,
  ...HEROES_MORVALIS, ...HEROES_KAIROS, ...HEROES_URDREVAN, ...HEROES_PORTAVAS,
  ...HEROES_HAMMERSTADT, ...HEROES_CROWN, ...HEROES_NEUTRAL, ...HEROES_CORRUPTED,
];

export const ALL_SPELL_CARDS = [
  ...CANTRIPS, ...RITES, ...WEAVEMARKS, ...RELICS, ...MENHIRS, ...WEAVINGS,
];

// Every collectible card in the game.
export const CARDS = [...LEYLINES, ...ALL_HERO_CARDS, ...ALL_SPELL_CARDS];

export const CARD_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));
export const TOKEN_BY_ID = Object.fromEntries([...TOKENS, ...CARDS.filter(c => c.type === 'relic')].map(c => [c.id, c]));

export const NATIONS = {
  avereaux:     { name: 'Avereaux',            realm: 'The Crownlands',  colour: '#b8963f', sigil: 'book',
                  blurb: 'Life as a grand tale. Deeds are recorded for posterity; vanity is a virtue here.' },
  wonder:       { name: 'The Wonder',          realm: 'The Crownlands',  colour: '#4fae86', sigil: 'feather',
                  blurb: 'Enchanted hedgerows, talking animals, bargains, and a great deal of glitter.' },
  valdraeth:    { name: 'Valdraeth',           realm: 'The Crownlands',  colour: '#a8552f', sigil: 'wolf',
                  blurb: 'Volcanic ash-fields, wolf-herders, and a people who consider weather a personal insult.' },
  syradonia:    { name: 'Syradonia',           realm: 'The Sanctuaries', colour: '#7d7fa8', sigil: 'lantern',
                  blurb: 'A subterranean society of four Orders: War, Luxury, Stewardship and Faith.' },
  morvalis:     { name: 'Morvalis',            realm: 'The Sanctuaries', colour: '#8e4a72', sigil: 'chalice',
                  blurb: 'Gothic, passionate, and governed by the necromantic Houses of Dusk. Death is a career change.' },
  kairos:       { name: 'Kairos',              realm: 'The Sanctuaries', colour: '#3f8fb8', sigil: 'column',
                  blurb: 'Self-improvement as national policy. Heroes are immortalised as Kolossi.' },
  urdrevan:     { name: 'The Urdrevan',        realm: 'The Commonwealth',colour: '#6f7a3a', sigil: 'antler',
                  blurb: 'Wolves, winters and the Wolfroad. Civilisation is decadence; the wild is honest.' },
  portavas:     { name: 'The Republic of Portavas', realm: 'The Commonwealth', colour: '#2f8f9e', sigil: 'trident',
                  blurb: 'Pearl-trading, tide-reading, chart-writing shareholders with an excellent navy.' },
  hammerstadt:  { name: 'The Hammerstadt Charter', realm: 'The Commonwealth', colour: '#b06a2a', sigil: 'anvil',
                  blurb: 'A city of forges and contracts. Thirty furnaces, one shift bell, no idle hands.' },
  corrupted:    { name: 'The Corrupted',       realm: 'The Mists',       colour: '#7a2541', sigil: 'eye',
                  blurb: 'The Tyrant, the Fallen and the Void: an uneasy alliance against all Elandra.' },
  neutral:      { name: 'Haven & the Guilds',  realm: 'Haven',           colour: '#9a7b3f', sigil: 'menhir',
                  blurb: 'Adventurers, Guardians, Free Companies and the Bank, all assembled at the Menhir.' },
  token:        { name: 'Summoned',            realm: 'Haven',           colour: '#666', sigil: 'menhir', blurb: '' },
  crownlands:   { name: 'The Crownlands',      realm: 'The Crownlands',  colour: '#b8963f', sigil: 'menhir',
                  blurb: 'High adventure, colour and pageantry.' },
};

export const REALMS = {
  'The Crownlands':   { colour: '#b8963f', nations: ['avereaux', 'wonder', 'valdraeth'] },
  'The Sanctuaries':  { colour: '#8e7ab5', nations: ['syradonia', 'morvalis', 'kairos'] },
  'The Commonwealth': { colour: '#2f8f9e', nations: ['urdrevan', 'portavas', 'hammerstadt'] },
  'The Mists':        { colour: '#7a2541', nations: ['corrupted'] },
  'Haven':            { colour: '#9a7b3f', nations: ['neutral'] },
};

export * from './schema.js';

// ---- integrity check used by tests ----------------------------------------
export function validate() {
  const problems = [];
  const seen = new Set();
  for (const c of CARDS) {
    if (seen.has(c.id)) problems.push(`duplicate id: ${c.id}`);
    seen.add(c.id);
    if (!c.name) problems.push(`card without name: ${c.id}`);
    if (c.type === 'hero' && (c.might == null || c.vigil == null)) problems.push(`hero without stats: ${c.id} ${c.name}`);
    if (!c.spheres || !c.spheres.length) problems.push(`card without spheres: ${c.id}`);
  }
  return problems;
}
