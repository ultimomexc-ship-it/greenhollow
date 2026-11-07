/* ================= life2 / glue: the dialog box, talking tricks, the Stories tab, switches, Roman names ================= */
/* a small conversation of our own, in the talk box: opts are [label, fn] and fn returns {say, opts} or null to close */
function lf2Dialog(o, say, opts) {
  const n = game.player; if (!n || !o) return;
  if (!talkUI.o) { const cur: any = document.querySelector('[data-speed][aria-pressed="true"]'); talkUI.prev = cur ? cur.dataset.speed : '2'; const ps: any = document.querySelector('[data-speed="0"]'); if (ps) ps.click(); }
  talkS = { n: o, p: n, custom: true, fns: opts.map(x => x[1]) };
  talkUI.o = o; talkUI.q = ''; o.talkUntil = game.time + 1e6; faceTo(o, n); faceTo(n, o); if (o.moving) o.pose = 'stand'; if (n.player) n.player.keys = {};
  talkUI.say = say; talkUI.opts = opts.map((x, i) => ['c' + i, x[0]]); renderTalk();
}
/* when someone has nothing particular to say, you can still talk to them (and do "something else") */
function lf2TalkFallback(o, p) {
  if (!o || o.player || o.infant || o.age < 5) return null;
  talkS = { n: o, p, sc: null, c: null, stage: 0, fns: [] };
  const busy = o.plan && o.plan[o.si] && o.plan[o.si].act === 'work';
  return { say: busy ? anyOf(['Busy, but go on.', 'Make it quick.', 'Hm? I am working.']) : anyOf(['Hello.', 'Yes?', 'Oh, hello ' + p.first + '.', 'What is it?']), opts: [['lf2more', 'Something else…']] };
}
function lf2TalkStep(key) {
  const S = talkS; if (key === 'bye') return null; const i = +String(key).slice(1), fn = S.fns && S.fns[i]; if (!fn) return null;
  let r = null; try { r = fn(); } catch (e) { console.warn('dialog', e); }
  if (!r) return { close: true };
  S.fns = (r.opts || []).map(x => x[1]); return { say: r.say, opts: (r.opts || []).map((x, i) => ['c' + i, x[0]]) };
}
/* "Something else…" in every conversation */
function lf2SocialMenu() {
  const S = talkS, o = S.n, p = S.p; S.custom = true;
  const known = () => Object.keys(p.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && ev.actor !== o.id && game.time - ev.t < 4 * 1440 && !(o.kn && o.kn[ev.id] && (o.kn[ev.id].a || !p.kn[ev.id].a))).slice(-6).reverse();
  const people = () => npcs.filter(q => q !== o && q !== p && !q.dead && !q.infant && q.age >= 12 && ((o.know[q.id] || 0) >= 10 || isKin(o, q))).sort((a, b) => (o.know[b.id] || 0) - (o.know[a.id] || 0)).slice(0, 6);
  const back = () => ({ say: anyOf(['Hm?', 'What else?', 'Go on.']), opts: menu() });
  const trust = () => Math.max(0.2, Math.min(1, 0.55 + (o.aff[p.id] || 0) / 120));
  const fakeEv = (who, kind, tags, sev, text) => { const ev: any = lfEmit(kind, { actor: who, sev, tags, fake: true, witnessIds: [], chron: false, text }); ev.liar = p.id; ev.know = [p.id]; delete (who.kn || {})[ev.id]; (p.kn || (p.kn = {}))[ev.id] = { t: game.time, from: null, cert: 1, a: true, mine: true, liar: true }; return ev; };
  const menu = () => {
    const m = [];
    m.push(['Heard any news?', () => { const pk = lf2PickTale(o, p); if (!pk) return { say: anyOf(['Nothing worth repeating.', 'Quiet lately. Suspiciously quiet.']), opts: menu() }; lf2Tell(o, p, pk.ev, pk.reveal, true); const k = o.kn[pk.ev.id]; const txt = k.a ? pk.ev.text : (pk.ev.anonText || pk.ev.text); return { say: (pk.reveal ? `You know about that? It was ${lf2By(pk.ev.actor).first}.` : anyOf(['Well, ', 'Between us, ', 'Word is ']) + lf2Low(txt) + '.') + (k.from ? ` ${byId(k.from) ? byId(k.from).first : 'Someone'} told me.` : k.mine ? '' : ' I saw it myself.'), opts: menu() }; }]);
    const kn = known(); if (kn.length) m.push(['Tell them some news…', () => ({ say: 'Oh? What is it?', opts: kn.map(ev => [lf2Cap(p.kn[ev.id].a ? ev.text : (ev.anonText || ev.text)), () => { const j = lf2Judge(o, ev, p.kn[ev.id].a); lf2Tell(p, o, ev, false, true); return { say: j.v < -0.4 ? anyOf(['That is terrible!', 'No! I had no idea.']) : j.v > 0.4 ? 'How lovely.' : anyOf(['Really?', 'Well, well.']), opts: menu() }; }]).concat([['Never mind', back]]) })]);
    const ps = people(); if (ps.length) m.push(['Spread a rumour about…', () => ({ say: 'About who?', opts: ps.map(q => [q.first, () => ({ say: `What about ${q.first}?`, opts: [
      [`${q.first} is a thief`, () => { const ev = fakeEv(q, 'rumour', ['theft'], 1, `${q.first} has been stealing from neighbours`); lf2Learn(o, ev, p, 0.7 * trust(), true); return { say: (o.aff[q.id] || 0) > 50 ? `${q.first}? I do not believe it.` : anyOf(['I knew it.', 'Really? I will keep an eye on my things.']), opts: menu() }; }],
      ...(lf2Spouse(q) ? [[`${q.first} is cheating on ${lf2Spouse(q).first}`, () => { const c = anyOf(npcs.filter(x => x !== q && x !== lf2Spouse(q) && !x.dead && x.age >= 17 && x.female !== q.female)) || p; const ev = fakeEv(q, 'rumour', ['romance', 'affair', 'scandal'], 2, `${q.first} has been seeing ${c.first} behind ${lf2Spouse(q).first}'s back`); ev.target = c.id; lf2Learn(o, ev, p, 0.7 * trust(), true); return { say: anyOf(['No! Does ' + lf2Spouse(q).first + ' know?', 'Scandalous.']), opts: menu() }; }]] : []),
      [`${q.first} has been saying nasty things about you`, () => { const ev = fakeEv(q, 'rumour', ['deceit'], 1, `${q.first} has been running ${o.first} down behind their back`); ev.target = o.id; lf2Learn(o, ev, p, 0.75 * trust(), true); if (Math.random() < 0.4 && !lf2Has(o, 'shy')) o.lf2Confront2 = q.id; return { say: anyOf(['Has she now?'.replace('she', q.female ? 'she' : 'he'), 'I will be having words.']), opts: menu() }; }],
      [`${q.first} has a heart of gold`, () => { const ev = fakeEv(q, 'rumour', ['kindness'], 1, `${q.first} has been quietly helping folk who are struggling`); lf2Learn(o, ev, p, 0.7 * trust(), true); return { say: 'That is nice to hear.', opts: menu() }; }],
      ...(lf2Single(q) && lf2Single(o) && q.female !== o.female ? [[`${q.first} fancies you`, () => { lfAff(o, q, 10 * trust()); if ((o.aff[q.id] || 0) > 25 && Math.random() < 0.5) o.crush = q.id; return { say: (o.aff[q.id] || 0) > 30 ? 'Really?! Do you think so?' : 'Oh. Huh.', opts: menu() }; }]] : []),
      ['Never mind', back]] }) ]).concat([['Never mind', back]]) })]);
    m.push(['Pay them a compliment', () => { const ok = (o.aff[p.id] || 0) > -20; lfAff(o, p, ok ? 3 : 1); return { say: ok ? anyOf(['Oh, stop it. (Do not stop.)', 'That is kind of you.']) : 'Flattery will not work on me.', opts: menu() }; }]);
    m.push(['Insult them', () => { lfEmit('insult', { actor: p, target: o, sev: 1, loud: true, tags: ['nuisance', 'embarrass'], chron: false, text: `${p.first} insulted ${o.first} to their face` }); if ((lf2Has(o, 'brave') || lf2Has(o, 'grumpy') || (o.drunk || 0) > 60) && Math.random() < 0.35 && LF2.on('tavern')) { setTimeout(() => lf2Brawl(o, p), 0); return { say: 'Right. That does it!', opts: [] }; } return { say: anyOf(['How dare you.', 'Charming.', 'Get away from me.']), opts: [] }; }]);
    m.push(['Ask for a secret', () => { const sec = Object.keys(o.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && ev.know.length <= 4 && !(p.kn && p.kn[ev.id]) && ev.actor !== p.id && ev.tags.some(t => (LF2_TAGS[t] || {}).spice >= 1.2)).pop();
      if (!sec || (o.aff[p.id] || 0) < 20) return { say: (o.aff[p.id] || 0) < 20 ? 'I hardly know you.' : 'Me? I do not know anything.', opts: menu() };
      lf2Tell(o, p, sec, false, true); return { say: `Keep this to yourself, but ${lf2Low(o.kn[sec.id].a ? sec.text : (sec.anonText || sec.text))}.`, opts: menu() }; }]);
    const dirt = Object.keys(p.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && ev.actor === o.id && p.kn[ev.id].a && !ev.fake && ev.tags.some(t => ['crime', 'affair', 'scandal', 'theft'].includes(t)) && !(o.lf2Paid && o.lf2Paid[ev.id]));
    if (dirt.length) m.push([`"I know what you did…"`, () => { const ev = dirt[dirt.length - 1], ask = Math.max(5, Math.round(o.coin * 0.4)); const pays = (lf2Has(o, 'anxious') || lf2Has(o, 'proud') || ev.tags.includes('affair')) && !lf2Has(o, 'brave') && o.coin >= 5;
      lfAff(o, p, -25); lfEmit('blackmail', { actor: p, target: o, sev: 2, tags: ['deceit', 'crime'], witnessIds: [], chron: false, text: `${p.first} blackmailed ${o.first} over ${lf2Low(ev.text).replace(new RegExp('^' + o.first + ' '), 'how they ')}` });
      if (pays) { o.coin -= ask; p.coin += ask; (o.lf2Paid = o.lf2Paid || {})[ev.id] = 1; return { say: `...How much? Fine. ${ask} denarii. Now leave me alone.`, opts: [] }; }
      if (Math.random() < 0.3) o.lf2Report = { ev: lf2Ev()[lf2Ev().length - 1].id, t: game.time, a: true };
      return { say: anyOf(['Go on, tell everyone. See if I care.', 'You would not dare.', 'Get out of my sight.']), opts: [] }; }]);
    if (town.tavern && lf2InRoom(p, town.tavern) && p.coin >= 3 && o.coin >= 3) { m.push(['Play dice (3d)', () => { const r = lf2Dice(p, o, 3, false); return { say: r ? (r.win === p ? 'Bah! Take it.' : 'Ha! Mine.') : 'I have no money to bet.', opts: menu() }; }]); m.push(['Play dice, and cheat', () => { const r = lf2Dice(p, o, 3, true); return { say: r && r.caught ? 'Those dice are LOADED!' : r ? (r.win === p ? 'Again? You are lucky tonight.' : 'Ha! Mine.') : '...', opts: r && r.caught ? [] : menu() }; }]); }
    if (o.job === 'Guard' && lf2Wanted()[p.id]) m.push(['About that business…', () => { lf2ArrestDialog(o, p); return null; }]);
    if (lf2Single(o) && lf2Single(p) && o.female !== p.female) m.push(['Flirt', () => { const ok = (o.aff[p.id] || 0) > 30; lfAff(o, p, ok ? 5 : -2); if (ok && Math.random() < 0.4) o.crush = p.id; lfEmit('flirt', { actor: p, target: o, sev: 1, tags: ['romance'], chron: false, text: `${p.first} was flirting with ${o.first}` }); return { say: ok ? anyOf(['Oh! Well. Maybe.', '*laughs* You are terrible.']) : anyOf(['I do not think so.', 'Is that supposed to work?']), opts: menu() }; }]);
    if (ps.length) m.push(['Introduce them to someone…', () => ({ say: 'Who?', opts: ps.map(q => [q.first, () => { lfAff(o, q, 6); bumpKnow(o, q, 15); o.lf2Seek = q.id; return { say: `${q.first}? I should talk to them more. Thanks.`, opts: menu() }; }]).concat([['Never mind', back]]) })]);
    return m;
  };
  const m0 = menu(); S.fns = m0.map(x => x[1]);
  return { say: anyOf(['Yes?', 'What is it?', 'Mm?']), opts: m0.map((x, i) => ['c' + i, x[0]]) };
}
/* hearing a rumour that someone ran you down: off to confront them */
LF2.dec.push(function (n) { if (!n.lf2Confront2) return null; const q = byId(n.lf2Confront2); n.lf2Confront2 = null; if (!q || q.dead || q.jail) return null;
  return [goS(() => { const b = besideTile(q.tx, q.ty, null); return b ? { x: b.x, y: b.y, face: { dx: Math.sign(q.tx - b.x), dy: Math.sign(q.ty - b.y) } } : null; }, `Going to have words with ${q.first}`), waitS(4, 'stand', `Having words with ${q.first}`, { nopie: true, onEnd(nn) { if (lfDist(nn, q) > 3) return; say(nn, q, [[nn, anyOf([`I hear you have been talking about me.`, `What have you been saying about me?`])], [q, anyOf(['What? I never said a word!', 'Who told you that?', 'Not this again.'])]]); lfAff(q, nn, -6); lfAff(nn, q, -4); lfEmit('quarrel', { actor: nn, target: q, sev: 1, loud: true, tags: ['nuisance', 'embarrass'], chron: false, text: `${nn.first} and ${q.first} had a row over some gossip` }); } })]; });
