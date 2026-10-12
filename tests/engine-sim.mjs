import { newGame, reduce } from '/src/engine/game.js';
import { aiAction } from '/src/engine/ai.js';
import { DECKS } from '/src/content/decks.js';
const keys = Object.keys(DECKS);
let wins={0:0,1:0}, crashes=0, stalls=0, turnList=[];
for (let g=0; g<120; g++) {
  const k1 = keys[g%keys.length], k2 = keys[(g*3+4)%keys.length];
  let s = newGame({ p1:{name:k1,deck:DECKS[k1].list,ai:true,difficulty:1+(g%3)}, p2:{name:k2,deck:DECKS[k2].list,ai:true,difficulty:1+((g+1)%3)}, seed: 7*g+13 });
  let steps=0;
  try {
    while (s.winner==null && steps++<1500) {
      let acted=false;
      for (const who of [0,1]) {
        const a = aiAction(s, who);
        if (a) { const r = reduce(s,a,who); if (r.error) throw new Error(`${a.type}: ${r.error} @${s.phase}/${s.stage}`); s=r.state; acted=true; break; }
      }
      if (!acted) throw new Error('stall');
    }
  } catch(e) { crashes++; if (crashes<4) console.log('CRASH', g, e.message); continue; }
  if (s.winner==null) stalls++; else { wins[s.winner]++; turnList.push(s.turn); }
}
console.log('games 120 | crashes', crashes, '| stalls', stalls, '| wins', wins, '| avg turns', (turnList.reduce((a,b)=>a+b,0)/(turnList.length||1)).toFixed(1));
