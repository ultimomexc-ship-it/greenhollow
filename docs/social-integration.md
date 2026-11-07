# Social integration: keeping village talk in step with the game

Every change to the game is also a change to what villagers can see, hear, remember, judge, gossip about and discuss with the player.
This is the permanent quality-control process that keeps the two in step, in both directions: new things become part of village life,
and things that are gone stop being offered as if they still existed, while what people remember of them stays.

## The parts

| Part | What it does |
|---|---|
| `integration/registry.json` | The central registry. Every event kind, job, business and good the game has belongs to a **feature**, with its status (`active` or `historical`), the code it lives in, and how it reaches village life (`integrations`: see, hear, remember, opinion, gossip, talk). `accepted` records gaps that are deliberate ("taking the dole is not judged"). |
| `tools/integrate.mjs` | The checker. Reads the real game (the built page, headless) and the source, compares them with the registry, and writes a report in six sections (below). `--base=<ref>` adds which features a diff touched; `--strict` fails on anything needing a decision. |
| `tests/run.mjs` (`integration:` tests) | The gate: `npm test` fails if anything is unregistered, removed without a decision, dangling or thinly integrated, and checks the runtime rules (a shut business is remembered but not offered; a change of trade is news and keeps the old trade as history). |
| `.github/workflows/social-integration.yml` | On every pull request and push to `main`: runs the checker, posts the report on the PR (and in the run summary), and if a Claude key is configured, asks Claude to act on it following this playbook, committing to the PR branch or opening a new PR. It never merges. |
| Runtime (`src/social2/sb-life.ts`, `sbWatchWorld`) | The game itself turns changes in the world into knowledge: a business that shuts becomes a `closed` event; a villager who changes trade becomes a `newjob` event and keeps `sbPastJobs`. |

## The report (and what each section must contain)

1. **What changed in the game**: added, removed, modified (features whose code changed).
2. **Conversation integrations affected**: for each touched feature, its registered integrations.
3. **New social opportunities**: for each new thing, the six questions answered from the code (✅/⬜), plus thin integrations of existing things.
4. **Obsolete content and dependencies**: for each removed thing, every reference by layer (dialogue, social simulation, events and gossip, other code, tests, tools, docs, notes); dangling table entries.
5. **Changes implemented**: what was changed and why (filled in by whoever acts on it).
6. **Needs manual attention**: decisions a person should make.

## Acting on it: the playbook

Ask, for anything **added**:
- Can villagers **see** it? Events need witnesses (`lfEmit` picks people nearby; `witnessIds: []` means nobody).
- Can they **hear** about it? It needs tags in `LF2_TAGS` with some `spice` to be worth repeating.
- Can they **remember** it? Automatic for events (`lf2Learn`); importance comes from the tags (`sbImp`).
- Can they form **opinions**? A tag with a value (`v`) or `pity` changes feelings; give feelings a reason (`lfAff(a, b, v, why)`) and add the reason's words to `sbWhyText` if it is new.
- Can they **gossip** about it? Spice ≥ 0.5 travels; `SB_EXAG[group]` gives it ways to grow in the telling.
- Can they **discuss** it with the player? A label in `cvKindWord`; a talk group in `cvTagGroup` with lines in `CV_RULES` if the generic lines do not fit.
- For a **job**: a name (`LF2_JOBS[j].name` or `JOB_NOUN`), what the work is (`CV_WORKTALK`), activity talk (`CV_ACTV`) if it has its own status texts, `cvBusy` if it keeps people from talking.
- For a **business**: it sells something (`LF2_SELL`), so shop talk ("they are out of bread"), a week at work, deliveries and its closing are automatic; add its activity to `cvActivity` if villagers stand at it.
- For a **good**: a name in `GOODS`; mention it where people want or lack it (`CV_STATES`).
- Then register it: add it to the right feature in `integration/registry.json` (or a new feature with `describe`, `code` and `integrations`).

Ask, for anything **removed**:
- Should it be **erased** (it never meant much; nobody would remember it) or **kept as history** (people would remember it: a business that shut, a person who left, a custom that stopped)?
- **Erase**: remove it from the registry, and remove every reference the report lists: labels, talk groups, rules, activity talk, exaggerations, reasons, tests, docs.
- **History**: set `"status": "historical"` on the entry (e.g. `{ "id": "thermopolium", "status": "historical", "note": "shut in v150" }`). Keep what lets old memories be told (labels in `cvKindWord`, reason words, past-tense lines); remove what **generates** it (`lfEmit` calls, `LF2_SELL`, job tables) or **offers it as current** (activity talk, shop talk, options that use it, `CV_STATES`).
- Never delete villagers' memories (`o.kn`), reasons (`o.why`) or beliefs (`o.sbRel`) in code: they fade by themselves (`sbTrim`), and history is part of the village.

Ask, for anything **modified** (a touched feature):
- Renamed or replaced? Rename it in the registry and tables; old memories keep their labels if they can still occur in saved towns.
- A change of owner, trade or place? Make it an event so villagers learn of it (as `newjob` and `closed` do), and read current facts live (`lf2JobName`, `lf2Room`) rather than storing them in talk.

Rules for automated changes:
- Do the straightforward additions, labels, registry entries and clean-ups yourself. For anything that changes how the game plays, or deletes more than conversation content, **propose it in the PR description** instead.
- Keep `npm test` and `npm run typecheck` passing; run `node tools/talk.mjs` and read the conversations after content changes.
- Expose facts to the conversation system; do not write hundreds of fixed lines. A few lines per talk group, with fill-ins, are enough.
- Never merge. A person reviews every PR.

## The three scenarios this was proved on (Nov 2026)

- **Adding (cooking)**: the checker flagged the new `cooked` event as unregistered and answered the six questions (seen by the household, judged, but with no label and no talk group).
  The integration added a label, a `food` talk group with lines, a reason for liking somebody's cooking, and the registry entry. See the PR for scenario A.
- **Removing (a business)**: removing the thermopolium from the code made the checker list `Cook`, `thermopolium` and `stew` as removed, with every
  reference by layer. The decision recorded was *history*: villagers still remember it and can say it shut; nothing offers it as current. See the PR for scenario B.
- **Modifying (a villager's trade)**: covered at runtime by `sbWatchWorld` and the test "a villager who changes trade…": the change is news,
  talk uses the new trade ("Used to be the builder, mind"), and the old memories stay.
