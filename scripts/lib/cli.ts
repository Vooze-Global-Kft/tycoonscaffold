export function args(argv = process.argv.slice(2)) {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else flags[key] = 'true';
    } else positional.push(a);
  }
  return { positional, flags };
}

export function fail(msg: string): never {
  console.error('✖ ' + msg);
  process.exit(1);
}
