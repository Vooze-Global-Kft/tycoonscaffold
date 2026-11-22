/**
 * Pizza Empire: Restaurant Sim. The six store screenshots, in listing order. Captions in the game's
 * own voice (games/pizza-empire/game.json, store.description): warm, playful, at most six words.
 * Every caption is checked against the preview (scripts/store/README.md, "Scenes").
 * Preview switches: src/dev/devtools.ts.
 */
import type { GameScenes } from '../types';

const scenes: GameScenes = {
  game: 'pizza-empire',
  port: 8300,
  titleHas: 'Pizza',
  scenes: [
    {
      slug: 'bake-serve-grow',
      query: 'preset=mid',
      caption: 'Bake it, serve it, grow it!',
      sub: 'Your cooks, waiters and guests at work',
      shows: 'The home screen of a mid-game restaurant: cooks at the stations, waiters carrying pizza, guests at the tables, and the production chain below.',
    },
    {
      slug: 'fix-the-bottleneck',
      query: 'preset=late',
      caption: 'Find the slow spot and fix it',
      sub: 'More stations, more waiters, more tables',
      shows: 'A later restaurant (Canal Side) with the Kitchen, Waiters and Dining Room chain; one stage carries the "limits income" tag, the bottleneck the player fixes.',
    },
    {
      slug: 'collect-the-staff',
      query: 'preset=mid&tab=staff',
      caption: 'Collect a staff of twelve',
      sub: 'Level up the characters you love',
      shows: 'The Staff tab: chests at the top and the collection of twelve characters (rarities, levels, "can level up" marks).',
    },
    {
      slug: 'open-boxes',
      query: 'preset=mid&chest=golden',
      settle: 7000,
      steps: (v) => [{ tap: [v.w / 2, v.h * 0.55] }, { wait: 1600 }, { tap: [v.w / 2, v.h * 0.55] }, { wait: 1800 }],
      caption: 'Open boxes, meet new faces',
      sub: 'Boxes come from daily missions',
      shows: 'A Golden Oven Chest being opened: the cards it holds. Boxes are earned in play (missions reward them: "Every 30th mission: Golden Oven Chest").',
    },
    {
      slug: 'napoli-to-the-moon',
      query: 'preset=mid&tab=empire',
      caption: 'From Napoli all the way up',
      sub: 'Eight restaurants, one pizza planet',
      shows: 'The Franchise tab: the venues from Nonna\'s Corner in Napoli through Roma, Venezia, Paris, New York, Tokyo and The Moon to the pizza planet.',
    },
    {
      slug: 'recipes',
      query: 'preset=mid&tab=upgrades',
      caption: 'Cook up two dozen recipes',
      sub: 'Each one multiplies what you earn',
      shows: 'The Recipes tab: 24 recipes, each a multiplier on what the restaurant earns.',
    },
  ],
};

export default scenes;
