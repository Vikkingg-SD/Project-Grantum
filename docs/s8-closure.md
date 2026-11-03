# S8 / WP-I implementation closure — 2026-11-03

Status: implementation complete; owner-approved local gate PASS; ready for feature publication. Production acceptance is DEFERRED BY OWNER, not CLOSED-FULL.

Owner instruction, verbatim: "finish S8, no production build yet, push all changes,
I approve of changes". This supersedes the earlier production-building entry
retry and authorizes finishing/publishing this stage with the evidence boundary
below. Only the owner may squash-merge. The current continuation authorizes S9 work,
with its PR held until the owner merges S8; S10 remains outside scope.

## Delivered contract

- Six pure screen re-exports now live under /grants/[grantID]/: dashboard,
  discovery-studio, drafting, audit-studio, export-humanizer and post-award-tracker.
  The grant index redirects to its own dashboard; the seven legacy tab files and
  their directory are removed.
- useActiveGrantId reads the local URL parameter. Four grant screens use that
  identity for Query and keyed local sessions. Dashboard, Discovery and onboarding
  navigate with an explicit actual grant; the UI store no longer owns identity.
- Expo Router owns navigation and browser/device history under RUL-SSU-08.
  HISTORY_CAP is removed. Existing selected/disabled and tier-preview navigation
  semantics remain in the shared atomic navigation components.
- Root redirects to onboarding, preserving V7.2 P-01. A global /dashboard recovery
  entry selects from the queried catalog, with honest loading/error/empty states.
  Existing Back to dashboard controls use it without hardcoding a fixture grant.
- The shared grant shell owns safe-area edges; screens avoid double application.
  Existing root, layout and screen recovery boundaries/probes remain, with test
  URLs and the root-onboarding expectation migrated to the new contract.
- Development Babel resolves Expo's own installed preset. Low-memory Metro hosts
  use one worker at <=4 GiB; larger hosts retain Expo defaults. The separate entry
  chore adds no dependency, SDK upgrade or lockfile change.
- verify:routes adds structural checks and development-browser coverage for cold
  grant entry, reload, six views/selection, identity switching, Back/Forward,
  onboarding, recovery entry, mobile navigation and an unknown grant. Its default
  uses offline development Metro and the existing mock fixture DataSource, without
  a production export. Live-API rendering remains separate. The existing gate
  retains every prior step; the gallery Query consumer is development-only.

## Current continuation

The owner approved separating the local static/fixture gate from the full CI
build/browser chain. `pnpm gate` selects the local chain on this PC and the
complete chain in CI. Only that command is used for patch validation; no Metro
or production build is launched locally. This decision supersedes earlier
requirements to run development-browser checks in this session.

The navigation regression is corrected at the S8 boundary: the non-growing,
non-wrapping horizontal row stays above content at every width and reveals the
selected item without motion. Shared grant validation prevents an unknown grant
URL from showing a different opportunity or the global Dashboard/Discovery.
The existing Query/DataSource detail contract performs validation.

## Evidence

Final local pnpm gate completed successfully on 2026-11-03; exact results follow below.
No production build or full gate PASS is asserted by this progress record.
The prior S7-only export and setup failures remain distinct in s8-entry-chore.md.

Production export, the production-building full gate/recovery suite, independent
CI and physical Android/iOS/Expo Go deep-link/Back/IME acceptance are NOT RUN for
this S8 candidate under the owner's current deferral. The SDK 58 Go / SDK 57
project mismatch from the supplied logs is not claimed fixed. S7's named visual,
native and real-API acceptance gaps remain open; S9/S10 own their scheduled work.

The warning ceiling remains 17. The predicted ordinary preflight is 14; do not
raise the ceiling, introduce exemptions or fake a consumer of the deferred UI store.
The original-source export comparison exposes planned route/HISTORY_CAP retirements;
it is not silently treated as a passed previous-green closure comparison. Full
closure export-comparison acceptance remains deferred with production acceptance.

Rollback anchor: annotated pre-wp-i at
187a30805d288b107cbfc89304287f8ce53b1690. V7.2 reference SHA256:
204132358cc94da9520e9c6a6360743507de29ff4de7b998aa0aee972f33b35c.
Feature publication and exact check/commit evidence are recorded in action-ledger-s8.md
and the final handoff. No merge or protected-branch push is part of this closure.

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
