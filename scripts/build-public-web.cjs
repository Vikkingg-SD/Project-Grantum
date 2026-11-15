const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadPolicy, childEnvironment } = require('./runtime-policy.cjs');

function releaseEnvironment(environment) {
  return {
    ...environment,
    EXPO_NO_DOTENV: '1',
    EXPO_PUBLIC_DATA_SOURCE: 'mock',
    EXPO_PUBLIC_API_BASE_URL: '',
  };
}

function prepareOutput(root) {
  const build = path.join(root, 'dist');
  const output = path.join(root, '.vercel', 'output');
  for (const candidate of [path.join(root, '.vercel'), output]) {
    if (fs.existsSync(candidate) && fs.lstatSync(candidate).isSymbolicLink()) {
      throw new Error('Release output must not be linked.');
    }
  }
  if (!fs.existsSync(path.join(build, 'index.html'))) throw new Error('Export web first.');
  // This fixed, generated directory stays under the selected project root.
  if (!output.startsWith(path.resolve(root) + path.sep)) throw new Error('Unsafe release output.');
  fs.rmSync(output, { recursive: true, force: true });
  const destination = path.join(output, 'static');
  fs.mkdirSync(destination, { recursive: true });
  const extensions = new Set([
    '.html',
    '.js',
    '.css',
    '.ico',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.svg',
    '.gif',
    '.ttf',
    '.woff',
    '.woff2',
    '.otf',
  ]);
  for (const name of ['index.html', 'favicon.ico', 'assets', '_expo']) {
    const source = path.join(build, name);
    if (!fs.existsSync(source)) continue;
    fs.cpSync(source, path.join(destination, name), {
      recursive: true,
      filter: (file) => {
        const stat = fs.lstatSync(file);
        if (stat.isSymbolicLink()) throw new Error('Release assets must not be linked.');
        return stat.isDirectory() || extensions.has(path.extname(file));
      },
    });
  }
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  fs.writeFileSync(
    path.join(output, 'config.json'),
    JSON.stringify({ version: 3, routes: config.routes }, null, 2) + '\n'
  );
  return output;
}

function main() {
  const runtime = loadPolicy();
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
      'dist',
    ],
    {
      env: releaseEnvironment(childEnvironment(runtime)),
      stdio: 'inherit',
      windowsHide: true,
      timeout: runtime.exportMs,
    }
  );
  if (result.error || result.status !== 0) {
    throw result.error || new Error('Public web export failed.');
  }
  process.stdout.write(`Public sample-data release prepared: ${prepareOutput(process.cwd())}\n`);
}

module.exports = { releaseEnvironment, prepareOutput };
if (require.main === module) main();
