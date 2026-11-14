# The wishing well: building is the game

Status: step 1 (the well and deposits) is built in the build town; the rest is design.

## The idea in one paragraph

The fun of Greenhollow is building, not farming. Households earn their own living (fields, stalls, jobs), and instead of paying you rent they drop a share of what they earn into a **wishing well** in the middle of town, usually with a **wish** ("I wish we had a window", "I wish the bathhouse had water"). The well is the town's pooled money and its quest list. You take coin from the well and spend it however you like on building. Because build mode stops time and nobody sees you work (see Surprises in CLAUDE.md), the islanders never learn who does it: **they believe the well grants wishes.** Happier homes earn more and give more, so building feeds building. The town stays small (about 20 people): once it is full, the game is making those homes and the town better, upwards onto roofs and down into the earth.

## The rule above all: building stays creative

Wishes are **desires, not blueprints**. A wish says what somebody wants to feel or have ("somewhere to entertain guests", "more light", "flowers near my bed"), never "put this block here". Any way you find to answer it counts: a big room or a small one, any furniture that fits, inside or out. You can answer an expensive wish cheaply and spend lavishly somewhere nobody asked for. Wishes are suggestions and a source of feedback, never a checklist, and nothing forces you to grant them. Two players should end up with two different islands, each made of their own choices.

So a wish's check is broad ("a room of theirs with a window", "a table and two seats anywhere in the yard", "the bathhouse has at least one pool"), there is credit for part of it where that makes sense, and the words people say about it ("My wish came true", "It is not quite what I meant, but I like it") come from how well what you built fits them, not from whether you followed a recipe.

## What is decided

