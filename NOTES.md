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

Second revision (Nov 2026): walls are full-thickness solids again (the line-down-the-middle version cast shadows from the wrong places): outer corners
cast from the outside point of the corner tile, door beams from the inside corners of the door frame. A viewer at 45 degrees to a door sees only a sliver
(a one-tile doorway through a one-tile wall); in front of the door the beam is full width. Thinner wall art would make side views of doors more generous.

## One-key controls (Nov 2026)
Replaced the five held keys with a single Shift toggle (crouch). Standing: talk, buy, push barrels and crates, fell, fish, gather. Crouching: push past people, search barrels.
Removed: pickpocketing, pulling crates, Space/E/R/C/Z. Registered but unreachable until they get a standing/crouching case: steal, pick a lock, wreck, rough shove, give,
wake, follow, distract, lend a hand, knock, inspect. Open: what crouching should do for noise and for who notices you (nothing yet), and which of those verbs come back.

## Talk pass 2: natural speech, answers that answer, overheard talk from the simulation (Nov 2026)
Asked for: a review and pass over chat and text so it sounds natural and lasts hundreds of hours. Decided with the owner: contractions everywhere;
keep the whimsy (the Noodle, the Privy Council, the goose); rebuild what villagers say to each other from the simulation; let the player ask about
people, places and events they know.
Review findings (lint over 6 days, seed `lint`, before -> after): uncontracted speech 50 -> 0 per 100 sentences; replies that ignored the question
(most follow-ups fell through to "the next layer" of whatever was being discussed) -> every follow-up has its own answer; clunky pivots
("…Also.", "Which — look, it connects —") 4 -> 0; full names and clock times read out from the chronicle 14 -> 0; people naming themselves or the
player in the third person 12 -> 0; adults saying children's lines 6 -> 0; people telling news about themselves as gossip 4 -> 0; canned overheard
pairs repeated up to 6x -> at most 3x; "about Nonna took …" grammar -> 0.
What changed:
- `dialogue/cv-speech.ts`: `cvSpeak` contracts every line on the way out (talk box, options, bubbles, Overheard), careful at clause ends.
- `dialogue/cv-answers.ts`: an answer per question (what somebody is like, from traits/work/feeling; how somebody is taking it, from their mood;
  how they know, from where the story came from; how an old story started; the details of a regret/pride/fear), plus ask-about (people, news,
  old stories, places) with "never heard of it" leading to you telling them.
- Lives have follow-ups (`CV_REGRET` etc. are objects: how, what they would do differently, can it be put right, who saw, since when); 16 legends;
  18 secrets; new states from the sim (grief, debts and loans owed, a new job, courting, children by name, a sick child, drunk, lonely, living in a tent).
- `social2/sb-voice.ts`: the words of every social exchange (vent, praise, console, row with its real cause, argue, court, borrow with the amount,
  repay, confide, leak), gossip in the teller's own version (`sbNewsLines`), and small talk from their lives (`sbSmallTalk`, which replaced the
  canned `makeConvo`): children and spouses by name, where somebody they both know is right now, news they share, crops and fish and prices,
  the tide, village changes. Lines are picked by what the player has heard least recently.
- Market Hall side effect fixed: villagers no longer get recruited as street traders every few hours once sellers are indoors.
Measured (30 days, 6 talks a day, seed `longevity`, main -> this pass): distinct sentence templates 37% -> 45%; new templates days 0-9 54% -> 68%,
days 10-19 34% -> 39%, days 20-29 20% -> 27%; facts new to you on days 10-29 48% -> 71%.
The most repeated lines are now goodbyes; the per-voice goodbye banks are wider.
Tools: `node tools/lintalk.mjs [days] [talks] [turns] [seed] [--show=rule]`; a test runs it for 3 days and wants nothing flagged.
Next: the authored scenes (`opinions-scenes.ts`) still offer some short labels rather than sentences; more legends and lives keep the
long tail fresh; a journal of what the player has learned would make ask-about easier to steer.

## Fields and corners (Nov 2026)
Found: a ploughed plot looked exactly like untilled soil (the crop painter skipped any plot without a growth stage, and the original game never had separate
ploughed art), and the four outer corner tiles of every building were black notches from inside (no sight line reaches a tile whose neighbours are all wall).
Done: untilled (`crop_raw`), ploughed (`crop_0`) and growing plots now look different and join without seams; the player can sow any ploughed plot (before, nothing
happened until the whole field was ploughed, with no word about it); the wall-top corner tile no longer draws the inner shading stripes that showed as a stray
line along the bottom wall; TrueSight shows the corner tile at an inner corner. Tests: walking into a field ploughs then sows it and each stage is drawn differently;
the TrueSight ground checks the four room corners.
Also seen: on the build before the talk pass farmers ploughed 8 plots and sowed nothing in 10 days (the Market Hall recruited them as street traders; fixed in
`staffMarkets`); now 127 plots ploughed and sown and harvested in cycles, though resowing lags a day or two when only one farmer is about. Worth a look: more farmers
when the fields are big, and a farmer who is ill or asleep for a day shouldn't stall a whole field.

