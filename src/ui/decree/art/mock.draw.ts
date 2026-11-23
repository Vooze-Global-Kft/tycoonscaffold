/**
 * A mock of the desk screen drawn only from the kit (office-design.md 4.1, 4.2): the zones of
 * deskLayout at the phone's size, the desk with a paper on it, the bars with their icons, the
 * in-tray and the buttons. Words stand as slate bars (the screens set the real text), numbers in
 * print letters. Used by the contact sheet, the dev view and the brick-share measure (4.6: brick
 * under 8 % of any screen). Pure Skia.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { deskLayout, type Rect } from '../layout';
import { paperMetrics } from '../paperMetrics';
import { CLUB_IDS, DESK, alpha, type ClubId } from './palette';
import { drawClubBadge } from './clubs.draw';
import { drawDeskFront, drawDeskSet, drawDeskTop, drawDesk, drawDoor, drawDrawer, drawInTray, drawLamp, drawLampPool, drawOutTray, drawStickyNote, drawTelephones, drawerLabelBox, drawerStage, doorGlassBox, type DeskSet, type OfficeIx } from './desk.draw';
import { drawApprovalChip, drawChip, drawEffect, drawGossipChip, type EffectId } from './effects.draw';
import { drawLetters } from './letters';
import { drawBustStandIn } from './standin.draw';
import { drawBust } from './faces';
import { MASTHEAD_TILT, drawFrontPage, drawPaper, drawPhotoClip, drawPicketSign, drawSignatureIn, frontPageBoxes, signatureBox, picketSignBox } from './paper.draw';
import { LINE, at, clip, fill, oval, rect, rrect, stroke } from './pen';
import { drawButtonIcon, type ButtonIcon } from './meta.draw';

export type MockPaper = 'day' | 'grievance' | 'front' | 'signing';

export interface MockOptions {
  office?: OfficeIx;
  paper?: MockPaper;
  set?: DeskSet;
  /** Draws the face in the photo slot (the cast package's bust, or the stand-in). */
  face?: (c: SkCanvas, w: number, h: number) => void;
}

function words(c: SkCanvas, x: number, y: number, w: number, h: number, color: string = DESK.slateLight): void {
  c.drawPath(rrect(x, y + h * 0.25, w, h * 0.5, h * 0.25), fill(color));
}

function chip(c: SkCanvas, x: number, y: number, w: number, h: number, side: 'sign' | 'refuse', icon: EffectId | ClubId, digits: string, brick = false): void {
  at(c, x, y, 1, 0, (q) => drawChip(q, w, h, side));
  const r = h * 0.36;
  if ((CLUB_IDS as readonly string[]).includes(icon)) at(c, x + h / 2 + 1, y + h / 2, r / 12, 0, (q) => drawClubBadge(q, icon as ClubId, 12));
  else at(c, x + h / 2 + 1, y + h / 2, (r * 1.15) / 12, 0, (q) => drawEffect(q, icon as EffectId));
  drawLetters(c, digits, x + h + 4, y + h * 0.7, { size: h * 0.4, color: brick ? DESK.brick : DESK.line, weight: 0.13 });
}

