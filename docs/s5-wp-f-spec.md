# S5 / WP-F: production-oriented implementation specification

Status: DRAFT FOR APPROVAL, not applied product code. This specification is subordinate to the
constitution/workplan and current owner boundaries. It preserves the S5/S6/S7 stage allocation.

This is a stage allocation and acceptance contract, not permission to execute every listed batch.
The next control work is prepared first. The exact S5 R2 specification is finalized just in time,
at most one WP ahead, after its dependencies, copy and measured finding predictions are settled.
WP-F.2 below is an indicative allocation until that checkpoint; do not treat it as a second ready WP.

## Production invariants and data seam

- Reuse atomic components and registered palette, typography, spacing, radius, shadow, layout and
  breakpoint tokens. Native system insets are measured runtime inputs, not copied padding constants.
- S5 organisms/templates receive typed data, state and callbacks. They neither fetch HTTP nor import
  fixtures. Routes/hooks remain orchestration consumers; Query owns server state and Zustand owns
  UI/theme/session only, with primitive/stable selectors.
- Keep `DataSource` as the mock/HTTP interface. Do not rename or bypass it for a modal or header.
  S5 makes no claim that API mode works: the existing deliberate throw remains until S6.
- Do not hardcode an API host, grant ID, polling cycle or fake success into a component. Retry/reset
  must call the real consumer's retry/reset behavior; loading and error states must remain distinct.
- No silent fallback from an API error to mock data. No derived score stored as a second authority.
- Existing copy modules and the pinned V7.2 reference define visible text. Exact new fallback/header/
  navigation labels are held for reference verification or an explicit owner copy ruling. Do not
  fabricate parity while the named reference pack is unavailable.

## Supported recovery mechanism and verification

The actual Router 57.0.26 package source under the physical `.pnpm` directory consumes route-exported
`ErrorBoundary`, and layout `unstable_settings.screenErrorBoundary`. Its Try contract provides
`{ error: Error, retry: () => Promise<void> }`; retry clears boundary error state. Implement these
supported mechanisms after the owner records the correction to the plan's `app/+error.tsx` shorthand.
Do not add a file that merely looks like a handler but is never consumed by the router.

Use a shared token-themed `AppErrorBoundary` fallback at root, and the tab layout's supported screen
fallback to keep navigation mounted when a screen throws. Catch layout-level failure as well. Retry
is a functional accessible action with pending/error feedback; no raw stack/message in release.
Dev-only diagnostic details cannot leak into production logging or user-facing copy.

A valid `verify:recovery` must cause a real rendered child failure, observe the actual fallback, invoke
retry and prove recovery. Source-shape/AST/pure-policy tests alone do not meet this requirement.
Proposed browser harness: exact dev-only @playwright/test 1.64.1, isolated Chromium, one worker,
configurable local test origin, deterministic render faults, bounded lifecycle and no unrelated
network services. This is a separate dependency/CI provisioning decision, not already installed.
Known expected fault diagnostics must be exact and counted; unrelated console/page errors fail.
No broad console suppression. Browser proof supplements, not replaces, native-device evidence.

## Batch allocation requiring the recorded WP split

Workplan S5-MB1..4 conflicts with the general maximum of three micro-batches per WP. Proposed
resolution: WP-F.1 and WP-F.2 below, maximum three batches each, maximum two WPs/six batches per
sitting. Do not execute beyond the approved sitting or treat this draft as an exception grant.

### WP-F.1: recovery and ScreenContainer

| Batch                                   | Exact intended file set, at most five                                                                                                                        | Acceptance                                                                                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1-A: harness                           | `package.json`; `pnpm-lock.yaml`; `scripts/recovery.playwright.config.ts`; `scripts/verify-recovery.ts`; `docs/action-ledger-s5.md`                          | Approved dev-only dependency and one-worker browser lifecycle; preliminary harness checks, explicitly not yet a full recovery claim; lint covers test scripts. Full existing gate remains required.                  |
| F1-B: boundary                          | `src/components/templates/AppErrorBoundary.tsx`; `src/config/copy.ts`; `app/_layout.tsx`; `app/(tabs)/_layout.tsx`; `app/dev-gallery.tsx`                    | Actual root/tab/screen fault isolation, both-theme fallback, reset/retry and a dev-only controlled throw path. Harness from A must pass before this batch closes. The named copy list must be approved before apply. |
| F1-C: container and closure integration | `src/components/templates/ScreenContainer.tsx`; `src/components/templates/index.ts`; `scripts/verify-recovery.ts`; `package.json`; `docs/parity-register.md` | Safe-area/keyboard/breakpoint layout, barrel/consumer census, completed recovery scenarios and mandatory gate registration, exact parity/evidence status. No recovery SKIP.                                          |

