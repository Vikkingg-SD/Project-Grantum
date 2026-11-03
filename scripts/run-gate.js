const { spawnSync } = require('node:child_process');

require('tsx/cjs');
const { IS_CI } = require('../src/config/env');

const full = IS_CI;
const script = full ? 'gate:full' : 'gate:local';

process.stdout.write(`Gate scope: ${script}\n`);
if (!full) {
  process.stdout.write(
    'Owner-approved local scope: build/browser recovery and route acceptance DEFERRED.\n' +
      'No Metro or production export. CI runs the complete gate:full chain.\n'
  );
}

const result = spawnSync(`pnpm run ${script}`, {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true,
  windowsHide: true,
});

if (result.error) process.stderr.write(`${result.error.message}\n`);
process.exit(result.status ?? 1);
