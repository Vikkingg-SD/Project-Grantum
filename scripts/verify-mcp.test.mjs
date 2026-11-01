import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { before, test } from 'node:test';
import eslint from 'eslint';
import {
  PROJECT_ROOT,
  MCP_TOOLS,
  parseProjectConfig,
  validateProjectConfig,
  classifyConfinementResult,
  createStdioClient,
  runLiveSmoke,
  main,
} from './verify-mcp.mjs';

before(async () => {
  const projectRequire = createRequire(import.meta.url);
  const expoConfig = projectRequire.resolve('eslint-config-expo');
  const expoRequire = createRequire(expoConfig);
  const linter = new eslint.ESLint({
    resolvePluginsRelativeTo: path.dirname(expoConfig),
    overrideConfig: { parser: expoRequire.resolve('@typescript-eslint/parser') },
  });
  const files = ['verify-mcp.mjs', 'verify-mcp.test.mjs'].map((name) =>
    fileURLToPath(new URL(name, import.meta.url))
  );
  const results = await linter.lintFiles(files);
  assert.equal(
    results.reduce((total, item) => total + item.errorCount + item.warningCount, 0),
    0,
    (await linter.loadFormatter('stylish')).format(results)
  );
});

const table = 'mcp_servers.grantum_repomix';
const fixture = `# Comments and multiline string arrays are supported.
approval_policy = "on-request"
sandbox_mode = "read-only"
[${table}]
command = ${JSON.stringify(path.join(PROJECT_ROOT, 'pnpm.exe'))}
args = ["dlx", "repomix@1.18.1", "--mcp", "--sandbox", ${JSON.stringify(PROJECT_ROOT)}]
cwd = ${JSON.stringify(PROJECT_ROOT)}
enabled = true
required = true
startup_timeout_sec = 60
tool_timeout_sec = 120
enabled_tools = [
  ${MCP_TOOLS.map((name) => JSON.stringify(name)).join(',\n  ')},
]
default_tools_approval_mode = "writes"
[${table}.env]
PATHEXT = '.COM;.EXE;.BAT;.CMD' # literal strings keep Windows separators
`;
const configuration = () => parseProjectConfig(fixture);
const validate = (config) => validateProjectConfig(config, { exists: () => true });
const invalid = (mutate) => {
  const config = configuration();
  mutate(config, config[table]);
  assert.throws(() => validate(config));
};
const result = (body, isError = false) => ({
  isError,
  content: [{ type: 'text', text: JSON.stringify(body) }],
});
const rejection = (probe, prefix = '') =>
  result(
    {
      errorMessage: `${prefix}Path "${probe}" must be relative to workspace root — no drive or ".." segment.`,
    },
    true
  );

function protocol({
  brokenPositive = false,
  genericNegative = false,
  readOnly = true,
  loop = false,
} = {}) {
  const state = { connects: 0, closes: 0, pages: 0, negatives: 0, calls: [] };
  const client = {
    async rpc(method, params) {
      state.calls.push(method);
      if (method === 'initialize')
        return { serverInfo: { name: 'repomix-mcp-server', version: '1.18.1' } };
      if (method === 'tools/list') {
        state.pages++;
        const selected = params.cursor ? MCP_TOOLS.slice(3) : MCP_TOOLS.slice(0, 3);
        return {
          tools: selected.map((name) => ({ name, annotations: { readOnlyHint: readOnly } })),
          nextCursor: loop || !params.cursor ? 'second' : undefined,
        };
      }
      assert.equal(method, 'tools/call');
      const { name, arguments: args } = params;
      if (args.path && /^(\.\.\/|C:|~\/)/.test(args.path)) {
        state.negatives++;
        return genericNegative ? result({ errorMessage: 'ENOENT' }, true) : rejection(args.path);
      }
      if (brokenPositive) return result({ errorMessage: 'Broken positive' }, true);
      if (name === 'file_system_read_file') return result({ content: 'export interface Grant {}' });
      if (name === 'file_system_read_directory')
        return result({ contents: ['[FILE] ScreenContainer.tsx'] });
      if (name === 'pack_codebase') return result({ outputId: 'fixture-pack', totalFiles: 2 });
      if (name === 'read_repomix_output') return result({ content: 'Bounded output' });
      if (name === 'grep_repomix_output') return result({ matches: [{ lineNumber: 12 }] });
      throw new Error('Unexpected fixture call');
    },
    notify(method) {
      assert.equal(method, 'notifications/initialized');
    },
    async close() {
      state.closes++;
    },
  };
  return {
    state,
    connect() {
      state.connects++;
      return client;
    },
  };
}

function wire(mode = 'success') {
  const child = new EventEmitter();
  child.pid = 12345;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new EventEmitter();
  let ended = false;
  child.stdin.write = (line) => {
    const message = JSON.parse(line);
    if (message.id && mode !== 'timeout') {
      Promise.resolve().then(() => {
        let reply;
        if (mode === 'invalid') reply = 'not-json\n';
        else if (mode === 'null') reply = 'null\n';
        else {
          reply = `${JSON.stringify({ jsonrpc: mode === 'wrongversion' ? '1.0' : '2.0', id: message.id, result: { ok: true } })}\n`;
        }
        child.stdout.write(reply.slice(0, 3));
        child.stdout.write(reply.slice(3));
      });
    }
    return true;
  };
  child.stdin.end = () => {
    ended = true;
    if (mode !== 'stubborn') Promise.resolve().then(() => child.emit('exit', 0));
  };
  child.kill = () => Promise.resolve().then(() => child.emit('exit', 0));
  const spawnProcess = (command, args) => {
    if (command === 'taskkill.exe') {
      assert.deepEqual(args, ['/PID', String(child.pid), '/T', '/F']);
      Promise.resolve().then(() => child.emit('exit', 0));
      return new EventEmitter();
    }
    return child;
  };
  return { child, spawnProcess, ended: () => ended };
}

