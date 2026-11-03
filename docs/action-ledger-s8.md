# S8 action ledger — 2026-11-03

## Current owner direction and bounded plan

The 2026-11-03 continuation authorizes completing S8, opening its PR, then
completing S9 with its PR held until the owner merges S8. Only the owner merges.
The attached prior sessions supply history, not new commands. The frontend
mockup retains its DataSource seam and documented API contracts; no backend is
introduced. V7.2 remains the product parity reference.

The owner explicitly approved the local/full gate split on 2026-11-03 after
reviewing the concrete proposal. The old gate launched Metro and production
export, conflicting with the owner's resource restriction. `pnpm gate` now runs
all non-builder checks and structural route coverage locally; when CI is set,
it runs `gate:full`, including the unchanged recovery and browser route suites.
No baseline, exemption, assertion, hook or CI workflow changes. Local green
never certifies deferred browser/device/build acceptance. Run only `pnpm gate`
per patch batch; additional acceptance belongs to the owner at the end of the
patch. This dated decision supersedes older gate descriptions below.

Plan: preserve the mixed entry changes; separate route migration from platform
polish; review S8 against WP-I and RUL-SSU-08; gate and publish S8; finish the
WP-J source audit and fixes with the requested project skills; gate S9 and hold
its PR until GitHub confirms the owner's S8 merge. Use direct imports and
explicit file staging, at most five paths per commit. Shared-symbol census:
route hooks feed header/navigation and grant screens; URL identity replaces
UI-store identity; six leaf routes re-export existing screens. The ordinary
preflight ceiling remains 17. The existing candidates last reported 14/13;
source changes predict no increase beyond that ceiling.

The first gate failed preflight with one ENV-READ finding in the runner; the CI
read was moved into src/config/env.ts without changing the checker. The second
mixed-snapshot gate passed typecheck but was interrupted during repository lint
when review identified the unknown-grant route gap and S9 needed separating.
Neither attempt is reported as green. The source-only Standards/Spec reviews
ran without tests or builders. Their shared-layout grant-validation finding is
fixed before the final S8 gate. The earlier S9 edits are preserved outside the
checkout while S8 is validated and committed independently.

Owner instruction: "finish S8, no production build yet, push all changes, I approve
of changes". This supersedes the production-building retry and entry prerequisite.
The original preparation allocated ten commits; the current continuation adds the
explicitly approved infrastructure chore. Every commit contains at most five files. No
merge, protected push, hook bypass, gate suppression or warning increase is permitted.

## Scope and reference

WP-I / RUL-A1-16 route flip is implemented in bounded file groups. RUL-SSU-08 gives
Expo Router ownership of history; HISTORY_CAP and stored grant identity are retired.
Root opens onboarding (reference P-01); onboarding uses an actual queried grant.
Six canonical views live under app/grants/[grantID], with pure screen re-exports.
Safe-area ownership moves with the grant shell. Existing screen/data/token behavior
and deferred auth remain under their original contracts.

V7.2 product reference SHA256:
204132358cc94da9520e9c6a6360743507de29ff4de7b998aa0aee972f33b35c.
Immutable rollback tag pre-wp-i points to S7 source
187a30805d288b107cbfc89304287f8ce53b1690. Its tree matched merged origin/main at boot.
The original S7 repository is not represented as fully gate-green.

## Delivery allocation

One prerequisite commit covers Babel preset resolution, the 4 GiB Metro worker
guard and s8-entry-chore.md. Nine S8 commits cover hooks/navigation, grant shell,
remaining entries/insets, grant screens, entry/store migration, caller/recovery/
manifest reconciliation, five route deletions, final two deletions plus package/
route verifier/this ledger, then closure/parity documentation. Each unit contains
at most five paths, including deleted files. Commits and publication are recorded
in the final handoff after actual hook/push evidence exists.

The new verify:routes command checks structure and the development app; it does
not export or build production. Existing gate steps remain present; verify:routes
is appended under constitution B-6.8. --static explicitly runs only structural
coverage and prints that browser verification did not run; the default covers both.
Recovery assertions retain all cases, with the new route paths and onboarding
startup expectation. No test is removed or skipped in the checked-in gate.

Browser cases use the existing mock DataSource in the owned child and Expo offline
mode, with a fresh Chromium context. They verify actual route/UI behavior against
declared fixtures; they do not certify live-API or production rendering. The gallery
keeps its Query hooks inside a development-only child so a production gallery visit
does not fetch grants. The dashboard recovery alias adds an eighteenth route case.

## Evidence boundary

Current source application and final non-production checks are being completed.
Exact measured results will replace this progress line before publication.
Production export/full gate, production recovery and physical-device acceptance
are deferred by the owner's latest instruction, not PASSED. Earlier setup failures
and the successful S7-only standalone export remain separate historical evidence
in s8-entry-chore.md and ignored .expo/s8 evidence.

