/**
 * The contact sheet's sections (office-design.md 9.1 "decree-art"), shared by the Node sheets
 * (scripts/art/decree-sheets.ts) and the dev view (Gallery.tsx). Each section is a title and a
 * drawing of fixed height at a given width; labels in print letters (no font file). Pure Skia.
 */
import type { SkCanvas, SkPicture } from '@shopify/react-native-skia';
import { CLUB_IDS, DESK, alpha } from './palette';
import { drawClubBadge } from './clubs.draw';
import { drawBunting, drawFormFace, drawFrontPage, drawPaper, drawPhotoClip, drawPicketSign, drawRunUpPaper, drawSheet, drawSignature, drawSlip, drawStrip, SIGNATURE_IDS, shakeOffset, type FormKind } from './paper.draw';
import { drawDeskFront, drawDeskSet, drawDeskTop, drawDesk, drawDoor, drawDrawer, drawInTray, drawLamp, drawLampPool, drawOutTray, drawPaperclip, drawPen, drawStickyNote, drawTakeBackRest, drawTelephones, drawWarehousePhoto, type OfficeIx } from './desk.draw';
import { EFFECT_IDS, drawApprovalChip, drawEffect, drawGossipChip } from './effects.draw';
import { MINISTRY_IDS, PROJECT_IDS, drawMinistry, drawStoreys } from './ministries.draw';
import { BUTTON_ICONS, drawButtonIcon, drawCabinetFrame, drawChalkMarks, drawDistrictMap, drawEnvelope, drawLedger, drawTallyBoard, drawTallyResult, tallyRows } from './meta.draw';
import { MONUMENTS, drawClipping, drawFrame, drawMonument, drawOpponentsCard, drawScrapbook, drawTownPhoto, drawVanityShelf, drawWallpaper, frameInner } from './wall.draw';
import { drawCaption, drawCaptionBand, drawEmblem, drawGiantScissors, drawLoadingCard } from './emblem.draw';
import { drawLetters } from './letters';
import { drawBustStandIn } from './standin.draw';
import { at, fill, grey, oval, picture, rect } from './pen';

export interface Section {
  title: string;
  height: (w: number) => number;
  draw: (c: SkCanvas, w: number) => void;
  /** The section's ground (default the baize). */
  ground?: string;
}

function label(c: SkCanvas, t: string, x: number, y: number, color: string = DESK.paperShade, size = 6): void {
  drawLetters(c, t, x, y, { size, color, weight: 0.13 });
}

/** A row of items each `cell` wide, wrapping, drawn centred in their cells with a label under. */
function grid(c: SkCanvas, w: number, items: { name: string; draw: (c: SkCanvas) => void }[], cell: number, rowH: number, y0 = 22, labels = true, color: string = DESK.paperShade): number {
  const cols = Math.max(1, Math.floor((w - 16) / cell));
  items.forEach((it, i) => {
    const x = 8 + (i % cols) * cell + cell / 2;
    const y = y0 + Math.floor(i / cols) * rowH;
    at(c, x, y + rowH * 0.42, 1, 0, it.draw);
    if (labels) label(c, it.name.toUpperCase().slice(0, 16), x - cell / 2 + 2, y + rowH - 4, color, 5);
  });
  return y0 + Math.ceil(items.length / cols) * rowH;
}

function rowsFor(n: number, w: number, cell: number): number {
  return Math.ceil(n / Math.max(1, Math.floor((w - 16) / cell)));
}

