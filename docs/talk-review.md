# Talk engine review

A review of the design (`docs/talk-engine.md`), the code (`src/talk/`) and the text the game produces now
(five-day playtests of the `village`, `meddle`, `romance` and `social` scenarios, about 600 lines read closely).
It ends with a task list split into work that is well specified enough to hand to a smaller model and work that
needs design judgement.

## The short version

The design is good. The implementation went wide instead of deep: about 150 acts exist, and most conversations
are still a greeting, two or three unrelated question-and-answer pairs, and a three-line goodbye.
The best material in the game (being confronted about a wall you knocked down, a homeless man mentioning his
missing bed, "I bought 4 bread today") is good because it is about something that happened. The weak
material is everything that is about nothing.

Four things hold the text back, in order of how much they matter:

1. **Nothing happens for people to talk about.** In a quiet week, "any news?" is answered "nothing" 29 times out of 30.
   The design says two thirds of talk is about people and events. The village does not produce enough small events.
2. **Conversations have no thread.** Topics are drawn from a weighted bag. Nobody follows up, nobody remembers
   what was said two lines ago, and more than half of every conversation is ritual.
3. **A structural bug corrupts what people say.** Acts keep their subject in one shared bag, and checking whether an
   act *could* be said overwrites it. People answer questions about the wrong person.
4. **One voice.** Nearly every island line is "statement, then a wry aside about the statement". Said by twelve
   people forty times a day, it reads as one author doing a bit.

## What works

- **Deeds.** "Ah. You. The one with the walls." / "You pulled Paullus's house down. I was standing right there." /
  "Very well. We will not mention it again. I will, but not today." Specific, consequential, funny. The meddle loop
  (deed, witnesses, blame on the wrong person, reputation, confrontation, answer) plays through end to end.
- **Grounded life lines.** "I still have no bed. I have started to think of the horizon as my bedroom." /
  "I am short. I counted on the way and again just now." These come from real state and it shows.
- **Children.** "Fine. I found a very good stick."
- **The machinery around the text**: the playtest harness, the lint, the registry that stops talk about things that
  do not exist, off-screen conversations, the journal, the villager card.

## What is wrong, with evidence

### A. Bugs a reader sees at once

| Seen in the transcript | Cause |
|---|---|
| "What do you make of Secunda?" answered "Quinta is one of the good ones." | `when()` of `ask_opinion`, `gossip_person`, `ask_family`, `ask_where`, `warn`, `brag_child`, `tell_rep`, `story_preface` write `c.about` and friends. The chooser calls every `when`, so the last one checked wins. |
| Varro says "I am fond of Corvus. He was kind about me." twice in a row | `give_opinion` then `gossip_person` on the same person; no record of what was just said. |
| A father asks the mother "What is your view of Varro?" (their son) | Opinion acts ignore how the asker and the person asked relate to the subject. |
| A seven-year-old: "You make the island more bearable." and "What does flowers cost these days?" | The child voice covers a few acts; children can use every adult act. |
| "What does flowers cost", "There is cabbage seeds at the seed stall" | Lines assume a singular `{item}`; no number agreement. |
| "That is the best news of the afternoon" at 09:26; "Good day to you. It is, so far." at midnight | Lines mention a time of day without a `band` tag. |
| "Good. Good day. That is out of the way." | The formal register is a regex that swaps "Hello" for "Good day" inside any sentence. |
| "Ugh. Yes. I know that one." from a woman with a bed to a man without one | `empathise` lines claim shared experience they do not have. |
| "Paullus's house came down, and Tipping was there", said by Tipping | Events are worded in the third person even when the speaker did it. |
| "I heard what Corvus thinks of Brutus", said to Corvus, in the player's menu | The "you" fix is applied in `apply`, not in `preview`. |
| "It is said you knock things down. 7 people have said it." and again the next day, "8 people" | `tell_rep` and `warn` have no memory of having been said. `warn` about the bot fired 16 times in five days, with one reply line 22 times. |
| "Livia & Livia" as a conversation | Solo barks are logged as a talk between a person and themselves. |

### B. Conversation shape

- **Ritual is more than half of the talk.** A typical exchange is nine lines, five of them greeting and goodbye.
  A married couple meeting at home at nine in the morning greet each other formally and part with "Farewell."
  The design (6.1) says the opening depends on closeness and time since the last meeting. That was never built.
- **No follow-up.** "Corvus is in a good mood. I have decided not to question it." gets no reply and the next line
  is about something else. Only `answer_how`, `report_day` and news have reactions.
