#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const startTime = Date.now();
const args = process.argv.slice(2);
const argVal = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const hasFlag = (k) => args.includes(k);

const ROOT = process.cwd();
const IS_STRICT = hasFlag('--strict');

let pkgConfig = {};
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  pkgConfig = pkg.config?.grantum || {};
} catch {}

const PLAN = argVal('--plan') || pkgConfig.plan || null;
const PREV = argVal('--prev-pack') || pkgConfig.prevPack || null;

const findings = [];
const add = (level, code, msg) => findings.push({ level, code, msg });

// ---------- 0. gate manifest (B-6.3) ----------
const KNOWN_CODES = new Set([
  'ROOT-STRAY',
  'REPOMIX-TRACKED',
  'REPOMIX-AT-ROOT',
  'EMPTY-FILE',
  'MISSING-FILE',
  'EMPTY-TARGET',
  'NO-DEFAULT',
  'MISSING-EXPORT',
  'DEAD-CODE',
  'HEX-LITERAL',
  'RGBA-LITERAL',
  'ENV-READ',
  'RADIUS-LITERAL',
  'TIER-LITERAL',
  'FONTWEIGHT',
  'STORE-WHOLE',
  'BANNED-DEP',
  'MOCK-LEAK',
  'CONSOLE',
  'PLACEHOLDER',
  'SCRIPT-MISSING',
  'LINT-WARN-LEAK',
  'PM-PIN',
  'LINT-UNDECLARED',
  'STAGED-GAP',
  'STAGED-WARN',
  'ENV-UNUSED',
  'PLAN-MISSING',
  'PLAN-EMPTY',
  'PLAN-COVERAGE',
  'EXPORT-REGRESSION',
  'EXPORT-LOST',
  'MANIFEST-MISSING',
  'MANIFEST-UNKNOWN-CODE',
  'WARN-RATCHET',
]);
const MANIFEST_PATH = 'docs/gate-manifest.json';
let manifest = null;
if (fs.existsSync(path.join(ROOT, MANIFEST_PATH))) {
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST_PATH), 'utf8'));
  } catch {
    manifest = null;
  }
}
if (!manifest) {
  add('FAIL', 'MANIFEST-MISSING', `${MANIFEST_PATH} absent or unparsable (B-6.3)`);
} else {
  const listed = [
    ...(manifest.requiredEveryGate ?? []),
    ...(manifest.warnEveryGate ?? []),
    ...(manifest.infoEveryGate ?? []),
    ...(manifest.closureCadence ?? []).map((c) => c.code),
  ];
  for (const code of listed) {
    if (!KNOWN_CODES.has(code))
      add('FAIL', 'MANIFEST-UNKNOWN-CODE', `manifest lists unknown code ${code}`);
  }
}

// ---------- 0b. warn ratchet baseline (B-6.6) ----------
let baseline = null;
try {
  baseline = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/gate-baseline.json'), 'utf8'));
} catch {
  baseline = null;
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.expo',
  'dist',
  'web-build',
  '.husky',
  'assets',
]);
const SRC_EXT = /\.(ts|tsx|js|jsx|mjs)$/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

