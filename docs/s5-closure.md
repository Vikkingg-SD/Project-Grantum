# S5 implementation and acceptance card

Date: 2026-11-02, Asia/Qyzylorda.
Status: **OPEN — implementation candidate; native acceptance and owner merge owed.**
This is an evidence record, not CLOSED-FULL or a native-test waiver.

## Authority and delivery

Owner continuation: "finish S5 and close remaining debt". Adopted constitution/workplan,
root AGENTS.md, S5 control/product specifications and the action ledger govern this work.
The owner approved the revised F2-A keyboard-consumer allocation and subsequently
"Approve revised F2-C and lower ceiling". F2 has three source batches of at most five files.
The approved C table is organisms/index.ts, parity-register.md, this card,
action-ledger-s5.md and gate-baseline.json. AppHeader's export moved into B's existing barrel slot.
Only the owner may squash-merge; no merge or later-stage work is authorized by a green gate.

| Delivery                   | Verified source / main anchor                                 | Evidence                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checker C / Node MCP T     | PR #32, ef26b5b803a8ab26d81ea0adc240027ff9c67e9e              | Merged, tested tree matched; recorded in ledger.                                                                                                                          |
| Token alignment K          | PR #33, 4cebed915135383487e72be03628e0afbab94f54              | Merged, numeric manifesto contract and 36 token cases; no second expectations registry.                                                                                   |
| F1-A harness               | PR #34, cba7fb348c819db38dcc20c2cfb44c1c40786d95              | Merged, pinned Playwright 1.64.1; two preliminary tests remain separate from product acceptance.                                                                          |
| F1-B recovery              | PR #36, 145d83500d14dca799749a43e40a4afc57241267              | Merged, actual rendered dev/release faults and retry; two scoped CI provisioning steps merged.                                                                            |
| F1-C container/verifier    | PR #37, 926b2a32fcba76cb261cd530fb012c9e9c602d38              | Merged; exact tested tree 257975425b7f33f5834ac6686677a140a1feb454; PR run 41336263279 and main run 41336902537 succeeded.                                                |
| F2-A chrome                | e10fc4f, feature branch codex/s5-chrome-modal-20261101        | Full 128-case gate, 0/60/3/0; scope/formatter/hook inventories and six rendered chrome profiles passed.                                                                   |
| F2-B modal                 | 4d4010389403b334401ecb75e05b9dccfda3e3a5, same feature branch | Full 128-case gate, 0/58/3/0; 16 production modal profiles and six gallery profiles passed on final bytes.                                                                |
| F2-C registration/evidence | This candidate, not merged when authored                      | Final full gate, previous-pack proof, source inventory, independent PR CI and candidate-pack hash belong to the final review evidence. No future result is presumed here. |

Local main 25293bdd1d3a117ae2ccc3816799df1755b72d73 is preserved. Feature source is based on
fetched main 926b2a3, with PR #37 merge-evidence prelude 25b5cf0 included in the same F2 PR.
Rollback is a corrective feature PR from the verified anchor, never a reset or force push.

## Implemented product contract and verification

- Supported Router 57 ErrorBoundary exports and screenErrorBoundary handle real rendered
  failures. Retry/repeated failure, retained navigator, release privacy and reload are tested.
  The mandatory gate retains its existing order and includes all 128 cases; the preliminary
  two-case harness is a separate CI step, not counted twice as completed recovery coverage.
- ScreenContainer preserves typed style composition and existing callers, measures native
  insets/keyboard origin and uses registered breakpoint/padding tokens with stable selectors.
- Header and both navigation forms share typed route descriptors and actual Router state.
  Back uses the real history; the six routes and Post-award remain navigable. No new ID,
  backend, parallel navigation store or API-to-mock fallback was introduced.
- ModalSheetLayout owns visibility, responsive geometry, inset/keyboard handling, reduced
  motion, Close and onRequestClose. The lower-level organism imports no template and owns
  typed grant content/Start Draft only. Both live consumers were migrated atomically.
