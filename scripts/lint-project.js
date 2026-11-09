const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadPolicy, childEnvironment } = require('./runtime-policy.cjs');
const runtime = loadPolicy();
const args = process.argv.slice(2);
if (args.length !== 1 || args[0] !== '--max-warnings=0')
  throw new Error('Lint requires --max-warnings=0.');
const extensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.cts']);
const ignored = new Set([
  '.git',
  '.expo',
  'node_modules',
  'dist',
  'web-build',
  'assets',
  'android',
  'ios',
]);
function collect(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return collect(file);
    return entry.name !== 'expo-env.d.ts' && extensions.has(path.extname(entry.name)) ? [file] : [];
  });
}
const files = collect('.');
const plugins = path.dirname(require.resolve('eslint-config-expo'));
if (!files.length) throw new Error('No lintable files found.');
if (!global.gc) {
  const result = spawnSync(process.execPath, ['--expose-gc', __filename, ...args], {
    env: childEnvironment(runtime),
    stdio: 'inherit',
    windowsHide: true,
  });
  process.exit(result.status || (result.error ? 1 : 0));
}
async function lint() {
  const { ESLint } = require('eslint');
  const engine = new ESLint({ resolvePluginsRelativeTo: plugins });
  const formatter = await engine.loadFormatter('stylish');
  process.stdout.write(`ESLint: ${files.length} files, serial groups of ${runtime.lintBatch}.\n`);
  for (let start = 0; start < files.length; start += runtime.lintBatch) {
    const batch = files.slice(start, start + runtime.lintBatch);
    const results = await engine.lintFiles(batch);
    if (results.some((result) => result.errorCount || result.warningCount)) {
      process.stderr.write(formatter.format(results));
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`Lint ${start + 1}-${start + batch.length}/${files.length}\n`);
    global.gc();
  }
  process.stdout.write(`ESLint: all ${files.length} files passed with zero warnings.\n`);
}
lint().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
