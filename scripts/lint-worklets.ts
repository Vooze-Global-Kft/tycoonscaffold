/**
 * Checks the animation code that runs on the phone's UI thread ("worklets").
 *
 * Why this exists: on phones, a worklet may only call other worklets. Calling an ordinary function
 * from one stops the app with "Tried to synchronously call a non-worklet function on the UI
 * thread". In the web preview worklets are ordinary functions, so the mistake is invisible there.
 * This script finds it before a phone does.
 *
 *   npx tsx scripts/lint-worklets.ts            check src/
 *   npx tsx scripts/lint-worklets.ts --verbose  also list every worklet found and all notes
 *
 * What counts as a worklet (the same rules as the react-native-worklets compiler plugin):
 * - a function whose body starts with the 'worklet' directive, and every top-level function of a
 *   file that starts with it;
 * - a function passed to useAnimatedStyle, useDerivedValue, useAnimatedReaction, useFrameCallback,
 *   withTiming's callback and friends (see AUTO below), also when passed by name from the same file;
 * - any function defined inside a worklet.
 *
 * Errors (exit code 1):
 * - a worklet calls, or passes along, a project function that is not a worklet;
 * - a worklet calls a function it was given (a parameter, or a property of an object type) and
 *   some caller gives it a non-worklet.
 * Notes (printed with --verbose, never fail): calls it cannot resolve, timers and browser globals
 * inside worklets, calls into packages other than Reanimated, Worklets and Skia.
 */
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');

