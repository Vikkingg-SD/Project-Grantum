const { spawnSync } = require('node:child_process');
const { loadPolicy, childEnvironment } = require('./runtime-policy.cjs');

const runtime = loadPolicy();
const env = {
  ...childEnvironment(runtime),
  EXPO_NO_DOTENV: '1',
  EXPO_PUBLIC_DATA_SOURCE: 'api',
};
const api = new URL(env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost');
if (
  api.protocol !== 'https:' ||
  api.username ||
  api.password ||
  api.search ||
  api.hash ||
  !env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
  env.EXPO_PUBLIC_FIREBASE_PROJECT_ID.startsWith('demo-') ||
  !env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
  !env.EXPO_PUBLIC_FIREBASE_API_KEY ||
  env.EXPO_PUBLIC_FIREBASE_EMULATOR_ORIGIN
) {
  throw new Error(
    'A connected web release requires HTTPS, a real Firebase project, and no emulator.'
  );
}
const result = spawnSync(
  process.execPath,
  [
    require.resolve('expo/bin/cli'),
    'export',
    '--platform',
    'web',
    '--max-workers',
    String(runtime.workers),
    '--output-dir',
    'dist-connected',
  ],
  { env, stdio: 'inherit', windowsHide: true }
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
