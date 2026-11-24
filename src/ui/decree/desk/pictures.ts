/**
 * The desk canvas's still layers, each a Skia picture recorded only when what it shows changes (the
 * canvas replays pictures; nothing is drawn per frame but the transforms): the room behind the bars,
 * the desk with its door, trays and in-tray, the drawer at a few openings, a paper's ground (sheet,
 * strips, chip grounds, the photo with the visitor's bust from the faces atlas, the form, the front
 * page, the bunting, the picket board), the slip, the signature, the take-back rest. Every drawing is
 * the art kit's (src/ui/decree/art); words are the desk's own Text over the canvas (./PaperWords.tsx).
 * Pictures are never freed while a canvas may draw them (they are dropped by the garbage collector
 * once no layer holds them).
 */
import { Skia, type SkCanvas, type SkPicture } from '@shopify/react-native-skia';
import { DESK } from '../art/palette';
import { drawChip } from '../art/effects.draw';
import { decreeAtlas, faceAtlasOf } from '../art/atlas';
import { faceSpriteName } from '../art/faces';
import { drawDesk, drawDeskFront, drawDeskTop, drawDeskSet, drawDoor, drawDrawer, drawInTray, drawLamp, drawLampPool, drawOutTray, drawStickyNote, drawTakeBackRest, drawTelephones, drawerStage, type DeskSet } from '../art/desk.draw';
import { MASTHEAD_TILT, drawFormFace, drawFrontPage, drawPaper, drawPhotoClip, drawPicketSign, drawRunUpPaper, drawSignatureIn, drawSlip, signatureBox } from '../art/paper.draw';
import { at, clip, oval, picture } from '../art/pen';
import type { DeskLayout, DeskParts, Rect } from '../layout';
import type { PaperMetrics } from '../paperMetrics';
import type { AroundVM, PaperVM } from './deskVm';
import { chipBoxes, photoBox } from './paperGeo';

/** The room, the desk and everything on it that does not move with the thumb. */
export function backPicture(L: DeskLayout, P: DeskParts, a: AroundVM): SkPicture {
  return picture({ x: 0, y: 0, w: L.width, h: L.height }, (c) => {
    const set: DeskSet = a.walnut ? 'walnut' : 'plain';
    const office = a.office;
    c.drawRect({ x: 0, y: 0, width: L.width, height: L.height }, paint(DESK.baizeDeep));
    drawDeskTop(c, { x: 0, y: 0, w: L.width, h: L.ribbon.y + L.ribbon.h }, office, set);
    drawDesk(c, { x: 0, y: L.outTray.y, w: L.width, h: L.drawer.y + L.drawer.h - L.outTray.y }, office, set);
    if (office === 1) at(c, L.width - 30, L.paper.y + 8, 1, 0, (q) => drawLampPool(q, 70));
    drawDeskFront(c, { x: 0, y: L.goalLine.y, w: L.width, h: L.height - L.goalLine.y }, office, set);
    // The door with its glass (a visitor's shape behind it when one is about to come in).
    at(c, P.door.x, P.door.y, 1, 0, (q) => drawDoor(q, P.door.w, P.door.h, office, a.doorShadow ? 0.8 : 0));
    // The wire out-tray with this term's signed papers.
    at(c, P.outTray.x, P.outTray.y, 1, 0, (q) => drawOutTray(q, P.outTray.w, P.outTray.h, a.signed));
    // The office's own object at the band's right, under the sticky note when one shows.
    const band = L.outTray;
    if (!a.sticky) {
      if (office === 1) at(c, P.sticky.x + P.sticky.w - 22, band.y + band.h - 2, Math.min(1.1, (band.h - 4) / 30), 0, (q) => drawLamp(q, 30, set));
      if (office === 2) at(c, P.sticky.x + P.sticky.w / 2, band.y + band.h - 6, Math.min(0.95, (band.h - 8) / 20), 0, (q) => drawTelephones(q));
      if (office === 0 && set === 'walnut') at(c, P.sticky.x + P.sticky.w / 2, band.y + band.h - 6, Math.min(1, (band.h - 8) / 18), 0, (q) => drawDeskSet(q));
    } else {
      at(c, P.sticky.x, P.sticky.y, 1, 1.5, (q) => drawStickyNote(q, P.sticky.w, P.sticky.h));
    }
    // The in-tray in the bottom row's slot: its stack of waiting papers and the count.
    const t = P.inTray;
    at(c, t.x, t.y + 2, 1, 0, (q) => drawInTray(q, t.w, t.h - 4, a.waiting, { digits: true, full: a.trayFull }));
  });
}

