# The wishing well: building is the game

Status: design, under discussion. Nothing here is built yet.

## The idea in one paragraph

The fun of Greenhollow is building, not farming. Households earn their own living (fields, stalls, jobs), and instead of paying you rent they drop a share of what they earn into a **wishing well** in the middle of town, usually with a **wish** ("I wish we had a window", "I wish the bathhouse had water"). The well is the town's pooled money and its quest list. You take coin from the well and spend it however you like on building. Because build mode stops time and nobody sees you work (see Surprises in CLAUDE.md), the islanders never learn who does it: **they believe the well grants wishes.** Happier homes earn more and give more, so building feeds building. New people only come when the people already here are content, so the town grows well, not just big.

## What is decided

| Question | Decision |
|---|---|
| Your own income | You can earn like anybody: farm, sell, collect. It helps at the start and is fun for collections, but it is not the main road. |
| Well money | **Pooled.** Wishes say what people want; how to improve the town is your choice. |
| Open wishes | One per household plus three for the town, for now (hard to playtest; revisit). |
| Old wishes | Expire, or are replaced by a newer wish from the same household, if not granted. |
| Children | Wish too ("I wish there was somewhere to play"). |
| Tutorial | Rewritten after the well has been tried in play. |
| Household feedback | Needed. The yard sign is small: **walk into a fence** to read the household's card. |
| Public buildings | **Typed walls** (bathhouse wall, tavern wall ...), so a public building is easy to tell apart. Build inventory gets **groups** (Home, Fences and fields, Bathhouse, Tavern ...). |

## 1. The well and the money

- **The well** is a build item (one per town to start), placed outside any yard. Walking into it opens the **well panel**: the coin in it, the open wishes, and buttons to take coin.
- **Deposits replace rent.** Rent (life2/rent.ts) stops. When a household earns (crop sales, stall takings, wages), it puts a share in the well:
  - the share grows with how content they are (an unhappy household gives little or nothing; a delighted one gives generously);
  - a deposit usually carries a wish; a household with no wish open makes one.
  - The rent machinery is reused: the daily walk (`rentErrand` becomes "going to the well"), the chip on screen ("Well 64 coin · 3 wishes"), the villager card rows.
- **Taking coin** ("raiding") is free: the coin goes into your purse and is spent on the kit at the trader or the carpenter as now. Nobody sees it happen; the well "took it". The soft cost: wishes left unmet while the well is emptied make people slowly less content, and they say so ("I put coin in for a window. The well has not answered.").
- **Your levers on income** are things you build: more fields in a yard, a stall or workshop that gives somebody a job, a better home (contentment means bigger deposits).
- **Balance**: `tools/balance.mjs` gets new bot policies. Its main question becomes: does the well fill fast enough to grant what is wished for, and does building more make it fill faster?

## 2. Wishes: the quest list

A wish is a record the game can check: `{ who (person or household or 'town'), kind, target (yard, room, building), need (a condition with have/need numbers, like the progression rows), coin pledged, made, expires }`.

- **Basic wishes** come from what is missing: a bed, a roof, a window, room for everybody ("the house is too small for four of us"), more fields, a gate that closes.
- **Taste wishes** come from what they like (section 3): "I wish we had somewhere to entertain guests", "flowers by the door".
- **Town wishes** are for public buildings (section 5): "I wish there was a bathhouse", "the bathhouse has no water", "it is too small for us all", "it could be nicer".
- **Children's wishes**: a playground, a swing, a pet hen in the yard.

Where wishes show:
- **The well panel** is the quest board: each wish, who made it, the coin pledged, how far along it is (have/need).
- **In talk**: making a wish is something people say ("I put a wish in the well. A window."). Granted wishes come through the surprise system already built: the change is noticed, and a surprise that matches a wish gets its own lines ("My wish came true. There is a window.").
- **The household card** (walk into a fence, section 4) lists that household's wish.

Expiry: a wish not granted within some days (a balance number) is dropped or replaced by the household's next most wanted thing.

## 3. Likes: three styles to start

The long list (botanical, industrial, rustic, wealthy, minimalist, religious, colourful, military) needs a lot of art. Start with three that existing items can carry:

| Style | Items we already have |
|---|---|
| **Garden** | flowers, bushes, fields near the home |
| **Cosy** | chairs, tables, beds, later rugs and lamps |
| **Practical** | shelves, barrels, workbench, counter |

- Each villager likes one style and maybe dislikes one (fixed by who they are, like gift tastes).
- Each build item gets a style tag.
- **Home satisfaction** = the basics (bed, roof, window, room per person, fields) + items of their style within a few tiles of their bed − items they dislike. This replaces the fixed roof/window/flowers bonuses of rent.ts.
- Talk: "I love the new flowers outside my bedroom" (a surprise that matches their taste), "The new furniture makes this place feel like home", "Have you seen Marcus's new garden?" (news about somebody else's home; somebody who likes that style may be envious and wish for the same).
- More styles later, each when its art exists.

## 4. Seeing how a household is doing

- The yard sign keeps its name (and hen count). **Walking into a fence or the sign** opens the household card: who lives there, their satisfaction and what makes it (basics, style, dislikes), what they earn and give to the well, their open wish.
- In build mode the yard tint could show satisfaction (to discuss).

## 5. The invite gate

Newcomers come only when the town is content enough, so it does not fill with poor homes:

- **Tier 1, up to 8 people**: nobody below 40 satisfaction, average 50.
- **Tier 2, up to 16**: average 60, and one public amenity.
- **Tier 3 and on**: higher averages and more amenities.

A minimum as well as an average stops one family being neglected while the rest thrive. The tiers can replace the five progression steps (progress.ts); the pill reads e.g. "Tier 2 · average 54 of 60 · amenities 0 of 1". Arrival itself (an empty closed yard with free beds, `arrTick`) stays as it is, behind the gate.

## 6. Public amenities: typed walls

Public buildings stand outside every fence and are for everybody.

- **Typed walls make the building**: a closed ring of bathhouse walls with a door is a bathhouse, the way fences make a yard. Easy to see at a glance which building is which.
- **What is inside makes it good**, and that is what town wishes ask for: water (a pool item), room (floor tiles per user), decoration (items of the town's favourite style).
- Villagers visit amenities in their free time; a visit lifts satisfaction, and a town with an amenity meets the tier gate.
- **The build inventory gets groups** (Home, Fences and fields, Bathhouse, Tavern ...), so new wall types and their items do not crowd the bar.
- Build one amenity end to end first (the bathhouse, or the tavern if the bath art is too much), then copy the pattern for a tavern, playground, shops.

## Build order (each step playable and tested)

1. **The well and deposits** replace rent; well panel with coin and taking it; balance harness policies.
2. **Basic wishes**: records, checks, expiry, the well as quest board, talk for making a wish and "my wish came true" through surprises; children's wishes.
3. **Satisfaction and the household card** (walk into a fence), then the **invite gate** replacing the five steps.
4. **Three styles**: tags on items, taste wishes, envy talk.
5. **One public amenity** with typed walls, grouped build inventory, its town wishes.
6. **The tutorial**, rewritten around the well.

## Still open

1. Can wishes ever ask for things you cannot build yet (and unlock them), or only for what the kit offers?
2. Does the coin pledged to a wish matter for anything, or is it only a sign of how badly it is wanted?
3. How does contentment turn into a share of earnings (numbers to find with the harness)?
4. Yard tint by satisfaction in build mode, yes or no?
5. Typed walls: one item per building type, or one "public wall" plus a sign that picks the type? Leaning to one item per type, grouped in the inventory.
6. One well per town, or more as the town grows (one per neighbourhood)?