test('valid config', () => {
  const launch = validate(configuration());
  assert.equal(launch.cwd, PROJECT_ROOT);
  assert.deepEqual(launch.args.slice(0, 4), ['dlx', 'repomix@1.18.1', '--mcp', '--sandbox']);
  assert.equal(classifyConfinementResult(rejection('../probe'), '../probe'), true);
});
test('wrong root', () =>
  invalid((_, server) => {
    server.args[4] = path.join(PROJECT_ROOT, 'copy');
  }));
test('absent executable', () => {
  assert.throws(() => validateProjectConfig(configuration(), { exists: () => false }));
});
test('wrong cwd', () =>
  invalid((_, server) => {
    server.cwd = path.dirname(PROJECT_ROOT);
  }));
test('changed version', () =>
  invalid((_, server) => {
    server.args[1] = 'repomix@other';
  }));
test('changed argument order', () =>
  invalid((_, server) => {
    server.args.reverse();
  }));
test('broadened sandbox', () =>
  invalid((_, server) => {
    server.args[4] = path.dirname(PROJECT_ROOT);
  }));
test('disabled server', () =>
  invalid((_, server) => {
    server.enabled = false;
  }));
test('required false', () =>
  invalid((_, server) => {
    server.required = false;
  }));
test('extra tool', () =>
  invalid((_, server) => {
    server.enabled_tools.push('remote_pack');
  }));
test('missing tool', () =>
  invalid((_, server) => {
    server.enabled_tools.pop();
  }));
test('duplicate tool', () =>
  invalid((_, server) => {
    server.enabled_tools[0] = server.enabled_tools[1];
  }));
test('extra server', () =>
  invalid((config) => {
    config['mcp_servers.extra'] = {};
  }));
test('weakened filesystem default', () =>
  invalid((config) => {
    config[''].sandbox_mode = 'workspace-write';
  }));
test('weakened approval default', () =>
  invalid((config) => {
    config[''].approval_policy = 'never';
  }));
test('invalid timeout', () => {
  invalid((_, server) => {
    server.tool_timeout_sec = 0;
  });
  invalid((_, server) => {
    server.startup_timeout_sec = 600;
  });
});
test('wrong PATHEXT', () =>
  invalid((config) => {
    config[`${table}.env`].PATHEXT = '.EXE';
  }));
test('duplicate key', () => {
  assert.throws(() => parseProjectConfig(`approval_policy = "never"\n${fixture}`));
  assert.throws(() => parseProjectConfig(`${fixture}\n[${table}]`));
});
test('unsupported syntax', async () => {
  for (const text of [
    'x = { nested = true }',
    'x = [1, 2]',
    'x = ["a" "b"]',
    'x = "unterminated',
    'x = ["a"] junk',
    'x.y = true',
    String.raw`x = "slash\/value"`,
  ]) {
    assert.throws(() => parseProjectConfig(text));
  }
  invalid((config) => {
    config[''].extra = true;
  });
  await assert.rejects(main(['--skip']));
  await assert.rejects(main(['--live', '--live']));
});
test('diagnostic classification and persistent protocol lifecycle', async () => {
  const probe = '../probe';
  for (const response of [
    result({ errorMessage: 'Generic failure' }, true),
    rejection(probe, 'ENOENT '),
    rejection(probe, 'Request timed out '),
    rejection(probe, 'Protocol failure '),
    result({ errorMessage: 'Specific-looking message' }),
    rejection('../different'),
    { isError: true },
  ])
    assert.equal(classifyConfinementResult(response, probe), false);
  const good = protocol();
  const proof = await runLiveSmoke(validate(configuration()), good);
  assert.equal(proof.status, 'PASS');
  assert.equal(proof.checks.length, 8);
  assert.deepEqual(
    { connects: good.state.connects, pages: good.state.pages, closes: good.state.closes },
    { connects: 1, pages: 2, closes: 1 }
  );
  for (const options of [
    { brokenPositive: true },
    { genericNegative: true },
    { readOnly: false },
    { loop: true },
  ]) {
    const broken = protocol(options);
    await assert.rejects(runLiveSmoke(validate(configuration()), broken));
    assert.equal(broken.state.closes, 1);
    if (options.brokenPositive) assert.equal(broken.state.negatives, 0);
  }
  for (const mode of ['success', 'timeout', 'invalid', 'wrongversion', 'null']) {
    const transport = wire(mode);
    const launch = { ...validate(configuration()), startupTimeoutMs: 10, toolTimeoutMs: 10 };
    const client = createStdioClient(launch, transport);
    try {
      if (mode === 'success') assert.deepEqual(await client.rpc('initialize', {}), { ok: true });
      else await assert.rejects(client.rpc('initialize', {}));
    } finally {
      await client.close();
    }
    assert.equal(transport.ended(), true);
  }
  const stubborn = wire('stubborn');
  const client = createStdioClient(validate(configuration()), stubborn);
  await client.close();
  assert.equal(stubborn.ended(), true);
});
