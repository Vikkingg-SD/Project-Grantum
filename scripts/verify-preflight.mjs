import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import eslint from 'eslint';
import { analyzeModules, compareModuleExports } from './module-exports.mjs';

// Expo's legacy parser override covers .ts/.tsx, while this project's TS rule also
// applies to .mjs. Supply that same installed parser; preserve every configured rule.
const projectRequire = createRequire(import.meta.url);
const expoConfig = projectRequire.resolve('eslint-config-expo');
const expoRequire = createRequire(expoConfig);
const linter = new eslint.ESLint({
  resolvePluginsRelativeTo: dirname(expoConfig),
  overrideConfig: { parser: expoRequire.resolve('@typescript-eslint/parser') },
});
const lintFiles = ['module-exports.mjs', 'verify-preflight.mjs'].map((file) =>
  fileURLToPath(new URL(file, import.meta.url))
);
const lintResults = await linter.lintFiles(lintFiles);
if (lintResults.some((result) => result.errorCount || result.warningCount)) {
  const formatter = await linter.loadFormatter('stylish');
  process.stderr.write(formatter.format(lintResults));
  process.exit(1);
}
// Guard the parser fix: runtime uses stay clean and genuinely unused values still fail.
const [used] = await linter.lintText('const value = 1;\nprocess.stdout.write(String(value));\n', {
  filePath: lintFiles[0],
});
assert.equal(used.errorCount + used.warningCount, 0);
const [unused] = await linter.lintText('const unusedValue = 1;\n', { filePath: lintFiles[0] });
assert.ok(
  unused.messages.some((message) => message.ruleId === '@typescript-eslint/no-unused-vars')
);
process.stdout.write('PASS strict lint coverage and parser sentinels\n');

const graph = (files, resolver) => analyzeModules(new Map(Object.entries(files)), resolver);
const clean = (files) => {
  const result = graph(files);
  assert.deepEqual(result.diagnostics, []);
  return result;
};
const names = (result, file) => [...result.modules.get(file).names].sort();
const diagnostic = (result, code) => {
  assert.ok(result.diagnostics.some((item) => item.code === code && item.level === 'FAIL'));
  assert.equal(
    result.diagnostics.some((item) => item.code === 'MODULE-ANALYSIS'),
    false
  );
};

