/**
 * Colours of the salvage screens' interface (bars, tickets, cards). Owner: package 4 (`hud`). Every colour
 * is the art director's ("hi-vis-and-rust", docs/design/yard-style.md 2 and 8, ./art/palette.ts YARD):
 * paper chips with a 1.3 pt ink edge and a hard drop, hi-vis for the one button and the ticket's header,
 * the stamp's blue for paid tickets. The ground work's keys (ink, paper, hud, hudText, accent, scrim,
 * card, button, buttonText) stay for the files that still read them.
 */
import { YARD } from './art/palette';

export const PAL = {
  ink: YARD.ink,
  inkSoft: YARD.inkSoft,
  paper: YARD.paper,
  paperShade: YARD.paperShade,
  paperLine: YARD.paperLine,
  hivis: YARD.hivis,
  hivisLight: YARD.hivisLight,
  hivisDark: YARD.hivisDark,
  stamp: YARD.stampBlue,
  good: YARD.good,
  brass: YARD.brass,
  copper: YARD.copper,
  /** The muted grey of "today's value" (a weigh-in is not yet money). */
  muted: '#7A7F86',
  /** A chip's hard drop (ink at a quarter). */
  drop: 'rgba(43, 46, 51, 0.28)',
  /** The ground work's names. */
  hud: 'rgba(30, 27, 24, 0.78)',
  hudText: YARD.paper,
  accent: YARD.hivis,
  scrim: 'rgba(43, 46, 51, 0.45)',
  card: YARD.paper,
  button: '#3D3731',
  buttonText: YARD.paper,
} as const;

/** The paper chip's edge (yard-style 8). */
export const EDGE_W = 1.3;