- **No agenda.** The "purpose" fix multiplies some weights by five for the first topic. It is still a draw from a bag.
  Design 5.5 (goals) and 8.1 (the chooser serves goals) are not implemented.
- **No shared ground** (design 6.5). The same question is asked of the same person day after day.
- **Stall exchanges are seven bubbles to buy one seed**, dozens of times a day, the same every time.

### C. The world gives them little to say

- News in a quiet week is "the seed stall has potato seeds". Everybody reports it as their day.
- Opinions come with reasons like "We have talked a few times" and "He was kind about me" because the ledger only
  records talk itself. Nothing in ordinary life (help in the field, a debt, a slight, a shared meal) writes a reason.
- The good events (theft, quarrels, courting) exist in the older `life2` layer but are rare or switched off in the
  farming world.

### D. Voice

- The island pack is one device repeated: a plain statement followed by a self-aware aside
  ("I checked.", "I do not know why.", "That is a report of a kind.").
  One such line in a conversation is charming. Four in a row from two speakers is noise.
- The registers (terse, warm, formal, chatty) are string edits after the fact and produce artefacts.
- The player's menu shows full lines in that same voice, so the player picks a quip and finds out what it meant.
  Design 8.2 describes a menu of *acts*. The menu should say what the option does ("Deny it", "Blame somebody else",
  "Ask after Secunda") with the line as the result.

### E. Code

- **Acts, effects and words share files again** (lesson 2 of the design). `depth.ts` is 56 KB of acts, deciders,
  helpers and 156 lexicon calls. `deeds.ts`, `gifts.ts`, `requests.ts` and `romance.ts` do the same.
- **Slots are a hand-kept flat bag** (`talkX`) and a chain of `.replace` calls in `lxSay`. A new act needs edits in
  three places; forgetting one prints "them" or an empty gap. Most of the text slips found by the harness were this.
- **Everything is one line per function.** A trailing `//` comment swallowed live code four times this week
  (mushrooms, news scoring, a test, `TE.pick`).
- **Line choice is "most tags wins"**, so a tagged line beats every untagged one every time ("Have you eaten?"
  whenever a parent meets a child).
- **Cost.** `lxContext` calls `repWord` for every line; `repTags` scans 120 memories and does a linear search of up
  to 1500 events for each. `warn.when` does that for every villager. Fine at twelve people, not at fifty.
- **Two event systems still run side by side** (`LIFE.emit` and the older `lfEmit`/`lf2Learn`/`kn`). The old one
  still moves affection on its own, which is why a gift someone disliked raised fondness by 22.

## Recommendation

Stop adding acts. Fix the loop that chooses what is said, give the village more to talk about, and rewrite the voice
to a rule. In that order, because a better chooser with nothing to choose from changes little, and better lines in a
conversation with no thread are still noise.

## Tasks

### For a smaller model (well specified, checkable with the harness)

Each is independent unless it says otherwise. "Check" is how to know it is done; run
`node tools/playtest.mjs village --days=5` and the named test.

1. **Number agreement for `{item}`.** Add `{is}`/`{are}`-style agreement or reword every line that puts a verb next
   to `{item}`/`{things}` ("What does {item} cost", "There is {item}"). Add a lint rule in `tools/playtest.mjs` for
   `\b(is|does|has|was) \w+s\b` after a slot. Check: no hits in four scenarios.
2. **Band tags.** Every line containing morning/afternoon/evening/night/supper/"so far"/"late" gets the right `band`
   tag or loses the word. Add a lint rule that flags a band word spoken in the wrong band.
3. **Children's act list.** Give acts an optional `minAge` and set it on praise, prices, opinions of adults,
   romance, secrets, favours, advice. Under twelve: greetings, how-are-you, play remarks, family, jokes, wonder.
   Check: no child line in the transcript outside the allowed acts.
4. **Solo barks.** `mutter` and `call_child` should not be logged as a conversation between a person and themselves;
   give `talkFinish` a `solo` flag, keep the bubble, log them under `kind: 'bark'`. Update the harness heading.
5. **First person for your own deeds.** In `TE.text`, when the speaker is the believed doer use an `ev1:<kind>`
   template ("I knocked a wall out of Paullus's house") and write those templates for the fifteen meddling and
   crime kinds. Check: the `confide` option in the meddle scenario never contains the bot's own name.
6. **`peopleYou` in previews.** Apply the listener-to-"you" substitution wherever `peopleReason` feeds a `preview`.
   Extend the harness's "listener named in the third person" rule to menu options.
