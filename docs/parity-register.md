# PARITY REGISTER: V7.2 (NEXT.JS) ↔ RN (S4 EXIT)

## S7 current candidate — 2026-11-02

S7 is implemented on the feature branch; acceptance remains OPEN. The owner
approved S7 after explicitly closing S6 and deferred excessive testing/UI polish.
Eight routes now re-export screens; the ninth planned AuthGateScreen remains
unregistered under its standing deferral. Existing API contracts and state ownership
remain intact. The rows below supersede H1's intermediate pending descriptions.

| Rows                      | Current disposition        | Boundary                                                                                                                                |
| ------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| P-09 / P-17               | IMPLEMENTED                | Themed 404 recovery, real discovery search/filters/reset/details/apply; native acceptance deferred                                      |
| P-11 / P-12 / P-16        | KEPT / REMODELED           | Reference Dashboard/modal labels, real queried data; bell/filter explicitly disabled; API records labelled honestly                     |
| P-15                      | REMODELED                  | Reference bounty empty-state copy with actual DataSource submission; mock queue acknowledgements labelled preview                       |
| P-18 / P-19 / P-20 / P-21 | REMODELED                  | Shared welcome copy is a labelled local preview; actual Query mutations/scans remain authoritative; no reply theater                    |
| P-22 / P-23 / P-24 / P-25 | REMODELED                  | Four blurbs, selected-format/editor/threshold states, actual export response/download; humanizer disabled and fake verification removed |
| P-26                      | REMODELED                  | Authoritative award/events and actual counts; no invented award, immutable trail or audit export                                        |
| P-39                      | DISPOSED IN IMPLEMENTATION | RUL-SSU-05 bell/filter/humanizer are visibly disabled; no fake social/auth flow exposed                                                 |
| Onboarding                | KEPT / REMODELED           | Three reference slides, direct Router handoff using actual queried grant; no mock import into screen                                    |

Full copy/seed acceptance, independent CI, API render and native/visual validation
remain pending. Auth gating, route flip, global polish and release work are not
closed by this implementation card. See s7-closure.md and action-ledger-s7.md.
Final typecheck passed; strict preflight is 0 FAIL / 17 WARN / 4 INFO / 0 SKIPPED,
zero active exemptions. Warning ceiling is tightened 25 to 17. No full S7 gate or
native/API render PASS is inferred from those checks.

## S7 implementation — H1

Owner approved S7 and deferred expensive verification after the S6 wait.
H1-A / 1cf6ba2 passed its staged ESLint/Prettier hooks: Dashboard/Discovery now
live under src/screens and their routes are pure re-exports. Discovery supports
server-owned search, region/category filters, reset, details and apply; its old
placeholder exemption is removed. Opportunity-type filtering is NEW functional
behavior under the approved S7 specification rather than a false inert control.

H1-B restores P-11/12/16 copy: Dashboard New application, search, Live matching,
actual queried profile completion and Show all; disabled Notifications/Filter grants
remain explicit RUL-SSU-05 inert previews. Modal labels match V7.2; API response
records are identified honestly rather than claiming Indexed · mock in API mode.
Full viewport/native/copy acceptance and bounty empty-state UI remain pending.
Shared preview welcome text lives in config/copy.ts to preserve the S6 zero-mock
import boundary; an unused mock/copy.ts is not created simply to fill a plan row.

## S6 partial stage exit — 2026-11-02

S6 implementation is LANDED through owner-merged PR #40 / 796e3c1; independent
PR Strict Gate 41347627949 and main push gate 41350310427 both succeeded. The
owner confirms SDK 57 builds but reports many UI bugs and defers polishing.
Final disposition: S6 CLOSED BY EXPLICIT OWNER EXCEPTION after the owner stopped
the prolonged local gate and approved S7. Typecheck, lint and export comparison
passed; the full local gate did not return PASS. Remaining checks,
API Dashboard rendering and native acceptance remain deferred, not certified.

