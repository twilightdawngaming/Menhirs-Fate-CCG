import { newGame, reduce } from '.../src/engine/game.js';
import { aiAction } from '.../src/engine/ai.js';
import { DECKS, STARTER_DECK, buildDeck } from '/src/content/decks.js';
import { CAMPAIGN } from '/src/content/campaign.js';

// a plausible "player deck" after n chapter rewards and a few Bank purchases
const GROWN = buildDeck([
  ['ley-soul', 6], ['ley-stone', 4], ['ley-gale', 3], ['ley-kingsroad', 2], ['ley-wild', 1],
  ['nu-scout', 2], ['cl-drumpiper', 2], ['ka-disciple', 2], ['nu-cantor', 1], ['sy-faithecho', 2],
  ['cl-warden', 1], ['ur-thane', 1], ['nu-pactwarden', 2], ['mo-vampire', 1], ['av-oathkeeper', 1],
  ['wd-godmother', 1], ['cl-muster', 1],
  ['c-wardpact', 2], ['c-godsight', 1], ['c-quill', 1], ['c-unbroken', 2], ['c-stoneskin', 1],
  ['w-oathbanner', 1], ['rl-pactstone', 1], ['mn-circle', 1],
], 'spirit');

function winRate({ playerDeck, oppKey, difficulty, oppResolve, games = 40, perk = null }) {
  let wins = 0, turns = 0;
  for (let g = 0; g < games; g++) {
    let s = newGame({
      p1: { name: 'Player', deck: playerDeck, ai: true, difficulty: 2 },
      p2: { name: 'Boss', deck: DECKS[oppKey].list, ai: true, difficulty },
      seed: 900 + g * 37, options: { startResolve: 20, startResolve2: oppResolve || 20 },
    });
    if (perk && perk.includes('Menhir')) { const { instantiate } = await0(); }
    let steps = 0;
    while (s.winner == null && steps++ < 900) {
      let acted = false;
      for (const who of [0, 1]) { const a = aiAction(s, who); if (a) { const r = reduce(s, a, who); if (r.error) break; s = r.state; acted = true; break; } }
      if (!acted) break;
    }
    if (s.winner === 0) wins++;
    turns += s.turn;
  }
  return `${Math.round((wins / games) * 100)}%`.padStart(4) + `  (avg ${(turns / games).toFixed(1)} turns)`;
}
const await0 = () => ({});

for (const ch of CAMPAIGN.chapters) {
  const o = ch.duel.opponent;
  console.log(ch.id.padEnd(8), 'starter deck:', winRate({ playerDeck: STARTER_DECK, oppKey: o.deck, difficulty: o.difficulty, oppResolve: o.resolve, games: 30 }),
    '| grown deck:', winRate({ playerDeck: GROWN, oppKey: o.deck, difficulty: o.difficulty, oppResolve: o.resolve, games: 30 }));
}
console.log('\nprecon vs precon (quick duel):', winRate({ playerDeck: DECKS.avereaux.list, oppKey: 'tyrant', difficulty: 2, games: 30 }));
