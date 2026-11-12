/* The island's balance sheet and the request it makes next.
   `townBalance()` measures beds, privies, food and the buildings against the number of people, with plain numbers; `islandNeeds()` turns what is out of balance into
   requests in the order the island should grow (the order of the tutorial); the first one is "the request". Hard requests (beds, a privy, food) stop new visitors from
   coming until they are met. Shown at the top of the Town tab (`needsHTML`) and voiced by villagers near you (`visNeeds`). */

const TUT_TARGET = 10;      // the island is settled at this many people, once everything is in balance
const FOOD_PER_HEAD = 3.6;  // portions of grain a day (hunger grows ~88 a day, a portion of grain feeds 24)
const PLOT_YIELD = 1.25;    // portions a plot gives a day (3 per harvest, a crop takes 1.8 days, and the work takes time)
const PRIVY_FOR = 5;        // people to a privy

function townBalance() {
  const people = npcs.filter(n => !n.dead && !n.infant && n.age >= 3), pop = people.length;
  const homeless = people.filter(n => !(n.homeRoom && n.bed && n.bed.owner === n));
  let beds = 0; for (const r of rooms) if (!r.dead && r.kind === 'house') beds += (r.beds || []).length;
  const bakery = typeof lf2Room === 'function' ? lf2Room('bakery') : null, baker = !!(bakery && npcs.some(n => !n.dead && n.job === 'Baker'));
  const plots = (town.crops || []).filter(c => typeof itFarmersPlot === 'function' ? itFarmersPlot(c) : true).length;
  const demand = pop * FOOD_PER_HEAD, perPlot = PLOT_YIELD * (baker ? 1.8 : 1), supply = plots * perPlot;
  const plotsNeeded = Math.ceil(demand * 0.75 / perPlot);   // (a quarter of what we eat is fish and berries)
  const privies = typeof lfPrivies === 'function' ? lfPrivies().length : 0, looseSeats = Math.max(0, (town.props || []).filter(p => p.kind === 'toilet').length - (typeof lfPrivies === 'function' ? lfPrivies().filter(q => q.prop).length : 0));
  const stock = people.reduce((s, n) => s + FOODS.reduce((t, g) => t + (n.inv[g] || 0), 0), 0) + rooms.reduce((s, r) => s + (!r.dead && r.pantry ? FOODS.reduce((t, g) => t + (r.pantry[g] || 0), 0) : 0), 0);
  return { people, pop, homeless, looseSeats, beds, bedsNeeded: pop + (pop < TUT_TARGET ? 1 : 0), privies, priviesNeeded: pop >= 2 && modOn('rule.bladder') ? Math.ceil(pop / PRIVY_FOR) : 0, plots, plotsNeeded, demand, supply, stock, stockDays: demand ? stock / demand : 9, bakery, baker, harvests: (town.tut && town.tut.harvests) || 0, kids: people.filter(n => n.age < 16 && !(n.bed && n.bed.owner === n) && n.homeRoom) };
}
function islandNeeds(): { id: string; title: string; say: string; how: string; who: string[]; hard: boolean }[] {
  const out: any[] = []; if (!town) return out;
  const B = townBalance(), pop = B.pop, adults = B.people.filter(n => n.age >= 16), alone = pop <= 1;
  const add = (id, title, say, how, who: any[], hard = false) => out.push({ id, title, say, how, hard, who: who.map(n => n.player ? 'you' : n.first) });
  const has = (k: string) => !!(typeof lf2Room === 'function' && lf2Room(k));
  const me = B.people.find(n => n.player);
  if (me && !(me.homeRoom && me.bed && me.bed.owner === me)) add('bed', 'A bed for you', alone ? 'I woke up on a beach with sand in my shoes and nothing to sleep on. A bed seems the sensible next step.' : 'I still have no bed. I only mention it because I keep noticing.', 'Build a hut: walls, a door, a bed inside. Then leave build mode (B).' + (town.guides && town.guides.hut ? ' Follow the markers on the ground.' : ''), [me], true);
  else if (B.beds < B.bedsNeeded) { const n = B.bedsNeeded - B.beds; add('bed2', alone ? 'A bed for the first villager' : 'Beds', alone ? `There is one bed and one of me. If I make a second, somebody may turn up. It is only a feeling. (${B.beds} bed${B.beds === 1 ? '' : 's'} for ${pop} ${pop === 1 ? 'person' : 'people'}.)` : `${B.homeless.length ? B.homeless.length + ' of us are sleeping on the ground. It is not so bad, but I would not call it good. ' : ''}${B.beds} beds for ${pop} people. We need ${B.bedsNeeded}, one more than we are. Somebody always seems to arrive.`, `Put ${n} more bed${n > 1 ? 's' : ''} inside a closed room.`, B.homeless, true); }
  if (!alone && B.privies < B.priviesNeeded) add('privy', B.privies ? 'Another privy' : 'A privy', `${B.privies === 1 ? 'There is one privy' : B.privies ? 'There are ' + B.privies + ' privies' : 'There is no privy'} for ${pop} people, and we would like one for every ${PRIVY_FOR}.${B.privies ? '' : ' I raise it only because it keeps coming up.'}`, `Build ${B.priviesNeeded - B.privies} more: a closed room with a privy seat in it (build menu, I). Every seat counts, as long as it is inside a closed room with a free tile beside it.` + (B.looseSeats > 0 ? ` ${B.looseSeats} seat${B.looseSeats > 1 ? 's stand' : ' stands'} outside a closed room, or have no free tile beside them, so they do not count yet.` : '') + (town.guides && town.guides.privy ? ' Follow the markers.' : ''), B.people.filter(n => n.bladder > 30), true);
  if (!alone && B.plots < B.plotsNeeded) { const short = B.plotsNeeded - B.plots; add('field', B.plots ? 'More field' : 'A field', `We eat about ${B.demand.toFixed(0)} portions a day. ${B.plots} plot${B.plots === 1 ? '' : 's'} give${B.plots === 1 ? 's' : ''} about ${B.supply.toFixed(0)}. I did the arithmetic twice and it did not improve. ${short} more plot${short > 1 ? 's' : ''} and we feed ourselves.`, 'Use the Field brush in build mode (walk over grass), then the hoe and seed in the world. Villagers will plough, sow and harvest it.', B.people.filter(n => n.hunger > 40), true); }
  else if (!alone && B.plots && !B.harvests) add('harvest', 'The first harvest', 'The plots are marked. Somebody has to plough them and sow them and then wait about two days, which is apparently how it is done.', 'Plough with the hoe (stand beside a plot, walk into it) and sow seed; villagers help.', B.people.filter(n => n.hunger > 40), true);
  const kids = B.kids; if (kids.length) add('kidbed', 'Beds for the children', (kids.length === 1 ? 'The child does not mind where they sleep, but they ought to have a bed' : 'The children do not mind where they sleep, but they ought to have beds') + ' of their own.', 'Put one more bed in the hut for each child.', kids, true);
  if (pop >= 3 && B.harvests && !has('bakery')) add('bakery', 'A bakery', `Bread feeds nearly three times as many as the grain it is baked from. I read that somewhere, or dreamed it. Then ${Math.max(1, Math.ceil(B.demand * 0.75 / (PLOT_YIELD * 1.8)))} plots would do, not ${B.plotsNeeded}.`, 'Build a room with an oven and a counter in it. The farmers\' spare grain goes to the baker.', adults);
  if (pop >= 4 && !has('smithy')) add('smithy', 'A smithy', 'Our tools are wearing out. Nobody here seems to know who mends them.', 'Build a room with a forge and an anvil in it.', adults.filter(n => n.toolQ != null && n.toolQ < 40));
  if (pop >= 5 && !town.tavern) add('tavern', 'A tavern', 'In the evenings there is nowhere to sit and talk. We sit on the ground anyway, and it is fine, but a table would be something.', 'Build a room with a counter, a table and two chairs.', B.people.filter(n => n.social != null && n.social < 50));
  if (pop >= 5 && !has('shop')) add('shop', 'A shop', 'It would be useful to have a place where things are exchanged, though I could not say who would exchange what.', 'Build a room with a counter and a shelf in it.', adults);
  if (pop >= 6 && !town.church) add('church', 'A chapel', 'We have nowhere to say goodbye to anybody. Nobody has had to yet.', 'Build a room with an altar and two pews.', adults);
  else if (town.church && (town.church.pews || []).length < Math.ceil(pop / 2)) add('pews', 'More pews', `${(town.church.pews || []).length} pews for ${pop} people. We want ${Math.ceil(pop / 2)}. People stand at the back and do not complain.`, 'Add pews to the chapel.', adults);
  if (kitOn() && !alone) { const ins2 = (id, title, say, how, who: any[]) => { const idx = out.findIndex(z => !z.hard); out.splice(idx < 0 ? out.length : idx, 0, { id, title, say, how, hard: false, who: who.map(n => n.player ? 'you' : n.first) }); };
    const ws = has('workshop'), carp = !!(town.tut && town.tut.carpenter);
    if (B.harvests && !carp) ins2('carpenter', 'A carpenter', 'Sooner or later somebody who works with wood will turn up. I do not know why I think so. Walls, beds, chairs: so we do not run out.', 'A carpenter comes ashore once there is a free bed (and no hard request is open).', adults);
    else if (carp && !ws) ins2('workshop', 'A workshop', 'I seem to have brought my bench. I do not remember packing it. Put it in a room with a shelf and I will make you whatever you need.', 'Build a room (the kit has a table and a shelf), then place the carpentry table and the shelf in it.', adults.filter(n => n.lf2Want === 'Carpenter'));
    else if (ws && carpWant(out)) { const s = lf2Stock(lf2Room('workshop')), want = carpWant(out), R = KIT_RECIPE[want]; if (R && ((R.wood || 0) > (s.wood || 0) || (R.stone || 0) > (s.stone || 0))) ins2('wood', (R.stone || 0) > (s.stone || 0) ? 'Stone for the carpenter' : 'Wood for the carpenter', `I am making ${itBuildName(want).toLowerCase()}, and I need ${R.wood ? R.wood + ' wood' : ''}${R.wood && R.stone ? ' and ' : ''}${R.stone ? R.stone + ' stone' : ''}. The workshop has ${s.wood || 0} wood and ${s.stone || 0} stone. I thought I would mention it.`, 'Fell trees (walk into them) or break rocks (hammer) and walk into the carpenter\'s table to hand it in. Villagers help with wood.', adults.filter(n => n.job === 'Carpenter')); }
  }
  return out;
}
/** new visitors wait while a hard request (a bed, a privy, food) is open; the first bed is the exception: a free bed is what brings a visitor */
function tutBlocksArrival(): boolean { return islandNeeds().some(q => q.hard && q.id !== 'bed2' && q.id !== 'bed'); }
function needsHTML() {
  const B = townBalance(), n = islandNeeds(), cur = n[0], row = (name, have, need, unit) => `<tr><td>${name}</td><td style="text-align:right">${have}</td><td style="text-align:right">${need}</td><td>${have >= need ? '<span class="ok">✓</span>' : '<b>short ' + (need - have) + '</b>'} <span class="dim">${unit}</span></td></tr>`;
  const sheet = `<table class="mk"><thead><tr><th>Balance</th><th style="text-align:right">have</th><th style="text-align:right">need</th><th></th></tr></thead><tbody>` +
    row('Beds', B.beds, B.bedsNeeded, 'one more than people') + row('Privies', B.privies, B.priviesNeeded, `1 per ${PRIVY_FOR}`) + row('Field plots', B.plots, B.plotsNeeded, `${B.supply.toFixed(0)} of ${B.demand.toFixed(0)} portions/day`) +
    `</tbody></table><p class="sub">Food in store: ${B.stock} portions (${B.stockDays.toFixed(1)} days). People: ${B.pop}${B.pop >= TUT_TARGET ? ' · settled' : ' of ' + TUT_TARGET}.</p>`;
  const head = !cur ? '<h2>What the island needs</h2><p class="sub">Everything is in balance. ' + (B.pop >= TUT_TARGET ? 'The island is settled.' : 'More people will come.') + '</p>'
    : `<h2>What the island needs next</h2><div class="req"><b>${esc(cur.title)}</b> ${cur.who.length ? '<span class="dim">· ' + esc(cur.who.slice(0, 3).join(', ')) + '</span>' : ''}<br>“${esc(cur.say)}”<br><span class="dim">${esc(cur.how)}</span></div>` +
      (n.length > 1 ? '<p class="sub">Then: ' + esc(n.slice(1, 4).map(x => x.title).join(' · ')) + '</p>' : '');
  return head + sheet;
}

/** a new field attracts farmers: enough of the people who are gathering or fishing take it up (one farmer to about six tasks) */
function tutFarmers() {
  if (yardOn()) return;   // (households choose for themselves: pickAgenda)
  if (typeof farmWork !== 'function' || !farmWork() || !modOn('job.Farmer')) return;
  const tasks = town.crops.filter(c => !c.claim && itFarmersPlot(c) && ((c.st && cropStage(c) === 4) || !c.pl || (!c.st && c.pl && fieldPlowed(c)))).length, want = Math.max(1, Math.ceil(tasks / 6));
  const farmers = npcs.filter(n => !n.dead && !n.player && n.role === 'Worker' && n.cur === 'Farmer').length; let more = want - farmers;
  for (const n of npcs) { if (more <= 0) break; if (n.dead || n.player || n.role !== 'Worker' || n.age < 16 || LF2_JOBS[n.job] || (n.cur !== 'Gatherer' && n.cur !== 'Fisher' && n.cur != null)) continue; n.job = null; n.cur = 'Farmer'; n.curUntil = game.time + 600; if (typeof abortPlan === 'function') abortPlan(n); more--; }
}
LF2.hourly.push(() => { if (town && (town.crops || []).length) tutFarmers(); });