const cases = [
  [
    'direct declarations',
    () => {
      const result = clean({
        'src/a.ts': 'export const a = 1, b = 2; export function fn() {} export class C {}',
      });
      assert.deepEqual(names(result, 'src/a.ts'), ['C', 'a', 'b', 'fn']);
    },
  ],
  [
    'star barrel',
    () => {
      const result = clean({
        'src/a.ts': 'export const x = 1;',
        'src/index.ts': "export * from './a';",
        'app/home.ts': "import { x } from '../src'; void x;",
      });
      assert.deepEqual(names(result, 'src/index.ts'), ['x']);
      assert.ok(result.graph.get('src/index.ts').has('src/a.ts'));
    },
  ],
  [
    'multi-hop',
    () => {
      const result = clean({
        'src/a.ts': 'export const x = 1;',
        'src/b.ts': "export * from './a';",
        'src/c.ts': "export * from './b';",
      });
      assert.deepEqual(names(result, 'src/c.ts'), ['x']);
    },
  ],
  [
    'cycle',
    () => {
      const result = clean({
        'src/a.ts': "export const a = 1; export * from './b';",
        'src/b.ts': "export const b = 2; export * from './a';",
      });
      assert.deepEqual(names(result, 'src/a.ts'), ['a', 'b']);
      assert.deepEqual(names(result, 'src/b.ts'), ['a', 'b']);
    },
  ],
  [
    'diamond',
    () => {
      const result = clean({
        'src/a.ts': 'export const x = 1;',
        'src/b.ts': "export * from './a';",
        'src/c.ts': "export * from './a';",
        'src/d.ts': "export * from './b'; export * from './c';",
      });
      assert.equal(
        result.modules.get('src/a.ts').identities.get('x'),
        result.modules.get('src/d.ts').identities.get('x')
      );
    },
  ],
  [
    'true collision',
    () => {
      const result = graph({
        'src/a.ts': 'export const x = 1;',
        'src/b.ts': 'export const x = 2;',
        'src/c.ts': "export * from './a'; export * from './b';",
      });
      assert.ok(
        result.diagnostics.some(
          (item) =>
            item.code === 'MODULE-ANALYSIS' && item.level === 'FAIL' && /TS2308/.test(item.msg)
        )
      );
    },
  ],
  [
    'explicit override',
    () => {
      const result = clean({
        'src/a.ts': 'export const x = 1;',
        'src/b.ts': 'export const x = 2;',
        'src/c.ts': "export * from './a'; export * from './b'; export { x } from './a';",
      });
      assert.equal(
        result.modules.get('src/a.ts').identities.get('x'),
        result.modules.get('src/c.ts').identities.get('x')
      );
    },
  ],
  [
    'default exclusion',
    () => {
      const before = clean({
        'src/a.ts': 'export default 1; export const x = 2;',
        'src/index.ts': "export * from './a';",
      });
      assert.equal(before.modules.get('src/index.ts').hasDefault, false);
      assert.deepEqual(names(before, 'src/index.ts'), ['x']);
      const after = clean({
        'src/a.ts': 'export const x = 2;',
        'src/index.ts': "export * from './a';",
      });
      assert.equal(compareModuleExports(before, after)[0].code, 'EXPORT-LOST');
    },
  ],
  [
    'default-as-named',
    () => {
      const result = clean({
        'src/a.ts': 'export default 1;',
        'src/index.ts': "export { default as value } from './a';",
        'app/home.ts': "import { value } from '../src'; void value;",
      });
      assert.deepEqual(names(result, 'src/index.ts'), ['value']);
    },
  ],
  [
    'namespace export',
    () => {
      const result = clean({
        'src/a.ts': 'export const x = 1;',
        'src/index.ts': "export * as group from './a';",
      });
      assert.deepEqual(names(result, 'src/index.ts'), ['group']);
    },
  ],
  [
    'type-only export',
    () => {
      const result = clean({
        'src/a.ts': 'export interface Item { value: string } export type Key = string;',
        'src/index.ts': "export type { Item, Key as Identifier } from './a';",
        'app/home.ts': "import type { Item } from '../src'; export type Copy = Item;",
      });
      assert.deepEqual(names(result, 'src/index.ts'), ['Identifier', 'Item']);
      assert.ok(result.modules.get('src/index.ts').typeNames.has('Item'));
    },
  ],
  [
    '@/ alias',
    () => {
      clean({
        'src/a.ts': 'export const x = 1;',
        'app/home.ts': "import { x } from '@/a'; void x;",
      });
    },
  ],
  [
    'relative/index/extension resolution',
    () => {
      clean({
        'src/a.ts': 'export const a = 1;',
        'src/dir/index.tsx': 'export const b = 2;',
        'src/c.mjs': 'export const c = 3;',
        'src/d.jsx': 'export const d = 4;',
        'app/home.ts':
          "import { a } from '../src/a.js'; import { b } from '../src/dir'; import { c } from '../src/c.mjs'; import { d } from '../src/d.jsx'; void [a,b,c,d];",
      });
    },
  ],
  [
    'local export alias',
    () => {
      const result = clean({ 'src/a.ts': 'const local = 1; export { local as publicName };' });
      assert.deepEqual(names(result, 'src/a.ts'), ['publicName']);
    },
  ],
  [
    'import alias',
    () => {
      const result = clean({
        'src/a.ts': 'export const x = 1;',
        'src/b.ts': "import { x as local } from './a'; export { local as publicName };",
      });
      assert.equal(
        result.modules.get('src/a.ts').identities.get('x'),
        result.modules.get('src/b.ts').identities.get('publicName')
      );
    },
  ],
  [
    'missing target',
    () => diagnostic(graph({ 'src/a.ts': "export * from './absent';" }), 'MISSING-FILE'),
  ],
  [
    'empty target',
    () =>
      diagnostic(
        graph({ 'src/a.ts': '', 'src/b.ts': "import { x } from './a'; void x;" }),
        'EMPTY-TARGET'
      ),
  ],
  [
    'missing name',
    () =>
      diagnostic(
        graph({ 'src/a.ts': 'export const x = 1;', 'src/b.ts': "export { missing } from './a';" }),
        'MISSING-EXPORT'
      ),
  ],
  [
    'missing default',
    () =>
      diagnostic(
        graph({
          'src/a.ts': 'export const x = 1;',
          'src/b.ts': "import value from './a'; void value;",
        }),
        'NO-DEFAULT'
      ),
  ],
  [
    'comment decoy',
    () => {
      const result = clean({
        'src/a.ts':
          "// import { absent } from './absent';\n/* export * from './nope' */\nexport const x = 1;",
      });
      assert.deepEqual(names(result, 'src/a.ts'), ['x']);
      assert.equal(result.imports.length, 0);
    },
  ],
  [
    'string decoy',
    () => {
      const result = clean({
        'src/a.ts':
          'const text = "export const phantom = 1; import fake from \'./absent\'"; export { text };',
      });
      assert.deepEqual(names(result, 'src/a.ts'), ['text']);
      assert.equal(result.imports.length, 0);
    },
  ],
  [
    'malformed syntax',
    () => {
      const result = graph({ 'src/a.ts': 'export const = ;' });
      assert.ok(
        result.diagnostics.some((item) => item.code === 'MODULE-ANALYSIS' && item.level === 'FAIL')
      );
      const brokenResolver = graph({ 'src/a.ts': "export * from './b';" }, () => {
        throw new Error('Injected resolver failure');
      });
      assert.ok(
        brokenResolver.diagnostics.some(
          (item) => item.code === 'MODULE-ANALYSIS' && item.level === 'FAIL'
        )
      );
    },
  ],
  [
    'consumed previous export lost (EXPORT-REGRESSION)',
    () => {
      const previous = clean({ 'src/a.ts': 'export const gone = 1, kept = 2;' });
      const current = graph({
        'src/a.ts': 'export const kept = 2;',
        'app/home.ts': "import { gone as value } from '../src/a'; void value;",
      });
      assert.deepEqual(
        compareModuleExports(previous, current).map(({ level, code }) => ({ level, code })),
        [{ level: 'FAIL', code: 'EXPORT-REGRESSION' }]
      );
    },
  ],
  [
    'unconsumed previous export lost (EXPORT-LOST)',
    () => {
      const previous = clean({ 'src/a.ts': 'export const gone = 1, kept = 2;' });
      const current = clean({ 'src/a.ts': 'export const kept = 2;' });
      assert.deepEqual(
        compareModuleExports(previous, current).map(({ level, code }) => ({ level, code })),
        [{ level: 'WARN', code: 'EXPORT-LOST' }]
      );
    },
  ],
];

for (const [name, verify] of cases) {
  verify();
  process.stdout.write(`PASS ${name}\n`);
}
assert.equal(cases.length, 24);
process.stdout.write(`ALL ${cases.length} PREFLIGHT CASES PASS\n`);
