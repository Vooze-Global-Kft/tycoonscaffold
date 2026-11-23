/**
 * Where the sheets and full-screen views of spec 4.4 mount, above the desk and the bars. One at a
 * time: uiState holds one `sheet` and one `view`; each sheet is the kit Sheet (registered with
 * useOverlay) and shows only while uiState names it. PLACEHOLDER now: nothing mounts yet.
 *
 * Owned by the bars, sheets and views package (P7), which mounts its own sheets and views in its block.
 * The hints and platform package (P8) adds its mounts (Android back, the pen, the away report's
 * platform part) inside ITS block, an import and a line each, re-reading this file before each edit.
 */
import type { DeskLayout } from '../layout';
// ===== P7 (bars, sheets and views) =====
// ===== end P7 =====
// ===== P8 (hints and platform) =====
// ===== end P8 =====

export function Overlays({ layout }: { layout: DeskLayout }) {
  void layout;
  return (
    <>
      {/* ===== P7 ===== */}
      {/* ===== end P7 ===== */}
      {/* ===== P8 ===== */}
      {/* ===== end P8 ===== */}
    </>
  );
}
