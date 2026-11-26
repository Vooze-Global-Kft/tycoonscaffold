/**
 * The office's Rota tab (yard-stage1.md 4.3, a panel tab): first line "Site licence · metal dealer"; per
 * hired crew member the first name, the role and level, Level with its price (a level that waits reads
 * "Level up opens at {t} supplied", never a padlock on a hired man: P18); per role the next place,
 * Hire with its price, or "Opens at {t} supplied"; the Night watch ("Away cap {a} h → {b} h").
 */
import type { CardData } from '../../../engine/salvage';
import { Panel } from './Panel';
import { Row, type Tab } from './parts';
import { memberRow } from './machineView';

export function Rota({ data, tabs, onTab, onClose }: { data: CardData; tabs?: Tab[]; onTab?: (id: string) => void; onClose: () => void }) {
  return (
    <Panel title={data.title} onClose={onClose} tabs={tabs} onTab={onTab} lead={data.lead} foot={data.foot}>
      {data.rows.map((r) => {
        const m = memberRow(r);
        return <Row key={r.id} row={m.row} padlock={m.padlock} />;
      })}
    </Panel>
  );
}
