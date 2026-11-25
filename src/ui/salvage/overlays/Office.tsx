/**
 * The office (yard-stage1.md 4.3): one place, three tabs: Rota and Partners (panels) and the process
 * board (the wide card, 4.5). The open tab is screen state (./cardStack.ts); each tab's card is the
 * rules' (cardOf), with ./sample.ts standing in for rows the rules do not give yet.
 */
import type { CardData, Txt } from '../../../engine/salvage';
import type { OfficeTab } from './cardStack';
import { Partners } from './Partners';
import { ProcessBoard } from './ProcessBoard';
import { Rota } from './Rota';
import type { Tab } from './parts';

const TAB_TITLES: Record<OfficeTab, Txt> = { rota: { key: 'title.rota' }, partners: { key: 'title.partners' }, processBoard: { key: 'title.processBoard' } };

export function officeTabs(open: OfficeTab): Tab[] {
  return (['rota', 'partners', 'processBoard'] as const).map((id) => ({ id, title: TAB_TITLES[id], open: id === open }));
}

export function Office({ tab, rota, partners, board, onTab, onClose }: { tab: OfficeTab; rota: CardData; partners: CardData; board: CardData; onTab: (t: OfficeTab) => void; onClose: () => void }) {
  const tabs = officeTabs(tab);
  const on = (id: string) => onTab(id as OfficeTab);
  const title: Txt = { key: 'place.office' };
  if (tab === 'processBoard') return <ProcessBoard data={{ ...board, title }} tabs={tabs} onTab={on} onClose={onClose} />;
  if (tab === 'partners') return <Partners data={{ ...partners, title }} tabs={tabs} onTab={on} onClose={onClose} />;
  return <Rota data={{ ...rota, title }} tabs={tabs} onTab={on} onClose={onClose} />;
}