## Items and the hotbar (Nov 2026)
Decided with the owner: Minecraft / Eye of the Beholder style inventory; Shift and crouching removed; actions explicit (talk means talk; dynamic selection maybe later);
villagers will own real items and work just like the player (for quests, stealing, deeper talk); iron comes occasionally from breaking rocks; the smith turns ore
straight into tools; one tool per villager for their job to start; rocks regrowing is left for later; the player starts with the whole kit while testing.
Order: 1 item model + 2 hotbar, hand modes, bag (done) -> 3 real tools for villagers with wear, the smith and iron (with safety valves: slow wear, bare hands
work slower rather than not at all, everyone starts with their tool, the caravan can sell iron, a long starvation test with wear on) -> 4 seed types, a garden plot,
a seed seller -> 5 locks and lockpicks -> 6 the mill and planks.
Steps 3-6 done: villagers' tools are real (wear in step with toolQ, replaced when bought); the player's tools wear and break; iron ore from about one rock
in five; the smith sells each tool, buys ore and sells lockpicks to friends; barley, turnips and beans with their own pace and food; a garden by home that farmers
leave alone; the Taberna sells seed; lockpicks open houses barred at night (they snap ~30%, sleepers may hear); the Sawmill with a Miller hired when food is at
least 0.45 days and four workers have no trade (the Miller fells his own logs; logs never pass through the larder). Starvation tests still pass.
Found on the way: barrels in the sawmill sealed off the saw bench whenever the door was on the top side; the furniture now leaves both ends clear.
Next ideas: tools of the wrong kind for a villager's day task could slow them; steal tools from homes (Search in a house) and have owners notice;
quests from the tool economy (a lost axe, iron for the smith); seeds for villagers' own gardens.

## Sokoban pushing (Nov 2026)
Asked for: pushed things move at the player's pace, chain pushing, pushable rocks to build with, pushing through doorways into houses, movable light furniture.
Done in `life2/push.ts`: a pushed thing is drawn following the player's step (constant one-tile gap, measured to within 0.02 across a three-piece line); lines of up to
three; rocks turn into loose rocks; loose things may cross a doorway; chairs, beds and the family barrel move inside their room with the room's lists, the bed owner's
`n.bed` and the pantry spot moving with them, refused when somebody is using the piece or when it would cut a seat, bed or the pantry off from the door.
Not done / ideas: tables are not movable; furniture cannot leave its room; loose rocks are not quarried by stonecutters; NPCs do not tidy rearranged furniture
(they carry on, but a plan made before a move may walk to the old spot); a door with a crate on it is handled by the old trapped-villager rescue; pushing onto a
site could count as delivering materials.

