/** SKELETON (package "bay"). The flare launcher (spec 2.8, 4.1): the flare and its charge count, hidden until the first charge; drawn and hit-tested by the field gesture layer (errata 48), dragged onto a rock. Target key `bay:flare`. */
import { Placeholder } from '../Placeholder';
import { useRun } from '../useRun';
import type { Rect } from '../layout';

export function FlareLauncher({ rect }: { rect: Rect }) {
  const charges = useRun((_c, g) => g.haul.flare.charges, 0);
  return <Placeholder name="FlareLauncher" pkg="hud/FlareLauncher.tsx · bay" live={`charges ${charges}`} style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }} />;
}
