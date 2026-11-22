/**
 * Pizza Empire's store template, "warm": the game is FRAMED, a phone screen on a white-edged card
 * that leans left and right in turn, on cream gingham under a saffron sun; the caption sits BELOW
 * it, on a deep tomato sauce wave, in Lilita One (the game's own rounded display face) with a cream
 * sub-line in Inter. The wave and caption stay under 20 % of the image (Play's tagline limit). A
 * scene may show only a band of its screen (templates/frame.ts): the card is then as tall as the
 * band and sits centred above the wave. Compare templates/panel.ts (Orbit Haulers).
 */
import { FONT_CSS, cap, esc } from './fonts';
import { bandHeightAt, framed, type Raw } from './frame';
import type { Band } from '../types';

export interface ShotOpts {
  W: number;
  H: number;
  raw: Raw;
  band?: Band;
  caption: string;
  sub?: string;
  index: number;
  total: number;
}

const CREAM = '#FFF6E9';
/** Background tomato of the gingham and the sun's partner colour. */
const TOMATO = '#E63946';
/** The caption band: a deeper tomato, so cream text on it reaches 5.4:1 (sub-line included). */
const SAUCE = '#C4262F';
const SAFFRON = '#FFD166';
const CRUST = '#3D2C1E';
/** Where the wave's base line sits, as a share of the height; its bumps rise at most WAVE_AMP x 2 x W above it. */
const WAVE_BASE = 0.835;
const WAVE_AMP = 0.02;

/** A sauce wave across the bottom; its bumps shift with the scene so the set reads as a sequence. */
function wave(W: number, H: number, index: number, top: number): string {
  const phase = index % 2 === 0 ? 0 : 0.5;
  const amp = W * WAVE_AMP;
  const n = 3;
  let d = `M0 ${H} L0 ${top}`;
  for (let i = 0; i < n; i++) {
    const x0 = (W * i) / n;
    const x1 = (W * (i + 1)) / n;
    const s = (i + phase) % 2 === 0 ? -1 : 1;
    d += ` C ${x0 + (x1 - x0) * 0.35} ${top + s * amp * 2}, ${x0 + (x1 - x0) * 0.65} ${top + s * amp * 2}, ${x1} ${top}`;
  }
  d += ` L${W} ${H} Z`;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;left:0;top:0"><path d="${d}" fill="${SAUCE}"/></svg>`;
}

export function shotHtml(o: ShotOpts): string {
  const { W, H } = o;
  const u = W / 1320;
  const waveTop = H * WAVE_BASE;
  const top = H * 0.028;
  // The room for the card: from `top` to just inside the wave.
  const room = waveTop + H * 0.012 - top;
  const pad = 16 * u;
  // A whole screen fills the room; a band is as tall as it is at a wider card, centred in the room.
  let cardW = (room - 2 * pad) * (o.raw.w / o.raw.h) + 2 * pad;
  let inner = bandHeightAt(o.raw, o.band, cardW - 2 * pad);
  if (o.band) {
    cardW = W * 0.86;
    inner = Math.min(room - 2 * pad, bandHeightAt(o.raw, o.band, cardW - 2 * pad));
  }
  const cardH = inner + 2 * pad;
  const cardTop = top + (room - cardH) / 2;
  const tilt = o.index % 2 === 0 ? -2 : 2;
  const gingham = 'rgba(230,57,70,0.075)';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_CSS}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${CREAM}}
.bg{position:absolute;inset:0;
  background:
    repeating-linear-gradient(0deg, ${gingham} 0 ${44 * u}px, transparent ${44 * u}px ${88 * u}px),
    repeating-linear-gradient(90deg, ${gingham} 0 ${44 * u}px, transparent ${44 * u}px ${88 * u}px),
    ${CREAM};}
.sun{position:absolute;border-radius:50%;background:${SAFFRON};opacity:.55}
.card{position:absolute;left:${(W - cardW) / 2}px;top:${cardTop}px;width:${cardW}px;height:${cardH}px;
  transform:rotate(${tilt}deg);border-radius:${64 * u}px;background:#fff;padding:${pad}px;
  box-shadow:0 ${30 * u}px ${70 * u}px rgba(61,44,30,.30), 0 ${6 * u}px ${14 * u}px rgba(61,44,30,.18)}
.win{position:relative;width:100%;height:100%;border-radius:${50 * u}px;overflow:hidden;background:${CREAM}}
.cap{position:absolute;left:${W * 0.06}px;right:${W * 0.06}px;top:${waveTop + W * WAVE_AMP * 2}px;bottom:${H * 0.012}px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.t{font-family:'Lilita';font-size:${W * 0.08}px;line-height:1.02;color:${CREAM};letter-spacing:${0.5 * u}px;
  text-shadow:0 ${6 * u}px 0 #8E1620;text-wrap:balance}
.s{margin-top:${W * 0.02}px;font-family:'InterS';font-weight:700;font-size:${W * 0.036}px;color:${CREAM}}
</style></head><body>
<div class="bg"></div>
<div class="sun" style="width:${W * 0.9}px;height:${W * 0.9}px;left:${o.index % 2 === 0 ? W * 0.5 : -W * 0.4}px;top:${-W * 0.35}px"></div>
${wave(W, H, o.index, waveTop)}
<div class="card"><div class="win">${framed(o.raw, o.band, cardW - 2 * pad, cardH - 2 * pad)}</div></div>
<div class="cap"><div class="t">${cap(o.caption)}</div>${o.sub ? `<div class="s">${esc(o.sub)}</div>` : ''}</div>
</body></html>`;
}

export interface FeatureOpts {
  W: number;
  H: number;
  raw: Raw;
  band?: Band;
  title: string;
}

/**
 * Play feature graphic: no icon, no tagline. Centred: the name in Lilita One over a big saffron sun,
 * and under it a wide crop of the restaurant scene itself (no phone, no card tilt), on gingham.
 * Compare panel.ts: the field full-bleed with a thin wordmark in the lower third.
 */
export function featureHtml(o: FeatureOpts): string {
  const { W, H } = o;
  const boxH = H * 0.68;
  const boxW = boxH * 1.62;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_CSS}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${CREAM}}
.bg{position:absolute;inset:0;background:
  repeating-linear-gradient(0deg, rgba(230,57,70,.075) 0 18px, transparent 18px 36px),
  repeating-linear-gradient(90deg, rgba(230,57,70,.075) 0 18px, transparent 18px 36px), ${CREAM}}
.sun{position:absolute;left:${W / 2 - H * 0.75}px;top:${-H * 0.62}px;width:${H * 1.5}px;height:${H * 1.5}px;border-radius:50%;background:${SAFFRON};opacity:.8}
.t{position:absolute;left:0;right:0;top:${H * 0.05}px;text-align:center;font-family:'Lilita';font-size:${H * 0.16}px;line-height:1;color:${TOMATO};
  text-shadow:0 5px 0 #8E162033}
.box{position:absolute;left:${(W - boxW) / 2}px;top:${H - boxH - H * 0.06}px;width:${boxW}px;height:${boxH}px;overflow:hidden;
  border-radius:28px;border:6px solid ${CREAM};box-shadow:0 14px 30px rgba(61,44,30,.3);background:${CRUST}}
</style></head><body>
<div class="bg"></div><div class="sun"></div>
<div class="t">${esc(o.title)}</div>
<div class="box">${framed(o.raw, o.band, boxW - 12, boxH - 12)}</div>
</body></html>`;
}