- Web checks used actual keyboard, pointer and touch events: six chrome profiles at
  320/768/1280, sixteen modal profiles at 320/375/390/640/767/768/1024/1280, both themes,
  plus six long-content/disabled/first-tap gallery profiles. Escape, focus containment/return,
  backdrop/Close and real apply navigation passed. Event Timing entries were measured, with
  no recorded interaction duration reaching 100 ms. Native physics are a separate claim.
- A development probe diagnosed the new shell's deprecated pointerEvents prop; moving it
  into the supported style field removed that warning without suppressing diagnostics.

Warning prediction and measured path changes: 63 -> 62 (ScreenContainer STORE-WHOLE),
62 -> 60 (AppHeader/TopTabNavigation PLAN-MISSING), 60 -> 58 (ModalSheetLayout PLAN-MISSING
and GrantDetailModalSheet STORE-WHOLE). C predicts zero further finding delta. The owner
approved lowering the ceiling to 58; exemptions, lint rules and checks were not relaxed.
Line-number movement in unchanged findings is distinguished from actual added/removed findings.

## Pinned reference and regression evidence

Product/copy reference: owner-supplied V7.2 Next.js final-green pack, SHA-256
204132358cc94da9520e9c6a6360743507de29ff4de7b998aa0aee972f33b35c.
New header/navigation/Close copy was copied verbatim; existing modal copy remains explicitly
assigned to S7-H1. The palette, unspecified roles and font mappings are preserved.

Designated previous-green input:
C:/Users/Vikking/Desktop/PROJECT GRANTUM-RN/Repomixes/Actual/repomix-output-S4-green.xml,
SHA-256 d40f047afa32b656e4bb118531f9f2a47794bdd8a58450ac2a6abf79e09adef8.
F2-B strict comparison passed FAIL 0 / WARN 58 / INFO 2 / SKIPPED 0 without export regression.
The final candidate comparison must also pass. A routine gate's undeclared-baseline INFO is
not substituted for this explicit check. A fresh untracked candidate pack and its inventory/hash
are recorded outside the checkout after the final candidate is committed; no circular self-hash.

## Remaining acceptance and stage boundaries

The owner identified a Samsung A55 using SDK 57 and supplied Android bundle-completion logs.
Actual Android OS and Expo Go/development-build versions and individual native outcomes are
still missing. All of the following remain **NOT RUN** on the final candidate: dark/light
safe areas, keyboard show/hide/clearance, IME candidate confirmation, multiline paste and
10,000-character boundary, first action tap with keyboard open, actual light-theme interaction,
native root/tab/screen/repeated recovery, modal/system Back and native accessibility.
The external S5_NATIVE_CHECKLIST.md supplies the numbered observation form and tested-SHA field.
Neither bundling, browser tests nor a blanket PR merge constitutes these outcomes.

The owner reported two web "Cannot record touch end without a touch start" warnings before
any site click. Four actual touch recovery probes and the F2 cold-start/touch probes did not
reproduce them. Cause/fix is **NOT ESTABLISHED**; no diagnostic suppression or upgrade was made.
An exact reproducible warning remains diagnostic debt, separate from completed browser actions.

The S4 native/owner-light carryover expires at S5 evidence under RUL-II-11; it is not waived
again here. The broader S4 component viewport/prop matrix remains tracked to S7. AD-61 stays
OPEN under its adopted exclusion, with contrast/glow/global accessibility polish due by S9.
S6 HTTP adapters/cycles, S7 screen extraction/copy and S8 route flips remain later. Existing
canned responses, mock checksums and null audit data are not production-connected success.
No claim of complete spacing/shadow parity, full accessibility or real backend behavior is made.

Before CLOSED-FULL: obtain actual native outcomes at the final product tree, resolve failures,
verify final independent PR CI and owner squash merge/main tree/CI, and record final pack/parity
evidence plus owner review. Infrastructure MCP standalone proof and native in-chat attachment
remain distinct: the five-tool verifier passed earlier; native catalog is NOT ATTACHED in this chat.