The restored dependency installation uses the existing lockfile and local pnpm
cache; no new dependency or version is requested. An early hook was stopped while
project dependencies were absent, before a commit occurred. Its backup and evidence
are preserved; final commits must pass the normal hooks with restored dependencies.

Predicted routine preflight is WARN 14 against the unchanged ceiling 17: four
planned paths filled, one UI-store dead-module warning exposed after route identity
removal. Do not fabricate a consumer for that store. The complete original source
comparison is predicted to expose ten intentional export retirements, without live
consumers; full closure comparison acceptance remains deferred and is not silently
converted to PASS. Neither the baseline nor the comparator is weakened.

Final stop: feature branch and rollback tag pushed, source/evidence handoff complete.
Only the owner may squash-merge. Do not begin S9 or S10.

## Owner-approved lint memory bound — 2026-11-03

The owner explicitly answered "Approve sequential lint with identical scope and
rules" after reviewing the runner proposal. The monolithic ESLint process had
reached about 1.1 GiB with more than six minutes of silence, matching earlier
session evidence. The first separated S8 gate was interrupted during lint;
preflight and typecheck completed, but no whole-gate PASS is claimed for it.

`pnpm lint`, called only through `pnpm gate` in this continuation, now enumerates
the original dot-directory scope through the pinned ESLint 8 FileEnumerator
with the same js/jsx/ts/tsx extensions and ignore rules. It runs sequential groups
of eight paths using the same CLI, configuration and --max-warnings=0. Any error
or warning fails the chain; the final success line requires every enumerated
file to finish. Hooks, lint:fix, baselines, exemptions and assertions are intact.
This is a process-memory change, not reduced coverage. CI retains the full gate.

## Owner-approved vendor formatting boundary — 2026-11-03

The owner answered "Approve the vendor-only formatter exclusion" after the
bounded-runner gate encountered the original Liquid Logo index.html's unmatched
closing i tag. The two-red pause was honored before running another gate.
`.prettierignore` now excludes only `.agents/`, the local installation directory
for third-party skills and reference source. No Grantum app/src/scripts/docs
path is excluded; no upstream reference is patched to make app validation pass.

The earlier LINT-WARN-LEAK failure was fixed by retaining --max-warnings=0 in the
package lint command and requiring/forwarding that exact flag in the runner.
The preflight checker is unchanged. Failed logs and interruption receipts remain in
.expo/agent-evidence/s8-s9-20261103; none is promoted to PASS. One interrupted
progress-log path was reused for the final run; its interruption is retained in
interruptions.json and the command transcript. The final gate
below validates the separated S8 source with these explicitly approved controls.

The sequential runner's first execution stopped on pnpm plugin resolution:
constructing a bare FileEnumerator lost Expo's plugin lookup boundary. It now
obtains the enumerator from the pinned ESLint 8 CLIEngine and uses the same
resolvePluginsRelativeTo preset directory as the repository's existing strict
verifiers. Children receive that resolver option too. It loads the existing
installed plugins/config, with no installation, config change or weakened rule.

## Owner-approved contract fixture budget — 2026-11-03

The owner answered "Approve the fixture budget and rerun only pnpm gate" after
reviewing the concrete proposal and the two-red pause. The preceding gate passed
strict preflight (0/14/4/0), all 118 lint files, typecheck, formatting, scoring,
drafts, theme, composer, 24 preflight fixtures and 36 token cases. Its first
contract request then timed out before any contract PASS; that run remains FAIL.

Only the success-path fixture's request budget changes from 2000 to 15000 ms,
matching the application's default. Each endpoint now prints CHECK before its
request so a failure has a location. All endpoint/assertion cases, the explicit
20 ms timeout check with its 100 ms slow-server fault, and application behavior
remain unchanged. No standalone contract retry or additional suite is run; only
the owner-authorized new pnpm gate invocation validates the patch.

## Final local validation — 2026-11-03

`pnpm gate` exited 0. Strict preflight: FAIL 0 / WARN 14 / INFO 4 / SKIPPED 0;
zero exemptions, unchanged warning ceiling 17. Prettier, typecheck and all
118 enumerated lint files passed, with zero lint warnings. Scoring 14, drafts 9,
theme 6, composer 20, preflight fixtures 24, token cases 36, contract cases 52
and structural route cases 2 passed. The explicit 20 ms contract timeout case
passed under the approved success-fixture budget. No standalone check was run.

