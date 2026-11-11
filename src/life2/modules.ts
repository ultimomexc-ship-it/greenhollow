/* World modules: switch whole parts of the game on and off (docs/world-modules.md). A module is one job, shop, event or system, so a world can be built and balanced one piece at a time
   ("a world of only farmers", "just mining", "no weddings"). `modOn(id)` is what the game asks; a module is on when it is not switched off and everything it needs is on.
   Ids: job.<Agenda or Job> (job.Farmer, job.Miner, job.Baker ...), gath.<kind> (gath.fishing, gath.songs ...), event.wedding / event.funeral / event.birthday, sys.<LF2 feature> (sys.romance ...), talk.<kind>.
   The panel is on J. The choice is kept with the island (`town.modsOff`). */

const MODS: any = { defs: {} as any, g: {} as any };
/** what is switched off lives with the island (`town.modsOff`), so every island keeps its own recipe */
const modsOff = (): any => (typeof town !== 'undefined' && town) ? (town.modsOff || (town.modsOff = {})) : MODS.g;
MODS.define = (id: string, label: string, kind: string, needs?: string[]) => { MODS.defs[id] = { id, label, kind, needs: needs || [] }; };
const modOn = (id: string): boolean => {
  if (modsOff()[id]) return false; const d = MODS.defs[id]; if (d) for (const q of d.needs) if (!modOn(q)) return false;
  return true;
};
MODS.set = (id: string, on: boolean) => { if (on) delete modsOff()[id]; else modsOff()[id] = true; MODS.apply(id); };
/** the game's own flags follow the switches (LF2 features and talk kinds) */
MODS.apply = (id: string) => { const off = !!modsOff()[id]; if (id.startsWith('sys.')) LF2.feat[id.slice(4)] = !off; if (id.startsWith('talk.') && typeof TALK !== 'undefined') TALK.on[id.slice(5)] = !off; };
MODS.sync = () => { for (const k of Object.keys(MODS.defs)) if (k.startsWith('sys.') || k.startsWith('talk.')) MODS.apply(k); };
/** a world recipe: everything off except what is listed (and what those need) */
MODS.only = (ids: string[]) => { const keep = new Set<string>(); const add = (i: string) => { if (keep.has(i)) return; keep.add(i); const d = MODS.defs[i]; if (d) d.needs.forEach(add); }; ids.forEach(add); for (const k of Object.keys(MODS.defs)) MODS.set(k, keep.has(k)); };
MODS.all = () => { for (const k of Object.keys(MODS.defs)) MODS.set(k, true); };

/* ---- the definitions ---- */
for (const [j, l] of [['Farmer', 'Farming'], ['Fisher', 'Fishing'], ['Gatherer', 'Gathering'], ['Woodcutter', 'Woodcutting'], ['Miner', 'Mining'], ['Miller', 'Milling']]) MODS.define('job.' + j, l, 'job');
for (const [j, l] of [['Baker', 'Baker'], ['Cook', 'Cook'], ['Smith', 'Smith'], ['Shopkeeper', 'Shopkeeper'], ['Weaver', 'Weaver'], ['Guard', 'Watch'], ['BathKeeper', 'Bath keeper'], ['Carpenter', 'Carpenter'], ['Builder', 'Builders'], ['Labourer', 'Labourers']]) MODS.define('job.' + j, l, 'job');
if (typeof LF_GATH !== 'undefined') for (const k of Object.keys(LF_GATH)) MODS.define('gath.' + k, LF_GATH[k].label.replace(/^an? /, '').replace(/^./, (c: string) => c.toUpperCase()), 'event');
MODS.define('event.wedding', 'Weddings', 'event', ['sys.romance']); MODS.define('event.funeral', 'Funerals', 'event'); MODS.define('event.birthday', 'Coming-of-age parties', 'event');
for (const k of Object.keys(LF2.feat)) if (k !== 'nightlocks') MODS.define('sys.' + k, (typeof LF2_FEATN !== 'undefined' && LF2_FEATN[k]) || k, 'system');
for (const k of Object.keys(TALK.on)) MODS.define('talk.' + k, 'Talk: ' + k, 'talk');
LF2.hourly.push(() => MODS.sync());

/* ---- the panel (J): modules by kind, with a switch each; a switched-off need shows its dependants greyed ---- */
(function () {
  const stage = canvas.parentNode as any; if (!stage) return;
  const box = document.createElement('div'); box.id = 'modbox'; box.className = 'modbox'; box.hidden = true; stage.appendChild(box);
  const draw = () => {
    const kinds = ['job', 'event', 'system', 'talk']; const names: any = { job: 'Jobs', event: 'Events', system: 'Systems', talk: 'Talk' };
    box.innerHTML = `<div class="modcard"><button type="button" class="reqx" data-mod="x" title="Close (J)">×</button><b>World modules</b> <span class="dim">switch a part of the game off to test the rest</span><div class="modbtns"><button type="button" data-mod="all">All on</button><button type="button" data-mod="farm">Only farming</button><select data-pack title="The voice of the island's talk">${['plain', 'island'].map(p => `<option value="${p}"${(town.pack || 'plain') === p ? ' selected' : ''}>Voice: ${p}</option>`).join('')}</select></div>` +
      kinds.map(k => `<div class="modh">${names[k]}</div><div class="modgrid">` + Object.keys(MODS.defs).filter(i => MODS.defs[i].kind === k).map(i => { const d = MODS.defs[i], on = !modsOff()[i], eff = modOn(i); return `<label class="${eff ? '' : 'dim'}"><input type="checkbox" data-mid="${i}"${on ? ' checked' : ''}> ${d.label}${on && !eff ? ' (needs something off)' : ''}</label>`; }).join('') + `</div>`).join('') + `</div>`;
  };
  box.addEventListener('click', (e: any) => { const b = e.target.closest('[data-mod]'); if (!b) return; if (b.dataset.mod === 'x') box.hidden = true; else if (b.dataset.mod === 'all') { MODS.all(); draw(); } else if (b.dataset.mod === 'farm') { MODS.only(['job.Farmer', 'sys.economy', 'talk.ritual', 'talk.small', 'talk.life', 'talk.world']); draw(); } });
  box.addEventListener('change', (e: any) => { const t = e.target; if (t && t.dataset && t.dataset.pack !== undefined) { town.pack = t.value; return; } if (t && t.dataset && t.dataset.mid) { MODS.set(t.dataset.mid, t.checked); draw(); } });
  window.addEventListener('keydown', (e: any) => { if ((e.key === 'j' || e.key === 'J') && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '') && town) { box.hidden = !box.hidden; if (!box.hidden) draw(); } });
})();
