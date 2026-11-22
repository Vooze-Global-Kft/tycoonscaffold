/**
 * Who works and eats in the room: looks for cooks, waiters and guests, and the dish each station
 * makes. Everything is derived from the config (cast ids) or seeded from stable numbers, so the same
 * venue always has the same staff and every guest looks the same each time they come back.
 */
import type { GameConfig } from '../../../../config/schema';
import { randomLook, type LookInput } from '../../art';
import { hashString } from '../../art/draw';
import type { CharacterLook, DishLook } from '../../art/types';
import type { StationArtKind } from '../../art/props';
import type { Pose } from '../../art/types';

const STATION_KINDS: readonly StationArtKind[] = ['oven', 'stove', 'prep', 'fryer', 'dessert', 'espresso', 'generic'];

/** The drawing for a business: its `stationKind`, or the generic station. */
export function stationKindOf(kind: string | undefined): StationArtKind {
  return STATION_KINDS.includes(kind as StationArtKind) ? (kind as StationArtKind) : 'generic';
}

/** The pose a cook takes while the station runs: dough flies at an oven, everything else is stirred. */
export function workPoseOf(kind: StationArtKind): Pose {
  return kind === 'oven' ? 'toss' : 'cook';
}

/** What each kind of station sends to the pass. Generic shapes and colours, no game words. */
const DISHES: Record<StationArtKind, DishLook> = {
  oven: { kind: 'pizza' },
  prep: { kind: 'bites', food: '#E9B872', topping: '#E5484D', garnish: '#57B26A' },
  stove: { kind: 'bowl', food: '#F2C14E', topping: '#D1495B', garnish: '#57B26A' },
  fryer: { kind: 'bites', food: '#D98E32', topping: '#F5C542' },
  dessert: { kind: 'dessert', food: '#F7C5D9', topping: '#8E5B3A' },
  espresso: { kind: 'cup', food: '#6B3E26' },
  generic: { kind: 'plate', food: '#F2C14E', topping: '#E5484D', garnish: '#57B26A' },
};

export function dishOf(kind: StationArtKind): DishLook {
  return DISHES[kind];
}

/** A cast id from the config, resolved through the game's cast (an unknown id still draws a stable person). */
function castLook(cfg: GameConfig, id: string): LookInput {
  return (cfg.cast[id] as LookInput) ?? id;
}

/**
 * The cook at a station: the business's `workerLook`, or a chef seeded by venue and station so each
 * venue has its own kitchen crew. Generated cooks wear the production stage colour at the neck (and
 * on a bandana when they wear one), so the kitchen reads as one team.
 */
export function cookLook(cfg: GameConfig, venueId: string, businessId: string, stageColor: string): LookInput {
  const b = cfg.businesses.find((x) => x.id === businessId);
  if (b?.workerLook) return castLook(cfg, b.workerLook);
  const look: CharacterLook = { ...randomLook(hashString(`${venueId}:${businessId}`), 'chef'), accent: stageColor };
  if (look.hat === 'bandana' || look.hat === 'cap') look.hatColor = stageColor;
  return look;
}

/** Uniforms, one per 25 transport levels, then round again with the stage colour mixed in. */
const UNIFORMS: readonly Partial<CharacterLook>[] = [
  {},
  { outfitStyle: 'vest', outfit: '#2B2D42', accent: '#F2C14E' },
  { outfitStyle: 'suit', outfit: '#23262F', accent: '#E5484D', neck: 'bowtie' },
  { outfitStyle: 'coat', outfit: '#FFFBF2', accent: '#2B2130', neck: 'bowtie' },
  { outfitStyle: 'vest', outfit: '#5B3A7A', accent: '#FFD166' },
  { outfitStyle: 'suit', outfit: '#1E4D5C', accent: '#FFD166', neck: 'tie' },
];

/**
 * Waiter number `index`. The transport stage colour is on the apron; the uniform changes with the
 * decor tier, so levelling waiters keeps showing in the room.
 */
export function waiterLook(cfg: GameConfig, venueId: string, index: number, uniformTier: number, stageColor: string): LookInput {
  const looks = cfg.sim?.transport.looks ?? [];
  const uniform = UNIFORMS[uniformTier % UNIFORMS.length];
  const apron = stageColor;
  if (looks.length > 0) {
    const entry = castLook(cfg, looks[index % looks.length]);
    if (typeof entry === 'string') return { preset: entry, ...uniform, apron };
    return { ...(entry ?? {}), ...uniform, apron } as LookInput;
  }
  return { ...randomLook(hashString(`${venueId}:waiter:${index}`), 'waiter'), ...uniform, apron };
}

/**
 * A guest at seat `seat` on visit `guest`. Seeded by both and by a small cycle of visits, so the room
 * has variety without building an endless number of drawings.
 */
export function guestLook(cfg: GameConfig, seat: number, guest: number): LookInput {
  const looks = cfg.sim?.sales.looks ?? [];
  // About one guest in five is a familiar face from the cast, when the game has one for guests.
  if (looks.length > 0 && guest % 5 === 0) return castLook(cfg, looks[Math.floor(guest / 5) % looks.length]);
  return randomLook(seat * 977 + (guest % 7) * 131 + 17, 'customer');
}
