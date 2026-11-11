/* The villager card: click anyone on the canvas to see what they are doing right now, how they are, who they get on with and what they did lately.
   It is for the player to read, so it gives hints in plain words and no numbers (the debugging numbers stay in `npcDebug`, build-mode hover).
   `n.status` is what the plan is doing at this moment; `n.log` the steps before it; `n.aff` / `n.know` / `relLabel` the relationships. */

let VCARD: any = null;   // the villager whose card is open
function vcMood(n: any): string[] {
  const out: string[] = [];
  if (n.pose === 'sleep') out.push('asleep');
  if (n.hunger > 70) out.push('hungry'); if (n.energy != null && n.energy < 25 && n.pose !== 'sleep') out.push('worn out');
  if (n.bladder > 80) out.push('needs a privy'); if (n.social != null && n.social < 22) out.push('lonely');
  if (!n.homeRoom || n.homeRoom.dead) out.push('no bed of their own');
  return out;
}
function vcFeel(a: number, k: number): string { return a >= 60 ? 'very fond of' : a >= 30 ? 'fond of' : a >= 10 ? 'gets on with' : a <= -50 ? 'cannot stand' : a <= -20 ? 'avoids' : k > 20 ? 'knows' : ''; }
function vcHTML(n: any): string {
  if (n.dead) return `<b>${esc(n.first)}</b><p class="dim">Dead. That is all there is to say.</p>`;
  const mood = typeof lfMoodWord === 'function' && n.mood != null ? lfMoodWord(n.mood).toLowerCase() : '', hints = vcMood(n);
  const here = typeof placeOf === 'function' ? placeOf(n) : '';
  const doing = n.pose === 'sleep' ? 'Asleep.' : (n.status ? String(n.status).replace(/\.$/, '') + '.' : 'Nothing in particular.');
  const rel = npcs.filter(o => o !== n && !o.dead && ((n.aff[o.id] || 0) !== 0 || (n.know[o.id] || 0) > 20)).map(o => ({ o, a: n.aff[o.id] || 0, k: n.know[o.id] || 0 }))
    .sort((x, y) => Math.abs(y.a) + y.k * .2 - Math.abs(x.a) - x.k * .2).slice(0, 4).map(r => { const f = vcFeel(r.a, r.k), l = relLabel(n, r.o); return f ? `<li>${f} ${esc(r.o.first)}${l ? ' <span class="dim">· ' + esc(String(l).replace(r.o.first, '').replace(/\s+/g, ' ').trim().replace(/ (to|of|with)$/, '')) + '</span>' : ''}</li>` : ''; }).join('');
  const lately = (n.log || []).slice(-6, -1).reverse().map((e: any) => `<li><span class="dim">${fmtTime(e.t)}</span> ${esc(String(e.text).replace(/\.$/, ''))}</li>`).join('');
  const news = (town.chron || []).filter((c: any) => c.text.indexOf(n.first) >= 0).slice(-3).reverse().map((c: any) => `<li>${esc(c.text)}</li>`).join('');
  return `<b>${esc(typeof nameOf === 'function' ? nameOf(n) : n.first)}</b>${n.player ? ' <span class="dim">(you)</span>' : ''}<div class="dim">${n.age}${n.role ? ' · ' + esc(n.role) : ''}${here ? ' · ' + esc(here) : ''}</div>` +
    `<div class="vcrow"><span class="dim">Right now</span> ${esc(doing)}</div>` +
    `<div class="vcrow"><span class="dim">Feeling</span> ${esc(mood || 'fine')}${hints.length ? ' · ' + esc(hints.join(', ')) : ''}</div>` +
    (rel ? `<div class="vch">Company</div><ul>${rel}</ul>` : '') + (news ? `<div class="vch">Said about them</div><ul>${news}</ul>` : '') + (lately ? `<div class="vch">Before that</div><ul>${lately}</ul>` : '');
}
function openVillagerCard(n: any) { VCARD = n || null; vcDraw(true); }
function closeVillagerCard() { VCARD = null; vcDraw(true); }
let vcSig = '';
function vcDraw(force?: boolean) {
  const box: any = document.getElementById('vcbox'); if (!box) return;
  if (!VCARD || !town) { box.hidden = true; vcSig = ''; return; }
  const h = `<div class="vccard"><button type="button" class="reqx" data-vc="x" title="Close (Esc)">×</button>${vcHTML(VCARD)}</div>`;
  box.hidden = false; if (force || h !== vcSig) { box.innerHTML = h; vcSig = h; }
}
(function () {
  const stage = canvas.parentNode as any; if (!stage) return;
  const box = document.createElement('div'); box.id = 'vcbox'; box.className = 'vcbox'; box.hidden = true; stage.appendChild(box);
  box.addEventListener('click', (e: any) => { if (e.target.closest('[data-vc]')) closeVillagerCard(); });
  window.addEventListener('keydown', (e: any) => { if (e.key === 'Escape' && VCARD && !(typeof talkUI !== 'undefined' && talkUI.o)) closeVillagerCard(); });
  setInterval(() => { try { vcDraw(); } catch (e) {} }, 500);
})();

/* ---- Overheard: what villagers say to each other, kept on the canvas (C shows and hides it, `gh.heard`) ----
   Speech bubbles fade in seconds; this keeps the last few exchanges (who said what, and where) so they can be read. Fed by `addChatter`. */
let HEARD_ON = true; try { HEARD_ON = localStorage.getItem('gh.heard') !== '0'; } catch (e) {}
const HEARD: any[] = [];
function overheardAdd(ev: any) {
  if (!ev || !ev.lines || !ev.lines.length || (ev.a && ev.a.player) || (ev.b && ev.b.player)) return;   // (your own talk has its own box)
  HEARD.push({ t: ev.time, place: ev.place, lines: ev.lines.map((l: any) => ({ who: l.who.first, col: l.who.shirt, text: l.text })) }); if (HEARD.length > 6) HEARD.shift();
  heardDraw();
}
function heardDraw() {
  const box: any = document.getElementById('heardbox'); if (!box) return;
  if (!HEARD_ON || !HEARD.length || !town) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = HEARD.map((h, i) => `<div class="hx" style="opacity:${(0.45 + 0.55 * (i + 1) / HEARD.length).toFixed(2)}"><div class="dim">${fmtTime(h.t)}${h.place ? ' · ' + esc(String(h.place)) : ''}</div>` +
    h.lines.map((l: any) => `<div><b style="color:${l.col || '#e8e2d0'}">${esc(l.who)}</b> ${esc(l.text)}</div>`).join('') + '</div>').join('');
  box.scrollTop = box.scrollHeight;
}
(function () {
  const stage = canvas.parentNode as any; if (!stage) return;
  const box = document.createElement('div'); box.id = 'heardbox'; box.className = 'heardbox'; box.hidden = true; stage.appendChild(box);
  window.addEventListener('keydown', (e: any) => { if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '') && town && !(typeof talkUI !== 'undefined' && talkUI.o)) { HEARD_ON = !HEARD_ON; try { localStorage.setItem('gh.heard', HEARD_ON ? '1' : '0'); } catch (err) {} heardDraw(); } });
})();
