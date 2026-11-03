# S8 prerequisite: development Babel resolution — 2026-11-02

Status: prerequisite configuration correction; production acceptance deferred by owner.

Superseding owner instruction, 2026-11-03: "finish S8, no production build yet, push
all changes, I approve of changes". The previously approved production-building
retry is now deferred. Apply and publish S8 with non-production evidence and an
explicit closure exception; never turn this deferral into a full gate PASS.

The owner requested finishing S8, approved all changes, authorized up to ten
five-file commits, and subsequently approved the RUL-V6-01 measured warm-up and
one unchanged recovery/full-gate retry. Existing test assertions, deadlines,
warning ceiling and exemptions remain unchanged. No ruling ID is invented here.

The first full entry gate passed preflight (0 FAIL / 17 WARN / 4 INFO / 0 SKIPPED),
format, typecheck, lint, format check and 14/9/6/20/24/36 behavioral cases. Recovery
setup exceeded its 80-second export deadline; 19 cases did not run. A standalone
production web export then succeeded. The unchanged recovery rerun passed export
setup but exceeded the 30-second owned-Metro readiness deadline; no recovery
behavior was accepted. Contract verification was not reached by the full gate.

Longer manual observation found a concrete prerequisite defect: development Metro
failed to construct its transformer because babel.config.js requested
babel-preset-expo as a root-resolvable package. pnpm's isolated layout installs
that preset as Expo's existing dependency. The original startup took 345815 ms
to return HTML, then failed the bundle request. The log and JSON measurement are
retained under .expo/s8/metro-before-babel-fix.*, separate from later measurements.

The correction uses Node createRequire for the installed expo/package.json and
resolves that package's own preset. This preserves the selected Expo version and
does not add a dependency, alter the lockfile, change Babel options or relax a gate.
A real development Babel loadPartialConfigSync call resolved the existing
babel-preset-expo 57.0.16 successfully. That isolated check is not a full gate PASS.

The corrected preset still encountered severe startup memory pressure: a 3951 MiB
host with four available CPUs fell below 200 MiB free. Metro's documented maxWorkers
setting sizes both its file-map and transformation pools. The prerequisite also
limits maxWorkers to one on hosts with at most 4 GiB total RAM; larger hosts retain
Expo's default. This changes concurrency, not transformation options or test timeouts.
References: https://metrobundler.dev/docs/configuration/#maxworkers and
https://docs.expo.dev/guides/customizing-metro/ . Measure before claiming improvement.

Constitution B-5.13 keeps this configuration prerequisite in a separate chore
commit, counted within the owner's ten-commit ceiling, before the product commits.
The immutable rollback tag records the original S7 tree before the route flip.
Full entry evidence must identify the corrected config;
the original 187a308 repository tree is not retrospectively labelled green.
The owner-designated S7 app/src export snapshot remains derived from its original
Git blobs, with the prerequisite config change and actual gate result recorded
alongside it. V7.2 remains the separately pinned product reference.

Only the owner may squash-merge. No SDK upgrade, dependency installation, baseline
increase, exemption, skipped recovery case or timeout adjustment is authorized by
this record.
