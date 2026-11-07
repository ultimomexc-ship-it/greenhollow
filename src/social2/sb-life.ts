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
/* ill people stay in bed */
LF2.preD.push(function (n, tod) { if (!n.ill || n.ill.until <= game.time || !n.bed || n.player || n.hunger > 60 || n.starving > 0) return null; return [goS({ x: n.bed.x, y: n.bed.y }, 'Going to bed with a fever'), waitS(90, 'sleep', 'Ill in bed with a fever')]; });
