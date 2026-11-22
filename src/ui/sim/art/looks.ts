/**
 * The cast: defaults for a look, the named Pizza Empire characters, and a
 * deterministic generator for everyone else (customers, extra chefs, waiters).
 *
 * Looks are data. A game can keep its own in game.json; the named ones here
 * are the default pizza cast and double as examples of what a look can say.
 */
import { hashString, luma, mix, rng } from './draw';
import type { Beard, BodyShape, Brows, CharacterKind, CharacterLook, Glasses, HairStyle, Hat, LookEntry, Moustache, Neckwear, OutfitStyle, Pattern, Species } from './types';

/** A look with every default filled in. This is what the drawing code reads. */
export interface ResolvedLook {
  kind: CharacterKind;
  species: Species;
  body: BodyShape;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  outfit: string;
  accent: string;
  outfitStyle: OutfitStyle;
  pattern: Pattern;
  pants: string;
  shoes: string;
  hat: Hat;
  hatColor: string;
  apron: string | null;
  glasses: Glasses | null;
  moustache: Moustache | null;
  beard: Beard | null;
  earrings: string | null;
  blush: boolean;
  lashes: boolean;
  brows: Brows;
  neck: Neckwear;
  eyes: string;
}

const WHITE = '#FFFBF2';
const GOLD = '#FFC93C';
/** Every waiter wears this vest (a uniform reads as "staff" at 52 px); customers never get it. */
export const WAITER_VEST = '#A3263F';
/** The waiters' bow tie. */
export const WAITER_TIE = '#2B2130';

const KIND_DEFAULTS: Record<CharacterKind, { outfit: string; accent: string; outfitStyle: OutfitStyle; hat: Hat; neck: Neckwear; pants: string }> = {
  chef: { outfit: WHITE, accent: '#E63946', outfitStyle: 'chef', hat: 'toque', neck: 'kerchief', pants: '#47506B' },
  waiter: { outfit: WAITER_VEST, accent: WAITER_TIE, outfitStyle: 'vest', hat: 'none', neck: 'bowtie', pants: '#343A55' },
  customer: { outfit: '#4C8FE0', accent: '#FFD166', outfitStyle: 'tee', hat: 'none', neck: 'none', pants: '#4A5578' },
  manager: { outfit: '#55608F', accent: '#E63946', outfitStyle: 'suit', hat: 'none', neck: 'tie', pants: '#3D4568' },
};

function hatColorFor(hat: Hat, accent: string, outfit: string): string {
  switch (hat) {
    case 'toque':
    case 'minitoque':
      return WHITE;
    case 'tophat':
      return '#3A3340';
    case 'straw':
      return '#F0CB6E';
    case 'crown':
      return GOLD;
    case 'cap':
      return luma(outfit) > 0.8 ? accent : mix(outfit, '#000000', 0.12);
    default:
      return accent;
  }
}

/** Anything that says who a character is: a look entry from game.json, the name of a built-in look, or nothing (the default customer). */
export type LookInput = LookEntry | string | null | undefined;

/**
 * Applies the `preset` of a look entry: the built-in look of that name (or,
 * for a name that is not built in, a random but stable person seeded from the
 * name) with the entry's own fields on top. The result has no `preset` left
 * and only the fields somebody chose; `resolveLook` fills in the rest.
 */
export function expandLook(entry: LookInput): CharacterLook {
  if (!entry) return {};
  if (typeof entry === 'string') return lookFor(entry);
  const { preset, ...own } = entry;
  if (!preset) return own;
  const out: Record<string, unknown> = { ...lookFor(preset, own.kind ?? 'customer') };
  for (const [key, value] of Object.entries(own)) if (value !== undefined) out[key] = value;
  return out as CharacterLook;
}

