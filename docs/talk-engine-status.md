# Talk engine: what is built against the design (docs/talk-engine.md)

Legend: done / partial / not yet / parked (decided to wait: law, groups).

## Phases (section 15)
| Phase | State | Notes |
|---|---|---|
| 1 Skeleton | done | registry, acts, memory, chooser, lexicon, approach and bubbles |
| 2 News and memory | done | versions, confidence, overhearing between villagers, journal |
| 2b Life events | done | `LIFE.emit`, day log, report_day, complaints digest; stalls, barks |
| 3 Meddling v0 | partial | walls, houses, sleepers carried, privy: witnesses, anonymous deeds, cries, grudges, news. Missing: reactions as movement (flee, cover, rebuild, put it back), furniture/couple/person moves, more exposure states (bathing, in bed, praying), reputation tags, suspicion and scapegoats, naming the incident |
| 4 The player's turn | partial | menu, replies to accusations, confess, deny. Missing: blame someone else |
| 5 Island voice | done | island pack (516 lines), tics, anti-repeat. Missing: running jokes and callbacks |
| 6 People | partial | opinions with reasons, gossip, family. Missing: reflection (daily patterns become opinions), suspicion and attribution |
| 7 Feeling, economy, requests | partial | vent, console, praise, favours (food, bed), threads in the journal. Missing: loans, bargains, offers of work, errands (find a thing, move a bed, silence a gossip), blame, boast |
| 8 Gifts | partial | giving, amends, refusing, for everyone. Missing: preferences and hints, anonymous and forged gifts, returning a gift |
| 9 Romance | partial (written, being tested) | flirt, declare, ask to walk, propose; the player's consent rule kept. Missing: jealousy and rivals in talk, parted lovers, reconcile |
| 10 Law and secrets | secrets done; law parked | confide, leak, betrayal. Law (accuse, confess to the watch, question) waits |
| 11 Scale and polish | partial | keeper barks. Missing: other barks (muttering at work, weather, calling a child), groups (parked), sound murmur, 50-villager timing, coverage tooling, severity and distortion dials |

## Other sections
- 5 memory: bounded store and truth vs belief done; reflection, goals, richer relationship ledger (trust, respect, debt, what I think they feel) not yet.
- 6 conversation: shape, budgets done; topic links and depth escalation, stories (preface, invite, body, reaction), pair-level shared ground and callbacks, interruption and "where were we" not yet.
- 7 act catalogue: about half. Not yet: backchannel, weather and food remarks, joke, laugh, complain, wonder, warn, ask_directions, report_sighting, rumour, correct, confirm, ask_about_you, defend, advice, loans, offer_work, brag_child, remind_chore, family_row, reminisce, evade, change_subject, interrupt, refuse_to_talk.
- 10 where and when: always-on, lazy wording done; TrueSight perception for villagers, event-driven talk waves (a death, a harvest) not yet.
- 12 presentation: bubbles, card, journal, talk box done; card hints about what they want and what they know about you, the "someone is speaking" marker, sound murmur not yet.
- 14 fun mechanics: ask-about done; eavesdropping into the journal, trading information, reading people (learned tastes), following a rumour's path, occasions not yet.
- 13 tests: structural tests done; freshness and richness metrics tooling not yet.