LF2.dec.push(function (n) { if (!n.lf2Seek || n.player) return null; const q = byId(n.lf2Seek); n.lf2Seek = null; if (!q || q.dead || q.jail || q.pose === 'sleep') return null;
  return [goS(() => { const b = besideTile(q.tx, q.ty, null); return b ? { x: b.x, y: b.y, face: { dx: Math.sign(q.tx - b.x), dy: Math.sign(q.ty - b.y) } } : null; }, `Going to say hello to ${q.first}`), waitS(8, 'stand', `Getting to know ${q.first}`, { social: true, nopie: true, onEnd(nn) { if (lfDist(nn, q) <= 3) bumpAff(nn, q, 4, 12); } })]; });

/* ---------------- running everything ---------------- */
function lf2Tick() {
  if (!town || !npcs) return;
  for (const f of LF2.tickers) { try { f(); } catch (e) { console.warn('lf2 tick', e); } }
  if ((town.lf2HearthT || 0) < game.time) { town.lf2HearthT = game.time + 120; for (const r of rooms) if (r.kind === 'house' && !r.hearth && !r.dead) lf2PlaceHearth(r); }
}
function lf2Hourly(hr) { const h = hr % 24; for (const f of LF2.hourly) { try { f(h); } catch (e) { console.warn('lf2 hourly', e); } } }
function lf2PreDecide(n, tod) { if (n.player || n.infant) return null; for (const f of LF2.preD) { try { const p = f(n, tod); if (p) return p; } catch (e) { console.warn('preD', e); } } return null; }
function lf2Decide(n, tod) { if (n.player || n.infant) return null; for (const f of LF2.dec) { try { const p = f(n, tod); if (p) return p; } catch (e) { console.warn('dec', e); } } return null; }
function lf2Work0(n, tod) { for (const f of LF2.work) { try { const p = f(n, tod); if (p) return p; } catch (e) { console.warn('work', e); } } return null; }
function lf2Slow(n, p) { if (p && n.toolQ != null && n.toolQ < 15 && LF2.on('economy')) p.forEach(s => { if (s.k === 'wait' && s.act === 'work') s.min = Math.round(s.min * 1.5); }); return p; }
LF2.dec.unshift(lf2CookPlan);
/* guards run when chasing */
LF2.tickers.push(() => { for (const n of npcs) { if (n.job !== 'Guard') continue; if (n.lf2Base == null) n.lf2Base = n.speed; const st = n.plan && n.plan[n.si]; n.speed = n.lf2Base * (st && /Chasing/.test(st.text || n.status || '') || /Chasing/.test(n.status || '') ? 1.2 : 1); } });

