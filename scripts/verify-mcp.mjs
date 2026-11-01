import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout, clearTimeout } from 'node:timers';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MCP_TOOLS = [
  'pack_codebase',
  'read_repomix_output',
  'grep_repomix_output',
  'file_system_read_file',
  'file_system_read_directory',
];
const serverTable = 'mcp_servers.grantum_repomix';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const requireCondition = (condition, message) => {
  if (!condition) throw new Error(message);
};

function withoutComment(line) {
  let quote = '';
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quote) {
      if (quote === '"' && !escaped && char === '\\') escaped = true;
      else {
        if (!escaped && char === quote) quote = '';
        escaped = false;
      }
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '#') return line.slice(0, i).trim();
  }
  requireCondition(!quote, 'Multiline or unterminated string is unsupported');
  return line.trim();
}

function scalar(text) {
  if (/^'[^']*'$/.test(text)) return text.slice(1, -1);
  if (text.startsWith('"')) {
    for (let i = 1; i < text.length - 1; i++) {
      if (text[i] !== '\\') continue;
      const escape = text[++i];
      requireCondition('"\\bfnrtu'.includes(escape), 'Unsupported quoted-string escape');
      if (escape === 'u') {
        requireCondition(
          /^[0-9A-Fa-f]{4}$/.test(text.slice(i + 1, i + 5)),
          'Invalid Unicode escape'
        );
        i += 4;
      }
    }
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      throw new Error('Unsupported quoted string');
    }
    requireCondition(typeof value === 'string', 'Expected a string');
    return value;
  }
  if (/^(true|false)$/.test(text)) return text === 'true';
  if (/^(0|[1-9][0-9]*)$/.test(text)) {
    const value = Number(text);
    requireCondition(Number.isSafeInteger(value), 'Integer is out of range');
    return value;
  }
  throw new Error('Unsupported configuration value');
}

function valueOf(text) {
  if (!text.startsWith('[')) return scalar(text);
  requireCondition(text.endsWith(']'), 'Unclosed configuration array');
  const body = text.slice(1, -1).trim();
  const values = [];
  const token = /\s*("(?:[^"\\]|\\.)*"|'[^']*')\s*(,|$)/y;
  let position = 0;
  while (position < body.length) {
    token.lastIndex = position;
    const match = token.exec(body);
    requireCondition(match, 'Only comma-separated string arrays are supported');
    values.push(scalar(match[1]));
    position = token.lastIndex;
    if (!body.slice(position).trim()) break;
  }
  return values;
}

/** Deliberately strict template subset, not a general TOML implementation. */
export function parseProjectConfig(text) {
  requireCondition(typeof text === 'string' && text.length <= 65536, 'Invalid configuration text');
  const sections = Object.create(null);
  sections[''] = Object.create(null);
  let section = '';
  const lines = text.split(/\r?\n/).map(withoutComment);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line) continue;
    const table = line.match(/^\[([A-Za-z0-9_.]+)\]$/);
    if (table) {
      section = table[1];
      requireCondition(!Object.hasOwn(sections, section), 'Duplicate configuration table');
      sections[section] = Object.create(null);
      continue;
    }
    const assignment = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
    requireCondition(assignment, 'Unsupported configuration syntax');
    const [, key, initial] = assignment;
    requireCondition(!Object.hasOwn(sections[section], key), 'Duplicate configuration key');
    line = initial;
    if (line.startsWith('[')) {
      while (!line.endsWith(']') && i + 1 < lines.length) line += ` ${lines[++i]}`;
    }
    sections[section][key] = valueOf(line);
  }
  return sections;
}

const exactKeys = (object, keys) =>
  object &&
  Object.keys(object).length === keys.length &&
  keys.every((key) => Object.hasOwn(object, key));
const samePath = (a, b) => {
  if (typeof a !== 'string') return false;
  const left = path.resolve(a);
  const right = path.resolve(b);
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
};

