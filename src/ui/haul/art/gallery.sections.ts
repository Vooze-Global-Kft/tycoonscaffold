/**
 * Every piece of the art kit and its variants, as gallery sections (see gallery.draw.ts).
 */
import type { Section } from './gallery.draw';
import { ORE_IDS, RARITY, SPACE } from './palette';
import { fill } from './pen';
import { drawText } from './glyphs';
import { CONDITIONS, SCHEMATIC_SOCKETS, drawConditionPreview, drawDishRelay, drawNodeRing, drawReceiptStamp, drawStarCore, drawStationSchematic, schematicSockets, type NodeState } from './spokes.draw';
import { POD_TIERS, drawPod, drawRarityLight } from './pods.draw';
import { CARTRIDGE_H, CARTRIDGE_W, MODULES, drawCartridge } from './modules.draw';
import { BUYERS, drawBuyer, drawDispatch, drawOps, drawTally } from './portraits.draw';
import { HAUL_ICONS } from './icons';
import { drawGuide, drawReticle } from './reticle.draw';
import { atlasDefs } from './atlas';
import { RAIL_GLYPHS, drawRailButton } from './icons.draw';
import { FIRST_FOUR_PARTS, RACK_CRADLES, RACK_OVERFLOW, STAR_NODES, STATION_PARTS, STATION_PART_NAMES, drawBeacon, drawNodePart, drawNodePartShape, drawPartShape, drawRackOverflow, drawScannerDish, drawStation, drawStationPart } from './station.draw';
import { HULL_NAMES, LOADED_FREIGHTER_SCALE, drawAwayArc, drawChevron, drawChevronStack, drawFreighter, drawFreighterFlame, drawPad, drawPolicyChip, drawWarpFlash, freighterSize, type HullId } from './freighter.draw';
import { drawChargePlate, drawCreditGlyph, drawDragLine, drawFlare, drawFlareTrail, drawGhostSlot, drawHoldTank, drawRingGuides, drawRoute, drawRouteChip, drawSeamGuide, drawSeamRim, drawStarfield } from './fx.draw';
import { DRONE_BOX, drawDrone, drawIdleBadge, drawThrusterFlame } from './drone.draw';
import { RIG_LOOKS, drawDrillHead, drawRig, drawRigBase, type RigLook } from './rig.draw';
import { ROCK_SHAPES, drawChunk, drawDryRock, drawDryGlow, drawPile, drawPileLabel, drawRockBody, drawRockCracks, drawShard } from './rock.draw';

export function gallerySections(): Section[] {
  return [rocks(), bits(), drones(), rigs(), station(), freighters(), effects(), pods(), modules(), portraits(), icons(), spokes(), hint()];
}

function rocks(): Section {
  const cells: Section['cells'] = [];
  for (let s = 0; s < ROCK_SHAPES; s++) {
    const ore = ORE_IDS[s % 5];
    cells.push({ label: `SHAPE ${s} ${ore}`, w: 64, h: 64, zoom: s < 2 ? 4 : 0, draw: (c) => drawRockBody(c, { shape: s, ore }) });
  }
  for (const ore of ORE_IDS) cells.push({ label: ore, w: 64, h: 64, zoom: 0, draw: (c) => drawRockBody(c, { shape: 3, ore }) });
  cells.push({ label: 'CRACK 1', w: 64, h: 64, zoom: 0, draw: (c) => { drawRockBody(c, { shape: 2, ore: 'copper' }); drawRockCracks(c, 2, 1); } });
  cells.push({ label: 'CRACK 2', w: 64, h: 64, zoom: 0, draw: (c) => { drawRockBody(c, { shape: 2, ore: 'copper' }); drawRockCracks(c, 2, 2); } });
  cells.push({ label: 'DRY', w: 64, h: 64, zoom: 0, draw: (c) => { drawDryRock(c, 2); drawDryGlow(c, 2); } });
  cells.push({ label: 'BONANZA', w: 64, h: 64, zoom: 4, draw: (c) => drawRockBody(c, { shape: 5, ore: 'ice', bonanza: true }) });
  for (const r of [22, 24, 26]) cells.push({ label: `R${r} RIG`, w: 60, h: 60, zoom: 0, draw: (c) => { drawRockBody(c, { shape: 1, ore: 'iron', r }); c.save(); c.scale(r / 26, r / 26); drawRig(c, { look: 1 }); c.restore(); } });
  return { title: 'Rocks', cells };
}

