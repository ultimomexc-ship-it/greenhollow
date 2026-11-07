# Autonomous social simulation: inventory and architecture

Goal: a village where people know each other, talk to each other, get things wrong, keep secrets and have ongoing
stories, whether or not the player is there. The simulation owns the truth; each villager owns what they believe;
conversation expresses it.

## 1. Inventory: everything that could become social knowledge

Census of a typical village (seed `census`, day 2): 21 people (17 adults, 5 couples, 4 children); 9 houses, a church,
a tavern, 4 privies, a bakery, a smithy, a shop, a thermopolium (street food), baths and a jail; 19 props (crates,
barrels, stools); 2 stalls; resource nodes; the tidal flats.

Legend: **yes** = exists and already produces an event others can learn about; **part** = exists but is not witnessable /
not talked about / too thin; **new** = needs a new mechanic. "Built" = added in this round.

| Source | What could be talked about | Status | Built in this round |
|---|---|---|---|
| **People** | | | |
| Personality (18 traits, quirk, hobby, voice) | "She is ever so shy", "He never stops singing" | part (talk uses it; others do not discuss it) | opinions of people with reasons |
| Needs and mood (hunger, rest, bladder, cleanliness, fun, company) | "He has been in a foul mood all week" | part (mood thoughts exist, not shared) | moods and bad days are noticed and mentioned |
| Health | "She has had a fever since Tuesday" | new | illness (a few days in bed, family worries, visits) |
| Money (coin, earnings) | "He is skint", "She came into money" | part | lost and found coins, windfalls, loans |
| Ambitions, regrets, fears, secrets (cv-world) | "She wants to own the big field" | part (only told to the player) | shared between close friends; secrets leak |
| Memories (personal, 14) and thoughts | "He has not been the same since the funeral" | part | importance and fading for everything known |
| **Relationships** | | | |
| Family (spouse, parents, siblings, kids) | "Those two argue every supper" | part | family talk, family quarrels |
| Liking (aff, per side) | "She cannot stand him" | yes, numeric only | reasons for every change (a ledger), trust and respect as separate dimensions |
| Friends, rivals (labels) | "Thick as thieves" | part | built from interactions |
| Romance: crushes, courting, affairs, jealousy | "He is sweet on the baker" | yes | courting conversations, couples' talk |
| Grudges and revenge | "She will not let it go" | yes (needs a known culprit) | grudges from arguments, debts, misattributed blame |
| Knowing how others feel about each other | "George cannot stand Thomas, you know" | new | second-order beliefs, learned by watching and being told |
| Debts and favours | "He still owes George" | part (backstory only) | live loans, repayment, default |
| **Work and businesses** | | | |
| Jobs (farmer, fisher, gatherer, woodcutter, stonecutter, builder, labourer, smith, baker, cook, weaver, shopkeeper, bath keeper, barkeep, watchman, priest) | "The smith is behind with the hinges" | part | shop talk; a bad or good week; job opinions |
| Shops: bakery, smithy, shop, thermopolium, baths (stock, prices, takings) | "Bread has doubled", "Nobody goes to the baths" | part (prices move; nobody discusses them) | business weeks; opinions of businesses; deliveries |
| Larder, grain ship, the dole | "The council bought grain again" | yes (chronicle) | talked about through the chronicle |
| Fields, catches, forage, tools wearing out | "Best catch in years" | part | notable catches and harvests become events |
| Building sites, houses, the chapel | "The new roof leaks" | part (chronicle) | as above |
| **Places where people meet** | | | |
| Homes (family), tavern (evenings, dice, drink), baths, square, workplaces, larder, privies, the well, the shore | | part (gossip needs to stand within 3 tiles by chance) | conversations scheduled by place, time and who is there |
| **Events already emitted** (about 40 kinds) | theft, pickpocket, quarrel, brawl, insult, gift, help, flirt, crush, courting, tryst, jealous, dice, cheat, smelly, sing, stumble, newclothes, charity, dole, arrest, fined, escape, bribe, break-in, snoop, sabotage, rumour, blackmail, confront, shove, wake, knock, report, repair, robbed, shut-in, block-door | yes | distortion as they travel; importance and fading |
| **Ceremonies and the calendar** | weddings, funerals, births, coming-of-age parties, the bonfire, the rest day | part (chronicle, scenes) | remembered and discussed |
| **The world** | the tide, the flats, crabs and seals, the forest growing back, the seasons (none), weather (none) | part | (weather and seasons: later) |
| **Things from outside** | the grain ship, the mainland | part | deliveries of unusual things |
| **The player** | everything the player does to or near people (help, theft, pushes, insults, flirting, lies, gifts) | yes for events; pushes are sightings | others learn it through the same network |
| **Traditions and history** | legends (6), the rest day, the bonfire, old stories (debts, feuds, flames) | part | the village's history before the player arrives |

## 2. Architecture

Five layers. Truth flows up; nothing above may change what is true below.

