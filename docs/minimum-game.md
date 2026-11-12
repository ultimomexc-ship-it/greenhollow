# The minimum game (design)

The design discussion lives in the Claude Doc "Greenhollow: the minimum game" (https://claude.ai/artifact/JKeUvS9KSX1GYx5HEy5VA2).
This file is the version the code is built from. Open questions are decided below by preference, to be revisited after playing.
The build order and the prompts are in `docs/minimum-game-prompts.md`.

## Goal
A complete, playable game from two systems only: **building and farming**. Everything else stays in the code, switched off as modules,
to come back one at a time as add-ons. All conversation stays on. It is a **new scenario** ("Hamlet") beside blank, ready village and
farming village; nothing is deleted.

## On and off
| On | Off (modules, flags) |
| --- | --- |
| Building: walls, windows, doors, beds, fences, gates, field tiles, stalls | Tool wear (tools never break) |
| Farming, selling crops, buying seed | Bakery, smith, tavern, chapel, baths, shop, weaver |
| Rent from villagers to the player (new) | Privies and the bladder need |
| Yards (fenced property) and households (new) | Fishing, gathering, woodcutting, mining, stairs, levels |
| Arrivals: singles, couples, families with children | Watch, crime, theft, law |
| Courtship and marriage | Births, ageing, death from old age, death from starving |
| All talk, gossip, meddling, gifts, secrets, romance | Magic mushrooms (keep the code; off in this scenario) |

## Decisions (the ones marked * are choices to revisit after playing)
1. **Rent.** Each adult villager pays the player rent each morning (6h) for the yard they live in, if they have the coin.
   Base 2 coin a day per adult*; +1 if their bed is inside a sealed room (four walls and a door)*, +1 if that room has a window*,
   +1 if flowers bloom within 4 tiles of their bed*. Children pay nothing. Unpaid rent is not a debt: it is just not paid, and it
   costs the villager contentment.
2. **One starting trader**, a villager who lives on the island: a general stall at the shore (a stall tile and a bed beside it, his
   own yard). He sells four seeds (barley, turnip, cabbage, poppy)*, and the building items; he buys every crop. He pays no rent.
3. **Seed stall and carpenter stall are upgrades**: build items that become available at progression steps 3 and 4, kept by a
   villager (hired like the stall keepers today), with more kinds and lower prices than the trader.
4. **No bakery, no privies.** Villagers eat crops directly from their household store.
5. **Tools never wear out.** **All talk stays on.**
6. **Theft off.** Fields inside another household's yard refuse you (the hoe says whose they are).
7. **The player** can do everything a villager does and is the only one who builds. Early you are a farmer (your harvest is your
   only income); later rent from ten households should outgrow your own fields: farmer to landlord. You never pay rent.
8. **A villager with no yard** sleeps rough by the square, pays no rent, loses contentment. Nobody leaves the island.*
9. **Fields outside every yard are yours** (the player's), like your garden today. Villagers farm only their own yard's fields.*
10. **Start: a hamlet of three.** You (a bed in the open, 60 coin*), the trader (stall and yard at the shore), and a family that
    arrived just before you: a couple and a child, sleeping rough, with 20 coin* of their own. Their first line is that they have
    nowhere to sleep: that is the first request.
11. **Coin is the only currency.** Coin enters the island only when the trader (or a stall) buys crops; it leaves when anyone buys
    from the trader. Later resources (wood, stone, ore, fish) join as goods the stalls buy, and the carpenter gives a discount when
    you bring material. No barter.
12. **Prices to start*** (the harness tunes them): fence 1, gate 3, field tile 2, wall 4, window 6, door 6, bed 10, flower seed 1,
    seed 1-3; crop sale prices as `SELLABLE` today.

## Yards (fenced property)
- **Fence** and **gate** are build items, loose blocks like walls, pushable, hammer removes them. A ring of fences with at least one
  gate, closed (8-way flood, like room sealing), becomes a **yard**: a record `{ id, cells, fences, gates, household }`
  (`town.yards`). Open ground, fields, beds, walls and rooms may be inside. Minimum inside area 12 tiles*; maximum `YARD_MAX` (400)*.
- **Ownership comes from beds**: the household of a yard = the people whose beds stand inside it. A bed pushed from one yard into
  another moves its owner (and nobody else). The trader's yard is his.
- **Fields inside a yard belong to its household** (`c.yard`), who farm them, eat from the harvest (a household store) and sell
  the rest to the trader or a stall.
- **A yard that opens** (a fence or gate hammered or pushed out) keeps its claim for one game day (grace): fields and beds stay its
  household's. Closed again within the day, nothing changed. After a day the yard is gone: its beds count as having no yard.
- **Leaving build mode** checks every bed: a bed of a villager outside any yard, or a yard about to lose its claim, gives a warning
  card listing who is affected ("Livia has no yard. She will sleep rough and stop paying rent."), with Back to building / Leave
  anyway.
- Rooms keep working inside yards: a sealed room round a bed is a house (contentment and rent bonus), not a separate home.

## Fields as build items
A **field tile** is a build item like a wall block: press its slot and one ploughed tile goes down in front of you; hold the key
while walking and a row is laid. It costs coin (from the kit), the hammer takes it back (refund), it is not pushable. The Field brush
is not in this scenario.

## Contentment
One number per villager (the existing `mood`), moved by: fed or hungry, bed inside a yard or not, bed inside a room or not, a window,
flowers nearby, company and talk (as today). It sets how much they work (a hungry or miserable villager farms less) and is the
"thrives" measure. It does not kill anybody.

## Arrivals
Who comes depends on what you build: a yard with 1 free bed brings a single, 2 a couple, 3 or more a family (a couple and children
for the rest). Arrivals need the request steps that block arrivals to be met (no hungry household). Couples and families arrive with
some coin and a little seed. Children need a bed and eat; they neither farm nor pay. **Marriage**: when two villagers marry, the one
whose yard has fewer beds moves: their bed moves to a free tile inside the other's yard (the villager carries it; no push animation
needed), freeing their old yard for a newcomer. No room inside: they stay apart and the newcomer request says so.

## Progression (the request pill)
1. **Shelter the family**: a yard round their beds, fields inside. They start paying rent.
2. **First harvest sold** to the trader.
3. **Five households**: the seed stall becomes buildable.
4. **Everyone under a roof**: every bed inside a sealed room. The carpenter stall becomes buildable.
5. **The island thrives**: 12 households, all under a roof, nobody hungry, average contentment above 60*. A closing card, then
   free play.

## The economy loop
You buy beds, fences and fields from the trader -> a newcomer arrives for a free bed in a yard -> the household farms the fields in
its yard -> crops are sold to the trader for coin -> rent is paid to you -> you spend it on more building.

## Add-ons later (each a module: one new thing to sell, one new thing to build)
Theft and the watch; bakery; wood; fishing; stone and mining; smith; tavern; births and ageing.

## Decided while building (yards, step 3)
- Only fences and gates close a yard: a wall, a tree or the shore does not count as part of the ring. Fences touching only at a corner leak (the same rule as walls).
- A yard needs a gate, 12 to 400 tiles inside. A gate is walked through by everybody; a fence by nobody.
- The bedless are housed automatically: a family goes together into a yard nobody lives in (or the one a relative already lives in). Free beds in a yard where strangers live are not handed out: no lodgers by accident. With too few beds the youngest get them first and the rest follow when beds appear.
- A bed outside every yard is still slept in by its owner; they just have no yard (no rent, no fields).
- You may farm fields in a yard nobody lives in yet (you laid them); once a household moves in they are theirs.
- An open yard holds its claim for one game day; time in build mode does not count (time stands still there).
- The warning card is not repeated for the same list of problems once you chose Leave anyway.
- The trader sells food as well as seed, so a household can buy what its fields do not give yet. The family starts with 12 grain and 7 seed.
- Saves: no version bump; a Hamlet saved before yards finds its yards on the next scan.

## Decided while building (rent, step 4)
- Rent* is per adult: 2 for the yard, +1 a roof, +1 a window (needs the roof), +1 flowers in bloom within 4 tiles of the bed. Collected at 06:00, once a day.
- Household money: each villager still has their own purse, but at rent time the adults of a yard cover for one another once their own rent is safe. A shared household purse is not built.
- Unpaid rent costs 10 mood for a day and is forgotten. No debt, no eviction.
- The household store is the yard's (`y.store`): up to 14 portions a head* are kept, the rest is sold; when coin is short (under two days' rent) what is over 6 a head* is sold too.
- Contentment mods*: no yard -12, roof +6, window +3, flowers +3. Work is 1.6 times slower* under mood 35 or over hunger 75.
- The trader's stall takes three times the greengrocer's stock*. When it is full it stops buying: with many households this cap is the first number to watch in the harness.
- First eight days with one family on 24 field tiles (seed 41): rent 23 coin in total, due 4 to 6 a day and paid on 5 days of 8; nobody hungry, mood 70 to 100. The player's own income from rent alone is far too small to build with: the harness and tuning steps have to fix prices against this.

