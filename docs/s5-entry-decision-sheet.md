# S5 entry: review and execution decisions

Date: 2026-10-29. Status: DRAFT FOR OWNER REVIEW; not a new ruling or stage closure.

## Requested delivery and verified starting state

The owner requested delivery of the recommended S5 entry work, prioritizing production validity,
minimal hardcoding, and easy switching from mocks to real URLs and cycles within the constitution,
workplan and V8 overview. This authorizes preparing the concrete delivery package; it does not
silently resolve contradictory policies or the earlier no-install instruction.

- Checkout: `C:\grantum-r-n`.
- Source anchor: `4755d31210d0182e5a6a14f913b49965be96a218`, S4 closure PR #28.
- Delivery branch: `codex/s5-entry-spec`, created without discarding the prior config repair.
- S4 remains CLOSED-FULL under its recorded, S4-only owner exception.
- S5 remains UNSTARTED. This package does not implement or close it.
- Existing warning ceiling: 63. No increase or exemption is proposed.
- Git identity: repository-local `Vikkingg-SD / sneesarevd@gmail.com`.
- Squash-merges, auto-merge and protected-branch pushes remain outside agent authority.

## Setup findings that must be resolved before a reliable delivery gate

The MCP config's executable, working directory and sandbox root now exist and the TOML parses.
The five-tool allowlist and required-server behavior remain intact. Native catalog activation and
a current live Repomix handshake remain unverified.

The dependency directory was relocated with stale absolute Windows junctions. For example,
`node_modules/expo-router` points into `C:\grantum-rn\node_modules\.pnpm`, while the actual checkout
is `C:\grantum-r-n` and the old root is absent. The same issue affects React, TypeScript, ESLint,
Husky and other top-level dependencies. Some physical package contents exist under the current
`.pnpm` directory, but that does not make the dependency graph executable.

One unchanged `pnpm gate` attempt was captured outside the repository. It timed out before any
check verdict; its only output was a pnpm update notice. No update was performed. The launcher
stall's root cause is not established; the broken links are a separate confirmed finding. No
blind rerun, green claim, commit-hook bypass or shortened substitute gate is authorized.

## Proposed decisions

The recommendation column is a review proposal, not a recorded owner answer. Existing IDs below
refer to the attached workplan's decision menu; this document does not invent new ruling IDs.

