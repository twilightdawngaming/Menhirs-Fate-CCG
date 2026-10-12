# Menhirs Fate: Weavers of Elandra

An online card game built on the world of **Menhirs Fate** — the UK festival LARP where the nine
nations of Elandra hold the west against the Corrupted, and one standing stone still works.

It plays like Magic the Gathering, and it is driven by a story. You are a Weaver: you attune ley
lines, call heroes out of every nation, and — when the mist presses in — you agree with the Menhir
and change the shape of the field.

```
npm install
npm start        # http://localhost:3000   — full game, duel rooms included
npm run build    # → site/                — static site, ready for any web host
```

**Deploying it:** see **[DEPLOY.md](DEPLOY.md)** — a pre-built website is included in `site/`, and
there are config files ready for Render (one click, everything works), Docker, GitHub Pages and
Netlify.

---

## What is in it

| | |
|---|---|
| **Engine** | MTG-lite: 40-card decks, 20 **Resolve**, Rally → Main → Clash → End, a real stack for Cantrips, response windows, combat with blockers/Guardian/Soaring/Duelist/Overrun |
| **Magic** | Six spheres — the five base spheres (Fire, Earth, Water, Wind, Spirit) plus wild **Wyrd**, which pays for anything. **Leylines** give mana, **Menhirs** allow **Weavings** |
| **Cards** | **254 cards**: 156 heroes, 17 leylines, 26 cantrips, 17 rites, 12 weavemarks, 18 relics (4 of them Menhirs), 8 Weavings — every one with generated heraldic SVG art |
| **Campaign** | A prologue and six chapters, with branching choices that set flags, change the prose, alter rewards and decide one of three endings |
| **Deckbuilding** | A collection that grows with every victory, a deck builder, and the **Bank of Haven** shop (Saga → Myth → Legend, base 20) |
| **Online** | Room-code duels, server-authoritative, with the opposing hand properly hidden — or fully static if you only want the single-player half |
| **Opponents** | An AI that holds removal, blocks profitably and punishes tapped-out defenders — plus boss perks for the story |

## The world, and how it is played

Nine nations in three realms, exactly as the LARP sets them out: **Avereaux**, **The Wonder** and
**Valdraeth** in the Crownlands; **Syradonia**, **Morvalis** and **Kairos** in the Sanctuaries; the
**Urdrevan**, **Portavas** and **Hammerstadt** in the Commonwealth. Each plays to its own
temperament — Morvalis recurses out of its own graveyard, Portavas is clever and evasive, Hammerstadt
builds relics that make everything else better, the Urdrevan is fast and feral.

Against them stand the three powers of the **Corrupted**, who have agreed to stop arguing:
**the Tyrant** (census, conscription, forced attacks), **the Fallen** (reanimation, drains) and
**the Void** (unmaking, discard, exile, one-shot "Fated" damage). They have taken the standing
stones and crowned them.

Your tools are the ones the LARP gives a Weaver:

* **Attune** your leylines for mana — spent leylines come back at Rally.
* **Cantrips** are the small quick magics. They go on a stack, and both players get a reaction
  window after every attack declaration. Hold one up and you can answer what your opponent does.
* **Rites** are deliberate and Main-phase only.
* **Boon counters** are permanent +1/+1 growth — a hero that survives three clashes is a different
  creature to the one that arrived.
* **Weavings** are the great workings — *Weaving of the Lifting Mist*, *The Reclamation*,
  *Weaving of Unmaking the Crown*. You cannot cast one unless you command a **Menhir**.

## The campaign

> The mist took the east first. It always takes the east first, because the east is where the roads
> are, and roads are how the Corrupted find you.

| # | Chapter | Opposition |
|---|---|---|
| — | Prologue: The Stone That Remembers | Mist-touched scouts at the fence, and Guardian Maren explaining the rules |
| I | The Fading Villages | Census-Taskmaster Vell and the Iron Census — *take the carts, or fortify the village?* |
| II | The Circle of Weavers | Orad's trial, where you earn standing and the right to weave |
| III | The Fallen Tide | Crypt Lord Athra on the Morvalis coast road — *the Dusk bargain, or hold it yourself?* |
| IV | The Unwriting | The Void, in the Second Library of Kairos — *trade the Pact for a year of peace?* |
| V | The Crowned | Warlord Kurrash at a Menhir that is not grey |
| VI | The Final Stand at the Menhir | The alliance of the three, with the whole of Elandra watching |

