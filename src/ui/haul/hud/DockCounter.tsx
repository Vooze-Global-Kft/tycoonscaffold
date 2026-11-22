/** SKELETON (package "bay"). The dock counter (spec 4.1): Credits as a rolling digital counter (RollingNumber, sized by bayMetrics.ts, no lineHeight), the receipt ticker ("WARPED · MANIFEST ..." for 4 s after a warp-out, else "₵36/s"). Tap: the Contract Board once contracts unlock. Target key `bay:counter`; coins fly to it. */
import { formatMoney } from '../../../engine/format';
import { useGame } from '../../../state/store';
import { Placeholder } from '../Placeholder';
import { useRun } from '../useRun';
import { useHaulUi } from '../uiState';
import type { Rect } from '../layout';

export function DockCounter({ rect }: { rect: Rect }) {
  const cash = useGame((s) => s.game.cash);
  const sym = useGame((s) => s.cfg.strings.currencySymbol);
  const unlocked = useRun((_c, g) => g.haul.contracts.unlocked, false);
  return (
    <Placeholder
      name="DockCounter"
      pkg="hud/DockCounter.tsx · bay"
      live={formatMoney(cash, sym)}
      onPress={unlocked ? () => useHaulUi.getState().openSheet({ type: 'contracts' }) : undefined}
      style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
    />
  );
}
