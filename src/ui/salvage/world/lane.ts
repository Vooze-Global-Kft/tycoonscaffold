/**
 * The lane east of the gate as geometry (pure, no drawing): moved out of ./yard.ts by join3 so that the
 * labels (./labels.ts, the partners' names on their signs) and the art (./actors.ts) read the same points.
 * Owner: world-a (the lane's art placement is actors.ts laneItems).
 */
import type { SalvageContent } from '../../../config/schema.salvage';

/** The lane's geometry from content: the gate, the lane's width, each partner's distance, the bridge. */
export interface LaneGeo {
  gx: number;
  gy: number;
  /** Half the asphalt's width, metres. */
  half: number;
  /** Partner id -> x of its site (the gate plus its lane distance). */
  /** sign: the site's sign board in metres along the lane from x (content map.sites.<id>.sign; owner1 finding 3). */
  sites: { id: string; x: number; look: number; sign?: number }[];
  /** x of the weight-limited bridge (null: none), and how far a vehicle may go. */
  bridge: number | null;
  end: number;
}

export function laneGeo(c: SalvageContent): LaneGeo | null {
  const g = c.map.points.gate;
  if (!g) return null;
  const lane = c.map.lane ?? {};
  const half = ((c.map as { laneWidth?: number }).laneWidth ?? 6) / 2;
  const signs = (c.map as { sites?: Record<string, { sign?: number }> }).sites ?? {};
  const sites = Object.entries(c.partners).map(([id, p], i) => ({ id, x: g[0] + (lane[p.lane] ?? 0), look: i, sign: signs[id]?.sign }));
  const bridgeKey = Object.keys(lane).find((k) => k.startsWith('bridge'));
  const bridge = bridgeKey ? g[0] + lane[bridgeKey] : null;
  const far = Math.max(g[0] + 20, ...sites.map((s) => s.x + 12));
  const end = bridge !== null ? bridge - 2 : far;
  return { gx: g[0], gy: g[1], half, sites, bridge, end };
}

/**
 * Each partner site's sign board on the lane (the lane's art places it, actors.ts laneItems; the name
 * plate on it is labels.ts's, join3): the farm's beside its shed, the demolition site's on its hoarding.
 */
export function laneSigns(l: LaneGeo): { id: string; x: number; y: number; frame: number }[] {
  return l.sites.map((s) => (s.look === 0 ? { id: s.id, x: s.x + (s.sign ?? -4), y: l.gy - l.half - 0.2, frame: 0 } : { id: s.id, x: s.x + (s.sign ?? -2.2), y: l.gy - l.half + 0.1, frame: 1 }));
}

/** How far the drawn lane runs east (asphalt past the bridge). */
export const laneDrawEnd = (l: LaneGeo) => (l.bridge !== null ? l.bridge + 14 : l.end);
