# S4-MB1 / WP-E: molecule refresh R2 specification

Status: APPROVED BY OWNER IN CHAT; product implementation authorized.
Date: 2026-10-27 (Asia/Qyzylorda).
Subordinate to the owner-supplied AGENTIC constitution/workplan, ratified in this chat.
Authority: workplan 3.1; B-4.10, B-7.2/7.3/7.4, B-10.1/10.14/10.16.

## Pinned sources and entry evidence

Reference: owner-supplied repomix-output-V7.2-nextjs-final-green.xml.
SHA-256: 204132358CC94DA9520E9C6A6360743507DE29FF4DE7B998AA0AEE972F33B35C.
Reference component path: components/grantum/molecules/index.tsx.
Line numbers below are relative to that packed component file, verified by indexed extraction.
Reference read only by inventory and targeted extraction; no full-repository dump.

Subject base: a84807590dc51d196fa83767ed26aaab93714d24 plus the separately recorded boot documentation batch.
Fresh pre-edit full gate: FAIL 0 / WARN 68 / INFO 3 / SKIPPED 0; suites 14/8/6 pass.
MCP: pinned 1.18.1, five read-only tools, live pack/search/read through the explicitly
owner-authorized session bridge. Native app-catalog activation remains unverified.
Owner confirms PAT regenerated. RUL-AG-01 through 10 and X3 dispositions adopted in this chat.
Token alignment is a separately approved ruling, not an incidental change in this batch.

## Exact delivery table: five files

| File                                                | Action  | Contract                                                                                             |
| --------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| src/config/copy.ts                                  | ADD     | Single S4 molecule-copy module; export GRANT_CARD_COPY, CONFIDENCE_COPY, HERO_CONTINUE_COPY          |
| src/components/molecules/GrantCard.tsx              | REFRESH | Preserve GrantCardProps; independent reference actions; focused theme selector; tokens; memoization  |
| src/components/molecules/ConfidenceGaugeReadout.tsx | REFRESH | Preserve score prop and fixed export threshold; reuse gauge/scoring; reference strings; tokens       |
| src/components/molecules/HeroContinueCard.tsx       | REFRESH | Restore reference active copy and add reference no-session variant without breaking existing callers |
| app/dev-gallery.tsx                                 | MODIFY  | Demonstrate the refreshed states and action feedback in the existing guarded gallery                 |

No barrel edit: all component exports already exist. All consumers use direct file imports while
AD-59 remains open. The copy module is under config, not mock, so UI does not cross the mock seam.
No theme, manifesto, dependency, route, checker, baseline, exemption or API changes in this batch.
The new copy module is justified by B-10.16; it does not alter the plan manifest or silently
reclassify a planned gap. Final source changes must equal this table.

## Symbol Verification Matrix and consumer census

| Symbol                                                 | Producer                           | Consumers / invariant                                                                   |
| ------------------------------------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------- |
| GrantCard / GrantCardProps                             | molecule file                      | GrantDiscoveryGrid, dev-gallery, existing barrel; grant/onSelect/onApply unchanged      |
| ConfidenceGaugeReadout / ConfidenceGaugeReadoutProps   | molecule file                      | audit route, dev-gallery, existing barrel; score unchanged                              |
| HeroContinueCard / HeroContinueCardProps               | molecule file                      | dashboard route, dev-gallery, existing barrel; existing active-session calls stay valid |
| matchTier / scoreTier / isExportUnlocked               | utils/scoring.ts                   | Badge semantics come from helpers, never duplicated tier numbers                        |
| TIERS                                                  | config/constants.ts                | match 80/40, confidence 85/40; export gate remains 85                                   |
| MetricGauge                                            | atoms/MetricGauge.tsx              | Existing r50/viewBox 120/strokeWidth 8/-90-degree implementation reused without editing |
| AppText / AppButton / StatusBadge / ProgressBar        | direct atom files                  | Existing typed prop names and palette semantics retained                                |
| PALETTE / RADIUS / SPACING                             | config/theme.ts                    | Current token exports only; no unsupported RADIUS.lg reference                          |
| BREAKPOINTS / useBreakpoint                            | layout.ts / hooks/useBreakpoint.ts | Existing responsive boundaries; hooks already reachable in gallery                      |
| GRANT_CARD_COPY / CONFIDENCE_COPY / HERO_CONTINUE_COPY | new config/copy.ts                 | Three refreshed molecules; direct imports                                               |

