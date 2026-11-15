import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { releaseEnvironment, prepareOutput } = require('./build-public-web.cjs');

const environment = releaseEnvironment({
  EXPO_PUBLIC_DATA_SOURCE: 'api',
  EXPO_PUBLIC_API_BASE_URL: 'https://private.invalid',
  EXPO_NO_DOTENV: '0',
});
assert.equal(environment.EXPO_PUBLIC_DATA_SOURCE, 'mock');
assert.equal(environment.EXPO_PUBLIC_API_BASE_URL, '');
assert.equal(environment.EXPO_NO_DOTENV, '1');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'grantum-public-release-'));
try {
  fs.mkdirSync(path.join(root, 'dist', '_expo'), { recursive: true });
  for (const [name, text] of Object.entries({
    'index.html': '<html>public</html>',
    '.env': 'private',
    'README.md': 'source only',
    '_expo/entry.js': 'public',
    '_expo/entry.js.map': 'private sources',
  })) {
    fs.writeFileSync(path.join(root, 'dist', name), text);
  }
  fs.copyFileSync('vercel.json', path.join(root, 'vercel.json'));
  const output = prepareOutput(root);
  assert.ok(fs.existsSync(path.join(output, 'static/index.html')));
  assert.ok(fs.existsSync(path.join(output, 'static/_expo/entry.js')));
  for (const name of ['.env', 'README.md', '_expo/entry.js.map'])
    assert.ok(!fs.existsSync(path.join(output, 'static', name)));
  const config = JSON.parse(fs.readFileSync(path.join(output, 'config.json'), 'utf8'));
  assert.equal(config.version, 3);
  assert.ok(config.routes.some((r) => r.handle === 'filesystem'));
  assert.equal(config.routes.at(-1).dest, '/index.html');
  process.stdout.write(
    'PASS Given a public release When built and packaged Then sample mode is enforced, private files are excluded and deep links retain SPA routing\n'
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
