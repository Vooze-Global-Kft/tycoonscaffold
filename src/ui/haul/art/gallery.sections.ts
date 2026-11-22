/**
 * Every piece of the art kit and its variants, as gallery sections (see gallery.draw.ts).
 */
import type { Section } from './gallery.draw';
import { ORE_IDS, SPACE } from './palette';
import { POD_TIERS, drawPod } from './pods.draw';
import { CARTRIDGE_H, CARTRIDGE_W, MODULES, drawCartridge } from './modules.draw';
import { BUYERS, drawBuyer, drawDispatch, drawOps, drawTally } from './portraits.draw';
import { HAUL_ICONS } from './icons';
import { drawReticle } from './reticle.draw';
import { atlasDefs } from './atlas';
import { RAIL_GLYPHS, drawRailButton } from './icons.draw';
import { STATION_PARTS, drawBeacon, drawPartShape, drawScannerDish, drawStation, drawStationPart } from './station.draw';
import { HULL_NAMES, drawChevron, drawFreighter, drawFreighterFlame, drawPad, drawWarpFlash, freighterSize, type HullId } from './freighter.draw';
import { drawCreditGlyph, drawDragLine, drawFlare, drawFlareTrail, drawGhostSlot, drawHoldTank, drawRingGuides, drawRoute, drawRouteChip, drawSeamGuide, drawSeamRim, drawStarfield } from './fx.draw';
import { DRONE_BOX, drawDrone, drawIdleBadge, drawThrusterFlame } from './drone.draw';
import { RIG_LOOKS, drawDrillHead, drawRig, drawRigBase, type RigLook } from './rig.draw';
import { ROCK_SHAPES, drawChunk, drawDryRock, drawDryGlow, drawPile, drawRockBody, drawRockCracks, drawShard } from './rock.draw';

export function gallerySections(): Section[] {
  return [rocks(), bits(), drones(), rigs(), station(), freighters(), effects(), pods(), modules(), portraits(), icons(), hint()];
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
  cells.push({ label: 'R22', w: 56, h: 56, zoom: 0, draw: (c) => drawRockBody(c, { shape: 1, ore: 'iron', r: 22 }) });
  return { title: 'Rocks', cells };
}

function bits(): Section {
  const cells: Section['cells'] = [];
  for (const ore of ORE_IDS) cells.push({ label: `CHUNK ${ore}`, w: 12, h: 12, draw: (c) => drawChunk(c, ore) });
  for (const step of [0, 1, 2, 3] as const) cells.push({ label: `PILE ${step}`, w: 28, h: 24, draw: (c) => drawPile(c, 'copper', step) });
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
  cells.push({ label: 'STATION BARE', w: 230, h: 130, zoom: 2, draw: (c) => { c.translate(0, -10); drawStation(c, 0); } });
  cells.push({ label: 'STATION ALL PARTS', w: 230, h: 140, zoom: 2, draw: (c) => {
    c.translate(0, 0);
    drawStationPart(c, 'afterburner');
    drawStation(c, 15);
    for (const p of STATION_PARTS) if (p !== 'afterburner') drawStationPart(c, p, p === 'prospect' ? 40 : 6);
    c.save(); c.translate(9, 50); drawBeacon(c, true); c.restore();
  } });
  for (const p of STATION_PARTS) if (p !== 'afterburner') cells.push({ label: p, w: 26, h: 26, draw: (c) => drawPartShape(c, p, p === 'prospect' ? 20 : 3) });
  cells.push({ label: 'DISH', w: 26, h: 30, draw: (c) => drawScannerDish(c) });
  cells.push({ label: 'BEACON ON', w: 14, h: 14, draw: (c) => drawBeacon(c, true) });
  cells.push({ label: 'BEACON OFF', w: 14, h: 14, draw: (c) => drawBeacon(c, false) });
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
  cells.push({ label: 'PAD CHEVRONS', w: 80, h: 70, zoom: 2, draw: (c) => { c.translate(0, 10); drawPad(c); drawFreighter(c, { hull: 0 }); [0, 1, 2].forEach((i) => { c.save(); c.translate(0, -26 - i * 6); drawChevron(c, 1 - i * 0.3); c.restore(); }); } });
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
  cells.push({ label: 'GHOST SLOT', w: 64, h: 70, draw: (c) => drawGhostSlot(c, 24, '₵260') });
  cells.push({ label: 'SEAM RIM', w: 80, h: 80, zoom: 2, draw: (c) => { drawSeamRim(c, 24); drawRockBody(c, { shape: 4, ore: 'copper' }); } });
  cells.push({ label: 'FLARE', w: 16, h: 24, draw: (c) => drawFlare(c) });
  cells.push({ label: 'FLARE TRAIL', w: 80, h: 60, zoom: 0, draw: (c) => drawFlareTrail(c, -30, 20, 30, -20, 0.7) });
  cells.push({ label: 'CREDIT', w: 16, h: 16, draw: (c) => drawCreditGlyph(c) });
  cells.push({ label: 'HOLD TANK', w: 64, h: 96, zoom: 2, draw: (c) => drawHoldTank(c, 56, 88, [['iron', 0.3], ['copper', 0.25], ['ice', 0.1]]) });
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
  return { title: 'Pods', cells };
}

function modules(): Section {
  const cells: Section['cells'] = [];
  MODULES.forEach((m, i) => cells.push({ label: m.id, w: CARTRIDGE_W + 4, h: CARTRIDGE_H + 4, zoom: 0, draw: (c) => drawCartridge(c, { module: m.id, rarity: m.rarity, socket: m.socket, mark: 1 + (i % 5) }) }));
  cells.push({ label: 'LOCKED', w: CARTRIDGE_W + 4, h: CARTRIDGE_H + 4, zoom: 0, draw: (c) => drawCartridge(c, { module: 'sorter', rarity: 'epic', socket: 'fleet', locked: true }) });
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
  for (const g of RAIL_GLYPHS) cells.push({ label: `BTN ${g}`, w: 44, h: 44, zoom: 0, draw: (c) => drawRailButton(c, 44, g) });
  return { title: 'Icons', cells };
}

function hint(): Section {
  const cells: Section['cells'] = [];
  cells.push({ label: 'RETICLE', w: 48, h: 48, zoom: 3, draw: (c) => drawReticle(c) });
  cells.push({ label: 'DRAG GUIDE', w: 160, h: 70, zoom: 0, draw: (c) => { drawDragLine(c, -60, 20, 60, -20); c.save(); c.translate(-10, 3); drawReticle(c); c.restore(); } });
  cells.push({ label: `ATLAS ${atlasDefs({ freighter: { hull: 0, segments: 0 } }).length} SPRITES`, w: 10, h: 10, zoom: 0, draw: () => undefined });
  return { title: 'Hint pointer', cells };
}
