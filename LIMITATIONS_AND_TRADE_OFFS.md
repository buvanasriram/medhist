# Known Limitations & Trade-offs

## 1. Architectural Trade-offs

- **"No-Backend" Client-Side Direct Access**: We chose a direct Client-to-Supabase/Gemini architecture over a dedicated Node.js/Python middleware.
    - **Why**: To achieve a "Sub-4-Second" extraction target and minimize operational overhead.
    - **Benefits**: Near-zero server latency, lower hosting costs, and reduced architectural complexity.
    - **Limitations**: Exposes API keys to the client (mitigated by domain-level restrictions) and forces heavy computational work (PDF parsing, Base64 transcoding) onto the user's browser, which can strain low-end mobile devices.

- **Client-Side PDF Rendering (PDF.js)**: We chose to render PDFs in the browser using a Canvas-based approach rather than server-side image generation.
    - **Why**: To maintain clinical privacy by not sending raw files to a middle-tier server and to enable offline-first viewing.
    - **Benefits**: Instant page flipping and zooming without network round-trips.
    - **Limitations**: High memory consumption on mobile. We had to implement "DPI Throttling" to prevent iOS Safari from crashing on high-resolution medical documents.

- **Family-Based Multi-Tenancy**: We chose a `family_id` grouping model over an individual-user-access model.
    - **Why**: Medical care, especially for children and the elderly, is collaborative.
    - **Benefits**: Simplifies sharing within a household.
    - **Limitations**: Granular privacy (e.g., hiding one specific record from a spouse) is currently not supported without a major schema redesign.

## 2. AI-Specific Limitations

- **Non-Deterministic Extraction**: While we use JSON Mode, the model may occasionally hallucinate clinical "Purpose" or misread handwritten dates.
    - **Reliability Gap**: AI is not a source of truth for dosages. It is a data-entry accelerator. Users must verify every "Draft" before clinical use.
- **Context Window Truncation**: We truncate PDF text at 8,000 characters.
    - **Impact**: In extremely long reports (20+ pages), clinical details buried in the middle may be lost. We prioritize the "Plan" usually found at the end.
- **UUID Brittleness in Chat**: The Health Assistant relies on correctly repeating 36-character UUIDs for deep-linking.
    - **Failure Case**: If the model truncates an ID by one character, the "View Report" button will fail. We implemented fuzzy matching to mitigate this, but it is not 100% reliable.

## 3. Current Shortcuts & Simplifications

- **Identity Guard Regex**: We use simple string-distance and prefix-stripping (e.g., ignoring "Mr.") to check patient names.
    - **Risk**: High-variance names (nicknames vs. legal names) will trigger frequent "Mismatch" warnings even if the folder is correct.
- **Manual Medication Restoration**: We removed automated de-duplication in v1.3.1.
    - **Why**: It was safer to provide duplicate data than to risk "shadow-deleting" a legitimate dosage change.
    - **Debt**: Users must manually manage their pharmacy list to keep it clean.
- **Hardcoded PDF.js Worker**: The version is hardcoded in `index.tsx`.
    - **Risk**: Upgrading the NPM package without updating the unpkg URL will cause a "Version Parity" crash.

## 4. Accepted Technical Debt

- **Tight Coupling of Prompts**: System instructions are currently hardcoded strings inside `geminiService.ts`.
    - **Fix**: These should eventually move to a database-driven "Prompt Registry" to allow for A/B testing without code redeploys.
- **Missing Storage Abstraction**: The code is tightly coupled to Supabase Storage paths.
    - **Fix**: If we ever move to S3 or Google Cloud Storage, every file-path reference in the UI will require refactoring.
- **Limited Unit Test Coverage**: Testing is currently focused on "Integration Vibe Checks" rather than granular unit tests for the robust JSON parser.

## 5. Constraints Imposed by Tools & Platforms

- **Browser Memory (iOS Safari)**: The strict RAM limits on mobile browsers constrain how many high-resolution PDFs can be "cached" in memory at once.
- **Supabase RLS Latency**: As the timeline grows to thousands of entries, the recursive RLS checks (`EXISTS` queries) may become a performance bottleneck.
- **Google Search Grounding**: Currently disabled to maintain predictable latency, though the model supports it.

## 6. Things That Should Not Be Changed Lightly

- **`DOC_ID` Tag Format**: The `[VIEW:Title:ID]` pattern is the only way the chatbot interacts with the UI. Changing this requires a coordinated update to the System Prompt and the `renderMessageText` logic.
- **`responseSchema` Keys**: The keys `date`, `summary`, and `medications` are the bridge between AI and DB. Changing one without a database migration will lead to empty registry entries.
- **Registry Lock (index.tsx)**: The PDF worker synchronization logic is fragile but necessary for PWA stability.

## 7. Future Refactor Triggers

- **High Token Costs**: If Assistant costs per user spike, we must refactor to a **RAG (Retrieval Augmented Generation)** architecture using Vector Embeddings.
- **Identity Failure Rates**: If users report the "Identity Guard" is too noisy, we must move to a more advanced fuzzy-matching library (e.g., Fuse.js).
- **Offline Sync Conflicts**: If we move to true "Offline Edit" mode, we will need to replace the simple `onRefreshData` logic with a conflict-resolution engine (CRDTs).

---
*medHist Technical Documentation v1.3.1*