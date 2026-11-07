# Greenhollow

A Roman village simulation played in the browser: villagers with needs, jobs, families, gossip,
crime and a town watch, drawn on a canvas. The owner is hands-off with GitHub: do the git work
(branches, commits, pushes, merging to main when tests pass) yourself.

## Commands
- `npm run build`: joins `src/` into `dist/index.html`, the single self-contained file that is played and published.
- `npm run typecheck`: TypeScript check (`tsc --noEmit`). Must stay at zero errors.
- `npm test`: build, typecheck, then the headless-browser tests in `tests/run.mjs` (about 45 s).
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
- `cv-rules.ts`: lines chosen by the facts of the moment (most specific rule wins) with fill-ins; every line is chosen by what the *listener* heard least recently.

## Tests
- `tests/lib.mjs` loads `dist/index.html` deterministically: seeded `Math.random`, a fake clock, frame loop
  held, the harness steps the sim (`simulate(page, minutes)`) the way the frame loop does. Same seed, same result.
- Current suite: load and run a day, render without errors, nobody starves in 12 days (three towns),
  the hold-a-key controls (push people and crates, swap, pull, Shift, R, sleepers), conversations (specific openers, long random talks without dead ends or repeats, insults and sympathy, unlocking layers, memory, witnesses, the arrest), sim speed under 3 s per game-day (about 0.6 s now).
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
