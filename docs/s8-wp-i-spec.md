# S8 / WP-I route migration specification — 2026-11-02

Owner request: "Lets finish S8, I approve of all changes, follow governing docs and the plan."

Superseding instruction, 2026-11-03: "finish S8, no production build yet, push all
changes, I approve of changes". Complete and publish WP-I; production build and the
production-building full gate/recovery acceptance are explicitly deferred. This is
an owner exception to the earlier entry/closure prerequisite, not a green gate result.
Use development route verification and non-production checks. Keep the warning
ceiling, assertions and gate intact; preserve every unrun/failed check in the handoff.
Scope is WP-I in the attached RN WORKPLAN CANON COMPRESSED AGENTIC II, sections 3 and 4;
RUL-A1-16, RUL-SSU-08 and constitution B-6.8 apply. Stop after the reviewable S8 handoff.
S9 polish, S10 release, dependencies, SDK upgrades and native projects are outside this scope.

## Entry and authority

Clean source anchor: 187a308, S7 implementation candidate. S7's named acceptance gaps
remain open; entering S8 does not retroactively certify them. The owner's S8 instruction
reconfirms route-flip timing. Create the immutable annotated pre-wp-i anchor before
changing routes, following a fresh tag inventory and the passing entry gate.

The entry run exposed development Babel preset resolution and low-memory Metro
startup prerequisites, recorded separately in s8-entry-chore.md. The configuration
chore covers babel.config.js and metro.config.js and counts within the ten-commit
limit; it adds no dependency and changes no gate. The corrected entry
result must name that change and cannot certify the original 187a308 full tree.

Product reference SHA256:
204132358cc94da9520e9c6a6360743507de29ff4de7b998aa0aee972f33b35c.
The six reference view paths are dashboard, discovery-studio, drafting, audit-studio,
export-humanizer and post-award-tracker under /grants/[grantID]/.

The owner explicitly approved extra S8 batches, including up to ten five-file commits
for this sitting, and designated the S7 entry snapshot conditional on its full gate
passing. These decisions cover only S8's work-package and sitting batch caps.
Each delivery unit stays at five files or fewer, including deletions.
Existing hooks, gate severities and exemptions remain intact. Only the owner may merge.

## Contract and symbol verification

| Symbol                 | Owning source / contract                                                               | Consumers                                 |
| ---------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------- |
| useActiveGrantId       | new src/hooks/useActiveGrantId.ts; local route parameter only                          | Four grant screens, navigation hook       |
| useActiveView          | new src/hooks/useActiveView.ts; route leaf to existing view name                       | Grant layout                              |
| useAppNavigation       | new src/hooks/useAppNavigation.ts; Expo Router navigation/back only                    | Dashboard, Discovery, grant layout        |
| NAVIGATION_ITEMS       | existing organisms/TopTabNavigation.tsx; labels/icons preserved, grant hrefs generated | Grant layout, gallery                     |
| useGrants              | existing api/hooks/useGrants.ts; Query-owned catalog                                   | Onboarding and gallery                    |
| useUIStore             | existing store/useUIStore.ts; remove grant identity and its setter                     | Auth cleanup; no route identity           |
| AppScreenErrorBoundary | existing templates/AppErrorBoundary.tsx                                                | Grant navigator; preserve recovery checks |

Use direct-path imports, not new barrels. Root entry redirects to onboarding, preserving
reference app/page.tsx and parity P-01. Onboarding selects an actual queried grant at
Get started; its loading/error/empty states remain honest. The grant index redirects
to its own dashboard. IDs are opaque,
nonempty URL segments; never coerce to numbers or fall back to a fixture ID. Unknown
records remain service errors/empty states, without selecting another grant.

Preserve Back to dashboard semantics with app/dashboard.tsx: recovery outside a
grant context selects an actual queried grant and redirects to its dashboard,
with loading/error/empty states. Include this route in the final documentation unit
with closure/parity docs; keep the warning baseline unchanged. Default verify:routes
uses development Metro and covers 18 cases, including this recovery entry.

The shared grant layout uses a Router Stack and existing adaptive navigation components.
Grant screens remain pure route re-exports. Navigation always preserves the URL grant,
except an explicit application selection. View selection does not create duplicate
history entries for the current view. Expo Router owns Back and browser Forward.
Remove HISTORY_CAP under RUL-SSU-08; do not introduce custom history stacks. Grant-local
draft/editor state stays keyed by the URL identity. Migrate auth cleanup with store removal.

## Delivery scope

Product changes: grant route layout, six view re-exports and grant index; root entry;
three planned hooks; TopTabNavigation and grant-screen/caller migration; gallery and
auth cleanup; remove seven legacy tab files and HISTORY_CAP. Controls explicitly
covered by WP-I: reconcile the route entries in plan-manifest.json; add verify:routes
to package scripts and the existing gate; migrate the recovery test's Discovery URL
assertion to the new contract without removing any recovery case. Close with the
action ledger, parity disposition, measured downward warning ratchet and closure card.

Prediction: WARN 17 to 14. Root entry and three planned hooks remove four PLAN-MISSING
warnings. Replacing the seven obsolete tab-manifest entries with grant routes produces
no missing-route warnings. Removing route identity makes the remaining UI store reachable
only through deferred auth, adding one honest DEAD-CODE warning. Do not invent a UI use
to conceal it. No new exemption is expected. Measure before
changing the warning ceiling; investigate any mismatch rather than suppressing it.

Closure prediction differs from a routine gate: the unchanged export comparator reports
nine retired tab-route exports (six screen defaults plus the layout default, ErrorBoundary
and unstable_settings) and HISTORY_CAP as ten EXPORT-LOST warnings, with no live consumers.
The full app/src baseline therefore predicts closure WARN 24 against the existing ceiling 17. Do not trim the baseline, alter the comparator or raise the ceiling to hide this.
Preserve the raw result and obtain the owner's explicit disposition if measurement
confirms this planned-retirement conflict. Routine-gate green alone cannot close it.

## Verification and closure

The 2026-11-03 owner instruction defers production-building entry/final gate runs.
Run non-production checks and the new development route verifier. Route verification
must inspect the actual file tree and test the development app in Chromium: cold
/grants/2/drafting; reload with no prior selection; all six
views and selected navigation; preserve grant on view change; explicit grant switch,
browser Back/Forward and root redirect; no legacy tabs or store-owned identity; unknown
grant does not render a different grant; no unexpected runtime errors. Close every
server/browser created by verification and keep generated exports/evidence ignored.

Compare exports against the owner-designated previous green snapshot. Planned deleted
route modules are retired entrypoints, not lost shared component exports; retain that
distinction in the evidence without changing the comparison checker. Record exact gate
and route counts, warning math, baseline hash, commits/PR and every unavailable check.
Physical Android deep-link, Back/IME and Expo Go acceptance require actual device proof;
the pasted SDK 58 Go / SDK 57 project error is a blocker, not a passing native check.

Rollback: corrective feature PR from pre-wp-i. Never rewrite history, move the tag,
merge the PR or push main. Terminal predicate: S8 reviewable handoff, then FINAL STOP.
