/**
 * The office's Rota tab (yard-stage1.md 4.3, a panel tab): first line "Site licence · metal dealer"; per
 * hired crew member the first name, the role and level, Level with its price; per role the next place,
 * Hire with its price, or "Opens at {t} supplied"; the Night watch ("Away cap {a} h → {b} h").
 */
import type { CardData } from '../../../engine/salvage';
import { Panel } from './Panel';
import { Row, type Tab } from './parts';
import { isPadlockRow } from './ToolRack';

export function Rota({ data, tabs, onTab, onClose }: { data: CardData; tabs?: Tab[]; onTab?: (id: string) => void; onClose: () => void }) {
  return (
    <Panel title={data.title} onClose={onClose} tabs={tabs} onTab={onTab} lead={data.lead} foot={data.foot}>
      {data.rows.map((r) => (
        <Row key={r.id} row={r} padlock={isPadlockRow(r)} />
      ))}
    </Panel>
  );
}
