/* The first morning, played by a bot: a new Hamlet island with the tutorial, played through real key presses (arrow keys to walk, Space to
   move a bubble on) frame by frame, as fast as the page allows but with the game's own real-time clock. Writes a report: every scene and step
   with the real seconds it took, every line said, the strip text, a screenshot per scene, and the step it got stuck on, if any.

     node tools/tutorial.mjs [--seed=41] [--out=/tmp/claude-0/tutorial] [--file=dist/index.html] [--patient] [--until=<scene>]
   --patient: wait for every bubble instead of pressing Space (the pace a player who reads everything would have). */
import path from 'node:path';
import fs from 'node:fs';
import { launch, openGame } from '../tests/lib.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const seed = +opt('seed', 41), out = opt('out', '/tmp/claude-0/tutorial'), file = opt('file', 'dist/index.html'), patient = args.includes('--patient'), until = +opt('until', 99);
fs.mkdirSync(out, { recursive: true });

export async function playTutorial(page, { patient = false, until = 99, shots = null, maxSec = 900 } = {}) {
  await page.evaluate(() => {
    window.GH_NOTUT = false; window.GH_OLDSHOP = false; newTown('tutorial', 'hamlet');
    /** one frame of the real frame loop, without drawing: the tutorial on real time, then the sim */
    window.__tutFrame = ms => { window.__advance(ms); const dt = ms / 1000; tut2Tick(dt); if (state.speed > 0 && !town.decision) updateSim(dt * state.rate * state.speed); drainEvents(performance.now()); };
    /** what the bot does now: skip a bubble, walk toward the step's target, or nothing */
    window.__tutBot = tut2BotDecide;   // (the bot's decisions live in the game: src/life2/tutorial2-bot.ts, so the Watch button plays the same bot)
  });
  const rep = { steps: [], stuck: null, secs: 0 };
  let held = null, t = 0, lastSig = '', sigT = 0, lastScene = -1;
  const FRAME = 33;
  while (t < maxSec * 1000) {
    const b = await page.evaluate(() => window.__tutBot());
    if (b.done || b.scene >= until) break;
    if (b.scene !== lastScene) { lastScene = b.scene; if (shots) await shots(b.scene, t); }
    if (b.bubble && !patient) { await page.keyboard.press('Space'); }
    if (b.click) { try { await page.click(b.click, { timeout: 500, force: true }); } catch (e) {} }
    if (b.press) { if (held) { await page.keyboard.up(held); held = null; } await page.keyboard.press(b.press === 'b' ? 'b' : b.press); }
    const want = b.key === 'same' ? held : (b.key || null);
    if (want !== held) { if (held) await page.keyboard.up(held); if (want) await page.keyboard.down(want); held = want; }
    else if (!want && held) { await page.keyboard.up(held); held = null; }
    for (let i = 0; i < 3; i++) await page.evaluate(ms => window.__tutFrame(ms), FRAME);
    t += FRAME * 3;
    const sig = b.scene + ':' + b.step; if (sig !== lastSig) { lastSig = sig; sigT = t; }
    else if (t - sigT > 60000) { rep.stuck = { scene: b.scene, step: b.step, do: b.do, strip: b.strip, bot: b, P: await page.evaluate(() => { const P = game.player, p = P.player; return { at: [P.tx, P.ty], face: P.face, idle: p.idle, fresh: p.fresh, lock: p.lock, act: p.act && p.act.key, keys: p.keys, msg: p.msg, held: itHeld(P).kind, build: itBuildOn(P) }; }) }; break; }
  }
  if (held) await page.keyboard.up(held);
  rep.secs = t / 1000;
  Object.assign(rep, await page.evaluate(() => ({ log: town.tut2.log, said: town.tut2.said, scene: town.tut2.scene, step: town.tut2.step, done: town.tut2.done,
    player: { coin: game.player.coin, tools: (game.player.items || []).map(i => i.kind), at: [game.player.tx, game.player.ty] }, time: fmtTime(game.time) })));
  return rep;
}

if (import.meta.url === 'file://' + path.resolve(process.argv[1])) {
  const browser = await launch();
  const { page, errors } = await openGame(browser, path.resolve(file), { rng: seed, town: 'tutorial-' + seed });
  const shot = async (scene) => {
    await page.evaluate(() => { const P = game.player; centerOn(P.tx, P.ty); clampCam(); for (let i = 0; i < 4; i++) { window.__advance(50); render(performance.now(), 0.016, (game.time % 1440) / 60); } });
    await page.screenshot({ path: path.join(out, `scene-${scene}.png`) });
  };
  const rep = await playTutorial(page, { patient, until, shots: shot });
  await shot('end');
  const L = [];
  L.push(`# The first morning, played by the bot (seed ${seed}${patient ? ', reading every bubble' : ', skipping bubbles'})`, '');
  L.push(rep.stuck ? `**Stuck** in scene ${rep.stuck.scene}, step ${rep.stuck.step} (${rep.stuck.do}), strip: ${rep.stuck.strip || '-'}\n\n\`${JSON.stringify(rep.stuck.bot)}\`\n\n\`${JSON.stringify(rep.stuck.P)}\`` : rep.done ? '**Finished the tutorial.**' : `Stopped at scene ${rep.scene}, step ${rep.step} (the tutorial goes no further yet).`, '');
  L.push(`Real time: ${rep.secs.toFixed(1)} s. Game clock: ${rep.time}. You: ${rep.player.coin} coin, tools ${rep.player.tools.join(', ') || 'none'}.`, '');
  L.push('## Steps', '', '| Scene | Step | Kind | Real seconds |', '| --- | --- | --- | --- |');
  const per = {}; for (const s of rep.log) { L.push(`| ${s.scene} | ${s.step} | ${s.do} | ${s.t} |`); per[s.scene] = (per[s.scene] || 0) + s.t; }
  L.push('', '## Seconds per scene', '', ...Object.entries(per).map(([k, v]) => `- Scene ${k}: ${v.toFixed(1)} s`));
  L.push('', '## Everything said', '', ...rep.said.map(l => `- (${l.scene}) **${l.who}**: ${l.text}`));
  if (errors.length) L.push('', '## Errors', '', ...errors.map(e => '- ' + e.split('\n')[0]));
  fs.writeFileSync(path.join(out, 'tutorial-report.md'), L.join('\n') + '\n');
  console.log(L.slice(0, 6).join('\n')); console.log('report:', path.join(out, 'tutorial-report.md'), errors.length ? errors.length + ' errors' : '');
  await browser.close();
}
