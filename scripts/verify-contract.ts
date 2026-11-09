import { QueryClient } from '@tanstack/react-query';
import ts from 'typescript';
import { ApiError, createApiClient } from '../src/api/client';
import { createHttpDataSource } from '../src/api/httpDataSource';
import { getDataSource } from '../src/api/dataSource';
import { ENDPOINTS } from '../src/api/endpoint';
import { queryKeys } from '../src/api/queryKeys';
import { sectionMutationOptions } from '../src/api/hooks/useProposalDraft';
import { auditPollingInterval } from '../src/api/hooks/useAuditScan';
import type { ProposalDraft, AuditScan, SectionMutation } from '../src/types/api';

declare const __dirname: string;
interface Request {
  url?: string;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  on(event: string, callback: (chunk?: unknown) => void): void;
}
interface Response {
  writeHead(status: number, headers?: Record<string, string>): Response;
  end(body?: string): void;
  destroy(): void;
}
interface Server {
  listen(port: number, host: string, callback: () => void): void;
  address(): { port: number } | string | null;
  close(callback: (error?: Error) => void): void;
  closeAllConnections(): void;
}
let cases = 0;
function check(name: string, condition: unknown) {
  if (!condition) throw new Error(name);
  cases += 1;
  console.info('PASS ' + name);
}
async function rejection(
  name: string,
  run: () => Promise<unknown>,
  code?: string,
  status?: number
) {
  let caught: unknown;
  try {
    await run();
  } catch (error) {
    caught = error;
  }
  check(
    name,
    code
      ? caught instanceof ApiError &&
          caught.code === code &&
          (status === undefined || caught.status === status)
      : caught instanceof Error
  );
}

