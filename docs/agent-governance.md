# Agent governance and manual workflow

## Owner decisions for this setup

- Scope: `C:\grantum-rn` and documents the owner explicitly attaches or names.
- The owner supplies the constitution, full workplan, and ruling/decision ledger as attachments.
  Do not discover them by searching other folders or connecting a document account.
- Git commands and feature-branch work are allowed. Only the owner may squash-merge into GitHub.
  Do not merge PRs, enable auto-merge, enter a merge queue, push directly to protected branches,
  or bypass hooks, review, or the strict gate.
- Manual checks only; no scheduled automation, background repair, or watcher.
- Existing controls remain authoritative. The agent must explain a conflict and obtain an explicit
  owner decision before departing from them.

This document is a navigation and operating aid. It does not replace or ratify the constitution,
workplan, ledger, design manifesto, API contract, or existing rulings.

## Governing sources

| Source                                                            | Authority / use                                                   | Availability at review                                        |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| Owner-attached constitution                                       | Project laws and exception process                                | Not supplied in this chat                                     |
| Owner-attached full workplan                                      | Current stage, work packages, acceptance criteria                 | Not supplied in this chat                                     |
| Owner-attached decision/ruling ledger                             | Approved exceptions, dependencies, stage decisions                | Not supplied in this chat                                     |
| `AGENTS.md`                                                       | Persistent agent boundaries and startup instructions              | Updated for the owner's current boundaries                    |
| `DESIGN_MANIFESTO.md`                                             | Ratified design, token parity, atomic composition                 | Read                                                          |
| `API_CONTRACTS.md`                                                | Flask/PostgreSQL endpoint contracts                               | Read                                                          |
| `docs/plan-manifest.json`                                         | Planned file inventory, not stage authorization                   | Read; 96 paths, 25 absent                                     |
| `docs/parity-register.md`                                         | 40 behavior/parity rows, referenced rulings and stage assignments | Read                                                          |
| `docs/gate-manifest.json`                                         | Required/warning/info checks and closure cadence                  | Read                                                          |
| `docs/gate-baseline.json`                                         | Warning ratchet; currently 79, stage S3-MB7                       | Read; do not raise without ruling                             |
| `docs/exemptions.json`                                            | Three path-specific PLACEHOLDER exemptions                        | Read; expiry 2027-01-31                                       |
| `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`           | Scripts, dependency versions, build allowances                    | Manifest/scripts reviewed; lockfile retained                  |
| `.eslintrc.js`, `.prettierrc`, `.prettierignore`, `tsconfig.json` | Lint, format, strict type configuration                           | Read                                                          |
| `lint-staged.config.js`, `commitlint.config.js`, `.husky/*`       | Staged checks, commit format, push guard                          | Inspect before any relevant work; agent does not invoke hooks |
| `scripts/grantum-preflight.mjs`, `scripts/verify-*.ts`            | Gate implementation and behavioral verifiers                      | Read                                                          |
| `.github/workflows/gate.yml`                                      | CI strict gate on PRs/pushes to main                              | Read; no CI result claimed                                    |
| Named previous green Repomix packs                                | Closure export regression and parity references                   | Named in parity register; not present here                    |

Record an attachment's exact title, revision, and relevant clauses when it arrives. Do not invent
missing sections or treat existing ruling identifiers as permission to issue new rulings.
If an attachment is unavailable after compaction or in another chat, request it again before
dependent work. Keep the original source available; a summary alone cannot authorize an exception.

## Project map at the 2026-10-26 review

| Area                  | Observed structure and responsibility                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `app/`                | 11 TSX route/layout files: root layout, six tabs plus tab layout, onboarding, 404, dev gallery |
| `src/components/`     | 27 files across atoms, molecules, organisms, templates; reusable UI assembly                   |
| `src/screens/`        | Planned, absent; several screens are still implemented inside routes                           |
| `src/api/`            | Query client, DataSource selector, four hooks; HTTP implementation is pending                  |
| `src/mock/`           | Five files holding fixture grants/dashboard/seeds, in-memory DB and mock adapter               |
| `src/store/`          | Five files for UI, auth, drafts, theme and theme persistence projection                        |
| `src/config/`         | Six files: environment, constants, theme, layout, fonts, export formats                        |
| `src/types/`          | Four files: grant, API, theme, chat contracts                                                  |
| `src/hooks/`          | Five files: barrel, app readiness, breakpoint, reduced motion, theme                           |
| `src/utils/`          | Five files: scoring, filtering, formatting, IDs, platform shadow                               |
| `scripts/`            | Preflight plus scoring, drafts and theme verifiers                                             |
| `docs/`               | Five original plan/gate/parity/exemption files                                                 |
| `.github/`, `.husky/` | CI gate and three hooks                                                                        |
| `assets/`             | Six app/splash/favicon/platform images                                                         |
| Generated/installed   | `.expo/`, `node_modules/`, local ignored Repomix pack; not governing sources                   |