1. **Truth: events.** `lfEmit` records what happened, with roles (actor, target, place, time), tags and witnesses.
2. **Knowledge: what each person believes.** Per villager (`o.kn`, extended): how they know it (saw it, were told, inferred),
   who told them, how sure they are, the version they heard (distortion), and how important it is to them (it fades unless important).
   Plus second-order beliefs (`o.sbRel`: who likes or dislikes whom, as far as they know) and suspicions.
3. **Feelings: relationships with reasons.** Liking (`aff`), trust and respect, each per side, each change with a reason (`o.why`).
4. **Behaviour: background social exchanges.** Villagers who are near each other and free, at home, at work, at the tavern,
   have short exchanges with a purpose: small talk, news, venting about somebody, praising somebody, consoling, shop talk,
   family talk, arguing, courting, asking a favour or a loan, repaying, confiding. Each has consequences (knowledge, feelings,
   sometimes a new event). No text is produced unless the player is near.
5. **Expression: conversation.** The player's conversations read layers 2–4 (versions, hedges by certainty, second-order beliefs,
   recent conversations, opinions with reasons).

**Life events** feed layer 1: illness, lost and found money, windfalls, loans and defaults, a bad or good week in business,
unusual deliveries, notable catches and harvests, family quarrels.

**Before the player arrives** a fast, abstract version of layer 4 runs for 60 days (encounters at home, at work, with friends,
at the tavern; life events; gossip; forgetting), seeded from the town seed so a seed always gives the same history.

**Cost.** Exchanges are event-driven and cheap (no language, a few numbers and a knowledge copy). Background exchanges are
scheduled every few game minutes for people who are free and near somebody; far-off people are not simulated in more detail
than the existing village already is. The pre-simulation is abstract (no walking, no pathfinding).

## 3. How we will know it works

- `tools/network.mjs` (new): how far a story travels in 1, 3 and 7 days; how many versions of it exist; how many beliefs are wrong;
  how many second-order beliefs people hold; how asymmetric relationships are; the state of the village at the player's arrival.
- `tools/sift.mjs`: story-shaped patterns a week, and how many villagers are in them (before this round: 1.9 a week, 11 of 27).
- `tools/longevity.mjs`: new facts per day for the player (before: about 25% from day 10 on).
- Tests: the pre-simulation is deterministic and fast; news does not reach everyone at once; versions differ; relationships form
  from interactions; nobody starts as a blank slate.

## 4. What was built, and what it measured (Nov 2026)

All five layers exist (see CLAUDE.md, "The social simulation"). Measured with `tools/network.mjs` and `tools/sift.mjs`:

| | before | after |
|---|---|---|
| Story-shaped patterns a week, village left alone (`sift`, 28 days) | 1.9 | 43 |
| Villagers who appear in a story | 11 of 27 | 24 of 30 |
| Kinds of pattern seen | 1 (romance) | 13 of 14 (no "rumour outran the truth" yet) |
| Things each villager knows at arrival | 0 (blank slates) | ~24, plus ~7 beliefs about how others feel and ~26 reasons for their own feelings |
| Stories known by 3+ people at arrival, with more than one version / somebody wrongly blamed | – | 63, 21 / 4 (town `network`) |
| News spread after 1, 3, 7 days (median knowers of a first-day event, of 19) | instant to witnesses, then patchy | 2, 5, 6 (the biggest reach 17) |
| Relationships at arrival | flat | 13 mutual friendships, 1–2 mutual rivalries, 6–10 one-sided dislikes per town |
| Conversation, days 10–19 (`longevity 20 6 10`): new facts / new wording | ~25% / 10–13% | ~37% / ~18% |
| Pre-simulation cost | – | 60 days in ~25 ms |
| Starvation in 12 days, 9 towns | 3 | 0 (children could not eat the dole grain they were handed; fixed) |

What the player hears now: an event in the speaker's version ("They are saying Marcus took a ham from Sabina's house"), with how they know it
("I saw it myself" / "Galla told me, though I would not swear to it" / "Nobody saw who. I would bet my last coin it was Nero"); who cannot
stand whom and why ("Severa would cross the square to avoid Marcus. Ever since Severa and Marcus had words in the street"), and whether
the speaker agrees; reasons for their own feelings ("Why? The money Quintus still owes me. That is why."); what happened to them today
("I had to ask Gaius for a loan. Do not look at me like that."); and an argument when you say you heard it was somebody else.

Not done yet:
- Opinions about businesses, traditions and changes to the village (only opinions about people are modelled).
- "Rumour outran the truth": invented stories (`fake`) are only made by the player and by smears in conversation; villagers do not yet invent outright.
- Suspicion is formed once, by the victim's household; nobody investigates or changes their mind except when the player contradicts them.
- One-sided feelings are still fewer than in a real village; unrequited courting is the main source.
- The economy is still fragile: whole towns can run out of food for sale, and the dole is the safety net.