/**
 * Turns a look entry into a complete look: applies `preset`, then fills in
 * every default (outfit and hat for the `kind`, colours, face details).
 *
 *   resolveLook({ preset: 'marco' })                    Chef Marco
 *   resolveLook({ preset: 'marco', hat: 'bandana' })    Marco in a bandana
 *   resolveLook({ kind: 'waiter' })                     the default waiter
 *   resolveLook({ preset: 'luigi', kind: 'chef' })      unknown name: a random chef, the same one every time
 *   resolveLook('nonna')                                a name alone works too
 *
 * Safe to call with `undefined` or `{}`, and with a look that is already
 * complete (it comes back unchanged), so the result can be stored or passed
 * on as a `look`.
 */
export function resolveLook(entry: LookInput): ResolvedLook {
  const l = expandLook(entry);
  const kind = l.kind ?? 'customer';
  const species = l.species ?? 'human';
  const k = KIND_DEFAULTS[kind];
  const outfit = l.outfit ?? k.outfit;
  const accent = l.accent ?? k.accent;
  const outfitStyle = l.outfitStyle ?? k.outfitStyle;
  const hat = l.hat ?? k.hat;
  const skin = l.skin ?? (species === 'alien' ? '#8ED36B' : species === 'robot' ? '#C8D4E0' : '#F6C9A0');
  const hairStyle = l.hairStyle ?? (species === 'human' ? 'short' : 'bald');
  const lightOutfit = luma(outfit) > 0.78;
  const apron =
    l.apron === true
      ? lightOutfit ? accent : WHITE
      : typeof l.apron === 'string'
        ? l.apron
        : l.apron === undefined && kind === 'waiter' && outfitStyle === 'vest'
          ? WHITE // part of the waiter uniform unless a look says otherwise
          : null;
  const pants = l.pants ?? (outfitStyle === 'overalls' || outfitStyle === 'spacesuit' || outfitStyle === 'robe' ? outfit : outfitStyle === 'suit' ? mix(outfit, '#000000', 0.12) : k.pants);
  return {
    kind,
    species,
    body: l.body ?? 'round',
    skin,
    hair: l.hair ?? '#5A3A22',
    hairStyle,
    outfit,
    accent,
    outfitStyle,
    pattern: l.pattern ?? 'plain',
    pants,
    shoes: l.shoes ?? (outfitStyle === 'spacesuit' ? accent : '#5B3A29'),
    hat,
    hatColor: l.hatColor ?? hatColorFor(hat, accent, outfit),
    apron,
    glasses: l.glasses === true ? 'round' : l.glasses ? l.glasses : null,
    moustache: l.moustache === true ? 'bushy' : l.moustache ? l.moustache : null,
    beard: l.beard === true ? 'full' : l.beard ? l.beard : null,
    earrings: l.earrings === true ? GOLD : typeof l.earrings === 'string' ? l.earrings : null,
    blush: l.blush ?? true,
    lashes: l.lashes ?? false,
    brows: l.brows ?? 'soft',
    neck: l.neck ?? (outfitStyle === k.outfitStyle ? k.neck : 'none'),
    eyes: l.eyes ?? (species === 'robot' ? '#6FE8F0' : '#3A2416'),
  };
}

/** A stable string for a look: equal looks share their drawings. */
export function lookKey(look: ResolvedLook): string {
  return JSON.stringify(look);
}

// ---------------------------------------------------------------------------
// The Pizza Empire cast
// ---------------------------------------------------------------------------

