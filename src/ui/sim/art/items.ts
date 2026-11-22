/**
 * Small things: dishes, what characters hold, and the little effects that
 * float around them. Drawn in the same units as the characters (a dish is
 * about 26 units wide), in the 3/4 top view the tables use.
 */
import type { SkPicture } from '@shopify/react-native-skia';
import { OUTLINE, type Pen, alpha, arc, blob, circle, curve, ellipse, heart, lightOf, line, merged, mix, poly, record, rrect, shadeOf, twinkle } from './draw';
import type { DishColors, DishKind, DishLook } from './types';

export const DISH_DEFAULTS: Record<DishKind, Required<DishColors>> = {
  pizza: { food: '#FAD46B', topping: '#D8432F', garnish: '#4FA64F', plate: '#E8B36B' },
  plate: { food: '#F2C14E', topping: '#D8432F', garnish: '#5DBB63', plate: '#FFFBF2' },
  bowl: { food: '#F5D57E', topping: '#D8432F', garnish: '#5DBB63', plate: '#FFFBF2' },
  dessert: { food: '#FBE6C4', topping: '#F28CA8', garnish: '#8B5A3C', plate: '#BFE6F5' },
  cup: { food: '#6B4226', topping: '#E9D2A6', garnish: '#FFFFFF', plate: '#FFFBF2' },
  bites: { food: '#E9A53F', topping: '#C97B2A', garnish: '#5DBB63', plate: '#FFFBF2' },
};

export interface ResolvedDish extends Required<DishColors> {
  kind: DishKind;
}

export function resolveDish(dish?: DishLook | DishKind | null): ResolvedDish {
  const d: DishLook = typeof dish === 'string' ? { kind: dish } : (dish ?? {});
  const kind = d.kind ?? 'pizza';
  const base = DISH_DEFAULTS[kind];
  return { kind, food: d.food ?? base.food, topping: d.topping ?? base.topping, garnish: d.garnish ?? base.garnish, plate: d.plate ?? base.plate };
}

const OW = 2.3;

function drawPlate(p: Pen, c: string) {
  p.shape(ellipse(0, 1.2, 13, 5.2), shadeOf(c), { ow: OW, shade: false });
  p.shape(ellipse(0, 0, 13, 5.2), c, { ow: OW, shade: false });
  p.fill(ellipse(0, 0.3, 9.2, 3.3), shadeOf(c, 0.7));
}

