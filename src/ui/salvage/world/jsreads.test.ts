/**
 * owner1 phone 1 (the owner's review, point 1, "helper laggy"): on a phone, reading a shared value on the
 * JavaScript thread after the UI thread has written it is a BLOCKING hop to the UI thread (Reanimated 4,
 * mutables.native.ts: a dirty value is fetched with runOnUISync). The frame loop writes the boss's body, the
 * camera and the crew's places every frame, so a store subscription (about 20 changes a second) that reads one
 * stalls JavaScript on every change: a stall the web preview never shows. This test reads the world's files and
 * fails on a `.value` READ inside a function handed to `.subscribe(...)` (writes are asynchronous and allowed;
 * `typeof x.value` is a type). Use the rules' own presence in the state (frame.boss) instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = __dirname;
const FILES = fs.readdirSync(DIR).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f));

/** The text of the block that starts at the `{` at `open` (strings and comments are not parsed: the world's files keep braces balanced in them). */
function block(src: string, open: number): string {
  let d = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}' && --d === 0) return src.slice(open, i + 1);
  }
  return src.slice(open);
}

/** The bodies of every function handed to `.subscribe(`: inline arrows, or a name defined in the same file. */
function subscribedBodies(src: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  const re = /\.subscribe\(\s*([A-Za-z_$][\w$]*)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const name = m[1];
    if (name && name !== 'function') {
      const def = new RegExp(`(?:const|let|function)\\s+${name.replace(/\$/g, '\\$')}\\b[^{]*?(?:=>\\s*)?\\{`, 'g');
      // The definition in scope: the nearest one above the call.
      let d: RegExpExecArray | null;
      let at = -1;
      while ((d = def.exec(src)) && d.index < m.index) at = d.index + d[0].length - 1;
      if (at >= 0) out.push({ name, body: block(src, at) });
    } else {
      // An inline arrow with a block body: `(...) => {`.
      const arrow = /^\s*\([^)]*\)\s*=>\s*\{/.exec(src.slice(m.index + m[0].length));
      if (arrow) out.push({ name: '(inline)', body: block(src, m.index + m[0].length + arrow[0].length - 1) });
    }
  }
  return out;
}

/** `.value` reads in a body: not an assignment (`x.value = ...`), not `typeof x.value`, not a comment line. */
function valueReads(body: string): string[] {
  const out: string[] = [];
  for (const line of body.split('\n')) {
    const code = line.replace(/\/\/.*$/, '');
    const re = /(typeof\s+)?\b([\w$.]+)\.value\b(?!\s*=[^=])/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code))) if (!m[1]) out.push(`${m[2]}.value: ${line.trim()}`);
  }
  return out;
}

describe('owner1 phone 1: no shared value is read on the JavaScript thread at a store change', () => {
  it('the checker finds a read and lets writes and types pass', () => {
    const bad = `const run = () => {\n  const b = anim.body.value;\n  rings.value = [];\n  type T = (typeof rings.value)[number];\n};\nuseGame.subscribe(run);`;
    const found = subscribedBodies(bad).flatMap((b) => valueReads(b.body));
    expect(found).toEqual(['anim.body.value: const b = anim.body.value;']);
    const inline = `useGame.subscribe((s) => {\n  if (loadingClock.done.value) open();\n});`;
    expect(subscribedBodies(inline).flatMap((b) => valueReads(b.body))).toHaveLength(1);
  });

  it.each(FILES)('%s: every function subscribed to a store reads no `.value`', (file) => {
    const src = fs.readFileSync(path.join(DIR, file), 'utf8');
    const reads = subscribedBodies(src).flatMap((b) => valueReads(b.body).map((r) => `${b.name}: ${r}`));
    expect(reads).toEqual([]);
  });
});
