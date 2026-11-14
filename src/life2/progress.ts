/* Progression in the Hamlet (docs/minimum-game.md "Progression"): five steps, one at a time, shown as the request pill and voiced by villagers near you.
   Each step has exact numbers; the next is shown when the last is met. Step 3 unlocks the seed stall, step 4 the carpenter, step 5 is the closing card, then free play.
   `town.prog` = { step (1..6, 6 = done), done: { [step]: game time }, sold (crops the trader bought), closed (the card was shown) }. */

const PROG_HH = 5, PROG_THRIVE_HH = 12, PROG_FIELDS = 6, PROG_MOOD = 60, PROG_HUNGRY = 70;
const progState = (): any => town.prog || (town.prog = { step: 1, done: {}, sold: 0, closed: false });
/** the family that was there before you: the first three who are not you or the trader */
const progFamily = (): any[] => { const pl = yardPlayer(); return (town.hamletFamily || []).map((id: number) => byId(id)).filter((n: any) => n && !n.dead && n !== pl); };
/** households: lived-in yards (the trader's and yours count), plus you when you have no yard */
function progHouseholds(): number { const pl = yardPlayer(); return (town.yards || []).filter((y: any) => y.open == null && yardPeople(y).length).length + (pl && !yardOfN(pl) ? 1 : 0) + (npcs.some((n: any) => isPaullus(n) && !yardOfN(n)) ? 1 : 0); }   // (Paullus, who has no bed, is a household of his own)
/** everybody but the trader: is their bed inside a sealed room? */
function progRoofed(): [number, number] { const ppl = npcs.filter((n: any) => !n.dead && !rentTrader(n)); return [ppl.filter((n: any) => yardHasBed(n) && rentHome(n).roof).length, ppl.length]; }
/** where the island stands on a step: { n, title, say, how, rows: [label, have, need][], who, met } */
function progStep(n: number): any {
  const pl = yardPlayer(), P = progState();
  if (n === 1) {
    const fam = progFamily(), y = fam.map(yardOfN).find(Boolean) || null, inYard = fam.filter(f => yardOfN(f) && yardOfN(f) === y).length, fields = y ? town.crops.filter((c: any) => yardAtXY(c.x, c.y) === y).length : 0;
    return { n, title: 'Shelter the family', say: inYard < fam.length ? 'We have nowhere to sleep. A fence round some beds would do. We would pay for it.' : 'We have a yard. Some field inside it and we can feed ourselves, and pay you.', how: `Fence a yard with a gate (12 tiles or more inside), put ${fam.length} beds in it and ${PROG_FIELDS} field tiles. The trader sells all of it.`, rows: [['In a yard', inYard, fam.length], ['Field tiles in it', fields, PROG_FIELDS]], who: fam, met: fam.length > 0 && inYard === fam.length && fields >= PROG_FIELDS };
  }
  if (n === 2) return { n, title: 'The first harvest sold', say: 'Something has to grow and then somebody has to sell it. That is the whole plan, as far as I can tell.', how: 'Plough, sow, wait about two days, harvest, and sell a crop to the trader (you or anybody).', rows: [['Crops sold to the trader', Math.min(1, P.sold), 1]], who: progFamily(), met: P.sold > 0 };
  if (n === 3) { const hh = progHouseholds(); return { n, title: 'Five households', say: 'It is quiet. More people would come if there were somewhere to put them.', how: 'Build empty yards with beds: one bed brings a single, two a couple, three or more a family. Nobody comes while somebody is without a bed or hungry.', rows: [['Households', hh, PROG_HH]], who: npcs.filter((q: any) => !q.dead && q !== pl && q.age >= 16).slice(0, 3), met: hh >= PROG_HH }; }
  if (n === 4) { const [r, all] = progRoofed(); return { n, title: 'Everyone under a roof', say: 'It rains here, now and then. We have noticed.', how: 'Wall the beds in: wall blocks round them with a door, and a window for more rent. The seed stall can be built now.', rows: [['Beds under a roof', r, all]], who: npcs.filter((q: any) => !q.dead && q !== pl && !rentTrader(q) && !(yardHasBed(q) && rentHome(q).roof)).slice(0, 3), met: all > 0 && r === all }; }
  if (n === 5) { const hh = progHouseholds(), [r, all] = progRoofed(), ppl = npcs.filter((q: any) => !q.dead && q !== pl), hungry = ppl.filter((q: any) => q.hunger > PROG_HUNGRY).length, mood = Math.round(ppl.reduce((s: number, q: any) => s + q.mood, 0) / Math.max(1, ppl.length));
    return { n, title: 'The island thrives', say: 'We have nearly got the hang of this. Whatever this is.', how: `${PROG_THRIVE_HH} households, everybody under a roof, nobody hungry, and the island content (on average over ${PROG_MOOD}). The carpenter's stall can be built now.`, rows: [['Households', hh, PROG_THRIVE_HH], ['Beds under a roof', r, all], ['Not hungry', ppl.length - hungry, ppl.length], ['Contentment', mood, PROG_MOOD + 1]], who: ppl.filter((q: any) => q.hunger > PROG_HUNGRY || q.mood <= PROG_MOOD).slice(0, 3), met: hh >= PROG_THRIVE_HH && r === all && !hungry && mood > PROG_MOOD }; }
  return null;
}
/** move on through the steps that are met; unlock and close as they pass */
function progTick() {
  if (!yardOn() || !town.hamletFamily) return; const P = progState(), pl = game.player;
  for (let guard = 0; guard < 5 && P.step <= 5; guard++) {
    const s = progStep(P.step); if (!s || !s.met) break;
    P.done[P.step] = game.time; chron(`Step ${P.step} of 5: ${s.title.toLowerCase()}.`, 'note'); LIFE.emit('step_reached', pl || npcs[0], { qty: P.step });
    if (P.step === 3) hamletUnlock('seedstall'); if (P.step === 4) hamletUnlock('carpenter');
    if (P.step === 5 && !P.closed) { P.closed = true; const days = Math.max(1, Math.ceil(game.time / 1440)), ppl = npcs.filter((q: any) => !q.dead).length;
      town.decision = { kind: 'thrive', who: pl ? pl.id : 0, title: 'The island thrives', text: `Day ${days}. ${progHouseholds()} households, ${ppl} people, everybody under a roof and nobody hungry. You have taken ${(town.rent && town.rent.total) || 0} coin in rent. Nobody asked how any of you got here, and nobody has asked since.`, opts: [{ k: 'yes', label: 'Keep playing' }] }; }
    else if (pl && pl.player) playerSay(pl, `Done: ${s.title.toLowerCase()}. ${P.step < 5 ? 'Next: ' + progStep(P.step + 1).title.toLowerCase() + '.' : ''}`);
    P.step++;
  }
}
LF2.hourly.push(() => progTick());
/** the request pill in the Hamlet: couples living apart first, then the step */
function progNeeds(add: (id: string, title: string, say: string, how: string, who: any[], hard?: boolean) => void) {
  progTick(); const P = progState(); if (P.step > 5) return;
  const s = progStep(P.step); if (s) add('step' + s.n, `${s.n}/5 · ${s.title}`, s.say, s.how, s.who);
}
/** the rows of the card: the step's own numbers */
function progRowsHTML(): string {
  const P = progState(); if (P.step > 5) return '<div class="reqrows"><span>All five steps done <span class="ok">✓</span></span></div>';
  const s = progStep(P.step); if (!s) return '';
  return `<div class="reqrows">${s.rows.map((r: any) => `<span>${esc(r[0])} ${r[1] >= r[2] ? '<span class="ok">✓</span>' : '<b>' + r[1] + '/' + r[2] + '</b>'}</span>`).join('')}</div><div class="dim reqthen">Step ${s.n} of 5${s.n < 5 ? ' · then: ' + esc(progStep(s.n + 1).title.toLowerCase()) : ''}</div>`;
}
/** crops the trader buys count for step 2 */
// @ts-expect-error -- deliberate patch
const _progLog = logTrade; logTrade = function (buyer, seller, g, q, total, verb) {
  if (yardOn() && buyer && buyer.shop && buyer.shop.def === HAMLET_TRADER_DEF && SELLABLE.includes(g) && !String(g).startsWith('seed_')) progState().sold += q || 1;
  return _progLog.apply(this, arguments as any);
};