/* ---------------- what you see: purse in the HUD, cleanliness in the panel ---------------- */
// @ts-expect-error -- deliberate patch: life2 wraps lifeHud
{ const _hud = lifeHud; lifeHud = function (n) { let s = _hud(n); if (!n) return s; s += '<span>' + Math.floor(n.coin || 0) + ' denarii</span>'; if (n.jail) s += '<span style="color:var(--amber)">In the cells</span>'; else if (LF2.on('law') && lf2Wanted()[n.id]) s += '<span style="color:var(--amber)">Wanted by the watch</span>'; return s; }; }
// @ts-expect-error -- deliberate patch: life2 wraps lifeBars
{ const _bars = lifeBars; lifeBars = function (n) { let s = _bars(n); if (n && n.clean != null && n.bladder !== undefined) s += needBar('Clean', n.clean, true, Math.round(n.clean) + '%'); if (n && LF2_JOBS[n.job]) s += `<p class="sub" style="margin:4px 0 0">Works as the ${esc(LF2_JOBS[n.job].name.toLowerCase())}.</p>`; const k = n ? lf2Known(n).top : []; if (k.length) s += `<p class="sub" style="margin:4px 0 0">Known as ${esc(k.map(x => LF2_REPWORD[x[0]]).join(', '))}.</p>`; if (n && n.jail) s += `<p class="sub" style="margin:4px 0 0;color:var(--amber)">In the cells.</p>`; return s; }; }
{ const _sig = lifeSig; lifeSig = n => _sig(n) + ',' + Math.round((n.clean || 0) / 5) + ',' + !!n.jail + ',' + n.job; }

