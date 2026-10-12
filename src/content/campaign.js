// ---------------------------------------------------------------------------
// campaign.js — the story. Prologue plus six chapters taking an adventurer
// from the Menhir at Haven to the last stand against the Corrupted.
// ---------------------------------------------------------------------------
// Each chapter: narration → a choice that matters → a duel → rewards that grow
// your deck. Choices set flags; flags decide your ending and what you carry.

export const CAMPAIGN = {
  id: 'weavers',
  title: 'Weavers of Elandra',
  blurb: 'Nine nations, three realms, one Menhir that still stands.',
  prologue: [
    'The mist took the east first. It always takes the east first, because the east is where the roads are, and roads are how the Corrupted find you.',
    'You have walked eleven days to reach Haven — the field the Gods made, infused with the power of the Menhir. It is not a city. It is a rumour of a city: tents, cook-fires, nine banners arguing about who owns which hillock, and at the centre, standing in its own little crater of quiet, the stone.',
    'People are still arriving. They arrive with carts, or with children, or with nothing at all. Some of them arrive with weapons and the expression of someone who has already lost the argument.',
    'A Guardian is waiting for you at the edge of the field. She has the flat, patient look of someone who has explained the same thing four hundred times and intends to explain it a four hundred and first.',
  ],
  chapters: [
    // ===================================================================== 0
    {
      id: 'prologue',
      title: 'Prologue — The Stone That Remembers',
      subtitle: 'Haven, first bell',
      scene: 'haven',
      intro: [
        { who: 'Guardian Maren', text: 'You are the one from the north road. Good. I am Maren. I am a Guardian, which means I guard you from the Menhir and the Menhir from you, and today I am mostly doing the second one.' },
        { who: 'Guardian Maren', text: 'Your deck is your story — what you carry, what you have earned, what you have buried. Forty cards is a tidy life. You will not stay tidy long.' },
        { who: 'You', text: 'Where do I start?' },
        { who: 'Guardian Maren', text: 'At the edge. The mist sends scouts ahead of itself — thin things, half-made. We call them the Mist-touched. They are not soldiers. They are the mist trying the lock.' },
        { who: 'Guardian Maren', text: 'Attune your leylines. Attune means: take the mana the land is already offering. Do not hoard it — leylines forget by nightfall. Then call a hero, and let me see what you are.' },
        { who: 'Guardian Maren', text: 'And if you have a Cantrip in hand, hold it. A Cantrip played at the right moment is worth two played at the convenient one.' },
      ],
      briefing: [
        'Leylines arrive un-attuned — click them during your Main phase to draw mana.',
        'Your Resolve is your life. It ends at zero.',
        'Attack in the Clash. The defender assigns blockers, then the thread settles — you both get a last chance to play a Cantrip.',
      ],
      duel: {
        title: 'Mist-Touched at the Fence',
        opponent: {
          name: 'Mist-Touched Scavengers', title: 'First contact', faction: 'corrupted',
          deck: 'mist', difficulty: 1, resolve: 12, portrait: 'mist',
        },
        taunts: [
          'The mist arrives a little at a time, and then all at once.',
          'One of the figures lifts its head and owns no face.',
        ],
      },
      victory: [
        'The last of them comes apart like a sentence you cannot remember beginning. Nothing is left on the grass but a wet ring and a smell of cold stone.',
        'Maren does not congratulate you. She is watching the horizon, where the mist has paused — briefly, politely — as though taking a note.',
        { who: 'Guardian Maren', text: 'You attuned clean and you spent it all. That is the whole of it. Everything else is arithmetic and nerve.' },
        { who: 'Guardian Maren', text: 'Now. There is a village called Thornhallow, two days west, and its beacon has not been lit for three nights. That could be weather. It is not weather.' },
      ],
      rewards: ['nu-guardian-haven', 'c-wardpact', 'c-unbroken'],
      rewardNote: 'Maren opens a chest of the Circle\u2019s spares. "Take one. They are only useful in a hand that has already decided something."',
    },

    // ===================================================================== I
    {
      id: 'ch1',
      title: 'Chapter I — The Fading Villages',
      subtitle: 'Thornhallow, and the Iron Census',
      scene: 'village',
      intro: [
        'Thornhallow is a small place with one street, one well and one very old apple tree. Or it was. Now it is a small place with one street, one well, no apple tree, and a column of smoke that has been standing over it for three days because nobody is left to put it out.',
        'The Corrupted took the east and the north, and then they did something worse than taking: they counted. That is the Tyrant\u2019s way. Not slaughter — census. Every village in the seized lands is entered in a ledger, and the ledger is the leash. Names, grains, sons, daughters, owed. The Tyrant is not trying to destroy Elandra. The Tyrant is trying to write it again, from the top.',
        'You find survivors: nine of them, in the root cellar under the mill, and one of them is a woman holding a wood-axe like it is a sentence she has already started.',
        { who: 'Halla, the miller', text: 'They took the winter grain and the able-bodied and my brother, and they left us an inventory notice. An *inventory notice*. Pinned to my door, in good ink.' },
        { who: 'Halla, the miller', text: 'They will come back for the rest of us in a week. That is how the Census works — first the count, then the cart.' },
        'Below you, in the ruined orchard, a column of Tyrant legionnaires is already moving back along the valley road. With them go eleven carts.',
      ],
      choice: {
        prompt: 'The carts are leaving now. The column is a mile off. What do you do?',
        options: [
          {
            id: 'carts',
            label: 'Ride for the carts',
            text: 'Catch the column at the ford and take the grain back. They will know a Weaver has come, and they will come looking — but eleven families eat through the winter.',
            flags: { bold: true, grain: true },
            reward: 'rl-pactstone',
            outcome: [
              'You catch them at the ford where the road narrows and the carts have to go one at a time. It is a bad fight in a good place, which is the only kind worth picking.',
              'The legionnaires abandon the grain rather than die for it — the Census is not a religion, it is a procedure, and procedures retreat. You come back to Thornhallow with eleven carts and one very tired horse.',
              'Halla looks at the grain for a long moment, then at you, and then does not say thank you, because there is no shape of thanks that fits. Instead she reaches under the counter and gives you a stone tablet, old, with the terms of the Pact cut into it. "My grandfather kept it," she says. "It says they are not allowed to do what they did. Someone should hold them to it."',
            ],
          },
          {
            id: 'cellar',
            label: 'Fortify the village',
            text: 'Let the carts go. Spend the day on the mill — gates, ditches, a beacon that can actually be lit — so that the next column finds a village instead of a formality.',
            flags: { steady: true, home: true },
            reward: 'rl-anvilward',
            outcome: [
              'You spend the day with your hands in the earth. Nine survivors, one of whom is a miller with an axe, and by dusk Thornhallow has a palisade, a lit beacon, and a ditch that a cart cannot cross.',
              'It will not stop an army. But the Tyrant\u2019s legions count in ledgers, and a village that must be besieged is a village that costs more than it yields. The arithmetic of cruelty is its own weakness.',
              'The smith, who has been dead for two years, left an anvil ward in the mill loft. Halla gives it to you with the words: "It held a hammer. It can hold a line."',
            ],
          },
        ],
      },
      duel: {
        title: 'The Column at the Ford',
        opponent: {
          name: 'Census-Taskmaster Vell', title: 'Legion of the Iron Census', faction: 'corrupted',
          deck: 'tyrantRaiders', difficulty: 1, resolve: 18, portrait: 'tyrant',
        },
        taunts: [
          'The Taskmaster does not shout. He reads your name off a list, and then he reads what you owe.',
          '"Item: one adventurer, unregistered. Disposition: correction."',
        ],
      },
      victory: [
        'The column breaks. Not because you are stronger — you are not stronger — but because the Census assumes that everything it counts will still be there to be counted.',
        'Vell retreats with his ledger held over his head like a shield. You let him. A book is not worth dying for, and you have just proved you can read it.',
        'But the ledger is not the Tyrant, and the Tyrant now knows your name, spelled correctly, with your nation beside it.',
      ],
      rewards: ['cl-sworn', 'c-oathsworn', 'va-rune'],
      rewardNote: 'Salvage from the column: take one trophy to your deck.',
    },

    // ===================================================================== II
    {
      id: 'ch2',
      title: 'Chapter II — The Circle of Weavers',
      subtitle: 'The trial beneath the Menhir',
      scene: 'circle',
      intro: [
        'Haven again, and this time you are taken to the stone itself.',
        'Up close the Menhir is not impressive. It is a grey standing stone about the height of two people, with no runes you can read and no glow worth mentioning. A dog could lean on it. It is, by every measure available to the eye, just a rock in a field that nine nations are dying for.',
        'The Circle of Weavers are six people of six nations who disagree about everything except that the stone works. Their leader is a Syradonian named Orad, who has the tone of a man explaining a cave system to someone who has just said "but it is dark".',
        { who: 'Orad of the Circle', text: 'Weaving is not spellcasting. Spellcasting is asking. Weaving is agreeing — with the stone, and the stone agreeing back. It costs more than you have ever spent on anything, and it is the only reason the mists have not taken the whole of Elandra.' },
        { who: 'Orad of the Circle', text: 'You will not be taught. You will be tested, which is the same thing with worse manners. If you can hold a line against me for one engagement, the Circle will grant you standing and an anchor to the stone.' },
        'The other five weavers do not look up. One of them, a woman from The Wonder, is quietly drawing your portrait, and you have a strong suspicion it will not be flattering.',
      ],
      briefing: [
        'A Menhir under your command lets you cast Weavings — the great workings.',
        'Weavings are expensive and decisive. Protect your Menhir; a duel without one is a duel on foot.',
      ],
      choice: {
        prompt: 'Orad asks which of the Circle\u2019s two teaching-rites you will carry into the field.',
        options: [
          {
            id: 'handsel',
            label: 'The Handsel Augury',
            text: 'The reading-rite: ten levels of work to learn the price of the next work. It shapes the ley lines instead of the fighters.',
            flags: { augur: true },
            reward: 'mn-circle',
            outcome: [
              'It takes you four hours to say a sentence that, spoken correctly, takes eleven seconds. Orad watches without expression and then says, "Acceptable", which the Wonder woman later tells you is the closest thing to praise the Circle permits.',
              'You are given an anchor-rite for your own Menhir, and with it, the ability to work the big things — the ones that lift mist off a valley or bring back every name a graveyard has been saving.',
            ],
          },
          {
            id: 'fatebind',
            label: 'The Fate-Binding',
            text: 'The forging-rite: bind one hero to a fate they cannot lose. The Circle dislikes it. The Circle is not wrong to.',
            flags: { fated: true },
            reward: 'wv-fatebound',
            outcome: [
              'You bind a thread of the stone to your own hand. It hurts in a way that is difficult to describe to anyone who was not there — like being handed a receipt for a purchase you do not remember making.',
              'Orad says, "That one has a bill attached." The Wonder woman says nothing, but stops drawing you, which is somehow worse.',
            ],
          },
        ],
      },
      duel: {
        title: 'The Trial of the Circle',
        opponent: {
          name: 'Orad of the Circle', title: 'Warden of the Standing Stone', faction: 'neutral',
          deck: 'syradonia', difficulty: 2, resolve: 16, portrait: 'oradan',
          perk: { name: 'The Circle\u2019s Warden', text: 'Orad begins with a Leyline already attuned to the stone.' },
        },
        taunts: [
          '"You have a Menhir. So do I. Let us see whose ley lines are better arranged."',
          'The old weaver does not attack you. He rearranges the field until attacking him is the only reasonable thing left, and then punishes you for it.',
        ],
      },
      victory: [
        'You do not beat Orad. Orad permits the engagement to conclude, which in Circle language is a distinction nobody outside the Circle bothers to make.',
        { who: 'Orad of the Circle', text: 'You hold a line. That is the whole of it. Most people who come here are trying to win; the ones who live are trying to still be standing.' },
        { who: 'Orad of the Circle', text: 'The Circle names you Weaver. Do not become interesting about it.' },
        'Afterwards, in the dark, the Wonder woman gives you the portrait anyway. It is unflattering in a way that is entirely accurate, and there is a small stone drawn in the corner that you did not notice at the time and that you will think about a great deal later.',
      ],
      rewards: ['mn-valdraeth', 'wv-handsel', 'c-stoneskin'],
      rewardNote: 'The Circle opens its reliquary. Take one working.',
    },

    // ===================================================================== III
    {
      id: 'ch3',
      title: 'Chapter III — The Fallen Tide',
      subtitle: 'Morvalis, and the Houses of Dusk',
      scene: 'morvalis',
      intro: [
        'The Sanctuaries were supposed to be the safe ones. Faith, community, hard work — that is what The Sanctuaries are for. Morvalis ruined that reputation centuries ago and has been cheerfully ruining it ever since.',
        'Morvalis is gothic, passionate, and governed by the Houses of Dusk, who are necromancers in the way that Portavas are sailors: professionally, and with paperwork. In Morvalis, death is not the end of service. It is a change of department.',
        'You arrive at a Morvalian border town called Vaultmere to find the town empty, the doors open, and every grave in the cemetery dug up from the inside.',
        'The Fallen have come up the coast road. Not the Houses \u2014 the Houses are still in their castles, watching through expensive glass \u2014 but the other thing. The thing the Houses keep in their basements and refuse to call an army.',
        'A Morvalian woman in a very good coat is waiting for you on the church steps, entirely unbothered, drinking something.',
        { who: 'Lady Vosch', text: 'You are the Weaver. How marvellous. I am Vosch, of House Vosch, and I have a proposition which you will find distasteful, which is rather the point of propositions.' },
        { who: 'Lady Vosch', text: 'The Fallen tide is led by something that used to be a person and is now a column of rote. My House can hold the road for one night. In exchange I want something from the Menhir\u2019s new favourite.' },
      ],
      choice: {
        prompt: 'Lady Vosch names her price. Do you accept?',
        options: [
          {
            id: 'bargain',
            label: 'Take the Dusk bargain',
            text: 'Accept House Vosch\u2019s terms. Their dead hold the road while you take the field — and a Morvalian blade finds its way into your hand.',
            flags: { dusk: true, debt: true },
            reward: 'mo-mistress',
            outcome: [
              'The bargain is signed in the only ink that stays wet. You do not read the whole of it. Vosch watches you not read it with visible pleasure.',
              'That night, forty of House Vosch\u2019s retainers stand on the coast road — and they are, technically, still retainers, and still standing, and this is a distinction the Houses of Dusk find endlessly amusing.',
              'In the morning, a woman in a black coat gives you a Morvalian blade and a smile that has been practised in a mirror. "You are ours now," she says, "in the way that everyone is ours. It is not a burden. It is a mortgage."',
            ],
          },
          {
            id: 'refuse',
            label: 'Refuse, and hold it yourself',
            text: 'Take the road with what you have. No debt, no Dusk Court watching out of your own shadow — and the knowledge that the tide has one more night to grow.',
            flags: { refuse: true, clean: true },
            reward: 'rl-cindercenser',
            outcome: [
              'You tell Lady Vosch no. She takes it beautifully, which is somehow worse than if she had taken it badly.',
              'You spend the night on the coast road with seven volunteers, a borrowed cinder censer from Valdraeth, and no plan that survives first contact. The Fallen come up out of the surf in ones and twos and then in ranks.',
              'By dawn the road still belongs to the living. Three of the seven will not walk again. You carry the censer onward, and you know exactly what it cost, which is a thing Lady Vosch will never understand and never let you forget.',
            ],
          },
        ],
      },
      duel: {
        title: 'Crypt Lord Athra',
        opponent: {
          name: 'Crypt Lord Athra', title: 'The Fallen Tide', faction: 'corrupted',
          deck: 'fallenTide', difficulty: 2, resolve: 18, portrait: 'fallen',
          perk: { name: 'Undeath', text: 'Athra rebuilds one fallen hero every Clash.' },
        },
        taunts: [
          '"You have killed my soldiers before. You will kill them again shortly. Do try to find it meaningful."',
          'Every time you clear the field, the field does not stay clear.',
        ],
      },
      victory: [
        'Athra does not fall so much as decline to continue. The column of rote comes apart into forty ordinary corpses, which is worse to look at than the thing they had been.',
        'Afterwards, someone from the Houses of Dusk arrives to inventory the bodies. You do not watch.',
        'The coast road is open. That is a sentence that has been worth more than heroism, most years.',
      ],
      rewards: ['mo-necromancer', 'w-bonepact', 'r-boneharvest'],
      rewardNote: 'Salvage from the tide.',
    },

    // ===================================================================== IV
    {
      id: 'ch4',
      title: 'Chapter IV — The Unwriting',
      subtitle: 'Kairos, and the Second Library',
      scene: 'library',
      intro: [
        'Kairos is a nation of self-improvement, and it has libraries the way Hammerstadt has forges: unapologetically, and in competition with itself.',
        'The Second Library was built after fire took the first one. It is stone, it is deep, and it is full of the only copies of things that matter \u2014 censuses, histories, the Pact itself, all nine signatures.',
        'Because of that, the Void is here.',
        'The Void does not burn libraries. The Void is smarter and much worse: it *unwrites* them. Records become blank paper. Names become gaps. You walk into the reading hall and find a hundred scholars holding open books they cannot stop reading and cannot remember starting.',
        'The Void has not sent soldiers. It has sent a negotiation.',
        { who: 'A shape that is not in the room', text: 'You are carrying a copy of the Pact. We would like it. In exchange, we will not come to Haven for one full year.' },
        { who: 'A shape that is not in the room', text: 'One year. Eleven months and some days. Think what nine nations can build in a year, Weaver. Think what they will lose without one.' },
        'It is, undeniably, a good offer. That is the horror of the Void. It does not lie; lying takes effort and implies you matter.',
      ],
      choice: {
        prompt: 'The Void waits. The scholars keep reading.',
        options: [
          {
            id: 'give',
            label: 'Give it the copy',
            text: 'Trade the transcription for a year of peace. The original signatures are in Haven; the copy is a copy. Nine nations get a year to build.',
            flags: { pactgiven: true, year: true },
            reward: 'wv-speaking',
            outcome: [
              'You hand over the copy. The shape takes it with something that would be pleasure in a creature with a face.',
              'The scholars in the reading hall come back to themselves all at once, in the middle of sentences, and the noise they make is not relief, it is grief — because they can remember everything except the thing they were reading.',
              'One of them, a Kairosi archivist with ink to her elbows, realises what you have done and informs you, with perfect courtesy, that you have bought a year with a piece of the only proof that the Pact was ever signed. You will carry that arithmetic for a long time. So will she.',
              'She gives you the working that speaks names back to their owners. "You will need it more than I will."',
            ],
          },
          {
            id: 'refuse-void',
            label: 'Refuse, and fight it here',
            text: 'No bargain with the unwriting. Stand in the reading hall and make the Void come and take it.',
            flags: { defied: true, pactkept: true },
           奖励: null,
            reward: 'nu-grim-compiler',
            outcome: [
              'You tell the shape no. For the first time in the whole of this campaign, something that is not in the room becomes angry, and the anger is not theatrical. It is a silence with an edge, and it goes through the shelves like weather.',
              'Scholars die. Four of them, before the archivists get the doors shut, and they die with their mouths open around words that are no longer available.',
              'But the Pact stays in Elandra, and the Void learns something it does not like learning: that there are things that would rather be undone than written over.',
              'The Grim Compiler — an accountant of the dead, from Haven, of all places — signs on with you before the ink of the day is dry. "Everything is itemised," he says. "Let us itemise that."',
            ],
          },
        ],
      },
      duel: {
        title: 'The Unwriting Comes Anyway',
        opponent: {
          name: 'Devourer of Names', title: 'The Void', faction: 'corrupted',
          deck: 'voidWhispers', difficulty: 2, resolve: 18, portrait: 'void',
          perk: { name: 'Unwritten', text: 'The Devourer exiles cards from your hand as the duel runs.' },
        },
        taunts: [
          '"You will have to fight something you have already fought and cannot remember."',
          'Every Cantrip you hold turns to blank paper in your hand and then back into a Cantrip, slightly worse.',
        ],
      },
      victory: [
        'You do not destroy the Devourer. You *name* it, which in a library is the same thing, and it comes apart into a long list of names it had taken from other people.',
        'The Echo of the Void — the shape it had been in the room — is still there afterwards, thinner, holding a copy of a copy.',
        'It says: "We will be at the stone." And then it is not there, in the way that something that never quite was is not there.',
      ],
      rewards: ['c-unspool', 'wv-coronation', 'r-reclaim'],
      rewardNote: 'Recovered from the unwritten shelves.',
    },

    // ===================================================================== V
    {
      id: 'ch5',
      title: 'Chapter V — The Crowned',
      subtitle: 'The alliance at the seized stone',
      scene: 'mists',
      intro: [
        'They are all three here.',
        'That is the thing nobody in Haven wanted to be true, and everyone who had read the Pact feared: the Tyrant, the Fallen and the Void have stopped squabbling over territory and agreed on a target. The uneasy alliance has become an easy one. What did it, in the end, was the Menhir.',
        'Because the Corrupted did not destroy the standing stones when they took the east. They took them. And they have been quietly, patiently, horrifically *weaving*.',
        'On the plain beyond the seized border, in a ring of mist that never moves, there is a standing stone that is not grey. It is crowned, and it is gold, and it is singing \u2014 not metaphorically: the ground carries a note, all the time, and it is in a key that makes your teeth ache and your leylines attune themselves without being asked.',
        { who: 'Guardian Maren', text: 'That is a Crowned Menhir. Nine of them, one for each nation, and if they finish the ninth the mists will not stop at the coast road.' },
        { who: 'Guardian Maren', text: 'I will not lie to you about the odds. We are going to attack an enemy who has what we have, plus three armies, plus a stone that does their attuning for them.' },
        { who: 'Guardian Maren', text: 'What we have is that you are a Weaver, and they are three powers who hate each other, and hate is a rope that frays.' },
      ],
      briefing: [
        'Boss duel: your opponent starts with more Resolve and rebuilds their board.',
        'Weavings win long games. Drag it out and the Menhir will pay for itself.',
      ],
      choice: {
        prompt: 'Maren lays out the assault. Where do you commit?',
        options: [
          {
            id: 'flank',
            label: 'Take the leyline flank',
            text: 'March the long way and attune the seized leylines before the battle. Slower, but it makes every nation\u2019s banner arrive on the field at once.',
            flags: { flank: true, unity: true },
            reward: 'cl-muster',
            outcome: [
              'It takes two extra days and costs four horses, and it works exactly as intended: you arrive on the flank with the ley lines of three realms already singing in your hand.',
              'A Urdrevan thane and a Hammerstadt shift-warden argue about precedence for eleven minutes, then decide to be angry about it together, which among those two nations is functionally a treaty.',
              'They give you a muster-hall banner, stitched with the marks of every nation that answered. It is the ugliest object you have ever carried. You would not trade it for the Crowned Menhir itself.',
            ],
          },
          {
            id: 'spearhead',
            label: 'Lead the spearhead',
            text: 'Straight in at the Crowned Menhir, fast, before the ninth stone is finished. Highest risk, and the only chance the crown does not vote.',
            flags: { spearhead: true, bold: true },
            reward: 'wv-sundering',
            outcome: [
              'You go in fast, at dawn, with a column of Haven volunteers and no reserves.',
              'It is the kind of plan that only works because nobody expects it, which means it works for about forty minutes and then becomes a very ordinary disaster with heroes in it.',
              'You reach the ring. You see the ninth stone, half-carved, with a shape kneeling over it that used to be a person and is now a procedural document.',
              'The Circle gives you the Sundering. They have used it once before. They had to be asked twice.',
            ],
          },
        ],
      },
      duel: {
        title: 'The Crowned Menhir',
        opponent: {
          name: 'Warlord Kurrash the Boreal', title: 'First of the Crowned', faction: 'corrupted',
          deck: 'tyrant', difficulty: 2, resolve: 22, portrait: 'tyrant',
          perk: { name: 'The Crowned Stone', text: 'Kurrash attunes freely and begins with a Menhir already standing.' },
        },
        taunts: [
          '"You brought a rock. We brought three."',
          'Kurrash does not fight you. Kurrash files you, and the filing is done with a warhammer.',
        ],
      },
      victory: [
        'Kurrash falls in the ring of mist, and the note the ground has been carrying all this time changes key.',
        'Someone in the Haven line starts laughing. Someone else is being a Syradonian and counting the wounded. The mist does not lift, but it does step back, the way an animal steps back when the thing in front of it turns out not to be finished yet.',
        'You take the half-carved ninth stone with you. Nobody argues about it. Everybody has seen what it was going to be.',
      ],
      rewards: ['r-standing-stones', 'r-reclaim', 'wv-openroad'],
      rewardNote: 'The spoils of a crowned stone.',
    },

    // ===================================================================== VI
    {
      id: 'ch6',
      title: 'Chapter VI — The Final Stand at the Menhir',
      subtitle: 'Haven, and the whole of Elandra',
      scene: 'finale',
      intro: [
        'They come to Haven on the last day of the season, which is either a strategy or a habit of history. Mist rolls across the field the Gods made, and the nine banners come down off the tents and go up on the ridge, and for the first time since anybody can remember, they are all facing the same way.',
        'The Corrupted have not brought an army. They have brought an *outcome*: the three of them together, the Crowned stones circling them like a court, and a single working already half-complete that you can feel in your teeth from a mile off.',
        'It is the Unwriting, aimed at the Menhir itself. They are not going to destroy the stone. They are going to edit it out of the record, and then it will never have been, and then neither will Haven, and then neither will you, and there will be nobody left who noticed.',
        'Maren stands beside you with a spear she cannot lift and does not put down.',
        { who: 'Guardian Maren', text: 'You are a Weaver. Whatever else is true about today, that is the shape of it: you are the only person here who can agree with the stone, and the stone is the only thing they cannot rewrite.' },
        { who: 'Guardian Maren', text: 'Be the agreement, then. We will be everything else.' },
      ],
      choice: {
        prompt: 'The last working needs a keel. What do you anchor it to?',
        options: [
          {
            id: 'unity',
            label: 'The nine nations',
            text: 'Anchor the working to the banners of all nine nations — every realm, every guild, everyone who came west when they could have run.',
            flags: { unity: true },
            reward: 'r-reclaim',
            outcome: [
              'It takes eleven seconds and nine arguments to set the anchor, which by Elandran standards is instantaneous.',
              'The Crownlands bring fire, the Sanctuaries bring stone and faith, the Commonwealth brings the road, the ledger and the fleet. Avereaux brings poetry, which turns out to be structurally load-bearing, to the visible disgust of Hammerstadt.',
              'The working holds. Not because it is strong, but because there are so many hands on it that dropping it would be a decision, and nobody here is making that decision.',
            ],
          },
          {
            id: 'alone',
            label: 'Yourself',
            text: 'Anchor it to one Weaver, alone at the stone. It will work. It will cost what it costs.',
            flags: { alone: true, sacrifice: true },
            reward: 'wv-fatebound',
            outcome: [
              'You put your hand on the Menhir and you are, for about eleven seconds, the only thing between Elandra and a blank page.',
              'No nine-way argument. No rescue. Just a Weaver, an agreement, and the arithmetic of a life for a land.',
              'You are still here afterwards, but something gets left behind — a name, a year, the exact shade of a particular afternoon. You will spend a long time noticing the shape of the hole. Nobody else ever will.',
            ],
          },
        ],
      },
      duel: {
        title: 'The Alliance of the Three',
        opponent: {
          name: 'The Corrupted', title: 'Tyrant \u00b7 Fallen \u00b7 Void', faction: 'corrupted',
          deck: 'fallen', difficulty: 3, resolve: 24, portrait: 'finale',
          perk: { name: 'Three Powers', text: 'The Corrupted begin with two Menhirs and rebuild steadily. Weavings and endurance win this one.' },
        },
        taunts: [
          'Three voices, one working, no agreement between them except about you.',
          '"You have done well to get this far. We will keep the record of it. Briefly."',
        ],
      },
      victory: [
        'The working breaks. It does not break all at once \u2014 it breaks the way a rope breaks, which is to say it holds and holds and then is two ropes.',
        'The Tyrant\u2019s ledger burns in the mist. The Fallen lie down, finally, in their own graves, and are allowed to be finished. The Void does not leave so much as *stop being written*, which is the only ending available to it.',
        'The Menhir is still standing. It is still grey, and unimpressive, and about the height of two people, and a dog could lean on it.',
        'Elandra is not saved. Elandra is, however, still written down, in nine nations\u2019 hands, with the whole of the west still held and the east still to take back \u2014 one field at a time, the way it was always going to have to be.',
        'The banners come down off the ridge. The arguments resume within the hour, because that is what nations do, and because the sound of nine nations arguing about nothing is, at last, the sound of a thing that is going to survive.',
      ],
      rewards: ['wv-coronation', 'r-starsong', 'mn-haven'],
      rewardNote: 'The Menhir gifts the Weaver a last working.',
    },
  ],

  endings: [
    {
      id: 'unity',
      when: (flags) => flags.unity && !flags.sacrifice,
      title: 'Ending — The Ninefold Weave',
      text: 'Haven keeps a permanent council now, with nine seats and one stone. It is slow, it is loud, and it has never once been unwritten. You are given a seat, which you accept on the condition that you are allowed to keep adventuring, which is agreed to in the manner of people who have already decided to ignore the condition. On the anniversary, they read the Pact aloud \u2014 the whole of it, all nine signatures, in nine accents. It takes two hours. Nobody leaves.',
    },
    {
      id: 'sacrifice',
      when: (flags) => flags.sacrifice,
      title: 'Ending — The Weaver Who Stayed Behind',
      text: 'You hold the working alone at the stone, and something of you stays in the stone when the rest of you steps back. You are still yourself. You are simply smaller in a place that used to be bigger. Haven raises a statue, and it is a good statue, and you have to explain to four separate nations that you are not, in fact, dead and would prefer not to be treated as a relic. On the anniversary, you walk to the Menhir and put your hand on it, and it knows you, and that is enough.',
    },
    {
      id: 'defiant',
      when: (flags) => flags.defied || flags.refuse,
      title: 'Ending — The Unbought',
      text: 'You refused the Dusk Court and you refused the Void, and both refusals cost you something you can name and something you cannot. Elandra is still written down, and it is written down because nobody ever managed to buy the quill out of your hand. Morvalis sends a letter, once a year, with the same four words: "The offer stands." You have never once replied.',
    },
  ],
};

export const CHAPTER_ORDER = ['prologue', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6'];
export const chapterById = (id) => CAMPAIGN.chapters.find(c => c.id === id);
