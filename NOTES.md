# Greenhollow: project notes

Carried over from the browser Claude conversation. Last published artifact version: 148
(https://claude.ai/artifact/GKo6oFqsjgoswEC1KvDTwy).

## State at version 148
A Roman town: Roman names, coins, bakery, smithy, shop, street-food counter, public baths and
a jail, all built on a shared event and gossip core. Every new system has an on/off switch in the
Stories tab. Tested only by driving keyboard controls from scripts in a headless browser, not
played by hand on a real screen or phone.

### Controls
- Walking into something does the obvious thing: talk, search a crate, buy at a counter.
- Space + walk forces it: push a crate or shove a person. Pushing a crate into a wall swaps you with it.
- E (or the More button on touch) lists other actions on whatever is in front of you: pick a pocket,
  steal, wreck an oven, pick a lock, follow, give money, distract, lend a hand, inspect.
- Every conversation has "Something else...": ask for news, pass on news, spread a rumour, flatter,
  insult, ask for a secret, blackmail, flirt, introduce people, play dice.
- A hint line shows what you are facing.

### Playtest: what works
- Seen vs unseen crime: victim reports, watchman catches you 1-2.5 game-hours later; unseen pickpocketing
  is noticed 1-2 hours later and only witnesses can name you.
- Rumours spread (one reached 14 people in a game-day); Stories tab shows who told whom.
- Arrest choices all lead somewhere: pay the fine, go quietly, bribe, deny (works if evidence is only
  gossip), run. Picking the cell lock gets you out; the watch finds the empty cell ~40 min later.
- Emergent stories: Corvus caught Galba cheating at dice; Varro seen kissing Gaia, Albina found out.

### Playtest: what doesn't work yet
- Food: first version starved ~a dozen villagers in 11 game-days. Fixed with fewer settlers, more
  fields, a bakery that only takes spare grain, free bread for the starving, and a Roman grain dole.
  Three 12-day runs had no deaths, but the dole fires 14-21 times per run in two of three, so food
  is still tight and propped up.
- Left alone the town is quiet (dice, drunks, smells, charity, the odd affair). Villager crime is rare
  and usually unseen, so the watch seldom arrests anyone unless the player causes trouble.
- Running from the watch almost always fails (guards 20% faster). Picking the cell lock is too easy.

### Awkward
- Player needs keep running while scheming (wet himself, nearly starved during a heist).
- Taking control of a tradesperson stops their shop; the starting character is never given a trade.
- "Something else..." is long; spreading a rumour takes three menus.
- Buildings still use medieval art, bath pool is plain, church is still the Flying Spaghetti Monster one.
- Not done: butchers, illness, weather, animals.

### Bugs fixed in this round
Bedtime auto-walk leaving the cell; E list empty (facing direction bug); street-food cook walled in;
double arrest for one crime; arrest message misquoting the crime; smell gossip drowning other stories.

### Performance
One game-day of simulation ~0.75 s. Headless frame rate ~50 fps (was ~54).

## Technical advice from that session
- Stay on JavaScript, move gradually to TypeScript. Rust would not help yet: cost is pathfinding and
  drawing, not the language. A hot spot could later move to a worker or small Rust module.
- Biggest risk: the game is one 1 MB HTML file. The seven new systems were written as separate source
  files joined by a build script. Do that for the whole game: modules for simulation, AI, world,
  interactions, rendering and UI, built into one file for publishing.
- GitHub: private repo, main always playable, one branch per feature, small commits.
- Automated tests: turn the headless runs (12-day survival, crime scenarios, frame rate) into tests
  that run on every change.
- Don't let two tools edit the same branch at once.

## Ideas: more ways to meddle
Plant stolen goods then tip off the watch; forge a love letter; rig dice; pay a drunk to start a fight;
bribe a watchman (look away / arrest someone else); hide a key worker's tools on market day; lock
someone out of the baths; rumour that the well is cursed; fake illness to dodge work; matchmaker or
turn friends against each other; loan coins with interest and send a collector.

## Next steps (in order)
1. ~~Repo with modules and tests before adding more.~~ Done (Nov 2026): 43 TypeScript files under src/,
   a build to dist/index.html, zero type errors, automated tests (see CLAUDE.md). Still to do here: turn
   the crime scenarios (purse snatch seen/unseen, arrest choices, cell lock) into tests, and the
   frame-rate check; gradually replace `any` with real types.
2. Rebalance food so the dole is rarely needed.
3. Villager goals (better job, marriage, revenge) so the town is eventful without the player.
4. Roman art: guards, temple, baths, shops.
5. Real check on a phone.

## Findings from the move to the repo (Nov 2026)
- Unattended 12-day runs (seeds survival-a/b/c): no starvation; the dole fires 5, 13 and 8 times. Food is still propped up.
- Simulation speed: about 0.6 s per game-day.
- The "Play as" button on the villager card is switched off in code (`'' && canControl(n)` in ui/panels.ts).
- Eight functions were defined twice (funerals, weddings, priest, grave visits); only the later versions in
  ceremonies/ceremonies.ts ever ran. The dead copies were removed.
- Tree sprites check for a 'pine' kind that treeKind() never returns (render/village.ts); harmless.
