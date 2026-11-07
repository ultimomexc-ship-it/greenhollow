# Greenhollow

A Roman village simulation played in the browser: villagers with needs, jobs, families, gossip,
crime and a town watch, drawn on a canvas. The owner is hands-off with GitHub: do the git work
(branches, commits, pushes, merging to main when tests pass) yourself.

## Commands
- `npm run build`: joins `src/` into `dist/index.html`, the single self-contained file that is played and published.
- `npm run typecheck`: TypeScript check (`tsc --noEmit`). Must stay at zero errors.
- `npm test`: build, typecheck, then the headless-browser tests in `tests/run.mjs` (about 2 minutes).
  `node tests/run.mjs food` runs only tests whose name contains "food".
- After changing `src/`, run `npm run build` and commit `dist/index.html` with the change (CI checks it is up to date).

## How the code is put together (read before editing)
- `src/*/*.ts` are **classic scripts sharing one global scope**, not ES modules. `scripts/build.mjs`
  concatenates them in the order of `src/order.json`, strips types with esbuild and inlines them with
  `src/styles.css` into `src/index.html`. A new file must be added to `src/order.json` (the build fails otherwise).
- Order matters: later files patch earlier ones, e.g. `life2/glue.ts` wraps `lifeHud`
  (`const _hud = lifeHud; lifeHud = function ...`). Those spots carry `@ts-expect-error -- deliberate patch`.
- Function declarations are hoisted across the whole joined script, so if a name is declared twice the
  **last** one wins everywhere. Don't declare a function twice; replace it in place.
- `art/painters.ts` is a sealed IIFE (`const ART = ...`) holding all sprite and tile painting; the game reaches it only through `ART.*`.
- Folders: `world/` generation and island, `life/` and `life2/` village life (life2 = the Roman layer: events,
  gossip, trades, law, daily life, grudges), `ai/` villager plans and decisions, `social/` and `dialogue/`
  conversations, `ceremonies/`, `player/` controlling a villager, `render/` drawing, `ui/` panels, input and the main loop.
- Types are loose for now (`strict: false`, many `: any` from the JS conversion). Tighten gradually: prefer
  adding real interfaces (Person, Town, Game) over more `any`.

## Controls (src/life2/controls.ts)
Walking into something does the obvious thing. Holding a key changes it; there is no menu.
- **Space**: push. Crates, barrels and people move one tile like furniture (against a wall you swap places). Harmless: no events, no gossip. Step back while holding it to pull a crate. Sleepers and seated people are not pushed.
- **Shift**: sneak (pick a pocket, steal, pick a lock, wreck). **E**: help/use (lend a hand, give, wake, knock, look; also works as a tap). **R**: rough, the hostile shove with its consequences. **C**: follow (tap). **Z**: sleep in the cells (tap).
- Each verb is added with `add(label, fn, ...)` in the hooks (`LF2.verbs`); `lf2VerbMod(label)` decides which key owns it. A new verb needs no key code: add it, and map its label there if it is not a "help" verb.
- Touch: a Mode button cycles Walk, Push, Sneak, Help, Rough.

## Conversation (src/dialogue/cv-*.ts)
Talking is generated from the village, not from a menu. You say whole sentences; the attitude (a joke, sympathy, an insult, a probe,
a flirt, gossip, a lie) is part of the sentence, and the person answers the attitude as well as the words. There is no tone selector and no Goodbye reply (a small Leave control instead).
- `cv-world.ts`: the village behind the talk. `cvLife(o)` (ambition, regret, pride, fear, maybe a secret), `cvWorld()` (old stories tying people together: debts, feuds, old flames,
  who knows what; legends), `cvMem(o,p)` (what they remember of you: trust, moments with your own words), `cvKnows(p)` (your journal), `cvSaw` (harmless sightings, e.g. you pushed someone).
  Generated lazily per town seed, so a seed gives the same village; it also nudges the sim (debtors repay, feuds sour opinions).
- `cv-voice.ts`: nine ways of talking (`cvVoice`: talkative, reserved, nosy, cynic, sunny, wary, prickly, smooth, lonely) and their banks (greetings, reactions, deflections, gossip lead-ins).
- `cv-topics.ts`: `cvPool(c)` = everything they might bring up (events they know, people, old stories, their own life, legends, the day, the tide, shops, the chronicle, things about you), weighted;
  `cvWilling` = how much they will tell (trust, who they are, what you have done this talk).
- `cv-tell.ts`: `cvTell(c, topic, layer)` turns a topic into words, layer by layer (0 a hint, 1 the story, 2-3 what they do not usually say). Every layer names things you can follow up.
- `cv-talk.ts`: options (`cvFollowUps`, `cvObserve`, `cvShare`, `cvSpecial`; each option has an `intent`), `cvEffect` (what each attitude does to opinion, trust, patience, events, memory),
  `cvRespond` / `cvDeepen` / `cvPivotUtt` (go deeper, wander to a related topic, they ask you something), `cvClose` (they have somewhere to be; walk with them), `convBegin` (entry point).
- Authored scenes (`dialogue/opinions-scenes.ts`) still fire first when they apply; after a scene reply the conversation carries on here (`cvAfterScene`).
- To add content: a bit of activity talk in `CV_ACTV`, a thing on their mind in `CV_STATES`, a legend in `CV_LEGENDS`, a secret/regret/fear in `cv-world.ts`, new option lines in `cvFollowUps`.
  Avoid generic filler ("That is interesting", "It is complicated", "Anything else?"): `CV_BANNED` and the tests reject it.
