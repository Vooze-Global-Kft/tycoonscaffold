/**
 * Orbit Haulers' store template, "panel": a hard-edged deep-blue radio readout across the top of
 * the image (channel counter, headline in monospaced capitals, a tick-marked cyan rule), and under
 * it the game, edge to edge with square corners, never under the readout: the picture box starts
 * where the panel ends, and each scene picks the band of the screen it shows (scenes/space-miner.ts,
 * templates/frame.ts), cropping empty starfield rather than covering the game's own top bar.
 * Headline only, no sub-line. Compare templates/warm.ts (Pizza Empire).
 */
import { FONT_CSS, cap, esc } from './fonts';
import { framed } from './frame';
import type { ShotOpts, FeatureOpts } from './warm';

const DEEP = '#060A16';
const CYAN = '#3FD8FF';
const AMBER = '#E07A3F';
const MUTED = '#7F93B5';
/** Feature graphic ground: a visible deep blue (Play: avoid black and dark grey). */
const NAVY = '#0B1A3A';

/** Height of the readout panel in pixels at width W (about 15 % of a 6.9" image, 18 % of a Play one). */
export const panelHeight = (W: number) => Math.round(430 * (W / 1320));

export function shotHtml(o: ShotOpts): string {
  const { W, H } = o;
  const u = W / 1320;
  const P = panelHeight(W);
  const ch = String(o.index + 1).padStart(2, '0');
  const tot = String(o.total).padStart(2, '0');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_CSS}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${DEEP}}
.pic{position:absolute;left:0;top:${P}px;width:${W}px;height:${H - P}px;overflow:hidden;background:${DEEP}}
.panel{position:absolute;left:0;right:0;top:0;height:${P}px;background:${DEEP};
  padding:${64 * u}px ${84 * u}px ${70 * u}px ${84 * u}px;display:flex;flex-direction:column;justify-content:center}
.rule{position:absolute;left:0;right:0;bottom:0;height:${4 * u}px;background:${CYAN}}
.ticks{position:absolute;left:0;right:0;bottom:${4 * u}px;height:${22 * u}px;
  background:repeating-linear-gradient(90deg, ${CYAN} 0 ${3 * u}px, transparent ${3 * u}px ${44 * u}px);opacity:.55}
.ticks.long{height:${40 * u}px;background:repeating-linear-gradient(90deg, ${CYAN} 0 ${3 * u}px, transparent ${3 * u}px ${220 * u}px);opacity:.8}
.hd{display:flex;align-items:center;gap:${18 * u}px;font-family:'Mono';font-weight:500;font-size:${30 * u}px;letter-spacing:${6 * u}px;color:${MUTED}}
.hd b{width:${20 * u}px;height:${20 * u}px;background:${AMBER};display:inline-block}
.hd .r{margin-left:auto}
.t{margin-top:${24 * u}px;font-family:'Mono';font-weight:800;font-size:${84 * u}px;line-height:1.12;color:${CYAN};
  text-transform:uppercase;letter-spacing:${1 * u}px;text-wrap:balance}
</style></head><body>
<div class="pic">${framed(o.raw, o.band, W, H - P)}</div>
<div class="panel">
  <div class="rule"></div><div class="ticks"></div><div class="ticks long"></div>
  <div class="hd"><b></b><span>CH ${ch}/${tot}</span><span class="r">HAULER NET</span></div>
  <div class="t">${cap(o.caption)}</div>
</div>
</body></html>`;
}

/**
 * Play feature graphic: no icon, no tagline. The asteroid field full-bleed, centred on the station,
 * lifted onto a deep-blue nebula (screen blend, so the game's black space reads as blue), and a thin
 * letter-spaced cyan wordmark in the lower third. Compare warm.ts: centred title over a scene crop.
 */
export function featureHtml(o: FeatureOpts): string {
  const { W, H } = o;
  // The field's own edges fade into the nebula (the crop is narrower than the banner).
  const FADE = 'linear-gradient(90deg, transparent 0, #000 20%, #000 80%, transparent 100%)';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_CSS}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${NAVY}}
.pic{position:absolute;inset:0;overflow:hidden}
.neb{position:absolute;inset:0;mix-blend-mode:screen;background:
  radial-gradient(ellipse 60% 70% at 22% 30%, rgba(92,60,170,.55), transparent 70%),
  radial-gradient(ellipse 55% 65% at 80% 40%, rgba(30,90,170,.55), transparent 70%),
  linear-gradient(180deg, #0B1A3A, #10234D)}
.low{position:absolute;left:0;right:0;bottom:0;height:${H * 0.3}px;background:linear-gradient(180deg, rgba(11,26,58,0), rgba(11,26,58,.85) 50%)}
.wm{position:absolute;left:0;right:0;top:${H * 0.8}px;text-align:center;font-family:'Mono';font-weight:500;font-size:${H * 0.09}px;
  letter-spacing:${H * 0.045}px;color:${CYAN};text-transform:uppercase;padding-left:${H * 0.045}px}
.rule{position:absolute;left:${W * 0.3}px;right:${W * 0.3}px;top:${H * 0.8 + H * 0.125}px;height:2px;
  background:repeating-linear-gradient(90deg, ${CYAN} 0 2px, transparent 2px 14px);opacity:.8}
</style></head><body>
<div class="pic">${framed(o.raw, o.band, W, H, `-webkit-mask-image:${FADE};mask-image:${FADE}`)}</div>
<div class="neb"></div>
<div class="low"></div>
<div class="wm">${esc(o.title)}</div><div class="rule"></div>
</body></html>`;
}
