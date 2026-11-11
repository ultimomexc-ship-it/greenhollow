/* The journal (L): what you have learned, with where it came from and how sure it is. It is your own memory (`n.tmem` of the villager you steer), so it is what the conversation
   menu draws from: news you can pass on, what people told you about each other, prices you were given, and how people say they are. */

let JOURNAL_ON = false;
function jrText(m: any): string {
  const p = game.player; const who = (id: any) => { const o = id != null ? byId(id) : null; return o ? o.first : 'someone'; };
  if (m.kind === 'opinion') { const a = byId(m.about); return a ? who(m.from) + ' on ' + a.first + ': ' + ({ fond: 'fond of them', like: 'likes them', neutral: 'no strong view', wary: 'wary of them', dislike: "can't stand them" } as any)[m.word] + (m.reason ? '. ' + m.reason : '') : ''; }
  if (m.kind === 'price') { const g = (GOODS as any)[m.item]; return who(m.from) + ' says ' + (g ? g.name : m.item) + ' costs about ' + lxMoney(m.unit) + ' each'; }
  if (m.kind === 'told_life') { const o = byId(m.with); return o ? o.first + ' has been: ' + ((LIFE_TROUBLE as any)[m.lk] || m.lk.replace(/_/g, ' ')) : ''; }
  if (m.ev != null && m.kind !== 'life') { const ev = lf2Ev().find((q: any) => q.id === m.ev); if (!ev) return ''; return TE.text(ev, m.ver).replace(/^./, (c: string) => c.toUpperCase()) + (m.kind === 'saw' ? ' (you saw it)' : m.kind === 'felt' ? ' (it happened to you)' : m.kind === 'overheard' ? ' (overheard)' : m.kind === 'told' ? ' (' + who(m.from) + ' told you' + (m.conf < 0.5 ? ', not sure' : '') + ')' : ''); }
  return '';
}
function jrHTML(): string {
  const p = game.player; if (!p) return '<i>Nobody to remember for.</i>';
  const rows = (p.tmem || []).filter((m: any) => ['opinion', 'price', 'told_life'].includes(m.kind) || (m.ev != null && m.kind !== 'life' && m.kind !== 'did')).slice(-40).reverse().map((m: any) => ({ m, t: jrText(m) })).filter((r: any) => r.t);
  const groups: any = { 'The news': rows.filter((r: any) => r.m.ev != null), 'What people say about each other': rows.filter((r: any) => r.m.kind === 'opinion'), 'Prices': rows.filter((r: any) => r.m.kind === 'price'), 'How people are': rows.filter((r: any) => r.m.kind === 'told_life') };
  const out = Object.keys(groups).filter(k => groups[k].length).map(k => `<div class="vch">${k}</div><ul>${groups[k].slice(0, 8).map((r: any) => `<li>${esc(r.t)} <span class="dim">· ${stamp(r.m.t)}</span></li>`).join('')}</ul>`).join('');
  return out || '<p class="dim">Nothing yet. Talk to people: ask them for news, what they think of someone, what things cost.</p>';
}
(function () {
  const stage = canvas.parentNode as any; if (!stage) return;
  const box = document.createElement('div'); box.id = 'jrbox'; box.className = 'vcbox jrbox'; box.hidden = true; stage.appendChild(box);
  const draw = () => { if (!JOURNAL_ON || !town) { box.hidden = true; return; } box.hidden = false; const h = `<div class="vccard"><button type="button" class="reqx" data-jr="x" title="Close (L)">×</button><b>What you know</b>${jrHTML()}</div>`; if (box.innerHTML !== h) box.innerHTML = h; };
  box.addEventListener('click', (e: any) => { if (e.target.closest('[data-jr]')) { JOURNAL_ON = false; draw(); } });
  window.addEventListener('keydown', (e: any) => { if ((e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '') && town && !(typeof talkUI !== 'undefined' && talkUI.o)) { JOURNAL_ON = !JOURNAL_ON; draw(); } });
  setInterval(() => { try { if (JOURNAL_ON) draw(); } catch (e) {} }, 1000);
})();