/* ---------------- the Stories tab ---------------- */
const lf2T = t => { const d = Math.floor(t / 1440) + 1, m = t % 1440; return `Day ${d}, ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`; };
const lf2Nm = id => { const o = byId(id); return o ? o.first : '?'; };
function lf2Stories(force) {
  const box = document.getElementById('storiesPanel'); if (!box || (!force && ((box.closest('.tabpane') || {}) as any).hidden)) return;
  const W2 = lf2Wanted(), wanted = Object.keys(W2).map(id => byId(+id)).filter(Boolean), jailed = npcs.filter(n => n.jail && !n.dead);
  let h = '<h2>Stories</h2><p class="sub">Everything that really happened, newest first. Each villager only knows what they saw or were told, so the same event can be common knowledge, a rumour, or a secret.</p>';
  h += '<h2 class="gap">The watch</h2><ul class="lf2log">';
  h += (wanted.length ? wanted.map(a => `<li><b>Wanted:</b> ${esc(a.first)} — ${esc(lf2Crimes(a).map(e => lf2Low(e.text)).slice(-2).join('; '))}${W2[a.id].seen ? ' · last seen ' + lf2T(W2[a.id].seen.t) : ''}</li>`).join('') : '<li>Nobody is wanted.</li>');
  h += jailed.map(a => `<li><b>In the cells:</b> ${esc(a.first)}, about ${Math.max(0, Math.round((a.jail.until - game.time) / 6) / 10)} h to go</li>`).join('') + '</ul>';
  const shops = ['bakery', 'thermopolium', 'smithy', 'shop'].map(lf2Room).filter(Boolean);
  if (shops.length) { h += '<h2 class="gap">Forum prices</h2><ul class="lf2log">' + shops.map(r => `<li><b>${esc(r.name)}</b>${lf2Server(r) ? '' : ' (nobody serving)'}${r.broken ? ` · <b style="color:var(--amber)">${esc(r.broken.what)} broken</b>` : ''}: ${Object.keys(LF2_SELL[r.kind]).map(g => `${GOODS[g].name} ${lf2Price(r, g)}${LF2_COIN} (${lf2Stock(r)[g] || 0})`).join(', ')}</li>`).join('') + '</ul>'; }
  h += '<h2 class="gap">What happened</h2><ul class="lf2log">';
  const evs = lf2Ev().filter(e => !e.fake || e.know.length).slice(-45).reverse();
  for (const e of evs) {
    const seen = e.witnesses.filter(id => id !== e.target).map(lf2Nm), kn = e.know.filter(id => id !== e.actor).length;
    let sub = e.fake ? `A lie spread by ${esc(lf2Nm(e.liar))}` : seen.length ? 'Seen by ' + esc(seen.slice(0, 4).join(', ')) + (seen.length > 4 ? ` and ${seen.length - 4} more` : '') : e.witnesses.includes(e.target) ? `Only ${esc(lf2Nm(e.target))} was there` : '<b>Nobody saw it</b>';
    if (kn) sub += ` · known to ${kn}`;
    const ch = e.chain.slice(0, 4).map(c => c.reveal ? `${esc(lf2Nm(c.from))} told ${esc(lf2Nm(c.to))} who did it` : `${esc(lf2Nm(c.from))} → ${esc(lf2Nm(c.to))}`);
    if (ch.length) sub += ' · ' + ch.join(', ') + (e.chain.length > 4 ? '…' : '');
    const cause = e.cause ? lf2EvById(e.cause) : null;
    h += `<li><span class="sub">${lf2T(e.t)}</span> ${esc(lf2Cap(e.text))}.<br><span class="sub">${sub}${cause ? ' · after: ' + esc(lf2Low(cause.text)) : ''}${e.effects.length ? ' · ' + esc(e.effects.slice(0, 2).map(x => x.text).join('; ')) : ''}</span></li>`;
  }
  if (!evs.length) h += '<li>Nothing yet. Give it a while (or go and cause some trouble).</li>';
  h += '</ul><h2 class="gap">Switches</h2><p class="sub">Turn whole systems on or off to see what they add.</p><div class="lf2sw">' + Object.keys(LF2.feat).map(k => `<label><input type="checkbox" data-feat="${k}"${LF2.on(k) ? ' checked' : ''}> ${esc(LF2_FEATN[k] || k)}</label>`).join('') + '</div>';
  if (box.dataset.sig !== h) { box.innerHTML = h; box.dataset.sig = h; }
}
(function () {
  const tabs = document.querySelector('[data-tab="town"]'); if (tabs) { const b = document.createElement('button'); b.type = 'button'; b.dataset.tab = 'stories'; b.setAttribute('aria-pressed', 'false'); b.textContent = 'Stories'; tabs.after(b); b.addEventListener('click', () => setTab('stories')); }
  const tp = document.getElementById('tab-town'); if (tp) { const d = document.createElement('div'); d.id = 'tab-stories'; d.className = 'tabpane'; d.hidden = true; d.innerHTML = '<div class="panel" id="storiesPanel"></div>'; tp.after(d); }
  const css = document.createElement('style'); css.textContent = '.lf2sw{display:flex;flex-direction:column;gap:4px;font-size:13px}.lf2sw label{display:flex;gap:6px;align-items:center}.lf2log{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:13px;line-height:1.4}.lf2log li{display:block;border-bottom:1px solid var(--line);padding-bottom:6px}.lf2log .sub{font-size:12px}'; document.head.appendChild(css);
  document.addEventListener('change', e => { const t: any = e.target; if (!t || !t.dataset || !t.dataset.feat) return; LF2.feat[t.dataset.feat] = t.checked; lf2Save(); });
  setInterval(() => { try { if (state && state.tab === 'stories') lf2Stories(false); } catch (e) {} }, 2500);
})();

