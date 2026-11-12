# Prompts for the smaller talk-engine tasks

Each block below is a complete prompt: paste one into a new session on this repository. They are independent unless
a prompt says otherwise. Suggested order: 12 first (it stops a recurring build break), then 13, then the rest in any
order. Do 13 before any prompt that adds many lines, so the words land in the right files.

Every prompt assumes this ending, so it is written once here and repeated in short in each:

> Work on a branch. Run `npm run build` and `npm run typecheck` (zero errors). Run the named tests, then the full
> `npm test` detached (it takes about ten minutes; do not build while it runs). Commit `dist/index.html` with the
> change. Merge to `main` only when the full suite passes. Do not change behaviour beyond what the task says.

---

## 12. One statement per line, and a build check for swallowed code

```
Read CLAUDE.md, section "How the code is put together".

Problem: files in src/talk/ pack several statements on one very long line, with trailing `// comments`. Six times
now an edit has put a `// comment` in the middle of such a line and silently commented out the code after it.

Do two things, with no change in behaviour:

1. Reformat every file in src/talk/ and src/life2/smalllife.ts, src/life2/meddle.ts so that each statement is on
   its own line and each object-literal property of an ACTS entry (kind, stage, when, w, apply, replies, preview,
   follow) is on its own line. Keep every comment, moved to the line above the code it describes. Do not rename,
   reorder or rewrite logic. Lexicon calls (lx, lxi, LXP, LXI, LXL) may stay one per line.

2. In scripts/build.mjs, before the esbuild step, fail the build with the file name and line number when a source
   line matches: a `//` comment that is followed, on the same physical line, by nothing — but the line ALSO
   contains a `;` or `{` before the `//` and is longer than 240 characters. (That is the shape of every past
   accident.) Print the offending lines. Add a note about the rule to CLAUDE.md under "How the code is put together".

Check: `git diff --stat` touches only formatting in src/talk; dist/index.html differs only in whitespace-insensitive
ways (run `node tools/playtest.mjs village --days=3 --seed=41` before and after: the reports must be identical apart
from timings). Full `npm test` passes with no test edited.
```

## 13. Split words from acts (DONE: see docs/talk-review.md; kept for the record)

```
Read CLAUDE.md, section "Talk", and docs/talk-review.md task 13. Do prompt 12 first if it has not been done.

Lexicon lines (calls to lx, lxi, LXP, LXI, LXL, and the S(...) helper in pack-short.ts) are scattered through the
files that define acts: src/talk/depth.ts, deeds.ts, gifts.ts, amends.ts, requests.ts, romance.ts, secrets.ts,
reputation.ts, people.ts, service.ts, barks.ts, lexicon.ts.

Move every such call into new files under src/talk/words/, one per pack and subject:
plain-ritual.ts, plain-life.ts, plain-news.ts, plain-people.ts, plain-deeds.ts, plain-gifts.ts, plain-romance.ts,
plain-trade.ts, plain-small.ts, and the same with island-. Keep pack-island.ts and pack-short.ts content by moving
it into the island- files (pack-short's lines keep a comment saying they are the plain short lines of the island
voice and must stay one sentence). Helper definitions (lxi, LXP, LXI, LXL) go in src/talk/words/helpers.ts.

Then split what is left of depth.ts by subject (links and stories, small acts, thread acts, family and children),
each under 150 lines.

Add all new files to src/order.json: every acts file first, then words/helpers.ts, then the words files.
No behaviour change: the set of (act, pack, text, tags) in LEX must be identical before and after. Prove it: write
tools/lexdump.mjs (model it on tools/lextags.mjs) that prints every LEX entry sorted, run it before and after, and
diff. Update the file names mentioned in CLAUDE.md. Full `npm test` passes with no test edited.
```

## 1. Number agreement after `{item}` and `{things}`

```
Read CLAUDE.md, section "Talk" (the paragraphs on slots and on the playtest harness).

Lexicon lines put a verb next to a slot whose value may be singular or plural: "What does {item} cost",
"There is {item} at the {shop}", "{item} has gone up". With a plural item ("cabbage seeds") these read wrongly.

