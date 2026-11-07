# Greenhollow: project notes

Carried over from the browser Claude conversation. Last published artifact version: 148
(https://claude.ai/artifact/GKo6oFqsjgoswEC1KvDTwy).

## State at version 148
A Roman town: Roman names, coins, bakery, smithy, shop, street-food counter, public baths and
a jail, all built on a shared event and gossip core. Every new system has an on/off switch in the
Stories tab. Tested only by driving keyboard controls from scripts in a headless browser, not
played by hand on a real screen or phone.

### Controls (changed after v148: the E menu is gone)
- Walking into something does the obvious thing: talk, search a crate, buy at a counter.
- Hold Space and walk: push crates and people (harmless, no events); step back to pull a crate.
- Hold Shift: sneak (pick a pocket, steal, pick a lock, wreck). Hold or tap E: help/use (lend a hand, give, wake, knock, look).
  Hold R: the hostile shove. Tap C: follow. Tap Z: sleep in the cells. A Mode button does this on touch.
- Dropped in the change: the "Distract them" verb is no longer reachable from a key.
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
3. ~~Villager goals so the town is eventful without the player.~~ Partly done: the social simulation (Nov 2026, below).
   Still to do: ambitions that drive plans (a better job, a house, a marriage), opinions of businesses and traditions.
4. Roman art: guards, temple, baths, shops.
5. Real check on a phone.

## Findings from the move to the repo (Nov 2026)
- Unattended 12-day runs (seeds survival-a/b/c): no starvation; the dole fires 5, 13 and 8 times. Food is still propped up.
- Simulation speed: about 0.6 s per game-day.
- The "Play as" button on the villager card is switched off in code (`'' && canControl(n)` in ui/panels.ts).
- Eight functions were defined twice (funerals, weddings, priest, grave visits); only the later versions in
  ceremonies/ceremonies.ts ever ran. The dead copies were removed.
- Tree sprites check for a 'pine' kind that treeKind() never returns (render/village.ts); harmless.

## Conversation overhaul (Nov 2026)
Replaced the tone-key prototype. See CLAUDE.md for how it works. Done: no tone selector (the sentence carries the attitude), layered facts
(hint, story, hidden truth) with willingness by trust and voice, nine voices, generated lives and old stories (debts, feuds, old flames, secrets,
legends), memory of what you said, witnesses who mention a shove, events and the tide and shops and the chronicle as talk, lies and rumours
(NPCs smear rivals too), the arrest / blackmail / dice / flirting as things you can say, walk-with-me when they have to go.
Ideas next: more events from the simulation (what people talk about is limited by what happens), a journal tab for what you have learned,
NPCs contradicting each other when you compare notes, weather, more voices per situation, free-text input through a language model (needs a server),
more tangents, jokes and stories per personality, children's talk, family disputes that develop over days.

## Conversation research, phase 0 (Nov 2026)
Tools: `node tools/longevity.mjs <days> <talks/day> <turns>` (freshness and readability over many days; `--file=` to compare builds),
`node tools/sift.mjs <days>` (story-shaped patterns in the event log). Tests guard readability and a week of freshness.

Findings (30 game days, 6 talks a day, 10 turns each, about 170 sentences heard per day):
- Wording wears out in about a week: new sentence templates fall from ~76% on day 0 to ~10-13% from day 10 on.
- New information keeps coming: ~25% of what people tell you on days 10-29 is new to you (6-15 new facts a day).
- Left alone, the village makes little story material: 3.2 events a day (mostly dice and smells), 1.9 story-shaped
  patterns a week (nearly all romance), no revenge, betrayal, feuds, rumours or spectacles. All systems are switched on;
  grudges need a victim who knows the culprit, and unseen thefts never give one.
- Experiment A (Valve-style rules + grammar + choosing lines by what the listener heard least recently) removed the top
  repeats ("NAME, of all people." 117x) but did not move the long-run curve (12.7% -> 10.1% new templates, days 10-29).
  Keeping 30% new would need ~50 new templates a day; that cannot be hand-written. Rules are hygiene, not the strategy.
- Readability is fine (Flesch ~95, ~6 words a sentence, ~15 words a turn), perhaps choppy. No broken text.
Conclusion: longevity has to come from new situations (the simulation) and new information, with expression kept tidy.
Next: villagers with motives (borrow/lend and debts, quarrels, favours, courtship, family friction, work rivalry),
story threads found by sifting, rumours that change as they spread; measure with sift (stories a week, share of villagers
in stories) and longevity (new facts a day). Cut stand-alone filler reactions ("Hm.", "Ha!").

## Autonomous social simulation (Nov 2026)
Design and measurements: docs/social-simulation.md; how it works: CLAUDE.md. Villagers talk to each other with consequences, stories change as they
travel (and get pinned on the wrong person), feelings have reasons, people know who dislikes whom, loans are made, repaid and defaulted on,
people fall ill and are visited, and 60 days of this run before the player arrives. Story patterns a week: 1.9 -> 43; villagers in stories 11/27 -> 24/30; new facts in conversation, days 10-19: ~25% -> ~37%.
Found on the way: children could not eat dole grain handed to them (it went into their pockets), so a famine killed children first; fixed,
with parents now fetching or foraging food for a hungry child. Starvation over 9 towns x 12 days: 3 -> 0.
Next: opinions about businesses and traditions; villagers who investigate a theft and change their minds; invented rumours from villagers;
a journal of what the player has heard, with the versions side by side; a "rumour outran the truth" pattern that actually happens.

## TrueSight: Nox-style line of sight (Nov 2026)
Replaced the old visibility (a tile-by-tile Bresenham test out to a radius, blurred into the lighting texture, with a radial fade at the edge,
ignoring doors, letting diagonal wall corners leak) with a visibility polygon (render/truesight.ts). See CLAUDE.md. Proved on a test ground
(tools/truesight.mjs) with rooms, an archway, a shut door, a corridor with corners, windows, trees, a shed, diagonal walls and people walking behind them.
Cost: ~1 ms per recompute at normal zoom, ~0.6 ms more per frame on average. Next: give NPC perception its own `tsLine`-based sight (with doors),
so witnesses, gossip and guards respect closed doors too; decide whether walls should be thinner than a tile (doorways are short tunnels now,
so you only see into a room from roughly in front of its door).

Revision (Nov 2026): the first TrueSight cast against every tile (trees and rocks included) and showed hit tiles as squares. Now only buildings block
sight, as polygons of straight wall segments, so edges are straight sight lines like Nox (a diagonal beam through a door, a clean wedge behind a shed);
and it is about four times faster. Still to decide: NPC perception on `tsLine` (doors would then stop witnesses), thinner wall art.
