# API CONTRACTS SPECIFICATION — FLASK / POSTGRESQL BACKEND

This document serves as the formal specification for the Flask backend developer.
All routes must adhere strictly to the method, path, parameter structure, and expected response payloads outlined below.

---

### 1. Retrieve Grants Index

(
***Метод: GET
***URL: /api/v1/grants
***Отправляем: Query Params: ?q=string&region=string&category=string
***Ожидаем получить: [
{
"id": "1",
"title": "Climate Resilience Infrastructure",
"funder": "Northstar Foundation",
"deadline": "28 days",
"amount": "$250k–$500k",
"matchPct": 94,
"region": "Global · Infrastructure",
"summary": "Deploy flood-resilient infrastructure..."
}
]
)

---

### 2. Retrieve Specific Grant Detail

(
***Метод: GET
***URL: /api/v1/grants/<grant_id>
***Отправляем: URL Param: grant_id (string)
***Ожидаем получить: {
"id": "1",
"title": "Climate Resilience Infrastructure",
"funder": "Northstar Foundation",
"deadline": "28 days",
"amount": "$250k–$500k",
"matchPct": 94,
"region": "Global · Infrastructure",
"summary": "Deploy flood-resilient infrastructure...",
"requirements": ["Mission", "Pain", "Solution", "Market", "Competitors", "Moat"]
}
)

---

### 3. Retrieve Proposal Draft for Grant

(
***Метод: GET
***URL: /api/v1/proposals/<grant_id>/draft
***Отправляем: URL Param: grant_id (string)
***Ожидаем получить: {
"id": "prop-101",
"grantId": "1",
"completedSections": ["Mission", "Pain", "Solution", "Market", "Competitors", "Moat"],
"requiredSections": ["Mission", "Pain", "Solution", "Market", "Competitors", "Moat"],
"completionPct": 100,
"confidenceScore": 100,
"body": "Executive summary..."
}
)

---

### 4. Mutate Proposal Sections (Toggle/Delete/Add)

(
***Метод: PATCH
***URL: /api/v1/proposals/<grant_id>/sections
***Отправляем: {
"action": "remove" | "add" | "restore" | "deleteRequirement",
"sectionName": "Moat"
}
***Ожидаем получить: {
"grantId": "1",
"completedSections": ["Mission", "Pain", "Solution", "Market", "Competitors"],
"requiredSections": ["Mission", "Pain", "Solution", "Market", "Competitors", "Moat"],
"confidenceScore": 83,
"updatedAt": "2026-10-09T10:15:30Z"
}
)

---

### 5. Trigger Deterministic Audit Scan

(
***Метод: POST
***URL: /api/v1/proposals/<grant_id>/audit
***Отправляем: {
"triggerMode": "full_scan"
}
***Ожидаем получить: {
"scanId": "audit-run-99",
"status": "running" | "passed" | "failed",
"confidenceScore": 83,
"missingSections": ["Moat"],
"events": [
{
"id": "evt-1",
"agent": "agent-2-deterministic",
"message": "Missing: Moat — confidence 83",
"status": "failed",
"timestamp": "14:32"
}
]
}
)

---

### 6. Export Application Bundle

(
***Метод: POST
***URL: /api/v1/proposals/<grant_id>/export
***Отправляем: {
"format": "word" | "pdf" | "notebook" | "markdown",
"documentBody": "Executive summary..."
}
***Ожидаем получить: {
"success": true,
"checksum": "sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
"downloadUrl": "https://api.grantum.io/downloads/bundle-1.docx"
}
)

---

## S6 contract completion

The six routes above retain their camelCase application payloads. This is the
client/backend agreement, not evidence of a deployed backend. V7.2's unused future
snake_case draft is conceptual context; it does not override this live contract.
The configured base URL is the backend origin/deployment prefix; each path below
includes `/api/v1`. No production or physical-device host is assumed.

Requests accept JSON. Bodies use `Content-Type: application/json`. Authenticated
requests send `Authorization: Bearer <session-token>`. Grant search/detail and
magic-link/OAuth initiation may be public; the server enforces authorization on all
other routes. Errors use non-2xx status codes (401 unauthenticated, 403 forbidden,
404 absent, 409 conflict, 422 invalid input, 5xx service failure). Errors must never
be returned as successful payloads. The client surfaces network, timeout, HTTP and
invalid-response errors without substituting mock data.

### 7. Read an audit scan

`GET /api/v1/proposals/<grant_id>/audit/<scan_id>` returns the AuditScan shape in
section 5. `scan_id=latest` returns the latest scan or JSON `null` when none exists.
A specific absent scan returns 404. A scan must belong to grant_id. `running` polls
at the configured interval; `passed`/`failed` and request failures stop polling.
Section mutations invalidate the latest scan's relevance; a new audit is required.

### 8. Read award

`GET /api/v1/proposals/<grant_id>/award` returns:
`{ grantId, status, submittedAt, nextReportAt, amount, contractStatus, events }`.
status is `awarded | submitted | in_review`; dates are ISO strings; amount and
contractStatus are display strings; events have the AuditEvent shape in section 5.
No award returns 404, never a fabricated awarded record.

### 9. Dashboard summary

`GET /api/v1/dashboard/summary` returns:
`{ greetingName, pipeline: [{ label, count }], profileCompletionPct, activeDraft }`.
activeDraft is `null` or `{ grantId, title, completionPct }`. Percentages are finite
numbers in 0..100. The client uses the returned grant ID, not a fixed first grant.

### 10. Session profile

`GET /api/v1/auth/me` returns `{ id, isOnboarded, status }`, where status is
`active | suspended`. Missing/invalid credentials return 401.

### 11. Magic-link request

`POST /api/v1/auth/magic-link`, body `{ email }`, returns `{ success: true }` only
after the service accepts the request. Sending a link is not a signed-in session.

### 12. OAuth exchange

`POST /api/v1/auth/oauth`, body `{ provider }`, returns `{ token, isNewUser }` only
after a real authenticated provider exchange. The backend must supply its provider
authorization flow; this contract alone does not implement an OAuth UI or redirect.
An unauthenticated provider name is not sufficient proof of identity.

### 13. Finish onboarding

`POST /api/v1/auth/onboarding`, authenticated, returns
`{ success: true, isOnboarded: true }` after saving the server profile.

### 14. Submit bounty

`POST /api/v1/bounties`, body `{ title, url?, note? }`, returns `{ queued: true }`
only after queue acceptance. This does not assert that indexing has completed.

### Shared details

- Grant search uses q plus repeated region/category query parameters. IDs and search
  values are URL encoded. Grant detail additionally includes required `requirements`.
- `remove` marks a section incomplete; `restore` completes all required sections;
  `add` adds a named requirement and completes it; `deleteRequirement` removes it
  from both lists. Client aliases markMissing/restoreAll/addRequirement map to
  remove/restore/add. A non-restore operation requires a nonblank sectionName.
- Mutation responses use the authoritative SectionState shape in section 4. They
  never conflate overall completionPct with the deterministic confidenceScore.
- Export requires a real successful bundle, nonempty checksum and HTTP(S) download
  URL. The checksum is the server's assertion, not independently client-verified.
  The mock adapter rejects export because it has no document service.
- Native session tokens use expo-secure-store; web keeps tokens in memory. Tokens
  never enter AsyncStorage, example env files, diagnostics or repository artifacts.
