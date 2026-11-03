const { spawnSync } = require('node:child_process');
const path = require('node:path');
const eslintRoot = path.dirname(require.resolve('eslint/package.json'));
const { CLIEngine, getCLIEngineInternalSlots } = require(
  path.join(eslintRoot, 'lib', 'cli-engine', 'cli-engine.js')
);
const pluginRoot = path.dirname(require.resolve('eslint-config-expo'));

const args = process.argv.slice(2);
if (args.length !== 1 || args[0] !== '--max-warnings=0') {
  throw new Error('The project lint command requires --max-warnings=0.');
}

const extensions = ['.js', '.jsx', '.ts', '.tsx'];
const engine = new CLIEngine({ extensions, resolvePluginsRelativeTo: pluginRoot });
const enumerator = getCLIEngineInternalSlots(engine).fileEnumerator;
const files = [...enumerator.iterateFiles(['.'])]
  .filter((entry) => !entry.ignored)
  .map((entry) => entry.filePath);
const cli = path.join(path.dirname(require.resolve('eslint/package.json')), 'bin', 'eslint.js');

if (!files.length) throw new Error('ESLint enumerated no project files.');
process.stdout.write(`ESLint: ${files.length} files, unchanged config, sequential groups of 8.\n`);
for (let start = 0; start < files.length; start += 8) {
  const batch = files.slice(start, start + 8);
  process.stdout.write(`Lint ${start + 1}-${start + batch.length}/${files.length}\n`);
  const result = spawnSync(
    process.execPath,
    [cli, ...batch, ...args, '--resolve-plugins-relative-to', pluginRoot],
    {
      stdio: 'inherit',
      windowsHide: true,
    }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
process.stdout.write(`ESLint: all ${files.length} files passed with zero warnings.\n`);
