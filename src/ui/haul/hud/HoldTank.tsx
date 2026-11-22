/** SKELETON (package "bay"). The hold tank (spec 4.1, 4.3): a capsule with stacked ore bands easing on `unload` events, "34/50" under it. No action. */
import * as H from '../../../engine/haul';
import { Placeholder } from '../Placeholder';
import { useRun } from '../useRun';
import type { Rect } from '../layout';

export function HoldTank({ rect }: { rect: Rect }) {
  const text = useRun((cfg, g) => `${Math.floor(H.holdTotal(g.haul))}/${H.haulParams(cfg, g).F}`, '');
  return <Placeholder name="HoldTank" pkg="hud/HoldTank.tsx · bay" live={text} style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }} />;
}
