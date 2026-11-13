# The first morning, round 3: the owner's second playthrough (v118)

Everything the owner hit, grouped, with the fix for each. Built on branch first-morning-3 (all but 11, field building, which waits for a design). Build mode: blueprint + frame + banner + the tile in front outlined; villagers greyed like statues is not done.

## A. Telling the player what to do
1. **Controls at the start.** A card at "Walk out of the door": "WASD or the arrow keys to move. Walk into things to use them. Walk into a person to talk." It stays until you have moved and walked into something.
2. **Hide the "The fence: press B for build mode to move it" hint** during the tutorial (it appears whenever you walk into a fence, long before build mode exists).
3. **Never be left without a next step.** Every time a build task is done, a big "Press B to leave build mode" with the B badge flashing. The same for every step: the strip always says what to do now.
4. **Point at the key.** In build mode the slot you are meant to press is highlighted and bounces (the bed on 1, then the hammer, then the gate). "Press 1 for the hammer" is said, not guessed.
5. **Fields explained**: what a field tile is, where to put it, how to lay several.
6. **Junia helps.** If you walk up to her while the bed is waiting she says "I think you press B. Don't ask me how I know." and after a while she says it on her own.

## B. The arrow
7. **The arrow follows the work, in order**: the bottom-left plot first, then the next one along the row from where you stand and the way you face (a snake through the patch), the same for sowing and harvesting, and along the fence line.
8. **Off-screen arrow**: when the target is off screen, an arrow at the edge of the screen points to it.

## C. Farming that feels good
9. **Step onto the plot you just worked**, so holding a direction works a whole row (built before 7).
10. **Walk freely over fields that are not yours**: only your own plots are worked when you walk into them (you got trapped behind Junia's field).
11. Field building is awkward: later, no fix yet.

## D. Rewards: numbers go up
12. **A popup for everything you get**: the hoe, "+9 turnip seed", the bed, "+18 fences", the hammer, the gate, field tiles. A card with the icon, a sound, a second or two.
13. **Harvest feedback**: "+1 turnip" rises from each plot and flies to the bag, the count ticks up; the first harvest gets a card of its own.
14. **Coin feedback**: coins fly to your purse with the number when you sell, and when rent comes in ("+2 rent from Junia").

## E. The shop panel in the tutorial
15. It cannot be closed until the step's buy or sell is done; the button to press glows and bounces; once done, Close glows.

## F. The ground
16. **The stall from every side**: walk into Paullus from any side to trade; the tiles round a keeper are kept clear of villagers who are not buying.
17. **Two tiles at least between properties** (your yard and Junia's), so a gate can be faced and placed.
18. **Junia vanished** under the fence marks: she waited on a ring square. She waits off the ring.

## G. Build mode must look different (suggestions)
- **Blueprint**: the world goes cool and desaturated (blue-grey), with a faint tile grid; only you and the things you can build keep full colour.
- **A frame and a banner**: a coloured border round the screen and "BUILD · time stopped · B to leave" across the top.
- **The world visibly stopped**: villagers greyed like statues, the sea still, sounds muffled.
- **A ghost of what you will place** on the tile in front of you, green where it can go, red where it cannot.
