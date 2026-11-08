# Greenhollow

A Roman village simulation played in the browser: villagers with needs, jobs, families, gossip,
crime and a town watch, drawn on a canvas. The owner is hands-off with GitHub: do the git work
(branches, commits, pushes, merging to main when tests pass) yourself.

## Commands
- `npm run build`: joins `src/` into `dist/index.html`, the single self-contained file that is played and published.
- `npm run typecheck`: TypeScript check (`tsc --noEmit`). Must stay at zero errors.
- `npm test`: build, typecheck, then the headless-browser tests in `tests/run.mjs` (about 2 minutes).
  `node tests/run.mjs food` runs only tests whose name contains "food".
- After changing `src/`, run `npm run build` and commit `dist/index.html` with the change (CI checks it is up to date).

## How the code is put together (read before editing)
- `src/*/*.ts` are **classic scripts sharing one global scope**, not ES modules. `scripts/build.mjs`
  concatenates them in the order of `src/order.json`, strips types with esbuild and inlines them with
  `src/styles.css` into `src/index.html`. A new file must be added to `src/order.json` (the build fails otherwise).
- Order matters: later files patch earlier ones, e.g. `life2/glue.ts` wraps `lifeHud`
  (`const _hud = lifeHud; lifeHud = function ...`). Those spots carry `@ts-expect-error -- deliberate patch`.
- Function declarations are hoisted across the whole joined script, so if a name is declared twice the
  **last** one wins everywhere. Don't declare a function twice; replace it in place.
- `art/painters.ts` is a sealed IIFE (`const ART = ...`) holding all sprite and tile painting; the game reaches it only through `ART.*`.
- Folders: `world/` generation and island, `life/` and `life2/` village life (life2 = the Roman layer: events,
  gossip, trades, law, daily life, grudges), `ai/` villager plans and decisions, `social/` and `dialogue/`
  conversations, `ceremonies/`, `player/` controlling a villager, `render/` drawing, `ui/` panels, input and the main loop.
- Types are loose for now (`strict: false`, many `: any` from the JS conversion). Tighten gradually: prefer
  adding real interfaces (Person, Town, Game) over more `any`.

## Controls (src/player/items.ts, src/life2/controls.ts)
Explicit actions: **the thing in your hand decides what walking into something does**; nothing is picked for you. No Shift, no crouching.
- **Hand** (belt slot 1) has three modes, cycled with **Q**: **Talk** (villager -> talk; seller -> buy), **Push** (see below; villager -> push them one tile, or swap
  places against a wall; harmless: no crime, no gossip), **Search** (barrel, crate -> search it).