The installed manifest targets Expo 57, React Native 0.86.3, React 19.2.3, TypeScript ~6.0.3,
ESLint 8.57.0 and pnpm 12.10.1. Re-read the manifest before each API/tooling task.
No Flask implementation or generated native projects were found in this checkout.

The DataSource selector explicitly throws when API mode is requested; current runtime data is mock.
The 25 missing planned files include HTTP client/hooks, navigation helpers, screen extraction, and
some templates. These are recorded gaps, not authorization to build them.

## Concrete control conflicts

1. **Missing doctrine:** the full constitution, workplan and ledger have not been attached here.
   This explicitly requested governance setup is authorized, but implementation requiring those
   sources must wait. The owner will provide attachments rather than grant broad document access.
2. **Gate side effects:** preflight invokes branch, fetch, upstream-history and tracked-file Git
   commands. `pnpm gate` also runs repository-wide `pnpm format`. These are existing controls.
   Run them on a feature branch with appropriate permissions and inspect resulting changes.
3. **Closure baseline:** neither named green pack is available and `config.grantum.prevPack` is
   unset. The preflight prints an informational closure-cadence notice in that case. A routine
   gate result therefore does not establish closure export-regression coverage.
4. **Theme evidence:** the manifesto specifies display 32/38 and radius-lg 16, while current
   `theme.ts` has display 30/36 and no `RADIUS.lg`. Record this mismatch for an owner ruling.
   `verify:theme` tests persistence behavior, not manifesto token parity; its pass does not
   resolve the mismatch.

This setup changes only the agent instructions, this operating map, and project-local Codex
configuration/rules. Existing application files, dependencies, baselines, exemptions and quality
controls remain outside the setup's edit scope.

## Manual task procedure

1. Read root `AGENTS.md`, this map, and the exact attached governing sections needed for the task.
   Name the active workplan stage and acceptance criteria from evidence. If missing, stop the
   dependent part and state precisely which source is needed.
2. Inspect Git status, preserve unrelated changes, and create or use a feature branch.
   State the bounded objective, allowed files, relevant rules, and verification before edits.
3. Read the current files and their immediate dependencies. Use Repomix searches or narrow packs
   only when helpful; do not repeatedly load the full project into context.
4. Make small, context-checked patches, preserve unrelated edits, and keep logic in the established
   layers. A failing check does not authorize altering the checker.
5. Run relevant existing non-mutating checks. Inspect the current script definitions first.
   Capture the command, exit code, scope, and actual output. Do not install or update dependencies
   to make verification easier without the required ruling.
6. Run the existing full strict gate before review readiness; inspect its formatting effects.
   Report changes with source references and distinguish PASS, FAILED, BLOCKED and NOT RUN.
   Prepare feature commits/PRs when needed. Only the owner may squash-merge into GitHub.
7. At a context handoff, retain the objective, approved file scope, source titles/revisions/clauses,
   touched files, actual check results and pending questions. Revalidate against disk on resume.
   Never promote a summary or an old pack into a governing source.

Existing non-mutating check commands:

```powershell
pnpm typecheck
pnpm lint
pnpm format:check
pnpm verify:scoring
pnpm verify:drafts
pnpm verify:theme
```

The initial review ran all six successfully: 14 scoring cases, 8 draft cases, 6 theme cases.
These results cover the original checkout, not future edits. Run `pnpm gate` after applying this
setup and record the current result in the handoff; never inherit a prior green result.

There is intentionally no new scheduled automation, hook replacement, package script, or modified
gate. The owner selected manual checks only.

## MCP connection and access

The project `.codex/config.toml` launches Repomix 1.18.1 through pnpm with
`--mcp --sandbox C:\grantum-rn`. It pins the root and allows only:

- `pack_codebase`
- `read_repomix_output`
- `grep_repomix_output`
- `file_system_read_file`
- `file_system_read_directory`

No account connection, GitHub token, document connector, or backend credential is needed.
The owner will supply doctrine attachments. Public Expo documentation can be consulted directly;
code does not need to be sent to a documentation service.