function bits(): Section {
  const cells: Section['cells'] = [];
  for (const ore of ORE_IDS) cells.push({ label: `CHUNK ${ore}`, w: 12, h: 12, draw: (c) => drawChunk(c, ore) });
  for (const step of [0, 1, 2, 3] as const) cells.push({ label: `PILE ${step}`, w: 28, h: 24, draw: (c) => drawPile(c, 'copper', step) });
  for (const ore of ORE_IDS) cells.push({ label: `PILE3 ${ore}`, w: 32, h: 24, zoom: 2, draw: (c) => drawPile(c, ore, 3) });
  for (const ore of ORE_IDS) cells.push({ label: `VARIANTS ${ore}`, w: 40, h: 12, zoom: 2, draw: (c) => { for (let v = 0; v < 4; v++) { c.save(); c.translate(-15 + v * 10, 0); drawChunk(c, ore, 2.9 + v * 0.3, 11 + v * 7); c.restore(); } } });
  cells.push({ label: 'PILE LABEL', w: 30, h: 14, zoom: 3, draw: (c) => drawPileLabel(c, '62/80') });
  cells.push({ label: 'PILE LABEL FULL', w: 30, h: 14, zoom: 3, draw: (c) => drawPileLabel(c, '80/80', true) });
  for (let i = 0; i < 8; i++) cells.push({ label: `SHARD ${i}`, w: 10, h: 10, zoom: 3, draw: (c) => drawShard(c, 'iron', i) });
  return { title: 'Chunks piles shards', cells };
}

function drones(): Section {
  const cells: Section['cells'] = [];
  const b = DRONE_BOX * 2;
  for (const ore of ORE_IDS) cells.push({ label: ore, w: b, h: b, draw: (c) => { drawThrusterFlame(c, 0.8); drawDrone(c, { ore }); } });
  cells.push({ label: 'IDLE', w: b, h: b + 10, draw: (c) => { drawDrone(c, { ore: null, loaded: false }); c.save(); c.translate(0, -12); drawIdleBadge(c); c.restore(); } });
  cells.push({ label: 'EMPTY', w: b, h: b, draw: (c) => drawDrone(c, { ore: 'copper', loaded: false }) });
  for (const k of [0.3, 0.65, 1]) cells.push({ label: `FLAME ${k}`, w: 30, h: b, zoom: 2, draw: (c) => drawThrusterFlame(c, k) });
  return { title: 'Drones', cells };
}

function rigs(): Section {
  const cells: Section['cells'] = [];
  for (let l = 0; l < 5; l++) {
    const look = l as RigLook;
    cells.push({ label: RIG_LOOKS[l], w: 56, h: 56, zoom: l < 2 ? 3 : 0, draw: (c) => { drawRockBody(c, { shape: l, ore: ORE_IDS[l] }); drawRig(c, { look }); } });
  }
  for (const look of [0, 2, 4] as RigLook[]) cells.push({ label: `BARE ${look}`, w: 44, h: 44, zoom: 0, draw: (c) => drawRig(c, { look }) });
  for (const s of [1, 2, 3]) cells.push({ label: `STRIPES ${s}`, w: 56, h: 56, zoom: 0, draw: (c) => { drawRockBody(c, { shape: 6, ore: 'platinum' }); drawRig(c, { look: 4, stripes: s }); } });
  for (const lamp of ['run', 'full', 'dry'] as const) cells.push({ label: lamp, w: 56, h: 56, zoom: 0, draw: (c) => { drawRockBody(c, { shape: 1, ore: 'iron' }); drawRig(c, { look: 0, lamp }); } });
  cells.push({ label: 'HEAD', w: 12, h: 12, draw: (c) => drawDrillHead(c) });
  void drawRigBase;
  return { title: 'Rigs', cells };
}

