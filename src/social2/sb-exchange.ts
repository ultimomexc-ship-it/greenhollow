/* ================= social2 / sb-exchange: villagers talking to each other, with consequences =================
   Every few game minutes, anybody who is awake and free and has somebody near them (in the same room, at work, in the street, at the
   tavern) may have a short exchange with them. What they talk about depends on who they are, how they feel about each other, what they
   know and what is going on in their lives:
     small talk · news (gossip, which can change on the way) · venting about somebody · praising somebody · consoling · shop talk ·
     family talk (which can turn into a row) · arguing · courting · asking for a loan · paying one back · confiding a secret · letting one slip
   Each exchange changes what they know, how they feel (with a reason), and sometimes makes a new event others can hear about.
   No words are produced unless the player is close enough to overhear; the pre-simulation (sb-presim.ts) runs the same exchanges.     */
const SB: any = { presim: false, pair: new Map(), count: {} };
const sbPairKey = (a, b) => Math.min(a.id, b.id) * 100000 + Math.max(a.id, b.id);
const sbAdult = n => n && !n.dead && !n.infant && n.age >= 14;
const sbHas = (n, t) => lf2Has(n, t) ? 1 : 0;
function sbSocial(a) { return (1 + 0.4 * (sbHas(a, 'sociable') + sbHas(a, 'jovial')) + 0.3 * sbHas(a, 'gossipy') - 0.4 * sbHas(a, 'shy') - 0.2 * sbHas(a, 'homebody')) * ((a.drunk || 0) > 40 ? 1.4 : 1) * (a.mood < 25 ? 0.8 : 1); }
function sbFree(n) { return !n.dead && !n.infant && n.age >= 6 && n.pose !== 'sleep' && !n.player && !n.trapped && !(typeof talkUI !== 'undefined' && talkUI.o === n) && !(n.ill && n.ill.until > game.time && n.pose === 'sleep'); }
const sbNear = (a, b) => typeof game !== 'undefined' && game.player && !SB.presim && (lfDist(a, game.player) <= 10 || lfDist(b, game.player) <= 10);
function sbNote(o, w, ty, about) { const L = o.sbConv || (o.sbConv = []); L.push({ w: w.id, ty, about: about ? about.id || about : null, t: game.time }); if (L.length > 16) L.shift(); }
/** how well two people rub along (-1..1): shared traits and hobbies, a few classic clashes, and a fixed chemistry of their own */
const SB_CLASH = [['grumpy', 'cheerful'], ['grumpy', 'jovial'], ['proud', 'proud'], ['gossipy', 'shy'], ['gossipy', 'homebody'], ['lazy', 'early bird'], ['devout', 'jovial'], ['anxious', 'brave'], ['greedy', 'generous'], ['proud', 'grumpy']];
function sbCompat(a, b) {
  const key = Math.min(a.id, b.id) + ':' + Math.max(a.id, b.id); a.sbChem = a.sbChem || {}; if (a.sbChem[key] !== undefined) return a.sbChem[key];
  let x = (cvHashStr((town.seed || 'x') + ':chem:' + key) % 1000) / 1000 - 0.5;                       // their own chemistry, -0.5..0.5
  for (const t of a.traits || []) if ((b.traits || []).includes(t)) x += 0.18;
  for (const [p, q] of SB_CLASH) if ((lf2Has(a, p) && lf2Has(b, q)) || (lf2Has(a, q) && lf2Has(b, p))) x -= 0.35;
  if (a.hobby && a.hobby === b.hobby) x += 0.2; if (a.job && a.job === b.job) x += 0.1;
  x = Math.max(-1, Math.min(1, x)); a.sbChem[key] = x; (b.sbChem = b.sbChem || {})[key] = x; return x;
}
/** a little time together: chemistry decides which way it goes; the closer they already are, the less one chat moves it */
function sbTogether(a, b, why) { const c = sbCompat(a, b); for (const [x, y] of [[a, b], [b, a]]) { const warm = 1 + 0.35 * (sbHas(x, 'cheerful') + sbHas(x, 'sociable') + sbHas(x, 'generous')) - 0.3 * (sbHas(x, 'grumpy') + sbHas(x, 'proud')), cur = x.aff[y.id] || 0;
  let d = c * (c < 0 ? 6.5 : 2.6) + (Math.random() - 0.5) * 0.8; d *= d > 0 ? warm : 2 - Math.min(1.6, warm); d *= 1 - Math.min(0.9, Math.abs(cur) / 110); if (d > 0) { const g = sbTopWhy(x, y, -1); if (g && g.v < -8) d *= 0.25; } lfAff(x, y, d, d >= 0 ? why : 'rubs me up the wrong way'); } }
