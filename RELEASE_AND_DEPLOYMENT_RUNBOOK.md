## Release & Deployment Runbook

This document serves as the authoritative guide for deploying, migrating, and maintaining the **medHist** application. It assumes a "No-Backend" architecture where the frontend interacts directly with Supabase and Google Gemini.

---

### 1. Build & Deployment Steps

#### Prerequisites
*   **Node.js**: 20.x (LTS) or higher.
*   **Supabase CLI**: Installed and authenticated (`supabase login`).
*   **Environment Secrets**: 
    *   `API_KEY`: Google Gemini API Key.
    *   `VITE_SUPABASE_URL`: Project URL.
    *   `VITE_SUPABASE_ANON_KEY`: Project Anon/Public Key.

#### Local Build Process
1.  **Install**: `npm install`
2.  **Lint**: `npm run lint` (Ensure code integrity before build).
3.  **Build**: `npm run build`
    *   *Note*: The build process injects `process.env` variables into the static bundle. **Environment variables must be present during the build step.**

#### Deployment Process
*   **Frontend (Static Hosting)**:
    1.  Push code to the `main` branch.
    2.  CI/CD (Vercel/Netlify) triggers `npm run build`.
    3.  The `dist` folder is served. 
    4.  **PWA Update**: The `VitePWA` plugin is configured for `autoUpdate`. Users will receive the new version on their next session.
*   **Backend (Supabase)**:
    1.  Ensure the `medical-reports` storage bucket exists and is set to **Private**.
    2.  Apply migrations using the Supabase CLI (see Section 2).

---

### 2. Supabase Migration Strategy

The application relies on Row Level Security (RLS) and specific table relationships.

#### Versioning Approach
We transition from a monolithic `schema.sql` to a **Versioned Migration Directory**:
*   Migrations live in `/supabase/migrations/`.
*   Filename format: `[timestamp]_[description].sql`.

#### Deployment Workflow
1.  **Local Changes**: Test schema changes in the Supabase local dashboard.
2.  **Generate**: `supabase db diff --file add_new_feature`
3.  **Apply to Production**: `supabase db push`

#### Breaking vs. Non-Breaking Changes
*   **Non-Breaking**: Adding a column (e.g., `doctor_notes` to `timeline_entries`) is safe to apply mid-session.
*   **Breaking**: Renaming `family_id` or modifying RLS logic. **Requires a Maintenance Window.**

#### Roll-forward Strategy
We prioritize **Roll-forward** over Roll-back for database schema. If a migration fails:
1.  Fix the migration locally.
2.  Apply the fix as a new migration.
3.  Do not attempt to delete the migration record from `_supabase_migrations`.

---

### 3. Rollback Plan

#### Frontend Rollback (Immediate)
*   **Vercel/Hosting**: Redeploy the previous "Green" build. 
*   **PWA Cache**: The `cleanupOutdatedCaches: true` flag in `vite.config.ts` ensures that when a user refreshes after a rollback, the service worker purges the buggy assets.

#### Database Rollback (High Risk)
*   **DDL Reversal**: Use `supabase db reset` with a previous snapshot only in catastrophic failure.
*   **Data Integrity**: Because users may have uploaded reports during the "Bad" window, a DB rollback risks data loss.
*   **Safe Checklist**:
    *   [ ] Backup the `timeline_entries` table as JSON before a schema change.
    *   [ ] Verify the `storage.objects` table matches the file system.

#### What Cannot Be Rolled Back Safely
*   **AI Metadata**: If the Gemini model version is upgraded and then rolled back, extractions performed during the "New" version may follow a schema that the "Old" parser cannot read.

---

### 4. Feature Flags & Configuration

#### Current Implementation
*   **Environment Flags**: We use Vite's `import.meta.env` for toggling features like "Mock Mode."
*   **Registry Locking**: The `pdfjs.version` in `index.tsx` acts as a hard configuration lock to prevent CDN drift.

#### Recommended Extension
For production scaling, we recommend moving `systemInstruction` prompts from `geminiService.ts` to a `config_registry` table in Supabase. This allows updating AI behavior without a full frontend deployment.

#### Secrets Management
*   **Google Cloud Console**: The `API_KEY` must be restricted to the production domain (e.g., `https://medhist.app/*`) and the `Generative Language API` only.
*   **Supabase**: `service_role` keys must **never** be included in the frontend bundle.

---

### 5. Operational Checklist

#### Pre-Release (The "Vibe Check")
- [ ] Run `npm run build` locally to verify PWA manifest generation.
- [ ] Verify `pdf.worker.min.mjs` loads from unpkg.
- [ ] Check RLS policies: `SELECT * FROM timeline_entries` as an anonymous user should return 0 rows.
- [ ] Test the "Rescue Mode" (throttle network to verify the 5s boot timer).

#### Post-Release Validation
- [ ] Upload `SAMPLE_REPORTS.md` to verify AI extraction accuracy hasn't drifted.
- [ ] Verify PDF Viewer zoom works on iOS Safari (Memory/DPI test).
- [ ] Check Supabase Logs for "Auth Rate Limit" errors.

#### Monitoring
*   **Supabase Dashboard**: Monitor the "API Request" volume for spikes.
*   **Google AI Studio**: Monitor "Safety Filters" triggers; if triggers spike, the system prompt may be too aggressive or hallucinating safety violations.

---
*medHist Operations Runbook v1.3.1*