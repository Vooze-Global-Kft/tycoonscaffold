/**
 * The person who runs a station in a sim game: the same cook the scene draws at that station (one
 * look function for both, `cookLook`). Given to the station list by the sim home through
 * StationPortraitContext (src/ui/home/StationList.tsx); moved here from that file unchanged.
 */
import { useMemo } from 'react';
import type { Business } from '../../../config/schema';
import * as E from '../../../engine/economy';
import { useGame } from '../../../state/store';
import { IconPortrait } from '../../home/StationList';
import { useTheme } from '../../theme';
import { CharacterBust } from '../art';
import { cookLook } from '../scene/world/cast';

export function SimStationPortrait({ b, venueId, size }: { b: Business; venueId: string; size: number }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const color = t.c.stages.production;
  const look = useMemo(() => (E.isSim(cfg) ? cookLook(cfg, venueId, b.id, color) : null), [cfg, venueId, b.id, color]);
  if (look) return <CharacterBust look={look} size={size} />;
  return <IconPortrait b={b} size={size} />;
}
