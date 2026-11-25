/**
 * The office's Partners tab (yard-stage1.md 4.3, a panel tab): per partner its business card (contact ·
 * firm), its skip's state and condition (filling and when full, the trial load, or why it is shut), a
 * button to its skip's card; from rung 2 the supply deal's row (its card is the market engineer's).
 */
import type { CardData } from '../../../engine/salvage';
import { Panel } from './Panel';
import { Row, type Tab } from './parts';
import { isPadlockRow } from './ToolRack';

export function Partners({ data, tabs, onTab, onClose }: { data: CardData; tabs?: Tab[]; onTab?: (id: string) => void; onClose: () => void }) {
  return (
    <Panel title={data.title} onClose={onClose} tabs={tabs} onTab={onTab} lead={data.lead} foot={data.foot}>
      {data.rows.map((r) => (
        <Row key={r.id} row={r} padlock={isPadlockRow(r)} />
      ))}
    </Panel>
  );
}