export function validateProjectConfig(
  config,
  { root = PROJECT_ROOT, exists = fs.existsSync } = {}
) {
  requireCondition(
    exactKeys(config, ['', serverTable, `${serverTable}.env`]),
    'Unexpected or missing configuration table'
  );
  const defaults = config[''];
  const server = config[serverTable];
  requireCondition(exactKeys(defaults, ['approval_policy', 'sandbox_mode']), 'Unexpected defaults');
  requireCondition(
    defaults.approval_policy === 'on-request' && defaults.sandbox_mode === 'read-only',
    'Filesystem and approval defaults must remain restrictive'
  );
  requireCondition(
    exactKeys(server, [
      'command',
      'args',
      'cwd',
      'enabled',
      'required',
      'startup_timeout_sec',
      'tool_timeout_sec',
      'enabled_tools',
      'default_tools_approval_mode',
    ]),
    'Unexpected or missing server key'
  );
  requireCondition(
    typeof server.command === 'string' &&
      path.isAbsolute(server.command) &&
      /^pnpm(?:\.exe)?$/i.test(path.basename(server.command)) &&
      exists(server.command),
    'Configured pnpm executable is absent or invalid'
  );
  requireCondition(samePath(server.cwd, root) && exists(server.cwd), 'Checkout cwd mismatch');
  requireCondition(
    Array.isArray(server.args) &&
      server.args.length === 5 &&
      ['dlx', 'repomix@1.18.1', '--mcp', '--sandbox'].every((arg, i) => server.args[i] === arg) &&
      samePath(server.args[4], root),
    'Pinned arguments or sandbox root mismatch'
  );
  requireCondition(server.enabled === true && server.required === true, 'Server must be required');
  requireCondition(
    Array.isArray(server.enabled_tools) &&
      server.enabled_tools.length === 5 &&
      new Set(server.enabled_tools).size === 5 &&
      MCP_TOOLS.every((name) => server.enabled_tools.includes(name)),
    'Tool allowlist must contain exactly five unique read-only tools'
  );
  requireCondition(
    server.default_tools_approval_mode === 'writes',
    'Tool approval default mismatch'
  );
  requireCondition(
    server.startup_timeout_sec === 60 && server.tool_timeout_sec === 120,
    'Configured timeouts must remain 60/120 seconds'
  );
  const environment = config[`${serverTable}.env`];
  requireCondition(
    exactKeys(environment, ['PATHEXT']) && environment.PATHEXT === '.COM;.EXE;.BAT;.CMD',
    'Configured PATHEXT mismatch'
  );
  return {
    command: server.command,
    args: [...server.args],
    cwd: server.cwd,
    startupTimeoutMs: 60000,
    toolTimeoutMs: 120000,
  };
}

function responseJSON(result) {
  if (result.structuredContent) return result.structuredContent;
  const text = result.content?.find((part) => part.type === 'text')?.text;
  requireCondition(typeof text === 'string', 'Missing structured tool result');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Malformed structured tool result');
  }
}

export function classifyConfinementResult(result, probe) {
  if (result?.isError !== true) return false;
  let text;
  try {
    text = responseJSON(result).errorMessage;
  } catch {
    return false;
  }
  return (
    typeof text === 'string' &&
    text.includes(probe) &&
    /must be relative to workspace root/.test(text) &&
    /segment|drive|~\//.test(text) &&
    !/ENOENT|timed?\s*out|protocol/i.test(text)
  );
}

/** JSON-RPC transport; no shell, payload logging, environment reads or implicit install. */
export function createStdioClient(launch, { spawnProcess = spawn } = {}) {
  const child = spawnProcess(launch.command, launch.args, {
    cwd: launch.cwd,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let buffer = '';
  let id = 0;
  let exited = false;
  let fatal;
  const pending = new Map();
  const fail = (error) => {
    fatal = error;
    for (const item of pending.values()) {
      clearTimeout(item.timer);
      item.reject(error);
    }
    pending.clear();
  };
  child.on('error', () => fail(new Error('MCP process launch failed')));
  child.on('exit', () => {
    exited = true;
    fail(new Error('MCP process exited'));
  });
  child.stdin.on('error', () => fail(new Error('MCP input pipe failed')));
  child.stderr.on('data', () => {});
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    if (buffer.length > 2 * 1024 * 1024) {
      fail(new Error('MCP response exceeds diagnostic limit'));
      return;
    }
    while (buffer.includes('\n')) {
      const end = buffer.indexOf('\n');
      const line = buffer.slice(0, end).trim();
      buffer = buffer.slice(end + 1);
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        fail(new Error('Invalid MCP protocol output'));
        return;
      }
      if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') {
        fail(new Error('Invalid JSON-RPC version'));
        return;
      }
      const item = pending.get(message.id);
      if (!item) continue;
      pending.delete(message.id);
      clearTimeout(item.timer);
      if (message.error) item.reject(new Error('MCP RPC returned an error'));
      else item.resolve(message.result);
    }
  });
  return {
    rpc(method, params) {
      if (fatal) return Promise.reject(fatal);
      const requestId = ++id;
      return new Promise((resolve, reject) => {
        const timeout = method === 'initialize' ? launch.startupTimeoutMs : launch.toolTimeoutMs;
        const timer = setTimeout(() => {
          pending.delete(requestId);
          reject(new Error(`MCP request timed out: ${method}`));
        }, timeout);
        pending.set(requestId, { resolve, reject, timer });
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params })}\n`);
      });
    },
    notify(method) {
      requireCondition(!fatal, 'Cannot notify a failed MCP process');
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method })}\n`);
    },
    async close() {
      if (exited || !child.pid) return;
      child.stdin.end();
      const wait = (milliseconds) =>
        new Promise((resolve) => {
          const done = () => {
            clearTimeout(timer);
            child.removeListener('exit', done);
            resolve(exited);
          };
          const timer = setTimeout(done, milliseconds);
          child.once('exit', done);
        });
      if (await wait(2000)) return;
      if (process.platform === 'win32') {
        const killer = spawnProcess('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
        });
        killer.on('error', () => {});
      } else child.kill('SIGTERM');
      requireCondition(await wait(3000), 'MCP process shutdown could not be confirmed');
    },
  };
}