1. List every line in LEX whose text has is/does/has/was/costs/goes within three words of {item} or {things}
   (use tools/lextags.mjs as a model for reading LEX from the built game).
2. Reword each so no verb has to agree ("The price of {item} has gone up", "The {shop} has {item} now"), in both
   packs. Keep the island voice rules at the foot of the Talk section in CLAUDE.md: dry, exact, no exclamation marks.
3. Add a lint rule to tools/playtest.mjs that flags, in spoken lines, `\b(is|does|has|was) (\w+ )?\w+s\b` directly
   after a place where a slot was filled with a plural name, and reports it under "Text slips".

Check: `node tools/playtest.mjs village --days=6`, `meddle`, `social`, `romance` all report "no text slips".
Run `node tests/run.mjs lint` and `node tests/run.mjs bindings`, then the full suite.
```

## 2. Time-of-day words only at the right time

```
Read CLAUDE.md, section "Talk" (lexicon tags: band).

Some lines mention a time of day ("Morning.", "this morning", "Evening.", "supper", "so far today", "it is late")
without a `band` tag, so they are said at the wrong hour.

1. Find how `band` is computed in lxContext (src/talk/lexicon.ts) and what values it takes.
2. For every LEX line, in both packs, whose text contains morning, afternoon, evening, night, tonight, supper,
   breakfast, noon, dawn, dusk, "so far", "late" or "early": give it the matching band tag, or remove the word.
   A line that works in two bands needs two entries.
3. Add a lint rule to tools/playtest.mjs: a spoken line containing one of those words at an hour outside its band
   is reported under "Text slips" as "wrong time of day" (the harness has the game time of each conversation).
4. Make sure greet and greet_back still have at least six untagged lines per pack, so a greeting is always possible.

Check: the four playtest scenarios report no "wrong time of day". `node tests/run.mjs talk`, then the full suite.
```

## 3. What children may say

```
Read CLAUDE.md, section "Talk" (acts as data; conversation depth; family lines).

Children under twelve currently use nearly every act: they praise adults, quote prices, give opinions of grown-ups
and ask favours. They should talk like children.

1. Add an optional `minAge` to act entries (ACTS) and honour it in one place: talkBind in src/talk/shape.ts returns
   null when the speaker is younger than the act's minAge. (The player is never a child; no special case.)
2. Set minAge 12 on: praise, ask_price/tell_price/react_price, ask_opinion/give_opinion/gossip_person/tell_rep,
   warn, ask_advice/give_advice, confide and the secret replies, ask_favour/chase_favour and replies, apologise,
   vent, snap, send_gift, story_preface. Set minAge 16 on every romance act.
3. Left for children: greetings and farewells, ask_how/answer_how, the remark_* acts, ask_family/answer_family,
   joke/laugh/groan, wonder/wonder_reply, ask_day/report_day/nothing_much, offer_gift and its thanks, ask_where.
4. Add a section to the harness report (tools/playtest.mjs): "Children said" with any act used by somebody under
   twelve that is not in the allowed list. It must be empty.
5. Add one test to tests/run.mjs: a child speaker gets no binding for praise or ask_price, and does for joke.

Check: four playtest scenarios show an empty "Children said". `node tests/run.mjs talk`, then the full suite.
```

## 4. Barks are not conversations

```
Read CLAUDE.md, section "Talk" (barks; talkFinish).

`mutter` (somebody talking to themselves at work) and `call_child` are logged in TALK.log as a conversation between
a person and themselves, and the harness prints them as "Livia & Livia".

1. Give talkFinish (src/talk/shape.ts) an optional `solo` flag. With it: the bubble is shown as now, nobody is held
   in place, no `talked` memory is written, and the log entry carries `kind: 'bark'` and only `a`.
2. Use it from the bark code in src/talk/barks.ts and src/talk/words and src/talk/barks.ts (moreBarks) for mutter and call_child, and
   for keeper calls that nobody answers.
3. In tools/playtest.mjs print barks under their own heading "Barks" (speaker, place, line), leave them out of the
   conversation count and the purpose and length numbers, and keep linting their text.

