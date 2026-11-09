/* What the island needs: worked out from the people and the buildings, in the villagers' own words.
   It is the answer to "what should I build next?": shown at the top of the Town tab, and voiced by villagers who are near you. */

function islandNeeds(): { id: string; title: string; say: string; how: string; who: string[] }[] {
  const out: any[] = []; if (!town) return out;
  const people = npcs.filter(n => !n.dead && !n.infant && n.age >= 3), adults = people.filter(n => n.age >= 16), pop = people.length;
  const names = (a: any[]) => a.slice(0, 3).map(n => n.player ? 'you' : n.first).join(', ') + (a.length > 3 ? ' and ' + (a.length - 3) + ' more' : '');
  const add = (id, title, say, how, who: any[]) => out.push({ id, title, say, how, who: who.map(n => n.player ? 'you' : n.first) });
  const homeless = people.filter(n => !(n.homeRoom && n.bed && n.bed.owner === n));
  if (homeless.length) add('bed', 'Beds', (homeless.length === 1 ? 'I have nowhere to sleep.' : `${homeless.length} of us have nowhere to sleep.`) + ' A bed in a closed room would do.', 'Build a hut: walls, a door that leads outside, and a bed inside. One bed each.', homeless);
  const kids = people.filter(n => n.age < 16 && !(n.bed && n.bed.owner === n) && n.homeRoom);
  if (kids.length) add('kidbed', 'Beds for the children', (kids.length === 1 ? 'The child needs' : 'The children need') + ' a bed of their own.', 'Put one more bed in the hut for each child.', kids);
  const pr = typeof lfPrivies === 'function' ? lfPrivies().length : 0;
  if (!pr) add('privy', 'A privy', `Is there a privy anywhere? We are tired of the bushes.`, 'Build a closed room with a privy seat in it (build menu, I).', people.filter(n => n.bladder > 30));
  else if (pop > pr * 6) add('privy2', 'Another privy', `One privy for ${pop} people is a queue.`, 'Build a second room with a privy seat.', people.filter(n => n.bladder > 50));
  const plots = (town.crops || []).length, fd = typeof foodDaysNow === 'function' ? foodDaysNow() : 3, hungry = people.filter(n => n.hunger > 55);
  if (!plots && pop > 1) add('field', 'A field', 'Berries and fish will not feed us for long. Somebody has to plough.', 'Use the Field brush in build mode, then work it with the hoe and sow seed.', hungry);
  else if (fd < 0.8 && pop > 1) add('food', 'More food', `There's not much to eat. ${fd < 0.4 ? 'We are going hungry.' : 'A bigger field would help.'}`, 'Mark more field plots, then plough and sow them.', hungry);
  const has = (k: string) => !!(typeof lf2Room === 'function' && lf2Room(k));
  if (pop >= 3 && plots && !has('bakery')) add('bakery', 'A bakery', 'Grain keeps better as bread, and it goes further.', 'Build a room with an oven and a counter in it.', adults);
  if (pop >= 4 && !has('smithy')) add('smithy', 'A smithy', 'Our tools are wearing out and nobody can mend them.', 'Build a room with a forge and an anvil in it.', adults.filter(n => n.toolQ != null && n.toolQ < 40));
  if (pop >= 5 && !has('shop')) add('shop', 'A shop', 'Somewhere to trade would help.', 'Build a room with a counter and a shelf in it.', adults);
  if (pop >= 5 && !town.tavern) add('tavern', 'A tavern', 'After work there is nowhere to sit and talk.', 'Build a room with a counter, a table and two chairs.', people.filter(n => n.social != null && n.social < 50));
  if (pop >= 6 && !town.church) add('church', 'A chapel', 'We have nowhere to pray, to marry or to bury our dead.', 'Build a room with an altar and two pews.', adults);
  else if (town.church && (town.church.pews || []).length < Math.ceil(pop / 2)) add('pews', 'More pews', 'The chapel is too small for everybody who wants to sit.', 'Add pews to the chapel.', adults);
  return out;
}
function needsHTML() {
  const n = islandNeeds();
  if (!n.length) return '<h2>What the island needs</h2><p class="sub">Nothing pressing. People are getting by.</p>';
  return '<h2>What the island needs</h2><ul class="plain needs">' + n.slice(0, 6).map(x => `<li><b>${esc(x.title)}</b> <span class="dim">${x.who.length ? '· ' + esc(x.who.slice(0, 3).join(', ')) : ''}</span><br>“${esc(x.say)}”<br><span class="dim">${esc(x.how)}</span></li>`).join('') + '</ul>';
}
