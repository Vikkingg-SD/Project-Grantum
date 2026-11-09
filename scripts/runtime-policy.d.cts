export interface RuntimePolicy {
  profile: 'normal' | 'extended' | 'recovery';
  scale: number;
  workers: number;
  heapMiB: number;
  lintBatch: number;
  controlPlane: string;
  testMs: number;
  expectMs: number;
  navigationMs: number;
  exportMs: number;
  readyMs: number;
  fetchMs: number;
  cleanupMs: number;
  lintBatchMs: number;
  stageMs: number;
  gitMs: number;
  mcpStartupMs: number;
  mcpToolMs: number;
  mcpResponseBytes: number;
  setupMs: number;
  suiteMs: number;
}
export function loadPolicy(env?: Record<string, string | undefined>): RuntimePolicy;
export function childEnvironment(policy?: RuntimePolicy): Record<string, string | undefined>;
