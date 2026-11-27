/**
 * WHAT THE WORLD DRAWS OF THE WORKS (stage 2, yard-stage2.md 2.18's FrameTable additions, 4.3, 4.6, 4.7):
 * the plates (FrameTable.works), the tags on things, the magnet crane, the forklift, the visitors, the van,
 * the picking table. Owner: rules-works (Phase B). frame.ts `frameCfg` is the closed dispatcher (s2a-fix, the
 * lead's ruling of 26 Nov 09:50): it builds the first yard's table, then hands it here to ADD these fields.
 * Pure: a function of the content and the state; never a tuned number of its own.
 *
 * PHASE A STUB otherwise: the plates, tags, crane, visitors and the table are Phase C's (the frame is the first yard's).
 *
 * E2 (RULING2 22, lesson 12): THE BOSS IN THE FORKLIFT. In it his acts are the forklift's (forklift.ts forkliftStep):
 * he cuts no oversize piece, sorts no picking table, picks nothing up. So that a boss who stands still and does
 * nothing is never left without a reason on screen: while he sits in it the one button is Step out
 * (actionsWorks.ts stepOutForklift), and standing within reach of an oversize piece or at the picking table the
 * frame carries the refusal `refusal.inForklift` ("Step out of the forklift first"; its words are asked of the
 * words' owner, requests.md 27 Nov: shown once the key exists).
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { nearPlace, thingPos } from './positions';
import { TEXT_KEYS } from './textKeys';
import type { FrameTable, SalvageGame, TextKey } from './types';

const IN_FORKLIFT = 'refusal.inForklift';
const HAS_IN_FORKLIFT = (Object.values(TEXT_KEYS) as readonly (readonly string[])[]).some((ks) => ks.includes(IN_FORKLIFT));

/** Add the works' fields to the frame `f` of game g (content c: the state's own, layer.ts contentAt). */
export function frameWorks(c: SalvageContent, g: SalvageGame, f: FrameTable): void {
  const s = g.salvage;
  if (s.forklift?.by !== 'boss') return;
  f.boss.button = 'stepOut';
  if (!HAS_IN_FORKLIFT || f.boss.refusal) return;
  if (forkliftBlocks(c, g)) f.boss.refusal = { key: IN_FORKLIFT as TextKey };
}

/**
 * Is the boss, sitting in the forklift, where on foot he would cut an oversize piece or sort the picking table (the
 * lots' reach.work of a lot's footprint; the table within reach.place)? The rules' own nearness (lots.ts, crate.ts).
 */
export function forkliftBlocks(c: SalvageContent, g: SalvageGame): boolean {
  const s = g.salvage;
  if (s.forklift?.by !== 'boss') return false;
  const p = s.presence;
  if (c.crate && s.things.some((th) => th.at.at === 'crate') && nearPlace(c, 'crate', p.x, p.y, c.reach.place)) return true;
  for (const th of s.things) {
    if (th.at.at !== 'lot') continue;
    const o = c.objects[th.obj];
    if (!o) continue;
    const q = thingPos(c, th.at);
    if (Math.hypot(Math.max(0, Math.abs(p.x - q.x) - o.size.w / 2), Math.max(0, Math.abs(p.y - q.y) - o.size.d / 2)) <= c.reach.work) return true;
  }
  return false;
}
