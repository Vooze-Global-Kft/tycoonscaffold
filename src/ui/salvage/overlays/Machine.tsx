/**
 * A machine's card (yard-stage1.md 4.3, a panel). Before buying: what it does, what goes in and comes
 * out, its rate, Buy with its price. After: status ("Working", "Tray full", "Waiting for cable"), the
 * hopper and the tray by grade, the rate, "Level on the process board" (opening the board). The
 * crucible's card is ./Crucible.tsx. The numbers are the rules' (MachineCard); the words keys.
 */
import type { CardData, SalvageConfig, SalvageGame, Txt } from '../../../engine/salvage';
import { Crucible } from './Crucible';
import { Panel } from './Panel';
import { INK, Line, Row } from './parts';
import { ITEM_NAME, machineRows } from './sample';
import { View } from 'react-native';

export function Machine({ cfg, g, data, onClose }: { cfg: SalvageConfig; g: SalvageGame; data: CardData; onClose: () => void }) {
  const list = data.machines?.length ? data.machines : data.machine ? [data.machine] : [];
  if (list.length === 1 && list[0].machine === 'crucible') return <Crucible cfg={cfg} g={g} data={{ ...data, machine: list[0] }} onClose={onClose} />;
  // The stripper pad shows both its machines, the hand stripper first ("Came with the yard").
  return (
    <Panel title={data.title} onClose={onClose} lead={data.lead} foot={data.foot}>
      {data.rows.length
        ? data.rows.map((r) => <Row key={r.id} row={r} />)
        : list.map((m) => (
            <View key={m.machine}>
              {list.length > 1 && m.owned ? (
                <View style={{ paddingTop: 8 }}>
                  <Line t={{ key: ITEM_NAME[m.machine] }} size="name" bold />
                  {m.machine === 'hand_stripper' ? <Line t={{ key: 'card.cameWithYard' } as Txt} size="line" colour={INK.soft} /> : null}
                </View>
              ) : null}
              {machineRows(cfg, g, m)
                .filter((r) => !(m.machine === 'hand_stripper' && r.id === 'level'))
                .map((r) => (
                  <Row key={`${m.machine}.${r.id}`} row={{ ...r, id: `${m.machine}.${r.id}` }} />
                ))}
            </View>
          ))}
    </Panel>
  );
}
