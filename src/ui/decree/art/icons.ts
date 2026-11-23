/**
 * The decree mode's named icons for list rows, sheets, bars and shared screens, as
 * `(canvas, size) => void` drawing centred on the origin in a square of `size` points. DecreeIcon.tsx
 * turns them into cached images (never one canvas per row). Pure Skia.
 *
 * art:    club_<club id>                  a club badge (game.json `decree.clubs[].icon`)
 *         club_<club id>_boycott          the same with the brick boycott ring
 *         fx_<effect id>                  coin, gossip, approval, every, level, minister, boycott,
 *                                         boycott_end, scandal, scandal_end, returns, flag, nr,
 *                                         record, district, nochange
 *         ministry_<ministry id>          the 18 ministries and 5 Grand Projects (game.json ids)
 *         monument_<monument id>         the 24 small bronzes (wall.draw.ts MONUMENTS; any written
 *                                         name resolves through monumentArtOf)
 *         btn_<id>                        ledger, cabinet, poll, office, shop, settings, scrapbook, shelf, call
 *         product_<product id>            the five products (game.json `monetization.iap.products[].id`)
 *         ad_<id>                         sofa, spin, courier, doors, away (the rewarded ads, 5.11)
 *         emblem, scissors, pen, paperclip, envelope, rosette, intray, drawer, lamp, telephones,
 *         deskset, map_0, map_1, map_2, storeys_<0..8>
 * face:   <cast id>                       a cast member's bust (faces/), in its oval photo
 *         portrait-<player id>-<age>      a player's one-colour portrait (Office wall), age 0..2
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { CLUB_IDS, DESK, alpha } from './palette';
import { drawClubBadge } from './clubs.draw';
import { EFFECT_IDS, drawEffect, drawRosette } from './effects.draw';
import { MINISTRY_IDS, PROJECT_IDS, drawMinistry, drawStoreys, ministryArtOf } from './ministries.draw';
import { MONUMENTS, drawFrame, drawMonument, monumentArtOf } from './wall.draw';
import { BUTTON_ICONS, drawButtonIcon, drawDistrictMap, drawEnvelope } from './meta.draw';
import { drawDeskSet, drawDrawer, drawInTray, drawLamp, drawPaperclip, drawPen, drawTelephones } from './desk.draw';
import { drawEmblem, drawGiantScissors } from './emblem.draw';
import { CAST_IDS, PLAYER_IDS, drawBust, AGE_STEPS, PORTRAIT_INK } from './faces';
import { LINE, arc, at, builder, circle, fill, line, oval, poly, rect, rrect, shape, stroke, washed } from './pen';

export type IconDraw = (c: SkCanvas, size: number) => void;

/** Fits a drawing made in a square of half size `half` into `size`. */
function fit(half: number, draw: (c: SkCanvas) => void, zoom = 1): IconDraw {
  return (c, size) => at(c, 0, 0, (size / (half * 2)) * zoom, 0, draw);
}

/** Fits a drawing made from its top left in w x h into `size`. */
function fitBox(w: number, h: number, draw: (c: SkCanvas) => void, zoom = 1): IconDraw {
  return (c, size) => {
    const s = (size / Math.max(w, h)) * zoom;
    at(c, -(w * s) / 2, -(h * s) / 2, s, 0, draw);
  };
}