/** Draws a dish centred on the middle of its base. About 26 x 14 units. */
export function drawDish(p: Pen, d: ResolvedDish) {
  switch (d.kind) {
    case 'pizza': {
      const crust = d.plate;
      p.shape(ellipse(0, 1.7, 13, 5.6), shadeOf(crust, 1.3), { ow: OW, shade: false });
      p.shape(ellipse(0, 0, 13, 5.6), crust, { ow: OW, shade: false });
      p.fill(ellipse(0, -0.1, 10.7, 4.3), mix(d.topping, '#FF7A3D', 0.3));
      p.fill(ellipse(0, -0.25, 9.6, 3.7), d.food);
      p.fill(ellipse(2.5, 0.9, 5.5, 1.6), shadeOf(d.food, 0.6));
      for (const [x, y] of [[-5.2, -1.1], [3.6, -1.9], [0.2, 1.4], [6.2, 0.7], [-2, -2.3]]) {
        p.fill(ellipse(x, y, 2, 1.15), shadeOf(d.topping, 1.2));
        p.fill(ellipse(x - 0.2, y - 0.2, 1.5, 0.8), d.topping);
      }
      p.fill(ellipse(-1.2, 0, 1.7, 0.8, 25), d.garnish);
      p.fill(ellipse(4.8, -0.2, 1.5, 0.7, -30), d.garnish);
      p.shine(arc(0, 0, 11.8, 4.7, 195, 50), lightOf(crust), 1.5, 0.9);
      break;
    }
    case 'bowl': {
      const c = d.plate;
      const body = blob([[-11.5, -4, 0], [11.5, -4, 0], [9.5, 2], [5, 5.2], [-5, 5.2], [-9.5, 2]]);
      p.shape(body, c, { ow: OW, shade: 2.2 });
      p.shape(ellipse(0, -4, 11.5, 3.2), c, { ow: OW, shade: false });
      p.fill(ellipse(0, -3.9, 9.6, 2.2), d.food);
      p.fill(blob([[-8, -4.4, 0], [-5.6, -8.2], [0, -9.9], [5.6, -8.2], [8, -4.4, 0], [0, -2.4]]), d.food);
      p.stroke(arc(-1.5, -6.5, 3.4, 2, 190, 150), shadeOf(d.food), 1.2);
      p.stroke(arc(3.5, -6, 2.6, 1.6, 200, 150), shadeOf(d.food), 1.2);
      p.shape(circle(1, -9.4, 2.7), d.topping, { ow: 1.6, shade: false });
      p.fill(ellipse(-2.8, -9, 1.7, 0.9, -30), d.garnish);
      p.stroke(arc(0, 0, 9, 3.6, 30, 120), d.topping, 1.5);
      break;
    }
    case 'dessert': {
      const glass = d.plate;
      p.shape(ellipse(0, 5.6, 6, 2), glass, { ow: OW, shade: false });
      p.shape(circle(-3.6, -6.4, 5), d.food, { ow: OW, shade: 1.6 });
      p.shape(circle(4, -6, 4.8), d.topping, { ow: OW, shade: 1.6 });
      p.shape(circle(0.3, -10.6, 4.5), mix(d.food, d.topping, 0.5), { ow: OW, shade: 1.6 });
      p.shape(poly([[5.5, -17.5], [9.5, -15.5], [5.6, -8.6]]), d.garnish, { ow: 1.6, shade: false });
      p.shape(circle(-1, -15.2, 2.1), '#E63946', { ow: 1.5, shade: false });
      p.shape(poly([[-8, -3.6], [8, -3.6], [4.6, 5], [-4.6, 5]]), glass, { ow: OW, shade: 1.6 });
      p.shine(line(-5, -1.6, -3.4, 2.6), '#FFFFFF', 1.5, 0.8);
      break;
    }
    case 'cup': {
      const c = d.plate;
      p.shape(ellipse(0, 3.8, 11.5, 3.8), c, { ow: OW, shade: false });
      p.fill(ellipse(0, 4, 8, 2.3), shadeOf(c, 0.7));
      p.stroke(arc(7, -1, 3.4, 3, -80, 170), OUTLINE, 4);
      p.stroke(arc(7, -1, 3.4, 3, -80, 170), c, 1.7);
      p.shape(blob([[-6.5, -5, 0], [6.5, -5, 0], [5.6, 1.5], [0, 4.2], [-5.6, 1.5]]), c, { ow: OW, shade: 1.8 });
      p.shape(ellipse(0, -5, 6.5, 2.2), c, { ow: OW, shade: false });
      p.fill(ellipse(0, -4.9, 5, 1.5), d.food);
      p.fill(ellipse(-0.8, -5, 2.4, 0.7), d.topping);
      p.stroke(line(-5.4, -1.4, 5.4, -1.4), d.garnish === '#FFFFFF' ? '#E63946' : d.garnish, 1.5, true);
      for (const x of [-2.2, 2.4])
        p.shine(curve([[x, -8], [x + 1.6, -10.5], [x - 0.4, -13], [x + 1, -15.5]]), '#FFFFFF', 1.5, 0.75);
      break;
    }
    case 'bites': {
      drawPlate(p, d.plate);
      p.fill(ellipse(-6.5, 0.8, 2, 1, 20), d.garnish);
      for (const [x, y] of [[-4.6, -2.6], [4.8, -2.4], [0.2, -6.6]]) {
        p.shape(circle(x, y, 4), d.food, { ow: OW, shade: 1.5, shadeColor: d.topping });
        p.dot(x - 1.4, y - 1.5, 1, lightOf(d.food));
      }
      break;
    }
    default: {
      drawPlate(p, d.plate);
      p.shape(blob([[-7.8, 0.4], [-6.2, -4.8], [0, -7.4], [6.2, -4.8], [7.8, 0.4], [0, 2.8]]), d.food, { ow: OW, shade: 1.8 });
      p.shape(blob([[-4.2, -4.6], [0, -7.6], [4.4, -4.8], [2.2, -2.6], [-1.4, -2.2]]), d.topping, { ow: 1.5, shade: false });
      p.fill(ellipse(1.2, -6.6, 1.8, 0.9, -25), d.garnish);
    }
  }
}