F1-A's preliminary checks cannot be registered or advertised as satisfying the completed recovery
capability. F1-B must not be declared green without the real rendered failure/retry evidence. F1-C
registers the completed required verifier; failure of its runtime is a gate failure. The five-file
boundary batch is complete with direct-path imports; no undeclared barrel edit is assumed.

The `ScreenContainer` interface preserves existing children/scrollable/style callers, using native
`StyleProp<ViewStyle>` composition rather than narrowing style to a single object. Any new props
must be explicit and typed (content style, inset edges, keyboard behavior/offset when needed).
Use `useSafeAreaInsets`/SafeAreaView consistently; do not double-count parent insets or keyboard
height. Keep scroll behavior and tap handling usable while the keyboard is open. Use existing
LAYOUT/BREAKPOINTS, and stable theme selectors; callers do not add their own magic padding.

### WP-F.2: header, navigation and modal composition

| Batch                             | Exact intended file set, at most five                                                                                                                                                     | Acceptance                                                                                                                                                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F2-A: chrome                      | `src/components/templates/AppHeader.tsx`; `src/components/organisms/TopTabNavigation.tsx`; `src/config/copy.ts`; `app/(tabs)/_layout.tsx`; `app/dev-gallery.tsx`                          | Data/callback-driven header and navigation; all actions functional; real selected/disabled/accessibility states; no hardcoded grant fallback; integrate without premature S8 route flip. Direct-path imports keep this batch bounded. |
| F2-B: modal                       | `src/components/templates/ModalSheetLayout.tsx`; `src/components/organisms/GrantDetailModalSheet.tsx`; `app/(tabs)/index.tsx`; `app/dev-gallery.tsx`; `src/components/templates/index.ts` | Shared inset/keyboard/close shell; responsive bottom sheet/centered dialog; grant content/actions preserved; two live consumers migrated atomically.                                                                                  |
| F2-C: final registration/evidence | `src/components/organisms/index.ts`; `src/components/templates/index.ts`; `docs/parity-register.md`; `docs/s5-closure.md`; `docs/action-ledger-s5.md`                                     | Approved exports, actual stage evidence, named pending checks and exact ledger state. Create a closure record only after its acceptance evidence exists; absent device/reference/CI evidence keeps S5 OPEN or named PARTIAL.          |

An organism must not import a template. `GrantDetailModalSheet` becomes content/actions; the app and
gallery compose it inside `ModalSheetLayout`. Both current consumers are updated in the same batch,
with explicit callback propagation. Do not hide lower-to-higher imports to obtain shell reuse.

The modal preserves BackHandler/onRequestClose semantics, overlay dismissal rules and accessibility
roles/labels. Apply keyboard/safe-area behavior once. Header and navigation derive selection from
the actual route. Existing S5 routes have no canonical grant-ID path segment; accept real typed
grant context/callbacks from current consumers and never fabricate a fallback ID or a new route
parameter. Canonical grant deep-link migration remains S8. No duplicate navigation store or Router.
Preserve the existing route structure until S8. Any additional dependency/consumer discovered by
the census requires a revised approved file table before edits.

New modal/navigation motion must consume the existing reduced-motion hook and suppress nonessential
animation when requested. Verify opening/closing with motion disabled; do not inherit unconditional
slide animation from the old modal.

Use one descriptor source for mobile bottom tabs and desktop top navigation; respect the existing
manifesto breakpoint instead of duplicating screen lists or forcing top tabs on a narrow device.
The pinned router provides back/canGoBack but no general forward action. Do not construct a parallel
history stack or dead forward button to mimic the reference; obtain the platform disposition first.

## Symbol and consumer matrix

| Symbol                                              | Producer                                       | Consumers and constraints                                                               |
| --------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| AppErrorBoundary / Router-compatible fallback props | templates/AppErrorBoundary.tsx                 | root layout; tab layout; controlled dev-gallery path; only atoms/tokens at lower levels |
| Recovery copy keys                                  | config/copy.ts                                 | fallback and tests; exact reference/copy decision required                              |
| ScreenContainer / backward-compatible props         | templates/ScreenContainer.tsx                  | existing route census plus gallery; safe-area/keyboard logic centralized                |
| AppHeader                                           | templates/AppHeader.tsx                        | tab layout/gallery; typed optional actions, no app data fetch                           |
| TopTabNavigation / typed item props                 | organisms/TopTabNavigation.tsx                 | layout/gallery; route-driven selection and callback-driven actions                      |
| ModalSheetLayout                                    | templates/ModalSheetLayout.tsx                 | app dashboard/gallery; shell owns visibility/insets/close, organism is child content    |
| GrantDetailModalSheet existing grant/action props   | organisms/GrantDetailModalSheet.tsx            | dashboard/gallery; adapt both consumers atomically; no template import                  |
| DataSource / ENV                                    | types/api.ts; api/dataSource.ts; config/env.ts | existing hooks; no S5 implementation changes or new component env reads                 |

