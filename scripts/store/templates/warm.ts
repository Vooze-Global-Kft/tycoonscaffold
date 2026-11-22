/**
 * Pizza Empire's store template, "warm": the game is FRAMED, a whole phone screen on a white-edged
 * card that leans left and right in turn, on cream gingham; the caption sits BELOW it, on a
 * tomato-red sauce wave, in Lilita One (the game's own rounded display face) with a saffron
 * sub-line in Inter. Compare templates/panel.ts (Orbit Haulers), which is the opposite on each count.
 */
import { pathToFileURL } from 'node:url';
import { FONT_CSS, cap, esc } from './fonts';

export interface ShotOpts {
  W: number;
  H: number;
  img: string;
  caption: string;
  sub: string;
  index: number;
  total: number;
}

const CREAM = '#FFF6E9';
const TOMATO = '#E63946';
const SAFFRON = '#FFD166';
const CRUST = '#3D2C1E';

/** A sauce wave across the bottom; its bumps shift with the scene so the set reads as a sequence. */
function wave(W: number, H: number, index: number, top: number): string {
  const phase = index % 2 === 0 ? 0 : 0.5;
  const amp = W * 0.045;
  const n = 3;
  let d = `M0 ${H} L0 ${top}`;
  for (let i = 0; i < n; i++) {
    const x0 = (W * i) / n;
    const x1 = (W * (i + 1)) / n;
    const s = (i + phase) % 2 === 0 ? -1 : 1;
    d += ` C ${x0 + (x1 - x0) * 0.35} ${top + s * amp * 2}, ${x0 + (x1 - x0) * 0.65} ${top + s * amp * 2}, ${x1} ${top}`;
  }
  d += ` L${W} ${H} Z`;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;left:0;top:0"><path d="${d}" fill="${TOMATO}"/></svg>`;
}

export function shotHtml(o: ShotOpts): string {
  const { W, H } = o;
  const u = W / 1320;
  const cardW = W * 0.76;
  const cardH = cardW * (H / W);
  const cardTop = H * 0.04;
  const tilt = o.index % 2 === 0 ? -2.2 : 2.2;
  const waveTop = cardTop + cardH - H * 0.035;
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
  transform:rotate(${tilt}deg);border-radius:${64 * u}px;background:#fff;padding:${16 * u}px;
  box-shadow:0 ${30 * u}px ${70 * u}px rgba(61,44,30,.30), 0 ${6 * u}px ${14 * u}px rgba(61,44,30,.18)}
.card img{display:block;width:100%;height:100%;border-radius:${50 * u}px;object-fit:fill}
.cap{position:absolute;left:${W * 0.06}px;right:${W * 0.06}px;top:${waveTop + W * 0.07}px;bottom:${H * 0.02}px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.t{font-family:'Lilita';font-size:${W * 0.088}px;line-height:1.02;color:${CREAM};letter-spacing:${0.5 * u}px;
  text-shadow:0 ${7 * u}px 0 #A51D2A;text-wrap:balance}
.s{margin-top:${W * 0.022}px;font-family:'InterS';font-weight:700;font-size:${W * 0.037}px;color:${SAFFRON}}
.dots{position:absolute;right:${W * 0.07}px;bottom:${H * 0.022}px;display:flex;gap:${10 * u}px}
.dots i{width:${14 * u}px;height:${14 * u}px;border-radius:50%;background:rgba(255,246,233,.45)}
.dots i.on{background:${CREAM}}
</style></head><body>
<div class="bg"></div>
<div class="sun" style="width:${W * 0.9}px;height:${W * 0.9}px;left:${o.index % 2 === 0 ? W * 0.5 : -W * 0.4}px;top:${-W * 0.35}px"></div>
${wave(W, H, o.index, waveTop)}
<div class="card"><img src="${pathToFileURL(o.img).href}"></div>
<div class="cap"><div class="t">${cap(o.caption)}</div><div class="s">${esc(o.sub)}</div></div>
<div class="dots">${Array.from({ length: o.total }, (_, i) => `<i class="${i === o.index ? 'on' : ''}"></i>`).join('')}</div>
</body></html>`;
}

export interface FeatureOpts {
  W: number;
  H: number;
  img: string;
  icon: string;
  title: string;
  sub: string;
}

/** Play feature graphic: icon and name on cream at the left, the restaurant on a leaning card at the right. */
export function featureHtml(o: FeatureOpts): string {
  const { W, H } = o;
  const cardW = W * 0.34;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_CSS}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${CREAM}}
.bg{position:absolute;inset:0;background:
  repeating-linear-gradient(0deg, rgba(230,57,70,.075) 0 18px, transparent 18px 36px),
  repeating-linear-gradient(90deg, rgba(230,57,70,.075) 0 18px, transparent 18px 36px), ${CREAM}}
.sun{position:absolute;left:${W * 0.52}px;top:${-H * 0.5}px;width:${H * 1.7}px;height:${H * 1.7}px;border-radius:50%;background:${SAFFRON};opacity:.6}
.card{position:absolute;right:${W * 0.07}px;top:${H * 0.1}px;width:${cardW}px;height:${H * 1.1}px;transform:rotate(4deg);
  background:#fff;padding:7px;border-radius:26px;box-shadow:0 14px 30px rgba(61,44,30,.3);overflow:hidden}
.card img{width:100%;border-radius:20px;display:block}
.left{position:absolute;left:${W * 0.06}px;top:0;bottom:0;width:${W * 0.52}px;display:flex;flex-direction:column;justify-content:center}
.icon{width:${H * 0.3}px;height:${H * 0.3}px;border-radius:${H * 0.07}px;box-shadow:0 6px 14px rgba(61,44,30,.25)}
.t{margin-top:18px;font-family:'Lilita';font-size:${H * 0.15}px;line-height:1;color:${TOMATO};text-shadow:0 4px 0 #A51D2A22}
.s{margin-top:12px;font-family:'InterS';font-weight:700;font-size:${H * 0.058}px;color:${CRUST}}
</style></head><body>
<div class="bg"></div><div class="sun"></div>
<div class="card"><img src="${pathToFileURL(o.img).href}"></div>
<div class="left"><img class="icon" src="${pathToFileURL(o.icon).href}"><div class="t">${esc(o.title)}</div><div class="s">${esc(o.sub)}</div></div>
</body></html>`;
}