/** Openings at which the drawer is drawn (its front drops with the pull). */
export const DRAWER_STEPS = 6;

/** The drawer FOR FURTHER STUDY at each opening (0 .. DRAWER_STEPS − 1). */
export function drawerPictures(P: DeskParts, a: AroundVM): SkPicture[] {
  const stage = drawerStage(a.drawer);
  return Array.from({ length: DRAWER_STEPS }, (_, k) =>
    picture({ x: P.drawer.x - 4, y: P.drawer.y - 4, w: P.drawer.w + 8, h: P.drawer.h + 30 }, (c) => at(c, P.drawer.x, P.drawer.y, 1, 0, (q) => drawDrawer(q, P.drawer.w, P.drawer.h, stage, k / (DRAWER_STEPS - 1), a.office))),
  );
}

function paint(color: string) {
  const p = Skia.Paint();
  p.setColor(Skia.Color(color));
  return p;
}

let faces = false;
/** Bakes the faces' pages once (the atlas kit caches them for the app's life and never frees them). */
export function bakeFaces(): void {
  try {
    decreeAtlas('faces');
    decreeAtlas('faces2');
  } catch {
    // no surface: the photo stays an empty oval
  }
  faces = true;
}
/** Whether the faces' pages were baked (the paper draws the bust only then; before, an empty oval). */
export function facesReady(): boolean {
  return faces;
}

/** The visitor's bust from the faces atlas, clipped to the oval (nothing while the atlas is not baked yet). */
function drawFace(c: SkCanvas, cast: string, r: Rect): void {
  if (!cast || !faces) return;
  const name = faceSpriteName(cast);
  const page = faceAtlasOf(name);
  if (!page) return;
  const atlas = decreeAtlas(page);
  const sp = atlas?.sprites[name];
  if (!atlas || !sp) return;
  c.save();
  clip(c, oval(r.x + r.w / 2, r.y + r.h / 2, r.w / 2 - 1.5, r.h / 2 - 1.5));
  const k = Math.max((r.w + 4) / sp.rect.width, (r.h + 4) / sp.rect.height);
  const w = sp.rect.width * k;
  const h = sp.rect.height * k;
  c.drawImageRect(atlas.image, sp.rect, { x: r.x + (r.w - w) / 2, y: r.y + (r.h - h) / 2, width: w, height: h }, Skia.Paint());
  c.restore();
}

/** The paper's rows as the art kit's drawPaper takes them. */
export function faceRows(m: PaperMetrics) {
  return { signY: m.sign.y, signH: m.sign.h, headerY: m.header.y, headerH: m.header.h, refuseY: m.refuse.y, refuseH: m.refuse.h };
}