// ---------- collect repo ----------
const all = walk(ROOT).map(rel);
const srcFiles = all.filter((f) => /^(src|app|scripts)\//.test(f) && SRC_EXT.test(f));
const content = new Map(all.map((f) => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
const body = (f) => content.get(f) ?? '';
const isEmpty = (f) => body(f).trim().length === 0;

// ---------- 1. root allowlist ----------
const ROOT_ALLOW = new Set([
  'app',
  'src',
  'scripts',
  'assets',
  '.husky',
  '.github',
  'docs',
  'app.json',
  'babel.config.js',
  'metro.config.js',
  'tsconfig.json',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.eslintrc.js',
  '.prettierrc',
  '.prettierignore',
  '.gitattributes',
  '.gitignore',
  '.env',
  '.env.example',
  'commitlint.config.js',
  'lint-staged.config.js',
  'expo-env.d.ts',
  'README.md',
  'AGENTS.md',
  'API_CONTRACTS.md',
  'DESIGN_MANIFESTO.md',
  'LICENSE',
]);
const PACK_RE = /^repomix-output.*\.xml$/;
for (const f of all.filter((x) => !x.includes('/'))) {
  if (PACK_RE.test(f)) {
    add('INFO', 'REPOMIX-AT-ROOT', `pack at root (normal regen workflow): ${f}`);
    continue;
  }
  if (!ROOT_ALLOW.has(f))
    add('FAIL', 'ROOT-STRAY', `unexpected root file "${f}" (${body(f).length} bytes)`);
}
if (fs.existsSync(path.join(ROOT, '.git'))) {
  try {
    const tracked = execSync('git ls-files -- "repomix-output*.xml"', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (tracked) add('FAIL', 'REPOMIX-TRACKED', `generated pack is tracked by git: ${tracked}`);
  } catch {}
}

// ---------- 2. empty src/app files ----------
const DEFERRED_OK = new Set(['src/components/templates/ModalSheetLayout.tsx']);
for (const f of srcFiles) {
  if (isEmpty(f) && !DEFERRED_OK.has(f)) add('FAIL', 'EMPTY-FILE', `${f} is empty`);
}

// ---------- 3. import/export closure ----------
const IMP = /import\s+(type\s+)?([^;]*?)\s+from\s+['"]([^'"]+)['"]/gs;
const REEXP = /export\s+(?:type\s+)?{([^}]*)}\s*from\s+['"]([^'"]+)['"]/gs;
const EXPNAMED =
  /export\s+(?:declare\s+)?(?:const|let|var|function\s*\*?|class|type|interface|enum|async\s+function)\s+([A-Za-z_$][\w$]*)/g;
const EXPLIST = /export\s+{([^}]*)}/gs;
const EXPDEF = /export\s+default\b/;

function exportsOf(f) {
  const s = body(f);
  const names = new Set([...s.matchAll(EXPNAMED)].map((m) => m[1]));
  for (const m of s.matchAll(EXPLIST))
    m[1].split(',').forEach((i) => {
      const t = i.trim().replace(/^type\s+/, '');
      if (t) names.add(t.split(' as ').pop().trim());
    });
  for (const m of s.matchAll(REEXP))
    m[1].split(',').forEach((i) => {
      const t = i.trim().replace(/^type\s+/, '');
      if (t) names.add(t.split(' as ').pop().trim());
    });
  return { names, hasDefault: EXPDEF.test(s) };
}

function resolveImport(from, spec) {
  let base;
  if (spec.startsWith('@/')) base = 'src/' + spec.slice(2);
  else if (spec.startsWith('.'))
    base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else return null;
  for (const c of [
    base,
    base + '.ts',
    base + '.tsx',
    base + '/index.ts',
    base + '/index.tsx',
    base + '.js',
    base + '.mjs',
  ]) {
    if (content.has(c)) return c;
  }
  return { missing: base };
}

const importGraph = new Map();
for (const f of srcFiles) {
  if (isEmpty(f)) continue;
  const deps = new Set();
  for (const m of body(f).matchAll(IMP)) {
    const r = resolveImport(f, m[3]);
    if (r === null) continue;
    if (typeof r === 'object') {
      add('FAIL', 'MISSING-FILE', `${f} imports "${m[3]}" -> no file`);
      continue;
    }
    deps.add(r);
    if (isEmpty(r)) {
      add('FAIL', 'EMPTY-TARGET', `${f} imports "${m[3]}" -> ${r} is empty`);
      continue;
    }
    const { names, hasDefault } = exportsOf(r);
    const clause = m[2].trim();
    if (/^[A-Za-z_$][\w$]*\s*(,|$)/.test(clause) && !hasDefault)
      add('FAIL', 'NO-DEFAULT', `${f} default-imports "${m[3]}" but ${r} has no default export`);
    const nm = clause.match(/{([^}]*)}/s);
    if (nm)
      for (const it of nm[1].split(',')) {
        const orig = it
          .trim()
          .replace(/^type\s+/, '')
          .split(' as ')[0]
          .trim();
        if (orig && !names.has(orig))
          add(
            'FAIL',
            'MISSING-EXPORT',
            `${f} imports { ${orig} } from "${m[3]}" but ${r} does not export it`
          );
      }
  }
  importGraph.set(f, deps);
}

// ---------- 4. reachability ----------
const entries = srcFiles.filter((f) => f.startsWith('app/') && !isEmpty(f));
const seen = new Set();
const stack = [...entries];
while (stack.length) {
  const f = stack.pop();
  if (seen.has(f)) continue;
  seen.add(f);
  for (const d of importGraph.get(f) ?? []) stack.push(d);
}
for (const f of srcFiles) {
  if (!f.startsWith('src/') || isEmpty(f)) continue;
  if (!seen.has(f)) add('WARN', 'DEAD-CODE', `${f} is not reachable from any app/ route`);
}

// ---------- 5. token / hardcode discipline ----------
const liveFiles = srcFiles.filter((f) => !isEmpty(f));
const rules = [
  [
    'HEX-LITERAL',
    /#[0-9A-Fa-f]{6}\b/,
    (f) => f === 'src/config/theme.ts',
    'FAIL',
    'hex color outside theme.ts',
  ],
  [
    'RGBA-LITERAL',
    /rgba?\(/,
    (f) => f === 'src/config/theme.ts',
    'FAIL',
    'rgba color outside theme.ts',
  ],
  [
    'ENV-READ',
    /process\.env\./,
    (f) => f === 'src/config/env.ts',
    'FAIL',
    'process.env read outside env.ts',
  ],
  ['RADIUS-LITERAL', /borderRadius:\s*\d/, () => false, 'WARN', 'numeric borderRadius literal'],
  [
    'TIER-LITERAL',
    / >=\s*(85|80|40)\b/,
    (f) => /scoring|constants/.test(f),
    'FAIL',
    'tier threshold literal',
  ],
  [
    'FONTWEIGHT',
    /fontWeight\s*:/,
    (f) => f === 'src/config/theme.ts' || f === 'src/components/atoms/AppText.tsx',
    'WARN',
    'fontWeight on custom font family',
  ],
  [
    'STORE-WHOLE',
    /use[A-Za-z]+Store\(\)/,
    () => false,
    'WARN',
    'zustand store subscribed without selector',
  ],
  [
    'BANNED-DEP',
    /from\s+['"](axios|nativewind)['"]|className=/,
    (f) => f === 'scripts/grantum-preflight.mjs',
    'FAIL',
    'banned dependency/styling',
  ],
  [
    'MOCK-LEAK',
    /from\s+['"]@\/mock\//,
    (f) => /^src\/(mock|api\/dataSource|api\/httpDataSource)/.test(f),
    'FAIL',
    'mock imported outside DataSource seam',
  ],
  [
    'CONSOLE',
    /console\.(log|warn|info)\(/,
    (f) => /^scripts\//.test(f),
    'WARN',
    'console call in app code',
  ],
  [
    'PLACEHOLDER',
    /Coming Soon|Signal Lost/i,
    (f) => !f.includes('dev-gallery'),
    'WARN',
    'undeclared placeholder text',
  ],
];

for (const [code, re, allowed, level, msg] of rules) {
  for (const f of liveFiles) {
    if (allowed(f)) continue;
    const lines = body(f).split('\n');
    lines.forEach((l, i) => {
      if (re.test(l)) add(level, code, `${f}:${i + 1} ${msg}`);
    });
  }
}

// ---------- 6. toolchain consistency ----------
const pkgPath = path.join(ROOT, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const declared = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);
  const REQUIRED_SCRIPTS = [
    'start',
    'android',
    'ios',
    'web',
    'typecheck',
    'lint',
    'format',
    'format:check',
    'prepare',
  ];
  for (const s of REQUIRED_SCRIPTS)
    if (!pkg.scripts?.[s]) add('FAIL', 'SCRIPT-MISSING', `package.json has no "${s}" script`);
  if (pkg.scripts?.lint && !/--max-warnings=0/.test(pkg.scripts.lint))
    add('FAIL', 'LINT-WARN-LEAK', '"lint" script does not pass --max-warnings=0');
  if (!pkg.packageManager) add('WARN', 'PM-PIN', 'no packageManager pin');
  if (fs.existsSync(path.join(ROOT, '.eslintrc.js'))) {
    const eslintRc = body('.eslintrc.js');
    const refs = [
      ...eslintRc.matchAll(/['"]((?:eslint-(?:config|plugin)-)[\w-]+|expo|prettier)['"]/g),
    ].map((m) => m[1]);
    for (const r of new Set(refs)) {
      const pkgName =
        r === 'expo' ? 'eslint-config-expo' : r === 'prettier' ? 'eslint-config-prettier' : r;
      if (!declared.has(pkgName) && r !== 'prettier')
        add(
          'FAIL',
          'LINT-UNDECLARED',
          `.eslintrc.js references "${r}" but ${pkgName} is not declared`
        );
    }
    if (/plugins:\s*\[[^\]]*'prettier'/.test(eslintRc) && !declared.has('eslint-plugin-prettier'))
      add(
        'FAIL',
        'LINT-UNDECLARED',
        '.eslintrc.js uses plugin "prettier" but eslint-plugin-prettier is not declared'
      );
  }
  const lsPath = path.join(ROOT, 'lint-staged.config.js');
  if (fs.existsSync(lsPath)) {
    const ls = fs.readFileSync(lsPath, 'utf8');
    const hasJs = /[{,]js[,}]/.test(ls);
    const hasTsx = /[{,]tsx[,}]/.test(ls);
    if (!hasJs || !hasTsx)
      add('FAIL', 'STAGED-GAP', 'lint-staged glob does not cover both js and tsx');
    if (/eslint --fix/.test(ls) && !/max-warnings/.test(ls))
      add('WARN', 'STAGED-WARN', 'lint-staged eslint step does not block warnings');
  }
}

// ---------- 7. dead configuration ----------
const envSrc = body('src/config/env.ts');
if (envSrc) {
  for (const m of envSrc.matchAll(/^\s{2}([A-Z_]+):/gm)) {
    const key = m[1];
    const used = liveFiles.some(
      (f) => f !== 'src/config/env.ts' && new RegExp(`ENV\\.${key}\\b`).test(body(f))
    );
    if (!used) add('WARN', 'ENV-UNUSED', `ENV.${key} is declared but read nowhere`);
  }
}

// ---------- 8. plan coverage ----------
if (PLAN && fs.existsSync(path.join(ROOT, PLAN))) {
  const planned = JSON.parse(fs.readFileSync(path.join(ROOT, PLAN), 'utf8'));
  let filled = 0,
    empty = 0,
    missing = 0;
  for (const p of planned) {
    if (!content.has(p)) {
      missing++;
      add('WARN', 'PLAN-MISSING', `planned file absent: ${p}`);
    } else if (isEmpty(p)) {
      empty++;
      add('WARN', 'PLAN-EMPTY', `planned file empty: ${p}`);
    } else filled++;
  }
  findings.push({
    level: 'INFO',
    code: 'PLAN-COVERAGE',
    msg: `planned ${planned.length}: filled ${filled}, empty ${empty}, missing ${missing}`,
  });
} else if (IS_STRICT) {
  add('SKIPPED', 'PLAN-COVERAGE', 'plan manifest not configured or missing');
}

// ---------- 9. export regressions (closure cadence, RUL-V3-01) ----------
if (PREV) {
  if (fs.existsSync(PREV)) {
    const xml = fs.readFileSync(PREV, 'utf8');
    const prev = new Map(
      [...xml.matchAll(/<file path="([^"]+)">\n?([\s\S]*?)<\/file>/g)].map((m) => [m[1], m[2]])
    );
    for (const f of srcFiles) {
      if (!prev.has(f) || !prev.get(f).trim() || isEmpty(f)) continue;
      const before = new Set([...prev.get(f).matchAll(EXPNAMED)].map((m) => m[1]));
      const after = exportsOf(f).names;
      const lost = [...before].filter((n) => !after.has(n));
      for (const n of lost) {
        const consumers = srcFiles.filter(
          (g) =>
            g !== f &&
            new RegExp(`\\b${n}\\b`).test(body(g)) &&
            (importGraph.get(g) ?? new Set()).has(f)
        );
        if (consumers.length)
          add(
            'FAIL',
            'EXPORT-REGRESSION',
            `${f} no longer exports "${n}" but ${consumers.join(', ')} import it`
          );
        else add('WARN', 'EXPORT-LOST', `${f} no longer exports "${n}" (no live consumers)`);
      }
    }
  } else {
    add('SKIPPED', 'EXPORT-REGRESSION', `declared baseline pack missing on disk: ${PREV}`);
  }
} else {
  add(
    'INFO',
    'EXPORT-REGRESSION',
    'closure cadence; no baseline declared this run (see docs/gate-manifest.json)'
  );
}

// ---------- report ----------
const warnCount = findings.filter((f) => f.level === 'WARN').length;
if (baseline && typeof baseline.warnBaseline === 'number' && warnCount > baseline.warnBaseline) {
  add(
    'FAIL',
    'WARN-RATCHET',
    `WARN ${warnCount} exceeds baseline ${baseline.warnBaseline} (B-6.6)`
  );
}
const order = { FAIL: 0, SKIPPED: 1, WARN: 2, INFO: 3 };
findings.sort((a, b) => order[a.level] - order[b.level]);
const counts = findings.reduce((a, f) => ((a[f.level] = (a[f.level] ?? 0) + 1), a), {});

const effectiveFail = (counts.FAIL ?? 0) + (IS_STRICT ? (counts.SKIPPED ?? 0) : 0);

const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`grantum-preflight root=${ROOT} strict=${IS_STRICT} elapsed=${elapsed}s`);
console.log(
  `FAIL ${effectiveFail} · WARN ${counts.WARN ?? 0} · INFO ${counts.INFO ?? 0} · SKIPPED ${counts.SKIPPED ?? 0}`
);
for (const f of findings) console.log(`${f.level.padEnd(4)} ${f.code.padEnd(18)} ${f.msg}`);
process.exit(effectiveFail > 0 ? 1 : 0);
