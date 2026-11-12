# The minimum game: build order and prompts

Paste the prompts in order, one per session (or one after another in the same session). Each says which model it suits:
**Sonnet** for well-specified, mechanical work; **Opus** for larger pieces of code that follow a clear spec; **Fable** for the parts
where the design has to be worked out while building. The design they all build from is `docs/minimum-game.md`.

Every prompt ends the same way (written once here):
> Work on a branch. Run `npm run build` and `npm run typecheck` (zero errors). Add a test in `tests/run.mjs` for what you built.
> Run the named tests, then the full `npm test` detached (about ten minutes; do not build while it runs). Commit `dist/index.html`
> with the change. Merge to `main` when the suite passes, push, and update CLAUDE.md (a short section on the Hamlet scenario that
> grows with each step) and NOTES.md.

| # | Prompt | Model | Needs |
| --- | --- | --- | --- |
| 1 | The Hamlet scenario and its switches | Sonnet | - |
| 2 | The build menu, fields and fences as build items, buying from the trader | Sonnet | 1 |
| 3 | Yards: fenced property and households | Fable | 2 |
| 4 | Rent, household money and contentment | Fable | 3 |
| 5 | Arrivals by yard and moving on marriage | Opus | 3, 4 |
| 6 | The balance harness | Fable | 4 |
| 7 | Stalls as upgrades: seed stall and carpenter | Sonnet | 4 |
| 8 | Progression steps and the closing moment | Opus | 5, 7 |
| 9 | Words for the new events, labels and talk | Sonnet | 4, 5 |
| 10 | First tuning pass against the harness | Sonnet | 6, all above |
| 11 | Play it and read it (playtest round) | Fable | all above |

After 11: play it yourself, then the open questions (marked * in the design) and making it fun.

---

## 1. The Hamlet scenario and its switches (Sonnet)

```
Read CLAUDE.md and docs/minimum-game.md (Goal, On and off, Decisions 2, 4, 5, 10).

Add a fourth island type, "Hamlet", beside Blank, Ready village and Ready farming village (Islands panel, src/ui/saves.ts;
scenario 'hamlet' in loadTown / newTown, src/ai/decision-steps.ts). Build it from the blank island (blankStart) and the farming
village (farmStart, src/life2/farm.ts) as follows:

1. Modules: a MODS.only([...]) recipe (src/life2/modules.ts) with farming, the economy with real money (town.farmEcon), couples,
   romance and weddings, and every talk kind. Everything listed "Off" in docs/minimum-game.md is off. Where something has no module
   yet (privies and bladder, tool wear, births, ageing, death from old age, death from starving, mushrooms), add a module for it with
   MODS.define and check modOn(...) where the game decides it (bladder: the need does not rise and no privy plans are made;
   tool wear: itWearTool and the villager toolQ do nothing; births/ageing/old age: the yearly and daily checks skip; starving: a
   villager's health never falls below a floor from hunger, they are just hungry and unhappy; mushrooms: not scattered).
2. The start (Decision 10): the player with a bed in the open near the shore and 60 coin; the trader, a villager with his own bed,
   a general stall tile at the shore (reuse the stall code of farmSetup: a merchant whose def sells seed_barley, seed_turnip,
   seed_cabbage, seed_poppy and buys every crop); a family (a couple and one child, newPerson + setSpouse) sleeping rough with
   20 coin. No houses, no fields, no privies. Visitors (visitorTick) work as on the blank island for now (prompt 5 changes it).
3. The voice: town.pack = 'island'.

Check: a test that makes a Hamlet island and asserts: three households (player, trader, family of three), the switched-off modules
are off, a villager's bladder does not rise in a day, a tool used 200 times is not worn, nobody dies in 10 days with no food at all
(they are hungry), and the trader's stall sells the four seeds and buys a turnip.
```

## 2. The build menu, fields and fences as build items, buying from the trader (Sonnet)

