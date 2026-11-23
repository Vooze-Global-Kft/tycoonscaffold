/**
 * Lantern Row. The six store screenshots, board first (spec 7.4, as revised in the store package's
 * SCREENSHOTS.md): a merge under the fox's waiting ticket; that ticket stamped and folding into a
 * lantern; the paper dragon with its gold ticket; the Ladder Book; the Lantern Gate; the Autumn Moon
 * board with its moon gate. Captions in the lantern-calm voice (spec 7.3), at most 40 characters,
 * set in the game's paper-cut letters by templates/tag.ts.
 *
 * Every picture is a real state of the game in the shared web preview (port 8302): the app's own
 * new game, the presets played by the balance bot (src/modes/merge/presets.web.ts), the spokes'
 * and sheets' switches (src/ui/merge/spokes/dev.web.ts), the beats slowed with `fxSlow`
 * (src/ui/merge/play/devSlow.web.ts). Touches are placed with the game's own geometry
 * (src/ui/merge/layout.ts mergeLayout, play/geometry.ts cellCentre: the functions the screen and its
 * hit test use), so they land on the same cells at every phone size. The preview has no safe-area
 * insets.
 *
 * Owls: none in shots 1 and 2 (spec 7.2). They are staged in the first seconds of a new game, before
 * the Tea stall (whose minder is an owl) opens: only the fox stands at a counter.
 */
import { mergeLayout, type MergeLayout } from '../../../src/ui/merge/layout';
import { cellCentre } from '../../../src/ui/merge/play/geometry';
import type { BandSpec, GameScenes, P, View } from '../types';

const layout = (v: View): MergeLayout => mergeLayout(v.w, v.h, { top: 0, bottom: 0 });
const cell = (v: View, i: number): P => {
  const c = cellCentre(layout(v), i);
  return [c.x, c.y];
};
/** The centre of counter j's ticket while two counters stand (the first season's opening). */
const ticket = (v: View, j: number): P => {
  const r = layout(v).counters[2][j];
  return [r.x + r.w / 2, r.y + r.h - 50];
};

/** The main screen: from the top bar to just under the board (the bottom row of buttons left out). */
const boardBand = (v: View): BandSpec => {
  const L = layout(v);
  return { y0: 0, y1: L.board.y + L.board.h + 6, anchor: 'top' };
};

// The opening board (src/engine/merge/create.ts): six Pepper Skewers in the third row, cells 14 to 19.
const SKEWERS = [14, 15, 16, 17, 18, 19];

