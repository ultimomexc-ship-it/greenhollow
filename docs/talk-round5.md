# Talk engine: round 5 and what is left

Written after the fifth playtest round (four scenarios, six game days each, read as a player would).
The earlier review is `docs/talk-review.md`; the prompts for the smaller tasks are in `docs/sonnet-prompts.md`.

## Where it stands

| | village | meddle | social | romance |
|---|---|---|---|---|
| conversations in 6 days | 256 | 238 | 250 | 360 |
| with a real purpose | 71% | 73% | 52% | 61% |
| median length (lines) | 8 | 8 | 8 | 7 |
| "any news?" answered | 24 of 28 | 25 of 29 | 7 of 12 | 43 of 56 |
| opinions with a weak reason | 9 of 27 | 16 of 40 | 25 of 44 | 14 of 48 |
| text slips found by the lint | 0 | 0 | 0 | 0 after fixes |

(The weak-reason row was measured before the last change, which drops "We have talked a few times" altogether; an
opinion with no real reason is now said without one.)

## Fixed in round 5

- **"Any news?" was never answered.** People only asked when the other had already said their piece. It is now asked
  first, of somebody who has something to tell, and counts as a reason to walk over. Answered about 85% of the time.
- **Short talks said nothing.** One talk in four is cut short, and with no greeting due that left no room for even
  the one thing somebody came to say. Whoever came with something now always gets to say it.
- **The same warning, word for word, to the same person three times in a night.** A warning is remembered by the
  listener and given once; seven more warning lines and eight more replies.
- **A villager walking over to talk wandered off.** They were still chasing an old greeting target. (Found by a test
  that had been passing by luck.)
- **"4 bread."** The terse voice clipped a line to its first two words. It now needs three words to stand alone.
- **"I heard that you thinks well of him."** Hearsay reasons are worded so they survive being said to the person.
- **A grievance option with no words** (the player's `raise_deed` label had no deed to name).
- **"Mind you, you didn't hear it from me"**: no linking phrase on a line that already opens with one.
- Three plain-pack lines with a stray "...".

## What still reads badly (my list, needs judgement; also in NOTES.md)

1. **Opinions without history.** About a third of opinions have nothing behind them. Small life gives reasons
   between people who work or eat together; people who merely pass each other have none. Wants two or three more
   sources of shared history (neighbours, a child's friend, a debt, a favour remembered) rather than more words.
2. **Romance barely moves in a week.** Six days gave 1 flirt, 2 invitations to walk, no declaration, no proposal.
   The acts work (tests cover them); the thresholds are tuned for months. Decide the pace wanted, then tune `romOK`
   and the weights.
3. **The social bot dilutes purpose** (52%): talking to everybody all day runs people out of things to say, and
   they fall back to small talk. Correct behaviour, but the player's menu then offers mostly small talk. The menu
   could say so ("Nothing new to say to Livia yet") instead of offering three remarks about the weather.
4. **Blame is uneven.** In some runs an unseen deed is pinned on three different innocents, in others on nobody.
   `repSuspect` wants a floor: at least one guess per deed that anybody learns of.
5. **The law still reads the old ledger** (`n.kn`). It is now fed from conversation, so it behaves, but the
   watch should read `tmem` directly and `kn` should go. Do it together with law talk (accuse, confess, question),
   which is still parked.
6. **Groups** (three people talking, joining and leaving a conversation) are still parked.
7. **The plain voice** (the ready village) did not get the short-line pass the island voice got. Prompt 17 covers
   the mechanical part; someone should read the result.

## Housekeeping done

- `CLAUDE.md` pointed at an old artifact address; corrected.
- `docs/talk-review.md` has a progress section for tasks A to F.
- Tools added along the way and worth keeping: `tools/lexpool.mjs` (short and long lines per act),
  `tools/lextags.mjs` (lines with their tags), `tools/actlist.mjs` (topics and replies).

## Housekeeping not done

- The Tests section of `CLAUDE.md` still describes the suite as it was many rounds ago (it says 85 tests; there
  are 99). Prompt 20.
- `NOTES.md` has not been brought up to date with the talk work. Prompt 20.
- (done) `depth.ts` was split and the words moved out: prompts 12 and 13.