The implementation dispositions in the next table now describe merged source.
WP-G/AD-10/AD-13/AD-30 client work is implemented: Query ownership, HTTP/API mode,
14 endpoint contracts, secure-storage integration and reader/removal env cleanup.
Runtime native secure-storage behavior is still unverified. P-03/05/14/18–26/36
and the new theme-control implementation retain physical acceptance and full S7
copy/seed or S9 visual/accessibility obligations as appropriate. UI debt is deferred
by the current owner instruction, not converted to KEPT/PASS.

The verified approved-PR-#38 source-equivalent S5 pack comparison passed
0 FAIL / 25 WARN / 3 INFO / 0 SKIPPED without export loss/regression. The closure
warning ceiling is tightened 58 to 25. Actual API Dashboard rendering remains an
S6 acceptance debt until observed; timed-out Metro startup is not render proof.
S7–S10 implementation is not closed by this row. The final owner instruction
superseded the earlier S6-first pause and explicitly approved starting S7.
See s6-closure.md and action-ledger-s6.md.

The dated tables below remain historical. The owner's current direction makes
V7.2 the conceptual product reference and approved merged PR #38 / 9098f7a the
implementation comparison point, with closure records carried from 8382abd. S4 is
not the implementation baseline for this work. S5's build-only exception remains
intact and is not silently extended to S6.

| Area                         | S6 disposition               | Evidence / retained boundary                                                                                                                                                                                                                                                   |
| ---------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P-03 / P-05 / P-36           | REMODELED native navigation  | Six shared route descriptors now render a font-scale-aware grid with complete labels and safe-area edges; real tabPress/navigation preserved. Existing recovery cases pass; actual A55 rendering remains unverified.                                                           |
| P-14                         | REMODELED funnel             | Coherent equal-column responsive grid; terminal gold and server-provided stage values retained. Native screenshot acceptance pending.                                                                                                                                          |
| P-18 / P-19                  | REMODELED data ownership     | Required/completed sections and score come from Query; mutations cancel, optimistically update, roll back and settle per grant. Notes are local; delayed synthetic revision replies removed as a necessary truth correction. Full S7 seed/copy parity remains.                 |
| P-20 / P-21                  | REMODELED audit seam         | Actual scan creation/latest read and running-only polling; no canned compliance result. Server events shown distinctly from local notes. Contract cases cover terminal/error stop conditions.                                                                                  |
| P-22 / P-23 / P-24           | REMODELED export             | Complete reachable action, authoritative draft confidence, real mutation response/download, server-supplied checksum wording. Mock export rejects instead of manufacturing success. S7 full format-card/humanizer/copy work remains.                                           |
| P-25 / P-26                  | REMODELED post-award seam    | Queried grant/award/events, stacked narrow metrics and timestamps below full-width messages. Physical acceptance remains pending.                                                                                                                                              |
| Theme control                | NEW product control          | Header exposes the existing persisted light/dark actions; system following remains until explicit choice. Palette/AD-61 unchanged. Device persistence interaction remains unverified.                                                                                          |
| WP-G / AD-10 / AD-13 / AD-30 | IMPLEMENTED client candidate | Fetch/ApiError/timeout, HTTP selector, typed endpoint/key registries, 14 documented endpoint contracts, secure native token storage, Query hooks, client-only draft state, env readers/removal. All 15 DataSource methods exercised against the fixture; import graph acyclic. |

Final product gate before documentation: FAIL 0 / WARN 25 / INFO 4 / SKIPPED 0;
181 cases including 52 contract cases. Android production Hermes export passed.
The fixture proves the HTTP client and production mutation options; a real backend,
API-mode Dashboard UI render, native secure-store persistence, IME, system Back and
native visual/accessibility outcomes are not established by these results.
S7 extraction/copy/seed work, S8 route changes, S9 global accessibility/visual review
and AD-61 remain retained. See action-ledger-s6.md and s6-closure.md.

