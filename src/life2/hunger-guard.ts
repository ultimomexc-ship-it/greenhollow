/* Nobody sleeps through starving with food at hand: every hour, a sleeper who is nearly starved and has something to eat (in their bag or their pantry) wakes up and eats (the decision then picks the meal). */
LF2.hourly.push(() => {
  for (const n of npcs) {
    if (n.dead || n.player || n.pose !== 'sleep' || (n.hunger || 0) < 95) continue;
    const food = FOODS.some((g: string) => (n.inv && n.inv[g] || 0) > 0) || (typeof pantryOf === 'function' && foodCount(pantryOf(n)) > 0);
    if (food) { abortPlan(n); n.pose = 'stand'; n.bedEat = -1; }
  }
});
