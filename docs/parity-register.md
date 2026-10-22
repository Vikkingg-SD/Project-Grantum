# PARITY REGISTER: V7.2 (NEXT.JS) ↔ V2.4 (RN)

**Authority:** B-2.9, B-4.10, B-7.13. Updated at every stage exit.
**Reference:** `repomix-output-V7.2-nextjs-final-green.xml` (SHA `20413235…`)
**Subject:** `repomix-output-V2.4-green_AKA_V3-start.xml` (SHA `1765b7ee…`)

| #    | V7.2 Behaviour (Reference)                                                    | V2.4 Status     | Disposition / Owner             |
| ---- | ----------------------------------------------------------------------------- | --------------- | ------------------------------- |
| P-01 | Root `/` → onboarding redirect chain; 3-slide onboarding                      | STUBBED         | S7-H4                           |
| P-02 | Auth-gate: 3 social shells, OR divider, magic-link form                       | STUBBED         | Deferred (O-18)                 |
| P-03 | Global chrome: wordmark header, back/forward arrows                           | MISSING         | S5                              |
| P-04 | Custom back/forward stacks, HISTORY_CAP=19 ring                               | REMODELED       | WP-I (Expo Router owns history) |
| P-05 | TopTabNavigation: 6 tabs, post-award locked-but-navigable                     | REMODELED       | S7-H1/H3                        |
| P-06 | ESC global handler: blur focused field, else goBack                           | MISSING         | S9 web pass                     |
| P-07 | Route loading UI "Calibrating instrument…"                                    | MISSING         | S3-MB + S7 DoD                  |
| P-08 | Route error boundary: ScreenErrorBoundary + app/error.tsx                     | MISSING         | S5 SS-add                       |
| P-09 | 404 page: "Signal lost", big 404, themed back link                            | STUBBED         | S7                              |
| P-10 | SiteFooter: "Grantum — grant intelligence, instrumented."                     | MISSING         | RUL-SSU-07 (S9/S10)             |
| P-11 | Dashboard: bell IconButton (declared inert) + "New application" CTA           | MISSING         | S7-H1                           |
| P-12 | Dashboard: search input, "Live matching" badge, "Project profile 51% done"    | MISSING         | S7-H1                           |
| P-13 | HeroContinueCard: "Active session" eyebrow + glow, progress 42                | DRIFTED         | S7-H1 copy ruling               |
| P-14 | PipelineFunnelBar 24/8/3/2/1/1, gold terminal                                 | KEPT            | —                               |
| P-15 | GrantDiscoveryGrid + bounty empty-state                                       | DRIFTED         | S7-H1                           |
| P-16 | Grant detail modal: "View details"/"Help me apply", "Record: Indexed · mock"  | DRIFTED         | S7-H1 copy ruling               |
| P-17 | DiscoveryContainer: sidebar filters, Reset, search, grid                      | STUBBED         | S7-H1                           |
| P-18 | Drafting: sections panel, 3 chips, chat with welcome seed, IME-safe Enter     | KEPT/DRIFTED    | S7-H2 copy pass                 |
| P-19 | Drafting chat: instant canned replies                                         | ESCAPE          | RUL-SSU-04 (remove theater)     |
| P-20 | Audit: "Scanning…"/"Live pass" badge, SCAN_SETTLE_MS=3000                     | MISSING         | S7-H2                           |
| P-21 | Audit chips + canned replies                                                  | DRIFTED         | S7-H2 copy ruling               |
| P-22 | Export: 4 format cards with blurbs; "Run humanizer pass"                      | DRIFTED         | S7-H3                           |
| P-23 | Export gate: badges "Export locked — confidence {n} below 85"                 | KEPT            | —                               |
| P-24 | Export doc: per-grant seeded, charLimit 10000, counter                        | KEPT            | —                               |
| P-25 | Export success line: "Bundle checksum verified · {label}" — no hash displayed | ESCAPE          | RUL-SSU-03 (AD-46)              |
| P-26 | Post-award: eyebrow, subcopy, stat tiles, 3 named audit-log lines             | DRIFTED/MISSING | S7-H3                           |
| P-27 | Zero persistence anywhere (stores die on refresh)                             | KEPT            | RUL-SSU-09                      |
| P-28 | Confidence volatile denominator; 5/6 → 83 → locked                            | KEPT            | —                               |
| P-29 | Tier doctrine 80/40, 85/40, ruby-below-40                                     | KEPT            | —                               |
| P-30 | MetricGauge geometry (r50, viewBox 120, sw 8, −90°)                           | KEPT            | —                               |
| P-31 | Button 5 variants × 3 sizes; mint=pumpkin ruling                              | REMODELED       | Heights 44/48/56                |
| P-32 | IconButton 44px                                                               | DRIFTED         | S3/S9 sub-44 audit              |
| P-33 | ProgressBar 500 ms width transition; reduced-motion CSS kill-switch           | MISSING         | S3 + S9                         |
| P-34 | Glow language: status-glow-*, button glow, hero eyebrow drop-shadow           | MISSING         | S3/S7 visual parity             |
| P-35 | ToggleSwitch present-but-unused                                               | KEPT            | —                               |
| P-36 | A11y systematized: focus trap/restore, aria-current/invalid/busy/pressed      | PARTIAL         | S5/S9                           |
| P-37 | Security headers, OG metadata, viewport (min-width 320)                       | MISSING         | S10 web export gate             |
| P-38 | Copy voice: instrument metaphors ("Calibrating instrument…")                  | DRIFTED         | B-4.10 copy-verbatim rule       |
| P-39 | Dead-controls whitelist documented (bell, filter, social, humanizer)          | ESCAPE          | RUL-SSU-05 (AD-48)              |
| P-40 | 3 mock grants (94/82/76, amounts, deadlines, regions)                         | KEPT            | —                               |
