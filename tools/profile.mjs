// Frame-time profiler: runs the real game loop (real clock, real requestAnimationFrame) in headless Chromium
// and reports where each frame's time goes. Headless Chromium draws in software, so absolute numbers are
// pessimistic; compare before/after, not against 60 fps.
//   node tools/profile.mjs [seconds] [zoom]      e.g. node tools/profile.mjs 8 1.5
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, openGame } from '../tests/lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const secs = Number(process.argv[2] || 8), zoom = process.argv[3] ? Number(process.argv[3]) : null;
const cpu = process.argv.includes('--cpu'), pan = process.argv.includes('--pan');
const fileArg = process.argv.find(a => a.startsWith('--file='));
const browser = await launch();
const { page, errors } = await openGame(browser, fileArg ? fileArg.slice(7) : path.join(root, 'dist/index.html'), { live: true, viewport: { width: 1280, height: 800 } });
await page.waitForTimeout(1500);
await page.evaluate(([zoom, pan]) => { window.__pan = pan;
  if (zoom) { cam.z = zoom; }
  const stat = window.__prof = { frames: 0, frameMs: [], parts: {} };
  const wrap = (name) => { const f = window[name]; if (typeof f !== 'function') return; window[name] = function () { const t = performance.now(); const r = f.apply(this, arguments); const d = performance.now() - t; stat.parts[name] = stat.parts[name] || { n: 0, ms: 0, max: 0 }; const p = stat.parts[name]; p.n++; p.ms += d; if (d > p.max) p.max = d; return r; }; };
  for (const n of ['updateSim', 'render', 'updateUI', 'drawClock', 'drainEvents', 'flushDirty', 'drawGround', 'gaBake', 'drawCrops', 'drawDoors', 'drawTide', 'drawNodes', 'drawSites', 'drawEventsFx', 'drawWorkFx', 'stepWild', 'drawWild', 'stepSea', 'drawSea', 'drawLabels', 'drawPerson', 'drawSleeper', 'drawTallTile', 'drawLighting', 'buildLightMaps', 'drawBubbles', 'drawOverlay', 'drawYard', 'drawFeast', 'drawDrops', 'drawRemains', 'drawActivityBars', 'drawTalkMarks', 'drawSiteTags', 'drawPlayerFx', 'drawCeremonyFire', 'daylight']) wrap(n);
  let last = performance.now(); let dir = 1; const tick = now => { stat.frames++; if (window.__pan) { cam.follow = false; const sp = 6 / Math.max(0.3, cam.z); cam.x += dir * sp; cam.y += dir * sp * 0.35; clampCam(); if (cam.x <= 0 || cam.x >= W * TS - cam.cw / cam.z) dir = -dir; } stat.frameMs.push(now - last); last = now; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
}, [zoom, pan]);
let client, session;
if (cpu) { client = await page.context().newCDPSession(page); await client.send('Profiler.enable'); await client.send('Profiler.setSamplingInterval', { interval: 500 }); await client.send('Profiler.start'); }
await page.waitForTimeout(secs * 1000);
const out = await page.evaluate(() => window.__prof);
if (cpu) { const { profile } = await client.send('Profiler.stop'); fs.writeFileSync(path.join(root, 'tools', 'last.cpuprofile'), JSON.stringify(profile));
  const self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n]));
  const dt = profile.timeDeltas; let total = 0;
  profile.samples.forEach((id, i) => { const n = byId.get(id), k = n.callFrame.functionName + ' ' + (n.callFrame.url ? '' : '') + ':' + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + dt[i]); total += dt[i]; });
  console.log('\nTop functions by self time:'); [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, v]) => console.log(`  ${(v / 1000).toFixed(0).padStart(6)} ms  ${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`)); }
const fm = out.frameMs.slice(5).sort((a, b) => a - b), pct = q => fm[Math.min(fm.length - 1, Math.floor(fm.length * q))];
console.log(`${out.frames} frames in ${secs}s = ${(out.frames / secs).toFixed(1)} fps   frame ms: median ${pct(0.5).toFixed(1)}  p95 ${pct(0.95).toFixed(1)}  p99 ${pct(0.99).toFixed(1)}  worst ${fm.at(-1).toFixed(0)}`);
for (const [k, v] of Object.entries(out.parts).sort((a, b) => b[1].ms - a[1].ms)) console.log(`  ${k.padEnd(16)} ${(v.ms / v.n).toFixed(2).padStart(7)} ms avg  max ${v.max.toFixed(1).padStart(6)}   (${v.n} calls, ${(v.ms / secs).toFixed(0)} ms per second of wall time)`);
if (errors.length) console.log('errors:', errors.slice(0, 3));
await browser.close();
