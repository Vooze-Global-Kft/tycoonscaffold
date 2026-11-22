/** SKELETON (package "bay"). The contract strip at the top of the map (spec 4.1): the active contract, its fill bars, multiplier, launches left and "+₵N if met"; "PICK A CONTRACT" when none; hidden until contracts unlock. Tap: the Contract Board. Target key `contract:strip`. */
import { Placeholder } from '../Placeholder';
import { useRunShallow } from '../useRun';
import { useHaulUi } from '../uiState';
import type { Rect } from '../layout';

export function ContractStrip({ rect }: { rect: Rect }) {
  const c = useRunShallow((cfg, g) => {
    const k = g.haul.contracts.active;
    const a = k === null ? null : g.haul.contracts.board[k];
    return { unlocked: g.haul.contracts.unlocked, text: a ? `${cfg.haul.contracts.buyers.find((b) => b.id === a.buyer)?.name ?? a.buyer} · ${a.wants.map((w) => `${w.units} ${w.ore}`).join(' + ')} · x${a.mult} · ${a.launchesLeft} launches` : 'PICK A CONTRACT' };
  }, { unlocked: false, text: '' });
  if (!c.unlocked) return null;
  return (
    <Placeholder name="ContractStrip" pkg="hud/ContractStrip.tsx · bay" live={c.text} onPress={() => useHaulUi.getState().openSheet({ type: 'contracts' })} style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }} />
  );
}
