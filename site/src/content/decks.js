// ---------------------------------------------------------------------------
// decks.js — ten preconstructed 40-card decks, one per nation plus the Corrupted
// ---------------------------------------------------------------------------

const BASIC = {
  fire: 'ley-ember', earth: 'ley-stone', water: 'ley-tide', wind: 'ley-gale',
  spirit: 'ley-soul', wyrd: 'ley-wild',
};

const BASIC_IDS = new Set(Object.values(BASIC));

// Build a legal 40-card deck from a [id, count] recipe: pad with basics if the
// recipe is light, and shave spare basics first if it is generous.
export function buildDeck(list, primary = 'wyrd') {
  const out = [];
  for (const [id, n] of list) for (let i = 0; i < n; i++) out.push(id);
  while (out.length < 40) out.push(BASIC[primary]);
  let over = out.length - 40;
  while (over > 0) {
    const counts = new Map();
    for (const id of out) if (BASIC_IDS.has(id)) counts.set(id, (counts.get(id) || 0) + 1);
    // shave the most-repeated basic, never below three copies of anything
    const pick = [...counts.entries()].filter(([, n]) => n > 3).sort((a, b) => b[1] - a[1])[0]
      || [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!pick) break;
    const i = out.lastIndexOf(pick[0]);
    if (i < 0) break;
    out.splice(i, 1);
    over--;
  }
  return out.slice(0, 40);
}

const D = (name, nation, primary, list) => ({ name, nation, primary, list: buildDeck(list, primary) });

