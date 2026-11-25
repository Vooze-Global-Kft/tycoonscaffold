/**
 * The tool rack (yard-stage1.md 4.3, a panel): per tool and carrier its name, its effect line (at most 38
 * characters), and Owned, Buy with its price, or the padlock and its condition. Rows come from the
 * rules' card (cardOf; ./sample.ts stands in while the rules give none).
 */
import type { CardData } from '../../../engine/salvage';
import { Panel } from './Panel';
import { Row } from './parts';

/** A row whose line is a refusal (a padlock condition) and that has no button. */
export const isPadlockRow = (r: CardData['rows'][number]) => !r.button && !!r.line && r.line.key.startsWith('refusal.');

export function ToolRack({ data, onClose }: { data: CardData; onClose: () => void }) {
  return (
    <Panel title={data.title} onClose={onClose} lead={data.lead} foot={data.foot}>
      {data.rows.map((r) => (
        <Row key={r.id} row={r} padlock={isPadlockRow(r)} tag={isPadlockRow(r) || r.button || r.state === 'arriving' ? null : { key: 'card.owned' }} />
      ))}
    </Panel>
  );
}
