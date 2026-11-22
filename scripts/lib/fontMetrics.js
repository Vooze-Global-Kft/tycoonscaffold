// Reads the few numbers the app needs from a game's display font file (TrueType or OpenType):
// how wide each character is and how tall a line is, as fractions of the font size. The app uses
// them to size the cash counter exactly instead of guessing (src/ui/components/moneyWidth.ts).
// Plain CommonJS without dependencies, like games.js, so the Expo config loader can require it.
const fs = require('fs');

/** The font's table directory: { tag: { offset, length } }. */
function readTables(buf) {
  const count = buf.readUInt16BE(4);
  const tables = {};
  for (let i = 0; i < count; i++) {
    const o = 12 + i * 16;
    tables[buf.toString('latin1', o, o + 4)] = { offset: buf.readUInt32BE(o + 8), length: buf.readUInt32BE(o + 12) };
  }
  return tables;
}

/** A function from a Unicode code point to the font's glyph number (0 = the font does not have it). */
function glyphLookup(buf, cmap) {
  const base = cmap.offset;
  const count = buf.readUInt16BE(base + 2);
  let best = null;
  for (let i = 0; i < count; i++) {
    const o = base + 4 + i * 8;
    const platform = buf.readUInt16BE(o);
    const encoding = buf.readUInt16BE(o + 2);
    const sub = base + buf.readUInt32BE(o + 4);
    const format = buf.readUInt16BE(sub);
    // Unicode tables only: platform 0, or Windows with a Unicode encoding.
    if (!(platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10)))) continue;
    if (format === 12) {
      best = { format, sub };
      break; // covers all of Unicode: nothing better
    }
    if (format === 4 && !best) best = { format, sub };
  }
  if (!best) return () => 0;

  if (best.format === 12) {
    const groups = buf.readUInt32BE(best.sub + 12);
    return (cp) => {
      let lo = 0;
      let hi = groups - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const g = best.sub + 16 + mid * 12;
        const start = buf.readUInt32BE(g);
        const end = buf.readUInt32BE(g + 4);
        if (cp < start) hi = mid - 1;
        else if (cp > end) lo = mid + 1;
        else return buf.readUInt32BE(g + 8) + (cp - start);
      }
      return 0;
    };
  }

  // Format 4: segments of the 16-bit range.
  const segX2 = buf.readUInt16BE(best.sub + 6);
  const ends = best.sub + 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const rangeOffsets = deltas + segX2;
  return (cp) => {
    if (cp > 0xffff) return 0;
    for (let i = 0; i < segX2; i += 2) {
      if (cp > buf.readUInt16BE(ends + i)) continue;
      const start = buf.readUInt16BE(starts + i);
      if (cp < start) return 0;
      const delta = buf.readInt16BE(deltas + i);
      const rangeOffset = buf.readUInt16BE(rangeOffsets + i);
      if (rangeOffset === 0) return (cp + delta) & 0xffff;
      const glyph = buf.readUInt16BE(rangeOffsets + i + rangeOffset + (cp - start) * 2);
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
    }
    return 0;
  };
}

/**
 * { line, advances } for the font in `file`:
 * - `line`: height of one line of text as a multiple of the font size (the tallest of the font's
 *   own line measures, because phones do not all read the same one);
 * - `advances`: width of each character of `chars` as a fraction of the font size, three decimals.
 *   Characters the font does not have are left out (the phone draws them in another font).
 * Throws when the file is not a plain TrueType / OpenType font.
 * @param {string} file
 * @param {string} chars
 * @returns {{ line: number, advances: Record<string, number> }}
 */
function readFontMetrics(file, chars) {
  const buf = fs.readFileSync(file);
  const t = readTables(buf);
  if (!t.head || !t.hhea || !t.hmtx || !t.cmap) throw new Error('not a TrueType or OpenType font file');
  const unitsPerEm = buf.readUInt16BE(t.head.offset + 18);
  if (!unitsPerEm) throw new Error('font has no unitsPerEm');
  const hhea = t.hhea.offset;
  const lines = [buf.readInt16BE(hhea + 4) - buf.readInt16BE(hhea + 6) + buf.readInt16BE(hhea + 8)];
  if (t['OS/2'] && t['OS/2'].length >= 78) {
    const os2 = t['OS/2'].offset;
    lines.push(buf.readInt16BE(os2 + 68) - buf.readInt16BE(os2 + 70) + buf.readInt16BE(os2 + 72)); // typo ascender, descender, line gap
    lines.push(buf.readUInt16BE(os2 + 74) + buf.readUInt16BE(os2 + 76)); // win ascent + descent
  }
  const widths = buf.readUInt16BE(hhea + 34);
  const glyphOf = glyphLookup(buf, t.cmap);
  /** @type {Record<string, number>} */
  const advances = {};
  for (const ch of new Set(Array.from(chars))) {
    const glyph = glyphOf(ch.codePointAt(0));
    if (glyph === 0) continue;
    // Glyphs past the last full entry share the last advance width.
    const advance = buf.readUInt16BE(t.hmtx.offset + Math.min(glyph, widths - 1) * 4);
    advances[ch] = Math.round((advance / unitsPerEm) * 1000) / 1000;
  }
  return { line: Math.round((Math.max(...lines) / unitsPerEm) * 1000) / 1000, advances };
}

/**
 * What a formatted amount can contain: digits, punctuation, the suffix letters, and the game's own currency symbol.
 * @param {string} [symbol]
 * @returns {string}
 */
function moneyCharacters(symbol) {
  return '0123456789.,-+e ∞' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + (symbol || '');
}

module.exports = { readFontMetrics, moneyCharacters };
