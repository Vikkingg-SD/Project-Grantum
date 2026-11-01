# Manual MCP verification

Authority: approved revised T specification in `s5-control-spec.md`; owner answer on 2026-11-01,
"Approve the Node verifier". The script uses Node built-ins and adds no application dependency.
It replaces the unimplemented Python proposal, not the project's MCP access boundaries.

## Commands and coverage

Run from this checkout on the configured Windows host using the existing Node runtime:

```powershell
node --test scripts/verify-mcp.test.mjs
node scripts/verify-mcp.mjs
node scripts/verify-mcp.mjs --live
pnpm gate
```

These are separate checks. The twenty-group test file explicitly lints both new mjs files with
the existing ESLint rules and rejects any warning/error. Expo's installed TypeScript parser is
selected explicitly for mjs, with plugins resolved from the existing Expo config. No rule is disabled,
warning allowance increased, linter config created or dependency installed. The gate separately
runs the existing application suites and the registered 24-case preflight verifier. This batch
does not add the host-specific MCP checks to the mandatory gate or claim they run in GitHub CI.

Static mode checks the actual `.codex/config.toml`, derives the checkout from the script path and
verifies the exact tables/keys, executable/cwd, pinned argument order, fixed root, five unique tools,
required/enabled flags, permission defaults, timeouts and PATHEXT. It reads only the configuration,
its own source and the two explicitly selected source files for hashes. It starts no child process
and writes no file. The supported TOML subset is intentionally limited; unsupported syntax fails
instead of being ignored. Importing the module does not run the CLI or create a process.

Live mode explicitly launches the configured pnpm executable with `dlx repomix@1.18.1 --mcp
--sandbox <this checkout>`. That command may fetch the pinned tool into pnpm's cache. It does not
alter the application's package manifest or lockfile. The runner inherits the host environment;
it validates the configured PATHEXT value without inspecting or printing host environment values.
This does not prove that a separate native MCP host applied that environment entry.

## Live acceptance

One stdio process must complete all of the following before PASS:

1. Initialize as Repomix MCP 1.18.1 and send the initialized notification.
2. Follow discovery pagination; reject repeated cursors, extra/missing/duplicate tools or absent
   read-only annotations. The tool list is exactly pack_codebase, read_repomix_output,
   grep_repomix_output, file_system_read_file and file_system_read_directory.
3. Read `src/types/grant.ts`, list `src/components/templates`, pack exactly that type file and
   `ScreenContainer.tsx`, read eight output lines, and find ScreenContainerProps in the same pack.
4. Reject parent traversal, an absolute drive path and a home path with explicit workspace-relative
   boundary diagnostics. File-not-found, generic isError, timeout and protocol failures are not proof.
5. Confirm shutdown, including after failure. If graceful shutdown stalls, cleanup targets only
   the process created by this invocation (Windows: its owned PID tree); failure to confirm exit fails.

Stdout contains metadata, PASS states and SHA-256 hashes, not repository payloads. Failure diagnostics
are bounded. The source hash must be unchanged before/after verification. The unit fixtures exercise
the actual parser, validator, classifier, protocol sequence and stdio transport, including fragmented
messages, timeout, malformed protocol and injected normal/forced shutdown. They make no real network calls.
Forced Windows cleanup is fixture-tested; the observed real smoke exited gracefully.

## Recorded proof — 2026-11-01

Node 24.21.0; project pnpm 12.10.1; isolated configured launcher 12.8.1; server 1.18.1.
Static validation PASS. Twenty fixture groups PASS, zero failures/skips, including explicit lint.
One real protocol process passed the five positive calls and three confinement probes.
The output ID and current source/config/script hashes are retained in the session evidence.

Verifier SHA-256:
`b5bcd414c175cfe1dcd769b213fc5865ac35be8d4a98512747395e5e8fa225cf`.
Any script/config/source change invalidates the corresponding recorded hashes; run the appropriate
checks for the changed source. A hash records identity; it is not an additional tamper-proof boundary.

Native tool-catalog attachment remains NOT ATTACHED in this projectless chat. The live standalone
protocol proof is current; it does not make the five tools appear in the app catalog or constitute
S5 product/native-device acceptance. Re-prove protocol access after a reset before dependent work.
