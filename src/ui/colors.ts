/**
 * Colour maths for readable text, pure and theme-free (every game has its own palette, so
 * readability cannot be hand-picked per colour).
 *
 *   textOn(bg)          white or the dark ink, whichever reads better on `bg` (button labels)
 *   inkOf(color, bg)    `color` darkened just enough to read as text on `bg` (a stage or rarity
 *                       colour used for a number or a label)
 *   contrast(a, b)      the WCAG contrast ratio, 1 to 21
 */

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(full.slice(0, 2), 16) || 0, parseInt(full.slice(2, 4), 16) || 0, parseInt(full.slice(4, 6), 16) || 0];
}

function hex([r, g, b]: [number, number, number]): string {
  const to = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

export function luminance(color: string): number {
  const [r, g, b] = rgb(color);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two opaque colours (#RGB or #RRGGBB; any alpha is ignored). */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The label colour for a filled shape: `light` or `dark`, whichever has more contrast on `bg`. */
export function textOn(bg: string, dark = '#2B1D12', light = '#FFFFFF'): string {
  return contrast(light, bg) >= contrast(dark, bg) ? light : dark;
}

/**
 * `color` as readable text on `bg`: unchanged when it already reaches `min` contrast, otherwise
 * moved towards black (on light backgrounds) or white (on dark ones) just far enough. Keeps the hue,
 * so a stage's number still reads as that stage's colour.
 */
export function inkOf(color: string, bg: string, min = 4.5): string {
  if (contrast(color, bg) >= min) return color.slice(0, 7);
  const towards: [number, number, number] = luminance(bg) > 0.4 ? [0, 0, 0] : [255, 255, 255];
  const from = rgb(color);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 16; i++) {
    const t = (lo + hi) / 2;
    const mixed = hex([from[0] + (towards[0] - from[0]) * t, from[1] + (towards[1] - from[1]) * t, from[2] + (towards[2] - from[2]) * t]);
    if (contrast(mixed, bg) >= min) hi = t;
    else lo = t;
  }
  return hex([from[0] + (towards[0] - from[0]) * hi, from[1] + (towards[1] - from[1]) * hi, from[2] + (towards[2] - from[2]) * hi]);
}
