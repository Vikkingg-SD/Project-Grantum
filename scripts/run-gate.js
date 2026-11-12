const { spawnSync } = require('node:child_process');
const { loadPolicy, childEnvironment } = require('./runtime-policy.cjs');
const runtime = loadPolicy();
const env = childEnvironment(runtime);
const allowed = ['--full', '--recover-timeouts'];
if (process.argv.slice(2).some((arg) => !allowed.includes(arg)))
  throw new Error('Unknown gate argument');
const full =
  process.argv.includes('--full') ||
  Boolean(env.CI && !['false', '0'].includes(env.CI.toLowerCase()));
const recover = process.argv.includes('--recover-timeouts');
const tsx = require.resolve('tsx/cli');
const tasks = [
  [require.resolve('typescript/bin/tsc'), '--noEmit'],
  ['scripts/lint-project.js', '--max-warnings=0'],
  [
    require('node:path').join(require.resolve('prettier/package.json'), '..', 'bin/prettier.cjs'),
    '--check',
    '.',
  ],
  ...[
    'scoring',
    'drafts',
    'theme',
    'composer',
    'tokens',
    'contract',
    'presentation',
    'workspace',
    'drafting-history',
  ].map((name) => [tsx, `scripts/verify-${name}.ts`]),
  ['scripts/verify-routes.mjs', '--static'],
];
if (full) {
  tasks.push(['scripts/verify-ui.mjs']);
  tasks.push(['scripts/verify-workspace-ui.mjs', '.expo/ui-verification']);
  tasks.push([
    require.resolve('@playwright/test/cli'),
    'test',
    '--config',
    'scripts/recovery.playwright.config.ts',
    '--grep',
    'app recovery:',
  ]);
  tasks.push(['scripts/verify-routes.mjs']);
  tasks.push([
    require.resolve('expo/bin/cli'),
    'export',
    '--platform',
    'android',
    '--max-workers',
    String(runtime.workers),
    '--no-minify',
    '--output-dir',
    '.expo/android-verification',
  ]);
}
for (const args of tasks) {
  let result = spawnSync(process.execPath, args, {
    env,
    stdio: 'inherit',
    windowsHide: true,
    timeout: runtime.stageMs,
  });
  if (result.error?.code === 'ETIMEDOUT' && recover)
    result = spawnSync(process.execPath, args, {
      env,
      stdio: 'inherit',
      windowsHide: true,
      timeout: runtime.stageMs * 2,
    });
  if (result.error || result.status !== 0) {
    process.stderr.write(`${result.error?.message || 'Verification failed'}\n`);
    process.exit(result.error?.code === 'ETIMEDOUT' ? 124 : result.status || 1);
  }
}
process.stdout.write(
  `PASS ${full ? 'full' : 'local'} gate${full ? '' : '; browser acceptance not included'}\n`
);