export const LOOKS = {
  /** Nonna Rosa: tiny grandmother, grey bun, round glasses, red polka-dot headscarf, apron. */
  nonna: {
    kind: 'chef',
    body: 'small',
    skin: '#F3C6A2',
    hair: '#C9C5C1',
    hairStyle: 'bun',
    outfit: '#6FA8A0',
    outfitStyle: 'dress',
    accent: '#E63946',
    hat: 'headscarf',
    pattern: 'dots',
    apron: '#FFFBF2',
    glasses: 'round',
    neck: 'none',
    shoes: '#7A4A3A',
    lashes: true,
  },
  /** Big Cheese Carl: smug rival in a mustard pinstripe suit, slicked black hair, thin moustache. */
  carl: {
    kind: 'manager',
    body: 'round',
    skin: '#EDB98A',
    hair: '#2E2428',
    hairStyle: 'slick',
    outfit: '#D9A21B',
    outfitStyle: 'suit',
    pattern: 'pinstripe',
    accent: '#8E2F4B',
    moustache: 'thin',
    brows: 'smug',
    neck: 'tie',
    shoes: '#3B2620',
    blush: false,
  },
  /** Tony Wheels: burly cook, black beard, red bandana. */
  tony: {
    kind: 'chef',
    body: 'round',
    skin: '#D99A6C',
    hair: '#2B2224',
    hairStyle: 'short',
    hat: 'bandana',
    hatColor: '#E63946',
    beard: 'full',
    brows: 'thick',
    apron: '#3F4A63',
    neck: 'none',
  },
  /** Chef Marco: slim chef, curled moustache, tall toque. */
  marco: {
    kind: 'chef',
    body: 'slim',
    skin: '#F6C9A0',
    hair: '#6B3F26',
    hairStyle: 'curly',
    hat: 'toque',
    moustache: 'curled',
    accent: '#E63946',
  },
  /** Speedy Sal: teenage rider, red helmet, goggles. */
  sal: {
    kind: 'waiter',
    body: 'slim',
    skin: '#F2C29B',
    hair: '#8A4B2A',
    hairStyle: 'spiky',
    outfit: '#2A9D8F',
    outfitStyle: 'tee',
    accent: '#FFD166',
    hat: 'helmet',
    hatColor: '#E63946',
    glasses: 'goggles',
    neck: 'scarf',
    pants: '#3D4568',
    shoes: '#E63946',
  },
  /** Dr. Freeze: scientist, white-blue hair, round glasses, lab coat. */
  freeze: {
    kind: 'manager',
    body: 'slim',
    skin: '#F1D2B8',
    hair: '#CFE8F7',
    hairStyle: 'wild',
    outfit: '#6FB7E9',
    outfitStyle: 'coat',
    accent: '#3C7FC2',
    glasses: 'round',
    brows: 'worried',
    neck: 'tie',
    pants: '#3F4A63',
  },
  /** Gina Glam: TV host, big auburn hair, earrings. */
  gina: {
    kind: 'manager',
    body: 'slim',
    skin: '#EDB98A',
    hair: '#A63D22',
    hairStyle: 'big',
    outfit: '#D6336C',
    outfitStyle: 'dress',
    accent: '#FFD166',
    earrings: true,
    lashes: true,
    neck: 'none',
    shoes: '#D6336C',
  },
  /** Farmer Fiona: farmer, ginger braids, straw hat. */
  fiona: {
    kind: 'customer',
    body: 'round',
    skin: '#F6C9A0',
    hair: '#E0762B',
    hairStyle: 'braids',
    outfit: '#4E7FBF',
    outfitStyle: 'overalls',
    accent: '#E8574A',
    pattern: 'stripes',
    hat: 'straw',
    lashes: true,
    shoes: '#6B4A2E',
  },
  /** Mayor Pepperoni: round, top hat, white moustache, red sash. */
  mayor: {
    kind: 'manager',
    body: 'round',
    skin: '#F3BE9B',
    hair: '#F2EEE8',
    hairStyle: 'short',
    outfit: '#3F3A4E',
    outfitStyle: 'suit',
    accent: '#E63946',
    hat: 'tophat',
    moustache: 'bushy',
    neck: 'sash',
    brows: 'thick',
  },
  /** Astro Al: astronaut with a tiny chef hat. */
  al: {
    kind: 'chef',
    body: 'round',
    skin: '#C98B5E',
    hair: '#3A2A22',
    hairStyle: 'short',
    outfit: '#F4F1EA',
    outfitStyle: 'spacesuit',
    accent: '#F28C38',
    hat: 'minitoque',
    neck: 'none',
  },
  /** The Overlord: small green three-eyed alien with a crown. */
  overlord: {
    kind: 'manager',
    species: 'alien',
    body: 'small',
    skin: '#8ED36B',
    outfit: '#7A4FC2',
    outfitStyle: 'robe',
    accent: '#FFC93C',
    hat: 'crown',
    neck: 'none',
    brows: 'none',
  },
} as const satisfies Record<string, CharacterLook>;

