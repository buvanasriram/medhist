# Local Setup & Debugging Guide

## 1. Local Environment Prerequisites
To develop and debug **medHist**, ensure your workstation meets the following requirements:

- **Runtimes**: Node.js 20.x (LTS) or higher.
- **Package Manager**: `npm` (v10+) or `yarn`.
- **Cloud Services**:
    - **Supabase**: A free-tier project for Auth, PostgreSQL, and Storage.
    - **Google AI Studio**: An API Key for Gemini 2.0 (`gemini-3-flash-preview`).
- **Browser**: Chrome or Edge (latest) for reliable PDF.js worker debugging and WASM support.

## 2. Step-by-Step Local Setup
1. **Repository Setup**: Clone the repository and navigate to the root directory.
2. **Dependency Installation**: Run `npm install`. This will fetch React 19, Supabase SDK, and the PDF.js distribution.
3. **Environment Variable Configuration**: 
    - Create a `.env` file in the root (refer to `.env.example`).
    - Populate `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `API_KEY`.
4. **Database Initialization**: 
    - Copy the contents of `schema.sql` into the Supabase SQL Editor.
    - **Critical**: Create a private storage bucket named `medical-reports` in the Supabase Dashboard.
5. **Starting the Application**: Run `npm run dev`. The app will typically be available at `http://localhost:5173`.
6. **Verification**: 
    - Attempt to sign up a new account.
    - If successful, the "Family Board" should load. 
    - Check the browser console for `[medHist] PDF.js API: 4.8.69` to ensure the registry-lock is active.

## 3. Environment Configuration for Local Development
- **Build-Time Injection**: Vite injects variables prefixed with `VITE_` into the client bundle. The `API_KEY` is also injected via `vite.config.ts`.
- **Mocking Strategy**: In `supabaseService.ts`, the `isMock` flag is set to `true` if credentials are missing. While useful for UI-only work, **Live Mode** is required for debugging RLS (Row Level Security) and AI Extraction.
- **Safe Defaults**: For local dev, use a dedicated Supabase project to avoid polluting production family data.

## 4. Mocking AI Calls
- **Why Mock?**: AI extraction takes 3-5 seconds and incurs token costs. During UI-heavy iterations (e.g., styling the Timeline), live calls are a bottleneck.
- **How to Mock**: In `geminiService.ts`, you can temporarily bypass `ai.models.generateContent` and return a static `ExtractedReportData` object.
- **Risks**: Mocking hides "Chatty JSON" errors. If the model starts returning markdown instead of raw JSON, your mocks won't catch the parser failure. **Always perform a "Live Vibe Check" before committing AI changes.**

## 5. Debugging AI Prompts
Prompts are defined as template literals in `services/geminiService.ts`.

- **Inspection**: The application logs `[medHist] AI Analysis Request` to the console. Expand this group to see the exact prompt and the extracted text/image payload sent to Gemini.
- **Traceability**: If the AI is failing to identify a specific drug, copy the logged `extractedText` and test it directly in the [Google AI Studio Prompt Gallery](https://aistudio.google.com/).
- **Common Bug**: "Lost in the Middle." If a report is > 8,000 characters, our truncation logic might cut off the clinical "Plan." Inspect the logs to see exactly where the truncation occurred.

## 6. Replaying and Reproducing AI Failures
An AI failure usually manifests as a "Pending Verification" entry in the timeline.

- **Model Issue**: The AI returned valid JSON but hallucinated a date.
- **Input Issue**: The PDF.js worker failed to extract text (common in "Image-only" PDFs).
- **Reproduction**: To replay a failure, find the `file_path` in the `files` table, download the raw file, and re-upload it while the browser console is open. Compare the `rawText` output against the `robustJsonParse` result.

## 7. Debugging Non-AI Issues
- **Backend Failures**: If data isn't saving, check the "Network" tab for 403 errors. This usually indicates an **RLS Violation** (you're trying to save data to a `family_id` you don't belong to).
- **Auth Handshake**: If the app hangs on "Authenticating Vault," check for `JWT Expired` errors. Local storage may contain a stale session from a different Supabase project. Use the **"Force Reset Session"** button.

## 8. Logging & Debug Signals in Local Mode
Local development logs are significantly more verbose than production:
- `[medHist] Registry Sync`: Logs every time the family board refreshes.
- `[medHist] Identity Guard`: Logs name-matching scores between AI and DB.
- **Level**: We use `console.group` for extraction cycles. If the group doesn't close, an async error likely occurred in the `pdfjs.getDocument` promise.

## 9. Common Debugging Scenarios

| Scenario | Check First |
| :--- | :--- |
| **Malformed Output** | Check if the model is appending conversational text. Use `repairJson` utility. |
| **App Local OK, Prod Fail** | Check Supabase CORS settings and API domain restrictions. |
| **Behavior Change** | Google may have updated the `gemini-3-flash-preview` weights. Regression test with `SAMPLE_REPORTS.md`. |
| **Storage 404** | Ensure the bucket `medical-reports` is created and the `family_id` folder exists. |

## 10. Notes for Future Maintainers
- **The Worker Trap**: If you update `pdfjs-dist` in `package.json`, you **must** update the version string in `index.tsx`. If they drift, the worker will fail to load from the CDN, and PDF uploads will hang indefinitely.
- **Stale Context**: The `HealthAssistant` system prompt is built once per session. If you add a new family member, you must refresh the page for the chatbot to "know" about them.
- **Identity Guard Noise**: If the guard is too sensitive locally, check the name-cleaning regex in `supabaseService.ts`.

---
*medHist Local Setup Specs v1.3.1*