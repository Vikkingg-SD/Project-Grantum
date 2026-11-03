# S9 / WP-J implementation and acceptance card — 2026-11-03

The frontend-mockup source is complete and corrected code batches passed the
owner-requested local `pnpm gate`. CLOSED-FULL is not claimed: independent S9
CI and responsive/native acceptance remain pending. This card is subordinate
to the attached constitution/workplan and owner decisions.

Shared tokens distinguish readable foregrounds from fills in both themes.
Busy actions retain names; inputs/composer have visible outlines and names;
status/gauge text and timestamps retain contrast. Text scales without the old
cap, progress labels wrap, and the interruptible 240ms ease-out transform honors
reduced motion. The switch is named/checked with a 44pt target; Export formats
expose native selected and web pressed state.

The header wordmark navigates home using the current URL grant; Escape respects
composition and modal ownership. Recovery actions avoid nested button semantics.
SiteFooter restores reference framing on onboarding/deferred auth. The B-10.21
source table is complete in s9-platform-audit.md. Project-local skill/reference
versions, uses and inventories are in design-references.md.

The V7.2-to-RN transition is conceptually implemented for the agreed mockup:
Expo Router owns grant/view/history, atomic native components implement screens,
Query owns server state and local stores own notes/theme/document edits. One
DataSource selects mock or HTTP adapters; API_CONTRACTS.md supplies 14 endpoint
sections. V7.2's unused future snake_case draft does not override the current
camelCase agreement. No screen fetch or second navigation store is introduced.
Standalone FRONTEND_REQS.md is absent from checkout/reference; its 14 laws are
present in the attached constitution section 2. Auth registration and draft
persistence retain RUL-SSU-06/09 dispositions.

Code gates exited 0 at 0/11/4/0 then 0/10/4/0. Ceiling 17 and zero exemptions
remain. Both chains passed formatting/typecheck, 119 zero-warning lint files,
scoring 14, drafts 9, theme 6, composer 20, preflight 24, tokens 36, contracts 52
and static routes 2. Final documentation-gate evidence follows in the ledger.
No standalone tests, Metro or local production build were launched.

The old S8 PR #42 is closed/unmerged and its remote branch was deleted. Under
the owner's latest direction, complete code inspection precedes sequential S8
and S9 local branch recreation; a new S8 GitHub branch/PR follows only at the
end. The recreated local S9 source retains home/copy changes together with the
always-mounted navigator guard. The replacement S8 PR must be owner-merged
before the S9 PR. No agent merge is allowed. Local static-route success cannot
certify the CI browser path. The previous-green closure comparator is undeclared;
export regression is not a passed check. The canon's planned verify:a11y script
is absent; semantic/source review is not a scanner or screen-reader result.

Owner acceptance at patch end: 320/375/768/1024/1280 in both themes; 200% text;
Drafting/Audit overflow, Export clipping, Post-award timestamps and Dashboard
composition; modal focus/return and Escape; native safe areas/Back/IME/scrolling;
reduced motion and TalkBack/VoiceOver. Live API rendering needs an actual
backend/fixture render. Export/metadata/security/doctor/release-device work stays
in WP-K/S10. No extra local suite was run to simulate these results.

Coverage: current source and local gate only; rendered responsiveness, keyboard
focus, native physics, motion latency, live API and release acceptance unclaimed.