## S5 closure by owner exception; native visual acceptance failed

Final disposition, 2026-11-02: the owner requested build-only S5 closure after rejecting all
five supplied Samsung A55 viewport captures. S5 is CLOSED-FULL BY EXPLICIT OWNER EXCEPTION,
not visually/native accepted. [The closure card](s5-closure.md) records the exact instruction.
P-03/P-05/P-36 retain native bottom-tab label clipping/fading; Drafting/Audit/Export right-edge
overflow and severely squeezed Post-award audit messages remain defects. Product light/dark
selection is missing; owner observes dark web and light phone. Screenshots establish actual
light rendering and failed viewport quality, not completed keyboard/IME/recovery/back acceptance.
AD-61 and all later-stage copy/backend/global accessibility debt remain open. Earlier browser
measurements below do not override the owner-supplied native evidence. No further gate or
post-push verification was performed for this documentation-only disposition, as instructed.

### F2 candidate evidence — 2026-11-02

The S4 table below remains a dated baseline. Current S5 dispositions are:

| Row  | Current S5 disposition                    | Evidence / retained boundary                                                                                                                                                                                                                                                                                                                                  |
| ---- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-03 | IMPLEMENTED, native acceptance pending    | Shared AppHeader on tab routes, real Router back/canGoBack; forward disposed by adopted platform ruling. No parallel history or fabricated grant context.                                                                                                                                                                                                     |
| P-05 | IMPLEMENTED platform translation          | One six-item descriptor source drives native bottom tabs and wide top navigation at md. All six routes, selected state and locked-but-navigable Post-award exercised; disabled preview tested separately. S7 screen content remains later.                                                                                                                    |
| P-08 | IMPLEMENTED, native acceptance pending    | Root/tab/gallery/inherited-screen failures and retry are rendered in both themes; the mandatory gate includes 20 real-app cases. Release privacy and reload also exercised.                                                                                                                                                                                   |
| P-16 | REMODELED shell; copy DRIFT remains S7-H1 | ModalSheetLayout owns visibility, reduced motion, safe areas, keyboard and dismissal. GrantDetailModalSheet owns typed content/actions only. Both Dashboard and Gallery compose them; title wraps, long content scrolls, actual grant reaches Start Draft. Existing Funding Amount/Deadline/Match Score/Start Draft copy preserved, Close reference-verbatim. |
| P-36 | PARTIAL system coverage                   | Web modal focus containment, focus return and Escape exercised using RN Web's installed Modal mechanism; custom selected/disabled ARIA states measured. Native accessibility and the global S9 audit remain owed.                                                                                                                                             |

F2-A full gate measured 0/60/3/0; F2-B measured 0/58/3/0, each with 128 cases.
Production chrome review covered 320/768/1280 in both themes and actual route/back actions.
Modal review covered 320/375/390/640/767/768/1024/1280 in both themes; six additional
dev-gallery cases covered long titles/content, disabled navigation and first-tap actions.
Cold-start and action probes recorded no touch-history warning. The owner's earlier warning
occurred before any app click; its cause is not established and no suppression was added.

The designated S4 pack comparison at F2-B passed 0/58/2/0 without export loss/regression.
See [the S5 evidence card](s5-closure.md) for exact anchors, pending native checks and closure
conditions. This supplements the dated integration note below; it does not certify all S4
components' viewport/prop branches or complete spacing, shadow, contrast or screen-copy parity.

Root/tab/gallery recovery and inherited screen isolation are implemented using Router 57
ErrorBoundary exports and screenErrorBoundary, with verbatim reference copy. Manual F1-B
rendered proof covered both themes and 320/768/1280; PR #36's browser provisioning and
preliminary harness CI passed. F1-C adds the durable real-app recovery verifier to the gate.
Its browser/DOM tests do not establish native safe-area, keyboard/IME/paste or device light
theme acceptance. ScreenContainer preserves callers, uses stable theme selection, measured
insets/keyboard origin and registered responsive padding; native physics remain NOT RUN.
P-08 and P-36 are partial pending the full stage evidence, not CLOSED by these integrations.
The existing narrow tab-label clipping belongs to chrome work; AD-61 remains OPEN.

