/* ================= life2 / cooking: somebody in each house cooks supper =================
   At six in the evening one adult per household cooks from the pantry. What they make depends on what is in it; how well
   depends on their skill, which grows with practice. A good supper lifts the household's mood; a burnt one does the opposite. */
const COOK_DISHES = [
  { need: { fish: 1, grain: 1 }, name: 'a fish stew' }, { need: { fish: 1 }, name: 'grilled fish' }, { need: { grain: 1, berries: 1 }, name: 'a berry porridge' },
  { need: { grain: 1 }, name: 'flatbread' }, { need: { berries: 1 }, name: 'stewed berries' },
];
function cookSupper() {
  const done = new Set();
  for (const n of npcs) {
    if (n.dead || n.infant || n.age < 16 || !n.homeRoom || done.has(n.homeRoom) || n.player) continue;
    const hh = npcs.filter(q => !q.dead && !q.infant && q.homeRoom === n.homeRoom); if (hh.length < 2) continue; done.add(n.homeRoom);
    const cooks = hh.filter(q => q.age >= 16 && !q.player && !(q.ill && q.ill.until > game.time)); if (!cooks.length) continue;
    const cook = cooks.sort((a, b) => (b.cookSkill || 0) + (b.traits.includes('generous') ? 10 : 0) - (a.cookSkill || 0) - (a.traits.includes('generous') ? 10 : 0))[0];
    const P = pantryOf(cook), dish = COOK_DISHES.find(d => Object.entries(d.need).every(([g, q]) => (P[g] || 0) >= q)); if (!dish) continue;
    const skill = cook.cookSkill = Math.min(100, (cook.cookSkill || 10 + Math.random() * 30) + 1.5), roll = skill + (Math.random() - 0.5) * 50 - (cook.traits.includes('dreamy') ? 15 : 0);
    const q = roll > 75 ? 'good' : roll < 20 ? 'burnt' : 'plain';
    for (const m of hh) if (!m.player) lfMod(m, 'supper', q === 'good' ? `${cook.first}'s ${dish.name.replace(/^an? /, '')}` : q === 'burnt' ? 'a burnt supper' : 'supper', q === 'good' ? 5 : q === 'burnt' ? -4 : 1, 240);
    lfEmit('cooked', { actor: cook, sev: 1, tags: q === 'good' ? ['food'] : q === 'burnt' ? ['food', 'burnt'] : ['food'], witnessIds: hh.filter(m => m !== cook).map(m => m.id), chron: false,
      text: q === 'good' ? `${cook.first} cooked ${dish.name} for supper, and it was the best anyone could remember` : q === 'burnt' ? `${cook.first} burnt ${dish.name} so badly the house had to eat dry bread` : `${cook.first} made ${dish.name} for supper` });
  }
}
LF2.hourly.push(h => { if (h === 18) cookSupper(); });