7. **Said-once memory for `tell_rep` and `warn`.** Record `told_rep`/`warned` in the teller's memory per listener
   and subject; do not repeat within ten days. Six more reply lines each for `warn_thanks`, `rep_own`, `rep_deny`.
8. **Empathy lines that claim nothing.** Split `empathise` into lines tagged `shared: 'yes'` (the speaker has had
   the same trouble in the last week, from their day log) and untagged ones that only sympathise.
9. **Formal register as lines, not regex.** Remove `LX_FORMAL`. Tag twenty ritual lines per pack `reg: 'formal'`
   and add `reg` to `lxContext`. Same for `warm` (lines with an address word) and `terse` (short lines).
   Keep `chatty` as the only post-process, or drop it.
10. **Short stall exchanges for regulars.** In `serviceScript`, a customer who bought from this keeper in the last
    two days gets three turns (ask, price, thanks). Check: median stall exchange length under five lines.
11. **Index events by id.** Replace every `lf2Ev().find(q => q.id === ...)` with a `Map` kept beside the list.
    Cache `repTags(obs, subj)` per observer for an hour of game time. Check: `tools/talkstats.mjs` time per day
    does not rise; add a 50-villager timing run to the harness.
12. **One statement per line.** Run a formatter over `src/talk/` and add a check to `scripts/build.mjs` that fails
    on `;   // ` followed by code on the same line. No behaviour change; the full suite must pass unchanged.
13. **Split words from acts.** Move every `lx`/`lxi`/`LXP`/`LXI`/`LXL` call out of `depth.ts`, `deeds.ts`,
    `gifts.ts`, `amends.ts`, `requests.ts`, `romance.ts`, `secrets.ts`, `reputation.ts`, `people.ts` into
    `src/talk/words/plain-*.ts` and `src/talk/words/island-*.ts`. Split `depth.ts` by subject. Order in
    `order.json`: acts first, words last. No behaviour change.
14. **Weighted line choice.** In `lxSay`, score as now but pick at random among candidates within 1.5 of the best,
    and make the per-listener "heard lately" penalty last three days. Check: no line above 4% of a scenario's lines.
15. **Opinions among kin.** `ask_opinion`/`gossip_person` are not offered when the subject is the close kin of
    both speakers, or the spouse, parent or child of the person asked; `ask_family` covers those.

### For design judgement (I would take these)

A. **Bindings instead of a shared bag.** `when(c, sp, li)` returns the act's arguments (`{ about, item, ev, ... }`)
   or nothing, and never writes to `c`. The chooser keeps the arguments of the act it picked; `apply(c, sp, li, args)`
   and the lexicon get them. Each act declares the slots it supplies, and a test fails when a line uses a slot its
   act does not supply. This removes the wrong-subject bug, `talkX`, the `preview` duplication and the menu's
   special cases in one move. Everything else is easier after it.

B. **Agenda and thread.** Each person arrives with zero to two things they want from this talk, taken from
   memory: something to tell, to ask, to settle, to give. The conversation serves those first. A topic stays open
   until it is answered and, when the answer is worth it, followed up once ("Why? What happened?").
   Small talk fills only what patience is left. Opening and closing scale with closeness and time since the last
   talk: people who live together skip both. Pair-level shared ground: what A has told B is not told or asked again.

C. **Things worth saying.** A pass over ordinary life to emit small, tellable, *social* events with a who and a
   to-whom: helped in the field, shared a meal, borrowed and returned, snapped at somebody, was late, found something,
   won at dice, fell ill, got better. Each writes a reason into the opinion ledger. Target from the harness:
   "any news?" has an answer more than half the time in a quiet week, and no opinion's reason is "we have talked".

D. **A voice rule, then a rewrite of the core lines.** Proposal: most lines are short and unmarked. A dry aside is
   allowed on at most one line in four, and it must hang on something in the world (a number, a name, an object),
   never on the sentence itself. Two or three people have a signature turn of phrase; nobody else borrows it.
   Then rewrite the twenty most used acts to that rule, both packs, and delete lines that break it.

E. **The player's menu.** Options are labelled by what they do, grouped (ask, tell, give, answer), with the spoken
   line shown once chosen. Confronting, denying, blaming and confessing should read as decisions.

F. **One event system.** Fold `lfEmit`/`lf2Learn`/`kn` into `LIFE.emit` and the memory engine so that feelings are
   moved in one place.

### Suggested order

A first (a few days of careful work, no visible change except the wrong-subject bug). Tasks 1 to 15 can run
alongside in any order except 13, which should follow A to avoid moving the same lines twice.
Then B and C together, measured with the harness. D once B and C make conversations worth reading. E last.
