# The first morning: build order and prompts

The tutorial for a new Hamlet island, built from `docs/tutorial-script.md` (the step-by-step script; the design is in the Claude Doc
"Greenhollow: the first five minutes", https://claude.ai/artifact/7YntvnAEi49eqLUkR1JEqJ). Paste the prompts in order. Each says which
model it suits: **Sonnet** for well-specified, mechanical work; **Opus** for larger code that follows a clear spec; **Fable** where the
design has to be worked out while building.

Every prompt ends the same way (written once here):
> Work on the branch `first-morning`. Run `npm run build` and `npm run typecheck` (zero errors). Extend `tools/tutorial.mjs` so the bot
> plays as far as the tutorial now goes, and add or extend the test `tutorial` in `tests/run.mjs`. Run the named tests, then the full
> `npm test` detached (about ten minutes; do not build while it runs). Commit `dist/index.html` with the change. Update CLAUDE.md
> (a section "The first morning: the tutorial" that grows with each step) and NOTES.md. Merge to `main` only after prompt 10.

Rules for all of them:
- The script is the spec. Words in quotes go into the game exactly as written. If a step cannot be done as written, change the script
  file in the same commit and say why in the commit message.
- The tutorial is data: scenes are lists of steps in `src/life2/tutorial2.ts`, run by one small runner. A scene never reaches into the
  runner and the runner never knows a scene's content.
- Game code still never writes words for the talk engine; the tutorial's lines are its own (`TUT2_LINES` or inline in the scene data),
  shown in ordinary speech bubbles.
- Nothing changes for islands that are not a new Hamlet: old saves and the other scenarios never see the tutorial.

| # | Prompt | Model | Needs |
| --- | --- | --- | --- |
| 1 | The tutorial island, the runner and scene 1 | Opus | - |
| 2 | Strip, arrow, marks, hidden HUD and locks | Sonnet | 1 |
| 3 | The shop panel | Opus | 1 |
| 4 | Scenes 2 to 4: the patch, the night, the first sale | Opus | 2, 3 |
| 5 | Gates that open and shut like doors | Sonnet | - |
| 6 | Scenes 5 to 7: the bed, Junia, the fence and the gate | Opus | 4, 5 |
| 7 | Scene 8, the end of the tutorial and the first rent | Opus | 6 |
| 8 | The progression after the tutorial | Fable | 7 |
| 9 | Off script and reloads | Sonnet | 7 |
| 10 | Play it and read it | Fable | all |

After 10: the owner plays it. Then the player as a child and the birthday party (design doc, "The player is a child").

---

## 1. The tutorial island, the runner and scene 1 (Opus)

```
Read CLAUDE.md (The Hamlet, Talk: bubbles, Tests) and docs/tutorial-script.md (How to read this, The map, Scene 0, Scene 1).

1. The start. A new Hamlet island (hamletStart, src/life2/hamlet.ts) now starts the tutorial: `town.tut2 = { scene: 0, step: 0, done: false }`.
   Keep the old start behind a flag (`HAMLET_TUTORIAL = true`; tests and tools/balance.mjs set it false so they keep working).
   With the tutorial: only you and the trader (named Paullus) are on the island; no family of three. Find the places of "The map"
   near the camp (a clear patch of grass big enough for all of them, the stall where hamletStart puts it now) and keep them in
   `town.tut2.at` (HOUSE cells, DOOR, OUT, PATCH, KEEP, FRONT, SHORE, JYARD, GATEPOST, JBED, JFIELD). Build HOUSE from wall, window
   and door blocks and let sealing make it a room (bldEvaluate in life2/sealing.ts), with your bed (a loose bed prop, owned by you)
   inside. Lay the 9 PATCH plots raw (crop_raw). No yard for the trader. You start with 15 coin and nothing else.
2. The runner (new file src/life2/tutorial2.ts, add it to src/order.json after hamlet.ts). Scenes are arrays of steps:
   { do: 'say', who: 'paullus', text } | { do: 'walk', who, to } | { do: 'face', who, to } | { do: 'think', text } |
   { do: 'give', what } | { do: 'time', at, over } | { do: 'wait', until: (t) => boolean, nudge?: { after, step } } | { do: 'set', fn }.
   `tut2Tick(dtReal)` runs from the frame loop (src/ui/loop.ts) in real seconds, also while build mode or a panel freezes the sim.
   SAY shows a bubble on the speaker for its reading time (1 s + 0.06 s a letter) on real time (bubbles today run on game time:
   add a real-time bubble path rather than changing the old one), Space or a click skips to the end of it.
3. Scripted time: while the tutorial runs the clock does not advance (the sim still steps villagers, walking and your actions),
   crops do not grow, and needs are held. TIME sets game.time and the light; `over` animates it in real seconds.
4. NPC hold: while the tutorial owns a villager (Paullus now, Junia later) they run only its steps: walk to a tile (the normal
   pathing), face, stand still. Their own plans are not made (LF2.dec, pickAgenda skip them).
5. Scene 0 and scene 1 as data, word for word. GIVE the hoe with itGiveTool. Strip, arrow and marks are prompt 2: for now the
   runner ignores those steps but they are in the data.
6. tools/tutorial.mjs: a bot that loads a new Hamlet island in headless Chromium (like tools/playtest.mjs), plays the tutorial with
   real key presses (walks with the arrow keys by the shortest path to where the current step wants it, presses Space to skip
   bubbles), and writes tutorial-report.md: each scene and step with the real seconds it took, every line said, a screenshot per
   scene, and any step it got stuck on (no progress for 60 s). It stops where the tutorial stops.

Check (test "tutorial"): a new Hamlet island has the places, HOUSE is a sealed room with your bed in it, the clock does not move,
and the bot reaches the end of scene 1 holding a hoe, with Paullus's seven lines said in order.
```

## 2. Strip, arrow, marks, hidden HUD and locks (Sonnet)

```
Read CLAUDE.md and docs/tutorial-script.md (How to read this, Scene 0 step 5, Off script). The runner is in src/life2/tutorial2.ts.

1. STRIP: one line of text in a bar at the top middle of the canvas (draw it in the HUD, the style of the request pill), with
   `flash(text, 1s)` for the "On the marked place." hints. ARROW: a soft pulsing chevron over a villager or a tile; with a set of
   tiles it points at the nearest unfinished one (the step gives a test for "finished"). MARK: dashed squares on tiles, reusing the
   guide drawing (drawGuides in life2/guides.ts): amber, green when filled, a ghost bed for one tile, faint and full strength.
2. Hidden while the tutorial runs, unless a step has shown them: the clock, the hotbar, the tool strip, the request pill, the rent
   chip and the side tabs. GIVE of a tool shows the tool strip; GIVE of seed shows the hotbar with that slot.
3. Locks (`tut2.locks`): build mode, I, N, pushing, the hammer (with an optional single allowed tile), the talk menu (a bump on a
   villager gives the Off script line instead), and in build mode placing only on the marked tiles of the current step with the
   STRIP flash otherwise. The build bar shows only the slots the step allows (`tut2.slots`, e.g. ['bed'] or ['destroy', 'gate']).
   A locked key does nothing and says nothing.
4. Wire scene 1's STRIP, ARROW and MARK steps.

Check: the test plays scene 1 and asserts the strip text at each step, the arrow target, that B and I do nothing, and that the HUD
pieces are hidden until given. The bot report shows the strip text beside each step.
```

## 3. The shop panel (Opus)

```
Read CLAUDE.md (Ready Farming Village: the player's stall menu; The Hamlet: the kit) and the design doc section "The shop panel"
(mock-up: header with the stall name, the keeper and your coin; Buy and Sell tabs; a grid of tiles with icon, name, price and how
many; Buy 1 and Buy all on every tile; Sell 1 and Sell all; time waits while it is open).

1. Replace farmShopDialog for the player (src/life2/farm.ts) with a real panel (DOM over the canvas, like the villager card), for every
   stall the player bumps: the trader, the seed stall, the carpenter, the greengrocer. Real money and stock as now (sellPrice,
   kitPrice, kitGive/kitTake, the bag for seeds); the keeper's line in the header comes from serviceSay as now.
2. Stock override: `stallStock(m)` returns what the panel offers; the tutorial sets `town.tut2.stock` = { buy: [{ item, qty, price }],
   sell: [{ item, price }], line } and the panel shows only that. Buying the hammer gives the tool (itGiveTool). The stall serves
   whenever you bump it during the tutorial, wherever the keeper stands (def.always).
3. Keyboard: arrows move between tiles, Enter buys one, Shift+Enter buys all, Tab switches Buy and Sell, Esc closes.

Check: the panel opens on a stall bump, Buy all takes the coin and fills the kit, Sell all empties the bag, the sim does not step
while it is open, and with a tutorial stock only those tiles are shown.
```

## 4. Scenes 2 to 4: the patch, the night, the first sale (Opus)

```
Read docs/tutorial-script.md scenes 2, 3 and 4.

Add them as data. New engine pieces: the TIME animation to dusk; the sleep fade (a black overlay over 1.5 s, the overnight SET while it
is black, fade in); in the tutorial each PATCH plot gives exactly 1 turnip and no seed back; Paullus walks to KEEP and serves from
there; the sale through the shop panel with the tutorial stock. Junia is made in the overnight SET (arrMake, 8 coin, 6 turnip seed,
on SHORE facing the sea, held by the tutorial, no bed).

Check: the bot plays to the end of scene 4 with 42 coin, 0 turnips, Junia on SHORE, the clock still hidden, in under 4 real
minutes from load (the pacing target). The report has a screenshot of the dark moment and the morning.
```

## 5. Gates that open and shut like doors (Sonnet)

```
Read CLAUDE.md (Fence and gate; Yards: gates are walked through).

A gate opens when anybody walks into it and shuts behind them, like a house door: the gate art gets an open frame (gate_h_open,
gate_v_open in art/painters.ts), the prop is drawn open while somebody stands on it or within a moment after, with a latch sound
(sndPlace or a new short sound). Outside build mode a bump on a gate walks you through it and never pushes it. Everybody can use
every gate (private gates are a later decision). This is for every island, not only the tutorial.

Check: a villager and the player walk through a gate in a yard; the gate is drawn open then shut; a bump does not move it.
```

## 6. Scenes 5 to 7: the bed, Junia, the fence and the gate (Opus)

```
Read docs/tutorial-script.md scenes 5, 6 and 7.

Add them as data. New engine pieces: build mode unlocked for one step with only the given slots; placing only on the marks; the
ghost bed MARK; a rest pose (Junia lies on her bed awake: the sleeping pose with eyes open, no sleep need change); the walk round
the inside of the ring; the hammer allowed on GATEPOST only (anything else: a dull knock and the STRIP flash); the fence goes back
into the kit; yardScan makes the yard when the gate is in, with Junia's household. Build mode freezes the world as usual; tutorial
bubbles keep running on real time.

Check: the bot plays to the end of scene 7: the yard exists with 12 tiles inside and Junia's bed in it, the kit holds 1 fence,
you have 17 coin and a hammer, and Junia has walked through the gate.
```

## 7. Scene 8, the end of the tutorial and the first rent (Opus)

```
Read docs/tutorial-script.md scene 8.

Add it as data. Junia sows her field with the farmer's own sowing step (farmSow), not a scripted animation. The end: TIME 12:00,
the clock shown and running, every lock and hidden piece released, the trader's normal stock, `town.tut2.done`, autosave. Paullus's
two lines on the first counter bump after the end. The first rent in person the next morning (rentCollect skips Junia that one
morning; her plan walks her to OUT and waits until you are within 2 tiles or until 09:00, then the two lines and the coin; a
chronicle line). The request pill shows the first step of the new progression (prompt 8 writes it; until then a placeholder step
"Walls round Junia's bed" with no unlock).

Check: the bot plays to the end; the clock runs, B opens the full Hamlet build menu, the hammer works anywhere, Junia's six plots
are sown, and the next morning she hands over 2 coin at your door.
```

## 8. The progression after the tutorial (Fable)

```
Read CLAUDE.md (Progression, step 8), docs/minimum-game.md (Progression) and the design doc (Decisions; "The player is a child").

The five steps were written for a start with a family of three already on the island. The tutorial ends with you, Paullus and
Junia in her fenced yard. Rewrite progStep so the steps follow on from there and teach what the tutorial did not: walls and a roof
round Junia's bed (rent goes up), her first harvest sold, an empty yard with beds for the next arrival, five households, and the
island thriving. Keep the exact numbers in the card, the unlocks (seed stall, carpenter) and the closing card. Run tools/balance.mjs
(it starts without the tutorial: give it a start that matches the end of the tutorial) and check every step is reached in time.
```

## 9. Off script and reloads (Sonnet)

```
Read docs/tutorial-script.md "Off script".

Bumping Paullus, Junia and your bed off script; leaving build mode early; the island saved at the start of every scene and a reload
resuming at the start of that scene (each scene gets a `setup` that rebuilds what it starts from: positions, stock, marks, held
items). Check: reload at the start of each scene (save, restoreIsland, continue) and the bot still finishes; bumping each person
in each scene gives the right line; nothing in the off-script list moves the tutorial on or breaks it.
```

## 10. Play it and read it (Fable)

```
Run tools/tutorial.mjs on three seeds and read the reports as a player would: timings against the pacing target (the newcomer at
about 4 real minutes, the clock at about 7:30), lines that come too fast or too slow, any step where the bot stalled, screenshots
where the arrow or the strip is unclear or the camera does not show what is talked about. Fix what you find, then play it yourself
through the real frame loop (tools/profile.mjs style, with key presses) and look at every screenshot. Merge to main, publish
dist/index.html to the artifact, and write up what you changed and what the owner should look at when they play.
```