Check: no heading of the form "X & X" in any of the four reports; conversation counts drop by the number of barks.
`node tests/run.mjs bark`, `node tests/run.mjs depth`, then the full suite.
```

## 5. First person for your own deeds

```
Read CLAUDE.md, section "Talk" (phase 2 news; meddling; secrets).

When somebody tells of a thing they did themselves, the words come from the third-person template, with their own
name in it: "Tipping knocked a wall out of Paullus's house" said by Tipping. It should be "I knocked a wall out of
Paullus's house".

1. In TE.text (src/talk/events.ts), take an optional speaker. When the speaker is the one the version says did it
   (ver.who, or ev.actor when the version names nobody else), use the template `ev1:<kind>` if one exists.
2. Write `ev1:` templates, in both packs, for: wall_removed, home_destroyed, building_down, furniture_removed,
   person_pushed, bed_moved, caught_on_privy, caught_bathing, caught_praying, theft, shove, gift, help, lent_hand,
   sick_visit, betrayal. They take {t} (the other person) like the `ev:` ones and start with "I".
   When the listener is {t}, the existing listener-to-"you" substitution must still apply ("I pushed you about").
3. Pass the speaker from every caller that builds words for a turn: the previews of share_news, confide,
   raise_deed/deed replies, and peopleReason.
4. Add a lint rule to tools/playtest.mjs: a spoken line that contains the speaker's own first name is a text slip
   ("speaker named in the third person").

Check: in `node tools/playtest.mjs meddle --days=6` no line or menu option spoken by the bot contains its own name.
`node tests/run.mjs meddling`, `node tests/run.mjs secrets`, `node tests/run.mjs bindings`, then the full suite.
```

## 6. "You", not your name, in every option

```
Read CLAUDE.md, section "Talk" (bindings; the player's menu).

When a reason or a piece of news mentions the listener, it must say "you". This is done for spoken turns
(the helper is peopleYou; find it with grep) but not everywhere a `preview` builds the words for a menu option.

1. Find every `preview:` in src/talk/ that returns `reason`, `news` or `deed`. Make each pass its text through the
   same listener substitution the spoken path uses (one shared helper, called in one place if possible: lxSlots in
   src/talk/lexicon.ts is the single table every line goes through).
2. Verb agreement after the substitution: "you thinks", "you is", "you has" must not occur. Fix at the source of
   each such string (reword the reason so the listener is never its grammatical subject), not with a regex.
3. In tools/playtest.mjs extend the existing rule "listener named in the third person" to the bot's menu options
   (the harness records them in window.__M as "act :: label") and to the line shown after picking.

Check: four scenarios, no such slip. `node tests/run.mjs bindings`, `node tests/run.mjs "player talk"`, full suite.
```

## 7. Tell a reputation once

```
Read CLAUDE.md, section "Talk" (agenda and thread: talkNote, talkStale; reputation).

`warn` is now given once per listener and subject (see ACTS.warn.when in src/talk/depth-family.ts: the listener keeps a
`rumour` memory). `tell_rep` (telling a friend what is said about them) still repeats.

1. Make tell_rep record what was told in the listener's memory (kind 'told_rep', the tag, from) and refuse, in its
   `when`, to tell the same tag to the same person within ten game days.
2. Add six reply lines per pack for each of rep_own and rep_deny, and six more `tell_rep` lines per pack. Follow
   the voice rules at the foot of the Talk section; in the island pack at least four of each six must be one
   sentence (see the LXI lines in src/talk/words/island-*.ts for the tone).
3. Add a line to the harness report: the most repeated (speaker, listener, line) triple, and fail the "variety"
   check when any triple occurs more than twice in a scenario.

Check: four scenarios pass the new check. `node tests/run.mjs reputation`, then the full suite.
```

## 8. Sympathy that does not claim what is not true

```
Read CLAUDE.md, section "Talk" (life slice: report_day, empathise).

Lines for `empathise` such as "Ugh. Yes. I know that one." claim the speaker has had the same trouble. Often they
have not.

1. In the apply of report_day (src/talk/acts.ts) the kind of trouble told is known (c.life.kind). When the listener
   answers with empathise, set a context tag `shared: 'yes'` if the listener's own day log (LIFE, see
   src/talk/life.ts) has the same kind in the last seven days, else leave it unset. Add `shared` to lxContext.