Choices are permanent and they are remembered: they set flags, change the outcome prose, decide
which card you are offered, and select your ending — **The Ninefold Weave**, **The Weaver Who
Stayed Behind**, or **The Unbought**. Progress, collection and flags are saved in the browser.

## Playing it

**The Story Campaign** — start at the Prologue. Maren teaches the phases in the duel briefing.
**Duel the Corrupted** — pick any of the nine nations and a Corrupted leader, or bring your grown
campaign deck.
**Online Duel** — one player creates a room, reads out the four-letter code, the other joins. The
server deals, adjudicates and redacts; neither player can see the other's hand.
**Your Deck / Bank of Haven** — rebuild the deck between chapters, and spend Saga on salvage.

Controls: click a card to inspect it, then **Play**; click your leylines to attune (the *Attune all*
button picks the sphere your hand most wants); *Declare Attack* then click heroes to choose who
strikes; blockers are assigned in a modal whenever you are attacked. `Esc` cancels a selection,
`Space` advances the phase.

## How it is built

```
server.js                    Express + ws: static host, /ws duel rooms, authoritative reducer
Dockerfile · render.yaml · netlify.toml · .github/workflows/pages.yml   deployment configs
tools/build-static.mjs       builds site/ — rewrites imports, writes config.js
tools/verify-deployment.mjs  checks a deployed site (assets, engine modules, duel rooms)
src/engine/                  the rules, shared verbatim between server and browser
  cards/schema.js            card shape, spheres, keyword glossary
  cards/*.js                 254 cards, grouped by nation and faction
  cards/index.js             aggregation, nation/realm metadata, validate()
  ops.js                     primitives: instances, statics, power/vigil/keywords, zones, mana
  effects.js                 ~70 effect types: every ability on every card resolves here
  game.js                    phases, the stack, combat, triggers, redaction, legality
  ai.js                      the opposition: threat scoring, blocking logic, reaction policy
src/content/decks.js         13 preconstructed decks + graded campaign opposition + starter deck
src/content/campaign.js      the story, choices, branches, rewards and endings
public/js/                   client: screens, deck builder, shop, board, sockets
public/js/art.js             heraldic card art, generated as inline SVG
tests/                       engine simulation, UI render stress, flow, balance, PvP
```

The engine is a pure reducer: `reduce(state, action, actor)` returns a brand-new state or a rules
error. The browser runs it directly for campaign and AI duels; for online play the same code runs
on the server, and each client only ever receives its own view (`redact(state, viewer)`).

### Tests

```
npm test              # engine simulation + render stress + UI flows + static build check
npm run test:balance  # win rates for every campaign chapter (starter deck vs grown deck)
npm run test:pvp      # spins up two socket clients and plays a full online duel
npm run test:static   # builds site/, serves it, and plays a duel out of the built files
npm run verify https://your-deployed-site   # post-deploy smoke test, including duel rooms
```

The engine simulation plays 120 AI-vs-AI duels across all preconstructed decks and asserts that
every one terminates without a rules error or a stall (currently 0 crashes, 0 stalls, ~12 turns
average). The render test replays whole duels through the actual client code in a headless DOM —
575 board states, the blockers modal, reaction windows and the result screen.

## Notes on fidelity

The game follows the published Menhirs Fate material for the things that matter: the nine nations
and their three realms, the Corrupted as three distinct powers in uneasy alliance, Haven and the
Menhir, the Circle of Weavers, the Guardians, the Pact (no murder of children, no torture, no stolen
land), the five base spheres with Wyrd beside them, resource backgrounds, and the coinage —
Saga, Myth, Legend, base 20.

Where the LARP's rules are deliberately mysterious — how much weaving costs, what a Menhir does at
scale, what the mists do when they arrive — the game makes a playable decision and says so. The
Menhir gates Weavings; Weavings are expensive and decisive. That is the design bet: the strange,
sacred object at the middle of the world should be the thing your opponent is trying to kill.

*Fan project. Menhirs Fate and the world of Elandra belong to their creators.*
