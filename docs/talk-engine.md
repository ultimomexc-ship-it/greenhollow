# The Talk Engine: design document (v1)

One conversation system, one memory, for everybody on the island. This document says what we are building, why, what we already learned the hard way,
what the research says about how people really talk, and how all of it becomes a game that is believable and, above all, fun.

Status: design. The old chat engines are gone (git tag `last-with-old-talk` keeps them); nobody talks yet. `src/talk/base.ts` holds quiet stand-ins.

---

## 0. The idea in one page

> **A conversation is two people exchanging small, meaningful moves about things that exist in the world, each move changing what somebody believes, feels or wants.
> Words are the last, cheapest, most replaceable step.**

- **Acts, not sentences.** Everything anybody says is first an *act*: `{ act: 'hint_gift', from, to, item, for }`. Acts are data. The simulation, the tests, the player's menu and the
  villagers' decisions all work on acts.
- **Memory is the engine.** A villager can only say what they know, believe, want or feel. What they know comes from what they saw, did and were told.
  Talking is how knowledge crosses the island.
- **Same system for the player and for villagers.** Only the *chooser* differs: the player picks the next act from a menu, a villager scores the options with personality, mood, goals and relationship.
- **Words come from a lexicon**, a table keyed by act + context (personality, mood, relationship, setting, voice pack). Change the pack and the island speaks Roman, Murakami, or space.
- **The world is the vocabulary.** Acts refer to things by id through a registry. If a thing is removed from the game, nobody can talk about it, automatically.
- **It runs everywhere, all the time.** Off screen only the acts are applied (cheap); words are looked up only when somebody can hear them. That is how the village *knows things*.
- **The player is a force in the world.** Everything build mode and the player's verbs do is an *event* the island perceives, appraises and reacts to; meddling (moving people, parting lovers, taking down a wall) is the main source of fun (§3b).
- **The player's reward is understanding.** The fun is overhearing, piecing things together, being told secrets, spreading and stopping rumours, being known by a place that talks about you.

---

## 1. What we learned from the prototype (the mistakes)

The first village had six overlapping chat engines. What went wrong, so we do not do it again:

1. **Six producers of talk, one output.** `bumpTalk`, background exchanges, gossip timer, ~45 scripted `say()` calls, authored scenes, and the player conversation engine all fed one bubble routine.
   They disagreed about cooldowns, range, tone and who knew what. *Lesson: one pipeline, everything is an act.*
2. **Words were fused to logic.** Effects (trust, loans, gossip) lived next to hand-written sentences. Changing wording risked behaviour and vice versa. *Lesson: acts and words never share a file.*
3. **Talk only happened near the player.** Off-screen exchanges were silent *and* skipped, so the village was socially dead unless watched. *Lesson: conversations always happen; only the wording is lazy.*
4. **Text referred to things that did not exist.** A tavern that was never built, a market on a blank island. We patched it with `placeWords` after the fact. *Lesson: ground every reference in a registry before it is spoken.*
5. **Banks of lines go stale.** The freshness tools showed templates running out; "avoid what the listener heard least recently" helped but cannot invent facts. *Lesson: freshness comes from changing world state and personality, not more templates.*
6. **The player could not see anything happening.** Villagers did things for reasons nobody could read; conversations were bubbles that vanished. *Lesson: legibility is a feature (the villager card, "what are they doing and why").*
7. **Interrupting work broke the economy.** Making villagers walk up to talk pulled farmers and miners off jobs and starved the test island. *Lesson: talk is scheduled into idle time and resumes the interrupted plan.*
8. **Distance gating hid the best part.** Only speaking within 10 tiles meant most of the social world never happened in front of anyone. *Lesson: no range gate on what happens; a range gate only on what is rendered as words.*
9. **Tests tied to text rot.** Tests that checked sentences broke whenever wording improved. *Lesson: test acts and beliefs; lint wording separately.*