function station(): Section {
  const cells: Section['cells'] = [];
  cells.push({ label: 'STATION BARE', w: 240, h: 130, zoom: 2, draw: (c) => { c.translate(0, -14); drawStation(c, 0); } });
  cells.push({ label: 'STATION FIRST FOUR PARTS + RACK', w: 240, h: 130, zoom: 2, draw: (c) => {
    c.translate(0, -14);
    drawNodePart(c, 'afterburner');
    drawStation(c, 15);
    for (const n of FIRST_FOUR_PARTS) if (n !== 'afterburner') drawNodePart(c, n, 3);
    RACK_CRADLES.forEach((p, i) => { if (i === 3) return; c.save(); c.translate(p.x, p.y); c.rotate(-90, 0, 0); drawDrone(c, { ore: null, loaded: false }); c.restore(); });
    c.save(); c.translate(RACK_OVERFLOW.x, RACK_OVERFLOW.y); drawRackOverflow(c, 4); c.restore();
  } });
  cells.push({ label: 'STATION ALL EIGHT PARTS', w: 240, h: 150, zoom: 0, draw: (c) => {
    c.translate(0, 0);
    drawNodePart(c, 'afterburner');
    drawStation(c, 15);
    for (const n of STAR_NODES) if (n !== 'afterburner') drawNodePart(c, n, n === 'prospect' ? 40 : 6);
  } });
  for (const n of STAR_NODES) cells.push({ label: STATION_PART_NAMES[n], w: 30, h: 30, zoom: 3, draw: (c) => drawNodePartShape(c, n, n === 'prospect' ? 20 : 3) });
  cells.push({ label: 'DISH', w: 26, h: 30, draw: (c) => drawScannerDish(c) });
  cells.push({ label: 'BEACON OFF', w: 14, h: 14, draw: (c) => drawBeacon(c, false) });
  cells.push({ label: 'RACK +12', w: 30, h: 16, zoom: 3, draw: (c) => drawRackOverflow(c, 12) });
  void STATION_PARTS; void drawPartShape; void drawStationPart;
  return { title: 'Station', cells };
}

function freighters(): Section {
  const cells: Section['cells'] = [];
  for (let h = 0; h < 4; h++) {
    const hull = h as HullId;
    const sz = freighterSize(hull, 0);
    cells.push({ label: HULL_NAMES[h], w: sz.w + 14, h: sz.h + 20, zoom: 3, draw: (c) => { drawFreighterFlame(c, hull, 0, 0.6); drawFreighter(c, { hull }); } });
  }
  for (const segs of [2, 5, 8]) {
    const sz = freighterSize(3, segs);
    cells.push({ label: `SEGMENTS ${segs}`, w: sz.w + 8, h: sz.h + 22, zoom: 2, draw: (c) => { drawFreighterFlame(c, 3, segs, 1); drawFreighter(c, { hull: 3, segments: segs, cargo: ['copper', 'iron', 'ice'] }); } });
  }
  for (const k of [0.15, 0.4, 0.8]) cells.push({ label: `WARP ${k}`, w: 120, h: 120, zoom: 0, draw: (c) => drawWarpFlash(c, k) });
  cells.push({ label: 'PAD LOADED', w: 80, h: 84, zoom: 2, draw: (c) => { c.translate(0, 16); drawPad(c, true); c.save(); c.scale(LOADED_FREIGHTER_SCALE, LOADED_FREIGHTER_SCALE); drawFreighter(c, { hull: 1, cargo: ['iron', 'copper'] }); c.restore(); c.save(); c.translate(0, -34); drawChevronStack(c, 0.75); c.restore(); } });
  cells.push({ label: 'PAD EMPTY HOLD', w: 80, h: 84, zoom: 0, draw: (c) => { c.translate(0, 16); drawPad(c); drawFreighter(c, { hull: 1 }); c.save(); c.translate(0, -30); drawChevronStack(c, 0, false); c.restore(); } });
  cells.push({ label: 'AWAY', w: 80, h: 64, zoom: 2, draw: (c) => { c.translate(0, -6); drawPad(c); drawAwayArc(c, 0.4, 'BACK IN 9 S'); } });
  cells.push({ label: 'POLICY CHIP', w: 72, h: 18, zoom: 3, draw: (c) => drawPolicyChip(c, 'FULL') });
  cells.push({ label: 'POLICY CONTRACT', w: 90, h: 18, zoom: 0, draw: (c) => drawPolicyChip(c, 'CONTRACT', false) });
  void drawChevron;
  return { title: 'Freighter', cells };
}

