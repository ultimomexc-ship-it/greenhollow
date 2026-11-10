/* Building materials. On a blank island you start with a small kit of blocks and furniture (the two guide buildings and a little more); everything you take down comes back to it,
   so nobody gets stuck. More is made by the carpenter from wood (and stone for the hearth things): see life2/carpenter.ts. The ready village keeps unlimited building. */

const KIT_START: Record<string, number> = { bwall: 40, bdoor: 3, bwindow: 2, bed: 3, toilet: 1, chair: 2, table: 1, shelf: 1, stair: 1, stairdown: 1 };
/** what the carpenter needs for each thing, and how many it makes */
const KIT_RECIPE: Record<string, { wood?: number; stone?: number; q: number }> = {
  bwall: { wood: 2, q: 4 }, bwindow: { wood: 2, q: 2 }, bdoor: { wood: 2, q: 1 }, bed: { wood: 4, q: 1 }, chair: { wood: 2, q: 1 }, table: { wood: 3, q: 1 }, barrel: { wood: 3, q: 1 }, counter: { wood: 4, q: 1 },
  shelf: { wood: 3, q: 1 }, pew: { wood: 3, q: 1 }, loom: { wood: 6, q: 1 }, lamp: { wood: 2, q: 1 }, tent: { wood: 4, q: 1 }, campfire: { wood: 2, q: 1 }, toilet: { wood: 3, q: 1 }, stair: { wood: 6, q: 1 }, stairdown: { wood: 6, q: 1 },
  altar: { stone: 4, q: 1 }, oven: { stone: 6, q: 1 }, forge: { stone: 6, wood: 2, q: 1 }, anvil: { stone: 4, q: 1 },
};
const kitOn = () => !!(town && town.scenario === 'blank');
function kitStart() { if (kitOn() && !town.kit) town.kit = Object.assign({}, KIT_START); }
const kitCount = (kind: string) => { kitStart(); return kitOn() ? ((town.kit || {})[kind] || 0) : 999; };
const kitHas = (kind: string) => kind === 'field' || !kitOn() || kitCount(kind) > 0;
function kitTake(kind: string) { if (!kitOn() || kind === 'field') return; kitStart(); town.kit[kind] = Math.max(0, (town.kit[kind] || 0) - 1); }
function kitGive(kind: string, q = 1) { if (!kitOn() || !kind || kind === 'field') return; if (!(kind in KIT_RECIPE) && !(kind in KIT_START) && kind !== 'bench') return; kitStart(); town.kit[kind] = (town.kit[kind] || 0) + q; }
const kitLabel = (kind: string) => kitOn() && kind !== 'field' ? String(kitCount(kind)) : '∞';
function kitOut(n: any, kind: string) {
  const ws = typeof lf2Room === 'function' ? lf2Room('workshop') : null, has = town.tut && town.tut.carpenter;
  playerSay(n, 'No ' + (typeof itBuildName === 'function' ? itBuildName(kind).toLowerCase() : kind) + ' left. ' + (ws ? 'Bring wood to the carpenter, or take something down: it comes back.' : has ? 'Set up the workshop so the carpenter can make more, or take something down: it comes back.' : 'Take something down and it comes back to you.'));
}