2. Tag the existing empathise lines that claim shared experience with { shared: 'yes' }; leave the rest untagged.
   Write lines so that each pack has at least five of each sort.
3. Test in tests/run.mjs: a listener who never slept rough does not say a `shared` line when told of sleeping
   rough; one who did, can.

Check: `node tests/run.mjs "life slice"`, the new test, then the full suite.
```

## 9. Registers as lines, not as find-and-replace

```
Read CLAUDE.md, section "Talk" (voice and people; the voice rule). Do prompt 13 first.

lxVoice in src/talk/lexicon.ts changes a finished line by regular expressions: LX_FORMAL swaps words, `warm` adds
"friend"/"love", `terse` cuts to the first sentence, `chatty` appends a run-on. The swaps produce odd sentences.

1. Add `reg` to lxContext: the speaker's register from lxRegister (dry, terse, warm, formal, chatty).
2. Remove LX_FORMAL and the formal branch. Write twenty lines per pack tagged { reg: 'formal' } across greet,
   greet_back, farewell, farewell_back, pre_close, acknowledge, agree, answer_how.
3. Remove the warm branch. Write twenty lines per pack tagged { reg: 'warm' } for the same acts; where the line
   addresses somebody, use the existing rel tags (spouse, child, friend) for the address word.
4. Remove the terse branch: the voice rule already prefers short lines. Give terse speakers `sinceAside` = 0 always
   (never an aside) instead.
5. Keep chatty as the only post-process, unchanged.

Check: `node tools/lexpool.mjs greet greet_back farewell acknowledge` shows the new lines; four playtest scenarios
pass with no text slips; `node tests/run.mjs talk`, then the full suite.
```

## 10. Regulars get a short exchange at the stall

```
Read CLAUDE.md, section "Talk" (shop talk: talkService, serviceScript).

Every purchase runs the full eight-line exchange. Somebody who buys bread from the same baker every morning should
get three lines.

1. In serviceScript (src/talk/service.ts): when the customer has a `bought` event from this keeper's stall in their
   day log within the last two game days (LIFE.lastPrice shows how the log is read), and the result is 'ok', the
   script is: ask for (a `regular` variant), the price, thanks. No greeting pair, no farewell.