/** A paper's whole ground at its size, with `armed` the strip grown to 110 %. */
export function paperPicture(vm: PaperVM, w: number, h: number, m: PaperMetrics, armed: 'sign' | 'refuse' | null): SkPicture {
  return picture({ x: -12, y: -14, w: w + 24, h: h + 28 }, (c) => {
    const rows = faceRows(m);
    if (vm.ground === 'runup') drawRunUpPaper(c, w, h, { m: rows, armed, armedBy: 1, slot: true });
    else drawPaper(c, w, h, { m: rows, armed, armedBy: 1, slot: vm.ground !== 'front' });
    // the chip grounds of both strips
    for (const [view, sr] of [
      [vm.sign, m.sign],
      [vm.refuse, m.refuse],
    ] as const) {
      const grow = armed === view.side ? 1.1 : 1;
      for (const b of chipBoxes(view, sr)) {
        c.save();
        if (grow !== 1) {
          // the armed strip grows towards its own edge (the art kit's drawStrip does the same)
          const ay = view.side === 'sign' ? sr.y + sr.h : sr.y;
          c.translate(w / 2, ay);
          c.scale(grow, grow);
          c.translate(-w / 2, -ay);
        }
        at(c, b.x, b.y, 1, 0, (q) => drawChip(q, b.w, b.h, view.side));
        c.restore();
      }
    }
    const pb = photoBox(m);
    if (vm.ground !== 'front') {
      drawFace(c, vm.face, { x: pb.x + 1.5, y: pb.y + 1.5, w: pb.w - 3, h: pb.h - 3 });
      at(c, pb.x, pb.y, 1, 0, (q) => drawPhotoClip(q));
    }
    // the ground of the paper's middle: a printed form, the front page, the picket board
    const mid = { x: 8, y: m.header.y, w: w - 16, h: m.header.h + m.proposal.h };
    if (vm.ground === 'requisition' || vm.ground === 'ribbon' || vm.ground === 'application') {
      c.saveLayer(layerAlpha(0.32));
      at(c, mid.x + 6, m.proposal.y + 2, 1, 0, (q) => drawFormFace(q, mid.w - 12, m.proposal.h - 4, vm.ground as 'requisition' | 'ribbon' | 'application'));
      c.restore();
    }
    if (vm.ground === 'front') {
      const k = 0.8;
      c.save();
      c.translate(mid.x, mid.y);
      c.scale(k, k);
      drawFrontPage(c, mid.w / k, mid.h / k, 0);
      c.restore();
    }
    if (vm.ground === 'grievance' && vm.picket) at(c, w - 56, m.header.y + 30, 0.82, -6, (q) => drawPicketSign(q, 1));
  });
}

function layerAlpha(a: number) {
  const p = Skia.Paint();
  p.setAlphaf(a);
  return p;
}

/** The masthead's tilt, for the words drawn over the front page. */
export const MASTHEAD_DEG = MASTHEAD_TILT;

/** The whole signature in the SIGN strip's title row (revealed by a clip that grows with the ink). */
export function signaturePicture(player: string, m: PaperMetrics, w: number, start: number): { pic: SkPicture; box: Rect } {
  const stripW = w - 16;
  const sb = signatureBox(stripW, m.sign.chips[0].y - m.sign.y);
  // Right of the title's words (measured by the desk), never over a chip.
  const x0 = Math.max(sb.x, Math.min(start, stripW - 24 - 70));
  const b = { x: 8 + x0, y: m.sign.y + sb.y, w: stripW - 24 - x0, h: sb.h };
  const pic = picture({ x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8 }, (c) => drawSignatureIn(c, player, 1, b));
  return { pic, box: b };
}

/** The budget slip's ground. */
export function slipPicture(r: Rect): SkPicture {
  return picture({ x: -8, y: -8, w: r.w + 16, h: r.h + 16 }, (c) => drawSlip(c, r.w, r.h, 0));
}

/** The take-back rest on the out-tray (the 2 s ring is drawn over it by the canvas). */
export function restPicture(P: DeskParts): { pic: SkPicture; ring: { cx: number; cy: number; r: number } } {
  const w = Math.min(160, P.outTray.w + 30);
  const h = Math.max(24, Math.min(34, P.outTray.h));
  const x = P.outTray.x + (P.outTray.w - w) / 2;
  const y = P.outTray.y + (P.outTray.h - h) / 2;
  const pic = picture({ x: x - 4, y: y - 4, w: w + 8, h: h + 8 }, (c) => at(c, x, y, 1, 0, (q) => drawTakeBackRest(q, w, h, 0)));
  const r = Math.min(9, h * 0.3);
  return { pic, ring: { cx: x + w - r - 12, cy: y + h * 0.55, r } };
}
