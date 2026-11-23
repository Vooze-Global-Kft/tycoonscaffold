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

/**
 * The whole main screen, top bar to the bottom row (Book, Lanterns, Season, Shop and the Basket), a
 * little sky above and below so the template's soft foot fades into sky, not into the buttons.
 * Taller than the template's box at full width, so the game is drawn whole and a little narrower.
 */
const wholeScreen = (v: View): BandSpec => ({ y0: -20, y1: v.h + 20, anchor: 'center' });

/**
 * A close look at the counters and the board's top rows (store review, 23 November: at thumbnail
 * size the ticket's lines, its price and the held good must read): from just above the customers'
 * heads down past the fourth board row, zoomed up to `zoom` times, centred on `cx`.
 */
const closeBand = (v: View, zoom: number, cx?: number): BandSpec => {
  const L = layout(v);
  const counterFoot = L.counters[2][0].y + L.counters[2][0].h;
  return {
    y0: Math.max(L.street.y + 30, counterFoot - Math.round(L.board.cell * 2.5)),
    y1: L.board.y + 4 * L.board.cell,
    anchor: 'top',
    maxZoom: zoom,
    cx: cx ?? v.w / 2,
  };
};

/** The street at full width of its four counters, from the stall fronts down into the board: the Parade's dragon large. */
const streetBand = (v: View): BandSpec => {
  const L = layout(v);
  const cols = L.counters[4];
  const left = cols[0].x;
  const right = cols[3].x + cols[3].w;
  return {
    y0: L.street.y - 4,
    y1: L.board.y + 2 * L.board.cell,
    anchor: 'top',
    maxZoom: Math.min(1.45, v.w / (right - left + 12)),
    cx: (left + right) / 2,
  };
};

/** Milliseconds from dropping the Twin Skewer on the fox's ticket to the picture (beats six times slower: the FILLED stamp falls in 1.3 s, the paper folds from 5.4 s to 8.1 s). */
const FOLD_WAIT = Number(process.env.NIGHT_FOLD_WAIT ?? 6200);

// The opening board (src/engine/merge/create.ts): six Pepper Skewers in the third row, cells 14 to 19.
const SKEWERS = [14, 15, 16, 17, 18, 19];

const scenes: GameScenes = {
  game: 'night-market',
  port: 8302,
  titleHas: 'Lantern',
  // Shots 1 to 3 zoom up to 1.6 times into the capture: drawn at that ratio, not enlarged.
  captureScale: 1.6,
  // The street at a Parade (scene 3), from below the stall fronts (their "waiting" badges read as
  // alerts at 1024 x 500): the counters with the dragon and its gold ticket, and the board's top rows.
  feature: {
    scene: 3,
    frame: (v) => {
      const L = layout(v);
      const y0 = L.backdrop.y + L.backdrop.h + 6;
      return { y0, y1: y0 + Math.round(v.w * 0.875), anchor: 'top' };
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
      steps: (v) => [{ down: cell(v, SKEWERS[3]) }, { move: cell(v, SKEWERS[2]), steps: 12 }, { wait: 700 }],
      // Close on the fox's ticket and the skewers (store review: the drag and the ticket must read at thumbnail size).
      frame: (v) => closeBand(v, 1.6),
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
        { wait: FOLD_WAIT },
      ],
      shotFrames: 1,
      frame: (v) => closeBand(v, 1.6),
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
      // The street close up (store review: the dragon must be larger than a customer's head on the sheet).
      frame: streetBand,
      caption: 'A paper dragon brings a gold ticket',
      shows: 'Late in the first season: four counters, one held by the paper dragon of the Parade with its gold ticket, the stall fronts with their minders, the Festival banner, a full board of skewers, teas, buns and sweets.',
    },
    {
      slug: 'ladder-book',
      query: 'preset=mid&spoke=book',
      settle: 12000,
      frame: () => ({ y0: 0, y1: { text: /^A good made for the first time/, edge: 'bottom', pad: 24 }, anchor: 'top' }),
      // The preset varies a little by run: retake when the open ladder shows more than one unknown
      // rung ("?"; on the short Play screen two read as unfinished art).
      check: (t) => ((t.match(/^\?$/gm) ?? []).length > 1 ? 'more than one "?" rung on the open ladder' : null),
      tries: 4,
      caption: 'Each new snack stamps the Ladder Book',
      shows: 'The Ladder Book at the mid preset: the six ladders as tabs with their counts, the Grill ladder open with its stamped rungs, names and ticket values, the next rung not made yet.',
    },
    {
      slug: 'lantern-gate',
      query: 'preset=mid&spoke=lanterns',
      settle: 12000,
      // Down to just above the LIT list (store review: one lit card under a count of four misleads): the
      // arch, its count and the next feats.
      frame: () => ({ y0: 0, y1: { text: /^lit$/i, edge: 'top', pad: -10 }, anchor: 'top', maxZoom: 1.2 }),
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
      // The whole screen with its bottom row (Book, Lanterns, Season, Shop): the one board shot that
      // shows how the other screens are reached (REVIEW-NOTES' tap path).
      frame: wholeScreen,
      caption: 'Autumn sets a moon gate in the board',
      shows: 'The first minutes of Autumn Moon, the third season: the season chip "Autumn Moon", the moon gate standing in the board, the opening goods, four counters with new tickets.',
    },
  ],
};

export default scenes;