What worked and we carry forward: first-person versions of events (each villager's own belief, distorted when retold), a reason ledger for opinions, "chosen by what the listener heard least recently",
the villager card, villagers stopping to talk (`talkUntil`), the Murakami voice rules, authored-feeling generative text.

---

## 2. What the research says (and what we do about it)

Sources I searched this session are linked. Items marked *(background)* come from my general knowledge of the literature, not a search done now; check them before relying on exact numbers.

### 2.1 Conversation analysis (CA)
- **Turn-taking** (Sacks, Schegloff, Jefferson 1974): speakers exchange turns at predictable points (transition-relevance places); a turn either selects the next speaker or the next speaker self-selects. Gaps and overlaps are small and meaningful. [summary](https://www.simplypsychology.org/conversation-analysis.html)
  -> *A conversation is a sequence of turns, each with a clear next-speaker, and the bubble timing leaves natural gaps.*
- **Adjacency pairs**: question->answer, greeting->greeting, offer->accept/refuse, complaint->sympathy. A first part creates an expectation; a missing second part is noticed. [summary](https://www.simplypsychology.org/conversation-analysis.html)
  -> *Every act declares what can follow it. Declining or ignoring is itself a move with consequences ("she didn't answer").*
- **Preference organisation** *(background)*: agreement and acceptance come fast and plain; refusals and disagreement come delayed, softened, with excuses ("well... I'd love to, but...").
  -> *Refusals are realised with hedges and accounts by default; a blunt refusal signals anger or low regard.*
- **Openings and closings** *(background; my search did not retrieve this)*: conversations open with greetings, "how are you" rituals; they do not simply stop, they close through a **pre-closing** ("anyway...", "well, I should...") then a farewell exchange.
  -> *Every conversation has a shape (§6) with an opening, a pre-closing and a farewell. Abrupt endings are a deliberate signal (interrupted, offended, called away).*
- **Repair** *(background)*: people fix misunderstandings with "sorry?", "you mean X?". -> *Misunderstandings (a mistaken name, a wrong version) can be repaired in talk, and that is a rich source of small drama.*
- **Topic management**: topics are *shaded*, not switched: talk moves to a neighbouring topic through a shared element ("speaking of Marcus..."), or fades, pauses, and a new topic starts. Abrupt non-sequiturs are marked ("oh, by the way..."). [partial support](https://www.simplypsychology.org/conversation-analysis.html)
  -> *Topics are objects both speakers hold; transitions follow links between topics (same person, same place, same item, same feeling).*
- **Storytelling** (Labov; Sacks "second stories") *(background)*: a story needs a *preface* ("you won't believe what happened") that earns the right to take several turns; the listener shows alignment ("go on"); a story invites a *second story* in return.
  -> *Longer news is delivered as a short story with a preface and a listener reaction, and often gets a story back.*
- **Backchannels / continuers** *(background)*: "mm", "right", "oh?" keep a speaker going. -> *Cheap acts that show attention; they also leak interest (a bored backchannel ends the story early).*

### 2.2 Why people talk at all
- **Gossip is the bulk of talk.** Dunbar's studies find around 65% of casual conversation is about social topics (who, what they did, how they feel); replications give 65-85%. [APA](https://www.apa.org/monitor/apr06/bonding), [2024 replication](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/61BF5C91583F04053BE9471ED96FAE1D/S1866980824000541a.pdf/how-much-conversation-content-is-actually-social-human-conversational-behaviour-revisited.pdf).
  -> *Most acts are about people; the engine's centre of gravity is "who knows what about whom".*
- **Phatic communion**: small talk exists to maintain the bond, not to inform. [overview](https://www.ebsco.com/research-starters/communication-and-mass-media/phatic-communication)
  -> *Small talk is a real act kind with real effects (familiarity rises, loneliness falls), not filler. It also tests the relationship: what someone says to a stranger is not what they say to a friend.*
- **Face and politeness** (Goffman; Brown & Levinson) *(background)*: people protect their own and others' "face"; requests, refusals, criticism and boasts are softened or done indirectly in proportion to the social distance and the size of the imposition.
  -> *Each act has an imposition value; the lexicon's register depends on distance and status. Hints (e.g. gift hints) exist because direct asking costs face.*
- **Self-disclosure reciprocity / social penetration** (Altman & Taylor) *(background)*: relationships deepen as people exchange gradually more personal information, and disclosure is reciprocated at a similar depth.
  -> *Topics have a depth (weather -> work -> family -> fears -> secrets). Willingness to go deeper follows trust, and a deep disclosure invites one back.*
- **Bids for connection** (Gottman) *(background)*: small attempts to get attention or affection ("look at that bird") are met by turning toward, away, or against; the pattern predicts relationship health.
  -> *Every small remark is a bid. How often a pair turns toward each other is a measurable, visible relationship signal.*
- **Common ground** (Clark) *(background)*: speakers track what is mutually known and do not tell each other what they both know, except to share a feeling about it.
  -> *Each conversation keeps a shared-ground set; telling something already shared is a bug or a joke.*
- **Gricean maxims** *(background)*: be as informative as needed, truthful, relevant, clear. Flouting them signals something (irony, avoidance, lying).
  -> *Lies, evasions and over-sharing are deliberate violations that the listener can notice.*

### 2.3 Games and agents
- **Versu / Prom Week**: interactions as *social practices*, where player and NPC take turns choosing actions at each stage of a shared script; the options available depend on the practice the pair is in. [Evans & Short](https://www.cs.uky.edu/~sgware/reading/papers/evans2014versu.pdf), [social practice dialogue, AIIDE](https://ojs.aaai.org/index.php/AIIDE/article/view/12838).
  -> *Our "conversation shape" is a practice: opening, topics, closing, each stage offering the acts that fit.* Prom Week's authoring cost (thousands of lines of procedural dialogue) is the warning for the lexicon: author in **tagged fragments**, not whole scenes.
- **Generative Agents** (Park et al. 2023) *(background)*: a *memory stream* of observations scored by **recency, importance and relevance**, periodic **reflection** that writes higher-level beliefs, and planning from memory. Social behaviour (parties, gossip) emerges from agents sharing memories.
  -> *Our memory engine uses the same retrieval idea without an LLM: each memory has importance, a timestamp and tags; retrieval for a conversation scores them against the listener and the moment. Reflection becomes cheap rules ("three slights from Marcus -> I don't like Marcus").*
- **Talk of the Town** (Ryan, Mateas et al.) *(background)*: characters hold imperfect **mental models** of each other, facts can be forgotten, misremembered, confabulated or lied about, and information spreads by conversation.
  -> *This is the direction `social2` was reaching toward. Our beliefs carry a source, a confidence and a version, and degrade honestly.*
- **Dwarf Fortress / RimWorld / The Sims**: emergent stories come from needs, thoughts and relationship ledgers made *visible* (thoughts list, social log, interaction menus).
  -> *Make the ledger readable: the villager card, a journal of what you learned, "why does she dislike him?" answers.*
- **Stardew Valley**: gift tastes known per villager, discovered by experiment and hearsay; heart events as authored payoffs.
  -> *Gift preferences are discoverable facts that circulate in conversation.*
- **Façade, Skyrim, Left 4 Dead** *(background)*: beats and barks; context-triggered one-liners keep a space alive cheaply; but repetition breaks them fast.
  -> *Barks (§11) are a cheap sibling of full conversation, with strict anti-repeat rules.*

### 2.4 Summary table: research -> design

| Finding | Design consequence |
|---|---|
| Talk is turns with next-speaker rules | Turn = one act; each act names who can speak next |
| Adjacency pairs | Acts declare `replies`; non-reply is a move |
| Preference organisation | Refusals are hedged by default |
| Openings/pre-closings/closings | Conversation shape with ritual stages |
| Topic shading | Topics are linked objects; transitions follow links |
| Storytelling with prefaces | News is told as a story with a preface and a reaction |
| ~2/3 of talk is social | Most acts are about people; memory is social memory |
| Small talk maintains bonds | Real act kind, real effects |
| Face and politeness | Imposition and distance select register |
| Disclosure reciprocity | Topics have depth; trust gates depth; reciprocity expected |
| Bids for connection | Every remark is a bid; responses are tracked |
| Common ground | Shared-ground set per conversation |
| Memory scoring (recency, importance, relevance) | Retrieval for talk uses the same three terms |
| Imperfect mental models | Beliefs are versions with source, confidence, distortion |

---

## 3. Architecture

```
 WORLD (truth)            REGISTRY (what exists)          PEOPLE
 events, things, places   ids for items, places,          traits, mood, goals,
                          features, jobs, mechanics       relationships
        |                          |                          |
        v                          v                          v
   +--------------------------- MEMORY ENGINE ----------------------------+
   |  observations, told facts, beliefs (versions), rumours, secrets,      |
   |  reasons for opinions, importance, decay, reflection                  |
   +--------------------------------+--------------------------------------+
                                    |   (what can I say, what do I want to say)
                                    v
   +-------------------- CONVERSATION ENGINE ----------------------------+
   |  shape (open/topics/close), topic objects, shared ground, budget     |
   |  CHOOSER: villager (scores acts)  |  player (menu of acts)           |
   +--------------------------------+--------------------------------------+
                                    |   ACT {act, from, to, args}
                  apply() ----------+---------- realise()
        (beliefs, opinions, memories)        (lexicon: pack, tags, requires)
                                    |
                                    v
   PRESENTATION: bubbles, talk box, villager card, journal, chronicle, sound
```

Strict rules: the memory engine never contains words; the lexicon never changes state; the registry is read by both; the chooser only picks acts.

### 3.1 Files (planned)
`src/talk/`
- `registry.ts` - what exists (§4)
- `memory.ts` - the memory engine (§5)
- `people.ts` - personality, mood, goals, relationship ledger (§5.5)
- `acts.ts` - act catalogue with `when / apply / replies / kind / imposition` (§7)
- `shape.ts` - conversation shape, topics, budgets (§6)
- `chooser.ts` - villager chooser and player menu builder (§8)
- `lexicon.ts` + `packs/*.ts` - words (§9)
- `schedule.ts` - who talks to whom, when, with what level of detail (§10)
- `present.ts` - bubbles, box, card, journal glue (§12)
- `lint.ts` / tests - structural and wording checks (§13)

---

## 3b. Meddling: the player as a force in the world

**The fun of this game is meddling.** Build mode lets the player do almost anything: move people into other houses, pull lovers apart, knock down a home, take the wall off a privy with someone inside.
The talk engine is where the island *finds out*, reacts, remembers, tells everyone and changes how it treats the player. This is not a layer added afterwards. It is the main loop of the game:

```
 PLAYER (or villager) DOES SOMETHING  ->  WORLD EVENT  ->  PERCEPTION  ->  APPRAISAL  ->  REACTION (acts + movement)  ->  MEMORY  ->  TALK / RUMOUR  ->  REPUTATION & CONSEQUENCES
        build mode, gifts, words,        {kind, actor, who/what        who saw it, who is     what does this      shout, flee, laugh, cover up,    each person   spread by      how people treat you,
        theft, pushing, matchmaking      is hit, where, tags}          affected, who finds    mean to ME?         confront, accuse, mourn, repair  keeps their   conversation   what they ask of you,
                                                                       out later                                                         own version                  what the island becomes
```

### 3b.1 Everything that happens is an event the world can perceive
A **world event** is `{ kind, actor, targets, place, time, tags, severity, exposure }`. Every build-mode action, theft, push, gift, lie, rumour, fight and rescue emits one.
Examples: `wall_removed {room, owner, occupants}`, `home_destroyed {room, residents}`, `bed_moved {owner}`, `person_relocated {who, from, to}`, `couple_separated`, `door_blocked`, `item_stolen`, `rumour_planted {about, claim}`, `gift_given`, `surprise_gift`, `person_pushed {who}`.
- **Exposure state**: some moments make an event funnier or worse: on the privy, bathing, asleep, in bed with a partner, mid-argument, mid-prayer, carrying something precious. Events carry the `exposure` of each affected person; reactions scale with it (the privy scene is a *shout and a scramble*, not a shrug).
- **Severity and tags** (`property`, `privacy`, `love`, `danger`, `comic`, `sacred`, `theft`, `kindness`) feed appraisal.
- Replaces today's "no repercussions yet: no gossip, crime, mood or rebuilding" in build mode.

### 3b.2 Perception: who knows
- **Witnesses** are the people with line of sight and range at that moment (radius first, TrueSight later), awake and attending. They learn *immediately* and first-hand (`saw`).
- **Affected parties** (the owner, the occupant, the partner) learn when they next experience the effect, even if nobody saw the cause: they come home and the bed has moved; the wall is gone; their lover is in a different house. They know *that* it happened and not *who*.
- **Discoverers** later: someone finds a missing wall, a rumour reaches them, they notice the player's new neighbour.
- **Build-mode time freeze**: the clock stops while you build. When time resumes, anyone with line of sight to *you* near the change, or inside the affected space, perceives the result as just happened. If you did it unseen, they perceive only the effect (see attribution).
- Perception gives each person a first-hand memory (`saw`/`felt`) with confidence 1.0; everything else is hearsay.

### 3b.3 Attribution: who did it?
- **Seen**: culprit known to the witnesses. They may tell others, with the usual distortion.
- **Unseen**: a culprit is *inferred*: who was near, who has a grudge, who is new, who has done similar things before. Each person builds a suspicion list with confidences. They can be **wrong**, and wrong in a consistent, explainable way (the stranger is blamed; the rival is blamed; the known troublemaker is blamed).
- **Scapegoats and consequences for the innocent** are a feature: a villager can be accused of what the player did, and the player can see the quarrel they caused (and repair it by confessing, or let it ride).
- **Reputation about the player** is a per-person ledger plus a village-wide "what folks say about you", built from first-hand and hearsay memory. Tags: `vandal`, `meddler`, `matchmaker`, `thief`, `kind`, `liar`, `gossip`, `fun`, `dangerous`.

### 3b.4 Appraisal and reaction
For each person who learns, **appraise**: does this threaten or help my goals, needs, home, family, loves, status, privacy? Output: an emotion (shocked, furious, humiliated, amused, scared, grateful, delighted, smug, heartbroken) with an intensity.
Appraisal is a **declarative rule table** (tags × stakes × traits -> emotion), authored once, extended easily:

| Event | Stake | Trait | Emotion | Typical reactions |
|---|---|---|---|---|
| wall_removed on a privy | occupant, exposed | any | humiliated | shout, cover, flee indoors; later vent, blame, demand repair |
| wall_removed on a privy | witness | sociable | amused | laugh, tell friends at once |
| home_destroyed | resident | proud | furious | confront suspect, demand rebuild, sulk in a tent, hold a grudge |
| couple_separated | lover | devoted | heartbroken | search for them, plead with whoever they blame, mope |
| bed_moved | owner | prickly | annoyed | complain, move it back (if allowed), accuse |
| person_relocated | self | shy | scared | stay put, ask why; later get used to it or leave |
| rumour_planted | target | any | wounded or angry | deny, confront the teller, defend |
| surprise_gift | receiver | smitten | delighted | glow, tell a friend, give back later |
| gift from unknown | receiver | wary | suspicious | ask around, test the giver |

A **reaction** is a bundle of *acts* (shout, accuse, deny, console, vent, gloat, warn, demand, forgive, mock) **and movement plans** (flee, hurry home, cover up, gather belongings, look for someone, stand and stare, pick up a block and put it back). Both come from the same chooser (§8) with personality and relationship weights, so a proud man, a shy woman and a prankster react differently to the same event.
Reactions are what the player *sees first*: bubbles within seconds, people running, pointing, gathering. That immediate feedback is what makes meddling fun.

### 3b.5 Ripples: how a deed becomes a legend
1. **Instant** (seconds): shouts, flee, laugh, stare; witnesses gather.
2. **Same day**: the story is told (§6.3), with each teller's version; people ask the player about it; the victim vents to friends.
3. **Within a week**: grudges and gratitude settle; reputation moves; prices, trust, doors and help change; the watch may take an interest; someone leaves or moves in with a friend.
4. **Long term**: feuds, a new couple, a reputation, a name for the incident ("the Day of the Open Privy"), a line in the chronicle and in old people's stories, a ballad, a custom.
A deed can also be **undone socially**: apologise, pay, rebuild, give a gift, confess, take the blame for someone else, or let it blow over. These are acts in the player's menu with real outcomes.

### 3b.6 What the player can do (verbs and what the world makes of them)
The player's **verbs** are of three kinds, and all emit events:
- **Build-mode verbs**: demolish (a wall, a house), move furniture, move a bed (and so its owner), swap houses, relocate a person (push them, carry a sleeper), join or part households, block a door, seal a room, build a home for a couple, remove the roof from a gossip.
- **Social verbs**: say a thing to a person (compliment, insult, tell a secret, lie, ask about someone), plant or correct a rumour, give or forge a gift, introduce two people, arrange a meeting, eavesdrop, bargain, keep or break a promise.
- **Personal verbs**: take, push, hide, trespass, rescue, fight (later), help with work.

Examples of **play loops** this makes possible (none of them scripted):
1. **Matchmaker.** You hear that Marcus likes Julia and Julia loves lavender. Plant lavender, leave a gift "from nobody", put a bench between their houses. Villagers notice, gossip, Marcus gets bold, Julia is intrigued. Or Cassia, who fancies Marcus, gets jealous.
2. **Jealous lover.** Someone is furious that their partner talks to a rival. You can calm them, feed the jealousy with a rumour, move the rival into another house, or expose the fear that started it.
3. **Pull them apart.** Move a couple into separate houses. They search for each other, complain, meet in secret; the neighbours talk. Reunite them and they remember you did.
4. **The privy.** Remove a wall while someone is using the privy. The person yelps, the neighbours laugh, the story is told. Later they remember it every time they see you; some forgive, some demand a better privy.
5. **Housing chaos.** Move everyone in a street into the wrong houses and watch the confusion, the swaps, the new friendships and the feuds.
6. **Break and mend.** Knock down a house, then build a better one. A villager remembers both, differently.
7. **Spread a rumour.** Tell the baker something about the priest. Watch it travel (§6, §5), change, and arrive back at you wrongly.

### 3b.7 Missions and requests that come from the world, not a quest log
Missions are generated from villagers' **wants** (goals in §5.5) and **problems** (open threads), asked of the player through the ordinary menu when trust is enough:
- "Could you find lavender? I don't want to ask him myself." (gift errand)
- "I think someone has been talking about me." (investigate)
- "Please, will you move my brother's bed away from mine?" (meddle on request)
- "If Marcus found out about this I'd die." (keep a secret)
- "Make her stop." (silence a gossip, by any means)
Requests can come from **both sides of a conflict**, and the player may take sides, play both, or ignore them. The player's **journal** lists open threads ("Julia is waiting for lavender"), not a quest marker. Rewards are relationships, secrets, items and access (a locked door opened, a fair price, the right to build near someone).

### 3b.8 The consequences must be visible and legible
- Reactions occur on screen within seconds (bubbles, running, stopping, pointing, a crowd).
- The villager card says why: "angry at you: the wall", "heartbroken: lost her partner's house".
- The journal records what you did and what the island made of it.
- The chronicle marks the big ones.
- **Reversibility and a severity dial**: people do not die from a demolished wall, and the player can choose a gentler or harsher island (`TALK.meddle`), because the comedy needs the island to stay playable and its people recoverable. Cruelty has costs; comedy is for the ones who can bounce back.

### 3b.9 Implementation consequences (what has to exist)
1. A **world-event bus**: build-mode and social code emit events instead of doing things silently. Hooks in `bldDemolish`, `bldBreak`, bed/furniture moves, `housingTick`, push carries (`pushCarry` / `who.shoved`), gift and theft code.
2. **Perception**: witnesses, affected parties, discoverers, with exposure state (privy, bath, bed) read from the actual villager plan/status.
3. **Attribution and suspicion**, with the player as a potential culprit and a reputation ledger.
4. **Appraisal rules** (a table) and **reaction bundles** (acts + movement plans); a handful of new acts: `shout`, `react_shock`, `cover_up`, `flee`, `accuse`, `deny`, `demand`, `gloat`, `mock`, `forgive`, `search_for`, `comfort`.
5. **Villagers need to be able to act on the physical world a little**: put a wall back, carry a bed home, cover with a cloth, hurry inside. Today `LF_NPC_MOVES_THINGS = false`; some repair/relocation behaviours should be enabled once reactions exist.
6. **Lexicon coverage** for reactions: surprise, embarrassment, anger, laughter, scorn, gratitude, in every voice pack (this is the comedy; it needs the most care).
7. **Tests**: a deterministic scene (a wall removed with someone on the privy) must produce witnesses, appraisal, reaction acts, memory, a later retelling with a different version, and a reputation change; plus the opposite (nobody sees, it is still discovered, the wrong person is suspected).

## 3c. Life events: everything real becomes talk, and new content brings its own chatter

People mostly talk about their ordinary days: what they bought, what they planted, where they slept, whether the privy was free, whether they ate. That talk is believable *because it is true*: it comes from what really happened in the game.
So the talk engine is a lens over one **uniform stream of life events**, and every system in the game (economy, farming, housing, needs, work, weather, building) feeds it. The rule for the whole project:

> **Anything a villager really does, gets, loses or suffers becomes a life event. A life event can be remembered, told, complained about and counted.**

### 3c.1 The life-event stream
`LIFE.emit(kind, who, data)`: a small record `{ kind, who, t, place, item?, qty?, price?, with?, tags }`, written by the code that already does the thing, never by talk code. Standard kinds (grow the list as the game grows):

| Family | Kinds |
|---|---|
| **Trade** | `bought {item, qty, price, from}`, `sold`, `could_not_afford`, `out_of_stock`, `new_in_stock {item}`, `price_changed {item}` |
| **Farm and work** | `planted {seed, n}`, `harvested {crop, qty}`, `crop_failed`, `worked_shift {job, hours}`, `finished_job`, `tool_worn`, `tool_broke`, `new_tool` |
| **Making** | `baked`, `sawed`, `mined {ore}`, `built`, `repaired` |
| **Body and needs** | `ate {food}`, `went_hungry`, `starving`, `slept {where: bed / rough}`, `bladder_emergency`, `used_privy`, `no_privy`, `washed`, `smelly`, `tired`, `ill`, `recovered` |
| **Home** | `got_bed`, `lost_bed`, `homeless_night`, `moved_house`, `house_changed` |
| **Place and weather** | `arrived {place}`, `got_lost`, `caught_in_rain`, `season_turned`, `first_frost` |
| **People** | `met`, `argued`, `helped`, `gave`, `received`, `borrowed`, `repaid`, `was_visited` |
| **Meddling** | the events of 3b (wall removed, bed moved, couple parted ...) |

Each event feeds three consumers at once, with no extra work at the call site:
1. **Memory** (5): the person's own record of the day (first-hand, high confidence), plus a short *day log* that survives as a summary ("today: bought 3 turnip seeds, planted 12 plots, ate at home").
2. **Talk** (6-7): acts like `report_day`, `comment_purchase`, `comment_stock`, `complain` and `ask_about_day` read the log. Small talk becomes true talk.
3. **Telemetry for the player/developer** (3c.4): counts of what people did and complained about, by kind, place and day.

### 3c.2 Registering new things so they talk for free
A thing in the game (an item, a crop, a building kind, a job, a need) is *registered* with metadata, and registration is all it takes for it to be talked about:

```
register('item', 'turnip_seed', { name: 'turnip seed', category: 'seed', season: 'spring', price: 3, source: 'shop:taberna', uses: ['plant'], tags: ['food-crop'] })
```
- **Standard events come from the category.** Anything in category `seed` gets `bought / planted / out_of_stock / new_in_stock / price_changed` comments for free; `tool` gets `worn / broke / bought`; `food` gets `ate / went_hungry`; a `building` kind gets `built / lost / moved`.
- **Generic lines per category** in the lexicon ("{who} bought {qty} {item} today", "{item} is back in stock") keep a new thing from being silent; authors add flavour lines for specific items later.
- **A coverage tool** lists registered things with no events, no lines or no consumers, so gaps are visible: "turnip_seed: has events, 0 flavour lines".
- Removing a thing removes its registry entry, and with it its events and lines (3, section 4).
- The goal is that **adding a seed seller makes villagers buy seeds, remark that a new seed is in stock, say what season it is for, and say how much they planted**, without writing any conversation code.

### 3c.3 Villagers must really live this life
The talk is only as good as the life behind it, so the game needs the villagers to *do it for real*:
- **Real inventories**: villagers hold items (`n.inv`, `n.bag`), buy what they need from real sellers at real prices, run out, and go to get more; farmers buy seed, not conjure it.
- **Real needs** with consequences they can feel and say: sleeping rough, no privy, being filthy, hungry for two days, cold, tired.
- **Real places and knowledge**: they know where things are, what is in stock, who lives where; they can say where they are going and why.
- **Reasons**: every action has a reason ("off to the seller, I'm out of barley seed") that is shown on the card and available to say.
Each of these is also a game system the player cares about; the village is a living simulation whose state the player reads through talk.

### 3c.4 The talk as feedback and balance telemetry
What people complain about is the cheapest and most honest feedback on balance:
- A **digest** (in the town/request panel) lists what people said this week by theme: "6 slept rough, 4 could not find a privy, 3 ran out of seed, 2 are starving". It names who and where.
- It sits beside `islandNeeds` and `townBalance`: the numbers say what is out of balance; the talk says *how it feels*.
- For the developer it is a **tuning dashboard**: seed shortage, privy queues, travel distances, bread price, all visible as counts of life events by kind per day. It also shows how rich the talk material is (events per villager per day; tellable ones; how many reached a conversation).

### 3c.5 Mundane is the point
Real people mostly talk about the day: what they got, what went wrong, what hurts, what is expensive, the weather, what they are about to do. Mundane talk with *true* content is what makes a world believable, and it is also the ground the big stories stand on: the gift, the quarrel, the wall taken off the privy are noticed *against* an ordinary day.

## 4. The world registry (what exists)

Everything speakable is registered with an id and a kind: `item`, `crop`, `place`, `room-kind`, `feature` (tavern, chapel, bakery, mine, stairs...), `job`, `person`, `event-kind`, `mechanic`.
- Acts hold **ids**, never text. `hint_gift { item: 'rose', for: 17 }`.
- Realisation resolves ids at speaking time. `WORLD.has('item','rose')` false -> that act is not offered, not chosen, not spoken.
- Lexicon lines declare `requires: ['feature:tavern']`; the line is skipped while the feature does not exist (a built tavern appears -> tavern lines appear).
- Removing a mechanic from the game removes its registry entry; a lint test fails on any act, memory or lexicon line that references an id not in the registry, and on any registry id with no talk (optional coverage report).
- Place and thing *names* are looked up (`WORLD.name('place', id, pack)`) so the same act speaks "the camp fire" on a blank island and "the Taberna" in the village.
- Replaces `placeWords` (a regex hack on finished text).

---

## 5. The memory engine

Memory is what makes a conversation about *this* village and not any village.

### 5.1 What is stored
A **memory** is a small record:
```
{ id, kind, subject(s), time, place, source, confidence, importance, valence, tags, version }
```
- `kind`: `saw` (first hand), `did`, `felt`, `told` (from a person), `overheard`, `rumour`, `inferred` (reflection), `secret`.
- `source`: who told it (or `self`), and the chain (hop count). Two memories of the same event are *versions*.
- `confidence` 0..1: first-hand is high, each retelling lowers it unless the teller is trusted; suspicion is a distinct low-confidence state.
- `importance` 0..1: set when stored from the event's severity, the person's relationship to those involved, and their own stake (victim > friend > stranger).
- `valence`: how it feels (for mood and for how it is told).

### 5.2 Truth vs belief
The simulation owns **events** (what happened). Each person owns **versions** (what they believe, with who they blame, how bad, extra detail). Telling a version can mutate it:
exaggerate, soften for a friend, pin it on someone disliked, drop the name, mix two events, forget the date. Everyone can be *wrong*, and wrong in a consistent, explainable way (a drunk exaggerates; a loyal friend softens; a rival blames).

### 5.3 Retrieval (what do I bring up?)
Score each candidate memory for this moment, like Generative Agents:
`score = w_recency * recency + w_importance * importance + w_relevance * relevance(topic, listener, place, mood) + w_novelty * (not in shared ground) + w_want * (serves a goal)`
- recency: exponential decay with half-life by kind (a coin lost fades in days, a death in years).
- relevance: shares a person/item/place with the current topic or the person in front of me; fits my mood ("sad people recall sad things").
- novelty: the listener does not already know it (common ground).
- want: I want sympathy, to impress, to warn, to get something.

### 5.4 Forgetting, trimming, reflection
- Low-importance, old, unrefreshed memories fade (confidence drops, then deleted); each person keeps a bounded set.
- **Reflection** (cheap rules, run once a day per person): patterns become `inferred` memories and opinions: repeated slights -> "Marcus is rude"; repeated kindness -> "Julia is good to me"; unmet wants -> grievance. Reflections are what people say about each other in the long run ("she's not the same since...").
- **Reasons ledger**: each opinion keeps the few memories that justify it (`why`). "Why do you dislike him?" is answered from the ledger, not invented.

### 5.5 People: personality, mood, goals, relationships
- **Personality**: a few traits that bias acts and lexicon (talkative, reserved, nosy, cynic, sunny, wary, prickly, smooth, lonely, gossipy, proud, devout, ...).
  Each trait changes act weights (gossipy tells more; reserved discloses less), thresholds (prickly takes offence), and realisation tags.
- **Mood**: a short-term state from needs and recent events (tired, hungry, glad, anxious, grieving). Mood shades the register and biases retrieval.
- **Goals**: what the person wants right now (company, sympathy, to confide, to warn, to court, to borrow, to be left alone, to find out X). The chooser serves goals; talk is purposive, not random.
- **Relationships** are **directional** ledgers: familiarity, affection, trust, respect, attraction, resentment, debt, obligation; plus what I *believe* the other feels (second-order). One may love, the other not know.
- **Roles and kin**: spouse, parent, child, sibling, neighbour, coworker, rival, mentor shape register and topics.

### 5.6 Secrets
A secret is a memory with `secret: true` and a holder set. Revealing it is an act with consequences; trust and depth gate it; leaks happen from the gossipy or the drunk; **the player can learn secrets** and use them (or not).

---

## 6. The conversation

### 6.1 Shape (a practice, à la Versu)
```
 approach (walk up, stop, face)  ->  opening  ->  [ topic ... topic ]  ->  pre-closing  ->  farewell  ->  part
```
- **Approach**: the initiator has a *reason* (a goal, a habit, proximity). They walk to the other, who stops (unless busy). This step is visible and readable on the card ("Going over to Julia, to ask about the harvest").
- **Opening**: greeting pair; maybe a how-are-you ritual whose depth depends on closeness and time since last meeting ("Back already?").
- **Topics**: each topic is a short chain of act/reply pairs. A topic has a *depth* and a *subject* (person, event, item, place, feeling, plan).
- **Pre-closing**: a signal that the speaker's budget is nearly spent or they are called away ("Well. The bread won't bake itself.").
- **Farewell**: matching pair; or a marked abrupt exit (offended, interrupted, emergency).

### 6.2 Topics are linked objects
A topic knows its neighbours: same person, same place, same item, same feeling, a causal link ("because of the debt"). Shading = pick a neighbour with a shared element, with a transition marker in the lexicon ("Speaking of..."). If nothing links, fade and start fresh ("Anyway.").
Depth escalates through trust: weather -> work -> family -> opinions of others -> fears -> secrets. A deeper step is only taken after reciprocal disclosure at the current level.

### 6.3 Stories
Tellable events (surprise, scandal, kindness, danger) are told as a story: `preface` ("You won't believe...") -> listener `invite` ("Go on.") -> `body` (one to three act-lines, each with the speaker's *version*) -> listener `reaction` (shock, laughter, sympathy, doubt) -> sometimes a **second story** back. Boring facts are not stories; they are asides.

### 6.4 Budgets and endings
Each side has an **interest budget** (patience): drains with boring topics, mismatched mood, being busy, impatience traits; refilled by liking, novelty, rapport. When it is low the speaker pre-closes. When it hits zero they leave. A conversation therefore ends *because someone wants it to*, with a recognisable ending.

### 6.5 Shared ground
A per-conversation (and per-pair, with decay) set of facts already mutually known. Acts check it: do not tell what the listener obviously knows (unless the *point* is the feeling about it), do not repeat within a conversation, callback to earlier talk ("As I told you on Tuesday...").

### 6.6 Interruption, overhearing, groups
- An approach can be interrupted (called to a job, someone else arrives); the pair can resume later ("Where were we?").
- **Overhearing**: bystanders within earshot learn the acts (confidence lower, as hearsay) and may react ("Did he just say that?"). The *player* overhearing is the main way they learn the village.
- **Third parties**: a third person arriving changes the topic (people avoid talking about someone in front of them; or they get caught talking about them).
- Groups of three or more are rotating pairs with a shared topic in v1.

---

## 7. Acts

An act type is defined by:
```
{ id, kind, imposition, when(sp, li, ctx), apply(sp, li, args, ctx), replies(sp, li, args), depth, tellable }
```
- `kind` is the **switch group** (`TALK.on[kind]` turns whole families on and off for testing).
- `imposition` feeds politeness (how much face it costs).
- `when` reads memory/goals/relationship; `apply` writes memory, opinions, mood, goals, shared ground, the chronicle if notable.

### 7.1 Catalogue (first draft; grouped by switch kind)
**ritual** `greet`, `greet_back`, `how_are_you`, `answer_how`, `farewell`, `pre_close`, `backchannel`, `thanks`, `apologise`, `accept_apology`
**small** `remark_weather`, `remark_place`, `remark_work`, `remark_food`, `remark_time`, `joke`, `laugh`, `complain`, `compliment`, `wonder` (idle thought aloud)
**world** `share_news`, `ask_news`, `warn`, `ask_directions`, `report_sighting`, `rumour`, `correct` ("I heard it was X"), `doubt`, `confirm`
**person** `ask_about_you`, `answer_about_me`, `ask_about_other`, `describe_other` (opinion with reason), `gossip_about`, `defend`, `confide`, `keep_secret`, `leak`, `ask_advice`, `give_advice`
**feeling** `vent`, `console`, `praise`, `thank_help`, `blame`, `forgive`, `boast`, `admit`
**economy** `ask_loan`, `grant_loan`, `refuse_loan`, `repay`, `bargain`, `offer_work`, `ask_help`, `offer_help`, `promise`, `break_promise`
**gift** `hint_gift` (about an item the other likes/needs), `ask_preference`, `tell_preference`, `give_gift`, `receive_gift` (delight/embarrassed/suspicious/disappointed), `return_gift`
**romance** `flirt`, `return_flirt`, `rebuff`, `ask_to_walk`, `declare`, `accept`, `decline_gently`, `propose`, `confront_jealous`, `reconcile`
**family** `ask_about_child`, `brag_child`, `remind_chore`, `family_row`, `reminisce`
**law** `accuse`, `deny`, `confess`, `question` (the watch), `warn_off`
**meta** `lie`, `evade`, `change_subject`, `interrupt`, `refuse_to_talk`

Each can have variants by depth and tone; the catalogue grows by adding acts, never by editing the engine.

### 7.2 Example: `hint_gift`
- `when`: speaker likes/courts/befriends listener; knows (or believes) the listener loves item X (from `tell_preference` memory); has not hinted recently; the listener's love of X is in the registry.
- `apply`: the listener now knows a hint was made, and may infer an intent (`inferred`: "Marcus fancies me"); the speaker's goal `give_gift(X)` is created; shared ground gets "hinted".
- `replies`: `receive_hint_warmly`, `miss_hint`, `deflect`.
- Lexicon (island pack, mood=shy, relationship=acquaintance): "I noticed you stop at the {item} every time you pass." Plain pack: "You like {item}s, don't you?"

---

## 8. Choosers

### 8.1 Villager chooser
Candidate acts = all `when`-valid acts for the pair in the current stage. Score:
`score = goal_fit + relationship_fit + personality_bias + mood_fit + novelty - repetition - imposition_cost(distance, status)` with a little noise for variety.
Pick top-weighted by softmax, not argmax. Personality is mostly *weights*, so "talkative" and "reserved" are not different code.

### 8.2 Player menu
At each of the player's turns the engine shows **three to six** options: the acts the player's villager could make now, grouped by category chips (`world / person / small / feeling / gift / romance`), each *realised in the player's voice*. Rules:
- always at least one "small", one "question", and an exit (leave politely);
- options are drawn from the same `when` filters as the villagers' (you cannot gossip about what you do not know; your journal is your memory);
- "ask about X" lets you choose from things you know exist (your journal, the registry, the people you have met);
- the option text previews its *intent* ("[tease]", "[sympathise]"), not an outcome; consequences are discovered;
- the player's choices feed the same memory: your words become things people remember about you.
**Same engine, different chooser.** A switch (`TALK.player = 'auto'`) lets the player's villager talk by itself using the villager chooser, for tests.

---

## 9. The lexicon

### 9.1 Entry format
```
{ act, pack, tags: { mood?, trait?, rel?, register?, depth?, tone? }, requires: [...], text: "…{slots}…", weight }
```
Slots are resolved from act args via the registry (`{item}`, `{who}`, `{place}`, `{time}`, `{how_much}`, `{reason}`).

### 9.2 Selection
Filter by `pack` and `requires` (registry); score by tag overlap with the context (mood, trait, relationship, register, depth); subtract a repetition penalty for lines this listener heard lately; sample from the top few.
If nothing fits, a plain pack fallback is used (never silence, never a wrong world).

### 9.3 Compositional lines (variety without writing every sentence)
Wording is built from pieces: **opener** (hedge, address, discourse marker), **core** (the act's content), **tag** (softener, intensifier, trailing thought), **idiolect** (a person's habit: a tic, a pet word, a favourite swear).
`"{opener} {core}{tag}"` multiplies variety by the product of pieces. Each person gets 1-2 **verbal tics** assigned at birth, so people are recognisable by sound.

### 9.4 Voice packs
A pack is a *setting*: `roman`, `island` (Murakami), `plain`, later `space`, `fairy`, `noir`. A pack defines:
- vocabulary and names (`WORLD.name`),
- register defaults and politeness norms,
- punctuation/length style (the island pack: short, dry, specific, no exclamation marks, exact numbers),
- a set of **idioms and fillers**, **greetings/farewells by time of day**.
Switching packs changes the whole island's voice without touching acts. Packs can be mixed per person (a newcomer who still speaks the old pack for a while).

### 9.5 Murakami island pack: rules
Ordinary people calmly accepting an impossible situation. Dry, specific, understated; concrete objects (a shirt on a line, a sandwich) over adjectives; precise numbers; small non sequiturs said as if normal;
nobody shouts; questions are answered sideways; silence is allowed. These rules are lint-checkable (§13) and are the standard for the first pack.

### 9.6 Writing at scale
Lines are authored as data, in batches per act and pack, with tags. Tooling:
- `talk coverage`: for each act × pack × context bucket, how many lines exist; highlights gaps;
- `talk sample`: print realised conversations from a seed, to read;
- generation assist: bulk drafting of lexicon entries from a spec (act, tags, pack voice), then **human review**; the pipeline validates `requires` and slot use automatically;
- the old banks (git tag `last-with-old-talk`) are mined for good lines, retagged, not shipped as-is.

---

## 10. Where and when conversations happen

### 10.1 Always, with levels of detail
- **Near the player (rendered):** full pipeline, approach, bubbles, timing.
- **Elsewhere (simulated):** the same acts are chosen and applied, with *abstract timing* (no walking animation required; a conversation is scheduled when two villagers' routines overlap) and no wording. Memory changes, relationship changes, chronicle lines for notable results.
- **Wording is lazy:** realised only when someone is listening, or when a log/journal/card asks for it ("what did they talk about?").
This is how news travels beyond direct observation, as you asked, and what keeps cost low.

### 10.2 Finding partners
- v1: **radius** (a few tiles) plus the villagers' routines (who is at the well, the fire, the bakery counter, the bench).
- Later: **TrueSight perception** so villagers notice who is where (and who sees *them*), which also feeds `saw` memories and eavesdropping. If too slow, keep a radial test and a coarse line-of-sight check.
- A villager looks for company when lonely, for a specific person when they have something to say (a goal), or ends up talking because they stopped at the same place.

### 10.3 Scheduling
- Talk takes place in **idle slots** (waiting, leisure, queues, meals, walks), never by cancelling work; if it must interrupt, the interrupted plan resumes afterwards (lesson 7).
- Cooldown per pair depends on closeness and the last conversation's depth. A close pair meets often with little to say; strangers rarely.
- Event-driven talk: big events (a death, a wedding, a theft) create a *reason to talk now* and propagate quickly.

### 10.4 Performance budget
- Acts are tiny records; selection is a scoring pass over a few dozen candidates; no string work off screen.
- Target: whole-island talk under ~1 ms per game minute at 50 villagers; lexicon lookups only for listened-to conversations (<=3 at a time).
- Memory sets are bounded per person (≈100), with trimming each day.

---

## 11. Barks and ambient speech

Not every utterance is a conversation. **Barks** are one-act, context-triggered lines: shouting what is missing, muttering while working, reacting to weather, calling a child, greeting passers-by, exclamations at an event. They use the same lexicon and registry, with strict anti-repeat and low priority.
Solo thoughts for the player-character follow the same path (`wonder`), in a different bubble style.

---

## 12. Presentation: making it legible

- **Bubbles:** as now (timed, split at sentence ends, speaker tinted), but paced like speech, with small gaps; interrupted lines trail off.
- **Approach is visible:** someone crosses the plaza to someone else and stops; the card says why.
- **Villager card** (click): right now, feeling, company, said-about-them, before-that; later *what they want*, *what they know about you*, *what they're keeping to themselves* (as hints, not numbers).
- **Journal** (player's memory): things you have learned, with source and confidence ("Cassia says Marcus owes her six denarii (unconfirmed)"). The player's menu draws from it.
- **Chronicle:** significant outcomes only (weddings, feuds, thefts, reconciliations).
- **Overhearing affordance:** a faint "someone is speaking" marker when people in earshot are talking but out of sight; stepping closer reveals bubbles.
- **Sound:** a soft murmur layer for off-screen talk, rising when near (ties to `sndAt`).
- **Talk box** for the player's turns: options as chips with category colours, no walls of text, never more than six.

---

## 13. Tests, lint and metrics

### 13.1 Structural tests (cheap, deterministic, do not read prose)
- every act's `replies` resolve; every act referenced by the chooser exists;
- every lexicon `requires` and slot resolves in the registry; removing a registry entry removes the lines that need it;
- an act applied changes exactly the state its `apply` declares;
- information flow: "A tells B at t; C overhears; D hears from C" yields the expected beliefs, confidences and source chains;
- no conversation exceeds N turns; every conversation has an ending (no infinite loops); budgets drain;
- switches: with `TALK.on.romance = false` no romance act is ever chosen;
- determinism: same seed -> same acts.

### 13.2 Wording lint
no banned filler ("Interesting", "It is complicated"), no self/player in the third person, no uncontracted speech where the pack contracts, no references outside the registry, no repetition within a window, length limits, pack rules (e.g. no exclamation marks in `island`).

### 13.3 Freshness and richness metrics (from the old tools, redone)
- **Entropy per pair over time:** distinct acts, topics and wordings in a window; alert if a pair repeats.
- **Novel facts per day** heard by a given villager from others.
- **Information spread:** time for a fact to reach N% of villagers; accuracy of what they believe (how wrong, and why).
- **Tellability:** fraction of conversation turns that carry a story-shaped payload vs. small talk (target ~35% social-news, 65% overall social per Dunbar, but bounded so the world is not only gossip).
- **Turn-toward rate** (Gottman): per pair, a relationship-health measure.
- Playtest log samples are *read by humans*; numbers say where to look.

---

## 14. Making it fun

Believability is the floor. Fun is what the player *does* with it. Pillars:

1. **Know the place.** The thrill of piecing things together: someone mentions a debt, another hints at a quarrel, you realise who stole the coin. The village is a mystery you can read by listening. Needs legibility (§12).
2. **Be known.** The village remembers what you said and did. People bring it up, change how they greet you, quote you wrongly to others. Reputation is the visible result of your conversation history.
3. **Be trusted with things.** Secrets, confidences, favours. Keeping or betraying them changes who tells you what.
4. **Spread and stop things.** Plant a rumour, correct a wrong one, defend someone, warn a friend. Information is a tool and a toy; every act has plausible, discoverable consequences.
5. **Gifts, courtship and romance** as slow, readable stories: discover tastes through talk and observation, choose well, watch it land (or not); watch villagers do the same without you.
6. **Surprise and comedy.** Misunderstandings that get repaired badly; two people telling the same story differently; a tic that becomes a running joke; callbacks ("Is this about the goat again?"). Humour from specificity and character, not random wackiness.
7. **Small stakes, many of them.** Daily life with bumps: a borrowed tool, a forgotten birthday, a quarrel over a fence. Not only crises.
8. **Agency without chores.** Conversation options are interesting choices, not a quiz. The player can listen, stay silent, walk off, or press.
9. **Discovery over completion.** No meters to fill. There is always another person, another story, another angle on one you thought you knew.
10. **A voice.** The island pack's tone is part of the pleasure: calm, odd, exact.

### 14.1 Specific mechanics that follow
- **Eavesdropping**: stand near and listen; what you hear is added to your journal with `overheard` confidence.
- **Ask-about**: choose a person, place or thing you know; they answer from *their* memory, which may be wrong or withheld.
- **Trading information**: villagers will trade a fact for a favour or a confidence.
- **Reading people**: from repeated talk you learn a villager's tastes, fears and tics; the card shows what you have learned, with blanks for what you have not.
- **Consequences you can follow**: a rumour has a visible path ("Cassia told Lucius, Lucius told the baker").
- **Occasions**: arrivals, harvests, deaths, weddings produce waves of talk; the same event is told differently by different people.

### 14.2 What to avoid
- Talking as a chore or gate for progress; dialogue trees with one correct answer.
- Info dumps; exposition that is not in a person's voice.
- Perfect knowledge: if everyone knows everything, there is nothing to find out.
- Perfectly truthful, perfectly kind people; but also constant misery. Mix warmth and friction.
- Talk that never reaches the player; long silences; the same line twice in a minute.
- Making the player read to understand; prefer short lines and visible actions.

---

## 15. Phases and the switches that make them testable

All talk kinds sit behind `TALK.on[kind]` and a *lab island* (few villagers, no visitors, no random life events, old systems off) so we can watch one thing at a time.

| Phase | Adds | Done when |
|---|---|---|
| 1. Skeleton | registry, act records, memory store, chooser, lexicon with `plain` pack; `greet`, `farewell`, `remark_*` | two villagers walk up, greet, chat, part; log of acts; tests pass |
| 2. News and memory | `share_news`, `ask_news`, versions, confidence, overhearing, journal | a fact travels A->B->C with believable distortion; player journal shows it |
| 2b. Life events | the `LIFE.emit` stream; hooks in trade, farming, needs, sleep, privy, work; a per-villager day log; acts `report_day`, `comment_purchase`, `comment_stock`, `complain`, `ask_about_day`; registration with categories; the complaints digest | what villagers say each day is true to what they did; a new registered item gets comments without conversation code |
| 3. Events, perception, reactions (meddling v0) | world-event bus, witnesses/affected/discoverers, exposure, appraisal table, `shout`/`flee`/`laugh`/`accuse`, hooks in demolish and bed moves, reputation v0 | removing a wall with someone on the privy produces visible reactions, a story told, and a changed opinion of the player |
| 4. The player's turn | menu of acts, talk box, player's voice, same engine, replies to accusations | player and villager conversations are indistinguishable in structure; you can confess, deny or blame someone else |
| 5. Island voice | `island` pack, tics, mood/trait tags, anti-repeat, reaction comedy | a read of 20 conversations (including reactions) sounds like one island |
| 6. People | `ask_about_you`, `describe_other`, `gossip_about`, reasons ledger, reflection, attribution and suspicion | "why don't you like him?" is answered truthfully; an innocent can be blamed for what you did |
| 7. Feeling, economy, requests | `vent`, `console`, loans, help, promises, requests to the player, journal of open threads | villagers ask you for things, and what you do changes how they treat you |
| 8. Gifts | preferences, `hint_gift`, `give_gift`, forged gifts, reactions, memories | a gift story can be followed from hint to reaction to gossip |
| 9. Romance and jealousy | flirt, courtship, rivals, parted lovers, the player's consent rule retained | a courtship is legible; parting or joining a couple causes believable behaviour |
| 10. Law and secrets | accuse, deny, confess, secrets and leaks, watch takes an interest | a secret can be kept, leaked and used; vandalism has social and legal weight |
| 11. Scale and polish | barks, groups, sound, performance, coverage tooling, severity dial | 50 villagers, no hitches, no stale pairs in a week |

Each phase ships behind its switch, ends with a read-through of sample conversations by a human, and is not considered done until it is fun to watch.

---

## 16. Rules carried over from the project

- The villager you steer is never courted or married without your say-so; `askCourtship`/`askMarriage` decisions stay.
- Text for the island follows the Murakami rules above.
- Walls, doors and rooms behave as built; "home", "hut", "privy" exist only if built; the registry knows.
- Everything in the game that speaks goes through this engine; no file may push text to bubbles any other way.
- Tests do not assert prose; they assert acts, beliefs and flows.

---

## 17. Open questions

1. How strong should distortion be by default? Too little and gossip is dull; too much and nothing can be trusted. Make it a dial and tune by playing.
2. Group conversation: rotating pairs are cheap; is that good enough at the well or the fire?
3. How much does the player's menu show of consequence? (hint vs. surprise)
4. Does the player ever see a villager's raw "want"? A hint ("looks like she's waiting for someone") may be better than a label.
5. Pack mixing per person: worth the complexity for newcomers?
6. LLM-assisted *authoring* of lexicon lines (offline, reviewed) is planned; any live LLM use is out of scope for v1 (cost, determinism, tests).
7. How to keep the island not only gossip: ensure work, nature, memory, the strange, and silence have their own acts and weight.
8. Where do jokes come from? Candidates: tics, callbacks, mismatched interpretations, deadpan specificity.

---

## 18. Appendix: a conversation as acts, then as words

Setting: the island, afternoon, Julia (reserved, kind) and Marcus (talkative, smitten). Marcus has a goal `court(Julia)`; he knows Julia likes lavender (told by Cassia, confidence 0.7).

Acts:
1. Marcus `approach(Julia)` (reason: goal court)
2. Marcus `greet` -> Julia `greet_back`
3. Marcus `remark_weather` -> Julia `agree` (backchannel)
4. Marcus `ask_about_you(work)` -> Julia `answer_about_me(work: weaving)`
5. Marcus `hint_gift(item: lavender, for: Julia)` -> Julia `receive_hint(warm: low)`; Julia infers `Marcus fancies me` (confidence 0.5)
6. Julia `pre_close(reason: loom)` -> Marcus `farewell` -> Julia `farewell`
Effects: Julia's memory gains `inferred: Marcus fancies me`; Marcus's goal `give_gift(lavender)` is activated; shared ground records that the lavender hint happened; relationship ledgers shift a little. A passerby (Cassia) within earshot gets `overheard: Marcus asked Julia about lavender`.

Words, `plain` pack:
> **Marcus:** Afternoon, Julia.  **Julia:** Afternoon.  **Marcus:** Warm for this time of year.  **Julia:** Mm.  **Marcus:** Still weaving?  **Julia:** Still weaving.  **Marcus:** You like lavender, don't you?  **Julia:** I do. Who told you?  **Julia:** I should get back to the loom.  **Marcus:** Of course.

Words, `island` pack (Murakami):
> **Marcus:** Julia. It is 3:40.  **Julia:** It is.  **Marcus:** Warmer than yesterday by about four degrees, I think.  **Julia:** I didn't measure.  **Marcus:** Are you still doing the weaving?  **Julia:** There's a blue one on the loom. It's half finished.  **Marcus:** There's lavender by the south fence. Six plants. You seem like someone who would walk past them.  **Julia:** I have, twice.  **Julia:** The thread is going to run out.  **Marcus:** Then you should go.

Same acts, same effects, different voices. That is the point.
