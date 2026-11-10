const fs = require('node:fs');
const path = require('node:path');

const environment = process.env;
const controlPlane = environment.BRAIN_CONTROL_PLANE || '';
const defaults = {
  version: 1,
  heapMiB: 1228,
  workers: 1,
  memoryReserveMiB: 384,
  admissionMiB: 768,
  admissionWaitSec: 120,
  profiles: {
    normal: { scale: 1, lintBatch: 8 },
    extended: { scale: 2, lintBatch: 4 },
    recovery: { scale: 4, lintBatch: 1 },
  },
  budgetsMs: {
    test: 60000,
    expect: 10000,
    navigation: 60000,
    export: 240000,
    ready: 120000,
    fetch: 10000,
    cleanup: 20000,
    lintBatch: 120000,
    stage: 3600000,
    git: 30000,
    mcpStartup: 60000,
    mcpTool: 240000,
  },
  mcpResponseBytes: 2097152,
  maxScale: 4,
};

function loadPolicy(env = environment) {
  const file =
    env.BRAIN_RUNTIME_POLICY ||
    (controlPlane ? path.join(controlPlane, 'runtime-policy.json') : '');
  const source = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : defaults;
  const profile = env.BRAIN_RUN_PROFILE || 'normal';
  const selected = source.profiles[profile];
  if (!selected || !Number.isFinite(selected.scale) || selected.scale < 1 || selected.scale > 4)
    throw new Error(`Invalid runtime profile: ${profile}`);
  if (source.heapMiB < 128 || source.heapMiB > 1228 || source.workers !== 1)
    throw new Error('Runtime policy must retain the 1228 MiB heap ceiling and one worker.');
  if (
    !Number.isInteger(selected.lintBatch) ||
    selected.lintBatch < 1 ||
    selected.lintBatch > 8 ||
    !Number.isInteger(source.memoryReserveMiB) ||
    source.memoryReserveMiB < 384 ||
    source.memoryReserveMiB > 1024 ||
    !Number.isInteger(source.admissionMiB) ||
    source.admissionMiB < source.memoryReserveMiB + 128 ||
    source.admissionMiB > 2048 ||
    !Number.isFinite(source.admissionWaitSec) ||
    source.admissionWaitSec < 0 ||
    source.admissionWaitSec > 600 ||
    !Number.isInteger(source.mcpResponseBytes) ||
    source.mcpResponseBytes < 1048576 ||
    source.mcpResponseBytes > 2097152
  )
    throw new Error('Invalid runtime resource or payload bounds.');
  const budgets = {};
  for (const [key, value] of Object.entries(source.budgetsMs)) {
    if (!Number.isFinite(value) || value <= 0 || value > 3600000)
      throw new Error(`Invalid runtime budget: ${key}`);
    budgets[`${key}Ms`] = value * selected.scale;
  }
  const desktop =
    env.HW_PROFILE !== 'LAPTOP_4GB_HDD' && require('node:os').totalmem() > 6 * 1024 ** 3;
  const maximumHeap = desktop ? 4096 : 1228;
  const inheritedHeap = Number(env.NODE_OPTIONS?.match(/--max-old-space-size=(\d+)/)?.[1]);
  const heapMiB = inheritedHeap >= 128 ? Math.min(maximumHeap, inheritedHeap) : maximumHeap;
  const workers = Math.max(
    1,
    Math.min(desktop ? 4 : 1, Number(env.BRAIN_WORKERS) || (desktop ? 4 : 1))
  );
  const setupMs = budgets.exportMs + budgets.readyMs + budgets.cleanupMs;
  const managedBatch = Number(env.BRAIN_LINT_BATCH || selected.lintBatch);
  if (!Number.isInteger(managedBatch) || managedBatch < 1 || managedBatch > 8)
    throw new Error('Invalid managed lint batch size.');
  return {
    ...budgets,
    profile,
    scale: selected.scale,
    workers,
    heapMiB,
    lintBatch: Math.min(selected.lintBatch, managedBatch),
    mcpResponseBytes: Math.min(source.mcpResponseBytes * selected.scale, 8 * 1024 * 1024),
    setupMs,
    // Each case has a test budget and a separate fixture-teardown budget.
    suiteMs: setupMs + 20 * 2 * budgets.testMs + budgets.cleanupMs,
    controlPlane,
  };
}

function childEnvironment(policy = loadPolicy()) {
  const inheritedHeap = Number(environment.NODE_OPTIONS?.match(/--max-old-space-size=(\d+)/)?.[1]);
  const heapMiB = inheritedHeap >= 128 ? Math.min(policy.heapMiB, inheritedHeap) : policy.heapMiB;
  return {
    ...environment,
    BRAIN_RUN_PROFILE: policy.profile,
    NODE_OPTIONS: `--max-old-space-size=${heapMiB}`,
  };
}

module.exports = { loadPolicy, childEnvironment };