function sbStress(a) { return (a.coin < 3 ? 1 : 0) + (a.hunger > 65 ? 1 : 0) + (a.mood < 30 ? 1 : 0) + (a.ill && a.ill.until > game.time ? 1 : 0) + (npcs.some(k => k.ill && k.ill.until > game.time && isKin(a, k)) ? 1 : 0); }
/* somebody they have a grievance with (and the reason), or somebody they admire */
function sbGrievance(a, b) { let best = null, bw = 12; for (const q of npcs) { if (q === a || q === b || q.dead || q.infant) continue; const w = -(a.aff[q.id] || 0) + (sbTopWhy(a, q, -1) ? 12 : 0); if (w > bw) { bw = w; best = q; } } return best; }
function sbAdmired(a, b) { let best = null, bw = 50; for (const q of npcs) { if (q === a || q === b || q.dead || q.infant) continue; const w = (a.aff[q.id] || 0) + Math.random() * 10; if (w > bw) { bw = w; best = q; } } return best; }
function sbDisagree(a, b) {   // they feel very differently about somebody
  for (const q of npcs) { if (q === a || q === b || q.dead) continue; const x = a.aff[q.id] || 0, y = b.aff[q.id] || 0; if ((x > 45 && y < -30) || (x < -30 && y > 45)) return q; } return null; }
function sbLoanBetween(a, b) { return (town.sbLoans || []).find(l => l.state !== 'paid' && ((l.from === a.id && l.to === b.id) || (l.from === b.id && l.to === a.id))); }
/** witnesses: in the live game, whoever is near (undefined lets lfEmit look); in the pre-simulation, whoever was in the same place */
const sbW = () => SB.presim ? ((SB.ctx && SB.ctx.witnesses) || []) : undefined;