/** A mouthful: a pizza slice, or a forkful of the dish's food. Held at the origin. */
export function drawBite(p: Pen, d: ResolvedDish) {
  if (d.kind === 'pizza') {
    const slice = poly([[-2.5, -11.5], [-8, -1], [4.2, 1.4]]);
    p.shape(slice, d.food, { ow: 2, shade: false });
    p.stroke(line(-8, -1, 4.2, 1.4), OUTLINE, 5.2);
    p.stroke(line(-8, -1, 4.2, 1.4), d.plate, 2.8);
    p.dot(-2.4, -4.4, 1.5, d.topping);
    p.dot(-0.6, -1.4, 1.2, d.topping);
    return;
  }
  if (d.kind === 'cup') {
    p.shape(blob([[-4, -8, 0], [4, -8, 0], [3.4, -3], [0, -1.2], [-3.4, -3]]), d.plate, { ow: 2, shade: 1.2 });
    p.fill(ellipse(0, -8, 3, 0.9), d.food);
    return;
  }
  const handle = line(1.5, 2, -2.2, -7);
  p.stroke(handle, OUTLINE, 3.6);
  p.stroke(handle, '#DCE3EA', 1.5);
  p.shape(circle(-3, -9.6, 3.5), d.kind === 'dessert' ? d.topping : d.food, { ow: 1.9, shade: 1.2 });
}

export interface DishArt {
  dish: SkPicture;
  /** The dish on a serving tray; origin under the middle of the tray. */
  tray: SkPicture;
  bite: SkPicture;
  /** A thought bubble showing the dish; origin at the middle of the cloud. */
  bubble: SkPicture;
}

export function drawTray(p: Pen, metal = '#D5DCE5') {
  p.shape(ellipse(0, -0.2, 16, 4.5), shadeOf(metal, 1.2), { ow: OW, shade: false });
  p.shape(ellipse(0, -1.6, 16, 4.5), metal, { ow: OW, shade: false });
  p.stroke(arc(0, -1.6, 13.4, 3.2, 185, 80), '#FFFFFF', 1.3);
}

function buildDishArt(d: ResolvedDish): DishArt {
  return {
    dish: record((p) => drawDish(p, d)),
    tray: record((p) => {
      drawTray(p);
      p.at(0, d.kind === 'cup' ? -6 : d.kind === 'dessert' ? -7.6 : d.kind === 'bowl' ? -7 : -3.6, () => drawDish(p, d), 0, 0.92);
    }),
    bite: record((p) => drawBite(p, d)),
    bubble: record((p) => {
      p.shape(circle(-12, 12.5, 3), '#FFFFFF', { ow: 2, shade: false });
      p.shape(circle(-16.5, 17.5, 1.8), '#FFFFFF', { ow: 1.8, shade: false });
      const cloud = merged(rrect(-11, -7.5, 22, 15, 7.5), circle(-8.5, 1, 7), circle(8.5, 1.5, 7), circle(-3.5, -5, 7.4), circle(4.5, -4.5, 7.6), circle(0.5, 4.5, 7));
      p.shape(cloud, '#FFFFFF', { ow: 2.4, shade: 1.8, shadeColor: '#E9E2D6' });
      if (d.kind === 'pizza') {
        const slice = poly([[0.5, 7.5], [-6.5, -5], [7.5, -5]]);
        p.shape(slice, d.food, { ow: 1.8, shade: false });
        p.stroke(line(-6.5, -5, 7.5, -5), OUTLINE, 4.8);
        p.stroke(line(-6.5, -5, 7.5, -5), d.plate, 2.5);
        p.dot(-1.2, -0.6, 1.5, d.topping);
        p.dot(2.4, 1.2, 1.2, d.topping);
        p.dot(1, 3.8, 0.9, d.garnish);
      } else {
        p.at(0.5, d.kind === 'plate' || d.kind === 'bites' ? 3 : 4.2, () => drawDish(p, d), 0, 0.6);
      }
    }),
  };
}

