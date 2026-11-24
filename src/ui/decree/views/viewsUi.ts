/**
 * A LOCAL STAND-IN of the VIEWS package until uiState (PLATFORM's) has a sheet type for the monument
 * offer (requested in requests.md: `{ type: 'monument' }` in DecreeSheet). It holds only whether the
 * monument sheet is open, and whether election night was open (so a view closed by Android back while
 * the votes are being counted jumps to the result, 4.4). UI only, never saved.
 * When uiState gains the sheet type, MonumentSheet reads `sheet?.type === 'monument'` and this file goes.
 */
import { create } from 'zustand';
import { useDecreeUi } from '../uiState';

interface ViewsUi {
  monument: boolean;
  openMonument(): void;
  closeMonument(): void;
}

export const useViewsUi = create<ViewsUi>((set) => ({
  monument: false,
  // One dialog at a time (4.4): the monument opens only when no other sheet or view is open.
  openMonument: () => {
    const ui = useDecreeUi.getState();
    if (ui.sheet || ui.view) return;
    ui.disarm();
    set({ monument: true });
  },
  closeMonument: () => set({ monument: false }),
}));

// Another sheet or view opening closes the monument sheet (one at a time).
useDecreeUi.subscribe((s) => {
  if ((s.sheet || s.view) && useViewsUi.getState().monument) useViewsUi.setState({ monument: false });
});