/* the words for each exchange, when the player is close enough to hear them, are in sb-voice.ts (sbSayIfNear, sbSmallIfNear) */
/* ---------------- the kinds of exchange ---------------- */
const SBX: any = {
  small: { u: () => 1, run(a, b) { sbTogether(a, b, 'time together'); bumpKnow(a, b, 1); if (sbCompat(a, b) < -0.35 && Math.random() < 0.18) return SBX.argue.run(a, b); sbSmallIfNear(a, b); return 'small'; } },
  news: { u(a, b) { const pk = lf2PickTale(a, b); if (!pk) return 0; a._pk = pk; return 2 * (1 + 0.6 * sbHas(a, 'gossipy')); }, run(a, b) { lf2Tell(a, b, a._pk.ev, a._pk.reveal, !sbNear(a, b)); return 'news'; } },
  vent: { u(a, b) { const q = sbGrievance(a, b); if (!q) return 0; a._q = q; return 1.3 * (1 + 0.4 * (sbHas(a, 'grumpy') + sbHas(a, 'proud'))) * ((b.aff[q.id] || 0) > 50 ? 0.3 : 1); },
    run(a, b) { const q = a._q, top = sbTopWhy(a, q, -1), why = top ? sbWhyText(a, q, top) : null, tb = Math.max(0, 0.5 + sbTrustOf(b, a) / 200);
      sbRelSet(b, a, q, Math.max(-1, (a.aff[q.id] || 0) / 60), 0.9, top ? top.why : null);
      if ((b.aff[q.id] || 0) > 40) { lfAff(b, a, -2, 'badmouthed a friend'); } else { lfAff(b, q, -2.5 * tb, top ? top.why : 'heard from ' + a.first); lfAff(a, b, 1, 'took my side'); }
      if (top && top.why.startsWith('ev:')) { const ev = lf2EvById(+top.why.slice(3)); if (ev && a.kn && a.kn[ev.id] && !(b.kn && b.kn[ev.id])) lf2Tell(a, b, ev, false, true); }
      if (!a.player) lfMod(a, 'vent' + q.id, `got ${q.first} off my chest to ${b.first}`, 2, 180); sbNote(a, b, 'vent', q); sbNote(b, a, 'vent', q); sbSayIfNear(a, b, 'vent', sbPr(q, { why, defend: (b.aff[q.id] || 0) > 40 })); return 'vent'; } },
  praise: { u(a, b) { const q = sbAdmired(a, b); if (!q) return 0; a._q = q; return 0.5; }, run(a, b) { const q = a._q; sbRelSet(b, a, q, Math.min(1, (a.aff[q.id] || 0) / 60), 0.9, (sbTopWhy(a, q, 1) || {}).why); lfAff(b, q, 1.5 * Math.max(0, 0.5 + sbTrustOf(b, a) / 200), 'heard good of'); sbNote(a, b, 'praise', q); sbNote(b, a, 'praise', q); sbSayIfNear(a, b, 'praise', sbPr(q)); return 'praise'; } },
  console: { u(a, b) { const low = b.mood < 35 || (b.grief || 0) > 0 || (b.ill && b.ill.until > game.time) || sbStress(b) >= 2; return low && (a.aff[b.id] || 0) > -5 ? 1.6 * (1 + 0.4 * (sbHas(a, 'generous') + sbHas(a, 'cheerful'))) : 0; },
    run(a, b) { if (!b.player) lfMod(b, 'comfort' + a.id, `comforted by ${a.first}`, 6, 360); lfAff(b, a, 4, 'comforted me'); sbTrust(b, a, 3); sbNote(a, b, 'console', null); sbNote(b, a, 'console', null);
      lfEmit('comfort', { actor: a, target: b, sev: 1, tags: ['kindness'], witnessIds: sbW(), chron: false, text: `${a.first} sat with ${b.first} when ${cvPron(b).he} was low` }); sbSayIfNear(a, b, 'console', (() => { const lost = b.mourning != null && typeof personById === 'function' ? personById(b.mourning) : null; return { trouble: b.ill && b.ill.until > game.time ? 'ill' : lost ? 'grief' : b.coin < 3 ? 'poor' : b.hunger > 65 ? 'hungry' : 'low', lost: lost ? lost.first : '' }; })()); return 'console'; } },
  shop: { u(a, b) { return a.job && b.job && (LF2_JOBS[a.job] || LF2_JOBS[b.job] || a.job === b.job) ? 0.8 : 0; }, run(a, b) { const same = (a.job || a.cur) === (b.job || b.cur), proud = sbHas(a, 'proud') + sbHas(a, 'greedy') + sbHas(b, 'proud') + sbHas(b, 'greedy');
      if (same && Math.random() < 0.05 + 0.12 * proud) { const [x, y] = Math.random() < 0.5 ? [a, b] : [b, a]; lfAff(x, y, -3, 'competition'); sbResp(y, x, 1); sbNote(a, b, 'rivalry', null); sbNote(b, a, 'rivalry', null); sbSayIfNear(x, y, 'rivalry', {}); return 'rivalry'; }
      sbTogether(a, b, 'work'); sbResp(a, b, 1); sbResp(b, a, 1); sbNote(a, b, 'shop', null); sbNote(b, a, 'shop', null); sbSmallIfNear(a, b, 'shop'); return 'shop'; } },
  family: { u(a, b) { return isKin(a, b) || (a.fam && a.fam.spouse === b.id) ? 1.4 : 0; },
    run(a, b) { const st = sbStress(a) + sbStress(b), row = Math.random() < 0.035 + 0.07 * st - 0.025 * (sbHas(a, 'cheerful') + sbHas(b, 'cheerful'));
      if (row) { const [about, why] = a.coin + b.coin < 8 ? ['money', 'about money'] : a.hunger > 60 || b.hunger > 60 ? ['pot', 'over an empty pot'] : npcs.some(k => k.ill && k.ill.until > game.time && (isKin(a, k) || isKin(b, k))) ? ['sick', 'about who would sit up with the sick'] : anyOf([['chores', 'about the chores'], ['nothing', 'about nothing at all, and then about everything'], ['children', 'over the children'], ['mother', 'about her mother'], ['mother', 'about his mother'], ['brokenpot', 'about a broken pot']]);
        lfEmit('quarrel', { actor: a, target: b, sev: 1, loud: st >= 3, tags: ['embarrass'], witnessIds: sbW(), chron: false, text: `${a.first} and ${b.first} had a row${a.fam && a.fam.spouse === b.id ? ' at home' : ''} ${why}` });
        lfAff(a, b, -4, 'row at home'); lfAff(b, a, -4, 'row at home'); sbNote(a, b, 'row', null); sbNote(b, a, 'row', null); sbSayIfNear(a, b, 'row', { about }); return 'row'; }
      sbTogether(a, b, 'family'); lfAff(a, b, 0.6, 'family'); lfAff(b, a, 0.6, 'family'); sbNote(a, b, 'family', null); sbNote(b, a, 'family', null); sbSmallIfNear(a, b, 'family'); return 'family'; } },
  argue: { u(a, b) { const q = sbDisagree(a, b); a._q = q; const hostile = (a.aff[b.id] || 0) < -25 || (sbTopWhy(a, b, -1) && (a.aff[b.id] || 0) < -10); return (q || hostile) ? 0.55 * (1 + 0.5 * (sbHas(a, 'grumpy') + sbHas(a, 'brave'))) * (1 - 0.6 * sbHas(a, 'shy')) : 0; },
    run(a, b) { const q = a._q; lfEmit('quarrel', { actor: a, target: b, sev: 1, loud: true, tags: ['embarrass'], witnessIds: sbW(), chron: false, text: q ? `${a.first} and ${b.first} ${anyOf(['argued about', 'had a row about', 'fell out over'])} ${q.first}` : `${a.first} and ${b.first} ${anyOf(['had words', 'had a shouting match', 'had a proper row', 'nearly came to blows', 'had it out'])} ${(() => { const pl = SB.presim ? '' : placeOf(a); return !pl || pl === 'the lanes' ? anyOf(['in the street', 'in the lane', 'by the well']) : pl === 'the plaza' ? 'on the square' : 'at ' + cvPlace(pl); })()}` });
      lfAff(a, b, -5, 'argument'); lfAff(b, a, -5, 'argument'); sbNote(a, b, 'argue', q); sbNote(b, a, 'argue', q); sbSayIfNear(a, b, 'argue', q ? sbPr(q) : {}); return 'argue'; } },
  court: { u(a, b) { const single = lf2Single(a) && lf2Single(b) && a.female !== b.female && a.age >= 17 && b.age >= 17; return (a.crush === b.id || (single && (a.aff[b.id] || 0) > 35)) ? 1.1 : 0; },
    run(a, b) { lfAff(a, b, 3, 'courting'); const into = (b.aff[a.id] || 0) > 25 || Math.random() < 0.3; lfAff(b, a, into ? 2.5 : -1, into ? 'courting' : 'pestering me');
      a.court = a.court || {}; a.court[b.id] = (a.court[b.id] || 0) + 1; sbNote(a, b, 'court', null); sbNote(b, a, 'court', null); sbSayIfNear(a, b, 'court', { into });
      if (into && a.court[b.id] >= 3 && (b.aff[a.id] || 0) > 40 && !a.sbCourted) { a.sbCourted = b.id; lfEmit('courting', { actor: a, target: b, sev: 1, tags: ['romance'], witnessIds: sbW(), chron: false, text: `${a.first} and ${b.first} were seen walking out together` }); }
      return 'court'; } },
  borrow: { u(a, b) { return (a.coin < 5 || (a.coin < 9 && sbStress(a) >= 2)) && b.coin >= 12 && !sbLoanBetween(a, b) && a.age >= 16 && b.age >= 16 ? 1.5 : 0; },
    run(a, b) { const yes = (b.aff[a.id] || 0) > 10 && sbTrustOf(b, a) > -15 && (lf2Has(b, 'generous') || Math.random() < 0.6) && !lf2Has(b, 'greedy');
      if (!yes) { lfAff(a, b, -3, 'refused a loan'); sbNote(a, b, 'refused', null); sbNote(b, a, 'asked', null); sbSayIfNear(a, b, 'refuse', {}); return 'refused'; }
      const amt = Math.max(3, Math.min(12, Math.floor(b.coin * 0.3))); b.coin -= amt; a.coin += amt; const L = town.sbLoans || (town.sbLoans = []);
      const loan = { id: L.length + 1, from: b.id, to: a.id, amt, t: game.time, due: game.time + (3 + Math.floor(Math.random() * 4)) * 1440, state: 'open' }; L.push(loan);
      lfEmit('loan', { actor: b, target: a, sev: 1, tags: ['generous'], witnessIds: [], chron: false, text: `${b.first} lent ${a.first} ${amt} denarii` }); lfAff(a, b, 4, 'lent me money'); sbNote(a, b, 'borrow', null); sbNote(b, a, 'lend', null); sbSayIfNear(a, b, 'borrow', { amt }); return 'loan'; } },
  repay: { u(a, b) { const l = sbLoanBetween(a, b); return l && l.to === a.id && a.coin >= l.amt + (lf2Has(a, 'greedy') ? 6 : 0) ? 4 : 0; },
    run(a, b) { const l = sbLoanBetween(a, b); a.coin -= l.amt; b.coin += l.amt; const late = l.state === 'late'; l.state = 'paid';
      sbTrust(b, a, late ? 6 : 12, 'paid me back'); lfAff(b, a, late ? 3 : 5, 'paid me back'); lfEmit('repaid', { actor: a, target: b, sev: 1, tags: ['honest'], witnessIds: [], chron: false, text: `${a.first} paid back the ${l.amt} denarii ${cvPron(a).he} owed ${b.first}` });
      sbNote(a, b, 'repay', null); sbNote(b, a, 'repaid', null); sbSayIfNear(a, b, 'repay', { amt: l.amt, late }); return 'repay'; } },
  confide: { u(a, b) { const L = cvLife(a); return L.secret && !L.secretKnownBy.includes(b.id) && (a.aff[b.id] || 0) > 50 && sbTrustOf(a, b) > 15 ? 0.7 : 0; },
    run(a, b) { cvLife(a).secretKnownBy.push(b.id); sbTrust(a, b, 3); lfAff(b, a, 3, 'confided'); lfAff(a, b, 2, 'confided'); sbNote(a, b, 'confide', a); sbNote(b, a, 'confided', a); sbSayIfNear(a, b, 'confide', {}); return 'confide'; } },
  leak: { u(a, b) { if (!lf2Has(a, 'gossipy') && (a.drunk || 0) < 40) return 0; const s = npcs.find(q => q !== a && q !== b && !q.dead && q.cvLife && q.cvLife.secret && q.cvLife.secretKnownBy.includes(a.id) && !q.cvLife.secretOut && (a.aff[q.id] || 0) < 30); a._s = s; return s ? 0.6 : 0; },
    run(a, b) { const q = a._s, L = q.cvLife; const ev = lfEmit('secret', { actor: q, sev: 1, tags: ['scandal'], witnessIds: [], chron: false, text: `${q.first} ${cvThird(L.secret.text, q)}` }); L.secretOut = ev.id; delete (q.kn || {})[ev.id];
      (a.kn || (a.kn = {}))[ev.id] = { t: game.time, from: null, cert: 0.9, a: true, imp: 0.6 }; lf2Tell(a, b, ev, false, true); sbTrust(q, a, -20); sbNote(a, b, 'leak', q); sbNote(b, a, 'heard secret', q); sbSayIfNear(a, b, 'leak', sbPr(q, { secret: cvThird(L.secret.text, q) })); return 'leak'; } },
};
/** one exchange between a and b; returns what kind it was */
function sbExchange(a, b, ctx?) {
  SB.ctx = ctx || null; let tot = 0; const ws: [string, number][] = [];
  for (const k in SBX) { let u = 0; try { u = SBX[k].u(a, b); } catch (e) { u = 0; } if (u > 0) { ws.push([k, u]); tot += u; } }
  let r = Math.random() * tot, kind = 'small'; for (const [k, u] of ws) { r -= u; if (r <= 0) { kind = k; break; } }
  let res = 'small'; try { res = SBX[kind].run(a, b); } catch (e) { console.warn('exchange', kind, e && e.message); }
  SB.pair.set(sbPairKey(a, b), game.time); SB.count[res] = (SB.count[res] || 0) + 1; SB.ctx = null; return res;
}