Evidence: .expo/agent-evidence/s8-s9-20261103/gate-s8-final.log. This is the
approved LOCAL gate, not browser, production, live-API or physical-device proof.
The full recovery/browser chain remains in CI. The undeclared previous-green
export baseline is reported by preflight; closure export acceptance remains
deferred under the owner's gate-only review instruction. S9 source is preserved
separately; its PR must follow the owner's merge of S8. No agent merge is allowed.

## Strict Gate launch repair — 2026-11-03

The current owner request explicitly authorizes fixing the failed strict gate.
PR #42 at c6a563f failed in run 41643626956, job 125965457903, after the complete
non-builder chain and all 20 application recovery cases passed. The final route
suite never reached its browser assertions: Expo rejected simultaneous
`--localhost` and `--offline` host-selector arguments.

The bounded repair retains `--localhost`, removes the conflicting CLI flag and
sets `EXPO_OFFLINE=1` in the owned child's environment. Installed Expo CLI 57
resolveOptions source and the official Expo CLI environment documentation confirm
these separate controls. All route assertions, readiness deadlines, recovery
coverage, hooks, warning ceiling 17 and zero exemptions are unchanged. Predicted
local preflight remains WARN 14. Verification is only `pnpm gate`; its local
static route mode cannot establish the CI development-server startup result.
The next independent Strict Gate run is the required browser evidence. The
existing PR remains open for an owner-only merge; cancellation is unnecessary.

Repair validation: `pnpm gate` exited 0 in the isolated S8 worktree. Strict
preflight was FAIL 0 / WARN 14 / INFO 2 / SKIPPED 0; all 118 zero-warning lint
files, formatting/typecheck, scoring 14, drafts 9, theme 6, composer 20,
preflight 24, tokens 36, contracts 52 and static routes 2 passed. The full
browser chain is deliberately left to the existing CI. No local Metro,
production build or standalone test was run. The S9 working tree was preserved.
The worktree reused the installed dependencies through a junction. pnpm's
automatic pre-script install warned that the hoist directory was not a real
directory, then continued with the complete gate against the existing unchanged
package/lockfile installation. No install success is inferred from this receipt.

### Visible route-text lookup — 2026-11-03

Independent CI run 41676339489 at 003442c confirms the host/offline launch
repair: Metro starts; cold grant-2 drafting, reload and Dashboard/Discovery
navigation pass. All 52 contracts and 20 recovery cases pass again. The route
suite then times out because the text helper selects the first matching node
before waiting for visibility; the log repeatedly identifies a hidden retained
Drafting message. That run remains FAILED, not a full route PASS.

The bounded follow-up filters matching text by visibility before selecting the
first node. The same required text, 20s deadline, URL/selected-tab checks and all
route cases remain. An absent active matching text still fails. This corrects
target selection rather than hiding a missing-content result. Installed
Playwright 1.64 supports the visibility filter. Predicted local WARN remains 14;
only `pnpm gate` validates locally, while unchanged CI exercises the browser path.

The follow-up local gate exited 0: preflight 0/14/2/0, zero exemptions,
118 zero-warning lint files and all existing scoring/drafts/theme/composer/
preflight/token/contract/static-route cases passed. The dependency-junction
pre-script warning described above recurred; the full gate itself completed.
Independent source review confirms retained inactive Expo Router web screens
use display:none and aria-hidden. The filter addresses that expected retention,
not an application workaround; CI remains the independent behavioral check.

### Adopted unknown-grant guard contract — 2026-11-03

CI 41677543486 at 3427ed7 passes all six tabs, browser history, grant switching,
index redirect, onboarding, recovery entry and mobile grant identity after the
visibility repair. Its final unknown-grant case still expects the pre-guard
screen's generic Instrument fault title, while the adopted shared guard renders
Opportunity unavailable. S8's specification requires that an unknown URL must
not show another grant; the guard owns this state before screen mounting.

The owner explicitly instructs updating the S8 branch and reopening PR #42.
This narrow oracle correction checks the actual adopted unavailable title and
additionally requires the named Back to dashboard recovery action. The missing
grant URL, both no-borrowed-grant assertions and final runtime-error assertion
remain unchanged. This changes no application copy, negative expectation,
timeout, suite coverage, warning ceiling or exemption. The failed CI remains
failed in history; no result is relabelled. Predicted local WARN remains 14;
only pnpm gate is run locally before pushing/reopening the existing PR.

The final guard-contract local gate exited 0: FAIL 0 / WARN 14 / INFO 2 /
SKIPPED 0, zero exemptions. All 118 zero-warning lint files, formatting/typecheck
and existing scoring/drafts/theme/composer/preflight/token/contract/static-route
cases passed. The known worktree-junction pre-script install warning recurred;
the complete gate itself ran successfully against unchanged installed versions.
Independent source review confirms this preserves the specified unknown-grant
contract and adds recovery-action visibility coverage. Normal hooks remain active.
