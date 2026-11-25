/**
 * Every word the salvage screens show (AGENTS.md: one file per mode; the fingerprint and the voice
 * check read it). PLACEHOLDER words of the ground work (docs/design/yard-ground.md): the specification
 * (docs/design/yard-design.md) decides the real ones. Names of things come from game.json once it names them.
 */
export const WORLD_LABELS = {
  wreck: 'WRECK',
  machine: 'MACHINE',
  truck: 'TRUCK',
} as const;

export const S = {
  rotateTitle: 'Turn your phone sideways',
  rotateBody: 'This game is played in landscape.',
  carried: (n: number, cap: number) => `Carrying ${n} / ${cap}`,
  cash: (n: number) => `$${Math.floor(n).toLocaleString('en-US')}`,
  stepOut: 'Step out',
  menu: 'Menu',
  panelTitle: 'PLACEHOLDER panel',
  panelBody: 'The side panel of the mode’s own overlays. Android back or the scrim closes it.',
  openCard: 'Open the card',
  close: 'Close',
  cardTitle: 'PLACEHOLDER card',
  cardBody: 'The centred card of the mode’s own overlays, on top of the panel.',
  ok: 'OK',
  loading: 'Loading the yard…',
  loadingNote: 'PLACEHOLDER loading screen',
  hintStick: 'Thumb down on the left to walk',
} as const;
