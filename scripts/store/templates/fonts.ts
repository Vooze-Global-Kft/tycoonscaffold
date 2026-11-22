/**
 * The fonts the store images are set in. Only files in the repository or installed on this machine
 * with a licence that allows use in images (SIL Open Font License 1.1 for all three):
 * - Lilita One: games/pizza-empire/assets/fonts/LilitaOne.ttf (licence next to it), Pizza Empire's own display face.
 * - Inter: /usr/share/fonts/opentype/inter (Debian package fonts-inter, OFL 1.1).
 * - JetBrains Mono: /usr/share/fonts/truetype/jetbrains-mono (Debian package fonts-jetbrains-mono, OFL 1.1).
 * A missing file stops the tool (it never falls back to whatever the browser has).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(__dirname, '../../..');

export const FONT_FILES = {
  lilita: path.join(ROOT, 'games/pizza-empire/assets/fonts/LilitaOne.ttf'),
  interSemi: '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf',
  interBold: '/usr/share/fonts/opentype/inter/Inter-Bold.otf',
  monoXB: '/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-ExtraBold.ttf',
  monoMed: '/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Medium.ttf',
  monoReg: '/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Regular.ttf',
} as const;

export function checkFonts(): void {
  const missing = Object.values(FONT_FILES).filter((f) => !fs.existsSync(f));
  if (missing.length) throw new Error('Missing font files (see scripts/store/README.md, "Fonts"):\n  ' + missing.join('\n  '));
}

const face = (family: string, file: string, weight = 400) =>
  `@font-face{font-family:'${family}';src:url('${pathToFileURL(file).href}');font-weight:${weight};font-style:normal;}`;

export const FONT_CSS = [
  face('Lilita', FONT_FILES.lilita),
  face('InterS', FONT_FILES.interSemi, 600),
  face('InterS', FONT_FILES.interBold, 700),
  face('Mono', FONT_FILES.monoReg, 400),
  face('Mono', FONT_FILES.monoMed, 500),
  face('Mono', FONT_FILES.monoXB, 800),
].join('\n');

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A caption: escaped, a "\n" in it is a chosen line break. */
export const cap = (s: string) => esc(s).replace(/\n/g, '<br>');