```
Read CLAUDE.md (Build mode, Materials and the kit) and docs/minimum-game.md (Fields as build items, Decision 12, Yards first two lines).

In the Hamlet scenario only:
1. The build menu (YARD_ITEMS, the build hotbar) offers only: wall, window wall, door, bed, fence, gate, field. (Stalls come in
   prompt 7.) The Field brush is not offered.
2. New build items fence and gate: loose blocks like bwall/bdoor (same push, chain, swap and hammer rules), new art in
   src/art/painters.ts: a wooden fence (posts and two rails) that joins to fence neighbours left, right, up and down, and a gate in
   the same style. They do not seal rooms (walls do); prompt 3 makes them seal yards.
3. A field tile is a build item: pressing its slot lays one ploughed tile (T.CROP, crop_0) on the tile in front, like
   bldPlaceFront; holding the key while walking lays one per step on grass (like bldBrushStep, but only while the field slot is
   held in hand). The hammer in build mode turns it back to grass and refunds it. Not pushable.
4. The kit is bought, not given: the Hamlet starts with an empty kit (town.kit) and the trader's stall menu (farmShopDialog) sells
   kit items at the prices in Decision 12 (one or five at a time), adding to town.kit; placing takes one (kitTake), taking down gives
   it back (kitGive) as today.

Check: a test in a Hamlet island: buying 3 walls with 60 coin leaves 48 and town.kit.wall 3; a fence ring placed and closed does
not make a room; a field tile laid, ploughed field there, hammered back gives the kit item back; the menu lists exactly the seven items.
```

## 3. Yards: fenced property and households (Fable)

```
Read CLAUDE.md (Sealing, Demolition) and docs/minimum-game.md (Yards, Decisions 8, 9).

Build yards as specified there: a ring of fence and gate blocks closed by the 8-way flood used for rooms (life2/sealing.ts:
reuse bldFlood with fence/gate as the boundary and a larger limit) becomes a yard in town.yards; ownership from the beds inside;
fields inside belong to the household (c.yard) and villagers farm only their own yard's fields (farmPlan, tutFarmers), the player
farms fields outside every yard and their own; the hoe refuses a field in someone else's yard and says whose; a yard that opens
keeps its claim for a game day; leaving build mode checks every bed and shows the warning card (Back to building / Leave anyway).
A room inside a yard stays a room. Save/restore keeps yards (bump SAVE_VERSION). Draw a faint tint over each yard in build mode, and
show the household's name on the gate's sign (signs.ts).

Decide the details the design leaves open and write them into docs/minimum-game.md. Tests: closing, opening and grace, ownership
by beds, a bed pushed into another yard moves its owner, farmers keep to their own fields, the warning card, save and restore.
```

## 4. Rent, household money and contentment (Fable)

```
Read docs/minimum-game.md (Decisions 1, 7, 11, Contentment, The economy loop).

Build rent as specified: each adult pays the player each morning for their yard (base and the bonuses for a room, a window, flowers
nearby), if they can; a LIFE event for paid and for unpaid rent (register the kinds in talk/kinds.ts). A household store for food
(crops harvested in the yard are kept there and eaten from; what is above a few days' worth is sold to the trader by an adult on a
market errand). Contentment from the inputs listed, setting how much a villager works. Show the player's rent income in the HUD
(today's rent) and each villager's rent and contentment reasons on the villager card. No death from any of it.

Write any numbers you choose into docs/minimum-game.md (marked * as to revisit). Tests: rent paid with and without the bonuses,
unpaid rent costs contentment and is not a debt, a household sells its surplus, children pay nothing.
```

## 5. Arrivals by yard and moving on marriage (Opus)

```
Read docs/minimum-game.md (Arrivals) and CLAUDE.md (Blank island: huts and visitors; Romance).

In the Hamlet scenario replace the visitor rule: a yard with 1 free bed brings a single, 2 a couple, 3 or more a family (a couple
and children), only while no household is hungry; couples and families arrive with some coin and a little seed (visArrive,
newPerson, setSpouse). On marriage (scheduleWedding / the wedding itself), the one whose yard has fewer beds moves: their bed is
moved to a free tile inside the partner's yard (a plan step "Moving my bed to X's", then the bed prop is relocated), the old yard is
left free for a newcomer; no free tile: they stay apart and the request pill says so. LIFE events for arrival kind and moving in.

Tests: each arrival type from the bed count, no arrivals while a household is hungry, a wedding moves the right bed into the right
yard, a full yard keeps them apart.
```

