/**
 * Where the sheets and full-screen views of spec 4.4 mount, above the desk and the bars. One at a
 * time: uiState holds one `sheet` and one `view`; each sheet is DecreeSheet (sheets/parts.tsx,
 * registered with useOverlay) or the kit Sheet, and shows only while uiState names it.
 *
 * Owned by the bars package (BARS), which mounts its own sheets in its block. The views package
 * (VIEWS) and the hints and platform package (PLATFORM) each add their mounts inside ONE block marked
 * with their name (an import and a line per sheet or view), re-reading this file immediately before
 * each edit.
 */
import type { DeskLayout } from '../layout';
// ===== BARS (bars and sheets) =====
import { CabinetSheet } from '../sheets/Cabinet';
import { applyBarsDevParams } from '../sheets/dev';
import { HeadlineClipping } from '../sheets/Headline';
import { LedgerSheet } from '../sheets/Ledger';
import { TrayPeek } from '../sheets/Peek';
import { CallConfirmSheet, PollSheet } from '../sheets/Poll';
import { SettingsSheet } from '../sheets/Settings';
import { ShopSheet } from '../sheets/Shop';
// The preview's &sheet=, &peek=, &headline=, &arm= switches (nothing on a phone).
applyBarsDevParams();
// ===== end BARS =====
// ===== VIEWS (face picker, Election Night, the Office; result, move, monument sheets) =====
import { ViewsHost } from '../views/ViewsHost';
// ===== end VIEWS =====
// ===== PLATFORM (hints and platform) =====
import { PlatformLayer } from '../platform';
// ===== end PLATFORM =====

export function Overlays({ layout }: { layout: DeskLayout }) {
  return (
    <>
      {/* ===== BARS ===== */}
      <TrayPeek layout={layout} />
      <HeadlineClipping layout={layout} />
      <LedgerSheet />
      <CabinetSheet />
      <PollSheet />
      <CallConfirmSheet />
      <ShopSheet />
      <SettingsSheet />
      {/* ===== end BARS ===== */}
      {/* ===== VIEWS ===== */}
      <ViewsHost />
      {/* ===== end VIEWS ===== */}
      {/* ===== PLATFORM ===== */}
      <PlatformLayer layout={layout} />
      {/* ===== end PLATFORM ===== */}
    </>
  );
}
