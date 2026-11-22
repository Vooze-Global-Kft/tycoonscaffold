/**
 * Drawings the shared screens need but cannot make themselves, because only one mode has the art:
 * a "char:<id>" portrait (the restaurant's cartoon people), the cast member inside a big Skia
 * card, and the tutorial pointer. The active mode's entry installs them (src/modes/contract.ts); a mode that installs
 * none shows the unknown-icon fallback for "char:" icons and an empty card window, and its bundle
 * carries none of that art.
 */
import type { ComponentType } from 'react';
import type { SharedValue } from 'react-native-reanimated';

export interface CharIconProps {
  /** The cast entry of the game's top-level `cast` for this id, or the bare id when it has none. */
  look: unknown;
  size: number;
  blink: boolean;
  render: 'image' | 'canvas';
}

export interface CardBustProps {
  /** The cast id ("char:<id>"), or the card id for a card whose icon is not a portrait. */
  id: string;
  /** A card not found yet: drawn as one dark shape. */
  silhouette: boolean;
}

/** What HintOverlay hands the pointer: the tapped spot in its canvas, the frame clock, size and tilt. */
export interface HintPointerProps {
  x: number;
  y: number;
  clock: SharedValue<number>;
  scale: number;
  /** Degrees: 0 points straight up from below, positive comes from the lower right. */
  angle: number;
}

/** What GameIcon hands a mode's own icon drawing: the full icon name ("art:ore-iron", "mach:tally") and its size. */
export interface ModeIconProps {
  icon: string;
  size: number;
}

export interface ModeParts {
  /** Draws a "char:<id>" icon for GameIcon (a React Native view). */
  CharIcon?: ComponentType<CharIconProps>;
  /** Draws a cast member inside a Skia card's window (CARD_WINDOW, origin at its top left). */
  CardBust?: ComponentType<CardBustProps>;
  /** The tutorial pointer, a Skia element drawn in HintOverlay's canvas (sim and classic: the glove). None: the hint shows its rings only. */
  HintPointer?: ComponentType<HintPointerProps>;
  /**
   * The mode's own icon drawings, for the names that start with one of `iconPrefixes` (haul:
   * "art:" and "mach:", drawn by its own cache, src/ui/haul/art/HaulIcon.tsx). GameIcon asks it
   * before its own "char:" and "art:" branches. None: the shared registry and fallbacks as before.
   */
  Icon?: ComponentType<ModeIconProps>;
  iconPrefixes?: readonly string[];
}

let parts: ModeParts = {};
let installed = false;
let warned = false;

export function setModeParts(next: ModeParts): void {
  installed = true;
  parts = next;
}

/** Read at render time only: a read at module load runs before App.tsx installs the mode, and gets nothing. */
export function modeParts(): ModeParts {
  if (!installed && !warned && typeof __DEV__ !== 'undefined' && __DEV__) {
    warned = true;
    console.warn('modeParts() was read before the mode was installed (App.tsx installMode): read it inside a render, not at module load.');
  }
  return parts;
}