## 6. The balance harness (Fable)

```
Read docs/minimum-game.md and tools/playtest.mjs (the talk harness, as a model).

Write tools/balance.mjs: node tools/balance.mjs [--days=30] [--seed=41] [--policy=steady|greedy|lazy] plays the Hamlet scenario
with a bot builder (steady: builds a yard with fields and a bed whenever it can afford one, walls them in later; greedy: maximises
rent; lazy: farms only) and writes <out>/balance.md and .json: coin over time for the player, each household and the trader; coin
entering and leaving the island per day; rent per day; food produced and eaten; households, people, hungry people; contentment;
the day each progression step was reached. Charts as small text tables or ASCII sparklines in the .md. Flag: a household always
broke, the player stuck (no affordable next step for 3 days), coin piling up with nothing to buy, a step that takes over 10 days.
```

## 7. Stalls as upgrades: seed stall and carpenter (Sonnet)

```
Read docs/minimum-game.md (Decisions 3, 11) and CLAUDE.md (Ready Farming Village: the seed seller).

In the Hamlet scenario add two build items, seed stall and carpenter stall, each a stall tile placed like a block, available from
progression step 3 (seed) and 4 (carpenter) (a flag the progression prompt sets; until then a test helper can set it). When placed,
a free adult is hired to keep it (as farmSetup hires keepers). The seed stall sells all the food seeds and flowers at 20% below the
trader. The carpenter sells the kit items at 25% below the trader, and later takes material for a discount (leave a hook, no
material yet). Keepers earn what they sell and pay rent like anybody. Their shop talk works as for any stall.

Tests: placing each stall hires a keeper, prices are below the trader's, a sale pays the keeper.
```

## 8. Progression steps and the closing moment (Opus)

```
Read docs/minimum-game.md (Progression) and CLAUDE.md (The balance sheet and the tutorial; On-screen request).

In the Hamlet scenario the request pill (islandNeeds, needsHTML, the pill) follows the five steps, each with its exact numbers, the
next one shown when the last is met, voiced by villagers near you as today. Step 3 unlocks the seed stall item, step 4 the carpenter.
Step 5 shows a closing card ("The island thrives", with a few numbers from the game: days, households, people, coin earned in
rent) with Keep playing. Remove the other requests (privy, bakery, smithy ...) from this scenario.

Tests: each step's condition and unlock, the closing card appears once.
```

## 9. Words for the new events, labels and talk (Sonnet)

```
Read CLAUDE.md (Talk: the contract, acts and words) and docs/minimum-game.md.

For every LIFE event kind added in prompts 3 to 8 (rent paid, rent unpaid, no yard, moved in, arrived as a family, stall opened,
...): first-person life lines in src/talk/words/plain-life.ts and island-life.ts (life:<kind>), event lines where it is news (ev:,
both voices), a few remark lines about the yard and the rent (remark_place / remark_state with a new tag if needed), and complaints
about rent or no yard for vent. Keep the voice rule (CLAUDE.md). Run node tools/playtest.mjs village --days=6 on the Hamlet
(add a 'hamlet' scenario to tools/playtest.mjs first) and fix what its lint reports.
```

## 10. First tuning pass against the harness (Sonnet)

```
Run node tools/balance.mjs --days=30 for the three policies and seeds 41, 42, 43. Tune the numbers marked * in
docs/minimum-game.md (prices, rent, yields, starting coin) so that with the steady policy: no household is broke for more than two
days running, every step is reached, step 1 in under 2 days, step 3 by day 8-12, step 5 by day 25-35, and the player's rent passes
the player's own farm income around step 4. Record every change and the harness numbers before and after in docs/minimum-game.md.
```

## 11. Play it and read it (Fable)

```
Run the balance harness and the talk playtest on the Hamlet, read both as a player would, and write docs/minimum-game-round1.md:
what works, what is dull, what is broken, and the five changes that would make the next playthrough most fun. Fix the small ones;
list the rest as prompts in the same style as docs/minimum-game-prompts.md.
```
