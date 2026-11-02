# S7 implementation and acceptance card — 2026-11-02

Status: IMPLEMENTATION CANDIDATE; acceptance OPEN. This is not CLOSED-FULL,
native visual acceptance or release readiness. The owner explicitly approved S7
after closing S6 by exception and deferred excessive testing and UI polishing.

## Implemented

- Nine planned screen modules exist under src/screens. Eight existing app routes
  are pure default re-exports. AuthGateScreen is deliberately not registered as
  a route or security mechanism under RUL-SSU-06; it exposes no fake login.
- Dashboard has search, New application, Show all, queried profile completion,
  Live matching and grant details. Search filters Query-owned data without
  unmounting the search field after each keystroke.
- Discovery has Query-backed search, region/opportunity filters, reset, match
  count, details and real apply navigation. Empty results expose the existing
  bounty contract, with real pending/error/accepted states and an explicit mock
  preview acknowledgement.
- Drafting/Audit retain production mutations and scan polling. Reference welcome
  text is a labelled local preview. Chips prepare local notes, not fabricated
  replies. Keyed grant sessions reset local editor state when the grant changes.
- Export has four format blurbs, the reference no-format-selected state, editable
  service/locally edited body, threshold gate and actual service download/checksum.
  The reference humanizer is visibly disabled; no pass or checksum is invented.
- Post-award displays server-owned award/status/date/amount/events; missing awards
  remain an empty state. Unsupported Immutable Audit Trail wording is removed.
- Onboarding ports all three reference slides and uses the first actual queried
  opportunity for a direct Router handoff. The 404 copy/link is reference-verbatim.
- All three completed route-placeholder exemptions are removed. No new exemption,
  dependency, gate-script edit, token change, backend or native config was added.

## Verification boundary

Each completed source commit in action-ledger-s7.md passed its required staged
ESLint/Prettier hooks, after one diagnosed H2 correction. Final pnpm typecheck passed.
Strict preflight passed FAIL 0 / WARN 17 / INFO 4 / SKIPPED 0 in 7.42 seconds,
with zero active exemptions. The approved warning ceiling is lowered 25 to 17.
The final metadata/auth commit's hook outcome is recorded in the sitting handoff.
No full pnpm gate result is asserted for S7. The earlier S6 typecheck/lint and
PR/main CI are separate evidence. Export-regression closure cadence remains due
when S7 acceptance is closed; no S5 pack is substituted for a final S6 snapshot.

## Named pending work

Full behavioral gate and independent PR CI; copy/seed and viewport acceptance;
physical phone rendering/IME/Back/accessibility and native token restart/logout/
storage failures; actual API-mode Dashboard UI rendering; visual polish including
AD-61. These are deferred, not PASSED. A real backend/service is not created here.
Live humanizer/auth/social flows and audit-specific bundle generation remain outside
the existing service contract or under standing deferral; no fake success is added.

S8 owns the grant-URL route flip and remaining navigation hooks. S9 owns the global
visual/accessibility pass. S10 release identity/publication is explicitly deferred;
local release checks remain future work. Legacy plan paths such as mock/copy.ts
remain visible warnings pending reconciliation rather than unused fabricated code.

Rollback uses a corrective feature PR from the verified merged S6 anchor. Source
commits are bounded at five files; existing hooks and owner-only squash-merges stay
in force. Stop after the reviewable S7 handoff; do not silently start S8.
