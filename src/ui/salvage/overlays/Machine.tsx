/**
 * A machine's card (yard-stage1.md 4.3, a panel). Before buying: what it does, what goes in and comes
 * out, its rate, Buy with its price. After: status ("Working", "Tray full", "Waiting for cable"), the
 * hopper and the tray by grade, the rate, "Level on the process board" (opening the board). The
 * crucible's card is ./Crucible.tsx. The numbers are the rules' (MachineCard); the words keys.
 */
import type { CardData, SalvageConfig, SalvageGame, Txt } from '../../../engine/salvage';
import { Crucible } from './Crucible';
import { Panel } from './Panel';
import { Row } from './parts';
import { machineRows } from './sample';

export function Machine({ cfg, g, data, onClose }: { cfg: SalvageConfig; g: SalvageGame; data: CardData; onClose: () => void }) {
  const m = data.machine;
  if (m?.machine === 'crucible') return <Crucible cfg={cfg} g={g} data={data} onClose={onClose} />;
  const rows = m ? (data.rows.length ? data.rows : machineRows(cfg, g, m)) : data.rows;
  const lead = data.lead.length ? data.lead : m && m.machine === 'hand_stripper' ? [{ key: 'card.cameWithYard' } as Txt] : [];
  return (
    <Panel title={data.title} onClose={onClose} lead={lead} foot={data.foot}>
      {rows.map((r) => (
        <Row key={r.id} row={r} />
      ))}
    </Panel>
  );
}
