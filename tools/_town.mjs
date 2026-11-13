import { chromium } from 'playwright';
import { openGame, simulate } from '../tests/lib.mjs';
const out = process.argv[2];
const b = await chromium.launch();
const { page, errors } = await openGame(b, 'dist/index.html', { rng: 41, town: 'greenhollow-test' });
const r0 = await page.evaluate(() => { newTown('build-town-1', 'town'); const P = game.player;
  return { pop: npcs.length, adults: npcs.filter(n => n.adult).length, yards: town.yards.length, lived: town.yards.filter(y => yardPeople(y).length).length, huts: rooms.filter(r => !r.dead && r.hut).length,
    bedless: npcs.filter(n => !n.bed || n.bed.x == null).map(n => n.first), roofless: npcs.filter(n => !n.homeRoom).map(n => n.first), crops: town.crops.length, sown: town.crops.filter(c => c.st).length, player: P && P.first, scen: town.scenario, variant: town.variant, step: town.prog && town.prog.step }; });
console.log('start', JSON.stringify(r0));
await simulate(page, 3 * 1440);
const r1 = await page.evaluate(() => ({ pop: npcs.filter(n => !n.dead).length, hungry: npcs.filter(n => n.hunger > 70).length, rentPaid: town.rent && town.rent.total, harvested: LIFE.digest(3).kinds.harvested || 0, planted: LIFE.digest(3).kinds.planted || 0, sold: LIFE.digest(3).kinds.sold || 0, bedless: npcs.filter(n => !n.bed || n.bed.x == null).length, step: town.prog && town.prog.step, unlock: town.unlock }));
console.log('3 days', JSON.stringify(r1));
console.log('errors', errors.length, errors.slice(0, 3).join(' | '));
await b.close();