/* ---------------- in the live game: who meets whom ---------------- */
function sbPartnerW(a, b) { const f = a.aff[b.id] || 0; return (1 + Math.max(0, f) / 40 + (isKin(a, b) ? 0.8 : 0) + (a.fam && a.fam.spouse === b.id ? 1 : 0) + (a.job && a.job === b.job ? 0.4 : 0)) * (f < -30 ? 0.5 : 1); }
function sbTick() {
  if (SB.presim) return;
  const live = npcs.filter(sbFree);
  for (const a of live) {
    if ((a.sbNext || 0) > game.time) continue; a.sbNext = game.time + (20 + Math.random() * 40) / sbSocial(a);
    let best = null, bw = 0;
    for (const b of live) { if (b === a || lfDist(a, b) > 4 || (b.sbBusy || 0) > game.time) continue; const last = SB.pair.get(sbPairKey(a, b)); if (last !== undefined && game.time - last < 90) continue;
      if (seeThrough(a.tx, a.ty, b.tx, b.ty) < 0.5) continue; const w = sbPartnerW(a, b) * (0.5 + Math.random()); if (w > bw) { bw = w; best = b; } }
    if (!best || Math.random() > 0.6 * sbSocial(a)) continue;
    a.sbBusy = best.sbBusy = game.time + 4; sbExchange(a, best, null);
  }
}
LF2.tickers.push(sbTick);

