# S5 control prerequisites: concrete batch specifications

Status: DRAFT; implementation requires the owner's approval of the exact batches and decisions.
Source anchor: `4755d31210d0182e5a6a14f913b49965be96a218`. Governing sources: root AGENTS,
agent-governance, constitution B-2.12/B-4.6/B-6/B-7, workplan sections 3.1 and 5, S4 ledger.

## Common delivery contract

Check cwd, branch, status and anchor immediately before edits. Preserve unrelated work. Capture
before/after hashes excluding Git, dependencies, generated outputs and secrets. Apply at most five
named files in each batch. A batch with an undeclared required file is not ready to apply.

Keep pnpm 12.10.1 and the frozen lockfile unless the separate recovery-harness decision is approved.
No suppressions, baseline increases, exemptions, hook bypasses, framework upgrades or scheduled work.
Run the unchanged existing chain and append a newly approved verifier only where specified. Stop
on failure; two red attempts trigger the existing halt rule. Log large outputs to ignored evidence,
report counts/paths, and confirm the expected tree before staging explicit paths.

The historical target is 0 FAIL / 63 WARN / 3 INFO / 0 SKIPPED and 48 existing behavior cases, with
three existing unexpired exemptions. These are predictions for unchanged source, not current passes.
After environment restoration, establish the actual baseline before applying checker/product code.
For each batch compare findings by code/path, not merely totals. Any unexpected delta requires an
explanation and corrected specification; do not move the baseline to make the prediction true.

## T: config and MCP verification — five files

| File                       | Action                                  | Behavior                                                                                             |
| -------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `.codex/config.toml`       | Preserve/finish earlier authorized edit | Actual root and pnpm path only; required server and exact tool restriction unchanged.                |
| `scripts/verify-mcp.py`    | Add                                     | Standard-library static config validation, negative self-tests, explicit persistent live-smoke mode. |
| `docs/mcp-verification.md` | Add                                     | Python requirements, commands, evidence states and quality coverage.                                 |
| `AGENTS.md`                | Modify                                  | Correct stale root spelling to the authorized checkout; no other boundary changes.                   |
| `docs/agent-governance.md` | Modify                                  | Same scope correction and manual verification procedure.                                             |

No app dependency is added. Static mode must parse TOML with `tomllib`, derive the root from the
project, check executable and cwd existence, exact pinned ordered args and sandbox root, enabled/
required flags, the exact five unique tools, read-only/on-request defaults, timeouts and PATHEXT.
It must reject copied roots, an absent command, extra tools/servers, a changed version, a broadened
scope or a weakened default. Do not print environment values or file bodies.

Live mode is opt-in and cannot fetch until the owner lifts the no-install restriction. Use one
persistent process: initialize, initialized notification, paginated tool discovery, exact names and
read-only annotations, successful relative file/directory calls and a narrowly scoped pack/read/grep,
then confinement probes and deterministic shutdown. Only a diagnostic-specific sandbox/path rejection
passes the negative probe; ENOENT, generic isError, timeout or protocol failure is not confinement.
Positive calls must succeed in that same process. Fixtures must catch this false-positive class.
No raw pack payloads in stdout. Report output IDs/hashes and bounded redacted diagnostics.

Python syntax/static checks, self-tests and the live test are explicit coverage; ESLint does not
cover Python. A standalone PASS does not prove native catalog attachment. Record both independently.
Prediction: no preflight warning change. Activation stays APPLIED-UNVERIFIED until the live proof.

## C: export analysis and verifier — five files

| File                            | Action | Behavior                                                                                                          |
| ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| `scripts/grantum-preflight.mjs` | Modify | Shared current/previous-pack export analysis and re-export reachability; existing severities preserved.           |
| `scripts/module-exports.mjs`    | Add    | Pure AST graph helper using existing TypeScript, with no Git/network/process side effects.                        |
| `scripts/verify-preflight.mjs`  | Add    | Deterministic in-memory clean and negative fixtures.                                                              |
| `package.json`                  | Modify | Add verify:preflight with explicit zero-warning lint coverage of both new mjs files, then run it; append to gate. |
| `docs/gate-manifest.json`       | Modify | Register MODULE-ANALYSIS in requiredEveryGate and KNOWN_CODES; no severity change.                                |

Symbol contract: `analyzeModules(sourceMap, resolver)` returns effective named/default/type exports,
module edges and deterministic diagnostics. It must use the same semantics for current files and the
previous pack. Cache per graph; resolve relative/index/extension and @/ paths consistently; terminate
cycles; preserve symbol identity in diamond graphs; exclude default from star exports; support named,
aliased and namespace re-exports; let explicit exports override star ambiguity; reject true ambiguity.
Comments and string contents are not syntax. Package exports remain TypeScript's responsibility.

`MODULE-ANALYSIS` is a FAIL for malformed source syntax, genuinely ambiguous exports, or an internal
analysis failure that prevents certification. Missing project targets remain MISSING-FILE, empty
targets remain EMPTY-TARGET, and missing required names remain MISSING-EXPORT. External package
resolution remains TypeScript's responsibility. Each clean fixture asserts no analysis failure; each
malformed/ambiguous fixture asserts the exact new code and FAIL severity. No generic catch may turn
an unanalysable module into an empty successful export set.