function effects(): Section {
  const cells: Section['cells'] = [];
  cells.push({ label: 'STARFIELD G0', w: 150, h: 120, zoom: 0, draw: (c) => { c.translate(-75, -60); drawStarfield(c, 150, 120, 0); } });
  cells.push({ label: 'STARFIELD G1', w: 150, h: 120, zoom: 0, draw: (c) => { c.translate(-75, -60); drawStarfield(c, 150, 120, 1); } });
  cells.push({ label: 'STARFIELD G2', w: 150, h: 120, zoom: 0, draw: (c) => { c.translate(-75, -60); drawStarfield(c, 150, 120, 2); } });
  cells.push({ label: 'RINGS ROUTES', w: 200, h: 140, zoom: 0, draw: (c) => {
    drawRingGuides(c, 0, 70, [50, 90, 130]);
    drawRoute(c, -40, 20, 0, 60, 'iron'); drawRoute(c, 50, -10, 0, 60, 'copper', 3);
    c.save(); c.translate(-20, 40); drawRouteChip(c, 3, 'iron'); c.restore();
    c.save(); c.translate(25, 25); drawRouteChip(c, 12, 'copper'); c.restore();
    drawSeamGuide(c, 25, 25, -60, -40); drawDragLine(c, 60, 60, 80, -30);
  } });
  cells.push({ label: 'ROUTE DASH PER ORE', w: 200, h: 60, zoom: 2, draw: (c) => ORE_IDS.forEach((ore, i) => { const y = -24 + i * 12; drawRoute(c, -50, y, 95, y, ore); drawText(c, ore.toUpperCase(), -95, y - 2, { size: 4, color: SPACE.steel, glow: 0 }); }) });
  cells.push({ label: 'GHOST SLOT', w: 64, h: 70, draw: (c) => drawGhostSlot(c, 24, '₵260') });
  cells.push({ label: 'SEAM RIM', w: 80, h: 80, zoom: 2, draw: (c) => { drawSeamRim(c, 24); drawRockBody(c, { shape: 4, ore: 'copper' }); } });
  cells.push({ label: 'FLARE', w: 20, h: 24, draw: (c) => drawFlare(c) });
  cells.push({ label: 'FLARE DARK', w: 20, h: 24, zoom: 0, draw: (c) => drawFlare(c, false) });
  cells.push({ label: 'CHARGES', w: 22, h: 14, zoom: 3, draw: (c) => drawChargePlate(c, 2) });
  cells.push({ label: 'FLARE TRAIL', w: 80, h: 60, zoom: 0, draw: (c) => drawFlareTrail(c, -30, 20, 30, -20, 0.7) });
  cells.push({ label: 'CREDIT', w: 16, h: 16, draw: (c) => drawCreditGlyph(c) });
  cells.push({ label: 'HOLD TANK', w: 64, h: 96, zoom: 2, draw: (c) => drawHoldTank(c, 56, 88, [['iron', 0.3], ['copper', 0.25], ['ice', 0.12]]) });
  cells.push({ label: 'HOLD 48x69', w: 56, h: 76, zoom: 0, draw: (c) => drawHoldTank(c, 48, 69, [['titanium', 0.3], ['platinum', 0.2]]) });
  cells.push({ label: 'HOLD FULL', w: 64, h: 96, zoom: 0, draw: (c) => drawHoldTank(c, 56, 88, [['iron', 0.6], ['copper', 0.4]], true) });
  void SPACE;
  return { title: 'Effects', cells };
}