- **Pushing is Sokoban** (`life2/push.ts`): the thing moves at exactly your pace (it is drawn following your own step, `lfPropPos`, and only that step: `pr.followW`
  is the player's step count, so a box never follows a later step), and things in a line go together, up to five pieces (`PUSH_MAX`). Pushable: crates, barrels and stools; rocks
  (a pushed rock becomes a loose rock, `kind: 'rock'`, that pushes like a crate and is broken with the hammer for stone and now and then iron: build with them); and
  light furniture in a house (chairs, beds, the family barrel and tables - a table is just its tile, never goes out of the door; the room's `seats`/`beds`/`barrel`/`spots.pantry` move with it, so `n.bed`/`n.seat` still point at it;
  refused when somebody is using it or when it would cut a seat, bed or the pantry off from the door). **Swap:** when the last piece cannot move you swap places with
  the piece you are holding, and again with the next, until you reach the wall. **People are pieces in the line**, just like boxes (pushed along, counted toward the five, swapped past at a wall); somebody kneeling or sitting on a bench blocks the line. **Sleepers and sitters ride along** (`pushCarry`): pushing a bed with somebody asleep in it (or a chair with a sitter) carries them with it, still asleep, and out of the door the bed becomes a loose thing with the sleeper as its `rider`; `n.bed`/`n.seat` are the same records so they follow. When a carried person comes to outside their house, `who.shoved` fires a ticker (shout, a grudge against the pusher, a chronicle line: "woke up in the middle of the forest, bed and all"). Nothing invisible stops a push: only what is drawn does (the tiles reserved round the stockpile yard and in front of stalls are not drawn, so they do not count).
  Loose things go over a field (whatever is growing or ploughed there goes back to bare dirt, `pushTrample`), through a doorway and into a house; standing in the doorway
  you swap with furniture that cannot move (it takes the doorway, you go in); furniture pushed onto the doorway becomes a loose thing (`pr.fur`, the room's record marked `out`) and is furniture
  again when pushed back onto the floor inside. A line is all loose things or all furniture. **Villagers move nothing for now** (`LF_NPC_MOVES_THINGS = false`: no
  tidying, rescuing or hauling; a villager shut in by a blocked door waits, and the chronicle says so after an hour).
- **The Builder's Yard** (`life2/yard.ts`, phase 1 of the building system; design and staging in NOTES.md "Building"): a banner and a row of seven sample stands (wall, window wall, door, bed, chair, table, barrel)
  on the edge of the square (`town.builder`; a gold arrow with the distance points at it from the screen's edge when it is out of sight). In Talk mode, walking into a stand hands you one of the thing, free for now, and it appears on the
  delivery pad in front (`yardSpot`; at most `YARD_CAP` delivered things stand about it). Stands are fixed props (`pr.fixed`, never pushed, `pr.dispense`, drawn with `pr.art`). Blocks are ordinary loose props (`bwall`, `bwindow`, `bdoor`, plus
  bed, chair, table, barrel) and push, chain and swap like crates. The delivery pad is drawn as a gold hatched square (`DELIVERY PAD`) and is off limits for sealing (`bldOnPad`).
- **Sealing** (`life2/sealing.ts`, phase 2 of building): once a pushed block's step is over (`bldTick`, queued by `pushMoveProp` in `town.bldQ`), a flood (8-way, so walls touching only at a corner leak) from its neighbours looks for a closed region
  of at most `BLD_MAX` tiles with a door block (or a fixed door of a free room) beside it and only grass, path, sand, crops or floor inside (a tree, rock, water or the pad refuses). It becomes a room: loose `bwall`/`bwindow`/`bdoor` blocks on its edge turn into
  fixed `T.WALL`/`T.DOOR` tiles, the inside is laid with `T.FLOOR` and `roomAt`, and a record is made (`free: true`, `kind: 'room'` so nobody lives in it yet, `cells` = inside tiles, `walls`, bounding box `x, y, w, h`, `doorX/doorY` = its first door; `noWindows`, never lit, no label).
  A partition block-line with a door inside a sealed room splits it (old record `dead`, new ones made); a lone block inside a room stays loose. A window block that sits in a straight wall with floor below becomes a window (`town.win`, also used by `tsWindow`).
  Free-form walls are drawn by their neighbours (`gaFreeTile` in render/village.ts: a face where floor lies just below, else a cap `cap_<open sides>`). Code written for rectangle rooms must use `cells`/`walls` for free ones (`r.free`); lighting, labels and room dressing skip them.
- **Belt** (keys **1-9**): axe (fell trees), hammer (break rocks, put up walls), hoe (plough and harvest), rod (fish), lockpicks, seeds (sow a ploughed plot; any plot,
  the player need not wait for the whole field; farmers do). **B** opens the bag (hands, belt, bag; click to put things on or take them off the belt).
- With the wrong thing in hand you walk on over anything walkable (a field) and are told what to hold for anything solid ("Tree: hold the axe (2)."). The hotbar's
  facing box always says what the next bump will do. After an action, keep holding to walk on, or let go and press again to act on the same thing.
- **For now the villager you steer is not troubled by hunger, bladder or tiredness** (`PLAYER_NEEDS = false` in `player/items.ts`: the values are pinned each tick, no forced bedtime; you can still choose to sleep in a bed). The test boxes round the square are off (`LF_PLAY_BOXES = false`); the Builder's Yard clears trees, rocks and loose things round itself (`yardClear`).
- The model: goods stay counts in `n.inv`; tools are single things with an owner and wear (`n.items`, `itGiveTool`); lockpicks and seeds are stacks in `n.bag`;
  `n.belt` holds 'hand', 'i<id>' or 's:<key>'; `n.sel` is the slot in hand, `n.mode` the hand mode. `itGate(n, tg, walkOn)` checks an action against the hand
  (`itNeedOf(key)`), `itFacing(n)` describes the thing in front. For testing (`IT.kit = 'test'`) whoever you steer starts with every tool, lockpicks, three kinds
  of seed and 100 denarii, plus a 3 x 2 garden by home.
- Plots are drawn as `crop_raw` (untilled, weedy), `crop_0` (ploughed, dark furrows) and `crop_1..4` (growing, over the ploughed earth); they are `kind: 'tile'`
  sprites so they join without seams. A sown plot remembers its seed (`c.seed`); seed types growing differently is a later step.
- **Items in the economy** (`life2/items-trade.ts`): every working villager owns the tool for their work (`itNpcTool`; `n.toolQ` is its wear and is kept in step);
  a worn-out one is replaced at the smith or the Taberna (`itNpcNewTool`). Your tools wear with each use (`IT_WEAR`) and break. Breaking a rock sometimes gives
  iron ore (`itRockOre`: yours to sell to the smith; a stonecutter's goes to the smithy); the caravan still brings a little iron daily (a safety valve).
  The smith's counter offers each tool, buys ore, and sells lockpicks to friends (`itOffers`, `itExtras`). Seeds (`IT_SEEDS`): barley (staple), turnips (quick),
  beans; each gives its own food and a seed or two back (`itHarvest`); the Taberna sells seed; farmers leave the player's garden and sowings alone (`itFarmersPlot`).
  A lockpick in hand opens a house barred for the night (`itPickLock`: it may snap, somebody may hear; a break-in event). The Sawmill: a Miller (hired when food
  allows, sent to the fields when it is short) fells logs and saws them into planks (2 -> 3); planks are sold there and count as timber on a site or a wall.
- The other verbs in `lf2Verbs` (steal, wreck, shove, give, wake, follow ...) are still registered in the hooks but nothing reaches them yet.
  A new action means a key in `targetAt0` / `lifeAct` plus a line in `itNeedOf` saying what must be in hand.

## Conversation (src/dialogue/cv-*.ts)
Talking is generated from the village, not from a menu. You say whole sentences; the attitude (a joke, sympathy, an insult, a probe,
a flirt, gossip, a lie) is part of the sentence, and the person answers the attitude as well as the words. There is no tone selector and no Goodbye reply (a small Leave control instead).
- `cv-world.ts`: the village behind the talk. `cvLife(o)` (ambition, regret, pride, fear, maybe a secret), `cvWorld()` (old stories tying people together: debts, feuds, old flames,
  who knows what; legends), `cvMem(o,p)` (what they remember of you: trust, moments with your own words), `cvKnows(p)` (your journal), `cvSaw` (harmless sightings, e.g. you pushed someone).
  Generated lazily per town seed, so a seed gives the same village; it also nudges the sim (debtors repay, feuds sour opinions).
- `cv-voice.ts`: nine ways of talking (`cvVoice`: talkative, reserved, nosy, cynic, sunny, wary, prickly, smooth, lonely) and their banks (greetings, reactions, deflections, gossip lead-ins).
- `cv-topics.ts`: `cvPool(c)` = everything they might bring up (events they know, people, old stories, their own life, legends, the day, the tide, shops, the chronicle, things about you), weighted;
  `cvWilling` = how much they will tell (trust, who they are, what you have done this talk).
- `cv-tell.ts`: `cvTell(c, topic, layer)` turns a topic into words, layer by layer (0 a hint, 1 the story, 2-3 what they do not usually say). Every layer names things you can follow up.
- `cv-talk.ts`: options (`cvFollowUps`, `cvObserve`, `cvShare`, `cvSpecial`; each option has an `intent`), `cvEffect` (what each attitude does to opinion, trust, patience, events, memory),
  `cvRespond` / `cvDeepen` / `cvPivotUtt` (go deeper, wander to a related topic, they ask you something), `cvClose` (they have somewhere to be; walk with them), `convBegin` (entry point).
- Authored scenes (`dialogue/opinions-scenes.ts`) still fire first when they apply; after a scene reply the conversation carries on here (`cvAfterScene`).
- To add content: a bit of activity talk in `CV_ACTV`, a thing on their mind in `CV_STATES`, a legend in `CV_LEGENDS`, a secret/regret/fear in `cv-world.ts`, new option lines in `cvFollowUps`.
  Avoid generic filler ("That is interesting", "It is complicated", "Anything else?"): `CV_BANNED` and the tests reject it.
- `node tools/talk.mjs [seed] [people] [turns] [random|first]` prints real conversations; read them after every content change.
- `node tools/longevity.mjs [days] [talks/day] [turns] [seed] [--file=other.html]` measures freshness (new templates, new facts per day) and readability over many days; `node tools/sift.mjs [days]` counts story-shaped patterns the village produces on its own. Findings are in NOTES.md.
- Speak events through `cvMe(o, sbText(o, ev))`, not `ev.text`: it gives the speaker's own version and turns their name into I/me and the player's into you.
- `cv-rules.ts`: lines chosen by the facts of the moment (most specific rule wins) with fill-ins; every line is chosen by what the *listener* heard least recently.
- `cv-speech.ts`: `cvSpeak(text)` contracts speech on the way out ("do not" -> "don't", "is it not" -> "isn't it"; not at a clause end, not "I have a ...").
  Every speech surface calls it (talk box and options in `renderTalk`, bubbles and Overheard in `drainEvents`, `playerSay`). Banks may be written either way.
- `cv-answers.ts`: every follow-up option has its own `then` answer (what somebody is like, how they are taking it, how you know, how it started ...);
  an option without one only deepens its subject. Ask-about (`cvAskAbout`): people, news, old stories and places the player knows; "never heard of it"
  gives a `tellit` hook so you can tell them. New follow-ups need an answer function, not a fall-through.
- Never name the speaker or the player in the third person in speech: run event/chronicle text through `cvSpeechOf(o, text, listener)` (first names,
  no clock times, the speaker as I, the listener as you).
- `node tools/lintalk.mjs [days] [talks] [turns] [seed]` flags what reads wrong (self/player in the third person, repeats, clunky pivots, infants as topics,
  full names, clock times, child lines from adults, uncontracted speech, broken grammar, news told about the listener, repeated overheard pairs) and prints
  question -> answer pairs to read. A test runs it.

## The social simulation (src/social2/sb-*.ts; design in docs/social-simulation.md)
The village lives without the player: the simulation owns the truth (events), each villager owns what they believe, conversation expresses it.
- `sb-core.ts`: each person's **version** of an event (`o.kn[id]`: `who` they blame, `ext` extra detail, `sev2`, `m` times changed, `hop`, `sus` = only a suspicion),
  `sbKind` (own / fact / hearsay / rumour), importance and forgetting (`sbImp`, `sbTrim`), distortion when retold (`sbPassOn`: exaggerate, soften for a friend, pin it on someone
  they dislike, lose the name), second-order beliefs (`o.sbRel['a:b']` = what they think a feels about b, and why), the reason ledger (`o.why[id]`, written by `lfAff(a, b, v, why)`),
  trust and respect (`o.trust`, `o.resp`), `sbWhyText` (a reason in the speaker's words).
- `sb-exchange.ts`: background exchanges between people who are near each other and free (`SBX`: small talk, news, vent, praise, console, shop/rivalry, family/row,
  argue, court, borrow, repay, confide, leak). Each has consequences; text only appears if the player is near. `sbCompat` is a pair's chemistry. Loans live in `town.sbLoans`.
- `sb-voice.ts`: the words. `sbSayIfNear(a, b, kind, facts)` voices an exchange with its facts (who, why, how much, what the row is about); `sbNewsLines` is gossip
  in the teller's version; `sbSmallTalk(a, b)` is what people say when they bump into each other (also `makeConvo`), drawn from their lives (family by name,
  where somebody is, shared news, work, prices, the tide). `sbPick` chooses what the player has heard least recently.
- `sb-life.ts`: life events once a day (illness and sick visits, lost and found coins, pilfering with a suspect, windfalls, catches, a business week, deliveries),
  ill people in bed, parents fetching food for a hungry child.
- `sb-presim.ts`: 60 days of abstract village life before arrival (meals, work, the street, the tavern), seeded by the town seed, money-neutral, ~25 ms.
- Conversation side: `dialogue/cv-social.ts` (hedges, `cvMe`/`cvYou` first-person rewriting, "who cannot stand whom" and "today I talked to…" topics,
  contradicting a version with "I heard it was X").
- Measure with `node tools/network.mjs [days] [seed]` (the village at arrival, how news travels, versions, wrong blame) and `node tools/sift.mjs [days]`.

## Tests
- `tests/lib.mjs` loads `dist/index.html` deterministically: seeded `Math.random`, a fake clock, frame loop
  held, the harness steps the sim (`simulate(page, minutes)`) the way the frame loop does. Same seed, same result.
- Current suite: load and run a day, render without errors, nobody starves in 12 days (three towns),
  the controls (Q cycles the hand modes, 1-9 the belt, Shift and old keys do nothing; Push pushes people and swaps against a wall, Talk talks; crates pushed in Push (Sokoban: at your pace, in lines of three, swapping at a wall, people as pieces of the line, no invisible walls, over fields, through doors; furniture out and back in; villagers move nothing) and searched in Search; rocks pushed and broken; chairs, beds and the barrel moved; trees need the axe; the hoe ploughs and seeds sow; sleepers), conversations (specific openers, long random talks without dead ends or repeats, insults and sympathy, unlocking layers, memory, witnesses, the arrest), sim speed under 3 s per game-day (about 0.7 s now),
  the social simulation (the pre-simulation is deterministic, fast and leaves nobody a blank slate; news spreads gradually and changes; talk uses beliefs and you can contradict a version),
  readability and a week of freshness, items in the economy (villager tools, wear and the smith, iron, seeds and the garden, lockpicks, the sawmill), the dialogue lint, every follow-up answered and ask-about, overheard small talk from real lives (57 tests, about 4 minutes).
- The random stream is shared, so any change shifts every later random draw: a test that suddenly fails in one town is often exposing a real
  weakness that luck was hiding (that is how children starving with dole grain in their pockets was found). Find the cause before changing the test.
- When behaviour changes on purpose, tests may need new expectations; when it changes by accident, they catch it.

## What the player can see: TrueSight (src/render/truesight.ts)
Visibility, not lighting (night, lamps and shadows stay in render/lighting-wild.ts). Buildings are polygons whose walls are as thick as they are drawn:
every wall tile is a solid square and the segments are the straight edges of the solid parts, merged along each wall. So a building's outer corner casts
from the outermost point of its corner tile, a doorway is a real opening between two jambs (the beam through it starts at the inside corners of the door
frame), and a window is a gap in the middle of its tile with a solid piece either side.
From the player's eye a ray goes to every segment end (and a hair either side), stopping at the first segment; the hit points in angle order are the
visibility polygon. Everything outside it is covered in near-black, cut along those straight lines. Only what a sight line reaches is shown: the wall
behind each visible stretch of face (`tsFaces`: a strip one tile deep), so a glancing view shows a sliver; no tile is ever lit as a whole (doors included).
- ONLY buildings block sight: walls, closed doors, the solid bits beside a window. Trees, rocks, furniture, crates and people never do.
- At an inner corner (the face ends at the segment's own end and solid wall carries on round it) `tsFaces` shows the corner tile too, so the four outer corner tiles of a room are not black notches when you stand inside.
- `tsGeo()` builds (and caches, keyed by `town.gridV` and door states) the segments in a cell grid; `tsRay` finds the nearest hit; `tsPolygon`, `tsWalls`.
  `tsSees(x, y)` = can the player see a person standing there (`canSee` uses it; hidden people are not drawn, picked or named).
  `tsLine(ax, ay, bx, by)` = a clear line on the same segments, for NPC perception with its own rules (NPCs still use the older `seeThrough`).
- Public buildings keep their doors open by day (`tsPropDoors`). Zoomed out to the map (zoom < 0.6) nothing is hidden.
- `node tools/truesight.mjs [--out=dir]` stamps a test ground (`tsLab`: rooms with an archway and a shut door, a corridor with three corners, a house
  with windows, trees, a shed, walls touching corner to corner), checks who is seen from each spot (and while people walk), and saves screenshots. Tests run it.
- ~0.2 ms per recompute at normal zoom, ~0.5 ms zoomed out, only when the eye, the view or a door changes.

## Performance tools
- `node tools/profile.mjs <seconds> <zoom> [--pan] [--cpu] [--file=other.html]`: the real frame loop, with per-stage times, frame-time percentiles and optional panning / CPU profile. Headless Chromium paints in software, so compare before/after rather than against 60 fps.
- `node tools/diff.mjs a.html b.html [--no-people]`: renders both builds at fixed views and compares pixels. Use it after any rendering change.
- Rendering rules learned: villagers are cached as sprites when zoomed out (`ART.drawDollLOD`); the lit-area texture is rebuilt at 20 Hz; the tide tile list is cached; do not skip the island overview image in `drawGround` (it shows through at close zoom).

## Workflow
- `main` is always playable. Work on a branch per feature, commit in small steps, merge to `main` when `npm test` passes.
- Publishing: the game is also a claude.ai artifact (https://claude.ai/artifact/GKo6oFqsjgoswEC1KvDTwy);
  republish `dist/index.html` there when the owner asks.
- `NOTES.md` holds the design notes, playtest findings and the to-do list carried over from earlier sessions. Keep it current.