export const DECKS = {
  // ---------------------------------------------------------------- AVEREAUX
  avereaux: D('The Grand Epic', 'avereaux', 'spirit', [
    ['ley-soul', 9], ['ley-gale', 4], ['ley-kingsroad', 3], ['ley-ossuary', 2],
    ['av-emberknight', 2], ['av-balladeer', 2], ['av-herold', 2], ['av-dawnsinger', 2],
    ['av-banertale', 2], ['av-memorywarden', 1], ['av-curator', 1], ['av-swordwright', 1],
    ['av-loremother', 1], ['av-legate', 1], ['av-oathkeeper', 1],
    ['c-quill', 2], ['c-oathsworn', 1], ['c-unbroken', 1],
    ['w-bladehallowed', 1], ['rl-songbook', 1], ['r-starsong', 1], ['mn-circle', 1],
  ]),
  // ------------------------------------------------------------ THE WONDER
  wonder: D('Bargains & Wisps', 'wonder', 'wind', [
    ['ley-gale', 9], ['ley-glimmerwood', 4], ['ley-pearlshallow', 3], ['ley-wild', 2],
    ['wd-glint', 2], ['wd-wispwright', 2], ['wd-lantern', 2], ['wd-halfling', 2],
    ['wd-sweetmandrake', 2], ['wd-gossamer', 1], ['wd-thornpact', 1], ['wd-piedpiper', 1],
    ['wd-riddlekeeper', 1], ['wd-godmother', 1], ['wd-bargain', 1], ['wd-moonwell', 1],
    ['c-glintstep', 2], ['c-mirrorvow', 1], ['c-laughter', 1],
    ['w-moonsheen', 1], ['rl-glimmercloak', 1], ['r-hollowhollow', 1],
  ]),
  // ------------------------------------------------------------- VALDRAETH
  valdraeth: D('Ash and Wolf', 'valdraeth', 'fire', [
    ['ley-ember', 8], ['ley-wildreach', 5], ['ley-stone', 3], ['ley-cinderfall', 2],
    ['va-ashkin', 2], ['va-shaman', 2], ['va-frostwolf', 2], ['va-herdmaster', 2],
    ['va-fenri', 2], ['va-cairnling', 1], ['va-redhunt', 1], ['va-thanebreaker', 1],
    ['va-bitterwidow', 1], ['va-rune', 1], ['va-wolfmother', 1], ['va-skald', 1],
    ['c-emberlash', 2], ['c-ashvow', 1], ['c-cinder', 1], ['c-warbellow', 1],
    ['w-emberwake', 1], ['rl-cindercenser', 1], ['r-longnight', 1], ['mn-valdraeth', 1],
  ]),
  // -------------------------------------------------------------- SYRADONIA
  syradonia: D('The Four Orders', 'syradonia', 'earth', [
    ['ley-stone', 9], ['ley-deepstone', 4], ['ley-undermarket', 3], ['ley-kolossi', 2],
    ['sy-delver', 2], ['sy-loremason', 2], ['sy-steward', 2], ['sy-faithecho', 2],
    ['sy-molewright', 2], ['sy-deeppriest', 1], ['sy-underpriest', 1], ['sy-gemsinger', 1],
    ['sy-warden-luxury', 1], ['sy-ordercaptain', 1], ['sy-councillor', 1], ['sy-vaultguard', 1],
    ['c-deepstone', 2], ['c-stoneskin', 1], ['w-runeward', 1], ['rl-deeplamp', 1],
    ['r-deepvault', 1], ['mn-valdraeth', 1],
  ]),
  // --------------------------------------------------------------- MORVALIS
  morvalis: D('The Houses of Dusk', 'morvalis', 'spirit', [
    ['ley-soul', 8], ['ley-ossuary', 4], ['ley-cinderfall', 3], ['ley-stone', 3],
    ['mo-thrall', 2], ['mo-mourner', 2], ['mo-ghoul', 2], ['mo-bonechoir', 2],
    ['mo-confessor', 2], ['mo-courtesan', 1], ['mo-necromancer', 1], ['mo-fleshwright', 1],
    ['mo-lichling', 1], ['mo-vampire', 1], ['mo-mistress', 1],
    ['c-bloodprice', 2], ['c-harvest', 1], ['w-bonepact', 1], ['rl-duskchalice', 1],
    ['r-boneharvest', 1], ['r-duskcourt', 1], ['ley-wild', 2],
  ]),
  // ----------------------------------------------------------------- KAIROS
  kairos: D('The Nine Games', 'kairos', 'earth', [
    ['ley-stone', 8], ['ley-kolossi', 5], ['ley-deepstone', 3], ['ley-soul', 2],
    ['ka-marble', 2], ['ka-wrestler', 2], ['ka-disciple', 2], ['ka-sophist', 2],
    ['ka-artisan', 2], ['ka-philosopher', 1], ['ka-archivist', 1], ['ka-oathbard', 1],
    ['ka-herald-games', 1], ['ka-lampwright', 1], ['ka-agonarch', 1], ['ka-kolossus', 1],
    ['r-contest', 1], ['r-trial', 1], ['rl-agoncrown', 1], ['w-crownsweight', 1],
    ['c-deepbreath', 2], ['c-wardpact', 1], ['mn-valdraeth', 1],
  ]),
  // -------------------------------------------------------------- URDREVAN
  urdrevan: D('The Wolfroad', 'urdrevan', 'earth', [
    ['ley-stone', 9], ['ley-wildreach', 4], ['ley-gale', 3], ['ley-glimmerwood', 2],
    ['ur-hunter', 2], ['ur-scarred', 2], ['ur-wolfsister', 2], ['ur-skinchanger', 2],
    ['ur-drummer', 2], ['ur-longwinter', 2], ['ur-herbalist', 1], ['ur-berserk', 1],
    ['ur-tyrantfencer', 1], ['ur-thane', 1], ['ur-speaker', 1], ['ur-pinnoc', 1],
    ['c-warbellow', 1], ['c-deepbreath', 2], ['c-wyrdfang', 1], ['w-wildoath', 1],
    ['rl-wolfroad', 1], ['r-wildhunt', 1], ['r-reclaim', 1],
  ]),
  // --------------------------------------------------------------- PORTAVAS
  portavas: D('The Pearl Fleet', 'portavas', 'water', [
    ['ley-tide', 9], ['ley-pearlshallow', 4], ['ley-kolossi', 3], ['ley-wild', 2],
    ['po-pearldiver', 2], ['po-smuggler', 2], ['po-tidecaller', 2], ['po-cartographer', 2],
    ['po-magistrate', 1], ['po-harpooner', 1], ['po-stormpriest', 1], ['po-navigator', 1],
    ['po-fleetcaptain', 1], ['po-corsair', 1], ['po-merchant', 1], ['po-highadmiral', 1],
    ['c-tidecall', 2], ['c-following-wind', 1], ['c-bounty', 1], ['w-tidebound', 1],
    ['rl-pearlcompass', 1], ['rl-fleetprize', 1], ['r-fleet', 1], ['r-tideturn', 1],
  ]),
  // ------------------------------------------------------------- HAMMERSTADT
  hammerstadt: D('The Charter Forge', 'hammerstadt', 'fire', [
    ['ley-ember', 7], ['ley-anvil', 5], ['ley-undermarket', 3], ['ley-stone', 3],
    ['ha-apprentice', 2], ['ha-shiftwarden', 2], ['ha-labour', 2], ['ha-gunsmith', 2],
    ['ha-stoker', 2], ['ha-magistrate', 1], ['ha-brassknuckle', 1], ['ha-artificer', 1],
    ['ha-guildbanker', 1], ['ha-runeforger', 1], ['ha-ironwright', 1],
    ['c-forgefury', 2], ['c-ironhide', 1], ['w-chartermark', 1], ['rl-anvilward', 1],
    ['rl-charterblade', 1], ['rl-bankledger', 1], ['r-forge', 1], ['r-bank', 1],
  ]),

  // ------------------------------------------------------------- THE CORRUPTED
  // Three sub-factions united: Tyrant (fire/earth), Fallen (spirit), Void (wyrd).
  tyrant: D('The Iron Census', 'corrupted', 'earth', [
    ['ley-stone', 8], ['ley-anvil', 4], ['ley-undermarket', 3], ['ley-cinderfall', 2],
    ['ty-conscript', 3], ['ty-legion', 2], ['ty-chained', 2], ['ty-heresy', 2],
    ['ty-taskmaster', 2], ['ty-tollmaster', 1], ['ty-overseer', 1], ['ty-inquisitor', 1],
    ['ty-banner', 1], ['ty-grasp', 1], ['ty-warlord', 1],
    ['c-forgefury', 2], ['c-ironhide', 1], ['c-warbellow', 1], ['c-cinder', 1],
    ['w-chartermark', 1], ['r-longnight', 1], ['mn-crown', 1],
  ]),
  fallen: D('The Fallen Tide', 'corrupted', 'spirit', [
    ['ley-soul', 8], ['ley-ossuary', 4], ['ley-cinderfall', 3], ['ley-stone', 2],
    ['fa-husk', 3], ['fa-marrow', 2], ['fa-wight', 2], ['fa-banshee', 2],
    ['fa-gravetender', 2], ['fa-memoryeater', 1], ['fa-revenant', 1], ['fa-shroud', 1],
    ['fa-cryptlord', 1], ['fa-sovereign', 1],
    ['c-bloodprice', 2], ['c-harvest', 1], ['w-bonepact', 1], ['r-boneharvest', 1],
    ['r-duskcourt', 1], ['rl-voidshard', 1], ['mn-crown', 1],
  ]),
  void: D('The Unwriting', 'corrupted', 'wyrd', [
    ['ley-wild', 8], ['ley-glimmerwood', 4], ['ley-ossuary', 3], ['ley-gale', 3],
    ['vo-rift', 3], ['vo-unmaker', 2], ['vo-hollowborn', 2], ['vo-silence', 2],
    ['vo-nullpriest', 1], ['vo-eclipse', 1], ['vo-eroder', 1], ['vo-devourer', 1],
    ['vo-nothing', 1],
    ['c-nullwave', 2], ['c-unspool', 1], ['c-mirrorvow', 1], ['w-voidscab', 1],
    ['rl-voidshard', 1], ['r-voidtide', 1], ['r-unmake', 1], ['mn-crown', 1],
  ]),
};

