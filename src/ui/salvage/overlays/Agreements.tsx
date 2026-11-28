/**
 * The office's Agreements page (PLAN2 2.5; the layout family F5 LEDGER of phasec/s2c-plan-cards.md 2.2; RULING2 9.7: the
 * office's page for loans is "Agreements"). C-CARDSUI's STUB: the rules' card (`{kind:'office', tab:'agreements'}`, kind
 * 'agreements') drawn as a panel from its data alone, with the office's tab strip: Rota, Partners, Process board and
 * Agreements. Reached only under stageOn() (./OverlayHost.tsx officeTab). The card SHOWS A DEBT (D77): no shop entry, no ad
 * button on it. Its words' rooms: ../rooms/bank.ts (re-exported below). Owner from wave 1: CRD-BANK (who also gives
 * Office.tsx's three tabs the fourth: today their strips list three).
 */
import { isPadlockRow } from './ToolRack';
import type { CardViewProps } from './OverlayHost';
import { Panel } from './Panel';
import { Row, type Tab } from './parts';

export { ROOMS } from '../rooms/bank';

export function Agreements({ data, onClose, tabs, onTab }: CardViewProps & { tabs?: Tab[]; onTab?: (id: string) => void }) {
  return (
    <Panel title={data.title} onClose={onClose} tabs={tabs} onTab={onTab} lead={data.lead} foot={data.foot}>
      {data.rows.map((r) => (
        <Row key={r.id} row={r} padlock={isPadlockRow(r)} />
      ))}
    </Panel>
  );
}