const PRODUCT_DRAW: Record<string, (c: SkCanvas) => void> = {
  // Junior Clerk on Duty: a clipboard with a ticked list (the Standing Order)
  office_standing_order: (c) => {
    washed(c, rrect(-8, -10, 16, 21, 1.6), DESK.walnutLight, DESK.walnut, 1, 1, 1);
    c.drawPath(rect(-6, -6, 12, 15), fill(DESK.paperLight));
    washed(c, rrect(-4, -12, 8, 4, 1), DESK.brass, DESK.brassDeep, 0.6, 0.6, 0.8);
    for (let i = 0; i < 3; i++) {
      c.drawPath(poly([-4.4, -2.6 + i * 4.4, -3.2, -1.4 + i * 4.4, -1, -4 + i * 4.4], false), stroke(DESK.violet, 1));
      c.drawPath(line(0.4, -2.2 + i * 4.4, 4.4, -2.2 + i * 4.4), stroke(DESK.slateLight, 1));
    }
  },
  // Long Lunch: a teacup before a clock with the hands far apart
  office_long_lunch: (c) => {
    shape(c, circle(3, -3, 8), DESK.paperLight, 1);
    c.drawPath(line(3, -3, 3, -9), stroke(LINE, 1.2));
    c.drawPath(line(3, -3, 8, -1), stroke(LINE, 1.2));
    washed(c, builder().moveTo(-11, 2).lineTo(1, 2).quadTo(1, 11, -5, 11).quadTo(-11, 11, -11, 2).close().build(), DESK.violetLight, DESK.violet, 0.8, 0.8, 1);
    c.drawPath(arc(1.6, 5.4, 2.4, -90, 180), stroke(DESK.violet, 1.4));
    c.drawPath(builder().moveTo(-7, -1).quadTo(-6, -4, -7, -6).build(), stroke(alpha(DESK.slate, 0.8), 0.8));
  },
  office_walnut_desk: (c) => at(c, 0, 4, 0.36, 0, drawDeskSet),
  // Gilt Portrait Frames: a small gilt frame
  office_portrait_frames: (c) =>
    at(c, -8, -10, 1, 0, (q) => {
      drawFrame(q, 16, 20, 'gilt', true);
    }),
  // Skip the Ad Videos (the Private Secretary): a shorthand notebook and pencil
  office_private_secretary: (c) => {
    washed(c, rrect(-8, -10, 15, 20, 1.4), DESK.slateDeep, DESK.slateDeep, 0, 0, 1);
    c.drawPath(rect(-6, -7, 11, 15), fill(DESK.paperLight));
    for (let i = 0; i < 4; i++) c.drawPath(builder().moveTo(-4.6, -4 + i * 3.4).quadTo(-2, -6 + i * 3.4, 0, -4 + i * 3.4).quadTo(2, -2 + i * 3.4, 3.4, -4 + i * 3.4).build(), stroke(DESK.violet, 0.8));
    c.drawPath(circle(-8, -6, 0.9), fill(DESK.brass));
    c.drawPath(circle(-8, 0, 0.9), fill(DESK.brass));
    c.drawPath(circle(-8, 6, 0.9), fill(DESK.brass));
    at(c, 8, 1, 1, 20, (q) => {
      q.drawPath(rect(-1.4, -10, 2.8, 17), fill(DESK.mustard));
      q.drawPath(rect(-1.4, -10, 2.8, 17), stroke(LINE, 0.6));
      q.drawPath(poly([-1.4, 7, 1.4, 7, 0, 10.4]), fill(DESK.paperShade));
    });
  },
};

const AD_DRAW: Record<string, (c: SkCanvas) => void> = {
  // Check the Sofa: a cushion with a coin peeping out
  sofa: (c) => {
    washed(c, builder().moveTo(-11, -2).quadTo(-11, -8, -5, -8).lineTo(5, -8).quadTo(11, -8, 11, -2).lineTo(11, 6).lineTo(-11, 6).close().build(), DESK.violetLight, DESK.violet, 1, 1, 1);
    c.drawPath(line(0, -8, 0, 6), stroke(alpha(LINE, 0.4), 0.8));
    at(c, 3, 6, 0.5, 0, (q) => drawEffect(q, 'coin'));
  },
  // Call the Spin Doctor: a spinning top
  spin: (c) => {
    washed(c, builder().moveTo(0, 10).lineTo(-9, -1).quadTo(0, -7, 9, -1).close().build(), DESK.slate, DESK.slateDeep, 1, 1, 1);
    c.drawPath(rect(-1, -10, 2, 6), fill(LINE));
    c.drawPath(arc(0, -1, 12, 200, 60), stroke(DESK.violet, 1.2));
    c.drawPath(arc(0, -1, 12, 20, 60), stroke(DESK.violet, 1.2));
  },
  // Send a Courier: a sealed envelope with motion lines
  courier: (c) => {
    at(c, 3, 0, 0.42, 0, (q) => drawEnvelope(q, 0));
    for (let i = 0; i < 3; i++) c.drawPath(line(-12, -4 + i * 4, -7, -4 + i * 4), stroke(DESK.slate, 1.2));
  },
  // Open the Doors: a pair of doors ajar
  doors: (c) => {
    washed(c, rect(-10, -11, 9, 22), DESK.walnutLight, DESK.walnut, 1, 1, 1);
    washed(c, poly([1, -11, 9, -13, 9, 13, 1, 11]), DESK.walnutLight, DESK.walnut, 1, 1, 1);
    c.drawPath(rect(-8, -8, 5, 7), fill(DESK.glass));
    c.drawPath(circle(-3, 2, 1), fill(DESK.brass));
    c.drawPath(circle(3, 2, 1), fill(DESK.brass));
  },
  // The away report's double: a clock face and a coin
  away: (c) => {
    shape(c, circle(-2, -2, 9), DESK.paperLight, 1);
    c.drawPath(line(-2, -2, -2, -8), stroke(LINE, 1.2));
    c.drawPath(line(-2, -2, 3, -2), stroke(LINE, 1.2));
    at(c, 6, 6, 0.55, 0, (q) => drawEffect(q, 'coin'));
  },
};

