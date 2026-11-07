// Conversation explorer: opens a talk with villagers and plays it forward by picking options, printing the whole transcript.
//   node tools/talk.mjs [seed] [people] [turns] [mode]     mode: first | random | warm | edgy
import { launch, openGame, simulate } from '../tests/lib.mjs';
const [seed = 'talk', people = 3, turns = 8, mode = 'random'] = process.argv.slice(2);
const browser = await launch();
const { page, errors } = await openGame(browser, new URL('../dist/index.html', import.meta.url).pathname, { rng: 41, town: seed });
await simulate(page, 3 * 1440 + 10 * 60);
const out = await page.evaluate(async ([people, turns, mode]) => {
  if (!game.player) startPlaying(byId(game.steer) || npcs.find(canControl));
  const res = [];
  const cand = npcs.filter(q => q !== game.player && !q.dead && q.age >= 14 && q.pose !== 'sleep');
  for (const o of cand.slice(0, people)) {
    const p = game.player; o.aff[p.id] = o.aff[p.id] || 30; o.know[p.id] = Math.max(o.know[p.id] || 0, 30);
    const lines = []; const v = cvVoice(o); lines.push(`=== ${o.first} (${o.job || o.role}, ${o.age}; ${o.traits.join('/')}; voice: ${v.arch}; "${o.status}") — aff ${Math.round(o.aff[p.id])}`);
    openTalk(o); let box = () => { const t = document.getElementById('talk'); return t && !t.hidden ? { say: t.querySelector('.ta').innerText, opts: [...t.querySelectorAll('[data-k]')].map(b => b.innerText.replace(/^\d+\s*/, '').trim()) } : null; };
    for (let i = 0; i < turns; i++) {
      const b = box(); if (!b) { lines.push('   (box closed)'); break; } lines.push(`${o.first}: ${b.say}`);
      if (!b.opts.length) { lines.push('   [no options: they are done]'); break; }
      let k = mode === 'first' ? 0 : Math.floor(Math.random() * b.opts.length);
      lines.push(...b.opts.map((x, j) => `   ${j === k ? '>' : ' '} ${j + 1}. ${x}`));
      const btn = document.querySelector(`#talk [data-k="c${k}"]`); btn.click();
    }
    if (talkUI.o) closeTalk(); res.push(lines.join('\n'));
  }
  return res;
}, [Number(people), Number(turns), mode]);
console.log(out.join('\n\n')); if (errors.length) console.log('\nERRORS:', errors.slice(0, 4));
await browser.close();