| Question | Decision |
|---|---|
| Your own income | You can earn like anybody: farm, sell, collect. It helps at the start and is fun for collections, but it is not the main road. |
| Well money | **Pooled.** Wishes say what people want; how to improve the town is your choice. |
| Open wishes | One per household plus three for the town, for now. |
| Old wishes | Expire, or are replaced by a newer wish from the same household, if not granted. |
| Children | Wish too ("I wish there was somewhere to play"). |
| Wishes for others | People can wish for another household (a friend, or somebody struggling). Generous characters do it often, selfish ones never. |
| Unlocks | A wish **can unlock** an item or building you cannot build yet. Some wishes need something else first (a carpenter's stall before fine furniture, for example). |
| Pledged coin | **Does nothing for now.** The well is one purse; you can answer an expensive wish cheaply and go elaborate somewhere else. |
| Wells | **One** per town to start. |
| Population | **About 20 people**, then no more invitations: you improve the homes you have (bigger, better, up and down). |
| Household feedback | Needed. The yard sign is small: **walk into a fence** to read the household's card. **No tinted yards**: feedback in the world instead (section 4). |
| Public buildings | **A wall item per building type** (bathhouse wall, tavern wall ...), so a public building is easy to tell apart. Build inventory gets **groups** (Home, Fences and fields, Bathhouse, Tavern ...). |
| Balance | **Later.** First a bot that plays it, to see what kinds of towns come out. |
| Tutorial | Rewritten after the well has been tried in play. |

## 1. The well and the money

- **The well** is a build item, placed outside any yard. Walking into it opens the **well panel**: the coin in it, the open wishes, and buttons to take coin.
- **Deposits replace rent.** Rent (life2/rent.ts) stops. When a household earns (crop sales, stall takings, wages), it puts a share in the well:
  - the share grows with how content they are (an unhappy household gives little or nothing; a delighted one gives generously);
  - a deposit usually carries a wish; a household with no wish open makes one.
  - The rent machinery is reused: the daily walk (`rentErrand` becomes "going to the well"), the chip on screen ("Well 64 coin · 3 wishes"), the villager card rows.
- **Taking coin** ("raiding") is free: the coin goes into your purse and is spent on the kit at the trader or the carpenter as now. Nobody sees it happen; the well "took it". The soft cost: wishes left unmet while the well is emptied make people slowly less content, and they say so ("I put coin in for a window. The well has not answered.").
- **Your levers on income** are things you build: more fields in a yard, a stall or workshop that gives somebody a job, a better home (contentment means bigger deposits).

## 2. Wishes: the quest list

A wish is a record the game can check: `{ who (person or household or 'town'), kind, target (yard, room, building), need (a broad condition with have/need numbers, like the progression rows), coin pledged (shown, no effect for now), unlocks (items it adds to the kit), waits on (what must exist first), made, expires }`.

- **Basic wishes** come from what is missing: a bed, a roof, a window, room for everybody ("the house is too small for four of us"), more fields, a gate that closes.
- **Taste wishes** come from what they like (section 3): "I wish we had somewhere to entertain guests", "flowers by the door".
- **Town wishes** are for public buildings (section 6): "I wish there was a bathhouse", "the bathhouse has no water", "it is too small for us all", "it could be nicer".
- **Children's wishes**: a playground, a swing, a pet hen in the yard.
- **Wishes for somebody else**: people can wish for another household: a friend's, or somebody who is not doing well. "Poor Herbus makes barely any money. If only he had more fields to plough." The wish is made in the wisher's name but checked against the other household (more fields in Herbus's yard), and when it comes true both are glad: the one it was for, and the one who wished it (who may tell everybody it was their wish).
  - **Generous and selfish people**: character decides who wishes for others. Generous, kind and devout villagers often spend their wish on a friend or on whoever is struggling most (the lowest satisfaction or the least coin in town); selfish, greedy or proud ones only ever wish for themselves, and may grumble when somebody else's wish comes true first ("Herbus gets fields and I still have no window."). Most people are in between: their own household first, others now and then.
  - Who counts as struggling comes from what the game already knows: coin, hunger, satisfaction, sleeping rough, rent or deposits they could not make.
  - In talk this is gossip with a heart: "Have you heard what Livia wished for? Fields for Herbus." It makes the wisher liked, and tells you who in town needs help without going to the well.
- **Wishes that unlock**: a wish may name something not yet in the kit ("I wish we had a proper table to eat at"); making the wish puts that item on the trader's list (or the carpenter's), so the town's wishes open up the build menu over time. Some wishes wait on something else first (fine furniture needs the carpenter's stall; a bath needs a bathhouse): the panel shows what it is waiting for.
- **Checks are broad**: a wish is met by anything that gives what it asks for, wherever it fits, and partly met is worth something (see the rule above).
- **Growing up and down**: once the town is full, wishes turn to the homes themselves: a second room, a room upstairs, a roof garden, a cellar. The stairs, decks and mines that already exist are where those answers go.

Where wishes show:
- **The well panel** is the quest board: each wish, who made it, the coin pledged, how far along it is, what it waits on.
- **In talk**: making a wish is something people say ("I put a wish in the well. A window."). Granted wishes come through the surprise system already built: the change is noticed, and a surprise that matches a wish gets its own lines ("My wish came true. There is a window.").
- **The household card** (walk into a fence, section 4) lists that household's wish.

Expiry: a wish not granted within some days is dropped or replaced by the household's next most wanted thing.

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

## 4. Seeing how a household is doing (no tinted yards)

The feedback lives in the world and in what people do, not in colour washes:

- **The household card**: walking into a fence or the yard sign opens it: who lives there, their satisfaction and what makes it (basics, style, dislikes), what they earn and give to the well, their open wish.
- **A wish over the house**: a small floating picture of what the household wishes for (a window, a bed, a flower, a table), the way a ripe crop glows. It is what you see when you look across the town: which homes want something, and what.
- **How they look**: content people stroll, sit out in their yard, chat by the gate; unhappy ones mope at home and sigh. A face beside the yard sign (a few small expressions) could carry it at a glance.
- **What they say**: the surprises and wish lines in talk, and a passing remark when you walk by ("Still no window.").

The floating wish and the face are the two to build first; the rest comes from talk and behaviour already in the game.

## 5. The invite gate

The town holds **about 20 people**. Newcomers come only while there is room under that cap and the town is content enough:

- Nobody below 40 satisfaction, and the average above a threshold that rises as the town fills (for example 50 at 8 people, 60 at 14, 70 for the last few).
- Some places in the town need a public amenity first (for example a bathhouse before the 12th person).

When the town is full, nobody more comes: the game is improving those 20 lives and homes, building out, up and down. The tiers can replace the five progression steps (progress.ts); the pill reads e.g. "14 of 20 people · average 54 of 60 · amenities 0 of 1". Arrival itself (an empty closed yard with free beds, `arrTick`) stays as it is, behind the gate.

## 6. Public amenities: a wall item per building

Public buildings stand outside every fence and are for everybody.

- **Each building type has its own wall item** (bathhouse wall, tavern wall, later playground fence, shop wall). A closed ring of bathhouse walls with a door is a bathhouse, the way fences make a yard, and it looks like one at a glance.
- **What is inside makes it good**, and that is what town wishes ask for: water (a pool item), room (floor tiles per user), decoration (items of the town's favourite style).
- Villagers visit amenities in their free time; a visit lifts satisfaction, and amenities are part of the invite gate.
- **The build inventory gets groups** (Home, Fences and fields, Bathhouse, Tavern ...), so new wall types and their items do not crowd the bar.
- Build one amenity end to end first (the bathhouse, or the tavern if the bath art is too much), then copy the pattern for a tavern, playground, shops.

## 7. Bots that build towns

Before any balancing, a bot plays the well game for days and we look at **what kind of towns come out**. It builds the way a player does (through build mode, buying from the trader with coin from the well), so it also finds what does not work.

Personalities (a starting set):

| Bot | How it builds |
|---|---|
| **Granter** | Grants wishes in the order they come, with the cheapest thing that fits. |
| **Showman** | Picks one wish at a time and answers it lavishly: big rooms, extra windows, gardens. Fewer homes, grander ones. |
| **Gardener** | Builds to the Garden style everywhere: flowers, bushes, fields round every home. |
| **Sprawler** | Fills the town to 20 as fast as the gate allows: small homes, more of them. |
| **Upward** | Once the town is full, builds up and down: rooms on the roof, cellars, stairs. |

Each run writes a report (`tools/wellbot.mjs`, like the balance harness): the day each person arrived, satisfaction over time per household, the wishes made, granted, expired, what was built, coin in and out of the well, and **pictures of the island** every few days and at the end (a whole-town view and a close-up of each home), so the towns can be compared side by side.

## 8. A tool given is a job (the owner's idea, to try)

What somebody does for a living comes from the tool they were given: give a villager a hoe (a plough) and they farm, a hammer and they mine or gather stone, a fishing rod and they fish, an axe and they fell trees. Give them a different tool and they change jobs. When a child comes of age, you give them their first tool on their birthday, and that is the life they start. Tools are bought (the trader, later the carpenter) and handed over as a gift in talk, so giving one is also how gifting is taught.

First try, in the tutorial: Junia's second wish (after the fence) is for an axe. You buy one, give it to her, and felling trees becomes her first job. Fields for her come later, once the field mechanic is settled.

## Build order (each step playable and tested)

1. **The well and deposits** replace rent; well panel with coin and taking it.
2. **Basic wishes**: records, checks, expiry, unlocks, the well as quest board, talk for making a wish and "my wish came true" through surprises; children's wishes.
3. **The wish bot** (`tools/wellbot.mjs`) with the Granter, Showman and Sprawler, and pictures of the towns. Look at them together before going on.
4. **Satisfaction, the household card and the floating wish**, then the **invite gate** with the cap of about 20 replacing the five steps.
5. **Three styles**: tags on items, taste wishes, envy talk; the Gardener bot.
6. **One public amenity** with its own wall item, grouped build inventory, its town wishes; Upward bot once homes grow up and down.
7. **The tutorial**, rewritten around the well.

## Still open

1. How a household's contentment turns into the share it gives the well (numbers: later, once the bots have shown what towns look like).
2. Exactly how big the cap is (about 20) and where the amenity gates fall within it.
3. The face beside the yard sign: how many expressions, and does it stay visible outside build mode?