/** Functions whose arguments the compiler turns into worklets: name -> argument positions. */
const AUTO = new Map<string, number[]>([
  ['useFrameCallback', [0]],
  ['useAnimatedStyle', [0]],
  ['useAnimatedProps', [0]],
  ['createAnimatedPropAdapter', [0]],
  ['useDerivedValue', [0]],
  ['useAnimatedScrollHandler', [0]],
  ['useAnimatedReaction', [0, 1]],
  ['withTiming', [2, 3]],
  ['withSpring', [2, 3]],
  ['withDecay', [1]],
  ['withRepeat', [3]],
  ['runOnUI', [0]],
  ['executeOnUIRuntimeSync', [0]],
  ['scheduleOnUI', [0]],
  ['runOnUISync', [0]],
  ['runOnUIAsync', [0]],
  ['runOnRuntime', [1]],
  ['runOnRuntimeSync', [1]],
  ['runOnRuntimeAsync', [1]],
  ['scheduleOnRuntime', [1]],
]);
/** Gesture callbacks are worklets too (react-native-gesture-handler builder methods). */
const GESTURE_METHODS = new Set(['onBegin', 'onStart', 'onEnd', 'onFinalize', 'onUpdate', 'onChange', 'onTouchesDown', 'onTouchesMove', 'onTouchesUp', 'onTouchesCancelled']);
/** Calling the result of these hands a function back to the JS thread: their argument need not be a worklet. */
const TO_JS = new Set(['runOnJS', 'scheduleOnRN']);
/** Packages whose functions are safe to call from a worklet. */
const SAFE_PACKAGES = ['react-native-reanimated', 'react-native-worklets', '@shopify/react-native-skia', 'typescript/lib'];
/** Globals that do not exist, or do not do what one expects, on the UI thread. */
const RISKY_GLOBALS = new Set(['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'fetch', 'document', 'window', 'location', 'navigator', 'localStorage', 'require', 'alert']);

type Fn = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | ts.MethodDeclaration;

const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.json');
if (!configPath) throw new Error('tsconfig.json not found');
const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (d) => { throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n')); } });
if (!parsed) throw new Error('could not read tsconfig.json');
const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
const checker = program.getTypeChecker();
const sources = program.getSourceFiles().filter((f) => !f.isDeclarationFile && !f.fileName.includes('/node_modules/') && f.fileName.startsWith(path.join(ROOT, 'src') + path.sep));

const isFn = (n: ts.Node | undefined): n is Fn => !!n && (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n));
const where = (n: ts.Node) => {
  const sf = n.getSourceFile();
  const { line } = sf.getLineAndCharacterOfPosition(n.getStart());
  return `${path.relative(ROOT, sf.fileName)}:${line + 1}`;
};
const nameOf = (fn: Fn): string => {
  if ((ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn) || ts.isFunctionExpression(fn)) && fn.name) return fn.name.getText();
  const p = fn.parent;
  if (p && (ts.isVariableDeclaration(p) || ts.isPropertyAssignment(p)) && p.name) return p.name.getText();
  return '(anonymous)';
};

function hasDirective(body: ts.Node | undefined): boolean {
  if (!body || !ts.isBlock(body)) return false;
  for (const s of body.statements) {
    if (ts.isExpressionStatement(s) && ts.isStringLiteral(s.expression)) {
      if (s.expression.text === 'worklet') return true;
      continue;
    }
    break;
  }
  return false;
}

function fileHasDirective(sf: ts.SourceFile): boolean {
  for (const s of sf.statements) {
    if (ts.isExpressionStatement(s) && ts.isStringLiteral(s.expression)) {
      if (s.expression.text === 'worklet') return true;
      continue;
    }
    break;
  }
  return false;
}

/** The function a name or expression refers to, when it is defined in project source. */
function resolveFn(node: ts.Node): Fn | null {
  if (isFn(node)) return node;
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)) return resolveFn(node.expression);
  let sym = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(node) ? node.name : node);
  if (!sym) return null;
  if (sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
  for (const d of sym.declarations ?? []) {
    if (isFn(d)) return d;
    if ((ts.isVariableDeclaration(d) || ts.isPropertyAssignment(d)) && d.initializer) {
      const inner = resolveFn(d.initializer);
      if (inner) return inner;
    }
    if (ts.isShorthandPropertyAssignment(d)) {
      const v = checker.getShorthandAssignmentValueSymbol(d);
      for (const vd of v?.declarations ?? []) {
        if (isFn(vd)) return vd;
        if (ts.isVariableDeclaration(vd) && vd.initializer && isFn(vd.initializer)) return vd.initializer;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------- pass 1: which functions are worklets

const worklets = new Set<Fn>();
/** For a property or method signature of an object type: the functions that implement it in object literals. */
const implementations = new Map<ts.Node, Fn[]>();

function markArg(arg: ts.Expression, acceptObject: boolean) {
  const fn = resolveFn(arg);
  // The compiler follows a name only inside the same file.
  if (fn && fn.getSourceFile() === arg.getSourceFile()) worklets.add(fn);
  if (acceptObject && ts.isObjectLiteralExpression(arg)) {
    for (const p of arg.properties) {
      if (ts.isMethodDeclaration(p)) worklets.add(p);
      else if (ts.isPropertyAssignment(p)) markArg(p.initializer, false);
    }
  }
}

function collect(node: ts.Node, fileDirective: boolean) {
  if (isFn(node)) {
    if (hasDirective(node.body)) worklets.add(node);
    else if (fileDirective && isTopLevel(node)) worklets.add(node);
  }
  if (ts.isCallExpression(node)) {
    const callee = node.expression;
    const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : undefined;
    if (name && AUTO.has(name)) {
      for (const i of AUTO.get(name)!) if (node.arguments[i]) markArg(node.arguments[i], name === 'useAnimatedScrollHandler');
    } else if (name && GESTURE_METHODS.has(name) && ts.isPropertyAccessExpression(callee) && /\bGesture\b/.test(callee.expression.getText())) {
      if (node.arguments[0]) markArg(node.arguments[0], false);
    }
  }
  if (ts.isObjectLiteralExpression(node)) {
    const ctx = checker.getContextualType(node);
    if (ctx) {
      for (const p of node.properties) {
        if (!p.name || !(ts.isPropertyAssignment(p) || ts.isMethodDeclaration(p) || ts.isShorthandPropertyAssignment(p))) continue;
        const fn = ts.isMethodDeclaration(p) ? p : ts.isPropertyAssignment(p) ? resolveFn(p.initializer) : resolveFn(p.name);
        if (!fn) continue;
        const prop = ctx.getProperty(p.name.getText());
        for (const d of prop?.declarations ?? []) {
          if (d === p) continue;
          const list = implementations.get(d) ?? [];
          list.push(fn);
          implementations.set(d, list);
        }
      }
    }
  }
  ts.forEachChild(node, (c) => collect(c, fileDirective));
}

function isTopLevel(fn: Fn): boolean {
  let p: ts.Node = fn.parent;
  while (p && !ts.isSourceFile(p)) {
    if (isFn(p)) return false;
    p = p.parent;
  }
  return true;
}

for (const sf of sources) collect(sf, fileHasDirective(sf));

/** A function is a worklet when it is marked, or defined inside one. */
function inWorklet(node: ts.Node): boolean {
  let p: ts.Node | undefined = node;
  while (p && !ts.isSourceFile(p)) {
    if (isFn(p) && worklets.has(p)) return true;
    p = p.parent;
  }
  return false;
}

// ---------------------------------------------------------------- pass 2: what worklets call and capture

const errors: string[] = [];
const notes: string[] = [];
const seen = new Set<string>();
const report = (list: string[], msg: string) => {
  if (!seen.has(msg)) {
    seen.add(msg);
    list.push(msg);
  }
};

/** Parameters and object-type members that a worklet calls or passes on: every value given for them must be a worklet. */
const neededParams = new Map<ts.ParameterDeclaration, string>();
const neededMembers = new Map<ts.Node, string>();

function declarationsOf(node: ts.Node): ts.Declaration[] {
  let sym = checker.getSymbolAtLocation(node);
  if (!sym) return [];
  if (sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
  return sym.declarations ?? [];
}

function isCallable(node: ts.Node): boolean {
  const t = checker.getTypeAtLocation(node);
  return t.getCallSignatures().length > 0;
}

function packageOf(file: string): string | null {
  const m = /node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(file);
  return m ? m[1] : null;
}

/** Checks one use of a function-valued name inside a worklet. `how` is "calls" or "passes on". */
function checkUse(use: ts.Node, nameNode: ts.Node, worklet: Fn, how: string) {
  const decls = declarationsOf(nameNode);
  if (decls.length === 0) {
    if (how === 'calls') report(notes, `${where(use)}: cannot resolve ${nameNode.getText()}() inside worklet ${nameOf(worklet)}`);
    return;
  }
  for (const d of decls) {
    const file = d.getSourceFile().fileName;
    if (file.includes('/node_modules/') || d.getSourceFile().isDeclarationFile) {
      const pkg = packageOf(file) ?? 'typescript/lib';
      if (!SAFE_PACKAGES.some((p) => pkg === p || file.includes(`/${p}/`))) report(notes, `${where(use)}: worklet ${nameOf(worklet)} ${how} ${nameNode.getText()} from package ${pkg}`);
      continue;
    }
    if (ts.isParameter(d)) {
      // A function handed in: fine if it is a parameter of the worklet itself or of a function nested in it
      // (then the caller on the UI thread supplies it); otherwise every caller of the outer function must pass a worklet.
      const owner = d.parent;
      if (isFn(owner) && inWorklet(owner)) continue;
      neededParams.set(d, `${where(use)}: worklet ${nameOf(worklet)} ${how} parameter "${d.name.getText()}"`);
      continue;
    }
    if (ts.isPropertySignature(d) || ts.isMethodSignature(d)) {
      neededMembers.set(d, `${where(use)}: worklet ${nameOf(worklet)} ${how} member "${d.name.getText()}"`);
      continue;
    }
    let fn: Fn | null = null;
    if (isFn(d)) fn = d;
    else if ((ts.isVariableDeclaration(d) || ts.isPropertyAssignment(d)) && d.initializer) fn = resolveFn(d.initializer);
    else if (ts.isBindingElement(d) || ts.isVariableDeclaration(d)) {
      // A local or a destructured value: nothing more can be said statically.
      if (!inWorklet(d) && how === 'calls') report(notes, `${where(use)}: worklet ${nameOf(worklet)} calls "${nameNode.getText()}", a value captured from outside (check it is a worklet)`);
      continue;
    }
    if (!fn) continue;
    if (worklets.has(fn) || inWorklet(fn)) continue;
    report(errors, `${where(use)}: worklet ${nameOf(worklet)} ${how} ${nameNode.getText()}, which is not a worklet (defined at ${where(fn)}). Add 'worklet'; as its first line, or call it through runOnJS / scheduleOnRN.`);
  }
}

function walk(node: ts.Node, worklet: Fn) {
  if (ts.isCallExpression(node)) {
    const callee = node.expression;
    // runOnJS(fn)(...): the inner call hands `fn` to the JS thread.
    if (ts.isCallExpression(callee) && ts.isIdentifier(callee.expression) && TO_JS.has(callee.expression.text)) {
      for (const a of node.arguments) walk(a, worklet);
      return;
    }
    if (ts.isIdentifier(callee) && TO_JS.has(callee.text)) return;
    if (ts.isIdentifier(callee)) checkUse(node, callee, worklet, 'calls');
    else if (ts.isPropertyAccessExpression(callee)) {
      checkUse(node, callee.name, worklet, 'calls');
      walk(callee.expression, worklet);
    } else walk(callee, worklet);
    for (const a of node.arguments) walk(a, worklet);
    return;
  }
  if (ts.isIdentifier(node)) {
    const p = node.parent;
    const isName =
      (ts.isPropertyAccessExpression(p) && p.name === node) ||
      (ts.isPropertyAssignment(p) && p.name === node) ||
      (ts.isVariableDeclaration(p) && p.name === node) ||
      (ts.isParameter(p) && p.name === node) ||
      (ts.isBindingElement(p) && (p.name === node || p.propertyName === node)) ||
      ts.isTypeReferenceNode(p) ||
      ts.isTypeQueryNode(p) ||
      (isFn(p) && (p as { name?: ts.Node }).name === node);
    if (isName) return;
    if (RISKY_GLOBALS.has(node.text) && declarationsOf(node).every((d) => d.getSourceFile().isDeclarationFile)) {
      report(notes, `${where(node)}: worklet ${nameOf(worklet)} uses ${node.text}, which is not available (or not the same) on the UI thread`);
      return;
    }
    // A function mentioned without being called (passed to map(), stored, returned).
    if (isCallable(node)) checkUse(node, node, worklet, 'passes on');
    return;
  }
  if (ts.isTypeNode(node)) return;
  ts.forEachChild(node, (c) => walk(c, worklet));
}

for (const fn of worklets) if (fn.body) walk(fn.body, fn);

// ---------------------------------------------------------------- pass 3: what callers hand to worklets

function argIsWorklet(arg: ts.Expression): 'yes' | 'no' | 'unknown' {
  const fn = resolveFn(arg);
  if (fn) return worklets.has(fn) || inWorklet(fn) ? 'yes' : 'no';
  if (ts.isIdentifier(arg)) {
    const d = declarationsOf(arg)[0];
    // Passed straight through from the caller's own parameter: checked one level up.
    if (d && ts.isParameter(d)) {
      neededParams.set(d, `${where(arg)}: passed on to a worklet as "${arg.text}"`);
      return 'yes';
    }
  }
  return 'unknown';
}

for (let round = 0; round < 4; round++) {
  const params = [...neededParams.entries()];
  neededParams.clear();
  if (params.length === 0) break;
  for (const [param, why] of params) {
    const owner = param.parent;
    if (!isFn(owner)) continue;
    const index = owner.parameters.indexOf(param);
    const ownerSym = owner.name ? checker.getSymbolAtLocation(owner.name) : ts.isVariableDeclaration(owner.parent) ? checker.getSymbolAtLocation(owner.parent.name) : undefined;
    if (!ownerSym) {
      report(notes, `${why}: cannot find the callers of ${nameOf(owner)}`);
      continue;
    }
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n)) {
        const calleeName = ts.isPropertyAccessExpression(n.expression) ? n.expression.name : n.expression;
        let sym = checker.getSymbolAtLocation(calleeName);
        if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
        if (sym === ownerSym) {
          const arg = n.arguments[index];
          if (arg) {
            const verdict = argIsWorklet(arg);
            if (verdict === 'no') report(errors, `${where(arg)}: ${nameOf(owner)}() needs a worklet for "${param.name.getText()}" but gets a plain function. (${why})`);
            else if (verdict === 'unknown' && isCallable(arg)) report(notes, `${where(arg)}: cannot tell whether the value given to ${nameOf(owner)}("${param.name.getText()}") is a worklet. (${why})`);
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    for (const sf of sources) visit(sf);
  }
}

for (const [member, why] of neededMembers) {
  const impls = implementations.get(member) ?? [];
  if (impls.length === 0) report(notes, `${why}: no implementation found to check`);
  for (const fn of impls) {
    if (!(worklets.has(fn) || inWorklet(fn))) report(errors, `${where(fn)}: ${nameOf(fn)} is called from a worklet but is not one. Add 'worklet'; as its first line. (${why})`);
  }
}

// ---------------------------------------------------------------- report

console.log(`worklets found: ${worklets.size} in ${new Set([...worklets].map((w) => w.getSourceFile().fileName)).size} files`);
if (VERBOSE) {
  for (const w of [...worklets].sort((a, b) => where(a).localeCompare(where(b)))) console.log(`  worklet ${nameOf(w)}  ${where(w)}`);
  console.log(`\nnotes: ${notes.length}`);
  for (const n of notes.sort()) console.log(`  ${n}`);
} else if (notes.length > 0) {
  console.log(`notes: ${notes.length} (run with --verbose to see them)`);
}
if (errors.length > 0) {
  console.error(`\nERRORS: ${errors.length}`);
  for (const e of errors.sort()) console.error(`  ${e}`);
  process.exit(1);
}
console.log('no worklet errors');