- `node tools/talk.mjs [seed] [people] [turns] [random|first]` prints real conversations; read them after every content change.
- `node tools/longevity.mjs [days] [talks/day] [turns] [seed] [--file=other.html]` measures freshness (new templates, new facts per day) and readability over many days; `node tools/sift.mjs [days]` counts story-shaped patterns the village produces on its own. Findings are in NOTES.md.
- Speak events through `cvMe(o, sbText(o, ev))`, not `ev.text`: it gives the speaker's own version and turns their name into I/me and the player's into you.
- `cv-rules.ts`: lines chosen by the facts of the moment (most specific rule wins) with fill-ins; every line is chosen by what the *listener* heard least recently.

## The social simulation (src/social2/sb-*.ts; design in docs/social-simulation.md)
The village lives without the player: the simulation owns the truth (events), each villager owns what they believe, conversation expresses it.
- `sb-core.ts`: each person's **version** of an event (`o.kn[id]`: `who` they blame, `ext` extra detail, `sev2`, `m` times changed, `hop`, `sus` = only a suspicion),
  `sbKind` (own / fact / hearsay / rumour), importance and forgetting (`sbImp`, `sbTrim`), distortion when retold (`sbPassOn`: exaggerate, soften for a friend, pin it on someone
  they dislike, lose the name), second-order beliefs (`o.sbRel['a:b']` = what they think a feels about b, and why), the reason ledger (`o.why[id]`, written by `lfAff(a, b, v, why)`),
  trust and respect (`o.trust`, `o.resp`), `sbWhyText` (a reason in the speaker's words).
- `sb-exchange.ts`: background exchanges between people who are near each other and free (`SBX`: small talk, news, vent, praise, console, shop/rivalry, family/row,
  argue, court, borrow, repay, confide, leak). Each has consequences; text only appears if the player is near (`sbSayIfNear`). `sbCompat` is a pair's chemistry. Loans live in `town.sbLoans`.
- `sb-life.ts`: life events once a day (illness and sick visits, lost and found coins, pilfering with a suspect, windfalls, catches, a business week, deliveries),
  ill people in bed, parents fetching food for a hungry child.
- `sb-presim.ts`: 60 days of abstract village life before arrival (meals, work, the street, the tavern), seeded by the town seed, money-neutral, ~25 ms.
- Conversation side: `dialogue/cv-social.ts` (hedges, `cvMe`/`cvYou` first-person rewriting, "who cannot stand whom" and "today I talked to…" topics,
  contradicting a version with "I heard it was X").
- Measure with `node tools/network.mjs [days] [seed]` (the village at arrival, how news travels, versions, wrong blame) and `node tools/sift.mjs [days]`.

## Social integration: a permanent check (docs/social-integration.md)
Every change to the game is a change to village talk. `integration/registry.json` lists every event kind, job, business and good, grouped into
features, with status (`active` / `historical`) and how each reaches villagers (see, hear, remember, opinion, gossip, talk).
- `node tools/integrate.mjs [--base=main]` compares the game with the registry: added (with the six questions answered), removed (with every reference
  by layer), dangling talk tables, thin integration, features a diff touched. `npm test` fails until the registry and the game agree.
- When you add something, integrate and register it; when you remove something, decide **erase** or **history** (keep labels and memories,
  stop generating and offering it). Never delete villagers' memories in code. Follow the playbook in docs/social-integration.md.
- `.github/workflows/social-integration.yml` posts the report on every PR and push to main; with an `ANTHROPIC_API_KEY` (or `CLAUDE_CODE_OAUTH_TOKEN`)
  secret it also asks Claude to act on it and open or update a PR. Those automated PRs are reviewed by a person before merging.

## Tests
- `tests/lib.mjs` loads `dist/index.html` deterministically: seeded `Math.random`, a fake clock, frame loop
  held, the harness steps the sim (`simulate(page, minutes)`) the way the frame loop does. Same seed, same result.
- Current suite: load and run a day, render without errors, nobody starves in 12 days (three towns),
  the hold-a-key controls (push people and crates, swap, pull, Shift, R, sleepers), conversations (specific openers, long random talks without dead ends or repeats, insults and sympathy, unlocking layers, memory, witnesses, the arrest), sim speed under 3 s per game-day (about 0.7 s now),
  the social simulation (the pre-simulation is deterministic, fast and leaves nobody a blank slate; news spreads gradually and changes; talk uses beliefs and you can contradict a version),
  readability and a week of freshness, and social integration (the registry matches the game; a shut business and a change of trade) (30 tests, about 2 minutes).
- The random stream is shared, so any change shifts every later random draw: a test that suddenly fails in one town is often exposing a real
  weakness that luck was hiding (that is how children starving with dole grain in their pockets was found). Find the cause before changing the test.
- When behaviour changes on purpose, tests may need new expectations; when it changes by accident, they catch it.

## Performance tools
- `node tools/profile.mjs <seconds> <zoom> [--pan] [--cpu] [--file=other.html]`: the real frame loop, with per-stage times, frame-time percentiles and optional panning / CPU profile. Headless Chromium paints in software, so compare before/after rather than against 60 fps.
- `node tools/diff.mjs a.html b.html [--no-people]`: renders both builds at fixed views and compares pixels. Use it after any rendering change.
- Rendering rules learned: villagers are cached as sprites when zoomed out (`ART.drawDollLOD`); the lit-area texture is rebuilt at 20 Hz; the tide tile list is cached; do not skip the island overview image in `drawGround` (it shows through at close zoom).

## Workflow
- `main` is always playable. Work on a branch per feature, commit in small steps, merge to `main` when `npm test` passes.
- Publishing: the game is also a claude.ai artifact (https://claude.ai/artifact/GKo6oFqsjgoswEC1KvDTwy);
  republish `dist/index.html` there when the owner asks.
- `NOTES.md` holds the design notes, playtest findings and the to-do list carried over from earlier sessions. Keep it current.