/* ---------------- once a day: loans fall due, knowledge fades ---------------- */
function sbDaily() {
  for (const l of town.sbLoans || []) { if (l.state === 'paid') continue; const a = byId(l.to), b = byId(l.from); if (!a || !b || a.dead || b.dead) continue;
    if (a.coin >= l.amt && !lf2Has(a, 'greedy') && Math.random() < (lf2Has(a, 'devout') || lf2Has(a, 'proud') ? 0.6 : 0.35)) SBX.repay.run(a, b); }
  for (const l of town.sbLoans || []) { if (l.state === 'paid') continue; const a = byId(l.to), b = byId(l.from); if (!a || !b || a.dead || b.dead) { l.state = 'paid'; continue; }
    if (game.time > l.due && (l.state === 'open' || game.time - (l.lastLate || 0) > 2 * 1440)) { l.state = 'late'; l.lastLate = game.time; sbTrust(b, a, -12, 'unpaid loan'); lfAff(b, a, -6, 'unpaid loan');
      if (!l.told) { l.told = 1; const ev = lfEmit('default', { actor: a, target: b, sev: 1, tags: ['debt'], witnessIds: [], chron: false, text: `${a.first} has not paid back the ${l.amt} denarii ${cvPron(a).he} owes ${b.first}` }); lf2Learn(b, ev, null, 1, true); } } }
  for (const ev of lf2Ev()) { if (ev.kind !== 'courting' && ev.kind !== 'flirt' && ev.kind !== 'tryst') continue; if (game.time - ev.t > 20 * 1440) continue;
    for (const c of npcs) { if (c.dead || c.id === ev.actor || c.id === ev.target || !c.kn || !c.kn[ev.id] || c.kn[ev.id].jel) continue; const keen = c.crush === ev.target || ((c.aff[ev.target] || 0) > 55 && lf2Single(c) && !isKin(c, lf2By(ev.target) || c));
      if (!keen) continue; c.kn[ev.id].jel = 1; const rival = lf2By(ev.actor); if (rival) { lfAff(c, rival, -10, 'jealous'); if (!c.player) lfMod(c, 'jel' + rival.id, `${rival.first} is after ${(lf2By(ev.target) || {}).first || 'them'}`, -5, 1440 * 2); } } }
  for (const n of npcs) if (!n.dead && n.kn) sbTrim(n);
}
LF2.hourly.push(h => { if (h === 3) sbDaily(); });
