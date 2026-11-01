# S6 implementation and acceptance card — 2026-11-02

Status: implementation complete; acceptance OPEN. This is not a CLOSED-FULL or
native visual PASS declaration. S5 remains CLOSED-FULL by the owner's earlier
build-only exception; no new S6 exception has been assumed.

Owner authority: complete planned S6, fix the supplied screen bugs, five files per
batch, pnpm gate after each, at most three PRs, native app focus and no excessive
browser tests. All other parts of the concrete S6 specification were approved.
V7.2 is conceptual reference; approved merged PR #38 / 9098f7a is the implementation
baseline, with 8382abd's S5 closure records carried forward. No S4 comparison was run.

Delivered: timeout-aware fetch client and ApiError; real API DataSource selection;
runtime response/identity validation; 14 endpoint contracts; stable query keys;
all planned hooks; production optimistic rollback and per-grant mutation ordering;
actual scan polling; honest export success/download handling; Query-owned server
state; native SecureStore credentials and memory-only web tokens; environment
readers/removal; connected Dashboard/Drafting/Audit/Export/Post-award consumers.
No backend, dependency upgrade beyond approved SecureStore, auth-gate UI, screen
extraction or route flip was introduced.

Native defect correction code: complete adaptive bottom-tab labels and safe areas;
wrapped headings and suggestions; reachable export action; coherent funnel groups;
full-width audit messages with timestamps underneath; stacked award metrics;
exposed persisted theme selection; buttons/badges/gauge readout support narrow
width and text scaling. These changes still require physical-device acceptance.

Evidence before the documentation batch:

- Full pnpm gate: FAIL 0 / WARN 25 / INFO 4 / SKIPPED 0; 181 cases.
- Cases: 14 scoring, 9 drafts, 6 theme, 20 composer, 24 preflight, 36 tokens,
  20 existing recovery, 52 contract. Existing chain preserved; contract appended.
- Contract fixture: all 15 DataSource methods / 14 endpoint contracts, request and
  auth behavior, invalid payload/error/timeout/no-fallback handling, body-dependent
  fixture checksums, actual optimistic rollback, serial mutations, poll termination,
  mock isolation, documentation coverage and local runtime import-cycle detection.
- Android production export: PASS; Hermes bundle
  entry-4aa7511828e581b7a3bc37fccb2fffaf.hbc (5.4 MB). This is not an APK install or
  native interaction test. adb is unavailable on PATH.
- Five-file source/commit boundaries restored before publishing after a local
  hook-sequencing error; full details in action-ledger-s6.md. Hooks remained active.

Outstanding acceptance:

1. Physical Samsung A55: all six native tab labels and five supplied views, both
   themes, larger text, scrolling and primary actions.
2. Real native token restart/logout and storage-failure behavior, keyboard/IME/paste,
   first tap, modal/system Back, recovery and screen-reader behavior.
3. Actual API-mode Dashboard UI rendering against a fixture/deployed backend. The
   current fixture verifies the adapter and Query mutation options, not this UI
   criterion. No production backend address or credentials were invented.
4. Owner PR review/merge and independent CI. No merge or CI outcome is fabricated;
   old merged-main CI remains unverified under the owner's instruction.
5. Closure pack/export coverage against the owner-designated approved build when
   final acceptance is closed. No S4 pack or pre-closure candidate was substituted.

Retained later work: S7 extraction and full seed/copy parity, S8 routing, S9 global
visual/accessibility review, AD-61 and other documented earlier-stage debt. The
warning ceiling remains 58; measured warnings are 25. No exemptions, baselines,
preflight rules, CI, hooks, theme values or existing verifier cases were weakened.

Rollback: preserve the feature branch and use a corrective feature PR from the
approved anchor; never reset main, force push or merge automatically. Final stop
after the required documentation gate and review handoff; no post-push checks.
