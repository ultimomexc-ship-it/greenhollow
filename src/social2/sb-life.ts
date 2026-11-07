/* ================= social2 / sb-life: things that happen in people's lives =================
   Small, ordinary happenings that give the village something to talk about, each an event others can witness or hear of:
   falling ill (a few days in bed, family worried, neighbours visiting), losing coins (and whoever finds them keeping them or not),
   a windfall, a good or a bad week in business, an unusual delivery, a remarkable catch or harvest.                                   */
const SB_DELIVERY = ['a crate of wine from the mainland', 'a letter sealed with red wax', 'a cage with a songbird in it', 'bolts of bright red cloth', 'a strange blue fish nobody can name', 'a barrel of salted olives', 'a mirror wrapped in straw'];
const sbHome = n => npcs.filter(q => q !== n && !q.dead && !q.infant && (q.homeRoom && q.homeRoom === n.homeRoom));
function sbLifeDaily() {
  const adults = npcs.filter(n => !n.dead && !n.infant && n.age >= 14 && !n.player);
  for (const n of adults) {
    // falling ill
    if (!(n.ill && n.ill.until > game.time) && Math.random() < 0.006 * (n.age > 55 ? 2 : 1) * ((n.health || 60) < 35 ? 2 : 1)) {
      const days = 1 + Math.floor(Math.random() * 3); n.ill = { until: game.time + days * 1440, t: game.time };
      lfEmit('illness', { actor: null, target: n, sev: days > 2 ? 2 : 1, tags: ['health', 'misfortune'], witnessIds: sbHome(n).map(q => q.id), chron: false, text: `${n.first} has taken ill with a fever` });
      if (!n.player) lfMod(n, 'ill', 'ill in bed', -10, days * 1440);
    }
    // a friend or relative sits with the sick
    if (n.ill && n.ill.until > game.time && Math.random() < 0.6) { const v = npcs.filter(q => q !== n && !q.dead && !q.infant && q.age >= 12 && !(q.ill && q.ill.until > game.time) && (isKin(q, n) || (q.aff[n.id] || 0) > 30)).sort((x, y) => (y.aff[n.id] || 0) - (x.aff[n.id] || 0))[0]; if (v) SBX.console.run(v, n); }
    if (n.ill && n.ill.until <= game.time && !n.ill.done) { n.ill.done = 1; lfEmit('recovered', { actor: null, target: n, sev: 1, tags: ['news'], witnessIds: sbHome(n).map(q => q.id), chron: false, text: `${n.first} is up and about again after the fever` }); }
    // losing coins, and who finds them
    if (n.coin >= 6 && Math.random() < 0.01) {
      const q = Math.min(n.coin, 2 + Math.floor(Math.random() * 5)); n.coin -= q;
      const lost = lfEmit('lostcoins', { actor: null, target: n, sev: 1, tags: ['misfortune'], witnessIds: [], chron: false, text: `${n.first} lost ${q} denarii somewhere` }); lf2Learn(n, lost, null, 1, false);
      const finder = anyOf(adults.filter(x => x !== n)); if (finder) {
        const honest = lf2Has(finder, 'devout') || lf2Has(finder, 'generous') || (finder.aff[n.id] || 0) > 30 || (!lf2Has(finder, 'greedy') && Math.random() < 0.5);
        if (honest) { n.coin += q; lfEmit('returned', { actor: finder, target: n, sev: 1, tags: ['honest', 'kindness'], witnessIds: [], chron: false, text: `${finder.first} found ${n.first}'s lost coins and gave every one back` }); }
        else { finder.coin += q; const ev = lfEmit('keptcoins', { actor: finder, target: n, sev: 1, tags: ['theft', 'deceit'], witnessIds: [], aware: false, chron: false, text: `${finder.first} found ${n.first}'s lost coins and kept them` }); ev.unseen = true; }
      }
    }
    // pilfering: something goes missing, nobody saw who; the victim suspects somebody, often the wrong person
    if (n.coin >= 4 && Math.random() < 0.012) sbPilfer(n, adults);
    // a windfall
    if (Math.random() < 0.004) { const q = 8 + Math.floor(Math.random() * 12); n.coin += q; lfEmit('windfall', { actor: n, target: null, sev: 1, tags: ['rich'], witnessIds: sbHome(n).map(x => x.id), chron: false, text: `${n.first} has come into ${q} denarii, from somewhere` }); }
    // a remarkable catch or harvest
    const job = n.job || n.cur;
    if ((job === 'Fisher' || job === 'Farmer') && Math.random() < 0.04) lfEmit('bigcatch', { actor: n, sev: 1, tags: ['brave'], chron: false, text: job === 'Fisher' ? `${n.first} landed the biggest fish anyone has seen this year` : `${n.first}'s field gave a harvest twice the size of anyone's` });
  }
  // a shopkeeper's week
  if (Math.floor(game.time / 1440) % 7 === 0) for (const n of adults) { const J = n.job && LF2_JOBS[n.job]; if (!J || !J.room || n.job === 'Guard') continue;
    const good = (n.coin || 0) > 25 ? Math.random() < 0.7 : Math.random() < 0.3;
    lfEmit('businessweek', { actor: n, sev: 1, tags: ['business', good ? 'rich' : 'misfortune'], chron: false, text: good ? `${n.first} had the best week at the ${J.name.toLowerCase()}'s in a long while` : `${n.first} had a terrible week at the ${J.name.toLowerCase()}'s; hardly a customer` });
    if (!n.player) lfMod(n, 'week', good ? 'a good week at work' : 'a bad week at work', good ? 6 : -6, 1440 * 3); }
  // an unusual delivery
  if (Math.random() < 0.15) { const shop = rooms.find(r => !r.dead && LF2_SELL[r.kind]); const keeper = shop && npcs.find(n => !n.dead && n.job && LF2_JOBS[n.job] && LF2_JOBS[n.job].room === shop.kind);
    if (keeper) lfEmit('delivery', { actor: keeper, sev: 1, tags: ['news'], chron: false, text: `${keeper.first} took delivery of ${anyOf(SB_DELIVERY)}`, x: shop.x + 1, y: shop.y + 1 }); }
}
LF2.hourly.push(h => { if (h === 8) sbLifeDaily(); });
const SB_PILFER = ['a purse', 'the coins under the mattress', 'a good knife', 'a smoked ham', 'a jar of honey', 'a pair of new boots', 'a basket of eggs'];
function sbPilfer(n, adults) {
  const cands = adults.filter(x => x !== n && x.age >= 14 && !isKin(x, n) && (lf2Has(x, 'greedy') || x.coin < 3 || lf2Has(x, 'lazy')));
  const thief = anyOf(cands); if (!thief) return null; const what = anyOf(SB_PILFER), q = Math.min(n.coin, 1 + Math.floor(Math.random() * 4)); n.coin -= q; thief.coin += q;
  const home = sbHome(n), saw = Math.random() < 0.25 ? [anyOf(adults.filter(x => x !== thief && x !== n))].filter(Boolean) : [];
  const ev = lfEmit('pilfer', { actor: thief, target: n, sev: 1, anon: true, sawActor: saw.map(x => x.id), tags: ['theft', 'crime'], witnessIds: home.map(x => x.id), chron: false,
    text: `${thief.first} took ${what} from ${n.first}'s house`, anonText: `Somebody took ${what} from ${n.first}'s house` });
  // the victim (and the household) settle on a suspect: somebody they already dislike, or somebody who has been short of money
  const sus = (o) => { let best = null, bw = 8; for (const x of adults) { if (x === o || x === n || isKin(x, o)) continue; const w = -(o.aff[x.id] || 0) * 0.6 + (x.coin < 3 ? 6 : 0) + (lf2Has(x, 'greedy') ? 5 : 0) + (x === thief ? 4 : 0) + Math.random() * 12; if (w > bw) { bw = w; best = x; } } return best; };
  for (const o of [n, ...home]) { if (o === thief || !o.kn || !o.kn[ev.id] || o.kn[ev.id].a) continue; if (Math.random() < (o === n ? 0.6 : 0.3)) { const s = sus(o); if (s) { const k = o.kn[ev.id]; k.who = s.id; k.a = true; k.cert = 0.4; k.sus = 1; lf2Feel(o, ev, null, 0.4, true, true); } } }
  return ev;
}
/* ill people stay in bed */
LF2.preD.push(function (n, tod) { if (!n.ill || n.ill.until <= game.time || !n.bed || n.player || n.hunger > 60 || n.starving > 0 || (n.age >= 16 && pantryDays(n) < 1.2)) return null; return [goS({ x: n.bed.x, y: n.bed.y }, 'Going to bed with a fever'), waitS(90, 'sleep', 'Ill in bed with a fever')]; });
/* parents keep the little ones fed: a hungry child and an empty pantry send whoever has the money out for food */
LF2.preD.push(function (n, tod) {
  if (n.player || n.age < 16 || !n.homeRoom || (n.feedCool || 0) > game.time || (n.ill && n.ill.until > game.time && n.hunger <= 60)) return null;
  const kid = npcs.find(k => !k.dead && !k.infant && k.age < 14 && k.homeRoom === n.homeRoom && (k.hunger >= 70 || k.starving > 0)); if (!kid || foodCount(pantryOf(n)) >= 1) return null;
  n.feedCool = game.time + 120; const home = [goS(pantrySpot, `Taking food home for ${kid.first}`), waitS(2, 'stand', 'Stocking the pantry', { onEnd: stash })];
  // what they carry goes home first; then the shops; and if there is nothing to buy, out to forage for the household
  const s = foodCount(n.inv) >= 1 ? home : (n.coin >= 3 && foodShopPlan(n)) || ((() => { const f = foragePlan(n); return f ? f.concat(home) : null; })()); if (!s) return null;
  if (!SB.presim && !n.player) lfMod(n, 'feed' + kid.id, `worried about feeding ${kid.first}`, -2, 240);
  return s;
});
