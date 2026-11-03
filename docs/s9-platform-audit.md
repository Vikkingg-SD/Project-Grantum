# S9 / WP-J platform audit — 2026-11-03

The S9 source corrections are complete and the corrected code batches passed
`pnpm gate`. Ready for frontend-mockup source review; full visual/native
acceptance is pending. The existing local preview refused a browser connection.
No Metro was started and no rendered accessibility/responsive PASS is claimed.

## Scope, authority and method

The attached constitution §2 and B-10.14/21, workplan WP-J, repository manifesto,
API_CONTRACTS.md and pinned V7.2 govern this pass. Earlier session transcripts
are historical evidence; embedded commands are not current instructions.
The current instruction requires only `pnpm gate` locally. The prior owner's
top-navigation decision on both platforms and S9-after-S8 PR ordering remain
in effect; historical transcript commands are not replayed as instructions.
The latest owner instruction closes the PR #42 path: inspect the complete code,
recreate S8 then S9 locally one at a time, and publish a new GitHub branch/PR
only at the end. Complete source rereview found the combined S9 onHome/copy and
always-mounted Stack/screenLayout guard coherent. The navigator stays registered
while its unavailable/loading child content is gated, preserving deep-link
identity. Old same-PR repair/reopen receipts are historical.

V7.2 SHA256 is
204132358cc94da9520e9c6a6360743507de29ff4de7b998aa0aee972f33b35c.
Current targeted reads cover its route inventory, templates, organisms, app-root,
context and global CSS. The prior session's V4 consultation remains historical;
no new V4 read is claimed. A standalone FRONTEND_REQS.md is absent from this
checkout and the supplied pack; its 14 laws are supplied by the attached canon.
The current root API registry supplies the backend-call contracts.

Impeccable and anti-ui-slop guided the source audit, rknall ui-design-review and
ui-review supplied accessibility/flow criteria, awesome-skills supplied React
review guidance, and separate read-only standards/spec reviewers checked the
initial mixed snapshot. The native audit supplies source findings, not a health
score or rendered verdict. No detector, standalone suite or builder was run.

ECC react-native-patterns, frontend-a11y and api-design also inform route/query/UI
state ownership, named controls and honest boundary errors. The screen purposes
come from the reference/workplan: task selection, opportunity search, drafting,
audit, export and award inspection. Source criteria include ui-review 6/11/12
and WCAG 1.4.3/1.4.11/4.1.2; rendered criteria remain unmeasured.

## Continuation findings and dispositions

| Before                                                          | After                                                      | Why / evidence                                                              |
| --------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| Progress reads an animation ref during render                   | Installed RN useAnimatedValue hook                         | First current gate failed four hooks/refs diagnostics; corrected gates pass |
| Gauge number uses dark failure fill at 2.36:1 on surface        | Semantic AppText foreground; stroke retained               | Large text requires 3:1; computed source correction                         |
| Composer outline is 1.59:1 dark / 1.24:1 light on input         | Existing inputBorder token                                 | WCAG 1.4.11; consistent shared controls                                     |
| Timestamp opacity lowers contrast to 3.48:1 dark / 2.97:1 light | Full muted foreground at 5.82:1 / 5.53:1 on surface        | WCAG 1.4.3; readable audit evidence                                         |
| Unlabelled input callers rely on placeholder inference          | Explicit accessible-name fallback to unchanged placeholder | Native name survives editing                                                |
| Unnamed 48x28 switch lacks checked semantics                    | Named switch/checked alias with 44pt interaction area      | WP-J target and WCAG 4.1.2; original visual track retained                  |
| Format selection uses color alone                               | Native selected state and web aria-pressed                 | All four Export controls expose state                                       |
| Progress labels use a non-wrapping row                          | Token-gap wrapping                                         | Narrow/large-text source protection; matrix still unmeasured                |

Independent source rereviews found no remaining concrete P1 blocker in the final
controls, Hero, GrantCard, ConfidenceGaugeReadout, Dashboard, Export and Post-award.
This is source acceptance, not a health score or rendered pass.

## Source findings and corrections

