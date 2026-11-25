/**
 * A machine's card (yard-stage1.md 4.3, a panel). Before buying: what it does, what goes in and comes
 * out, Buy with its price. After: one section per machine, TITLED BY THE MACHINE'S NAME (L14, W7) with its
 * state on the line under it ("Idle", "Working", "Turns while you stand at it") and in → every output
 * under that; the hopper and the tray by grade; "Level on the process board" (opening the board). No
 * absolute rate is printed (W5). The stripper pad shows the hand stripper ("Came with the yard") and the
 * powered stripper; the crucible's card is ./Crucible.tsx. The rows are the rules' (cardOf); this view
 * only groups and titles them.
 */
import { View } from 'react-native';
import type { CardData, SalvageConfig, SalvageGame } from '../../../engine/salvage';
import { Crucible } from './Crucible';
import { Panel } from './Panel';
import { Row } from './parts';
import { machineSections } from './machineView';
import { machineRows } from './sample';
import { isPadlockRow } from './ToolRack';

export function Machine({ cfg, g, data, onClose }: { cfg: SalvageConfig; g: SalvageGame; data: CardData; onClose: () => void }) {
  const list = data.machines?.length ? data.machines : data.machine ? [data.machine] : [];
  if (list.length === 1 && list[0].machine === 'crucible') return <Crucible cfg={cfg} g={g} data={{ ...data, machine: list[0] }} onClose={onClose} />;
  const rows = data.rows.length ? data.rows : list.flatMap((m) => machineRows(cfg, g, m).map((r) => ({ ...r, id: `${m.machine}.${r.id}` })));
  const sections = machineSections(list, rows);
  return (
    <Panel title={data.title} onClose={onClose} lead={data.lead} foot={data.foot}>
      {sections.map((s, i) => (
        <View key={s.machine} style={i > 0 ? { marginTop: 10 } : null}>
          {s.head ? <Row row={s.head} tag={s.tag} /> : null}
          {s.rows.map((r) => (
            <Row key={r.id} row={r} padlock={isPadlockRow(r)} />
          ))}
        </View>
      ))}
    </Panel>
  );
}
