/**
 * The skeleton's placeholder look: colours of the "baize-and-ink" palette (spec 4.6) until the art
 * package's palette exists, and a rectangle as an absolute style. Delete this file once no screen
 * imports it (the bars, sheets and views package checks; docs/design/office-build-plan.md).
 */
import type { ViewStyle } from 'react-native';
import type { Rect } from './layout';

export const PH = { baize: '#2E4A3E', walnut: '#6B4A33', paper: '#ECEFEA', violet: '#5B3E8C', slate: '#6C7A89', brass: '#C9A45C', mustard: '#D9A53A', brick: '#B0563F', ink: '#2D3436', line: '#4C6A5C' } as const;

export const at = (r: Rect): ViewStyle => ({ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h });
