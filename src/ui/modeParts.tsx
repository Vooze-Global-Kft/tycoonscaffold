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

export interface ModeParts {
  /** Draws a "char:<id>" icon for GameIcon (a React Native view). */
  CharIcon?: ComponentType<CharIconProps>;
  /** Draws a cast member inside a Skia card's window (CARD_WINDOW, origin at its top left). */
  CardBust?: ComponentType<CardBustProps>;
  /** The tutorial pointer, a Skia element drawn in HintOverlay's canvas (sim and classic: the glove). None: the hint shows its rings only. */
  HintPointer?: ComponentType<HintPointerProps>;
}

let parts: ModeParts = {};

export function setModeParts(next: ModeParts): void {
  parts = next;
}

export function modeParts(): ModeParts {
  return parts;
}