Twenty-four named fixture cases: direct declarations; star barrel; multi-hop; cycle; diamond; true
collision; explicit override; default exclusion; default-as-named; namespace export; type-only export;
@/ alias; relative/index/extension resolution; local export alias; import alias; missing target; empty
target; missing name; missing default; comment decoy; string decoy; malformed syntax; consumed previous
export lost (EXPORT-REGRESSION); unconsumed previous export lost (EXPORT-LOST).

Fixture mutations stay in memory; no synthetic source tree under app/src. Do not introduce raw color
literals or mock/env samples that trigger unrelated textual checks. Preserve the local main-authoring
FAIL and warning ceiling 63. Prediction: delta FAIL 0 / WARN 0; if corrected reachability changes
DEAD-CODE counts, explain the exact path delta before claiming the batch green.

## CI: owner-applied checkout correction — separate one-file change

The standing B-5.17 transport restriction reserves `.github/` edits to the owner's Web UI. The agent
does not modify that path or use an API workaround. Recommended exact adjustment to the existing
checkout step, leaving the remaining workflow intact:

```yaml
- name: Checkout
  uses: actions/checkout@v4
  with:
    ref: ${{ github.sha }}
- name: Verify checkout
  run: test "$(git rev-parse HEAD)" = "$GITHUB_SHA" && test -z "$(git branch --show-current)"
```

Disposition: verify the event SHA in detached HEAD, preserve authoring protection, reject severity
demotion and any 63-to-64 baseline increase. This is not a fake feature branch or an environment flag
that disables the check. Require both PR and post-owner-merge push-to-main run evidence at the correct
SHA before closing AD-68. Do not conflate a successful checkout assertion with the full gate passing.

When the recovery harness is later approved, the owner must also provision Chromium in that
harness PR's workflow, after dependency installation and before the gate:

```yaml
- name: Install recovery browser
  run: pnpm exec playwright install --with-deps chromium
```

This step applies only once the approved exact Playwright dev dependency is in that branch's
lockfile. The agent does not edit `.github/` itself. Browser provisioning is an explicit required
setup step, not an installation hidden inside verify:recovery or a reason to skip it in CI.

## K: complete documented token alignment — five files

| File                       | Action        | Behavior                                                                                                                                          |
| -------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/config/theme.ts`      | Modify        | Apply all documented targets under adopted RUL-AG-04.                                                                                             |
| `DESIGN_MANIFESTO.md`      | Modify        | Append implementation reconciliation note; ratified targets unchanged.                                                                            |
| `scripts/verify-tokens.ts` | Add           | Read documented expectations and test parity plus negative fixtures.                                                                              |
| `package.json`             | Modify        | Add verify:tokens and append it without removing/reordering existing checks.                                                                      |
| `docs/action-ledger-s5.md` | Modify/append | Append decision provenance and actual evidence; create in the first approved ledger batch, then modify/append only in K; never overwrite history. |

The S4 ledger's adoption includes h1/h2 and letter spacing, not merely display and radius.

| Role      | Size / line height | RN numeric letter spacing (em times size) |
| --------- | ------------------ | ----------------------------------------- |
| display   | 32 / 38            | -0.64                                     |
| h1        | 24 / 30            | -0.24                                     |
| h2        | 20 / 26            | 0                                         |
| h3        | 16 / 22            | 0.16                                      |
| body      | 14 / 20            | 0.14                                      |
| caption   | 12 / 16            | 0.24                                      |
| metric-lg | 28 / 32            | 0                                         |
| metric-sm | 13 / 18            | 0.52                                      |

Add RADIUS.lg 16; preserve sm 8, md 12, full 9999 and font-family/weight mappings. Preserve extra roles
not specified by the manifesto. Do not invent an AD-61 color correction.

Verifier expectations come from the ratified document, not a second hardcoded token registry. Cover
the 13 core palette semantics in both modes, two derived colors, eight typography roles with font
role/em conversion, and four radii. Accept matching duplicate rows; reject conflicting complete rows,
missing required values and malformed measurements. Document the incomplete first metric-lg row
without silently choosing it over the later complete table. Negative fixtures mutate in-memory
copies for color, size, line height, letter spacing, radius, font role and missing keys. Do not claim
full spacing/shadow parity where the manifesto supplies no complete numeric table. Expected WARN
delta 0; no additional palette literals outside theme.ts. Existing verifiers must remain green.

## Evidence, rollback and transport

Before each source batch, name the tested source anchor and save the whole-tree inventory. Rollback
means a corrective feature branch/PR from a verified anchor, never main reset/force push. New symbols
and all immediate consumers must be named in the approved per-batch implementation matrix.

Documentation/merge-ledger reconciliation occurs in a separate bounded batch when needed; do not
silently grow a five-file source batch. Owner merge -> verify actual merged state and tree -> append
the PATCH evidence immediately under the approved cadence. No stage closure follows from a local
gate alone, and no new script is ACTIVE just because its file exists.