Second pass on pushing: furniture goes out through the door and can come back; a line against a wall swaps you through it piece by piece; pushed boxes shove people
aside; villagers no longer tidy, rescue or haul (flag `LF_NPC_MOVES_THINGS`, for now). The sideways box: a pushed box followed the player's *next* step if a new step
began before a frame was drawn (the box drew itself with the wrong step's progress); it now follows only the step that pushed it. A regression test reproduces it.
Open: a villager shut in by a box waits for the player (the chronicle says so); a bed pushed out of the house leaves its owner sleeping on the bare floor spot.

Third push pass: people are ordinary pieces of the line (same rules as boxes: pushed along, counted toward the three, swapped past at a wall); a sleeper or sitter blocks a line.
Invisible walls in the square: pushLooseOK refused the 3x3 patch round the stockpile yard and the tile in front of every market stall (nothing is drawn there; the yard is
just the campfire, which noStep still covers). Removed; a test fails with them put back. Still refused: building sites (they are marked), fields, the campfire, ceremony tiles.

Fourth push pass: five at once; things push over fields (the plot returns to bare dirt: `pushTrample`); a doorway swap with a bed that cannot move; lines and singles of extra
boxes on and around the square (`lfPlayBoxes`, seed-deterministic); the steered villager is free of hunger, bladder and sleep for now (`PLAYER_NEEDS`). Remember to turn the
last one back on (and reconsider the testing kit) before the game is for anyone but us.

## Push pass 5: riders
- Pushing furniture no longer refuses when somebody is in it: sleepers and sitters are carried (`pushCarry` in life2/push.ts; tile, `tileOwner`, `slide` that follows the player's step). Out of the door the bed/chair prop has `rider`; pushing it on or back in carries them; restore keeps them in it.
- `who.shoved` is set when first carried; a ticker notes the wake-up outside (shout, -4 opinion of the pusher, chronicle). Still to do: an owner whose bed is outside goes to its old spot (floor) at bedtime; could instead drag the bed back or sleep in the bed outside.

## Building (design agreed; phase 1 done)
Goal: buy wall/door/window blocks and furniture at the Builder's Yard, push them into shape, and when a closed region with a door forms it seals into a room (fixed walls, floor laid); hammer a wall to break a block and the room dissolves back into loose blocks. You are in the world, not playing god.
- Decisions: any shape (walls must join edge to edge, no diagonal seals), shared walls and big castles allowed; a wall is fixed exactly when it borders a sealed room, otherwise it stays loose; each enclosed region is a room, a dwelling = rooms linked by doors (bedroom, bath, living room ...), rooms without beds are fine; flood-fill cap ~200 tiles; trees/rocks/water inside refuse to seal.
- Ownership: the bed is the household. A bed pushed into a dwelling makes its owner part of that household (pantry share moves with them); a bed pushed outside keeps its owner, who sleeps in it there; a razed house leaves owners homeless with their beds; the barrel keeps its food when the house goes.
- No crime for building or demolishing for now (the player is "invisible" doing it); everything can be demolished, the village's houses too. Materials are free for now; costs (planks, stone) come later. Delivery: a pad at the yard now, "delivered where you want to build" later.
- Phases: 1 yard + blocks (done: `life2/yard.ts`), 2 sealing (done: `life2/sealing.ts`; still to do for free rooms: lighting at night, room names, windows only in straight north-facing runs; was: needs `inRoom`/cells/doors shims for the ~88 `doorX` and ~56 rectangle uses, wall autotile art), 3 beds/ownership/households, 4 hammer demolition.

## Villagers no longer build (this pass)
- Removed: house/church/tavern/market projects (`startProject`, `ensureSite`, `demand`), site material hauling and throwing (`deliverMatsPlan`, `throwSpot`, `slotSpot`, `throwOnSite`, `buildSlot`), woodcutter/stonecutter jobs, the player's wall building and throwing, site tags, the "Timber/Stone still needed" bar and "Being built" panel, three dialogue scenes about house sites (house_wait, your_house, need_timber), the carrying limit and the carried chips in the HUD.
- Kept: `createSite`/`completeSite(instant)` for the pre-built village and for fields/graveyard plots; empty-house demolition (`'demolish'` site, instant); the sawmill's miller (`woodPlan`); `town.sites` is now only transient. Dead tables (`BUILDING`, `perim`, `town.wants`) are still around; tidy later.
- Open: with nobody building, a growing village runs out of beds; homeless villagers use tents (`syncTents`). The player's own rooms with beds (phase 3) are meant to fix that.

## The talk engine: review, tasks A to F and the prompts (Nov 2026)
- `docs/talk-review.md` is the review of the engine, design and text, with the task list. Done by me: A bindings (an act's subject is bound per candidate; no more wrong-subject answers), B agenda and thread (conversations serve what each came to say; ritual levels; shared ground; follow-up questions), C small life (worked beside, ate with, lent a hand, finds, illness), D the voice rule (an aside on at most one line in four), E the player's menu says what each option does, F one path for news (the old word-of-mouth ticker is gone; `n.kn` mirrors what is told). Round 5 of the playtest loop is in `docs/talk-round5.md`.
- The twenty prompts in `docs/sonnet-prompts.md` are all done: one statement per line in `src/talk/` with a build guard against a comment hiding code; words split from acts (`src/talk/words/`, `tools/lexdump.mjs` proves the set of lines is unchanged); number agreement; time of day; what children may say (`minAge`, `ages.ts`); barks as barks; first person for your own deeds (`ev1:` lines, I/you in event wording); "you" in every slot; reputations told once; sympathy only when shared; registers as lines; short exchanges for regulars; events by id and a cached `repTags`; weighted line choice; no opinions about one's own family; a label for every menu act; short lines for the plain voice; an event line for every kind and `{matter}` instead of nested sentences; `lfEmit` calls carry data, not sentences.
- Work clothes (job outfits) and speech bubbles behind the speaker are in. TrueSight: nothing is lit from a window tile's corners, plates or bars.
- To do, from `docs/talk-round5.md` ("what still reads badly"): opinions without history (more sources of shared history: neighbours, a child's friend, a debt, a favour remembered); romance barely moves in a week (decide the pace, tune `romOK` and the weights); the player's menu is mostly small talk once people run out of things to say (say so instead); blame for unseen deeds is uneven (`repSuspect` wants a floor); the watch should read `tmem` and `n.kn` should go (with law talk: accuse, confess, question); groups of three in a talk; read the plain voice after its short-line pass.



## Hamlet (the minimum game)
Step 1 of docs/minimum-game-prompts.md is built: scenario `hamlet`, the `rule.*` switches (bladder, wear, births, ageing, starving, mushrooms), the trader's stall and the family. Deviations from the spec: the stall stands on the camp ground (not at the shore); the player keeps the test kit's tools and gets 6 barley seed. Next: step 2 (build menu, fence and field items, the kit bought from the trader).
Step 2 is built: seven-item build menu, fence and gate blocks (new art), the field tile as a build item (hold to lay a row), the kit bought from the trader. Gates do not let people through yet (a gate is a block until yards, step 3). Next: step 3, yards.