## Decided while building (arrivals, step 5)
- Only an **empty** yard (nobody's bed in it yet) brings newcomers; free beds in a lived-in yard do not (no strangers as lodgers). 1 free bed: a single; 2: a couple; 3 or more: a couple and the rest children, at most 3.
- Nobody comes while somebody (not you) has no bed, or anybody living in a yard is very hungry (over 70). The starting family always gets the first yard.
- Timing*: half a day after a yard is ready, then one arrival every 1.5 to 2.5 days.
- Newcomers bring* 8 coin (single) or 10 each (couple, family), 4 grain each and 3 barley seed (the second adult 2 turnip seed too).
- On marriage the one whose yard has fewer beds moves (no yard: they move; equal: the newer arrival). They walk over and set the bed down beside their partner's; the old yard's store goes with them. If you are the one moving, your bed moves at once.
- No room (no free grass, path or floor tile in the yard): they live apart, the request pill says "Room for A and B", and it is tried again every hour.
- Fixed on the way: newcomers kept introducing themselves while starving; now they eat first.

## What the harness says before any tuning (step 6; seed 41, starting prices)
`node tools/balance.mjs --days=30` (steady): step 2 (first harvest sold) day 0.3, step 1 (the family housed and paying) day 3.3, step 3 (five households) day 8.9, step 4 (everyone under a roof) day 16.3, step 5 not reached: 6 households and 12 people at day 30.
- **Rent is not being paid.** Due climbs to 33 coin a day, paid stays near 5. In 30 days: rent 109 coin, the player's own crops 487, spent at the trader 530. The player ends a farmer, not a landlord.
- **Why:** the households have food (stores of 11 to 53 portions, nobody hungry for long) but no coin. The trader's stall sits at 70 to 90 grain of 90, where it pays 1 or nothing; the player's own twelve fields fill it as much as anybody. Meanwhile the trader's purse grows from 68 to 310: every coin spent on building and seed stays with him.
- **So the first numbers to tune** (step 10): what the trader pays when his stall is filling (the carter takes only what is above 70% of the cap, once a day, at half price), the cap itself, and how much of what the player spends comes back to the island. Then rent against prices.
- Step 1 takes 3.3 days because the family's yard (fence 30, beds 30) costs exactly the 60 coin the player starts with, and the bot spends 12 on its own fields first. A cheaper first yard, or more starting coin, brings it under two days.
- greedy (14 days): a couple's yard with room, window and poppies costs 98 coin; three days stuck, four households by day 14. lazy (14 days): 304 coin from farming alone, the family still sleeping rough: farming alone pays far better than housing people, which is the wrong way round.
- A real fault found: at eight people the old village's growth marked out a free 10 x 5 field across a yard. Switched off in the Hamlet.
