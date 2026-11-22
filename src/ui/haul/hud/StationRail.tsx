/** SKELETON (package "bay"). The station rail (spec 4.1): six round buttons, Comms, Salvage, Fitting Bay (hidden until the first module copy), Star Map (from the first ring-3 claim or Jump ready), Trade Post (Dark Matter badge), Menu (settings). Target keys `button:<id>`. Icons: art:rail-<id>. */
import { GameIcon } from '../../components/GameIcon';
import { useHaulUi, type HaulSpoke } from '../uiState';
import { Placeholder } from '../Placeholder';
import type { Rect } from '../layout';

const BUTTONS: { id: 'comms' | 'salvage' | 'fitting' | 'starmap' | 'trade' | 'menu'; spoke: HaulSpoke | null }[] = [
  { id: 'comms', spoke: 'comms' },
  { id: 'salvage', spoke: 'salvage' },
  { id: 'fitting', spoke: 'fitting' },
  { id: 'starmap', spoke: 'starmap' },
  { id: 'trade', spoke: 'trade' },
  { id: 'menu', spoke: null },
];

export function StationRail({ rects }: { rects: Rect[] }) {
  return (
    <>
      {BUTTONS.map((b, i) => (
        <Placeholder
          key={b.id}
          name={b.id}
          pkg="rail"
          onPress={() => (b.spoke ? useHaulUi.getState().openSpoke(b.spoke) : useHaulUi.getState().setMenu(true))}
          style={{ position: 'absolute', left: rects[i].x, top: rects[i].y, width: rects[i].width, height: rects[i].height, alignItems: 'center', padding: 0 }}
        >
          <GameIcon icon={`art:rail-${b.id}`} size={18} />
        </Placeholder>
      ))}
    </>
  );
}
