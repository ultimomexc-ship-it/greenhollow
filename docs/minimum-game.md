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
