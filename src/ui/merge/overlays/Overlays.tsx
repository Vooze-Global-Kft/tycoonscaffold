/**
 * Where the sheets and spokes of spec 4.4 mount, above the play canvas and the bars. One at a time:
 * uiState holds one `sheet` and one `spoke`; each sheet is MergeSheet (sheets/parts.tsx, registered
 * with useOverlay) and shows only while uiState names it. Owned by the bars package (BARS, 7a),
 * which mounts its own sheets below. The spokes package (SPOKES, 7b) and the hints and platform
 * package (PLATFORM, 8) each add their mounts inside ONE block marked with their name (an import
 * and a line per sheet or spoke), re-reading this file immediately before each edit.
 */
import type { MergeLayout } from '../layout';
// ===== BARS (bars and sheets package) =====
import { applySheetDevParams } from '../sheets/dev';
import { GiftSheet } from '../sheets/GiftSheet';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { ShopSheet } from '../sheets/ShopSheet';
import { ShutterSheet } from '../sheets/ShutterSheet';
import { StallSheet } from '../sheets/StallSheet';
import { TicketSheet } from '../sheets/TicketSheet';
// The preview's &sheet= and &gifts= switches (nothing on a phone).
applySheetDevParams();
// ===== end BARS =====
// ===== SPOKES (spokes package) =====
// The Ladder Book, the Lantern Gate, the Season scroll, the season close confirm and the change of season.
import { Spokes } from '../spokes/Spokes';
// ===== end SPOKES =====
// ===== PLATFORM (hints and platform package): Android back, the firefly, the away report =====
import { PlatformLayer } from '../platform';
// ===== end PLATFORM =====

export function Overlays({ layout }: { layout: MergeLayout }) {
  return (
    <>
      {/* ===== BARS ===== */}
      <StallSheet />
      <ShutterSheet />
      <TicketSheet />
      <GiftSheet />
      <ShopSheet />
      <SettingsSheet />
      {/* ===== end BARS ===== */}
      {/* ===== SPOKES ===== */}
      <Spokes />
      {/* ===== end SPOKES ===== */}
      {/* ===== PLATFORM ===== */}
      <PlatformLayer layout={layout} />
      {/* ===== end PLATFORM ===== */}
    </>
  );
}
