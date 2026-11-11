# World modules and recipes

The game is grown and balanced **one piece at a time**. A *module* is one job, shop, event or system that can be switched on or off; a *recipe* is a set of modules that makes a small, complete world.

## Modules (src/life2/modules.ts, `modOn(id)`, J opens the panel)
- `job.<Agenda or Job>`: Farmer, Fisher, Gatherer, Woodcutter, Miner, Miller, Baker, Cook, Smith, Shopkeeper, Weaver, Guard, BathKeeper, Carpenter, Builder, Labourer. A switched-off job is nobody's choice (`pickAgenda`, `lf2AssignJobs`, `tutFarmers`).
- `gath.<kind>`: the friends' outings (`LF_GATH`: picnic, songs, dance, cards, fishing, walk). `event.wedding` (needs `sys.romance`), `event.funeral`, `event.birthday`.
- `sys.<feature>`: the existing `LF2.feat` switches (gossip, law, npccrime, economy, cooking, couples, baths, tavern, romance, nightlocks, revenge); `talk.<kind>`: the talk engine's kinds (`TALK.on`).
- A module is on when it is not switched off and everything it `needs` is on. **To make a new thing switchable**: `MODS.define(id, label, kind, needs)` and ask `modOn(id)` where the game decides to do it.
- The choice is kept in the browser (`gh_mods`); tests start with everything on.

## Recipes (`MODS.only([...])`)
Everything off except what is named and what it needs. The panel has "All on" and "Only farming".

## The plan: a town that has just what one job needs
Each job is a *supply chain*; a recipe generates a town with exactly that chain, so it can be made interesting and balanced alone:
| Chain | Needs | Produces | What villagers then talk about |
|---|---|---|---|
| **Farming** | fields, a seed seller (buy seed), a granary or stall (sell grain), a baker (grain to bread), homes, a well | grain, bread, seed stock | what they bought, planted, harvested, prices, seasons, stock |
| **Mining** | stairs and a mine, a smith (ore to tools), a seller of tools, torches | ore, tools | tools worn, finds, the dark, the climb |
| **Fishing** | shore, rods, a fishmonger | fish | catches, the weather, trips |
Order: farming first (seed seller, real seed buying, new-in-stock and price events), balanced alone for a few days of play; then mining; then fishing; then the social events (outings, weddings, funerals, parties) one at a time on top of a world that already has a working day.
Everything a module owns registers its life-event kinds and lexicon lines with it, so a world without the module is also silent about it.