GrantCard may use React.memo with a named function and named export; preflight recognizes exported
const declarations. Keep callbacks in the comparison contract: default shallow comparison only.
The parent grid creates new callbacks, so no claim of eliminated grid rerenders is permitted.
Shared names may not be renamed or removed; getters/stores are not modified.

## Verbatim copy table

The copy module contains these exact strings. Dynamic values remain props/derived values.
No renamed, paraphrased or uppercased source literals; AppText eyebrow styling supplies uppercase.

| Module key / surface               | Exact value                            | Reference line |
| ---------------------------------- | -------------------------------------- | -------------- |
| GRANT_CARD_COPY.funding            | Funding                                | 21             |
| GRANT_CARD_COPY.deadline           | Deadline                               | 25             |
| GRANT_CARD_COPY.details            | View details                           | 32             |
| GRANT_CARD_COPY.apply              | Help me apply                          | 33             |
| GRANT_CARD_COPY.matchLabel(pct)    | Interpolate pct followed by "% match"  | 14             |
| CONFIDENCE_COPY.label              | confidence                             | 122            |
| CONFIDENCE_COPY.unlocked           | Export unlocked                        | 124            |
| CONFIDENCE_COPY.locked             | Export locked                          | 124            |
| CONFIDENCE_COPY.thresholdPrefix    | "Threshold: " including trailing space | 126            |
| CONFIDENCE_COPY.thresholdSuffix    | " confidence" including leading space  | 126            |
| HERO_CONTINUE_COPY.activeEyebrow   | Active session                         | 150            |
| HERO_CONTINUE_COPY.inactiveEyebrow | Next action                            | 150            |
| HERO_CONTINUE_COPY.untitled        | Untitled application                   | 151            |
| HERO_CONTINUE_COPY.inactiveTitle   | Start a new grant application          | 151            |
| HERO_CONTINUE_COPY.progress        | Almost there                           | 154            |
| HERO_CONTINUE_COPY.resume          | Continue drafting                      | 159            |
| HERO_CONTINUE_COPY.start           | Start application                      | 159            |

Funder/title/amount/deadline/region values are passed through without reformatting.
Reference mint CTA maps to the existing RN primary variant under the carried pumpkin-brand ruling.
The threshold is rendered as prefix, metric-sm TIERS.confidence.pass, suffix.
Reference app consumers never override threshold; preserve the existing RN fixed-85 contract.
No arbitrary display threshold can disagree with the real export lock.

## Machine-checkable per-file behavior

GrantCard:

- Use a non-interactive outer View, matching the reference article; selection and application
  are two independent AppButton actions. Removing the outer Pressable avoids nested activation.
- Use a primitive theme-mode selector; preserve status helper and GrantCardProps exactly.
- Memoize with default shallow prop comparison; export remains named and checker-visible.
- Replace existing spacing 16/12/8 with SPACING.lg/md/sm respectively. Header/footer gaps use
  SPACING.md/sm; palette and RADIUS.md remain the existing implementation tokens.
- Title may wrap instead of truncating at two lines. Header badges wrap when necessary.
- At viewport below BREAKPOINTS.sm, footer stacks region above actions; otherwise allow row
  wrapping so narrow grid cards still fit. Buttons may wrap; no fixed card width.
- AppButton already supplies role button and a child-text-derived accessible name. No nested
  accessible parent groups the two actions; confirm actual names on web and device.

ConfidenceGaugeReadout:

- scoreTier(score, TIERS.confidence), isExportUnlocked(score) and MetricGauge remain authoritative.
- Fixed threshold copy and mono number render from the copy module and TIERS.
- gap 20 becomes SPACING.xl; gap 8 becomes SPACING.sm.
- Preserve maxWidth 176 as the existing layout constraint; add minWidth 0/flexShrink where needed.
  Numeric geometry is not an undeclared new visual token.
