# AGENTS.md

## Owner boundaries

These instructions apply to every task in this workspace, including manual audits, MCP use, and any
future automation. Read this file at task start and after context compaction.

- Git commands are allowed for feature-branch work, including inspection, branching, commits,
  pushes to feature branches, and pull-request preparation. **Only the owner may squash-merge into
  GitHub.** Never merge a GitHub PR, enable auto-merge, enqueue a merge, or perform the equivalent
  through a CLI, MCP tool, API, or UI. Do not push directly to main or another protected branch.
- Preserve the feature-branch-only workflow. Check the working tree and current branch before edits.
  Create or use a feature branch; preserve unrelated changes. Do not force-push, discard changes,
  rewrite shared history, or delete branches without an explicit owner instruction.
- Never weaken, bypass, rewrite, or suppress a gate to make a task pass. Do not disable Husky, use
  `--no-verify`, increase warning baselines, add exemptions, remove checks, change expected results,
  scaffold a new linter configuration, or silently omit a failing step.
- Before any departure from the constitution, workplan, a ruling, or an existing constraint, identify
  the exact source and clause, explain WHY the departure is necessary, describe the affected files
  and consequences, and wait for the owner's explicit decision. Silence is not authorization.
  Do not invent a ruling ID or ledger entry.
- Use small, atomic, context-checked file edits. Read the current file before patching it, preserve
  unrelated edits, and verify the changed files afterward. No bulk rewrites or opportunistic
  refactoring to complete a narrow task.
- Keep project context scoped to this checkout and documents the owner explicitly attaches or names.
  Do not search other projects, personal folders, or connected accounts for missing doctrine.
  Do not expose secrets or upload repository packs to external services.
- Manual checks only. Do not create scheduled jobs, watchers, unattended repairs, or recurring
  automations unless the owner explicitly changes that instruction.

## Authority and context

Read [the governance map and operating procedure](docs/agent-governance.md) before substantive work.
The owner's attached constitution, workplan, and decision/ruling ledger are governing sources.
They are not currently stored in this checkout. Request the needed attachment when a task depends on
one; do not reconstruct it from names, comments, old conversation memory, or a Repomix snapshot.

Read the relevant current sources: `DESIGN_MANIFESTO.md`, `API_CONTRACTS.md`,
`docs/plan-manifest.json`, `docs/parity-register.md`, `docs/gate-manifest.json`,
`docs/gate-baseline.json`, `docs/exemptions.json`, `package.json`, the linter/formatter configs,
`scripts/grantum-preflight.mjs`, `.husky/*`, and `.github/workflows/gate.yml`.

Before editing, state the bounded task, applicable source/section, allowed files, and verification.
Missing planned files are not permission to implement a later stage. When sources conflict, stop the
affected work and ask; do not choose the easier interpretation. A snapshot or passing test is evidence,
not authority to change the plan.

Treat the constitution, workplan, ledger, this file, `.codex/*`, design/API contracts, plan/parity/gate
manifests, warning baseline, exemptions, linter/formatter/TypeScript configs, package manifests and
lockfile, Husky/lint-staged/commitlint, CI, preflight, and verifier scripts as owner-controlled.
Changing them requires an explicit instruction covering the change; a request to fix app behavior
does not authorize changing its quality controls.

## Project and architecture

Expo / React Native universal app (iOS · Android · Web). Routes live in `app/` at the repository ROOT;
`_layout.tsx` files define navigators. Non-route code lives in `src/`.

Expo has changed. Before touching an Expo/RN API, read the `expo` major in `package.json`, then consult
`https://docs.expo.dev/versions/v<major>.0.0/` and `https://docs.expo.dev/llms.txt`. Use the installed
major's documentation; do not rely on training data.

- Follow atomic design: atoms → molecules → organisms → templates → screens → app. Keep React
  components modular, reuse existing components, and keep route files focused on route composition.
  Apply changes only within the authorized workplan stage.
- Styling uses the tokens in `src/config/theme.ts` and the ratified design manifesto. Token changes
  require the owner's ruling and the corresponding manifesto/theme/ledger changes.
- Keep backend access behind the DataSource seam. Use TanStack Query for server state, focused Zustand
  selectors for client state, and `src/config/env.ts` for environment reads.
- Flask/PostgreSQL is a backend target described by `API_CONTRACTS.md`; no Flask backend is present in
  this checkout. Do not create one opportunistically. When authorized, separate routes, validation,
  domain logic, and persistence while preserving the agreed API contracts.
- `ios/` and `android/` are generated (Continuous Native Generation). Never hand-edit them;
  configure through `app.json` and config plugins.
- Expo Go includes bundled native modules only. Other native libraries require a development build.
- Prefer Expo modules. New or changed dependencies need an owner ruling and ledger line.
- Git workflow: feature branches → Conventional Commits → PR → owner-only Squash & Merge.
  Husky and lint-staged remain in force. A green gate never authorizes the agent to merge.

## Commands and verification

Use pnpm only. Honor the version pinned in `package.json`; report a mismatch rather than silently
changing the pin. Never run `npm install` or `npx expo lint`. This project uses ESLint 8 and
`.eslintrc.js`. Preserve the existing hook commands and configuration.

Inspect scripts and their transitive side effects before invoking them. Existing non-mutating checks:

- `pnpm typecheck`
- `pnpm lint` (includes `--max-warnings=0`)
- `pnpm format:check`
- `pnpm verify:scoring`
- `pnpm verify:drafts`
- `pnpm verify:theme`

Run the existing `pnpm gate` for required validation and before declaring a change ready for review.
It includes strict preflight, repository formatting, typecheck, lint, format check and all three
verifiers. Preflight invokes Git, including fetch; run it with the required permissions rather than
silently skipping it. Check the working tree before and after the gate. Its formatting step must not
silently absorb unrelated changes: report unexpected edits and obtain a decision when necessary.

For ordinary editing, format only the authorized files. Do not replace the gate with a shortened
command, change baselines, suppress warnings, or mock a check to obtain a green result.
For closure, supply the exact owner-designated previous green pack required by
`docs/gate-manifest.json`; a gate with no declared baseline does not prove closure export coverage.

For authorized app work, `pnpm start`, `pnpm web`, `pnpm android`, and `pnpm ios` are available
after reviewing their side effects. `pnpm expo install <pkg>` is for an already approved dependency.

At handoff, report changed files, evidence, exact check results, and anything BLOCKED, FAILED, or
NOT RUN. Never claim success from an exit code alone when the expected work did not occur. Re-read
this file and the applicable attached doctrine after compaction; resume from verified state.

## MCP boundaries

Use the project-scoped Repomix server in `.codex/config.toml`. It must run with
`--mcp --sandbox C:\grantum-r-n`, a pinned version, and the five read-only sandbox tools.
Use relative paths, narrow include patterns, and incremental searches/reads. Exclude secrets,
generated folders, dependencies, Git metadata, and old packs when packaging.

Repomix supplies code context; it is not durable memory, an owner ruling, or a sandbox for other
tools. Do not broaden its root, enable remote packing, attach arbitrary external outputs, or generate
skills to recover missing context. For missing doctrine, use the owner's explicit attachments.