## Acceptance matrix and predicted findings

| Case                              | Required evidence                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root, tab layout and screen throw | Actual rendered throw/fallback/retry, both themes; screen case retains navigator                                                                       |
| Retry fails then succeeds         | Exact repeated-failure behavior; loading feedback; no permanent blank stage                                                                            |
| Release error privacy             | Production web build test or equivalent release evidence; no raw sentinel stack/message                                                                |
| Safe areas                        | Real device notch/status/home-indicator checks; no content under system chrome                                                                         |
| Keyboard/IME                      | Native show/hide, focus, paste and composer clearance; no double avoidance or lost text                                                                |
| Sizes                             | 320 and 768 required at S5; full 320/375/768/1024/1280 matrix tracked with S4 carryover/stage expiry                                                   |
| Modal                             | Open/close, hardware back, keyboard, small/wide layout, accessibility; web focus/ESC stage disposition explicit                                        |
| Navigation/header                 | Selected state, real callbacks/typed grant context, no invented ID/route, targets at least LAYOUT.minTouchTarget; canonical grant URL checks remain S8 |
| Gate                              | Existing strict chain plus approved verifiers; zero FAIL/SKIPPED, warnings at or below ceiling, independent CI                                         |
| Closure                           | Exact prior-green-pack regression, both-theme copy evidence, parity update, owner merge and named device outcomes                                      |

Predict F1 source changes WARN 63 -> 62 by replacing ScreenContainer's STORE-WHOLE subscription,
subject to actual pre-batch baseline and exact checker analysis. F2 filling TopTabNavigation,
ModalSheetLayout and AppHeader removes three PLAN-MISSING findings. New consumers may remove
DEAD-CODE warnings: enumerate the exact per-path changes after the approved code spec/census and
before applying each batch; do not pretend these provisional totals are a measured prediction.
Barrel-only wiring is not proof of live reachability. No baseline increase or new warning tolerated
as a default. The final per-batch expected-count line is a required pre-apply checkpoint.

## S6 switchability and cycles: acceptance contract, not early implementation

The owner's production priority is carried forward as explicit S6 requirements:

1. Validated deployment configuration selects mock or API at startup. Centralize base URL and
   polling/timeout values in config/env and client, not components. No live host invented here.
2. One endpoint registry uses relative paths and typed/encoded resource IDs. Changing environments
   should not require component edits. Preserve the agreed Flask contract; resolve contract gaps
   before inventing endpoints (the current root API document contains only six endpoint sections).
3. Mock and HTTP adapters satisfy the same DataSource contract. Deterministic mock fixtures,
   latency, failures, progress and clock inputs are adapter/test concerns; no simulated success in UI.
4. Query owns request/retry/cache/invalidation/polling. Poll only active work, stop on terminal states,
   cancel on unmount/identity change, prevent overlapping stale results and isolate query keys by ID.
5. Separate API errors, timeouts, auth failures and cancellation. Never retry writes without an agreed
   idempotency contract. Never silently switch to mock after a real request fails.
6. Keep credentials in approved secure storage; public configuration is not secret storage. Never
   bake tokens, real user payloads or environment secrets into tests, packs, logs or builds.
7. Run the same observable contract scenarios against the mock and local fixture HTTP server.
   Prove API-mode dashboard rendering and completed/failed cycles before claiming switchability.

S5 introduces no HTTP client, backend, endpoint fallback, test-only production flag or later-stage
screen extraction to satisfy these future requirements. Its job is to leave a clean consumer seam.
Existing `getLatestAuditScan()` returning null, literal mock export checksums and canned drafting
response delays remain open S6/S7 findings. UI resilience alone cannot make these real cycles or
computed product evidence. Track them explicitly; do not advertise production-connected behavior.

## Stop and handoff

Do not begin a batch before its exact spec, copy list, scope, dependency decisions and expected gate
delta are approved. Record current evidence after environment restore, not inherited green claims.
No two simultaneous heavy local jobs. Stop at the approved green PR boundary for owner merge;
do not auto-merge, continue into S6 or mark missing device/reference/CI evidence PASS.