export type LookName = keyof typeof LOOKS;
export const LOOK_NAMES = Object.keys(LOOKS) as LookName[];

/** Looks up a built-in look; any other name gives a random but stable person of that `kind`, so a typo in game.json still draws someone. */
export function lookFor(name: string | undefined, kind: CharacterKind = 'customer'): CharacterLook {
  if (name && Object.prototype.hasOwnProperty.call(LOOKS, name)) return LOOKS[name as LookName];
  return randomLook(hashString(name ?? 'someone'), kind);
}

// ---------------------------------------------------------------------------
// Random people
// ---------------------------------------------------------------------------

const SKINS = ['#FFE0C7', '#F9D1B0', '#F6C9A0', '#EDB98A', '#E0A677', '#C98B5E', '#A9714B', '#8B5A3C', '#6E452E'];
const HAIRS = ['#2E2428', '#3F2A20', '#5A3A22', '#7A4A2A', '#A0522D', '#C0622B', '#E0A53A', '#F0D08A', '#B9B4AE', '#EFEAE2'];
const FUN_HAIRS = ['#E8789A', '#4FB8B0', '#6C8FE8', '#9B6DD6'];
const OUTFITS = ['#E5484D', '#F28C38', '#F5C542', '#57B26A', '#2A9D8F', '#4C8FE0', '#5B67D1', '#9B6DD6', '#EF7FA8', '#7FD1B9', '#F3E3C3', '#C45C8A', '#3FA7D6', '#8BC34A'];
const ACCENTS = ['#FFD166', '#FFFBF2', '#E63946', '#2A9D8F', '#F4A261', '#5B67D1', '#EF7FA8'];
const PANTS = ['#4A5578', '#3D4568', '#6B5A4A', '#5A6B8C', '#4F5B4A', '#7A5A6A', '#33384F'];
const SHOES = ['#5B3A29', '#3B2620', '#E63946', '#F5F0E6', '#3D4568', '#8A5A3A'];

function pick<T>(r: () => number, list: readonly T[]): T {
  return list[Math.floor(r() * list.length) % list.length];
}

/** Picks by weight: `[[value, weight], ...]`. */
function weighted<T>(r: () => number, table: readonly (readonly [T, number])[]): T {
  let total = 0;
  for (const [, w] of table) total += w;
  let x = r() * total;
  for (const [v, w] of table) {
    x -= w;
    if (x <= 0) return v;
  }
  return table[table.length - 1][0];
}

/**
 * A pleasant, varied person from a seed. The same seed and kind always give
 * the same look, so a customer keeps their face between sessions.
 */
