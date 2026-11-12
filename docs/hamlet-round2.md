# Hamlet, round 2: first playthrough (for discussion, nothing decided)

The tutorial design is in the Claude Doc "Greenhollow: the first five minutes" (https://claude.ai/artifact/7YntvnAEi49eqLUkR1JEqJ).

The owner's first playthrough of the Hamlet (v116, steps 1-8). Nothing here is decided: each point has what was found, why it happens in the code
today, and the questions to talk through. The ideas written down before playing are at the end.

## Decided in discussion (after the first playthrough)

**Order of work: farming first, then the opening, then building.** If the first five minutes are not fun we lose most players.

1. **Farming first.** Make working the land feel good before anything else is built on it. Try several control schemes in the game and pick by
   playing (see "Farming: options to try" below). The talk engine is not touched for now.
2. **The opening teaches farming, then hands you a person.**
   - You start with **your own bed inside a fence** (your yard). The trader has his stall.
   - **The trader walks you through farming**: lay a small field (3 x 3), work it and sow it. He talks you through it in his own words, with the
     field's layout drawn on the ground the first time.
   - When the 3 x 3 is planted, **the trader offers you a bed**. Put it down and **the first newcomer arrives**.
   - **The newcomer takes over the tutorial**: talking to them is mostly the tutorial. They tell you what would make them comfortable: a bed,
     a fence round it (their yard), their own field. Layouts on the ground the first time you build a field, a yard and a house.
   - From there you build a lot of things quickly.
3. **Villagers teach.** The game is about the people, so the people explain it, not boxes. A layout on the ground helps for the first field,
   the first yard and the first house.
4. **The player's chat**: an option is offered only when the player has something worth saying; for now remove the small-talk options from
   the player's menu and change nothing else. Villagers among themselves stay as they are.
5. **Talk is left alone** (the chatter and repetition are not game-breaking): no changes to how often villagers talk for now.

### Claude's notes on the opening
- **Planting must not mean waiting.** The newcomer comes when the field is *sown*, so the first harvest happens in the background while you build
  for them. The first crop should still be quick (a turnip-speed crop, a few real minutes at normal speed) so the first sale comes soon.
- **Who pays at the start**: the trader's first bed is a gift (he is setting you up); after that you pay, with the money from the first harvest.
- **One voice at a time**: the trader teaches until the newcomer lands, then the newcomer; the request pill can stay as the "what next" reminder.
- **The trader's stall** should be usable whenever you need it during the tutorial (problem 1).
- The other problems (2, 4 to 7, 10) fold into this: one thing to buy at a time (the teacher tells you), gates you can walk through, private gates,
  whose bed is whose, a stall nobody blocks. They are designed with the opening, not separately.

### Farming: options to try (prototype several, play them, pick)
- **A. As it is**: bump a plot to plough, bump again to sow, bump a ripe one to harvest; the tool is picked for you.
- **B. A farming mode (F)**, like build mode: its own hotbar (hoe, seeds, harvest basket), an outline on the tile you will work, hold the key to
  work a whole row as you walk; inventory sorted into farming and building.
- **C. Walk to work**: choose a seed and walk over the field: every tile you step on is ploughed, sown or harvested in one pass, with a small
  delay per tile; nothing to aim.
- **D. Point and click**: click or tap tiles (or drag across them) and your villager walks there and does the work, queued.
- Things that make any of them feel good: a sound and a little burst for each action, the crop visibly growing, the harvest flying into the bag
  with a count, the first crop growing fast.

## What the playthrough found

### 1. The trading stall is never open; everybody chats instead
- **Why:** the trader keeps hours (6:00 to 19:00) and only serves while he stands behind the stall; the rest of the time he wanders, eats and
  chats like anybody, and the stall says it is closed.
- **Questions:** should the stall be open whenever you want it (an honesty box when he is away, or he simply never leaves)? Or keep hours, but
  make them obvious (a sign, his routine)? Is "the trader" even a person you need to find, or a place?

### 2. Not clear what to buy; "I only need one option"
- **Why:** the menu lists every seed and every building item, one and five of each, plus selling.
- **Questions:** one recommended purchase for where you are (a bundle: "everything for the family's yard")? Or the villagers ask for the thing
  and the shop only sells that? Or no shop at the start at all?

### 3. Needs a walkthrough at the start
- **Why:** there is only the request pill ("1/5 · Shelter the family") and a chronicle line. Nothing shows you where to go or which key to press.
- **Questions:** how hand-held? A strip of instructions with an arrow, a layout drawn on the ground (the blank island's first hut has one),
  a villager who walks you through it, or a scripted first day?

### 4. Unclear whose bed is whose; cannot get through the gates I build
- **Why:** a bed's owner shows only as its blanket colour (grey when free). Gates are loose blocks like walls, and outside build mode a bump into
  a loose thing pushes it, so walking into your own gate shoves it instead of going through.
- **Questions:** how should ownership show (a name over the bed, a sign on the gate, colour per household)? Should gates and fences be fixed once
  a yard closes, so only build mode moves them?

### 5. The buying UI is awful
- **Why:** the player's shop is the villagers' conversation (the keeper's lines plus a list of choices), which reads fine as NPC chatter and
  badly as a shop.
- **Questions:** a proper shop panel (items with icons, prices, buy and sell buttons)? Or buying from the build menu directly (pay as you place)?

### 6. NPCs block the stall chatting, and chat to the keeper at work
- **Why:** where two villagers stand to talk ignores stalls, and the square's idle tiles include the stall front. The keeper is "idle" between
  stretches at the stall, so others walk up to him.
- **Questions:** fairly clear: nobody talks in front of a stall, nobody chats to a keeper at work. Anything more?

### 7. Every villager can use every gate
- **Why:** walking is the same for everybody (there is no "whose gate"), and a gate is just a passable tile.
- **Questions:** private gates (only the household and you)? What about visitors, the keeper, children, a partner who lives elsewhere?

### 8. The player's chat is small talk; it should be useful
- **Why:** the player's menu offers every act the villagers have that fits (weather, remarks, jokes ...), up to five, with one small-talk remark
  always in.
- **Questions:** what should the player talk about? Suggestions so far: what a villager needs, what to build next, what you need, romance.
  Villagers among themselves stay as they are. Hide small talk entirely, or keep one "chat" option?

### 9. Too much chatter; it will get dry fast
- **Why:** the talk was tuned for a busy village; with five people the same people meet every hour and say what they have.
- **Questions:** talk much less: a greeting and a complaint (nowhere to sleep, hungry), then wait for something to happen and react to it (a bed
  appears, a fence, a field)? How often is right?

### 10. Start with a bed and a small house; the trader has nothing; nobody sleeps until they have a bed
- **Why:** the start gives you a loose bed in the open and the trader a yard and a bed; people without a bed sleep on the ground by the square.
- **Questions:** your own small house from the start (four walls, a door, a bed)? The trader with only his stall? Nobody sleeps without a bed:
  they stay up, get tired and say so (what happens when they are exhausted?).

### 11. More to come
The owner will play more; this list will grow.

## Ideas written before playing (backlog, for discussion)

1. **Farming first.** Working fields as the player is clumsy. Before more systems, try a variety of farming controls, perhaps a farming mode
   beside the build mode (its own hotbar and inventory). If farming is not fun the game has a problem.
2. **Building is unseen.** Time stops while you build, so nobody knows why things change except the player. Villagers are surprised by what
   appears or disappears, talk about it, are confused, and accept it as how the island works. Not "I saw you build that house" but "Where did
   that house come from? It wasn't there yesterday" or "Have you seen the garden outside Flora's house?". Text and witnesses for world changes
   need to change.
3. **Theft of property.** Now that people own things, theft becomes possible, by desperate villagers or by the player, seen through NPC
   TrueSight. No law enforcement yet: people just dislike the thief, strongly.
4. **Rent from decoration and taste.** The more a home has, the more rent. Housing (size, walls, floors, windows), facilities (toilets and
   amenities), outdoor space (garden, fence area, landscaping), decoration (furniture, plants, ornaments), personal taste (themes: botanical,
   industrial, rustic, luxurious, minimalist, religious, colourful, practical), comfort (completeness). Households ask for things when they can
   afford more, or for what would earn them more (more field, better seed, workers, later a mine) when they cannot. It gives each home a
   personality and the island things to talk about ("Have you seen Marcus's new garden?", "I love the new flowers outside my bedroom"). Start
   very small: there is a lot of art to make.
5. **More story from building.** How does building make an interesting story between people? Show the player only the most interesting
   conversations?
6. **An auto-player** that builds like a player, listens to requests and meets them, plays hundreds of hours and reports on its experience:
   balance, economy, what is fun and what is tedious.
7. **Clean up the UI.** Fewer menus, only useful information.

## Where things stand
- `main` has steps 1 to 9 of the minimum game (v116 is published with steps 1 to 8).
- Branch `hamlet-tuning` has unmerged tuning work, with no full suite run yet: a bug where the trader made food out of nothing every morning is
  fixed, the harness has knobs for trying numbers, and it tracks what households earn.
- Some first code for this round was started and is set aside (`git stash`, "round2 first code") until we have talked.
