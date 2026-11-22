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
  // The feature graphic: the restaurant scene of the first shot, from the venue's name plate down
  // to just above the stage pills and their "limits income" tag (no header, no list).
  feature: { scene: 1, frame: () => ({ y0: { text: /^Nonna['’]s Corner$/, edge: 'top', pad: -10 }, y1: { text: /limits income/, edge: 'top', pad: -6 } }) },
  scenes: [
    {
      slug: 'bake-serve-grow',
      query: 'preset=mid',
      // The game's tutorial hand keeps pointing at the missions clipboard on a preset save (the hint
      // script counts it as a new player: src/engine/meta.ts nextHint). The hand hides for 600 ms
      // after any touch (src/ui/hints/HintOverlay.tsx): touch the BUY label (it does nothing) and
      // take the picture after one frame.
      // (Twice: after the first touch on a fresh page the hand can come back before the picture.)
      steps: () => [{ tapText: /^buy$/i }, { wait: 1500 }, { tapText: /^buy$/i }],
      shotFrames: 1,
      caption: 'Bake it, serve it,\ngrow it!',
      sub: 'Your cooks, waiters and guests at work',
      shows: 'The home screen of a mid-game restaurant: cooks at the stations, waiters carrying pizza, guests at the tables, and the production chain below.',
    },
    {
      slug: 'fix-the-bottleneck',
      // The busy mid-game restaurant with its bottleneck stage opened: the Dining Room pill carries
      // the game's own "limits income" tag, and its row shows the buy that lifts it. The list under
      // one stage is short, so the card shows the screen down to the stage's text only (no empty
      // cream). preset=early showed the same with the tutorial hand on (a first-minutes save).
      query: 'preset=mid',
      steps: () => [{ tapText: /^Dining Room$/ }, { wait: 1500 }, { tapText: /^buy$/i }],
      shotFrames: 1,
      check: (t) => (/limits income/i.test(t) ? null : 'no "limits income" tag on screen'),
      frame: () => ({ y0: 0, y1: { text: /^Guests sit in the dining room/, edge: 'bottom', pad: 18 }, anchor: 'top' }),
      caption: 'Find the slow spot\nand fix it',
      sub: 'Upgrade the stage that limits income',
      shows: 'The mid-game restaurant at work with the Dining Room stage open: its pill is tagged "limits income" by the game, and its row offers the upgrade (more tables, more per guest). The card shows the screen down to the stage\'s description.',
    },
    {
      slug: 'collect-the-staff',
      query: 'preset=mid&tab=staff',
      caption: 'Collect a staff\nof twelve',
      sub: 'Level up the characters you love',
      shows: 'The Staff tab: chests at the top and the collection of twelve characters (rarities, levels, "can level up" marks).',
    },
    {
      slug: 'open-boxes',
      query: 'preset=mid&chest=golden',
      settle: 7000,
      steps: (v) => [{ tap: [v.w / 2, v.h * 0.55] }, { wait: 1600 }, { tap: [v.w / 2, v.h * 0.55] }, { wait: 1800 }],
      caption: 'Open boxes,\nmeet new faces',
      sub: 'Boxes come from daily missions',
      shows: 'A Golden Oven Chest being opened: the cards it holds. Boxes are earned in play (missions reward them: "Every 30th mission: Golden Oven Chest").',
    },
    {
      slug: 'napoli-to-the-world',
      // A late save: three restaurants open (Napoli, Roma, Canal Side in Venezia, on screen), Bistro
      // Pepe in Paris next, New York and Tokyo after it. The card ends below Tokyo's row: the
      // venues after it (The Moon, Deep Space) are not in the picture, so the listing stays on Earth
      // next to the same developer's space game.
      query: 'preset=late&tab=empire',
      check: (t) => (/Canal Side/.test(t) && /Bistro Pepe/.test(t) && /Tokyo/.test(t) ? null : 'the venue list is not the late one'),
      frame: () => ({ y0: 0, y1: { text: /^Opens after New York$/, edge: 'bottom', pad: 22 }, anchor: 'top' }),
      caption: 'From Napoli\nto the world',
      sub: 'Open restaurants from Roma to Tokyo',
      shows: 'The Franchise tab of a late save: Nonna\'s Corner (Napoli), Trattoria Roma and Canal Side (Venezia, on screen) open and earning, Bistro Pepe in Paris next with its unlock price and time, New York and Tokyo after it. The picture ends below Tokyo\'s row.',
    },
    {
      slug: 'recipes',
      query: 'preset=mid&tab=upgrades',
      caption: 'Cook up\ntwo dozen recipes',
      sub: 'Each one multiplies what you earn',
      shows: 'The Recipes tab: 24 recipes, each a multiplier on what the restaurant earns.',
    },
  ],
};

export default scenes;