export function gallerySections(): Section[] {
  const clubs = CLUB_IDS.map((id, i) => ({ name: id, draw: (c: SkCanvas) => drawClubBadge(c, id, 12 * 0.75, { mood: 15 + i * 13, boycott: id === 'veg', flag: id === 'shops' }) }));
  const clubsBig = CLUB_IDS.map((id) => ({ name: id, draw: (c: SkCanvas) => drawClubBadge(c, id, 24) }));
  const effects = EFFECT_IDS.map((id) => ({ name: id, draw: (c: SkCanvas) => at(c, 0, 0, 0.75, 0, (q) => drawEffect(q, id)) }));
  const ministries = [...MINISTRY_IDS, ...PROJECT_IDS].map((id) => ({ name: id, draw: (c: SkCanvas) => at(c, 0, 0, 1.4, 0, (q) => drawMinistry(q, id)) }));
  const monuments = MONUMENTS.map((m) => ({ name: m.id, draw: (c: SkCanvas) => at(c, 0, 0, 1.5, 0, (q) => drawMonument(q, m.id)) }));
  return [
    {
      title: 'Icons at 18 pt: clubs with mood ring, effects (true size)',
      ground: DESK.paperLight,
      height: (w) => 30 + 40 + rowsFor(EFFECT_IDS.length, w, 34) * 34 + 10,
      draw: (c, w) => {
        label(c, 'CLUBS 18 PT ON PAPER', 8, 14, DESK.slateDeep);
        const y = grid(c, w, clubs, 34, 40, 18, true, DESK.slateDeep);
        grid(c, w, effects, 34, 34, y, true, DESK.slateDeep);
      },
    },
    {
      title: 'Clubs: badges at 48 pt and on the baize at 18 pt',
      height: (w) => 30 + rowsFor(7, w, 64) * 66 + 40,
      draw: (c, w) => {
        const y = grid(c, w, clubsBig, 64, 66, 18);
        CLUB_IDS.forEach((id, i) => at(c, 20 + i * 28, y + 16, 1, 0, (q) => drawClubBadge(q, id, 9, { mood: 30 + i * 9 })));
      },
    },
    {
      title: 'Effects at 36 pt; chips',
      ground: DESK.paperLight,
      height: (w) => 24 + rowsFor(EFFECT_IDS.length, w, 54) * 54 + 44,
      draw: (c, w) => {
        const y = grid(c, w, EFFECT_IDS.map((id) => ({ name: id, draw: (q: SkCanvas) => at(q, 0, 0, 1.5, 0, (z) => drawEffect(z, id)) })), 54, 54, 14, true, DESK.slateDeep);
        at(c, 10, y + 6, 1, 0, (q) => drawApprovalChip(q, 86, 26, 62));
        at(c, 110, y + 6, 1, 0, (q) => drawGossipChip(q, 48, 26, 2, 5));
        at(c, 170, y + 6, 1, 0, (q) => drawGossipChip(q, 48, 26, 4, 5));
      },
    },
    {
      title: 'Ministries and Grand Projects; storeys 0 to 8',
      ground: DESK.paperLight,
      height: (w) => 20 + rowsFor(23, w, 50) * 50 + 54,
      draw: (c, w) => {
        const y = grid(c, w, ministries, 50, 50, 14, true, DESK.slateDeep);
        for (let n = 0; n <= 8; n++) at(c, 16 + n * 24, y + 48, 1, 0, (q) => drawStoreys(q, n));
      },
    },
    {
      title: 'The three desks (mayor, governor, president) and the walnut set',
      height: () => 290,
      draw: (c, w) => {
        const dw = (w - 40) / 4;
        ([0, 1, 2, 0] as OfficeIx[]).forEach((o, i) => {
          const x = 8 + i * (dw + 8);
          const set = i === 3 ? 'walnut' : 'plain';
          // the top band (wood behind the bars), the felt with its rim, the front under the drawer
          drawDeskTop(c, { x, y: 16, w: dw, h: 44 }, o, set);
          drawDesk(c, { x, y: 60, w: dw, h: 150 }, o, set);
          drawDeskFront(c, { x, y: 210, w: dw, h: 70 }, o, set);
          if (o === 1) at(c, x + dw - 26, 100, 1, 0, (q) => drawLampPool(q, 50));
          if (o === 1) at(c, x + dw - 26, 100, 1, 0, (q) => drawLamp(q, 30));
          if (o === 2) at(c, x + dw / 2, 94, Math.min(0.9, dw / 100), 0, drawTelephones);
          if (set === 'walnut') at(c, x + dw / 2, 94, Math.min(0.9, dw / 80), 0, drawDeskSet);
          label(c, ['MAYOR', 'GOVERNOR', 'PRESIDENT', 'WALNUT SET'][i], x + 14, 200, DESK.paperLight, 6);
        });
      },
    },
    {
      title: 'Desk objects: door, trays, drawer stages, sticky note, clip, pen, take-back',
      height: () => 300,
      draw: (c, w) => {
        drawDesk(c, { x: 0, y: 10, w, h: 290 }, 0);
        at(c, 12, 18, 1, 0, (q) => drawDoor(q, 118, 30, 0, 0));
        at(c, 140, 18, 1, 0, (q) => drawDoor(q, 118, 30, 2, 0.8));
        [0, 4, 9].forEach((n, i) => at(c, 12 + i * 80, 56, 1, 0, (q) => drawInTray(q, 72, 60, n, { digits: true, full: n >= 10 })));
        [0, 8, 40].forEach((n, i) => at(c, 12 + i * 120, 124, 1, 0, (q) => drawOutTray(q, 110, 36, n)));
        at(c, 12, 168, 1, 0, (q) => drawDrawer(q, Math.min(343, w - 24), 36, 0, 0));
        at(c, 12, 208, 1, 0, (q) => drawDrawer(q, Math.min(343, w - 24), 36, 1, 0.5));
        at(c, 12, 248, 1, 0, (q) => drawDrawer(q, Math.min(343, w - 24), 44, 3, 0));
        if (w > 420) {
          at(c, 380, 60, 1, 6, (q) => drawStickyNote(q, 110, 40));
          at(c, 520, 70, 1, 0, (q) => drawPaperclip(q, 30));
          at(c, 560, 60, 1, 30, (q) => drawPen(q, 64));
          at(c, 380, 130, 1, 0, (q) => drawTakeBackRest(q, 160, 30, 0.6));
          at(c, 600, 200, 1, 6, (q) => drawWarehousePhoto(q, 70, 50));
        }
      },
    },
    {
      title: 'Papers: day paper, armed SIGN, armed STUDY with shake, slip, forms',
      height: (w) => 30 + Math.ceil(7 / Math.max(1, Math.floor((w - 8) / 160))) * 284,
      draw: (c, w) => {
        drawDesk(c, { x: 0, y: 10, w, h: 20 + Math.ceil(7 / Math.max(1, Math.floor((w - 8) / 160))) * 284 }, 0);
        const pw = 150;
        const ph = 270;
        const sm = { signY: 4, signH: 70, headerY: 76, headerH: 58, refuseY: ph - 74, refuseH: 70 };
        const items: ((c: SkCanvas) => void)[] = [
          (q) => {
            drawPaper(q, pw, ph, { m: sm });
            at(q, 14, 80, 1, 0, (z) => {
              z.save();
              z.clipPath(oval(22, 27, 20.5, 25.5), 1, true);
              drawBustStandIn(z, 44, 54);
              z.restore();
              drawPhotoClip(z);
            });
          },
          (q) => drawPaper(q, pw, ph, { m: sm, armed: 'sign', armedBy: 1 }),
          (q) => drawPaper(q, pw, ph, { m: sm, armed: 'refuse', armedBy: 1, shake: shakeOffset(0.05) }),
          (q) => drawSlip(q, pw, 110),
          (q) => {
            drawSheet(q, pw, ph);
            at(q, 10, 20, 1, 0, (z) => drawFormFace(z, pw - 20, 120, 'requisition'));
          },
          (q) => {
            drawSheet(q, pw, ph);
            at(q, 10, 20, 1, 0, (z) => drawFormFace(z, pw - 20, 120, 'ribbon' as FormKind));
          },
          (q) => {
            drawSheet(q, pw, ph);
            at(q, 10, 20, 1, 0, (z) => drawFormFace(z, pw - 20, 120, 'application'));
          },
        ];
        const per = Math.max(1, Math.floor((w - 8) / (pw + 10)));
        items.forEach((d, i) => at(c, 8 + (i % per) * (pw + 10), 20 + Math.floor(i / per) * (ph + 14), 1, 0, d));
      },
    },
    {
      title: 'Grievance, front page, run-up paper, strips at true size',
      height: () => 310,
      draw: (c, w) => {
        drawDesk(c, { x: 0, y: 10, w, h: 300 }, 1);
        at(c, 8, 20, 1, 0, (q) => {
          drawPaper(q, 160, 280, { m: { signY: 4, signH: 70, headerY: 76, headerH: 58, refuseY: 206, refuseH: 70 } });
          at(q, 110, 110, 0.8, -8, (z) => drawPicketSign(z, 1));
        });
        at(c, 178, 20, 1, 0, (q) => drawFrontPage(q, 160, 280));
        if (w > 520) at(c, 348, 20, 1, 0, (q) => drawRunUpPaper(q, 160, 280, { m: { signY: 4, signH: 70, headerY: 76, headerH: 58, refuseY: 206, refuseH: 70 } }));
        if (w > 700) {
          at(c, 520, 30, 1, 0, (q) => drawStrip(q, 315, 80, 'sign', { armed: 0 }));
          at(c, 520, 130, 1, 0, (q) => drawStrip(q, 315, 80, 'refuse', { armed: 0.5 }));
        }
      },
    },
    {
      title: 'Signatures, one per player face, revealed at 30, 60 and 100 percent',
      ground: DESK.paperLight,
      height: () => 20 + SIGNATURE_IDS.length * 44,
      draw: (c, w) => {
        SIGNATURE_IDS.forEach((id, i) => {
          label(c, id.toUpperCase(), 8, 30 + i * 44, DESK.slateDeep);
          [0.3, 0.6, 1].forEach((p, k) => at(c, 80 + k * Math.min(160, (w - 90) / 3), 12 + i * 44, 1, 0, (q) => drawSignature(q, id, p, 1)));
        });
      },
    },
    {
      title: 'The Ledger, the cabinet photograph, the button icons',
      height: () => 260,
      draw: (c, w) => {
        drawDesk(c, { x: 0, y: 10, w, h: 250 }, 0);
        at(c, 10, 22, 1, 0, (q) => drawLedger(q, 220, 200));
        at(c, 250, 24, 1, 0, (q) => drawCabinetFrame(q, Math.min(240, w - 260), 170, [true, true, false, false, false, false, false, false, false]));
        BUTTON_ICONS.forEach((id, i) => at(c, 260 + i * 34, 222, 1.1, 0, (q) => drawButtonIcon(q, id)));
      },
    },
    {
      title: 'District maps: five wards, seven counties, nine provinces',
      ground: DESK.walnutDeep,
      height: (w) => Math.min(220, (w - 32) / 3) + 30,
      draw: (c, w) => {
        const s = Math.min(220, (w - 32) / 3);
        ([0, 1, 2] as const).forEach((o, i) =>
          at(c, 8 + i * (s + 8), 16, 1, 0, (q) => drawDistrictMap(q, s, s, o, { held: o === 0 ? [true, false, true, true, false] : o === 1 ? [true, true, false, true, false, false, true] : [true, false, true, true, false, true, false, true, true], focus: 1 })),
        );
      },
    },
    {
      title: 'Election night: tally board, envelopes, marks, rosettes, bunting',
      height: () => 300,
      draw: (c, w) => {
        c.drawRect({ x: 0, y: 10, width: w, height: 290 }, fill(DESK.walnutDeep));
        const bw = Math.min(360, w - 120);
        at(c, 10, 20, 1, 0, (q) => {
          drawTallyBoard(q, bw, 230, 5, { majority: 3, bunting: true });
          tallyRows(bw, 230, 5).forEach((r, i) => {
            drawLetters(q, ['MARKET WARD', 'HILLTOP', 'MILL WARD', 'OLD TOWN', 'RIVERSIDE'][i], r.name.x, r.name.y + r.name.h * 0.64, { size: 9, style: 'chalk', seed: i });
            at(q, r.marks.x, r.marks.y + r.marks.h * 0.25, 1, 0, (z) => drawChalkMarks(z, 3 + i * 2, r.marks.h * 0.5, i));
            at(q, r.result.x + r.result.w / 2, r.result.y + r.result.h / 2, 1, 0, (z) => drawTallyResult(z, i !== 3, r.result.h * 0.4));
          });
        });
        at(c, bw + 60, 60, 1, 0, (q) => drawEnvelope(q, 0));
        at(c, bw + 60, 120, 1, 0, (q) => drawEnvelope(q, 0.7));
      },
    },
    {
      title: 'The Office wall: frames plain and gilt, towns, opponents, shelf',
      height: () => 330,
      draw: (c, w) => {
        drawWallpaper(c, { x: 0, y: 10, w: w / 2, h: 320 }, 'walnut');
        drawWallpaper(c, { x: w / 2, y: 10, w: w / 2, h: 320 }, 'gilt');
        at(c, 14, 24, 1, 0, (q) => {
          drawFrame(q, 70, 90, 'walnut', true);
          const i = frameInner(70, 90);
          at(q, i.x, i.y, 1, 0, (z) => drawBustStandIn(z, i.w, i.h));
        });
        at(c, w / 2 + 14, 24, 1, 0, (q) => {
          drawFrame(q, 70, 90, 'gilt', true);
          const i = frameInner(70, 90);
          at(q, i.x, i.y, 1, 0, (z) => drawBustStandIn(z, i.w, i.h));
        });
        at(c, 96, 28, 1, -4, (q) => drawTownPhoto(q, 64, 48, 0));
        at(c, 96, 84, 1, 3, (q) => drawTownPhoto(q, 64, 48, 1));
        at(c, w / 2 + 96, 28, 1, 2, (q) => drawTownPhoto(q, 64, 48, 2));
        at(c, w / 2 + 96, 84, 1, 0, (q) => drawOpponentsCard(q, 80, 70, 4));
        at(c, 10, 146, 1, 0, (q) => drawVanityShelf(q, Math.min(w - 20, 360), 170, MONUMENTS.slice(0, 13).map((m) => m.id)));
      },
    },
    {
      title: 'The 24 monuments (small bronzes) and the scrapbook',
      ground: DESK.wall,
      height: (w) => 20 + rowsFor(24, w, 56) * 56 + 170,
      draw: (c, w) => {
        const y = grid(c, w, monuments, 56, 56, 14, true, DESK.line);
        at(c, 10, y + 6, 1, 0, (q) => {
          drawScrapbook(q, 260, 150);
          drawClipping(q, 100, 50, 3, { photo: true });
        });
        at(c, 30, y + 26, 1, -4, (q) => drawClipping(q, 96, 52, 5, { photo: true }));
        at(c, 150, y + 30, 1, 3, (q) => drawClipping(q, 90, 50, 9, { election: true }));
      },
    },
    {
      title: 'The emblem, the loading card, the screenshot caption',
      height: () => 300,
      draw: (c, w) => {
        drawDesk(c, { x: 0, y: 10, w, h: 290 }, 0);
        at(c, 70, 84, 1, 0, (q) => drawEmblem(q, 40));
        at(c, 52, 222, 1, 0, (q) => drawEmblem(q, 22));
        at(c, 112, 222, 1, 0, (q) => drawEmblem(q, 11));
        at(c, 150, 20, 1, 0, (q) => drawLoadingCard(q, 200, 260, 'THE REPUBLIC OF MIDDLING', 'PROUDLY ADEQUATE'));
        if (w > 560) {
          at(c, 440, 100, 1, 0, (q) => drawGiantScissors(q, 40, { ribbon: true }));
          at(c, 370, 190, 1, 0, (q) => {
            drawCaptionBand(q, Math.min(340, w - 380), 92);
            drawCaption(q, ['SIGN IT, OR STUDY IT', 'FOREVER'], 14, 38, 16);
          });
        }
      },
    },
  ];
}

/** A section as a picture, `w` wide (titles drawn by the caller; greyscale optional). */
export function sectionPicture(s: Section, w: number, o: { greyscale?: boolean } = {}): { pic: SkPicture; height: number } {
  const height = s.height(w);
  const pic = picture({ x: 0, y: 0, w, h: height }, (c) => {
    const draw = (q: SkCanvas) => {
      q.drawRect({ x: 0, y: 0, width: w, height }, fill(s.ground ?? DESK.baize));
      label(q, s.title.toUpperCase(), 8, 8, s.ground === DESK.paperLight || s.ground === DESK.wall ? DESK.line : DESK.paperLight, 6);
      s.draw(q, w);
    };
    if (o.greyscale) grey(c, draw);
    else draw(c);
  });
  return { pic, height };
}

void alpha;
void rect;
void drawGiantScissors;