function pods(): Section {
  const cells: Section['cells'] = [];
  for (const t of POD_TIERS) {
    cells.push({ label: t, w: 70, h: 60, zoom: 2, draw: (c) => drawPod(c, t) });
    cells.push({ label: `${t} CUT`, w: 70, h: 60, zoom: 0, draw: (c) => drawPod(c, t, { cut: 0.6 }) });
    cells.push({ label: `${t} OPEN`, w: 70, h: 84, zoom: 0, draw: (c) => drawPod(c, t, { split: 1 }) });
  }
  for (const r of ['common', 'rare', 'epic'] as const) cells.push({ label: `LIGHT ${r}`, w: 70, h: 130, zoom: 0, draw: (c) => { c.translate(0, 34); drawPod(c, 'derelict', { split: 1, inner: RARITY[r] }); drawRarityLight(c, RARITY[r], 0.8); } });
  return { title: 'Pods', cells };
}

function modules(): Section {
  const cells: Section['cells'] = [];
  MODULES.forEach((m, i) => cells.push({ label: m.id, w: CARTRIDGE_W + 4, h: CARTRIDGE_H + 4, zoom: 0, draw: (c) => drawCartridge(c, { module: m.id, rarity: m.rarity, socket: m.socket, mark: 1 + (i % 5) }) }));
  for (const r of ['common', 'rare', 'epic'] as const) cells.push({ label: `THRUSTERS ${r}`, w: CARTRIDGE_W + 4, h: CARTRIDGE_H + 4, zoom: 0, draw: (c) => drawCartridge(c, { module: 'thrusters', rarity: r, socket: 'fleet', mark: 3 }) });
  cells.push({ label: 'LOCKED', w: CARTRIDGE_W + 4, h: CARTRIDGE_H + 4, zoom: 0, draw: (c) => drawCartridge(c, { module: 'sorter', rarity: 'epic', socket: 'fleet', locked: true }) });
  cells.push({ label: 'TRAY AT 0.5', w: 3 * 52, h: 64, zoom: 0, draw: (c) => (['common', 'rare', 'epic'] as const).forEach((r, i) => { c.save(); c.translate(-52 + i * 52, 0); c.scale(0.5, 0.5); drawCartridge(c, { module: 'keeper', rarity: r, socket: 'dock', mark: 2 }); c.restore(); }) });
  return { title: 'Modules', cells };
}

function portraits(): Section {
  const cells: Section['cells'] = [];
  for (const s of [20, 40]) {
    cells.push({ label: `TALLY ${s}`, w: s, h: s, zoom: s === 20 ? 4 : 2, draw: (c) => drawTally(c, s, 0) });
    cells.push({ label: `OPS ${s}`, w: s, h: s, zoom: s === 20 ? 4 : 2, draw: (c) => drawOps(c, s) });
    cells.push({ label: `DISPATCH ${s}`, w: s, h: s, zoom: s === 20 ? 4 : 2, draw: (c) => drawDispatch(c, s) });
  }
  for (const turn of [20, 40]) cells.push({ label: `TALLY T${turn}`, w: 40, h: 40, zoom: 0, draw: (c) => drawTally(c, 40, turn) });
  cells.push({ label: 'OPS QUIET', w: 40, h: 40, zoom: 0, draw: (c) => drawOps(c, 40, null) });
  for (const b of BUYERS) cells.push({ label: b.id, w: 40, h: 40, zoom: 2, draw: (c) => drawBuyer(c, 40, b.id) });
  return { title: 'Portraits', cells };
}

function icons(): Section {
  const cells: Section['cells'] = [];
  for (const [name, draw] of Object.entries(HAUL_ICONS)) cells.push({ label: name.replace(/^(art|mach):/, ''), w: 32, h: 32, zoom: 2, draw: (c) => draw(c, 32) });
  const badges: Record<string, [string, 'count' | 'dm'] | undefined> = { comms: ['2', 'count'], salvage: ['', 'count'], trade: ['240', 'dm'] };
  for (const g of RAIL_GLYPHS) cells.push({ label: `BTN ${g}`, w: 52, h: 48, zoom: 0, draw: (c) => drawRailButton(c, 44, g, badges[g]?.[0], badges[g]?.[1]) });
  for (const g of RAIL_GLYPHS) cells.push({ label: `40 ${g}`, w: 44, h: 44, zoom: 0, draw: (c) => drawRailButton(c, 40, g) });
  return { title: 'Icons', cells };
}