2. Write lines tagged { how: 'regular' } for ask_item and quote_price in both packs ("The usual." / "Four bread.
   Eight denarii."), at least five each, one sentence each.
3. Add to the harness report the median length of stall exchanges.

Check: median stall exchange under five lines in the village scenario. `node tests/run.mjs "shop talk"`, full suite.
```

## 11. Look events up by id, and cache reputations

```
Read CLAUDE.md, section "Talk" (reputation) and "Performance tools".

1. `lf2Ev().find(q => q.id === ...)` scans the whole event list; it is called from inner loops in src/talk/
   (grep for `lf2Ev().find`). Keep a Map from id to event beside the list (built where events are created in
   src/life2/core.ts, rebuilt on load in src/ui/saves.ts or lazily when the list's length changes) and add
   `lf2EvById(id)` if it does not already do this. Replace every such find.
2. repTags(obs, subj) (src/talk/reputation.ts) walks the observer's whole memory on every call. Cache the result
   per observer and subject for sixty game minutes, and drop an observer's cache whenever TM.add or TM.addEv gives
   them a memory.
3. Add `--people=50` to tools/talkstats.mjs if it has no such option and print milliseconds per game day.

Check: results unchanged (`node tools/playtest.mjs village --days=3 --seed=41` gives an identical report before and
after, timings aside); time per game day does not rise. `node tests/run.mjs "sim speed"`, then the full suite.
```

## 14. Less repetition in line choice

```
Read CLAUDE.md, section "Talk" (lexicon; the voice rule).

lxSay (src/talk/lexicon.ts) takes the best-scoring line. With few candidates the same line wins again and again.

1. After scoring, pick at random among the candidates whose score is within 1.5 of the best.
2. Make the per-listener "heard lately" penalty (li.heard) last three game days, fading, not ten hours.
3. Do not touch the voice rule (the `spare` filter) or the slot check.
4. In tools/playtest.mjs, leave greetings, farewells and stall formulas out of "Said too often" (they are meant to
   repeat) and fail the variety check when any other line is more than 4% of a scenario's lines.

Check: four scenarios pass the new check. `node tests/run.mjs talk`, `node tests/run.mjs freshness`, full suite.
(Any change here shifts the shared random stream: a test that fails afterwards may be showing a real weakness.
Find the cause before changing the test. See "Tests" in CLAUDE.md.)
```

## 15. No opinions asked about one's own family

```
Read CLAUDE.md, section "Talk" (people acts; family lines).

"What do you make of Livia?" is asked of Livia's husband, and of her own child. `ask_family` exists for that.

1. In the `when` of ask_opinion and gossip_person (src/talk/people.ts): the subject may not be the spouse, partner,
   parent or child of the person asked, nor close kin of both speakers. Use the same family test the `rel` tag
   uses in lxContext.
2. give_opinion about one's own kin, if it is ever reached, uses lines tagged with the rel (write three per pack for
   spouse, child, parent, sibling: fond, exasperated, loyal).
3. Test in tests/run.mjs: with A married to Z, B gets no binding for ask_opinion about Z when talking to A, and
   does get ask_family.

Check: the new test; `node tests/run.mjs "voice and people"`; four scenarios show no ask_opinion about a spouse,
parent or child of the listener (add that count to the harness report); then the full suite.
```

## 16. Every act has a menu label

```
Read CLAUDE.md, section "Talk" (the player's menu says what an option does).

PT_LABEL in src/talk/player.ts maps an act to [group, label]. An act with no entry shows its spoken line instead,
which breaks the menu's style. New acts will be added without labels.

1. Add a test to tests/run.mjs: every act that is a topic (TALK_TOPICS()) or appears in some act's `replies`, and
   is not of kind 'ritual' or a shop act (kind 'trade' used only by serviceScript), has a PT_LABEL entry whose group
   is in PT_GROUPS, and every {slot} in a label is one of about, item, news.
2. Add the entries the test finds missing. Labels are plain verbs in the imperative, under 40 characters:
   "Ask after {about}", "Say you do not know".
3. Two options in one menu must not read the same; ptOptions already falls back to the line then. Add a harness
   count of how often that fallback happened and print it.

Check: the new test; `node tests/run.mjs "player talk"`; then the full suite.
```

## 17. Short plain lines for the plain voice

```
Read CLAUDE.md, section "Talk" (the voice rule) and the short LXI lines in src/talk/words/island-*.ts.

The voice rule lets a speaker add an aside on one line in four; the other three need a short one-sentence line.
The island voice has them as one-sentence LXI lines in src/talk/words/island-*.ts. The plain pack (the ready village) has not had the same pass.

1. Run `node tools/lexpool.mjs` with the forty most-used acts (the "most used" line of any playtest report lists
   them) after changing the tool to take `--pack=plain`. For every act where the plain pack has fewer than three
   short lines in a tag group that has marked ones, write short lines to make it three.
2. Plain voice: a Roman villager, everyday, contractions allowed, exclamation marks allowed but rare, no modern
   idiom. One sentence, under ten words. Tags must match the group they fill (state, how, op, rel).
3. Put them in a new file (src/talk/words/plain-short.ts),
   listed in src/order.json after the plain lines.

Check: lexpool shows at least three short lines per group; `node tools/playtest.mjs romance --days=6` (it runs the
plain pack) has no text slips and fewer than half its lines longer than one sentence (add that number to the
report). `node tests/run.mjs lint`, then the full suite.
```

## 18. Clumsy event sentences

```
Read CLAUDE.md, section "Talk" (phase 2: event wording; the contract).

Some news is still said with the old sentence stored on the event (ev.text) because its kind has no `ev:` template,
and some templates nest one event inside another: "People say you confronted Tipping in front of everyone about how
someone was caught out when Tipping knocked the wall out."

1. List the event kinds (src/talk/kinds.ts) that have no `ev:<kind>` line in either pack (read LEX from the built
   game, as tools/lextags.mjs does). Write one for each in both packs: one clause, under twelve words, {a} did
   something to/with {t}.
2. Find every template or emitter that puts another event's sentence inside its own (grep for `about how`,
   `when {`, and for lfEmit calls whose text is built from another event's text). Replace with a short noun for the
   matter ("over the wall", "over the privy") taken from the inner event's kind: add a `matter` word to each kind's
   definition (EVK meta) and a {matter} slot.
3. Add a lint rule to tools/playtest.mjs: a spoken line over 22 words is reported under "Text slips" as "too long".

Check: four scenarios, no "too long" and no news line that falls back to ev.text (count the fallbacks in TE.text
and print the count in the report; it must be 0). `node tests/run.mjs news`, then the full suite.
```

## 19. Move the old event calls onto the one stream

```
Read CLAUDE.md, section "Talk": "The contract", and the last paragraph of the Talk section about lfEmit.

There are about sixty calls to lfEmit (src/life2/core.ts) in eighteen files. Each passes a ready-made English
sentence (`text:`), which the contract forbids: game code reports what happened as data, and only the lexicon has
words. LIFE.emit(kind, who, data) is the new call; lfEmit is kept as an adapter.

Do this file by file, one commit per file, smallest files first. For each lfEmit call:
1. Make sure its kind is registered in src/talk/kinds.ts with the `needs` it really has.
2. Make sure both packs have an `ev:<kind>` line (and `life:<kind>` if the doer would tell it as part of their day).
3. Remove the `text:` property from the call. If anything still reads ev.text for that kind (the chronicle, the
   villager card), make it build the sentence with TE.text(ev) instead.
Do not change who witnesses an event, its tags, its severity, or when it fires. Do not remove lfEmit itself or the
`kn` ledger: the watch and the law (src/life2/law.ts) still read them.

Check after each file: `node tests/run.mjs news`, `node tests/run.mjs contract`, the test that covers that file's
system. At the end: no `text:` left in any lfEmit call (grep), four playtest scenarios pass, full suite passes.
```

## 20. Bring the notes up to date

```
Read CLAUDE.md, NOTES.md, docs/talk-review.md, docs/talk-round5.md and docs/talk-engine.md.

No code changes. Documentation only.

1. CLAUDE.md, section "Tests": it describes an old suite ("85 tests", "Q cycles the hand modes"). Run
   `node tests/run.mjs --list` if it exists, otherwise read the test names in tests/run.mjs, and rewrite the
   "Current suite" paragraph as a short grouped list of what is covered now, with the real count and the real
   running time (about ten minutes).
2. CLAUDE.md, section "Talk": the first bullets still say "Phase 1" and "phase 2 ... are phase 2" for things that
   exist. Rewrite the section in the present tense, in the order a newcomer needs: the contract, acts, lexicon and
   the voice rule, bindings and slots, conversation shape (ritual, agenda, thread), memory and news, then the
   subject areas (people, deeds, gifts, favours, secrets, romance, reputation), the player's menu, barks, the tools.
   Remove the "Not yet" sentence's old numbered list. Do not drop any function or file name that is still correct;
   check each name with grep before keeping it.
3. NOTES.md: add a dated entry summarising the talk-engine work (tasks A to F from docs/talk-review.md, round 5),
   and move the open items from docs/talk-round5.md ("What still reads badly") into its to-do list.
4. docs/talk-engine.md: at the top, add a short "Status" table of the design's sections: built, built differently
   (say how), or parked (law talk, groups).

Check: every backticked identifier in the rewritten sections exists in src/ (write a small script that greps for
each and lists the misses; fix or remove the misses). `npm run build` still succeeds (docs do not affect it).
```