const scenes: GameScenes = {
  game: 'night-market',
  port: 8302,
  titleHas: 'Lantern',
  // The street at a Parade (scene 3): stall fronts, the Festival banner, the counters with the dragon
  // and its gold ticket, and the board's top rows.
  feature: {
    scene: 3,
    frame: (v) => {
      const L = layout(v);
      return { y0: L.street.y, y1: L.street.y + Math.round(v.w * 0.875), anchor: 'top' };
    },
  },
  scenes: [
    {
      slug: 'two-of-a-kind',
      // A new game in its first seconds: the fox's paper ticket (one line, a Twin Skewer, its price
      // printed in the box), the gear rail along the board's top edge, six skewers. A finger holds a
      // Pepper Skewer dragged onto its twin: the good floats above the finger, the twin is outlined.
      query: 'preset=fresh',
      settle: 9000,
      steps: (v) => [{ down: cell(v, SKEWERS[2]) }, { move: cell(v, SKEWERS[1]), steps: 12 }, { wait: 700 }],
      frame: boardBand,
      caption: 'Two of a kind make one finer snack',
      shows: 'The first seconds of a new game: the fox at its counter holding a paper ticket for a Twin Skewer with the printed price 12, the Grill stall front above, the gear rail along the board, the six opening Pepper Skewers, one held mid-drag over its twin.',
    },
    {
      slug: 'ticket-folds',
      // Two skewers merged into a Twin Skewer, dragged onto the fox's ticket: the FILLED stamp
      // falls and the ticket folds into a paper lantern that floats to the purse (play/beats.ts,
      // played six times slower so the picture can catch the fold).
      query: 'preset=fresh&fxSlow=6',
      settle: 9000,
      steps: (v) => [
        // Each drag as a finger: down, a slow move, a short hold, up (a release in the same instant
        // as the last move is not seen by the gesture on a busy machine).
        { down: cell(v, SKEWERS[0]) },
        { move: cell(v, SKEWERS[1]), steps: 12 },
        { wait: 400 },
        { up: true },
        { wait: 2000 },
        { down: cell(v, SKEWERS[1]) },
        { move: ticket(v, 0), steps: 14 },
        { wait: 400 },
        { up: true },
        { wait: 4700 },
      ],
      shotFrames: 1,
      frame: boardBand,
      caption: 'A full ticket folds into a paper lantern',
      shows: "The fox's ticket filled: the stamp on it and the paper folding into a lantern above the counter, the board below with the remaining skewers.",
    },
    {
      slug: 'paper-dragon',
      // The late preset (the bot's first season, one Festival line left) has a Parade out: the
      // paper dragon at a counter with its gold ticket of lines from several stalls.
      query: 'preset=late',
      settle: 12000,
      // The preset's Parade is not always still out when the picture is taken: the gold ticket is
      // looked for in the game's state (the preview's test hook, src/ui/merge/play/devSlow.web.ts).
      pageCheck: "const g = globalThis.__lanternPlay?.game(); return g && g.merge.counters.some((c) => c.ticket && c.ticket.gold) ? null : 'no Parade ticket at a counter';",
      tries: 4,
      frame: boardBand,
      caption: 'A paper dragon brings a gold ticket',
      shows: 'Late in the first season: four counters, one held by the paper dragon of the Parade with its gold ticket, the stall fronts with their minders, the Festival banner, a full board of skewers, teas, buns and sweets.',
    },
    {
      slug: 'ladder-book',
      query: 'preset=mid&spoke=book',
      settle: 12000,
      frame: () => ({ y0: 0, y1: { text: /^A good made for the first time/, edge: 'bottom', pad: 24 }, anchor: 'top' }),
      caption: 'Each new snack stamps the Ladder Book',
      shows: 'The Ladder Book at the mid preset: the six ladders as tabs with their counts, the Grill ladder open with its stamped rungs, names and ticket values, the next rung not made yet.',
    },
    {
      slug: 'lantern-gate',
      query: 'preset=mid&spoke=lanterns',
      settle: 12000,
      // Down to the first lit feat: zoomed in a little so the picture ends under a whole card.
      frame: () => ({ y0: 0, y1: { text: /^lit$/i, edge: 'bottom', pad: 84 }, anchor: 'top', maxZoom: 1.2 }),
      caption: 'Twenty lanterns, each lit by a feat',
      shows: 'The Lantern Gate at the mid preset: the arch with its twenty hooks, the lanterns lit so far, and the feats that light the next ones with their progress.',
    },
    {
      slug: 'autumn-moon',
      // The third season, reached by playing: the late preset's first season closed (its Festival
      // filled by the preview's switch, the close itself the game's own), saved; on the next load the
      // second season's Festival filled and closed the same way; then the saved game opened as a
      // returning player would. Autumn Moon's shape sets a stone moon gate in the board.
      query: 'preset=late&festival=filled&ceremony=1',
      settle: 15000,
      steps: () => [{ goto: 'festival=filled&ceremony=1', settle: 15000 }, { goto: '', settle: 12000 }],
      check: (t) => (/Autumn Moon/.test(t) ? null : 'not the Autumn Moon season'),
      tries: 2,
      frame: boardBand,
      caption: 'Seasons change the shape of the board',
      shows: 'The first minutes of Autumn Moon, the third season: the season chip "Autumn Moon", the moon gate standing in the board, the opening goods, four counters with new tickets.',
    },
  ],
};

export default scenes;