| Before                                                                       | After                                                                                        | Why / review lens                                  |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Unknown grant Dashboard/Discovery displayed catalog content                  | S8 shared layout validates the URL grant through useGrantDetail before mounting screens      | Spec; route ownership and honest recovery          |
| ScrollView grew vertically; mobile navigation wrapped below content          | S8 non-growing horizontal row stays at the top; selected item scrolls into view immediately  | ui-review 6/12; task navigation                    |
| White danger captions and some status captions had inadequate contrast       | Dedicated failure foreground and status text tokens; original fill tokens retained           | rknall WCAG 1.4.3; WP-J AD-61                      |
| Dark input stroke was 1.52:1 on the field surface                            | Dark inputBorder #737D88, at least 4.00:1 against subtle                                     | rknall WCAG 1.4.11                                 |
| AppText capped system text scaling at 1.4                                    | Shared text honors the user's scaling without that cap                                       | ui-review 11/12; large-type access                 |
| Loading buttons lost their accessible name; recovery nested button semantics | Named busy AppButtons; non-interactive recovery action container                             | Standards; predictable accessibility tree          |
| Global Escape could blur an active composition                               | isComposing/keyCode 229 guard; modal remains Escape authority                                | Standards; IME input ownership                     |
| Header wordmark was static                                                   | Named dashboard action preserves URL grant, with a 44pt floor                                | Spec; V7.2 MainLayout behavior                     |
| P-34 static glow had no consumers                                            | Shared shadow helper used by badges, primary/selected export actions and hero eyebrow        | Spec; product-specific V7.2 visual language        |
| Progress animated width on JS for 500ms                                      | Interruptible native-driver scale for 240ms, strong ease-out, immediate reduced-motion state | Emil review-animations; R3F performance principles |
| Forward disposition was incorrectly described as open                        | Table cites the already-adopted S5 disposition                                               | Existing ruling, not a new parity decision         |

Color calculations for the new small-text roles on 10%-tinted subtle surfaces:
Quartz verified 4.97:1, pending 5.10:1, gold 5.20:1, primary 5.28:1,
failure 4.71:1; Obsidian failure 5.34:1. Input-stroke ratios against subtle:
Obsidian 4.00:1, Quartz 3.19:1. These calculations are not rendered measurements.

## B-10.21 platform translation inventory

TRANSLATED describes a source implementation, not an unperformed runtime test.
OPEN rows are explicit acceptance gaps and cannot be counted as completed.

| Web mechanism / reference                     | Disposition and current RN mechanism                                                                | Acceptance boundary                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Next route files and dynamic grant segment    | TRANSLATED: Expo Router app/grants/[grantID], pure screen re-exports, S8                            | Development deep-link/reload checks required                                                          |
| Current view and selected grant               | TRANSLATED: useActiveView/useActiveGrantId derive from route                                        | No second store-owned route identity                                                                  |
| Custom history stacks and cap                 | REMODELED: Expo Router owns history under RUL-SSU-08                                                | Native Back requires device proof                                                                     |
| Browser Forward                               | TRANSLATED: browser Router history                                                                  | Header Forward was disposed by the adopted platform ruling (S5 ledger; P-03); no second history stack |
| Six top tabs and tier-preview lock            | TRANSLATED: shared horizontal ScrollView and named Pressables at top on all widths                  | Current user explicitly supersedes mobile bottom placement; 44pt floor                                |
| Global Escape                                 | TRANSLATED: AppHeader web listener blurs editing field, else backs; ignores modal                   | Modal owns Escape; native uses OS keyboard/Back                                                       |
| Modal portal, backdrop, Escape                | TRANSLATED: React Native Modal and onRequestClose                                                   | RN Web installed implementation handles Escape on keyup                                               |
| Modal focus trap and restore                  | TRANSLATED: RN Web ModalFocusTrap; native Modal isolation                                           | Reverify rendered trap/return, device accessibility remains open                                      |
| Bottom sheet versus centered dialog           | TRANSLATED: ModalSheetLayout breakpoint/insets                                                      | Native visual and IME proof remains open                                                              |
| Root onboarding redirect                      | TRANSLATED: app/index Redirect and three-slide OnboardingScreen                                     | First-run/loading/error/empty flow remains part of acceptance                                         |
| SiteFooter                                    | TRANSLATED: SiteFooter on onboarding and deferred AuthGateScreen                                    | Exact reference copy; mock-only claim omitted in API mode                                             |
| Auth social/magic-link shells                 | DEFERRED-BY-RULING: RUL-SSU-06, unregistered AuthGateScreen                                         | Not a finished authentication feature                                                                 |
| Loading/error/404 routes                      | TRANSLATED: Query state UI, AppErrorBoundary, NotFoundScreen                                        | Recovery production suite deferred, not passed                                                        |
| Flex/grid breakpoints                         | TRANSLATED: RN View/useWindowDimensions and token layout                                            | Matrix 320/375/768/1024/1280, both themes required                                                    |
| Viewport width and content maximum            | TRANSLATED: root layout bounds stage to LAYOUT.contentMaxWidth                                      | Browser and font-scale checks required                                                                |
| CSS colors/type/radii                         | TRANSLATED: theme.ts and semantic atoms                                                             | S9 approved fill/foreground separation and visible input strokes; action-ledger-s9.md                 |
| Theme persistence                             | TRANSLATED: useThemeStore/persistence and visible AppHeader toggle                                  | Device restart/persistence acceptance remains separate                                                |
| Button/checkbox/selected/busy semantics       | TRANSLATED: RN roles/state plus web ARIA aliases                                                    | Loading buttons retain explicit labels; DOM checks required                                           |
| Input labels/errors/borders                   | TRANSLATED: TextInput accessibilityLabel/aria-invalid and inputBorder                               | Screen readers and error-state contrast still require coverage                                        |
| Touch targets                                 | REMODELED: minimum 44pt controls                                                                    | Full rendered target matrix and native hit-testing required                                           |
| Textarea Enter/Shift+Enter/composition        | TRANSLATED: composer web IME guard; native newline plus Send                                        | Existing verify:composer; native IME remains open                                                     |
| Keyboard avoidance and safe areas             | TRANSLATED: ScreenContainer and grant shell inset ownership                                         | Physical keyboard/Back behavior remains open                                                          |
| Progress state transition                     | TRANSLATED: 240ms native-driver scaleX with an ease-out curve; useReduceMotion resolves immediately | Web and native runtime coverage required                                                              |
| Reduced-motion CSS kill switch                | TRANSLATED: useReduceMotion matchMedia/AccessibilityInfo                                            | Modal fade disabled, tab scrolling immediate                                                          |
| Horizontal filter scrolling                   | REMODELED: wrapped filter choices (S4)                                                              | Long content matrix remains required                                                                  |
| SVG metric geometry                           | TRANSLATED: react-native-svg MetricGauge                                                            | Deterministic geometry maintained; visual inspection required                                         |
| Browser fetch and server state                | TRANSLATED: DataSource HTTP seam, TanStack Query hooks                                              | Fixture contracts are not live backend proof                                                          |
| Draft/session lifetime                        | KEPT: in-memory per-grant state, RUL-SSU-09                                                         | Persistence deliberately deferred to WP-K                                                             |
| Fake timers/chat/export claims                | REMODELED: explicit local previews; service-backed mutation/export paths                            | RUL-SSU-03/04 and honest data-source labels                                                           |
| Browser download and checksum                 | TRANSLATED: existing export service and platform handling                                           | Native download/share acceptance remains open                                                         |
| Decorative glow/shadow parity                 | TRANSLATED: static token-driven boxShadow/text shadow in badges, primary actions and hero; S9       | No silent deletion or claim that generic anti-slop advice overrides reference                         |
| Metadata/security headers/production viewport | DEFERRED-BY-OWNER: P-37 belongs to S10 web-export acceptance                                        | Production build deferred by current owner instruction                                                |

