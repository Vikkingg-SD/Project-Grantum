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
"action": "remove" | "add" | "restore",
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