export async function runLiveSmoke(launch, { connect = createStdioClient } = {}) {
  const client = await connect(launch);
  const checks = [];
  try {
    const initialized = await client.rpc('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'grantum-verify-mcp', version: '1.0.0' },
    });
    requireCondition(
      initialized.serverInfo?.name === 'repomix-mcp-server' &&
        initialized.serverInfo.version === '1.18.1',
      'Server identity or version mismatch'
    );
    client.notify('notifications/initialized');
    const tools = [];
    const cursors = new Set();
    let cursor;
    do {
      const page = await client.rpc('tools/list', cursor ? { cursor } : {});
      requireCondition(Array.isArray(page.tools), 'Invalid tool-discovery response');
      tools.push(...page.tools);
      cursor = page.nextCursor;
      if (cursor) {
        requireCondition(!cursors.has(cursor) && cursors.size < 10, 'Invalid tool pagination');
        cursors.add(cursor);
      }
    } while (cursor);
    requireCondition(
      tools.length === 5 &&
        new Set(tools.map((tool) => tool.name)).size === 5 &&
        MCP_TOOLS.every((name) =>
          tools.some((tool) => tool.name === name && tool.annotations?.readOnlyHint === true)
        ),
      'Server tool boundary mismatch'
    );
    const call = async (name, args) => {
      const result = await client.rpc('tools/call', { name, arguments: args });
      requireCondition(!result.isError, `Positive tool call failed: ${name}`);
      checks.push({ name, status: 'PASS' });
      return responseJSON(result);
    };
    const file = await call('file_system_read_file', { path: 'src/types/grant.ts' });
    requireCondition(
      typeof file.content === 'string' && file.content.length > 0,
      'Empty file proof'
    );
    const directory = await call('file_system_read_directory', {
      path: 'src/components/templates',
    });
    requireCondition(
      Array.isArray(directory.contents) &&
        directory.contents.some((name) => name.includes('ScreenContainer.tsx')),
      'Invalid directory proof'
    );
    const pack = await call('pack_codebase', {
      directory: '.',
      includePatterns: 'src/types/grant.ts,src/components/templates/ScreenContainer.tsx',
      ignorePatterns:
        '**/.env*,**/*.pem,**/*.key,**/.git/**,**/.codex/**,**/node_modules/**,**/.expo/**,repomix-output*.xml',
      topFilesLength: 2,
    });
    requireCondition(
      typeof pack.outputId === 'string' && pack.outputId.length > 0 && pack.totalFiles === 2,
      'Invalid narrow-pack proof'
    );
    const read = await call('read_repomix_output', {
      outputId: pack.outputId,
      startLine: 1,
      endLine: 8,
    });
    requireCondition(
      typeof read.content === 'string' && read.content.length > 0,
      'Empty output read'
    );
    const grep = await call('grep_repomix_output', {
      outputId: pack.outputId,
      pattern: 'ScreenContainerProps',
      contextLines: 0,
    });
    requireCondition(Array.isArray(grep.matches) && grep.matches.length > 0, 'Empty search proof');
    for (const probe of [
      '../__grantum_boundary_probe__',
      'C:/grantum-r-n/src/types/grant.ts',
      '~/',
    ]) {
      const name = probe === '~/' ? 'file_system_read_directory' : 'file_system_read_file';
      const result = await client.rpc('tools/call', { name, arguments: { path: probe } });
      requireCondition(classifyConfinementResult(result, probe), 'Confinement was not proven');
      checks.push({ name, probe, status: 'REJECTED_BY_BOUNDARY' });
    }
    return {
      status: 'PASS',
      server: { name: initialized.serverInfo.name, version: initialized.serverInfo.version },
      tools: [...MCP_TOOLS],
      outputId: pack.outputId,
      checks,
      nativeCatalog: 'NOT_PROVEN_BY_STANDALONE_SMOKE',
    };
  } finally {
    await client.close();
  }
}

export async function main(args) {
  requireCondition(
    args.length <= 1 && args.every((arg) => arg === '--live'),
    'Usage: verify-mcp.mjs [--live]'
  );
  const configText = fs.readFileSync(path.join(PROJECT_ROOT, '.codex/config.toml'), 'utf8');
  const launch = validateProjectConfig(parseProjectConfig(configText));
  const sourceHash = () =>
    hash(
      ['src/types/grant.ts', 'src/components/templates/ScreenContainer.tsx']
        .map((file) => `${file}\n${fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf8')}`)
        .join('\n')
    );
  const before = sourceHash();
  const result = args.includes('--live')
    ? await runLiveSmoke(launch)
    : { status: 'PASS', mode: 'STATIC' };
  requireCondition(sourceHash() === before, 'Source changed during MCP verification');
  return {
    ...result,
    configHash: hash(configText),
    scriptHash: hash(fs.readFileSync(fileURLToPath(import.meta.url))),
    sourceHash: before,
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).then(
    (result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`),
    (error) => {
      process.stderr.write(`MCP verification FAILED: ${error.message.slice(0, 200)}\n`);
      process.exitCode = 1;
    }
  );
}