- Scores 39/40/84/85/100 map to failure/pending/pending/verified/verified and locked through 84.

HeroContinueCard:

- Add a discriminated props union under the existing exported HeroContinueCardProps name:
  active branch: variant optional "active-session", projectTitle optional, completionPct number,
  onResume required; inactive branch: variant "no-session", onStartNew required.
- Existing active callers continue to compile. Use nullish fallback to Untitled application.
- Inactive branch shows Next action, Start a new grant application and Start application.
  It renders no ProgressBar and calls only onStartNew.
- Active branch shows Active session, project title, Almost there progress and Continue drafting.
  It calls only onResume. Preserve clamped progress via the existing atom.
- Use existing atoms, primary CTA, theme foreground icon and primitive theme selector.
- Use SPACING.xl padding/gap, SPACING.sm title separation and SPACING.lg progress/action separation.
  This explicitly replaces the old off-scale marginTop 14 rather than minting a spacing token.
- Stack on mobile; at >= BREAKPOINTS.md arrange content/action side by side, allowing content
  shrink and CTA wrapping without a hardcoded 320px action width.
- Use the current RADIUS.md. Token alignment and P-34 glow work remain separately recorded;
  no literal shadow or invented glow is introduced. This MB does not claim full visual parity.

Gallery:

- Keep **DEV** route guard and all existing hook ordering.
- Show confidence boundary values 39/40/84/85/100 with data-driven repetition.
- Show active hero at 42 percent, untitled fallback, and no-session state.
- Keep existing grant fixture and add a deliberately long title/region stress case.
- Existing action-feedback state records details/apply/resume/start distinctly.
- Avoid new product copy in the gallery: fixture descriptions remain clearly developer fixtures.

## DoD, gate prediction and verification

- B-7.4: typed props, token usage, meaningful accessible names, memoization reviewed, existing
  barrel exports intact, gallery entries in both themes.
- B-4.10: exact reference copy table above; compare source literals and rendered accessible text.
- B-7.2: only the five approved source paths change; hash inventory and explicit staged-path proof.
- Gate prediction: FAIL 0 / SKIPPED 0; WARN 66 if only two STORE-WHOLE warnings disappear.
  Gallery already consumes the molecules and useBreakpoint. New copy exports must all be consumed;
  no new DEAD-CODE warning. Plan missing stays 25; baseline remains 79. Explain any measured delta.
- Run unchanged full pnpm gate; red stops the sequence. Two consecutive reds invoke S-1.
- Existing scoring 14/drafts 8/theme 6 suites must remain green. Existing scoring boundary tests
  cover helper semantics; gallery exercises the new display branches. Composer tests belong to MB2.
- After spec approval: format only scoped files, run full gate, inspect formatter output, credential
  scan without printing matches, explicit stage/diff, counted Conventional Commit, named branch
  push, draft PR, independent CI. Owner alone squash-merges. No bypass or baseline suppression.

Owner visual checklist, each in both themes:

1. At widths 320/375/768/1024/1280, card labels fit; long text and badges wrap; each action fires once.
2. Confidence boundaries and 85 unlock agree with the helper; threshold and numbers remain legible.
3. Hero active/fallback/inactive labels match the reference exactly; correct callback, no dead CTA.
4. Verify screen-reader names, keyboard focus order, >=44pt buttons and zero console errors.
5. Existing dashboard/audit/grid consumers still render and the gallery remains dev-only.

No native configuration changes. Device/both-theme evidence is still required for stage closure.
S4 closure additionally needs MB2 composer verification, an owner-designated previous green pack,
regression run, parity-register updates and baseline re-declaration to the measured value.

## Rollback and approval boundary

Base SHA above is the read-only rollback anchor. No tag was minted. Any tag operation is owner-only
and begins with a fresh tag inventory. Rollback uses a corrective feature PR, never main/history edits.
Token alignment (including h1/h2 and letter spacing) remains a separate PR under RUL-AG-04.
Owner approved this specification in chat: "Approve S4-MB1 implementation". B-7.2/7.3 approval is satisfied.