/* ---------------- Roman names ---------------- */
FIRST_M.splice(0, FIRST_M.length, 'Marcus', 'Gaius', 'Lucius', 'Titus', 'Quintus', 'Decimus', 'Aulus', 'Gnaeus', 'Publius', 'Sextus', 'Servius', 'Tiberius', 'Manius', 'Spurius', 'Numerius', 'Faustus', 'Felix', 'Rufus', 'Silvanus', 'Crispus', 'Varro', 'Brutus', 'Corvus', 'Cato', 'Drusus', 'Paullus', 'Nero', 'Seneca', 'Galba', 'Otho');
FIRST_F.splice(0, FIRST_F.length, 'Livia', 'Prisca', 'Severa', 'Faustina', 'Camilla', 'Lucilla', 'Sabina', 'Agrippina', 'Drusilla', 'Octavia', 'Aemilia', 'Tertia', 'Secunda', 'Paulina', 'Marcella', 'Lucia', 'Gaia', 'Rufina', 'Albina', 'Felicitas', 'Fortunata', 'Vitalia', 'Urbica', 'Junilla', 'Nonna', 'Crispina', 'Galla', 'Vibiana', 'Quinta', 'Saturnina');
SURNAMES.splice(0, SURNAMES.length, 'Aurelius', 'Cornelius', 'Valerius', 'Flavius', 'Claudius', 'Antonius', 'Fabius', 'Tullius', 'Marcius', 'Domitius', 'Junius', 'Caecilius', 'Licinius', 'Sempronius', 'Sergius', 'Pompeius', 'Vibius', 'Horatius', 'Quinctius', 'Petronius', 'Lucretius', 'Plautius', 'Calpurnius', 'Hortensius', 'Sulpicius', 'Furius', 'Manlius', 'Postumius', 'Septimius', 'Terentius');

