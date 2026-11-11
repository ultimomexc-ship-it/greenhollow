# Talk engine (design, v0)

One conversation system for everybody. A villager and the player use the same moves; the only difference is who picks the next one
(the player from a list, a villager by personality, mood and relationship). Replaces every older chat engine (`dialogue/cv-*`, `bumpTalk`,
`lf2Gossip` speech, `sbSayIfNear` and the other background voicing, authored scenes, the scripted `say()` lines).

## Three layers

1. **Acts (what is said).** Pure data, no words. `{ act, from, to, args }`, e.g. `greet`, `smalltalk`, `share_news {event}`, `ask_about_person {who}`,
   `hint_gift {item, for}`, `give_gift {item}`, `flirt`, `apologise`, `vent`, `console`, `farewell`. Each act type declares
   - `when(speaker, listener)`: what the speaker must know or feel (reads the belief model, `social2/sb-core`),
   - `apply(speaker, listener, args)`: what changes (beliefs, opinion, trust, memory, reason ledger),
   - `replies(...)`: the acts that can sensibly follow it (the adjacency pair: question -> answer, offer -> accept/refuse, greeting -> greeting),
   - `kind`: the switch group it belongs to (`world`, `person`, `small`, `romance`, `gift`, ...). `TALK.on[kind]` turns a whole group off.
2. **Lexicon (how it is said).** A table from act + context to wording. A line has `act`, optional `tags` (personality, mood, relationship, register),
   `pack` (voice: `roman`, `island`, `plain`, ...), `requires` (world things it mentions) and a template with slots (`{item}`, `{who}`, `{place}`).
   Choice = filter by `requires` and `pack`, score by tag match, penalise what the listener heard lately. Wording can be composed (opener + body + tag).
   Changing period or mood is a change of table, never of logic.
3. **Registry (what exists).** `WORLD.has(kind, id)`: items, places, features, mechanics, jobs. Act arguments are ids resolved when the line is spoken; a line whose
   `requires` is not registered is never chosen, and a test fails on any line that names something not in the registry. Removing a mechanic therefore silences
   its talk by itself (this replaces `placeWords`).

## Conversation shape
opening (greet) -> one or more topics (each a chain of act/reply pairs; a topic can drift to a neighbour: "speaking of Marcus ...") -> pre-closing -> farewell.
Each side has an interest budget so talk ends by itself. A conversation keeps what has been said (shared ground) so nothing is told twice.

## Where it runs
- Always, wherever the villagers are. Off screen only the acts are applied (beliefs move, memories form, the chronicle may note it); words are looked up only
  when somebody is listening (the player is near, or the log is asked). That is how news travels beyond what anyone sees.
- Villagers find talk partners by a radius for now (truevision later if needed), walk up, stop, talk (`sbMeet` is the start of this).
- The player's turn: the engine offers the acts the player's villager could make now (each realised in the pack's voice); the player picks one.

## Kept
`social2/sb-core` (versions of events, trust, the reason ledger), the effects of the background exchanges (borrow, repay, confide, leak ... become act `apply`s),
`sb-life`, `sb-presim`, the bubble drawing (`drainEvents` and `bubbles`), the villager card. Old banks are mined for lexicon lines, not shipped.

## Deleted when the new engine has a playable slice
`dialogue/*` (cv-*, opinions-scenes, player-talk, pacing, place-words), `social/story-conversations` talk parts, `social2/sb-voice`, speech parts of `social-life`'s `say()` sites.
Until then the switch `TALK.engine = 'old' | 'new'` chooses.

## First slice
Acts: greet, smalltalk, share_news, hint_gift, farewell. Packs: `island` (Murakami) and `plain`. Switches per kind. A lab island where only the new engine talks.