function build(): Record<string, IconDraw> {
  const I: Record<string, IconDraw> = {};
  for (const id of CLUB_IDS) {
    I[`art:club_${id}`] = fit(12.4, (c) => drawClubBadge(c, id, 12));
    I[`art:club_${id}_boycott`] = fit(15.2, (c) => drawClubBadge(c, id, 12, { boycott: true }));
  }
  for (const id of EFFECT_IDS) I[`art:fx_${id}`] = fit(12, (c) => drawEffect(c, id));
  for (const id of [...MINISTRY_IDS, ...PROJECT_IDS]) I[`art:ministry_${id}`] = fit(12.4, (c) => drawMinistry(c, id));
  for (const m of MONUMENTS) I[`art:monument_${m.id}`] = fit(12.4, (c) => drawMonument(c, m.id));
  for (const id of BUTTON_ICONS) I[`art:btn_${id}`] = fit(12.4, (c) => drawButtonIcon(c, id));
  for (const [id, d] of Object.entries(PRODUCT_DRAW)) I[`art:product_${id}`] = fit(12.6, d);
  for (const [id, d] of Object.entries(AD_DRAW)) I[`art:ad_${id}`] = fit(12.6, d);
  for (let n = 0; n <= 8; n++) I[`art:storeys_${n}`] = (c, size) => at(c, 0, size * 0.46, size / 40, 0, (q) => drawStoreys(q, n));
  I['art:emblem'] = fit(41, (c) => drawEmblem(c, 40));
  I['art:scissors'] = fit(44, (c) => drawGiantScissors(c, 40));
  I['art:pen'] = (c, size) => at(c, -size * 0.12, -size * 0.48, size / 70, -35, (q) => drawPen(q, 64));
  I['art:paperclip'] = fit(12, (c) => drawPaperclip(c, 22));
  I['art:envelope'] = fit(22, (c) => drawEnvelope(c, 0));
  I['art:rosette'] = fit(13, (c) => drawRosette(c, 0, -2, 10));
  I['art:intray'] = fitBox(72, 60, (c) => drawInTray(c, 72, 60, 3));
  I['art:drawer'] = fitBox(100, 36, (c) => drawDrawer(c, 100, 36, 0, 0.4), 1);
  I['art:lamp'] = (c, size) => at(c, 0, size * 0.46, size / 32, 0, (q) => drawLamp(q, 30));
  I['art:telephones'] = fit(42, drawTelephones);
  I['art:deskset'] = fit(32, drawDeskSet);
  for (const o of [0, 1, 2] as const) I[`art:map_${o}`] = fitBox(100, 100, (c) => drawDistrictMap(c, 100, 100, o, { pins: false }));
  // Faces: the cast's busts in their oval photograph (faces/), and the players' portraits.
  for (const id of CAST_IDS) I[`face:${id}`] = (c, size) => void drawBust(c, id, { x: -size * 0.4, y: -size / 2, width: size * 0.8, height: size });
  for (const id of PLAYER_IDS)
    for (let age = 0; age < AGE_STEPS; age++) I[`face:portrait-${id}-${age}`] = (c, size) => void drawBust(c, id, { x: -size * 0.4, y: -size / 2, width: size * 0.8, height: size }, { age, mono: PORTRAIT_INK });
  void oval;
  return I;
}

let cache: Record<string, IconDraw> | null = null;

/** Every named icon (built once). */
export function decreeIcons(): Record<string, IconDraw> {
  if (!cache) cache = build();
  return cache;
}

export function decreeIconNames(): string[] {
  return Object.keys(decreeIcons());
}

export function hasDecreeIcon(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(decreeIcons(), name);
}

/** The icon name of a club (game.json's `decree.clubs[].icon` is the same). */
export function clubIcon(club: string, boycott = false): string {
  return `art:club_${club}${boycott ? '_boycott' : ''}`;
}
export function ministryIcon(id: string): string {
  return `art:ministry_${id}`;
}
export function monumentIcon(id: string): string {
  return `art:monument_${id}`;
}
export function effectIcon(id: string): string {
  return `art:fx_${id}`;
}
/** "face:<castId>" as game.json writes a visitor's face; also accepts a bare cast id. */
export function faceIcon(castId: string): string {
  return castId.startsWith('face:') ? castId : `face:${castId}`;
}

/**
 * The drawing for any name the game may ask for: the table above, then the forgiving forms: a
 * monument by any written id or name ("art:monument_<anything>" resolves through monumentArtOf),
 * a ministry by its register id (names.json, "potholes-office"), a face by a bare cast id.
 * Null when there is none (the caller shows its fallback).
 */
export function resolveDecreeIcon(name: string): IconDraw | null {
  const all = decreeIcons();
  if (Object.prototype.hasOwnProperty.call(all, name)) return all[name];
  if (name.startsWith('art:monument_')) return all[`art:monument_${monumentArtOf(name.slice('art:monument_'.length))}`] ?? null;
  if (name.startsWith('art:ministry_')) {
    const k = ministryArtOf(name.slice('art:ministry_'.length));
    return k ? (all[`art:ministry_${k}`] ?? null) : null;
  }
  if (!name.includes(':') && all[`face:${name}`]) return all[`face:${name}`];
  return null;
}