| Topic                   | Recommendation                                                                                                                                                                                                                               | Permission still needed                                                                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime repair          | Use existing pnpm 12.10.1 to restore the existing lockfile with `pnpm install --frozen-lockfile`, starting offline if the current store can satisfy it. Preserve manifest and lockfile hashes. No upgrades. Diagnose any error before retry. | Lift earlier no-install restriction for this exact restore. Do not delete or recursively move node_modules, create an old-path alias, or use force without a separate concrete recovery decision. |
| Repomix availability    | Permit the pinned `pnpm dlx repomix@1.18.1 --mcp --sandbox C:\grantum-r-n` fetch/run for the approved fixed-root server only. No app dependency or lockfile addition.                                                                        | Explicit permission to fetch the missing pinned tool; configuration is not activation.                                                                                                            |
| RUL-II-01               | Use the attached II pair with its inherited/adopted rules; record the disposition of proposed additions explicitly.                                                                                                                          | Ratification is not inferred from the earlier analysis request.                                                                                                                                   |
| RUL-II-02 / AD-68       | Reject severity demotion and preserve baseline 63. Owner pins Actions checkout to the triggering SHA in detached HEAD and asserts the SHA/checkout state, as specified in the control spec.                                                  | Approve disposition and owner applies the `.github/` change through the standing Web UI transport.                                                                                                |
| RUL-II-03/04            | Deliver the checker fix on a named feature branch after spec approval. Preserve the old `fix/checker-starrexp-ci` branch until owner-authorized ancestry/disposition; no automatic deletion.                                                 | Approve the checker batch; no branch deletion requested here.                                                                                                                                     |
| RUL-AG-04/05; RUL-II-05 | Execute complete documented typography/radius alignment and token verification in a separate PR.                                                                                                                                             | Existing adopted obligations are evidenced in the S4 ledger; approve the concrete five-file batch.                                                                                                |
| RUL-II-06               | One manual Python standard-library config/smoke verifier, no extra MCP servers or SDK dependency.                                                                                                                                            | Approve tooling batch; live mode also requires the availability decision above.                                                                                                                   |
| RUL-II-07               | Append durable evidence at merge verification, not at closure.                                                                                                                                                                               | Approve the procedure/ledger update in its bounded documentation batch.                                                                                                                           |
| RUL-II-08/09/10         | Named phase boundaries, targeted retrieval, bounded logs and read-only reviewers. Agent does not change provider model/effort settings.                                                                                                      | Record proposed policy dispositions; stricter existing stop rules remain binding.                                                                                                                 |
| RUL-II-11               | Preserve each S4 unverified item and assign explicit stage/evidence expiry. Native IME/keyboard evidence must be supplied for S5 acceptance.                                                                                                 | Owner approves the expiry mapping; no unverified item becomes PASS.                                                                                                                               |
| RUL-II-12               | Repo files carry current operational state; the explicitly attached canon pair remains available for verification. Reconcile stale root spelling only.                                                                                       | Approve exact governance edits; do not import the prep starter's instructions.                                                                                                                    |
| Router mechanism        | Use SDK57's actual exported ErrorBoundary mechanisms instead of treating `app/+error.tsx` as a special handler.                                                                                                                              | Record the filename/mechanism correction before the affected code.                                                                                                                                |
| Header history controls | Use only real router capabilities; do not invent a forward stack or a button without an action.                                                                                                                                              | Record the native disposition of the reference forward control after reference verification; Router exposes back/canGoBack, not a general forward operation.                                      |
| Recovery harness        | Propose exactly `@playwright/test@1.64.1` as a dev-only dependency, Chromium only, one worker, for real rendered throw/retry tests. No production dependency.                                                                                | Explicit dependency/lockfile and CI-browser provisioning approval. A pure-policy or source-shape test cannot substitute for rendered recovery.                                                    |
| WP-F batch allocation   | Split S5 delivery into WP-F.1 (recovery/container) and WP-F.2 (chrome/modal), at most three batches each.                                                                                                                                    | Record the split to resolve S5-MB1..4 versus the general three-batches-per-WP ceiling.                                                                                                            |
| AD-61 contrast          | Keep the finding open for a separately evidenced color decision.                                                                                                                                                                             | No approved replacement color is present; do not invent one in token alignment.                                                                                                                   |

`@playwright/test@1.64.1` is a proposal supported by the upstream release, not an installed package.
Its browser download and CI provisioning are distinct from restoring existing dependencies.

## Product boundaries and missing evidence

The exact V7.2 reference product pack and the designated previous green closure pack were not among
the five attachments. Before dependent UI-copy/parity or closure work, obtain the explicitly named
artifact and verify its identity; do not substitute the hackathon starter or search unrelated folders.
Control work that does not depend on that pack can be reviewed independently.

S5 controls must consume typed values and callbacks, not fetch URLs or import mock data. S6 owns
the HTTP adapter, endpoint registry, validated API base URL, token storage and polling/cancellation
contract. API mode currently throws because that adapter is absent; this remains honest until S6.
No production network failure may silently select the mock adapter.

The overview's screen-extraction suggestion does not move extraction from S7 into S5. Its quota
estimates are not a delivery-time promise. Its closure-effort recommendation does not silently
supersede constitution B-8.17. The agent does not alter provider settings.

## Review order and terminal point

1. Approve the setup permissions and the applicable decisions above.
2. Restore executable dependencies; diagnose the launcher stall; prove MCP manually and distinguish
   standalone protocol proof from native catalog attachment.
3. Run the existing gate, capture exact counts, and verify the intended tree.
4. Deliver control batches from `s5-control-spec.md`, then the approved WP-F.1 specification.
5. Commit/push only green intended file sets, prepare PRs, and stop for owner squash-merge.

Terminal point for this specification delivery: reviewable documents and exact blockers, with no
dependency install, quality-control change, product implementation, owner ruling, merge or S5 closure
invented. After the future approved implementation PR, stop at its named green handoff; no S6 work.
