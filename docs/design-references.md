# Project-local design tools and experience references

Inventory verified on 2026-11-03. The project root contains 87 discoverable
skill directories under `.agents/skills` and source/documentation references
under `.agents/references`. This includes all 16 Emil Kowalski skills, 62
project-relevant ECC skills, the requested design/review skills and a local
copy of the bundled skill-creator.

These are installed agent tools and reference sources, not Grantum runtime
dependencies. The installation changes no application package dependency or
pnpm lockfile. `.agents/` is excluded from Git by the existing local
`.git/info/exclude` and from Prettier by the existing owner-approved vendor
boundary. The local installation therefore remains on this machine; this
tracked document records its sources and selection for another checkout.
Newly installed skills become discoverable on the next agent turn/reload;
relevant written guidance was read directly during this session.

The machine-readable local inventory is `.agents/install-manifest.json`.
It records the installed ECC names, the other source-only ECC names, source
revisions and installation boundaries. No upstream hooks, learning daemon,
scheduled jobs, MCP connection, telemetry service or autonomous loop was
activated. Imported recipes do not override the owner's request or the
repository's governing documents. Validation in this session remains only
`pnpm gate`; installation does not authorize extra tests or a production build.

## Sources and installed paths

| Source                                                                                  | Installed or inspected revision                                                                                                 | Local paths and use                                                                                                                                                     |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Impeccable](https://github.com/pbakaus/impeccable)                                     | Installed skill 4.8.0; upstream inspected at `9fadc41729c38fd47d7ae622b501558653f9d2e9`                                         | `.agents/skills/impeccable`; written native audit, Operate guidance and craft floor                                                                                     |
| [rknall claude-skills](https://github.com/rknall/claude-skills)                         | `ca7fbd0e07f824b119030f323da3409bc779f9bc`                                                                                      | Full ten-skill source under `.agents/references/rknall-claude-skills`; discoverable ui-design-review, svg-logo-designer, python-architecture-review and secrets-manager |
| [UIZZE anti-ui-slop](https://github.com/uizze/uizze/tree/main/skills/anti-ui-slop)      | Installed 1.3.1; upstream inspected at `fc401e9e654cbafe427b0c98142fc8bccd0c4e7e`                                               | `.agents/skills/anti-ui-slop`; incumbent product language, explicit reachable states and honest finish evidence                                                         |
| [Liquid Logo](https://github.com/collidingScopes/liquid-logo)                           | `c733c38a043009b873cb9a6062c0defa9c70ee7d`                                                                                      | `.agents/references/liquid-logo`; silhouette, aspect ratio and material treatment reference                                                                             |
| [React Three Fiber](https://github.com/pmndrs/react-three-fiber)                        | `d74622ea8ed717f7212d7e19d65ff3e325508389`                                                                                      | `.agents/references/react-three-fiber`; README plus scaling-performance and pitfalls documentation                                                                      |
| [awesome-skills code-review-skill](https://github.com/awesome-skills/code-review-skill) | `4850184dfd7765ea7b3c5c4e9b6cf8e0815ee7cb`                                                                                      | `.agents/skills/code-review-skill`; React/TypeScript, architecture, performance, security and reuse review                                                              |
| [Emil Kowalski skills](https://github.com/emilkowalski/skills)                          | `f1090bec277140d02ed202440185ad9d02ac1490`                                                                                      | All 16 skill directories under `.agents/skills`; deliberate motion, immediate frequent actions and restrained operator UI                                               |
| [ECC](https://github.com/affaan-m/ECC)                                                  | Requested `affaan-m/ecc` resolves to `affaan-m/ECC`; pinned `b38be6a7f6350964d59328b52f0624e1d1d552d1`                          | 62 selected skills under `.agents/skills`; full root skills, agents and rules source under `.agents/references/ecc`                                                     |
| [ShaderGradient](https://github.com/ruucm/shadergradient)                               | `68bdd740037a11c639f8b91fd775949c71d718d0`                                                                                      | `.agents/references/shadergradient`; README and packages source for bounded decorative rendering and visibility lifecycle reference                                     |
| skill-creator                                                                           | Bundled host source copied unchanged; entrypoint SHA256 `cccd291077ec57c6f50ca6529f0f3fb93212da09473effb2fcec808e81b21288`      | `.agents/skills/skill-creator`; source `C:/Users/Vikking/.codex/skills/.system/skill-creator`; scoped instructions and progressive disclosure                           |
| [ui-review](https://github.com/arla6ka/skills/tree/main/skills/ui-review)               | Existing host installation copied locally; entrypoint SHA256 `ace7e5456bc4b60146183b1b888d331d4d1ebe465e3bcaa6b69343fc6f2a9775` | `.agents/skills/ui-review`; review criteria and separation of source findings from rendered evidence                                                                    |

Impeccable and UIZZE retain earlier local formatting changes in Markdown and
YAML quote style. Their versions and guidance were inspected against upstream;
no claim of byte-identical upstream entrypoints is made. Existing installed
revisions were retained rather than reinstalled without need.

Emil's complete installed inventory is animate, animate-expo,
animation-performance, animation-vocabulary, apple-design, ask-sonner, break-ui,
emil-design-eng, find-animation-opportunities, improve-animations, mobile-native,
pick-ui-library, prototype, remove-animations, review-animations and write-swift.
Installing them does not invoke an unrelated platform or destructive workflow.

The code-review skill was an incomplete root-only sparse Git checkout despite
the earlier record calling it installed through skill-installer. This session
expanded that existing checkout to `reference/`, `assets/` and `scripts/` at
the unchanged pinned revision. In particular, `reference/react.md` and
`reference/typescript.md` now exist, along with the cross-cutting guides they
reference. No upstream script was executed. Pre-existing formatter changes to
its root Markdown/HTML were preserved.

## Complete ECC selection

The 62 selected skills cover this Expo frontend, the API adapter boundary,
review/governance work and the planned Flask/PostgreSQL handoff. They were
installed with the standard skill-installer into the project destination at
the pinned ECC commit; both installation batches completed successfully.

| Area                                          | Installed skill directories                                                                                                                                                                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI, accessibility and framework patterns (10) | accessibility, design-system, frontend-a11y, frontend-design-direction, frontend-patterns, make-interfaces-feel-better, react-native-patterns, react-patterns, react-performance, typescript-patterns                       |
| API contracts, boundaries and failures (6)    | api-connector-builder, api-design, contract-first, error-handling, hexagonal-architecture, security-review                                                                                                                  |
| Verification and acceptance references (10)   | browser-qa, click-path-audit, e2e-testing, module-regression, production-audit, react-testing, tdd-workflow, test-collaboration, ui-demo, verification-loop                                                                 |
| Scope and module planning (5)                 | change-impact, intent-driven-development, module-governance, plan-orchestrate, product-capability                                                                                                                           |
| Documentation and context continuity (10)     | architecture-decision-records, brownfield-retrospective, codebase-onboarding, context-and-decisions, context-budget, docs-governance, documentation-lookup, inherit-legacy-style, living-docs-governance, strategic-compact |
| Code and Git review (5)                       | coding-standards, conventional-commit-review, git-workflow, github-ops, issue-review                                                                                                                                        |
| Research and context retrieval (2)            | iterative-retrieval, search-first                                                                                                                                                                                           |
| Skill and agent coordination (8)              | agentic-engineering, ecc-guide, mcp-dependency-review, parallel-execution-optimizer, skill-host-compat, skill-stocktake, team-agent-orchestration, workspace-surface-audit                                                  |
| Future backend and release references (5)     | database-migrations, deployment-patterns, postgres-patterns, python-patterns, python-testing                                                                                                                                |
| Copy localization reference (1)               | i18n-sync                                                                                                                                                                                                                   |

Testing, release and backend skills are available for their applicable future
stages. Their installation does not activate their sample commands in S9:
TDD coverage targets, separate browser suites and the verification-loop build
recipe do not supersede the owner's only-`pnpm gate` instruction. Python and
PostgreSQL references do not authorize building a backend in this frontend
checkout. Likewise, contract-first guidance does not replace or silently amend
the existing `API_CONTRACTS.md` authority.

ECC currently has 314 distinct skills in its root `skills/` catalog. The other
252 are retained under `.agents/references/ecc/skills` for inspection rather
than copied into active skill discovery. The exact source-only names are in
`.agents/install-manifest.json`. Exclusion categories are:

- Other application stacks and runtimes, including Angular, Vue, Flutter,
  Kotlin/Compose, SwiftUI, C/C++, Rust, JVM/.NET, Laravel, Rails, Django,
  FastAPI, Next.js/Turbopack and Bun; they are not this Expo/Flask target.
- AI/ML production systems, trading, blockchain, agent payment/runtime
  platforms, continuous-learning hooks, autonomous loops and fleet operations;
  the product is an API-ready frontend mockup with manual execution controls.
- Marketing, investor outreach, publishing, video/audio creation and unrelated
  business domains such as healthcare, logistics, procurement and network
  administration; these are outside the authorized project work.
- Alternative orchestration, monitoring, memory and governance frameworks
  whose activation would duplicate the existing workplan, owner-controlled
  gates or host tooling. Their source remains available without activating
  their setup scripts, hooks or services.

This selection avoids duplicate translated/host-specific copies of the same
upstream skill. The full source catalog is retained, so a later stage can
install an additional applicable skill without guessing what ECC contained.

## Design techniques consulted for S9

The relevant written Impeccable native audit, UIZZE Operate, Emil design/motion,
ECC React Native/accessibility/design-direction, Liquid Logo, R3F and
ShaderGradient sources were read. Their applicable principles are:

- Keep the existing Grantum product identity and tokens. The operator surface
  must make the current task, status and next action easy to scan; decorative
  treatments should carry a specific brand role.
- Use clear labels, readable fill/foreground combinations, explicit loading,
  error, empty, selected and recovery states, usable hit areas, text scaling,
  stable wrapping and focus ownership.
- Keep route files thin and route identity in Expo Router, server data in
  TanStack Query and client state in focused stores. Validate external values
  at the existing boundary and clean up native subscriptions. Example packages
  in imported skills are not new dependency requirements.
- Apply motion only when it clarifies state or feedback. Frequent keyboard
  actions remain immediate; transitions should be short, interruptible and
  reduced-motion aware. Emil's animate-expo recipe prefers Reanimated and
  release-device proof; the current approved dependency set uses core Animated
  for the non-gesture progress transition, so literal recipe compliance and
  release-device feel are not claimed.
- Liquid Logo preserves source aspect ratio and confines material treatment
  to the logo contour; its animation loop has cancellation. This is a brand
  material reference, not an RN navigation library.
- R3F favors demand rendering, shared resources and frame updates outside
  React state. ShaderGradient exposes an animation switch, a pixel-density
  budget and visibility-controlled canvas lifetime. These favor restrained
  static brand depth here. ShaderGradient's inspected canvas uses DOM and
  IntersectionObserver, so it is not imported into shared native UI.

No Three.js, R3F, ShaderGradient, Reanimated or WebGL runtime dependency was
added to Grantum merely to demonstrate installation. The libraries are
installed locally as reference sources. No continuous renderer was added.

## Execution and evidence boundary

This session used written native/source audit guidance. The Impeccable context
launcher and detector were not run in this session. The earlier action ledger's
context invocation and installer attempt are historical records only.

Historically, `npx impeccable install --providers=codex --scope=project` timed
out while downloading its release. A supported manual copy of the installed
official skill completed that installation. No detector hook was installed;
the failed installer is not described as successful.

The previous record also describes separate read-only Standards and Spec
reviewers from an existing two-axis review skill. That is prior-session
evidence, not a claim that a renderer, native device or imported tool ran now.
Neither source inspection nor installed skills establish a viewport, hardware,
screen-reader, interaction-latency or production-build PASS. Actual gate and
acceptance results belong in the S9 action ledger and platform audit.

To reproduce skill installation, use the standard skill-installer with the
listed repository revision, upstream skill path and a project
`.agents/skills` destination. For ECC the source path is `skills/<name>`;
for rknall it is `<name>`. Copy the bundled skill-creator and existing host
ui-review when available. Preserve source licenses and notices. Reference
libraries use sparse Git checkouts only; do not run their package install,
build or dev commands as Grantum validation.
