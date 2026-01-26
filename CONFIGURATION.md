# Configuration & Environment Documentation

## 1. Purpose of Configuration Management
In **medHist**, configuration is externalized to ensure the application remains portable, secure, and adaptable to clinical data requirements without requiring code changes.

- **Security (PII Protection)**: Medical data and API keys are strictly externalized to prevent accidental exposure via source control.
- **Provider Agility**: External configuration allows for swapping Gemini model versions or Supabase project instances (e.g., moving from a development to a production database) by simply updating environment variables.
- **Environment Specifics**: Behavior such as PDF rendering DPI and AI "Thinking" budgets vary between local testing and production mobile environments.

**Risks of Hardcoding**: Hardcoding credentials results in a "Static Vault" that cannot be rotated, violating clinical security standards and making the application impossible to deploy across isolated family tenants.

## 2. Environments Overview

| Environment | Intended Usage | Data Isolation |
| :--- | :--- | :--- |
| **Local Development** | Active feature development and UI testing. | Uses a dedicated "Dev" Supabase project. Local storage is cleared frequently. |
| **Staging / Preview** | Validation of AI extraction logic against `SAMPLE_REPORTS.md`. | Isolated project mirroring Production RLS policies. No real patient data allowed. |
| **Production** | Live family medical registry. | Strict Row Level Security (RLS). High-integrity storage with daily backups. |

## 3. Environment Variables Overview
Configuration is divided into three functional categories:
1. **Identity & Persistence (Supabase)**: Controls where files and clinical records are stored.
2. **Intelligence (Google Gemini)**: Controls the extraction engine and the health assistant.
3. **Build Infrastructure**: Variables injected via Vite for browser-side access.

**Required Status**: All variables marked "Yes" are required for a "Warm Boot." Missing variables will trigger the "Registry Access Restricted" recovery screen in `App.tsx`.

## 4. Detailed Environment Variables Reference

| Variable Name | Environment(s) | Description | Example | Required | Impact if Missing/Incorrect |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `API_KEY` | All | Google Gemini API Key. | `AIzaSy...` | **Yes** | AI Extraction fails; Assistant becomes unresponsive. |
| `VITE_SUPABASE_URL` | All | Supabase Project URL. | `https://xyz.supabase.co` | **Yes** | **HIGH BLAST RADIUS**: App fails to boot; 404 on all data. |
| `VITE_SUPABASE_ANON_KEY` | All | Public API key for Supabase. | `eyJhbG...` | **Yes** | **HIGH BLAST RADIUS**: Auth login fails; RLS blocks all data. |
| `NODE_ENV` | All | Standard environment flag. | `production` | No | Defaults to production; minor dev-tooling disabled. |

## 5. AI-Specific Configuration
AI behavior is centrally managed in `services/geminiService.ts`.

- **Model (`gemini-3-flash-preview`)**: Chosen for the "Sub-4-Second" extraction target.
- **Temperature (1.0)**: Set high to allow the model to use clinical reasoning to "Infer" medication purposes.
- **Max Tokens (2048)**: Sufficient for clinical briefs. Reducing this may truncate medication lists in long reports.
- **Fragile Value**: The `responseSchema` is tightly coupled with `types.ts`. Changing a key in the schema without updating the interface will break the `robustJsonParse` logic.

## 6. Database & Backend Configuration
- **Storage Bucket (`medical-reports`)**: This bucket **must** be created manually in Supabase and set to "Private".
- **Implicit Assumption**: The system assumes RLS is enabled on all tables. If RLS is disabled via the dashboard, the "Family Isolation" logic is completely bypassed regardless of code.
- **Secret Rotation**: Rotating the `ANON_KEY` requires a full frontend redeploy, as it is bundled into the client build.

## 7. Frontend / Client-Side Configuration
- **Vite Injection**: Variables prefixed with `VITE_` are exposed to the client-side bundle. 
- **Public Exposure**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are safe for public exposure as they are governed by RLS.
- **Private Risks**: The `API_KEY` is injected at build-time. It should be restricted in the Google Cloud Console to specific referrer domains.

## 8. Secrets Management Strategy
- **Local**: Stored in `.env` (excluded from Git).
- **Production**: Set via CI/CD provider (Vercel/Netlify/Github Actions) secrets.
- **The `credentials.ts` Pattern**: Serves as a "Hardcoded Fallback" for restricted environments. **Do not commit actual keys here.**

## 9. Configuration Validation & Error Handling
- **Startup Validation**: `App.tsx` performs a "Secure Handshake" on load. If Supabase cannot initialize, the app enters a "Rescue" state.
- **Runtime Validation**: `geminiService` uses `withRetry`. If the `API_KEY` is invalid (401), the service returns `createFallbackData`, allowing the user to see a "Draft" even if AI fails.

## 10. Deployment & Environment Setup Flow
1. **Supabase**: Create project -> Run `schema.sql` -> Create `medical-reports` bucket (Private).
2. **AI**: Obtain Gemini API Key from Google AI Studio.
3. **Local Config**: Copy `.env.example` to `.env`.
4. **Deploy**: Set variables in hosting provider dashboard -> `npm run build`.

## 11. Common Pitfalls & Debugging Tips
- **CORS Errors**: Check Supabase Dashboard -> API -> CORS. Ensure your deployment URL is whitelisted.
- **403 Forbidden (Storage)**: Occurs when the `STORAGE_BUCKET` name in code does not match the dashboard exactly.
- **Empty Timeline**: Usually indicates the app is pointing to an empty "Dev" project instead of "Prod".

## 12. Configuration Change Guidelines
- **Safe to Change**: `summary` length constraints, `MEMBER_COLORS` palette.
- **Requires Redeploy**: Any change to `VITE_` variables or `API_KEY`.
- **Requires Regression**: Changing the `responseSchema` or AI model version.

## 13. Known Limitations & Trade-offs
- **Static Build Config**: Variables are baked at build-time. Changing the DB endpoint requires a full rebuild.
- **Browser-Side AI**: Making AI calls from the browser exposes the `API_KEY`. Referral-site restrictions are mandatory.

## 14. Notes for Future Maintainers (Fragility Audit)

### 🚩 Fragile Configuration Values
- **`STORAGE_BUCKET` Name**: Hardcoded as `medical-reports`. If the bucket is renamed in Supabase, the app will fail to upload or download all records.
- **`pdfjs.version`**: Hardcoded in `index.tsx`. Must match the `package.json` exactly or the worker script will fail to load from the CDN.

### 💥 High Blast Radius Settings
- **`VITE_SUPABASE_ANON_KEY`**: If misconfigured, the entire user base is locked out of their medical data.
- **`API_KEY`**: If the key reaches its rate limit or is revoked, the core value proposition (AI Extraction) is disabled globally.

### ❓ Implicit Assumptions (No Validation)
- **Bucket Visibility**: The code assumes the bucket is **Private**. If a maintainer accidentally sets it to Public, medical data becomes accessible to anyone with the file path.
- **Browser Capability**: Assumes the client browser supports `atob/btoa` and WASM (required for PDF.js). Old mobile browsers will fail silently.

---
*medHist Configuration Specification v1.3.1*