async function main() {
  const names = { http: 'node:http', fs: 'node:fs', path: 'node:path', crypto: 'node:crypto' };
  const { createServer }: { createServer(handler: (req: Request, res: Response) => void): Server } =
    await import(names.http);
  const fs: {
    readFileSync(path: string, encoding: 'utf8'): string;
    readdirSync(path: string): string[];
    statSync(path: string): { isDirectory(): boolean };
    existsSync(path: string): boolean;
  } = await import(names.fs);
  const path: { resolve(...paths: string[]): string; join(...paths: string[]): string } =
    await import(names.path);
  const crypto: {
    createHash(algorithm: string): { update(value: string): { digest(encoding: string): string } };
  } = await import(names.crypto);
  const root = path.resolve(__dirname, '..');
  const drafts = new Map<string, ProposalDraft>();
  const scans = new Map<string, AuditScan>();
  const requests: {
    method: string;
    path: string;
    authorization: unknown;
    body: Record<string, unknown>;
  }[] = [];
  let origin = '';
  let token = 'fixture-session-one';
  let fault = '';
  let rejectSection = false;
  let inspectSection: (() => void) | undefined;
  const draftFor = (id: string): ProposalDraft => {
    if (!drafts.has(id))
      drafts.set(id, {
        id: 'proposal-' + id,
        grantId: id,
        requiredSections: ['Mission', 'Moat'],
        completedSections: ['Mission', 'Moat'],
        confidenceScore: 100,
        completionPct: 42,
        body: 'Fixture document',
      });
    return drafts.get(id)!;
  };
  const grantFor = (id: string) => ({
    id,
    title: 'Fixture opportunity',
    funder: 'Fixture funder',
    deadline: '28 days',
    amount: '$100',
    matchPct: 94,
    region: 'Global',
    summary: 'Fixture summary',
    requirements: ['Mission', 'Moat'],
  });
  const respond = (res: Response, value: unknown, status = 200) =>
    res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(value));
  const handler = async (req: Request, res: Response) => {
    const raw = await new Promise<string>((resolve) => {
      let body = '';
      req.on('data', (chunk) => {
        body += String(chunk);
      });
      req.on('end', () => resolve(body));
    });
    const input = JSON.parse(raw || '{}') as Record<string, unknown>;
    const url = new URL(req.url ?? '/', origin);
    const route = url.pathname;
    requests.push({
      method: req.method ?? 'GET',
      path: req.url ?? '',
      authorization: req.headers.authorization,
      body: input,
    });
    if (fault === 'http') return respond(res, { error: 'Fixture outage' }, 503);
    if (fault === 'json') return res.writeHead(200).end('{');
    if (fault === 'shape') return respond(res, { success: true });
    if (fault === 'drop') return res.destroy();
    if (fault === 'slow') await new Promise<void>((resolve) => setTimeout(resolve, 100));
    if (route.includes('/missing')) return respond(res, { error: 'Not found' }, 404);
    if (route === '/api/v1/grants') return respond(res, [grantFor('1')]);
    const grantMatch = /^\/api\/v1\/grants\/([^/]+)$/.exec(route);
    if (grantMatch) return respond(res, grantFor(decodeURIComponent(grantMatch[1])));
    const proposal = /^\/api\/v1\/proposals\/([^/]+)\/(.+)$/.exec(route);
    if (proposal) {
      const id = decodeURIComponent(proposal[1]);
      const action = proposal[2];
      const draft = draftFor(id);
      if (action === 'draft') return respond(res, draft);
      if (action === 'sections') {
        inspectSection?.();
        if (rejectSection) return respond(res, { error: 'Fixture validation failure' }, 422);
        const name = String(input.sectionName ?? '');
        if (input.action === 'remove')
          draft.completedSections = draft.completedSections.filter((item) => item !== name);
        if (input.action === 'restore') draft.completedSections = [...draft.requiredSections];
        if (input.action === 'add' && !draft.requiredSections.includes(name)) {
          draft.requiredSections = [...draft.requiredSections, name];
          draft.completedSections = [...draft.completedSections, name];
        }
        if (input.action === 'deleteRequirement') {
          draft.requiredSections = draft.requiredSections.filter((item) => item !== name);
          draft.completedSections = draft.completedSections.filter((item) => item !== name);
        }
        draft.confidenceScore = draft.requiredSections.length
          ? Math.round((draft.completedSections.length / draft.requiredSections.length) * 100)
          : 100;
        return respond(res, {
          grantId: id,
          completedSections: draft.completedSections,
          requiredSections: draft.requiredSections,
          confidenceScore: draft.confidenceScore,
          updatedAt: new Date().toISOString(),
        });
      }
      if (action === 'audit' && req.method === 'POST') {
        const missingSections = draft.requiredSections.filter(
          (item) => !draft.completedSections.includes(item)
        );
        const scan: AuditScan = {
          scanId: 'scan-1',
          status: 'running',
          confidenceScore: draft.confidenceScore,
          missingSections,
          events: [],
        };
        scans.set(id, scan);
        return respond(res, scan);
      }
      if (action === 'audit/latest' || action === 'audit/scan-1') {
        const scan = scans.get(id);
        if (!scan) return action.endsWith('latest') ? respond(res, null) : respond(res, {}, 404);
        const settled: AuditScan = {
          ...scan,
          status: scan.missingSections.length ? 'failed' : 'passed',
        };
        scans.set(id, settled);
        return respond(res, settled);
      }
      if (action === 'export')
        return respond(res, {
          success: true,
          checksum:
            'sha256-' +
            crypto.createHash('sha256').update(String(input.documentBody)).digest('hex'),
          downloadUrl: origin + '/downloads/bundle.md',
        });
      if (action === 'award')
        return respond(res, {
          grantId: id,
          status: 'awarded',
          submittedAt: '2026-05-18T00:00:00Z',
          nextReportAt: '2026-08-14T00:00:00Z',
          amount: '$100',
          contractStatus: 'Countersigned',
          events: [],
        });
    }
    if (route === ENDPOINTS.dashboard)
      return respond(res, {
        greetingName: 'Fixture owner',
        pipeline: [{ label: 'Draft', count: 1 }],
        profileCompletionPct: 51,
        activeDraft: { grantId: '1', title: 'Fixture opportunity', completionPct: 42 },
      });
    if (route === ENDPOINTS.me)
      return respond(res, { id: 'fixture-user', isOnboarded: true, status: 'active' });
    if (route === ENDPOINTS.magicLink) return respond(res, { success: true });
    if (route === ENDPOINTS.oauth)
      return respond(res, { token: 'fixture-oauth-session', isNewUser: false });
    if (route === ENDPOINTS.onboarding) return respond(res, { success: true, isOnboarded: true });
    if (route === ENDPOINTS.bounty) return respond(res, { queued: true });
    return respond(res, { error: 'Unknown fixture endpoint' }, 404);
  };
  const server = createServer((req, res) => {
    void handler(req, res).catch(() => respond(res, { error: 'Fixture failure' }, 500));
  });
  const cache = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  try {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Fixture failed to bind.');
    origin = 'http://127.0.0.1:' + address.port;
    // Success-path fixtures use the application's default request budget.
    // The dedicated 20ms timeout/fault assertion below stays unchanged.
    const client = createApiClient({ baseUrl: origin, timeoutMs: 30000, getToken: () => token });
    const source = createHttpDataSource(client);
    const endpoints: [string, string, string, () => Promise<unknown>][] = [
      ['grants', 'GET', '/api/v1/grants', () => source.getGrants()],
      ['grant', 'GET', '/api/v1/grants/1', () => source.getGrant('1')],
      ['draft', 'GET', '/api/v1/proposals/1/draft', () => source.getProposalDraft('1')],
      [
        'sections',
        'PATCH',
        '/api/v1/proposals/1/sections',
        () => source.mutateSections('1', { action: 'restore' }),
      ],
      ['start audit', 'POST', '/api/v1/proposals/1/audit', () => source.runAudit('1')],
      [
        'read audit',
        'GET',
        '/api/v1/proposals/1/audit/scan-1',
        () => source.getAuditScan('1', 'scan-1'),
      ],
      [
        'latest audit',
        'GET',
        '/api/v1/proposals/1/audit/latest',
        () => source.getLatestAuditScan('1'),
      ],
      [
        'export',
        'POST',
        '/api/v1/proposals/1/export',
        () => source.exportBundle('1', { format: 'markdown', documentBody: 'Fixture body' }),
      ],
      ['award', 'GET', '/api/v1/proposals/1/award', () => source.getAward('1')],
      ['dashboard', 'GET', '/api/v1/dashboard/summary', () => source.getDashboardSummary()],
      ['profile', 'GET', '/api/v1/auth/me', () => source.getMe()],
      [
        'magic link',
        'POST',
        '/api/v1/auth/magic-link',
        () => source.sendMagicLink('fixture@example.test'),
      ],
      ['OAuth exchange', 'POST', '/api/v1/auth/oauth', () => source.oauthLogin('fixture')],
      ['onboarding', 'POST', '/api/v1/auth/onboarding', () => source.finishOnboarding()],
      [
        'bounty',
        'POST',
        '/api/v1/bounties',
        () => source.submitBounty({ title: 'Fixture bounty' }),
      ],
    ];
    for (const [name, method, route, run] of endpoints) {
      console.info('CHECK contract ' + name);
      await run();
      const last = requests[requests.length - 1];
      check('contract ' + name, last.method === method && last.path === route);
    }
    await source.getGrants({ q: 'water & air', region: ['A', 'B'], category: ['Energy'] });
    const search = new URL(requests[requests.length - 1].path, origin);
    check(
      'search encoding and repeated filters',
      search.searchParams.get('q') === 'water & air' &&
        search.searchParams.getAll('region').join(',') === 'A,B' &&
        search.searchParams.get('category') === 'Energy'
    );
    await source.getGrant('grant/with spaces');
    check(
      'grant identifiers are encoded',
      requests[requests.length - 1].path.endsWith('grant%2Fwith%20spaces')
    );
    await source.getMe();
    check(
      'Bearer credentials attached',
      requests[requests.length - 1].authorization === 'Bearer ' + token
    );
    token = 'fixture-session-two';
    await source.getMe();
    check(
      'credentials read freshly',
      requests[requests.length - 1].authorization === 'Bearer ' + token
    );
    await source.sendMagicLink('fixture@example.test');
    check(
      'public auth request has no Bearer token',
      requests[requests.length - 1].authorization === undefined
    );
    const aliases: [SectionMutation['action'], string][] = [
      ['markMissing', 'remove'],
      ['restoreAll', 'restore'],
      ['addRequirement', 'add'],
      ['deleteRequirement', 'deleteRequirement'],
    ];
    for (const [action, expected] of aliases) {
      await source.mutateSections('1', { action, sectionName: 'Evidence' });
      check(
        'wire section action ' + action,
        requests[requests.length - 1].body.action === expected
      );
    }
    await rejection(
      'missing section name rejected',
      () => source.mutateSections('1', { action: 'add', sectionName: ' ' }),
      'VALIDATION'
    );
    await rejection('empty grant ID rejected', () => source.getProposalDraft(''));
    await rejection(
      'missing record propagates 404',
      () => source.getGrant('missing'),
      'HTTP_ERROR',
      404
    );
    fault = 'http';
    await rejection(
      'HTTP failure never falls back to mock',
      () => source.getDashboardSummary(),
      'HTTP_ERROR',
      503
    );
    fault = 'json';
    await rejection(
      'malformed JSON rejected',
      () => source.getDashboardSummary(),
      'INVALID_RESPONSE'
    );
    fault = 'shape';
    await rejection(
      'malformed dashboard payload rejected',
      () => source.getDashboardSummary(),
      'INVALID_RESPONSE'
    );
    await rejection(
      'fake export response rejected',
      () => source.exportBundle('1', { format: 'word', documentBody: 'Fixture body' }),
      'INVALID_RESPONSE'
    );
    fault = 'drop';
    await rejection(
      'network failure surfaced',
      () => source.getDashboardSummary(),
      'NETWORK_ERROR'
    );
    fault = 'slow';
    const impatient = createHttpDataSource(createApiClient({ baseUrl: origin, timeoutMs: 20 }));
    await rejection('request timeout surfaced', () => impatient.getDashboardSummary(), 'TIMEOUT');
    fault = '';
    await rejection(
      'missing base URL fails explicitly',
      () =>
        createHttpDataSource(
          createApiClient({ baseUrl: '', timeoutMs: 100 })
        ).getDashboardSummary(),
      'CONFIG'
    );
    const firstExport = await source.exportBundle('1', {
      format: 'markdown',
      documentBody: 'First document',
    });
    const secondExport = await source.exportBundle('1', {
      format: 'markdown',
      documentBody: 'Second document',
    });
    check(
      'export checksum comes from requested body',
      firstExport.checksum !== secondExport.checksum && firstExport.downloadUrl.startsWith(origin)
    );
    check('latest scan is nullable', (await source.getLatestAuditScan('2')) === null);
    const running = await source.runAudit('1');
    check('running scan polls', typeof auditPollingInterval(running, false) === 'number');
    const terminal = await source.getLatestAuditScan('1');
    check(
      'terminal scan stops polling',
      terminal && auditPollingInterval(terminal, false, true) === false
    );
    check('failed request stops polling', auditPollingInterval(running, true, true) === false);
    check('idle scan does not poll', auditPollingInterval(null, false) === false);

    drafts.clear();
    const original = await source.getProposalDraft('1');
    cache.setQueryData(queryKeys.draft('1'), original);
    const other = await source.getProposalDraft('2');
    cache.setQueryData(queryKeys.draft('2'), other);
    let optimisticObserved = false;
    inspectSection = () => {
      optimisticObserved = !cache
        .getQueryData<ProposalDraft>(queryKeys.draft('1'))
        ?.completedSections.includes('Moat');
    };
    rejectSection = true;
    const rejected = cache
      .getMutationCache()
      .build(cache, sectionMutationOptions('1', cache, source));
    await rejection(
      'section mutation error propagated',
      () => rejected.execute({ action: 'remove', sectionName: 'Moat' }),
      'HTTP_ERROR',
      422
    );
    check('optimistic section update occurs before response', optimisticObserved);
    check(
      'failed mutation rolls back actual cached object',
      JSON.stringify(cache.getQueryData(queryKeys.draft('1'))) === JSON.stringify(original)
    );
    check('rollback is isolated to its grant', cache.getQueryData(queryKeys.draft('2')) === other);
    inspectSection = undefined;
    rejectSection = false;
    const first = cache.getMutationCache().build(cache, sectionMutationOptions('1', cache, source));
    const second = cache
      .getMutationCache()
      .build(cache, sectionMutationOptions('1', cache, source));
    await Promise.all([
      first.execute({ action: 'remove', sectionName: 'Moat' }),
      second.execute({ action: 'restore' }),
    ]);
    check(
      'same-grant mutations settle in order',
      cache.getQueryData<ProposalDraft>(queryKeys.draft('1'))?.confidenceScore === 100
    );
    check(
      'filter key ordering is stable',
      JSON.stringify(queryKeys.grants({ region: ['B', 'A'] })) ===
        JSON.stringify(queryKeys.grants({ region: ['A', 'B'] }))
    );

    const mock = getDataSource();
    check('mock seam returns selected grant', (await mock.getProposalDraft('2')).grantId === '2');
    await mock.runAudit('2');
    check(
      'mock scan reaches terminal state',
      (await mock.getLatestAuditScan('2'))?.status === 'passed'
    );
    await rejection('mock unknown ID does not borrow first grant', () => mock.getGrant('missing'));
    await rejection('mock export does not fabricate success', () =>
      mock.exportBundle('1', { format: 'word', documentBody: 'Fixture body' })
    );

    const docs = fs.readFileSync(path.join(root, 'API_CONTRACTS.md'), 'utf8');
    check(
      'CONTRACT-SYNC has 14 documented endpoint sections',
      Object.keys(ENDPOINTS).length === 14 &&
        (docs.match(/^### \d+\./gm) ?? []).length === 14 &&
        docs.includes('Authorization: Bearer')
    );
    const files: string[] = [];
    const visitDirectory = (directory: string) => {
      for (const item of fs.readdirSync(directory)) {
        const full = path.join(directory, item);
        if (fs.statSync(full).isDirectory()) visitDirectory(full);
        else if (/\.tsx?$/.test(item)) files.push(full);
      }
    };
    visitDirectory(path.join(root, 'src'));
    visitDirectory(path.join(root, 'app'));
    const graph = new Map<string, string[]>();
    for (const file of files) {
      const parsed = ts.createSourceFile(
        file,
        fs.readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true
      );
      const edges: string[] = [];
      for (const node of parsed.statements) {
        if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) continue;
        if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) continue;
        if (ts.isImportDeclaration(node) && node.importClause?.isTypeOnly) continue;
        const specifier = node.moduleSpecifier.text;
        if (!specifier.startsWith('@/') && !specifier.startsWith('.')) continue;
        const base = specifier.startsWith('@/')
          ? path.join(root, 'src', specifier.slice(2))
          : path.resolve(file, '..', specifier);
        const resolved = [
          base + '.ts',
          base + '.tsx',
          path.join(base, 'index.ts'),
          path.join(base, 'index.tsx'),
        ].find((candidate) => fs.existsSync(candidate));
        if (resolved) edges.push(resolved);
      }
      graph.set(file, edges);
    }
    const visited = new Set<string>();
    const active = new Set<string>();
    const walk = (file: string) => {
      if (active.has(file)) throw new Error('Runtime import cycle: ' + file);
      if (visited.has(file)) return;
      active.add(file);
      for (const edge of graph.get(file) ?? []) walk(edge);
      active.delete(file);
      visited.add(file);
    };
    for (const file of files) walk(file);
    check('application local import graph is acyclic', visited.size === files.length);
    console.info('ALL ' + cases + ' CONTRACT CASES PASS');
  } finally {
    cache.clear();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Contract verification failed.');
  process.exitCode = 1;
});