function spokes(): Section {
  const cells: Section['cells'] = [];
  cells.push({ label: 'SCHEMATIC 340 FLEET GLOWS', w: 340, h: 340, zoom: 0, draw: (c) => drawStationSchematic(c, 340, { fitted: { rig: { module: 'diamondbit', rarity: 'rare' }, dock: { module: 'quickclamp', rarity: 'epic' } }, state: { fleet: 'glow', rig: 'dim', dock: 'dim' } }) });
  cells.push({ label: 'SCHEMATIC 320 EMPTY', w: 320, h: 320, zoom: 0, draw: (c) => { drawStationSchematic(c, 320); const a = schematicSockets(320); for (const id of SCHEMATIC_SOCKETS) c.drawCircle(a[id].x, a[id].y, 2, fill(SPACE.red)); } });
  cells.push({ label: 'DISH RELAY 3 LIT, READY', w: 300, h: 80, zoom: 0, draw: (c) => drawDishRelay(c, 300, 3, true, 0.7) });
  cells.push({ label: 'DISH RELAY 0', w: 200, h: 60, zoom: 0, draw: (c) => drawDishRelay(c, 200, 0) });
  for (const cond of CONDITIONS) cells.push({ label: cond.id, w: 88, h: 56, zoom: 0, draw: (c) => drawConditionPreview(c, 86, cond.id) });
  cells.push({ label: 'STAR CORE 80', w: 84, h: 84, zoom: 0, draw: (c) => drawStarCore(c, 80) });
  cells.push({ label: 'STAR CORE 48', w: 50, h: 50, zoom: 0, draw: (c) => drawStarCore(c, 48) });
  const caps: Record<string, number | null> = { prospect: null, veinsense: 5, assay: 5, brokerseat: 5, seedcredits: 6, preload: 1, sparedrones: 6, afterburner: 6 };
  const lv: Record<string, number> = { prospect: 12, veinsense: 2, assay: 5, brokerseat: 0, seedcredits: 3, preload: 1, sparedrones: 1, afterburner: 4 };
  const st: Record<string, NodeState> = { brokerseat: 'locked', veinsense: 'buyable' };
  for (const n of STAR_NODES) cells.push({ label: `${n} ${lv[n]}`, w: 70, h: 76, zoom: 0, draw: (c) => drawNodeRing(c, 56, lv[n], caps[n], n, st[n] ?? 'normal') });
  cells.push({ label: 'NODE 40', w: 44, h: 50, zoom: 0, draw: (c) => drawNodeRing(c, 40, 3, 5, 'assay') });
  cells.push({ label: 'STAMP', w: 170, h: 90, zoom: 0, draw: (c) => drawReceiptStamp(c, 120, '+₵420') });
  cells.push({ label: 'STAMP PLAIN', w: 130, h: 60, zoom: 0, draw: (c) => drawReceiptStamp(c, 96) });
  return { title: 'Spokes', cells };
}

function hint(): Section {
  const cells: Section['cells'] = [];
  cells.push({ label: 'RETICLE', w: 48, h: 48, zoom: 3, draw: (c) => drawReticle(c) });
  cells.push({ label: 'DRAG GUIDE', w: 160, h: 70, zoom: 0, draw: (c) => { drawGuide(c, -60, 20, 60, -20); c.save(); c.translate(-10, 3); drawReticle(c); c.restore(); } });
  cells.push({ label: 'DRAG LINE (PLAYER)', w: 160, h: 70, zoom: 0, draw: (c) => drawDragLine(c, -60, 20, 60, -20) });
  cells.push({ label: `ATLAS ${atlasDefs({ freighter: { hull: 0, segments: 0 } }).length} SPRITES`, w: 10, h: 10, zoom: 0, draw: () => undefined });
  return { title: 'Hint pointer', cells };
}