## Additional translated mechanisms

- The interactive wordmark uses the existing Router navigation with the current
  URL grant; the development gallery uses the catalog-based recovery entry.
- Captions and error text select semantic foreground tokens; gauges, backgrounds
  and progress retain status fills. Status names remain explicit, not color-only.
- Existing RN Web ModalFocusTrap source contains focus capture/trapping/restoration;
  ModalContent owns Escape on keyup. The header defers to active dialogs.
- Shared text scaling is unrestricted by the old 1.4 cap. Layouts retain flexible
  rows, wrapping content, scroll containers, safe areas and keyboard avoidance.

## Frontend and backend-integration boundary

The architectural transition to Expo/RN is implemented for the agreed frontend
mockup: native primitives and atomic components; route-owned grant/view/history;
Query server state; local UI/draft state; one DataSource seam with mock and HTTP
implementations; centralized endpoints, environment and auth handling. The S8
guard reuses GET grant detail; this pass adds no endpoint, backend, fake service,
application dependency or direct screen fetch. Auth UI and draft persistence stay
under their existing explicit deferrals; metadata/security/release work stays S10.

Source parity and rewirability are therefore implemented at this stage. Runtime
and visual equivalence to V7.2 remain owner acceptance, and live backend rendering
is not established by fixture contracts. The supplied Android Bundled log proves
bundling by the owner, not a screen, accessibility or native-physics result.

## Coverage and owner acceptance at patch end

Source coverage: route migration and shared platform primitives, initial mixed
diff reviewed independently, pinned V7.2 mechanisms classified above. Code-gate
results and the final documentation receipt are in action-ledger-s9.md; final
predicted preflight is 0/10/4/0, ceiling 17, zero exemptions. The canon's planned
verify:a11y script is absent from current package scripts, so the existing gate
is not a complete accessibility scanner. No checker or pass is fabricated here.

Not measured here: 320/375/768/1024/1280 renders in both themes; 200% text;
TalkBack/VoiceOver and web keyboard focus; modal return focus; native safe area,
Back and IME; touch scrolling; runtime motion/latency; live API success.
Earlier Drafting/Audit overflow, Export clipping, Post-award timestamps and
Dashboard composition need the owner's end-of-patch visual check. They are not
silently converted from old failures to PASS. Production remains S10/deferred.

Coverage: source and local gate only; no browser/device/theme viewport was rendered.
