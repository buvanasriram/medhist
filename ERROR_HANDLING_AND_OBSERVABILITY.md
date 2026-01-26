# Error Handling & Observability Documentation

## 1. Philosophy of Error Handling in This Application
In **medHist**, the philosophy is "Clinical Integrity over Absolute Automation." 

- **Resilience over Rigidity**: We prioritize a "Draft First" approach. If the AI extraction fails, the system must not block the user; instead, it generates a "Pending Verification" entry, salvaging as much data as possible via deterministic regex.
- **AI vs. Traditional Failures**: Traditional failures (404, 500) are treated as binary stop-gaps. AI failures (hallucinations, schema drift) are treated as "Signal-to-Noise" issues, where we down-rank the confidence of the data but maintain the record.
- **Transparency**: Users are notified when clinical data is "AI-Inferred" (e.g., medication purpose) to ensure human oversight is the final guardrail.

## 2. Error Taxonomy

| Category | Type | Treatment |
| :--- | :--- | :--- |
| **AI Engine** | Quota (429), Overload (503), Refusal, Malformed JSON | Retriable with exponential backoff; fallback to "Salvage Mode" on persistent failure. |
| **Persistence** | Supabase RLS Violations, Storage Full, Constraint Violation | Non-retriable; immediate user alert and session validation check. |
| **Identity** | Folder Mismatch, Claim Conflict | Intercepted by "Identity Guard"; blocks auto-sync of medications until human override. |
| **Multimodal** | PDF Corruption, High-DPI Memory Crash | Triggers "Low-Memory Rendering Mode" or "OCR-Only Fallback." |
| **Auth** | Session Expired, Network Partition | Triggers "Rescue Mode" (5s timeout) and offers "Force Reset Session." |

## 3. AI-Specific Failure Modes
- **Chatty JSON**: The model prepends "Here is the JSON:" to the output. Detected by finding the first `{` and last `}`.
- **Lost in the Middle**: High-density medical reports can cause truncation. Mitigated by capping PDF extraction at 8,000 characters and using `repairJson` to balance braces.
- **Semantic Drift**: The AI might categorize a "Lab Report" as a "Prescription." We allow users to "Correct Entry" which provides a feedback loop for future prompt tuning.
- **Hallucinated Medications**: The model might infer a drug name that doesn't exist. Detection is currently reliant on the "Salvage Mode" regex comparison.

## 4. Error Detection & Validation Points
1. **Pre-AI Validation**: Checks file size (<10MB) and MIME type. Truncates text to fit within the 8k context window to ensure the most relevant clinical "Plan" (usually at the end) is not lost.
2. **Post-AI Validation**: `robustJsonParse` checks for required fields (`date`, `reportType`). If missing, the record is flagged as a "Draft."
3. **Identity Guard**: Client-side logic compares the extracted `patient_name` against the folder's `name`. A mismatch flags the entry with a `WarningIcon`.

## 5. Retry Logic & Backoff Strategy
The application uses a centralized `withRetry` wrapper in `geminiService.ts`.

- **Retriable**: HTTP 429 (Rate Limit), 503 (Model Overloaded).
- **Strategy**: Exponential backoff (Base delay: 2000ms, Factor: 1.5x, Max Retries: 3).
- **Abort Conditions**: 400 (Bad Request/Refusal), 401 (Invalid API Key), 403 (Safety Filter).
- **Safety**: Retries are only applied to `generateContent` (idempotent reads/extractions). They are **never** applied to Database `INSERT` operations to prevent duplicate timeline entries.

## 6. Timeouts & Circuit-Breaking
- **AI Extraction**: 30-second hard timeout. If reached, the system assumes "System Busy" and returns fallback data to allow manual entry.
- **Auth Boot**: 5-second "Rescue Timer." If the Supabase session handshake stalls, the UI presents a "Force Reset" button to clear stale `localStorage` keys.
- **Circuit Breaker**: If 3 consecutive AI extractions fail within a single session, the "Upload" button is throttled to prevent further token waste.

## 7. User-Visible vs. Silent Failures
- **Visible**: "Identity Mismatch," "Registry Sync Failed," "Duplicate Upload." These require user decision.
- **Silent (Logged)**: JSON repair attempts, regex salvage hits, PDF worker version mismatches.
- **Degraded Mode**: If `react-pdf` fails to render a complex canvas, the system shows "Preview Unavailable" and provides a direct signed-url download link.

## 8. Logging Strategy
- **Audit Logs**: We log `member_id`, `file_type`, and `latency`.
- **Clinical Privacy**: The actual text content of medical reports is **never** logged to central services to maintain HIPAA-adjacent privacy standards.
- **Error Metadata**: On AI failure, we log the `rawText` prefix (first 100 chars) to identify if the model is returning conversational filler instead of JSON.

## 9. Metrics & Observability Signals
1. **Extraction Latency**: P50/P95 targets for `gemini-3-flash` (Target < 4s).
2. **Salvage Rate**: Percentage of extractions that required regex parsing. High rates indicate prompt degradation.
3. **Identity Match Rate**: Ratio of reports that pass the Identity Guard. Low rates suggest users are uploading to the wrong folders frequently.
4. **Auth Rescue Rate**: Number of users hitting the 5s "Rescue Mode" on boot.

## 10. Alerting & Incident Triggers
- **Critical**: 401 Unauthorized (Global API Key failure).
- **Warning**: 429 Rate Limit (Quota exhaustion).
- **Operational**: Spike in `mismatch_ignored == false` entries, indicating poor extraction of patient names.

## 11. Debugging & Incident Response Workflow
1. **Identify**: Check the `console` for `[medHist] AI Analysis Request` groups.
2. **Isolate**: If the AI returns JSON but the UI shows "Draft," the issue is in the `types.ts` interface or `responseSchema` mismatch.
3. **Reproduce**: Use `SAMPLE_REPORTS.md` text. If the AI fails on these "Gold" samples, the model behavior has drifted.
4. **Fix**: Update `geminiService.ts` system instructions or adjust the `responseSchema`.

## 12. Common Failure Scenarios & Examples
- **Scenario**: User uploads a 15-page PDF. 
  - **Result**: `extractTextFromPdf` truncates to 8k chars. AI parses the summary correctly but misses a medication on page 14. 
  - **Handling**: The "Clinical Brief" warns about truncation.
- **Scenario**: AI extracts "Homer S." for folder "Homer Simpson".
  - **Result**: Identity Guard flags "Confirm Identity".
  - **Handling**: User clicks "Confirm & Link" to execute the medication sync.

## 13. Known Limitations & Trade-offs
- **Password-Protected PDFs**: The AI cannot "see" into an encrypted PDF. Users must provide the password at upload time.
- **DPI Limits**: On low-memory iPhones, we cap the PDF rendering scale at 1.75x. Users wanting high-detail zoom must download the file locally.

## 14. Guidelines for Future Enhancements
- **New Schema Fields**: If adding a field (e.g., `labResults`), you must update `ExtractedReportData` in `types.ts` AND the `responseSchema` in `geminiService.ts` simultaneously.
- **Model Upgrades**: When moving to a newer Gemini version, perform a "Vibe Check" across all members using the `MockupPreview` tool to ensure UI consistency.

## 15. Notes for Future Maintainers
- **"Salvage Mode" is the Canary**: If logs show frequent regex salvage hits, the model is likely no longer following the `responseMimeType: 'application/json'` constraint.
- **Do Not Silence Auth Rescue**: If users are seeing the "Taking too long?" prompt, it is a symptom of database latency or incorrect `VITE_SUPABASE_URL` configuration.

---
*medHist Observability Specification v1.3.1*