// ---------------------------------------------------------------------------
// Early-campaign opposition: raiding parties, not the full might of the
// Corrupted. Same identity, fewer teeth — so the story can teach as it goes.
// ---------------------------------------------------------------------------
DECKS.mist = D('Mist-Touched Scouts', 'corrupted', 'wyrd', [
  ['ley-wild', 9], ['ley-stone', 4], ['ley-soul', 3],
  ['vo-rift', 3], ['fa-husk', 3], ['ty-conscript', 3], ['ty-legion', 2], ['vo-hollowborn', 2],
  ['c-ironhide', 1], ['c-deepbreath', 1], ['c-wardpact', 1], ['c-emberlash', 1], ['c-godsight', 1],
]);
DECKS.tyrantRaiders = D('The Iron Census (raiding column)', 'corrupted', 'earth', [
  ['ley-stone', 7], ['ley-ember', 4], ['ley-anvil', 3], ['ley-undermarket', 2], ['ley-wild', 1],
  ['ty-conscript', 3], ['ty-legion', 3], ['ty-heresy', 3], ['ty-chained', 2], ['ty-taskmaster', 1],
  ['ty-overseer', 1], ['ty-banner', 1],
  ['c-forgefury', 1], ['c-ironhide', 1], ['c-warbellow', 1], ['c-emberlash', 1], ['c-wardpact', 1],
]);
DECKS.fallenTide = D('The Fallen Tide (coastal host)', 'corrupted', 'spirit', [
  ['ley-soul', 7], ['ley-ossuary', 3], ['ley-stone', 3], ['ley-cinderfall', 2], ['ley-wild', 1],
  ['fa-husk', 3], ['fa-marrow', 3], ['fa-wight', 3], ['fa-banshee', 2], ['fa-gravetender', 2],
  ['fa-memoryeater', 1],
  ['c-bloodprice', 1], ['c-harvest', 1], ['c-deepbreath', 1], ['c-emberlash', 1], ['c-wardpact', 1],
  ['w-bonepact', 1],
]);
DECKS.voidWhispers = D('The Unwriting (whisperers)', 'corrupted', 'wyrd', [
  ['ley-wild', 8], ['ley-glimmerwood', 3], ['ley-gale', 3], ['ley-ossuary', 2], ['ley-soul', 1],
  ['vo-rift', 3], ['vo-hollowborn', 3], ['vo-unmaker', 2], ['vo-silence', 2], ['vo-eclipse', 1],
  ['vo-nullpriest', 1], ['vo-eroder', 1],
  ['c-nullwave', 2], ['c-unspool', 1], ['c-mirrorvow', 1], ['c-tidecall', 1], ['w-voidscab', 1],
]);

// ---------------------------------------------------------------------------
// The player's starting deck for the campaign — what a Haven recruit owns.
// ---------------------------------------------------------------------------
export const STARTER_DECK = buildDeck([
  // ---- sixteen leylines: spirit and earth, with a wind splash and one wild card
  ['ley-soul', 6], ['ley-stone', 4], ['ley-gale', 3], ['ley-kingsroad', 2], ['ley-wild', 1],
  // ---- sixteen heroes: the Haven Watch, a line that can actually hold
  ['nu-scout', 2], ['cl-jester', 1], ['cl-drumpiper', 2],
  ['ka-disciple', 2], ['nu-cantor', 2], ['sy-faithecho', 1],
  ['cl-warden', 2], ['sy-delver', 1], ['sy-loremason', 1], ['ur-thane', 1],
  ['nu-pactwarden', 1],
  // ---- eight workings: protection, card flow and a wall of stone
  ['c-wardpact', 2], ['c-godsight', 2], ['c-quill', 1], ['c-deepbreath', 1],
  ['c-unbroken', 1], ['c-stoneskin', 1],
], 'spirit');

export const ALL_DECKS = DECKS;
export function deckIds(key) { return (DECKS[key] || DECKS.avereaux).list; }