The launcher path in the config is specific to this Windows host. Its explicit `PATHEXT` allows
pnpm to resolve the Repomix command when the MCP host filters environment variables. Repomix is a temporary pnpm tool;
it is not added to the app's `package.json` or lockfile. The app's scripts honor pnpm 12.10.1;
the installed pnpm launcher reports 12.8.1 for the isolated `dlx` process.

Repomix 1.18.1's sandbox code disables Git change sorting, skips local/global Repomix config
execution, and leaves Git logs/diffs disabled. Only sandbox mode is approved here. Re-audit these
properties before upgrading the pinned tool. Packs are derived context and can become stale;
use live files before editing. Generated packs remain untracked.

Suggested narrow packaging arguments (relative to the fixed root):

```json
{
  "directory": ".",
  "includePatterns": "AGENTS.md,docs/**,src/api/**,src/types/api.ts",
  "ignorePatterns": "**/.env*,**/*.pem,**/*.key,**/.git/**,**/.codex/**,**/.agents/**,**/.aws/**,**/node_modules/**,**/.expo/**,repomix-output*.xml"
}
```

Pick include patterns for the actual task. The raw file tools can read files within the workspace;
Secretlint is a heuristic and does not guarantee detection of every secret. Do not request secrets.
Sandbox mode bounds Repomix paths and tool availability; it is not an OS sandbox for the rest of Codex.

## Enforcement and activation

The project defaults make local commands read-only and require the sandboxed Repomix server to
initialize. `.codex/rules/grantum.rules` rejects matched PR-merge, direct-main-push, hook-bypass,
npm-install and Expo-linter-scaffolding commands, and prompts for matched force-push requests.
Ordinary feature-branch Git commands and the existing gate remain permitted.

`AGENTS.md` is persistent behavioral guidance, not a security boundary. Command prefix rules apply
to matching requests outside the sandbox and cannot prove what every arbitrary shell/script/library
will do. MCP, browser, connectors and approved escalations have separate controls. Never claim the
setup makes violations impossible. For stronger tamper resistance, the owner/admin must enforce
command and filesystem restrictions outside agent-editable files.

The proposal keeps the supported legacy `sandbox_mode` setting because this host currently uses
that configuration family. A custom permissions profile must not be advertised as active while
legacy sandbox settings override it. Migrating host-wide permissions is a separate owner decision.

The setup is on `codex/agent-governance`. The `.codex` directory is protected by the workspace
sandbox; its two reviewed files were installed through a scoped approval. Restart the project's
Codex session to load its instruction/config/rules
layer, then confirm the MCP server and tools in the app. A configuration listing is not proof
that the current chat has loaded the server. Use a live tool call to verify that last step.

## Setup verification on 2026-10-26

- The unchanged `pnpm gate` passed: 0 failures, 68 warnings, 3 informational findings, 0 skipped
  checks, and 3 existing exemptions. The 68 warnings are below the existing baseline of 79;
  no warning baseline or exemption was changed. Closure export regression still needs its named pack.
- Typecheck, zero-warning ESLint, format check, all 14 scoring cases, 8 draft cases and 6 theme cases
  passed. The gate's formatter changed only this new document; existing application files were unchanged.
- The Codex CLI resolved `grantum_repomix` from the trusted project's installed configuration,
  including the fixed workspace, pinned version, explicit `PATHEXT`, and five-tool allowlist.
- A temporary MCP client initialized Repomix 1.18.1 and exercised all five tools. Relative reads,
  a 90-file scoped pack, bounded output reads and searches succeeded. Parent traversal, absolute
  drive paths and home paths were rejected; remote packing/skill-generation tools were absent.
- Command-rule checks returned the expected decisions for owner-only merge, protected pushes,
  hook bypass, linter scaffolding, force-push approval, and permitted feature Git/gate commands.
  These were policy-evaluation tests, not executions of the prohibited commands.
- Repository-wide SHA-256 comparison against the pre-edit inventory found only four intended
  changes: `AGENTS.md`, this map, `.codex/config.toml` and `.codex/rules/grantum.rules`.

The app's current tool catalog has not yet reloaded the new server. Native in-chat MCP activation
and attachment review remain to be verified. No scheduled automation was created.

## Documentation consulted

- [Codex project instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [Codex command rules](https://learn.chatgpt.com/docs/agent-configuration/rules)
- [Codex permission scope](https://learn.chatgpt.com/docs/permissions)
- [Repomix sandbox MCP](https://repomix.com/guide/mcp-server)

Documentation and cached Repomix source were reviewed on 2026-10-26. The live manifest,
owner attachments, and actual tool behavior remain the evidence to use on a later task.
