/* The request on the screen: a small pill at the top left that opens into a card with what the island needs next, and the balance in three lines.
   Everything the player needs is on the canvas (the side panels are not there in the full-screen game). Click it, or press N, to open and close it. */

let REQ_OPEN = false; try { REQ_OPEN = localStorage.getItem('gh.req') === '1'; } catch (e) {}
(function () {
  const stage = canvas.parentNode as any; if (!stage) return;
  const box = document.createElement('div'); box.id = 'reqbox'; box.className = 'reqbox'; box.hidden = true; stage.appendChild(box);
  let sig = '';
  function draw() {
    if (!town || typeof islandNeeds !== 'function') { box.hidden = true; return; }
    const n = islandNeeds(); if (typeof guidesUpdate === 'function') guidesUpdate(n); const cur = n[0], B = townBalance(), open = REQ_OPEN;
    const s = (cur ? cur.id + cur.say : 'ok') + '|' + open + '|' + B.pop + '|' + B.beds + '|' + B.privies + '|' + B.plots + '|' + Math.round(B.stock / 5);
    box.hidden = false; if (s === sig) return; sig = s;
    const mark = (have, need) => have >= need ? '<span class="ok">✓</span>' : '<b>' + have + '/' + need + '</b>';
    if (!open) { box.innerHTML = cur ? `<button type="button" class="reqpill${cur.hard ? ' hard' : ''}" data-req="1" title="What the island needs (N)">● ${esc(cur.title)}</button>` : `<button type="button" class="reqpill ok" data-req="1" title="What the island needs (N)">● In balance</button>`; return; }
    box.innerHTML = `<div class="reqcard"><button type="button" class="reqx" data-req="1" title="Close (N)">×</button>` + (cur ? `<b>${esc(cur.title)}</b>${cur.who.length ? ' <span class="dim">· ' + esc(cur.who.slice(0, 3).join(', ')) + '</span>' : ''}<br>“${esc(cur.say)}”<br><span class="dim">${esc(cur.how)}</span>` : '<b>Everything is in balance.</b>') +
      `<div class="reqrows"><span>Beds ${mark(B.beds, B.bedsNeeded)}</span>${B.pop > 1 ? `<span>Privies ${mark(B.privies, B.priviesNeeded)}</span><span>Field plots ${mark(B.plots, B.plotsNeeded)}</span>` : ''}<span>Food ${B.stockDays.toFixed(1)} days</span></div>` + (n.length > 1 ? `<div class="dim reqthen">Then: ${esc(n.slice(1, 3).map(x => x.title).join(' · '))}</div>` : '') + '</div>';
  }
  box.addEventListener('click', (e: any) => { if (e.target.closest('[data-req]')) { REQ_OPEN = !REQ_OPEN; try { localStorage.setItem('gh.req', REQ_OPEN ? '1' : '0'); } catch (err) {} sig = ''; draw(); canvas.focus({ preventScroll: true }); } });
  window.addEventListener('keydown', (e: any) => { if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '') && town) { REQ_OPEN = !REQ_OPEN; try { localStorage.setItem('gh.req', REQ_OPEN ? '1' : '0'); } catch (err) {} sig = ''; draw(); } });
  setInterval(() => { try { draw(); } catch (e) {} }, 800);
})();