/** The desk screen at w x h (points) with insets as a phone would give them. */
export function drawDeskMock(c: SkCanvas, w: number, h: number, o: MockOptions = {}): void {
  const office = o.office ?? 0;
  const tall = h > 700;
  const L = deskLayout(w, h, tall ? { top: 47, bottom: 34 } : { top: 20, bottom: 0 }, 1);
  const kind = o.paper ?? 'day';
  // the room behind the bars: the wall colour under the status bar and the bars
  c.drawRect({ x: 0, y: 0, width: w, height: h }, fill(DESK.baizeDeep));
  // desk under the out-tray band, the paper and the drawer band
  const deskBox = { x: 0, y: L.outTray.y, w, h: L.drawer.y + L.drawer.h - L.outTray.y };
  drawDesk(c, deskBox, office, o.set ?? 'plain');
  if (office === 1) at(c, w - 38, L.outTray.y + L.outTray.h - 2, 1, 0, (q) => drawLampPool(q, 70));
  // bars: top bar, club strip, ribbon (walnut-coloured band with paper text)
  drawDeskTop(c, { x: 0, y: 0, w, h: L.ribbon.y + L.ribbon.h }, office, o.set ?? 'plain');
  const t = L.bar.treasury;
  at(c, t.x + 12, t.y + t.h / 2, 0.75, 0, (q) => drawEffect(q, 'coin'));
  drawLetters(c, '12,480', t.x + 24, t.y + t.h / 2 + 6, { size: 12, color: DESK.mustardLight, weight: 0.15 });
  drawLetters(c, '+65/S', t.x + 92, t.y + t.h / 2 + 5, { size: 9, color: DESK.paperShade, weight: 0.13 });
  const a = L.bar.approval;
  at(c, a.x, a.y + (a.h - 26) / 2, 1, 0, (q) => drawApprovalChip(q, a.w, 26, 62));
  drawLetters(c, '62% X1.14', a.x + 26, a.y + a.h / 2 + 4, { size: 8, color: DESK.line, weight: 0.14 });
  const g = L.bar.gossip;
  at(c, g.x, g.y + (g.h - 26) / 2, 1, 0, (q) => drawGossipChip(q, g.w, 26, 2, 5));
  const m = L.bar.menu;
  for (let i = 0; i < 3; i++) c.drawRect({ x: m.x + 12, y: m.y + m.h / 2 - 6 + i * 5, width: 16, height: 2 }, fill(DESK.paperShade));
  const nClubs = office === 0 ? 3 : office === 1 ? 5 : 7;
  const moods = [54, 47, 71, 38, 62, 18, 50];
  L.clubs(nClubs).forEach((r, i) =>
    at(c, r.x + r.w / 2, r.y + r.h / 2, (r.w * 0.4) / 12, 0, (q) => drawClubBadge(q, CLUB_IDS[i], 12, { mood: moods[i], boycott: kind === 'grievance' && i === 2, flag: i === 1 })),
  );
  words(c, L.ribbon.x + 16, L.ribbon.y + 3, w * 0.55, L.ribbon.h - 6, DESK.paperShade);

  // out-tray band: door at the left, the wire tray in the middle, the office's object at the right
  const ob = L.outTray;
  const doorW = Math.min(118, w * 0.3);
  at(c, 10, ob.y + 3, 1, 0, (q) => drawDoor(q, doorW, ob.h - 6, office, 0.6));
  const gb = doorGlassBox(doorW, ob.h - 6);
  words(c, 10 + gb.x + 6, ob.y + 3 + gb.y + gb.h * 0.2, gb.w * 0.7, gb.h * 0.6, DESK.slateDeep);
  const trayW = Math.min(150, w * 0.4, w - doorW - 142);
  at(c, doorW + 20, ob.y + 1, 1, 0, (q) => drawOutTray(q, trayW, ob.h - 2, 31));
  if (office === 1) at(c, w - 38, ob.y + ob.h - 2, Math.min(1.1, (ob.h - 4) / 30), 0, (q) => drawLamp(q, 30));
  if (office === 2) at(c, w - 62, ob.y + ob.h - 6, Math.min(0.95, (ob.h - 8) / 20), 0, drawTelephones);
  if (o.set === 'walnut' && office === 0) at(c, w - 46, ob.y + ob.h - 6, Math.min(1, (ob.h - 8) / 18), 0, drawDeskSet);

  // the paper
  const p = L.paper;
  const pm = paperMetrics(p.h, 1);
  if (kind === 'front') {
    at(c, p.x, p.y, 1, 0, (q) => drawFrontPage(q, p.w, p.h));
    const fb = frontPageBoxes(p.w, p.h);
    at(c, p.x + fb.masthead.x + fb.masthead.w / 2, p.y + fb.masthead.y + fb.masthead.h / 2, 1, MASTHEAD_TILT, (q) => drawLetters(q, 'THE DITHERING DAILY DRIZZLE', -fb.masthead.w / 2 + 6, fb.masthead.h / 2 - 5, { size: 12, color: DESK.line, weight: 0.17, slant: 0.05 }));
    for (let i = 0; i < 3; i++) words(c, p.x + fb.headline.x, p.y + fb.headline.y + i * 20, fb.headline.w * (i === 2 ? 0.5 : 0.95), 18, DESK.line);
    words(c, p.x + fb.caption.x, p.y + fb.caption.y, fb.caption.w, fb.caption.h, DESK.slate);
  } else {
    at(c, p.x, p.y, 1, 0, (q) =>
      drawPaper(q, p.w, p.h, {
        m: { signY: pm.sign.y, signH: pm.sign.h, headerY: pm.header.y, headerH: pm.header.h, refuseY: pm.refuse.y, refuseH: pm.refuse.h },
        armed: kind === 'signing' ? 'sign' : null,
        armedBy: 1,
      }),
    );
    // the face in the oval
    const fx = p.x + 14;
    const fy = p.y + pm.header.y + 4;
    c.save();
    clip(c, oval(fx + 22, fy + 27, 20.5, 25.5));
    (o.face ?? ((q, fw, fh) => (drawBust(q, kind === 'grievance' ? 'gourdley' : 'spinwell', { x: -2, y: -2, width: fw + 4, height: fh + 4 }) ? undefined : drawBustStandIn(q, fw, fh))))(at2(c, fx + 1.5, fy + 1.5), 41, 51);
    c.restore();
    c.restore();
    at(c, fx, fy, 1, 0, (q) => drawPhotoClip(q));
    words(c, fx + 54, fy + 6, 120, 14, DESK.line);
    words(c, fx + 54, fy + 26, 160, 11, DESK.slate);
    for (let i = 0; i < 4; i++) words(c, p.x + 14, p.y + pm.proposal.y + 6 + i * pm.proposal.line, (p.w - 28) * (i === 3 ? 0.45 : 0.97), 14, DESK.slateDeep);
    // strips' words: title row and chips
    const strip = (top: number, side: 'sign' | 'refuse') => {
      const r = side === 'sign' ? pm.sign : pm.refuse;
      words(c, p.x + 16, p.y + r.title.y + 2, 120, r.title.h - 6, side === 'sign' ? DESK.violet : DESK.slate);
      const ch = r.chips[0];
      const cw = 140;
      const sideChips: [EffectId | ClubId, string, boolean][] =
        kind === 'grievance'
          ? side === 'sign'
            ? [['coin', '-1,300', false], ['veg', '18 → 28', false]]
            : [['boycott', '8 MORE', true], ['veg', '18 → 17', false]]
          : side === 'sign'
            ? [['coin', '-946', false], ['veg', '50 → 54', false], ['shops', '50 → 47', false]]
            : [['veg', '50 → 47', false], ['shops', '50 → 52', false]];
      sideChips.forEach(([ic, d, br], i) => chip(c, p.x + 14 + (i % 2) * (cw + 12), p.y + (i < 2 ? ch.y : r.chips[1].y) + 3, cw, ch.h - 6, side, ic, d, br));
      void top;
    };
    strip(pm.sign.y, 'sign');
    strip(pm.refuse.y, 'refuse');
    if (kind === 'grievance') {
      at(c, p.x + p.w - 64, p.y + pm.header.y + 30, 0.8, -8, (q) => drawPicketSign(q, 1));
      const pb = picketSignBox();
      at(c, p.x + p.w - 64, p.y + pm.header.y + 30, 0.8, -8, (q) => drawLetters(q, 'GIVE THEM BACK', pb.x + 2, pb.y + pb.h * 0.7, { size: 5.6, color: DESK.brick, weight: 0.16 }));
      drawLetters(c, 'VEGETABLES BELOW 20: BOYCOTT', p.x + 16, p.y + pm.refuse.note.y + pm.refuse.note.h - 5, { size: 8, color: DESK.brick, weight: 0.14 });
    }
    if (kind === 'signing') {
      // the signature writes itself in the SIGN strip's title row, never over a chip (signatureBox)
      const sb = signatureBox(p.w - 16, pm.sign.chips[0].y - pm.sign.y);
      at(c, p.x + 8, p.y + pm.sign.y, 1, 0, (q) => drawSignatureIn(q, 'bramble', 0.7, sb));
    }
  }

  // drawer band
  const db = L.drawer;
  at(c, (w - p.w) / 2, db.y, 1, 0, (q) => drawDrawer(q, p.w, db.h, drawerStage(312), 0, office));
  const lb = drawerLabelBox(p.w, db.h);
  drawLetters(c, 'FOR FURTHER STUDY (312)', (w - p.w) / 2 + lb.x + 6, db.y + lb.y + lb.h - 4, { size: Math.min(9, lb.h * 0.55), color: DESK.line, weight: 0.13 });
  // goal line and bottom row
  drawDeskFront(c, { x: 0, y: L.goalLine.y, w, h: h - L.goalLine.y }, office, o.set ?? 'plain');
  words(c, 16, L.goalLine.y + 3, w * 0.62, L.goalLine.h - 6, DESK.paperShade);
  const bt = L.buttons;
  at(c, bt.inTray.x, bt.inTray.y, 1, 0, (q) => drawInTray(q, bt.inTray.w, bt.inTray.h, 4, { digits: true }));
  const icons: [Rect, ButtonIcon][] = [
    [bt.ledger, 'ledger'],
    [bt.cabinet, 'cabinet'],
    [bt.poll, 'poll'],
    [bt.office, 'office'],
  ];
  for (const [r, ic] of icons) {
    at(c, r.x, r.y + 4, 1, 0, (q) => drawButtonGround(q, r.w, r.h - 8));
    at(c, r.x + r.w / 2, r.y + r.h * 0.42, (r.h * 0.34) / 12, 0, (q) => drawButtonIcon(q, ic));
    words(c, r.x + 12, r.y + r.h - 20, r.w - 24, 8, DESK.paperShade);
  }
  // a sticky note on the desk's corner (only with a day paper)
  if (kind === 'day' && office === 0 && o.set !== 'walnut') at(c, w - 104, ob.y + 4, 1, 3, (q) => drawStickyNote(q, 90, Math.min(30, ob.h - 8)));
}

function at2(c: SkCanvas, x: number, y: number): SkCanvas {
  c.save();
  c.translate(x, y);
  return c;
}

/** A bottom-row button's ground: a walnut plaque with a brass edge (w x h from top left). */
export function drawButtonGround(c: SkCanvas, w: number, h: number): void {
  c.drawPath(rrect(0, 0, w, h, 8), fill(DESK.walnut));
  c.drawPath(rrect(0.5, 0.5, w - 1, h - 1, 8), stroke(alpha(DESK.brass, 0.7), 1));
  c.drawPath(rect(6, h - 3, w - 12, 1), fill(alpha(DESK.shadow, 0.3)));
  void LINE;
}
