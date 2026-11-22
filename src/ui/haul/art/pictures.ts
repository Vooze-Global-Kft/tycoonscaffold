/**
 * Static pictures of everything on the field that does not move by itself (or only turns as a
 * whole): station layers and parts, rig bases, piles, ghost slots, the seam rim, the flare, the
 * pad and chevrons, the hold-tank shell is drawn live (its bands change). Recorded on first use
 * and kept for the life of the app (a few dozen small pictures; never freed, so no mounted canvas
 * can draw a freed one). Pure Skia; no React.
 */
import type { SkPicture } from '@shopify/react-native-skia';
import { drawChevron, drawFreighter, drawPad, type HullId } from './freighter.draw';
import { drawFlare, drawGhostSlot, drawSeamRim, starfieldPicture } from './fx.draw';
import { around, picture } from './pen';
import { drawPile } from './rock.draw';
import { drawDrillHead, drawRigBase, drawRigLamp, type LampState, type RigLook } from './rig.draw';
import { drawBeacon, drawDockArm, drawRackArm, drawScannerDish, drawStationHub, drawStationPart, drawStationRing, type StationPart } from './station.draw';
import { drawIdleBadge } from './drone.draw';

const cache = new Map<string, SkPicture>();

function memo(key: string, make: () => SkPicture): SkPicture {
  let p = cache.get(key);
  if (!p) {
    p = make();
    cache.set(key, p);
  }
  return p;
}

export const pictures = {
  /** Station layers, origin at the station centre, for radius 40 (scale by r / 40). */
  stationHub: () => memo('hub', () => picture(around(24), drawStationHub)),
  stationRing: () => memo('ring', () => picture(around(54), drawStationRing)),
  stationArms: () =>
    memo('arms', () =>
      picture({ x: -112, y: -4, w: 224, h: 66 }, (c) => {
        drawDockArm(c);
        drawRackArm(c, -1);
        drawRackArm(c, 1);
      }),
    ),
  /** A station part with its strut (afterburner: the booster ring), origin at the station centre. */
  stationPart: (id: StationPart, level: number) => {
    const lv = id === 'prospect' ? Math.min(8, Math.ceil(level / 5)) * 5 : id === 'sparedrones' ? Math.min(6, level) : 1;
    return memo(`part:${id}:${lv}`, () => picture(around(70), (c) => drawStationPart(c, id, lv)));
  },
  /** The scanner dish alone (rotate it ±30° over 6 s at stationPartPos('veinsense')). */
  scannerDish: () => memo('dish', () => picture(around(20), drawScannerDish)),
  beacon: (on: boolean) => memo(`beacon:${on}`, () => picture(around(9), (c) => drawBeacon(c, on))),
  /** Rig base, origin at the rock centre. */
  rigBase: (look: RigLook, stripes: number) => memo(`rig:${look}:${stripes}`, () => picture(around(26), (c) => drawRigBase(c, { look, stripes }))),
  rigLamp: (state: LampState) => memo(`lamp:${state}`, () => picture(around(7), (c) => drawRigLamp(c, state))),
  drillHead: (r: number) => memo(`head:${r}`, () => picture(around(r + 1), (c) => drawDrillHead(c, r))),
  pile: (ore: string, step: 0 | 1 | 2 | 3) => memo(`pile:${ore}:${step}`, () => picture(around(14), (c) => drawPile(c, ore, step))),
  ghostSlot: (r: number, price: string) => memo(`ghost:${r}:${price}`, () => picture({ x: -r - 2, y: -r - 2, w: r * 2 + 4, h: r * 2 + 14 }, (c) => drawGhostSlot(c, r, price))),
  seamRim: (r: number) => memo(`seam:${r}`, () => picture(around(r * 1.7), (c) => drawSeamRim(c, r))),
  flare: () => memo('flare', () => picture(around(12), (c) => drawFlare(c))),
  idleBadge: () => memo('badge', () => picture(around(9), drawIdleBadge)),
  pad: () => memo('pad', () => picture(around(34), drawPad)),
  chevron: () => memo('chevron', () => picture(around(12), (c) => drawChevron(c, 1))),
  /** The docked freighter as a still (the atlas carries it while it flies). */
  freighter: (hull: HullId, segments: number) => memo(`freighter:${hull}:${segments}`, () => picture(around(60), (c) => drawFreighter(c, { hull, segments }))),
  /** The starfield for a screen size and galaxy (keep at most the current one alive). */
  starfield: (w: number, h: number, galaxy: number) => memo(`stars:${w}:${h}:${galaxy}`, () => starfieldPicture(w, h, galaxy)),
};