**Authority:** B-2.9, B-4.10, B-7.13. Updated at every stage exit.
**Reference:** `repomix-output-V7.2-nextjs-final-green.xml` (SHA `20413235…`)
**Subject:** RN S4 exit at `95ac9b2f956d8486ed52886b4a223cc2f1ea6717` (#27); current evidence in `docs/s4-closure.md`.

| #    | V7.2 Behaviour (Reference)                                                    | S4 Status       | Disposition / Owner                                                                 |
| ---- | ----------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------- |
| P-01 | Root `/` → onboarding redirect chain; 3-slide onboarding                      | STUBBED         | S7-H4                                                                               |
| P-02 | Auth-gate: 3 social shells, OR divider, magic-link form                       | STUBBED         | Deferred (O-18)                                                                     |
| P-03 | Global chrome: wordmark header, back/forward arrows                           | MISSING         | S5                                                                                  |
| P-04 | Custom back/forward stacks, HISTORY_CAP=19 ring                               | REMODELED       | WP-I (Expo Router owns history)                                                     |
| P-05 | TopTabNavigation: 6 tabs, post-award locked-but-navigable                     | REMODELED       | S7-H1/H3                                                                            |
| P-06 | ESC global handler: blur focused field, else goBack                           | MISSING         | S9 web pass                                                                         |
| P-07 | Route loading UI "Calibrating instrument…"                                    | MISSING         | S3-MB + S7 DoD                                                                      |
| P-08 | Route error boundary: ScreenErrorBoundary + app/error.tsx                     | MISSING         | S5 SS-add                                                                           |
| P-09 | 404 page: "Signal lost", big 404, themed back link                            | STUBBED         | S7                                                                                  |
| P-10 | SiteFooter: "Grantum — grant intelligence, instrumented."                     | MISSING         | RUL-SSU-07 (S9/S10)                                                                 |
| P-11 | Dashboard: bell IconButton (declared inert) + "New application" CTA           | MISSING         | S7-H1                                                                               |
| P-12 | Dashboard: search input, "Live matching" badge, "Project profile 51% done"    | MISSING         | S7-H1                                                                               |
| P-13 | HeroContinueCard: "Active session" eyebrow + glow, progress 42                | REMODELED       | S4 exact copy/variants landed; glow remains P-34 / S7/S9                            |
| P-14 | PipelineFunnelBar 24/8/3/2/1/1, gold terminal                                 | KEPT            | —                                                                                   |
| P-15 | GrantDiscoveryGrid + bounty empty-state                                       | DRIFTED         | S7-H1                                                                               |
| P-16 | Grant detail modal: "View details"/"Help me apply", "Record: Indexed · mock"  | DRIFTED         | S7-H1 copy ruling                                                                   |
| P-17 | DiscoveryContainer: sidebar filters, Reset, search, grid                      | STUBBED         | S7-H1                                                                               |
| P-18 | Drafting: sections panel, 3 chips, chat with welcome seed, IME-safe Enter     | KEPT/DRIFTED    | S4 composer web policy + composer20 landed; S7-H2 seed/screen copy remains          |
| P-19 | Drafting chat: instant canned replies                                         | ESCAPE          | RUL-SSU-04 (remove theater)                                                         |
| P-20 | Audit: "Scanning…"/"Live pass" badge, SCAN_SETTLE_MS=3000                     | MISSING         | S7-H2                                                                               |
| P-21 | Audit chips + canned replies                                                  | DRIFTED         | S7-H2 copy ruling                                                                   |
| P-22 | Export: 4 format cards with blurbs; "Run humanizer pass"                      | DRIFTED         | S7-H3                                                                               |
| P-23 | Export gate: badges "Export locked — confidence {n} below 85"                 | KEPT            | —                                                                                   |
| P-24 | Export doc: per-grant seeded, charLimit 10000, counter                        | KEPT            | —                                                                                   |
| P-25 | Export success line: "Bundle checksum verified · {label}" — no hash displayed | ESCAPE          | RUL-SSU-03 (AD-46)                                                                  |
| P-26 | Post-award: eyebrow, subcopy, stat tiles, 3 named audit-log lines             | DRIFTED/MISSING | S4 audit-row truncation removed; exact screen-owned lines remain S7-H3              |
| P-27 | Zero persistence anywhere (stores die on refresh)                             | KEPT            | RUL-SSU-09                                                                          |
| P-28 | Confidence volatile denominator; 5/6 → 83 → locked                            | KEPT            | —                                                                                   |
| P-29 | Tier doctrine 80/40, 85/40, ruby-below-40                                     | KEPT            | —                                                                                   |
| P-30 | MetricGauge geometry (r50, viewBox 120, sw 8, −90°)                           | KEPT            | —                                                                                   |
| P-31 | Button 5 variants × 3 sizes; mint=pumpkin ruling                              | REMODELED       | Heights 44/48/56                                                                    |
| P-32 | IconButton 44px                                                               | REMODELED       | S4 named role/disabled state and token 44pt target; global audit S9                 |
| P-33 | ProgressBar 500 ms width transition; reduced-motion CSS kill-switch           | MISSING         | S3 + S9                                                                             |
| P-34 | Glow language: status-glow-*, button glow, hero eyebrow drop-shadow           | MISSING         | S3/S7 visual parity                                                                 |
| P-35 | ToggleSwitch present-but-unused                                               | KEPT            | —                                                                                   |
| P-36 | A11y systematized: focus trap/restore, aria-current/invalid/busy/pressed      | PARTIAL         | S4 named send/checkable chips landed; focus/navigation remain S5/S9                 |
| P-37 | Security headers, OG metadata, viewport (min-width 320)                       | MISSING         | S10 web export gate                                                                 |
| P-38 | Copy voice: instrument metaphors ("Calibrating instrument…")                  | DRIFTED         | S4 shared molecule copy byte-compared; B-4.10 screen passes remain S7               |
| P-39 | Dead-controls whitelist documented (bell, filter, social, humanizer)          | ESCAPE          | RUL-SSU-05 (AD-48)                                                                  |
| P-40 | 3 mock grants (94/82/76, amounts, deadlines, regions)                         | KEPT            | —                                                                                   |
| P-41 | Dev-only UI kit gallery: app/dev-gallery.tsx                                  | NEW             | RUL-A1-20 / B-7.4; S4 variants/actions in both themes; full matrix later validation |

## S4 stage exit — 2026-10-27

S4 is CLOSED-FULL under the owner's explicit acceptance disposition recorded in
[the closure card](s4-closure.md). The record preserves unverified owner light-theme,
native composer/IME/paste and full viewport evidence for later validation.
Both-theme agent gallery evidence and earlier owner phone light renders remain distinct.

Reference remains V7.2 Next.js, SHA-256
204132358CC94DA9520E9C6A6360743507DE29FF4DE7B998AA0AEE972F33B35C.
Owner-designated RN comparison pack is V7.0-start, SHA-256
E59592D392C9B95FD0A7CC0F6CCA4A275F5E8DAD64A0069C7FE9457A830D68B1;
strict comparison reported no export loss/regression. It does not replace the product reference.

S4 component copy and platform translations (Enter/IME, checkable filters, wrapped options,
chat geometry) are recorded in the closure card. All seven molecules are refreshed; screen-owned
copy, glow, remaining accessibility and global visual work retain their stage ownership.
There is no new product-level exemption, backend feature or silent parity drop.
