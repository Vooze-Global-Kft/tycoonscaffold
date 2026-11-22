/**
 * Orbit Haulers' store template, "panel": the game is FULL-BLEED, edge to edge with square corners,
 * at exactly the phone's aspect; the caption is a radio readout on a hard-edged deep-blue panel
 * laid OVER the picture (top by default), with a channel counter, a tick-marked cyan rule and
 * viewfinder corners. Monospaced capitals (JetBrains Mono), cyan and amber on deep blue. Every image
 * in the set has the same rigid grid, like a log. Compare templates/warm.ts (Pizza Empire).
 */
import { pathToFileURL } from 'node:url';
import { FONT_CSS, cap, esc } from './fonts';
import type { ShotOpts, FeatureOpts } from './warm';

const DEEP = '#060A16';
const CYAN = '#3FD8FF';
const AMBER = '#E07A3F';
const MUTED = '#7F93B5';

export function shotHtml(o: ShotOpts & { place?: 'top' | 'bottom' }): string {
  const { W, H } = o;
  const u = W / 1320;
  const top = (o.place ?? 'top') === 'top';
  const ch = String(o.index + 1).padStart(2, '0');
  const tot = String(o.total).padStart(2, '0');
  const rule = `${top ? 'bottom' : 'top'}:0`;
  const corner = (pos: string, b: string) =>
    `<div style="position:absolute;${pos};width:${70 * u}px;height:${70 * u}px;${b}"></div>`;
  const line = `${4 * u}px solid ${CYAN}`;
  const inset = 34 * u;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_CSS}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${DEEP}}
.pic{position:absolute;inset:0;width:${W}px;height:${H}px;display:block}
.panel{position:absolute;left:0;right:0;${top ? 'top:0' : 'bottom:0'};background:${DEEP};
  padding:${(top ? 92 : 64) * u}px ${84 * u}px ${(top ? 64 : 92) * u}px ${84 * u}px}
.rule{position:absolute;left:0;right:0;${rule};height:${4 * u}px;background:${CYAN}}
.ticks{position:absolute;left:0;right:0;${top ? `bottom:${4 * u}px` : `top:${4 * u}px`};height:${22 * u}px;
  background:repeating-linear-gradient(90deg, ${CYAN} 0 ${3 * u}px, transparent ${3 * u}px ${44 * u}px);opacity:.55;
  ${top ? '' : 'transform:scaleY(-1);'}}
.ticks.long{height:${40 * u}px;background:repeating-linear-gradient(90deg, ${CYAN} 0 ${3 * u}px, transparent ${3 * u}px ${220 * u}px);opacity:.8}
.hd{display:flex;align-items:center;gap:${18 * u}px;font-family:'Mono';font-weight:500;font-size:${30 * u}px;letter-spacing:${6 * u}px;color:${MUTED}}
.hd b{width:${20 * u}px;height:${20 * u}px;background:${AMBER};display:inline-block}
.hd .r{margin-left:auto}
.t{margin-top:${26 * u}px;font-family:'Mono';font-weight:800;font-size:${84 * u}px;line-height:1.12;color:${CYAN};
  text-transform:uppercase;letter-spacing:${1 * u}px;text-wrap:balance}
.s{margin-top:${22 * u}px;font-family:'Mono';font-weight:500;font-size:${38 * u}px;color:${AMBER};text-transform:uppercase;letter-spacing:${2 * u}px}
</style></head><body>
<img class="pic" src="${pathToFileURL(o.img).href}">
${corner(`left:${inset}px;${top ? 'bottom' : 'top'}:${inset}px`, `border-left:${line};border-${top ? 'bottom' : 'top'}:${line}`)}
${corner(`right:${inset}px;${top ? 'bottom' : 'top'}:${inset}px`, `border-right:${line};border-${top ? 'bottom' : 'top'}:${line}`)}
<div class="panel">
  <div class="rule"></div><div class="ticks"></div><div class="ticks long"></div>
  <div class="hd"><b></b><span>CH ${ch}/${tot}</span><span class="r">HAULER NET</span></div>
  <div class="t">${cap(o.caption)}</div>
  <div class="s">&gt; ${esc(o.sub)}</div>
</div>
</body></html>`;
}

/** Play feature graphic: the field full-bleed, a deep-blue readout block over its left side. */
export function featureHtml(o: FeatureOpts): string {
  const { W, H } = o;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_CSS}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${DEEP}}
.pic{position:absolute;right:0;top:0;width:${W * 0.64}px;height:${H}px;background-size:100% auto;background-position:0 64%;background-repeat:no-repeat}
.fade{position:absolute;inset:0;background:linear-gradient(90deg, ${DEEP} 0 36%, rgba(6,10,22,.55) 46%, rgba(6,10,22,0) 60%)}
.left{position:absolute;left:${W * 0.055}px;top:0;bottom:0;width:${W * 0.5}px;display:flex;flex-direction:column;justify-content:center}
.icon{width:${H * 0.26}px;height:${H * 0.26}px;border:3px solid ${CYAN}}
.t{margin-top:22px;font-family:'Mono';font-weight:800;font-size:${H * 0.11}px;line-height:1;color:${CYAN};letter-spacing:2px;text-transform:uppercase}
.s{margin-top:14px;font-family:'Mono';font-weight:500;font-size:${H * 0.045}px;color:${AMBER};text-transform:uppercase;letter-spacing:2px}
.rule{margin-top:20px;height:3px;width:${W * 0.36}px;background:repeating-linear-gradient(90deg, ${CYAN} 0 3px, transparent 3px 16px)}
</style></head><body>
<div class="pic" style="background-image:url('${pathToFileURL(o.img).href}')"></div><div class="fade"></div>
<div class="left"><img class="icon" src="${pathToFileURL(o.icon).href}"><div class="t">${esc(o.title)}</div><div class="rule"></div><div class="s">&gt; ${esc(o.sub)}</div></div>
</body></html>`;
}