export function randomLook(seed: number, kind: CharacterKind = 'customer'): CharacterLook {
  const r = rng(Math.imul(seed | 0, 2654435761) ^ hashString(kind));
  // Two loose styling groups so combinations stay believable (no braids with a beard) while everything else mixes freely.
  const a = r() < 0.5;
  const skin = pick(r, SKINS);
  const hair = r() < 0.08 ? pick(r, FUN_HAIRS) : pick(r, HAIRS);
  const hairStyle: HairStyle = a
    ? weighted(r, [['short', 5], ['slick', 2], ['curly', 3], ['spiky', 2], ['wild', 1], ['bald', 1.2]] as const)
    : weighted(r, [['long', 4], ['bob', 4], ['bun', 2.5], ['ponytail', 3.5], ['braids', 2], ['big', 2], ['curly', 2], ['short', 1.5]] as const);
  const body: BodyShape = weighted(r, [['round', 5], ['slim', 4], ['small', 1.6]] as const);
  const look: CharacterLook = { kind, skin, hair, hairStyle, body, shoes: pick(r, SHOES) };
  if (!a) look.lashes = r() < 0.8;
  if (r() < 0.16) look.glasses = weighted(r, [['round', 3], ['square', 2], ['shades', 0.7]] as const);
  if (a && hairStyle !== 'bald' ? r() < 0.2 : a && r() < 0.45) look.moustache = weighted(r, [['bushy', 3], ['curled', 1.5], ['thin', 1]] as const);
  if (a && !look.moustache && r() < 0.16) look.beard = weighted(r, [['full', 3], ['goatee', 2]] as const);
  if (!a && r() < 0.35) look.earrings = r() < 0.7 ? true : pick(r, ['#EF7FA8', '#7FD1B9', '#FFFBF2']);
  if (r() < 0.12) look.brows = 'thick';

  if (kind === 'chef') {
    look.hat = weighted(r, [['toque', 6], ['bandana', 2], ['cap', 1]] as const);
    // Big, wild or long hair pokes out of a toque in odd shapes: tidy it away.
    if (hairStyle === 'big' || hairStyle === 'wild' || hairStyle === 'long' || hairStyle === 'spiky') look.hairStyle = a ? 'short' : 'bun';
    look.accent = pick(r, ['#E63946', '#2A9D8F', '#F28C38', '#4C8FE0', '#57B26A']);
    if (look.hat === 'bandana' || look.hat === 'cap') look.hatColor = look.accent;
    if (r() < 0.45) look.apron = true;
    if (r() < 0.15) look.outfit = pick(r, ['#3F4A63', '#4A4458']);
    look.pants = pick(r, ['#47506B', '#3F4A63', '#5A5560']);
  } else if (kind === 'waiter') {
    // A uniform: the same burgundy vest, white shirt, white waist apron and a big dark bow tie on every waiter,
    // so staff read apart from guests at a glance (toque = chef, burgundy vest = waiter, anything else = guest).
    look.outfit = WAITER_VEST;
    look.accent = WAITER_TIE;
    look.outfitStyle = 'vest';
    look.neck = 'bowtie';
    look.apron = WHITE;
    look.pants = pick(r, ['#343A55', '#3A3340', '#3D3A45']);
  } else if (kind === 'manager') {
    look.outfit = pick(r, ['#55608F', '#6B4A6E', '#3F6B63', '#7A4A3A', '#4A4458', '#8A5A8F']);
    look.accent = pick(r, ['#E63946', '#FFD166', '#2A9D8F', '#F4A261']);
    look.outfitStyle = !a && r() < 0.4 ? 'dress' : 'suit';
    if (look.outfitStyle === 'suit' && r() < 0.25) look.pattern = 'pinstripe';
  } else {
    look.outfit = pick(r, OUTFITS);
    look.accent = pick(r, ACCENTS);
    look.pants = pick(r, PANTS);
    look.outfitStyle = a
      ? weighted(r, [['tee', 6], ['suit', 1], ['overalls', 1], ['coat', 0.5]] as const)
      : weighted(r, [['tee', 4], ['dress', 4], ['overalls', 1], ['coat', 0.5]] as const);
    look.pattern = look.outfitStyle === 'tee' || look.outfitStyle === 'dress' ? weighted(r, [['plain', 5], ['stripes', 2], ['dots', 1.5]] as const) : 'plain';
    if (look.outfitStyle === 'suit') look.neck = r() < 0.5 ? 'tie' : 'bowtie';
    else if (r() < 0.12) look.neck = 'scarf';
    const hat: Hat = a
      ? weighted(r, [['none', 8], ['cap', 1.6], ['beanie', 1], ['tophat', 0.3], ['straw', 0.4]] as const)
      : weighted(r, [['none', 8], ['bow', 1.6], ['beanie', 0.8], ['straw', 0.6], ['cap', 0.5]] as const);
    if (hat !== 'none') look.hat = hat;
    if (hat === 'beanie') look.hatColor = pick(r, OUTFITS);
  }
  return look;
}
