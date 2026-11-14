# The first morning: tutorial script

A copy of the "Screenplay" tab of the design doc "Greenhollow: the first five minutes"
(https://claude.ai/artifact/7YntvnAEi49eqLUkR1JEqJ). The doc is where it is discussed; this file is what the code is built from.
If they differ, ask; then bring both up to date. The build order is `docs/tutorial-prompts.md`.

## How to read this

This is the tutorial as the game runs it, one step after another. Every step is something the engine does or waits for. Nothing happens unless a step says so. Lines in quotes are the exact words in the speech bubble.

| Step | What the game does |
| --- | --- |
| **SET** | Puts the world in a state at once: positions, owners, items, tiles. |
| **WALK** who → place | The villager walks there on the normal path and the next step waits until they arrive. |
| **FACE** who → whom | Turns them (`n.face`). |
| **SAY** who: "…" | A speech bubble, behind the speaker as usual. The next step starts when the bubble has been shown for its reading time (about 1 s + 0.06 s a letter), or at once when the player presses Space or clicks. Two SAYs in a row are two bubbles, one after the other. |
| **THINK** "…" | The player's own thought bubble (`playerSay`). |
| **STRIP** "…" | The single line of instruction at the top of the screen. It stays until the next STRIP. **STRIP off** removes it. |
| **ARROW** → target | The soft pulsing pointer over a person, a tile or a set of tiles (it points at the nearest unfinished one). **ARROW off** removes it. |
| **MARK** tiles | Dashed squares on the ground (the drawing the guides already use). They turn green as they are filled and vanish when the set is done. |
| **GIVE** item | Puts a tool in your hands, items in the bag, or things in the kit. There is a small flash where it lands. |
| **STALL** stock | Sets exactly what the trader's shop panel offers. Nothing else is for sale. |
| **LOCK / UNLOCK** | Switches a control or a key off or on. |
| **TIME** | Sets the hidden clock and the light. During the tutorial time does not run by itself. |
| **WAIT** condition | The step ends when the condition is true. Every scene is a chain of WAITs. |
| **NUDGE** after N s | Fires once if the WAIT before it has made no progress for N real seconds. |

Rules for every step:

- The player is never stopped from walking. Locks only switch off actions.
- Lines marked *(new line)* were not in the agreed dialogue. They are offered for review.
- When a person is talking in a scripted step, they stand still and face whoever they are speaking to, as in a normal talk.

## The map

The tutorial island is the Hamlet's ground with these places, found by the scenario's start code (`hamletStart`). They are fixed relative to each other, so every step can name them.

```
  # # # # #                    f f f f f f
  # b . . #      p p p         f B . . . f
  # # D # #      p p p         g . x x x f
      o          p p p         f . x x x f
                               f f f f f f

        = =
         k
         c

  ~ ~ ~ ~ ~ ~ ~ ~ S ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
```

| Name | What it is |
| --- | --- |
| **HOUSE** (`#`) | Paullus's old house: a sealed room with a window, a door and your bed (`b`, owned by you). |
| **YOUR YARD** | A ring of fence with a gate below the door, round the house and the patch: in the Hamlet only a fenced yard makes ground yours, so you start on your own yard. |
| **DOOR** (`D`) | Its door. **OUT** (`o`) is the tile just outside it. |
| **PATCH** (`p`) | 3 x 3 raw plots (`crop_raw`), 3 tiles east of the house. |
| **STALL** (`=`) | The trading stall's counter. **KEEP** (`k`) is where Paullus stands to serve. **FRONT** (`c`) is the customer's tile. |
| **SHORE** (`S`) | The sand tile nearest the camp. Junia waits there on day 2. |
| **JYARD** (`f`, `g`) | A ring of 26 squares, 8 x 7, with 30 tiles inside, two tiles east of your own ring, the gap (later the gate) in the bottom row two in from the right-hand corner, her bed two tiles inside it. Both rings are above the square, gates bottom right, and each closed yard gets a path to the square. Paullus and Junia walk over to watch while you build, so their lines are on screen. |
| **GATEPOST** (`g`) | The middle square of the ring's west side, facing the camp. |
| **JBED** (`B`) | The top-left tile inside the ring. |
| **JFIELD** (`x`) | Six tiles inside the ring, two rows of three. |

## Scene 0: the state at load

1. **SET** Tipping (you) stands on the floor tile beside your bed in HOUSE, facing DOOR. You have 15 coin, an empty bag and no tools.
2. **SET** Paullus stands on OUT, facing DOOR. He is the only other person on the island. The family of three is not in the tutorial.
3. **SET** Your yard is fenced, with a gate. The 9 PATCH tiles are raw plots. JYARD, JBED and JFIELD are bare grass with nothing marked.
4. **TIME** 08:00, morning light. The clock is hidden and does not run. Crops do not grow by themselves. Everybody's needs are held still.
5. **LOCK** Hidden: the clock, the hotbar, the tool strip, the request pill, the rent chip and the side tabs. Locked: build mode (B), the inventory (I), the request card (N), pushing, the hammer, and the talk menu. Bumping a person gives the line described under *Off script* instead. Not locked: walking, M (mute) and Esc.
6. **SET** The stall is open for the whole tutorial. Paullus serves whenever you bump the counter, wherever he is standing (`def.always`). Until scene 4 its stock is empty.
7. **SET** The tutorial step is saved with the island (`town.tut2 = { scene, step }`). See *Off script* for reloads.

## Scene 1: the old house and the hoe

*Ends when you stand next to the patch with a hoe.*

1. **STRIP** "Walk out of the door." **ARROW** → Paullus.
2. **WAIT** You are next to Paullus (orthogonally adjacent). **NUDGE** after 20 s: **SAY** Paullus: "Out here." *(new line)*
3. **FACE** Paullus → you. **STRIP off. ARROW off.**
4. **SAY** Paullus: "Morning."
5. **SAY** Paullus: "You're new. Everybody is, here."
6. **SAY** Paullus: "This house was mine. It's yours now."
7. **SAY** Paullus: "Don't ask how. I'm bad at the long version."
8. **SAY** Paullus: "You'll want coin. Everybody here wants coin." "And for coin, a field." "Don't look like that. It's not one of those farming games." "One field, one morning. Then we build things."
9. **SAY** Paullus: "And for that you'll want a field."
10. **GIVE** the hoe (`itGiveTool`). The tool strip appears with only the hoe in it, lit.
11. **SAY** Paullus: "Here. A hoe. The pointed end goes in the ground."
12. **MARK** the 9 PATCH tiles. **ARROW** → PATCH. **STRIP** "Walk to the marked ground."
13. **WALK** Paullus → the tile west of the PATCH's middle row. **FACE** Paullus → PATCH. He stays there until scene 4.
14. **WAIT** You are next to any PATCH tile. If 30 s pass first, SAY Paullus: "It's just there. The patch with nothing on it.", once. After that, only the arrow.

## Scene 2: plough and sow, then dusk

*Ends when you lie down in your bed.*

1. **STRIP** "Walk into each square to plough it." **ARROW** → the nearest raw PATCH tile. Farming works as it does now: a bump from rest ploughs, and holding the key works along the row.
2. **WAIT** The first PATCH tile is ploughed. (Farming is automatic everywhere now: walking into a plot that needs work works it, no stopping first; a field is no longer crossed freely.)
3. **SAY** Paullus: "That's it."
4. **WAIT** All 9 PATCH tiles are ploughed. The arrow moves to the nearest raw one each time. **NUDGE** after 40 s with no new tile: the arrow pulses larger. Nobody speaks.
5. **SAY** Paullus: "Good."
6. **SAY** Paullus: "Now it wants seed."
7. **WALK** Paullus → a tile next to you. **FACE** Paullus → you.
8. **SAY** Paullus: "Nine. Turnips. Quick, and forgiving."
9. **GIVE** 9 turnip seed (`seed_turnip`) into the bag and onto hotbar slot 1, held. The hotbar appears with that one slot filled and the other nine empty.
10. **WALK** Paullus → his tile west of the PATCH. **FACE** → PATCH.
11. **STRIP** "Walk into each square to sow it." **ARROW** → the nearest unsown tile.
12. **WAIT** All 9 are sown. **STRIP off. ARROW off. MARK off.**
13. **TIME** 08:00 → 19:00 over 4 real seconds. The light goes to dusk, and the night ambience (crickets) fades in by itself.
14. **SAY** Paullus: "That's a day."
15. **SAY** Paullus: "Go to bed. They'll be up by morning."
16. **SAY** Paullus: "I don't sleep. Never got the hang of it. I'll stand here and keep an eye on them."
17. **ARROW** → your bed. **STRIP** "Walk into your bed to sleep."
18. **WAIT** You are in bed (a bump into your own bed, `lifeAct`). If 40 s pass first, **SAY** Paullus: "The house. The bed's in it." *(new line)*, once, and keep waiting.

## Scene 3: night and morning

*Ends when Paullus has said "Told you."*

1. **STRIP off. ARROW off. LOCK** all input.
2. **THINK** "I should probably wonder how I got here. I'll do it tomorrow."
3. The screen fades to black over 1.5 s (*new: sleep fade*).
4. **SET**, while the screen is black (3 s):
   - **TIME** 06:30 on day 2, morning light.
   - The 9 turnips are ripe (stage 4).
   - You stand beside your bed, facing DOOR.
   - Paullus is where he was, west of the PATCH, facing it.
   - Junia is on SHORE, facing the sea, standing still. She is a normal villager (`arrMake`) with 8 coin and 6 turnip seed, and holds still until scene 6. She owns no bed yet.
5. The screen fades in over 1.5 s. **UNLOCK** input.
6. **STRIP** "Go and look at the turnips." **ARROW** → PATCH.
7. **WAIT** You are next to a PATCH tile.
8. **FACE** Paullus → you. **SAY** Paullus: "There. Told you."

## Scene 4: harvest and the first sale

*Ends when the turnips are sold and Paullus has said "Grow it. Sell it. Build with it."*

1. **STRIP** "Walk into the turnips to pull them." **ARROW** → the nearest ripe tile.
2. **WAIT** All 9 are harvested. In the tutorial each plot gives exactly 1 turnip and no seed back, so the bag holds 9 turnips. The plots go back to ploughed earth.
3. **SAY** Paullus: "Bring them to the stall."
4. **WALK** Paullus → KEEP. **FACE** → south. **ARROW** → FRONT. **STRIP** "Take the turnips to the stall."
5. **STALL** Sell side only: turnips at 3 coin each. Buy side empty.
6. **WAIT** You bump the counter. The shop panel opens on **Sell** (*new: the shop panel in the main tab*). It shows one tile, "Turnip × 9, 3 each", and two buttons: **Sell 1** and **Sell all 9**. Time is frozen while the panel is open.
7. The panel's header line, Paullus: "Turnips. I'll take them."
8. **STRIP** "Sell all 9."
9. **WAIT** No turnips are left in the bag (Sell all, or Sell 1 nine times). You have 15 + 27 = 42 coin.
10. **STRIP** "Close the panel." **WAIT** The panel is closed. **STRIP off. ARROW off.**
11. **FACE** Paullus → you. **SAY** Paullus: "That's the whole trade."
12. **SAY** Paullus: "Grow it. Sell it. Build with it."

## Scenes 4 to 7 (rewritten): pushing Junia

*This replaces the old scenes 5 and 6 (Junia asks for a bed, Paullus gives one) and the start of 7. The code is the reference: `TUT2_SCENES` in src/life2/tutorial2-play.ts.*

- **Dawn (scene 3):** Junia has washed up in the night, asleep in her own bed, on the customer's square in front of the stall. A grove of three trees with one side open stands nearby, a rock two tiles along from its opening. Placed by `tut2NookLayout`, which plans every push first.
- **Scene 4:** harvest, "Bring them to the stall." You walk over and find the bed in the way.
- **Scene 5, the puzzle:** Paullus: "There's a woman asleep in my shop." "I don't like to wake people. Nobody does it well." "I can't sell you anything with her there. It wouldn't be right." "Those trees. She would sleep well in among them." B and pushing unlock; "There. The world holds its breath while you build." "Nobody sees it. They only find the thing afterwards." The shadow shows each push: her bed into the grove ("In she goes."), then the rock into the opening ("Tidy." "She'll sleep well in there."). Pushing the rock in first blocks the grove: the shadow shows taking it back out. Then the sale: "Five each. For the help. Don't tell anyone." (9 turnips, 45 coin.)
- **Scene 6:** Junia wakes: "I went to sleep in my own bed." "I woke up in my own bed." "There are trees on three sides of it now." "And a rock." Paullus: "She can't get out. That one's yours." You push the rock aside (it stays by the trees). Junia: "The last thing I remember is my own ceiling." "My mother always said I slept like the dead. I don't think this is what she meant." "Is there anywhere to live, on this island?" "I'd like a place of my own. With a fence round it, say." The ring is marked, its gap in yellow; the trader sells 26 fences.
- **Scene 7:** buy 26, build the ring in rows from the shadow, leaving the yellow square open. Junia: "It's been a long morning." "I'm going back to sleep. It might reset." She walks back to her bed in the grove and sleeps. Paullus: "She'll want to wake up inside it." Walk into her bed from the opening: it cannot go back, so you swap places with it. Push it through the gap onto her spot, then close the gap from just below it (press 1). Junia: "It didn't reset." Then the fence gag and the gate, as below (the gate goes where the gap was).

## Scene 7: the fence without a gate, and the hammer

*Ends when the gate is in and Junia has walked through it.*

1. **WAIT** You bump the counter. The panel opens on **Buy** with one tile, "Fence, 1 each, 18 left", and two buttons: **Buy 1** and **Buy all 18**. The rest of the panel is empty.
2. The panel's header line, Paullus: "Twenty-six fences. Take all of them."
3. **STRIP** "Buy all 18."
4. **WAIT** The kit holds 26 fences. (Coin: see the table below.)
5. **WAIT** The panel is closed. **ARROW** → the nearest unfilled JYARD square.
6. **UNLOCK** build mode. The build bar shows one slot: Fence × 18. **STRIP** "Press B. Fence every marked square: facing a fence, 1 puts the next one on the end of the line." Fences go down the normal way (`bldPlaceFront`): facing a fence, the next goes on the end of the line, so a side is a few presses.
7. **WAIT** All 18 squares hold a fence and no fence stands off the marks.
   - **Pushing is taught the first time it is needed.** The first time a fence stands off the marks (most likely one press too many at a corner), it is outlined in orange, pushing unlocks, **SAY** Paullus: "That one's wandered. Walk into it in build mode and it goes where you push it." and the strip reads "Push the stray fence onto a mark: in build mode, walk into it." until no fence is out of place. If you close yourself inside the ring, the same: **SAY** Paullus: "You can shove them, you know. Press B and walk into one." (or, once pushing is known, "Shove one. They move."), strip "Shut in. In build mode, walk into a fence to push it out of the way." If neither happens, pushing waits for later. Once taught, pushing stays unlocked.
8. **ARROW off. STRIP** "Press B to let the world go on."
9. **WAIT** Build mode is off. **LOCK** build mode. **STRIP off.** The ring has no gate, so it is not a yard (`yardScan` needs one).
10. Junia gets up. **WALK** Junia → the tile below JBED. **FACE** → the fence.
11. **SAY** Junia: "Somebody has put a fence round my bed."
12. **SAY** Junia: "It is a very good fence."
13. **WALK** Junia round the 10 inner edge tiles, one lap, back to where she started.
14. **SAY** Junia: "I cannot find the way in. Or, I suppose, out."
15. **MARK** GATEPOST with an amber marker on the fence itself.
16. **STALL** Buy side: Hammer × 1 at 4 coin and Gate × 1 at 3 coin, with **Buy all** for both. Nothing else. **STRIP** "The trader has something new." **ARROW** → FRONT.
17. **WAIT** You bump the counter. The panel's header line, Paullus: "A hammer and a gate. You'll want both."
18. **WAIT** You own the hammer and the kit holds 1 gate. You have 24 − 7 = 17 coin. The tool strip shows the hammer beside the hoe.
19. **WAIT** The panel is closed. **ARROW** → GATEPOST.
20. **UNLOCK** build mode, and the hammer on GATEPOST only. The build bar shows two slots: Destroy (the hammer) and Gate × 1. **STRIP** "Press B. Knock out the marked fence with the hammer, then put the gate in the gap."
21. **WAIT** GATEPOST is empty. The fence goes back into the kit (`kitGive`). The hammer on anything else gives a dull knock, nothing happens, and the STRIP flashes "Only the marked fence, for now."
22. **WAIT** A gate stands on GATEPOST. A gate is placed only there. **MARK off.**
23. **STRIP** "Press B to let the world go on." **WAIT** Build mode is off. **LOCK** build mode and the hammer. **STRIP off. ARROW off.**
24. The ring closes with a gate and 12 tiles inside, so `yardScan` makes it a yard. Its household is Junia, because her bed is in it.
25. **WALK** Junia → GATEPOST and one tile out. The gate opens as she reaches it and shuts behind her (*new: gates open and shut like doors, for everybody*).
26. **FACE** Junia → the gate. **SAY** Junia: "A gate."
27. **SAY** Junia: "With a latch, even."
28. **WALK** Junia in through the gate, out again, and back in.

## Scene 8: her field, the end of the tutorial, the first rent

*Ends when the clock starts. The first rent comes the next morning, after the tutorial is over.*

1. **WALK** Junia → the middle of JYARD. **FACE** → south.
2. **SAY** Junia: "It's a good yard."
3. **SAY** Junia: "I could grow something in it. If there were somewhere to grow it."
4. **MARK** the 6 JFIELD tiles.
5. **STALL** Buy side: Field × 6 at 2 coin each, with **Buy all 6**. **STRIP** "The trader has field." **ARROW** → FRONT.
6. **WAIT** You bump the counter. The panel's header line, Paullus: "Six. That'll feed one." *(new line)*
7. **WAIT** The kit holds 6 field tiles. You have 17 − 12 = 5 coin. **WAIT** The panel is closed. **ARROW** → the nearest unmarked JFIELD tile.
8. **UNLOCK** build mode. The build bar shows one slot: Field × 6. **STRIP** "Press B. Lay the field on the marked squares."
9. **WAIT** All 6 JFIELD tiles are ploughed plots (`bldPlaceField`, only on the marks; holding the key and walking lays one a tile).
10. **STRIP** "Press B to let the world go on." **WAIT** Build mode is off. **STRIP off. ARROW off. MARK off.**
11. **WALK** Junia → the tile beside the first JFIELD tile. **FACE** → it.
12. **SAY** Junia: "Hm."
13. **SAY** Junia: "I have no idea why I have turnip seed."
14. Junia sows the 6 tiles with her own turnip seed, one after another, with the farmer's sowing step. You can watch or walk away.
15. **WAIT** All 6 are sown.
16. **The tutorial ends.** In this order, all at once:
    - **TIME** 12:00 on day 2. The clock appears at the top and starts running at normal speed. Crops grow, and needs run again.
    - **UNLOCK** everything: build mode with the full Hamlet build menu, pushing, the hammer on everything, I, N, the talk menu and the side tabs.
    - **STALL** the trader's normal stock (`HAMLET_PRICES` and the seeds).
    - The request pill appears with the first step of the progression: "Walls round Junia's bed" (*new: the progression steps are rewritten to follow the tutorial*). The rent chip appears.
    - `town.tut2` is marked done. Autosave runs.
17. The first time you bump the counter after this, before the panel opens: **SAY** Paullus: "That's the lot from me for now." Then **SAY** Paullus: "Come and see me if you need anything. I'm always here. I never did get the hang of sleeping." Then the panel opens with the normal stock.
18. The next morning, at 06:00, rent is due. Instead of the silent collection (`rentCollect`), the first rent is handed over in person once: **WALK** Junia → OUT. **FACE** → DOOR. She waits there until you come within 2 tiles, or until 09:00.
19. **FACE** Junia → you. **SAY** Junia: "For the yard. It seems fair."
20. **SAY** Junia: "I don't know who to give it to, so I'm giving it to you."
21. **GIVE** Her rent (`rentOf`: 2 coin, a yard with no roof) moves from her coin to yours. Chronicle line: "Junia paid the first rent." From then on rent is collected the normal way.

## The well and the axe (scenes 6 and 8, built)

- **Scene 6, after the rock is pushed aside:** Junia: "The last thing I remember is my own ceiling." "My mother always said I slept like the dead. I don't think this is what she meant." "Is there anywhere you make wishes, here?" She walks to an empty patch of the square and flips a coin over her shoulder: no clink, a plop, and the well fades in where it landed (it was there all along, unseen), glowing, with a chime. Junia: "That's new." "I'd like a place of my own. With a fence round it." (her first wish, in the well). Paullus: "I've stood here eleven years." "That's new." To you: "Coin goes in. Wishes go in." "Somebody has to take them out." Walk into the well: the panel shows her wish; take her coin (Take all); close it. Then the fences, bought with her coin and your turnip money.
- **End of scene 7:** when the gate is in, her wish comes true. Junia: "I wished for a fence." "I got a fence."
- **Scene 8 (replaces the field):** at the well: "I'd like something to do." "Something with an axe, maybe." (her second wish). Paullus: "An axe. I have one of those." He sells it to you ("It's for her, I suppose. Four."). Walk into Junia to give it to her: "An axe." "You've brought me an axe." "I wished for one at the well. This was quicker." Paullus: "There's her first job, then." She fells a tree near her yard ("Timber."), sells the wood to Paullus ("Two each."), and drops her first coin in the well: "For the well." "It seemed only fair." Paullus: "That's the whole of it." "Grow it. Build it. Let the well take the credit." The clock starts. No rent at the door: the well has taken its place.

## Ideas to try

- **Teach Shift (turn on the spot) at the fence's bottom row.** The bottom row of Junia's ring is built from its east end facing west, and the player arrives there walking east, so they face the wrong way. Today a rock happens to lie just east of that spot (the owner's playthrough). If something that cannot be pushed stood there instead (a tree, or a post), walking east would do nothing, and the strip could say "Hold Shift and press a direction to turn without moving", which teaches Shift exactly where it is needed. The layout would place it on purpose rather than by luck.

## Off script

There is no skip button and no way to fail. These rules hold through every scene.

- **Walking away.** Nothing stops you. The STRIP and the ARROW stay, and the nudges fire as listed. Nobody follows you.
- **Bumping Paullus.** No talk menu. He repeats the last line he said in the current scene. If he has said nothing yet in it, he says "Mm." *(new line)*. Bumping the counter always opens the panel with the step's stock. An empty panel says "Nothing for you yet." *(new line)*.
- **Bumping Junia.** Before scene 6 (she is on SHORE): "Give me a minute. I've only just arrived." *(new line)*. After that, she repeats her last line.
- **Bumping your bed before scene 2 step 17.** "Not yet. It's morning." as a THINK *(new line)*. You do not lie down.
- **Bumping other things.** Trees, rocks and crates say what they say now ("you have no axe"). Searching a crate is allowed. Nothing in it is needed.
- **Wrong tile in build mode.** Placing works only on the marked tiles. The STRIP flashes the hint for one second, then returns to the step's text. Leaving build mode early is allowed. The STRIP then says "Press B to build." until you go back in.
- **Selling or buying other things.** The panel offers only the step's stock, so it can't happen.
- **Pressing a locked key.** Nothing happens, with no message.
- **Reload.** The island is saved at the start of every scene. A reload resumes at the start of that scene: the scene's SET and the state at its start are rebuilt from `town.tut2.scene`, and lines already said in it are said again.
- **The tutorial on other islands.** It runs only on a new Hamlet island. Old saves and the other island types never see it.

## Numbers to tune

| What | Value | Running total of your coin |
| --- | --- | --- |
| Start coin | 15 | 15 |
| 9 turnips sold, 3 each | +27 | 42 |
| 26 fences, 1 each | −26 | (8 less from here on: you end with 31) |
| Hammer 4, gate 3 | −7 | 17 |
| 6 field tiles, 2 each | −12 | 5 |
| Junia's first rent | +2 | 7 |

## How it was built

`src/life2/tutorial2.ts` (the runner, the layout, scenes 0 and 1) and `src/life2/tutorial2-play.ts` (strip, arrow, marks, locks, the shop panel, scenes 2 to 8, the first rent, the progression after it). `node tools/tutorial.mjs` plays it with a bot and writes a report; the test `tutorial: the first morning` runs it in `npm test`. Bumping the counter: the stall's customer tile faces Paullus, so walking into him from there opens the shop panel.

## Round 7 (the owner's notes)
- Junia woke up asleep, so the ironing line went: "The last thing I remember is my own ceiling." "My mother always said I slept like the dead. I don't think this is what she meant."
- Paullus and Junia walk over to the building site before each build step, and Paullus keeps reminding you to press B (every 9 s, `TUT2_NAG`) until you do.
- Junia's ring is 2 bigger each way (8 x 7) so a house fits round her bed and the bed can still be pushed every way.
- Both houses are above the square, both gates bottom right, and a fenced yard gets a path from its gate to the square.

## Round 8 (the owner's notes)
- Opening: "This house was mine. It's yours now." (the house, not the island); you farm for coin, not to eat; a joke: "Don't look like that. It's not one of those farming games." "One field, one morning. Then we build things."
- "Now. About selling me those turnips."
- Scenes 6 and 7 reordered: after the rock, Junia would rather not sleep in the woods ("Something hooted at me.") and asks to put her bed next to yours; you swap past it at the grove's opening and push it beside your yard. Then the well and her wish for a fence round her bed; you build the fence all the way round (26, in four rows), she cannot find the way in, and the hammer and the gate follow. The "It might reset" bit and the gap are gone.
- The axe is given through the talk box: walking into her opens it with the one option "Give Junia the axe".