const dishCache = new Map<string, DishArt>();
/** Pictures for a dish. Dishes are few, so they are kept for the life of the app. */
export function dishArt(dish?: DishLook | DishKind | null): DishArt {
  const d = resolveDish(dish);
  const key = JSON.stringify(d);
  let a = dishCache.get(key);
  if (!a) {
    a = buildDishArt(d);
    dishCache.set(key, a);
  }
  return a;
}

export interface CommonArt {
  shadow: SkPicture;
  dough: SkPicture;
  bowl: SkPicture;
  spoon: SkPicture;
  z: SkPicture;
  heart: SkPicture;
  crumb: SkPicture;
  spark: SkPicture;
}

export function drawShadow(p: Pen, rx = 16, ry = 4.6, strength = 1) {
  p.fill(ellipse(0, 0, rx, ry), alpha('#3A2416', 0.13 * strength));
  p.fill(ellipse(0, 0, rx * 0.72, ry * 0.7), alpha('#3A2416', 0.13 * strength));
}

export function drawZ(p: Pen, s = 1) {
  const z = poly([[-4.4 * s, -4.6 * s], [4.4 * s, -4.6 * s], [4.4 * s, -2.4 * s], [-0.6 * s, 2.3 * s], [4.4 * s, 2.3 * s], [4.4 * s, 4.6 * s], [-4.4 * s, 4.6 * s], [-4.4 * s, 2.4 * s], [0.6 * s, -2.3 * s], [-4.4 * s, -2.3 * s]]);
  p.shape(z, '#DDF1FF', { ow: 1.9, shade: false });
}

export function drawHeart(p: Pen, s = 4.4, color = '#FF5A7A') {
  p.shape(heart(0, 0, s), color, { ow: 1.9, shade: false });
  p.dot(-s * 0.42, -s * 0.36, s * 0.2, alpha('#FFFFFF', 0.9));
}

export function drawSpark(p: Pen, r = 7, color = '#FFE066') {
  p.shape(twinkle(0, 0, r), color, { ow: 1.8, shade: false });
  p.fill(twinkle(-r * 0.12, -r * 0.12, r * 0.42), '#FFFFFF');
}

let common: CommonArt | null = null;
/** Look-independent pieces every character shares. */
export function commonArt(): CommonArt {
  if (common) return common;
  common = {
    shadow: record((p) => drawShadow(p)),
    dough: record((p) => {
      const c = '#F7E4BE';
      p.shape(ellipse(0, 1.6, 16, 5.4), shadeOf(c, 1.3), { ow: 2.4, shade: false });
      p.shape(ellipse(0, 0, 16, 5.4), c, { ow: 2.4, shade: false });
      p.fill(ellipse(2.5, 1.2, 9.5, 2.4), shadeOf(c, 0.6));
      p.shine(arc(0, 0, 13, 3.6, 195, 60), '#FFFFFF', 1.6, 0.95);
    }),
    bowl: record((p) => {
      const c = '#DCE4EC';
      p.shape(blob([[-10.5, -3.4, 0], [10.5, -3.4, 0], [8.4, 3.6], [0, 6.6], [-8.4, 3.6]]), c, { ow: 2.4, shade: 2 });
      p.shape(ellipse(0, -3.4, 10.5, 3), lightOf(c, 0.6), { ow: 2.4, shade: false });
      p.fill(ellipse(0, -3.2, 8.4, 2), '#F7E4BE');
      p.shine(line(-7, 0, -5.4, 2.8), '#FFFFFF', 1.5, 0.85);
    }),
    spoon: record((p) => {
      const h = line(0, -3.5, 1.2, 12.5);
      p.stroke(h, OUTLINE, 4.4);
      p.stroke(h, '#C98B4A', 2);
    }),
    z: record((p) => drawZ(p)),
    heart: record((p) => drawHeart(p)),
    crumb: record((p) => {
      p.shape(blob([[-1.8, -0.4], [0.2, -1.8], [1.9, 0], [0.4, 1.7]]), '#E8B36B', { ow: 1.1, shade: false });
    }),
    spark: record((p) => drawSpark(p)),
  };
  return common;
}
