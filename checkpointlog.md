# medHist: Universal Development Ledger (v0.3.0 - v1.3.1)

This log contains the complete chronological history of architectural decisions, feature releases, and clinical logic patches.

---

## CHECKPOINT: v0.3.0 - Foundation
**Status:** Alpha Baseline

### Accomplishments
- Initialized React 19 + Tailwind project.
- Configured Supabase Auth (Sign up / Login).
- Established `profiles` and `families` table relationships.
- Created "Family Board" dashboard layout with Member Cards.
- Implemented basic `AddMemberModal`.

### Technical Notes
- Using Row Level Security (RLS) to isolate family data.
- Basic routing between Auth and Dashboard.

---

## CHECKPOINT: v0.4.0 - AI Integration
**Status:** Feature Development

### Accomplishments
- Integrated **Google Gemini API** (gemini-3-flash-preview).
- Created `geminiService.ts` for clinical extraction.
- Implemented `UploadModal` with file-to-base64 conversion.
- Added support for PDF and Image uploads to Supabase Storage.
- Structured AI prompts to extract Patient Name, Doctor, and Summary.

### Technical Notes
- Implemented `withRetry` logic for AI requests to handle 503/429 errors.
- Added first pass of the `responseSchema` for structured JSON output.

---

## CHECKPOINT: v0.5.0 - Timeline & Viewer
**Status:** Feature Development

### Accomplishments
- Built the **TimelineView** component.
- Implemented `TimelineItem` with expandable summaries.
- Created the **ReportViewerModal** using `react-pdf`.
- Added Zoom and Page navigation controls for clinical reports.
- Implemented 24-hour temporary signed URLs for report sharing.

### Technical Notes
- Switched to `react-pdf` for better mobile rendering of medical documents.
- Integrated `pdfjs-dist` for client-side text extraction (PDF to AI).

---

## CHECKPOINT: v0.5.1 - Clinical Logic Patch
**Status:** Logic Stabilization

### Accomplishments
- Improved Medication Extraction (AI now infers purpose if missing).
- Added "Mismatch Detection" logic to alert if a report belongs to another family member.
- Implemented `ignoreMismatch` to allow manual linking.
- Added automatic Follow-up date detection.

### Technical Notes
- Refined regex for name cleaning (ignores common prefixes like Mr/Mrs/Dr).

---

## CHECKPOINT: v0.6.0 - Mobile Optimization
**Status:** UX Stabilization

### Accomplishments
- Optimized Timeline for mobile (Compact Mode).
- Fixed PDF rendering crashes on high-DPI (iOS) devices.
- Implemented Registry-Locking for PDF.js Workers.
- Added **Health Assistant** (Chatbot) floating UI.

### Technical Notes
- Introduced `devicePixelRatio` throttling for canvas rendering.
- Fixed auth race condition during high-latency boot sequences.

---

## BASELINE: v0.6.0 - Production Readiness
Summary of the project state before the "Pharmacy Registry" expansion.
- Auth: Stable
- Storage: Stable
- Extraction: 85% Accuracy
- UI: Mobile-First

---

## CHECKPOINT: v0.6.1 - UI Refinement
- Added `EditMemberModal`.
- Improved icon consistency across Dashboard and Timeline.
- Added "Relationship" labels to Member Cards.

---

## CHECKPOINT: v0.6.2 - Identity Guard Fix
- Integrated "Name Mismatch" warnings directly into Timeline cards.
- Removed redundant "Purge" buttons to prevent user confusion.
- Added "Confirm Match" button for quick overrides.

---

## CHECKPOINT: v0.6.3 - PWA Prep
- Added `manifest.json` and basic Service Worker registration.
- Optimized image assets for app icons.
- Added "Add to Home Screen" instructions for iOS users.

---

## CHECKPOINT: v0.6.4 - Error Handling
- Added robust error boundaries for the PDF Viewer.
- Implemented "Rescue" timer on boot for stalled auth sessions.
- Added "Force Reset Session" button on login screen.

---

## CHECKPOINT: v0.6.5 - Medication Logic
- Separated "Active" and "Stopped" medications.
- Added `stopped_at` timestamp for historical medical accuracy.
- Improved "Hard Delete" safety with confirmation modals.

---

## CHECKPOINT: v0.6.6 - AI Chat Deep Linking
- Assistant now returns `[VIEW:Title:ID]` buttons.
- Implemented fuzzy UUID matching for truncated AI references.
- Added "Family Context" to system instructions for chatbot.

---

## CHECKPOINT: v0.6.8 - Gold Master Candidate
- Finalized Registry-Lock logic for PDF.js (v4.8.69).
- Synchronized all version strings.
- Performed full mobile audit (Android/iOS).

---

## FINAL STABLE: v0.7.0 (Harmony)
The last major version before the **v1.0.0 Global Release**.
- All critical memory leaks in PDF rendering resolved.
- AI JSON salvage mode implemented (robust to partial failures).
- Supabase RLS policies audited and locked.

---

## GOLD MASTER CHECKPOINT: v1.0.0
**Date:** 2025-05-30
**Status:** Frozen Stable / Gold Master

1. **Resilient Medication Engine**: No-filter restoration + Salvage Mode Parser.
2. **Integrated Identity Guard**: Contextual warnings directly on Timeline cards.
3. **Gold Master PDF Engine**: DPI Throttling + Registry Locking.
4. **Clinical Dashboard**: High-density member management.
5. **Health Assistant**: Deep linking to clinical records.

---

## GOLD MASTER CHECKPOINT: v1.3.1
**Date:** 2025-05-31
**Status:** High Integrity Release

Finalized Harmony branch with optimized mobile performance and reinforced clinical data safety protocols.
