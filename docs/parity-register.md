# PARITY REGISTER: V7.2 (NEXT.JS) ↔ RN (S4 EXIT)

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
