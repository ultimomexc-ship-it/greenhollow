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

## Tests
- `tests/lib.mjs` loads `dist/index.html` deterministically: seeded `Math.random`, a fake clock, frame loop
  held, the harness steps the sim (`simulate(page, minutes)`) the way the frame loop does. Same seed, same result.
- Current suite: load and run a day, render without errors, nobody starves in 12 days (three towns),
  the hold-a-key controls (push people and crates, swap, pull, Shift, R, sleepers), sim speed under 3 s per game-day (about 0.6 s now).
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
