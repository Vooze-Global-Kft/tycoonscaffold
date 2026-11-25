/**
 * The market's card views by card kind (overlays-b's), as the overlay host's CARD_VIEWS should list them
 * (requests.md: overlays-a adds one line each). The web preview's stand-in (./CardStandIn.web.tsx) draws
 * them while the host does not list them yet; the tests check every kind has its view.
 */
import type { ComponentType } from 'react';
import type { CardKind } from '../../../engine/salvage';
import { AwayCard } from '../overlays/AwayCard';
import { Clipboard } from '../overlays/Clipboard';
import { Help } from '../overlays/Help';
import { IndustryTable } from '../overlays/IndustryTable';
import type { CardViewProps } from '../overlays/OverlayHost';
import { PriceBoard } from '../overlays/PriceBoard';
import { RungSign } from '../overlays/RungSign';
import { Settings } from '../overlays/Settings';
import { Skip } from '../overlays/Skip';
import { SupplyDeal } from '../overlays/SupplyDeal';

export const MARKET_VIEWS: Partial<Record<CardKind, ComponentType<CardViewProps>>> = {
  board: PriceBoard,
  skip: Skip,
  deal: SupplyDeal,
  table: IndustryTable,
  away: AwayCard,
  rung: RungSign,
  clipboard: Clipboard,
  settings: Settings,
  help: Help,
};
