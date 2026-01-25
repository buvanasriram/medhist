
# GOLD MASTER CHECKPOINT: v1.3.1

**Date:** 2025-05-31
**Status:** Frozen Stable / Gold Master (High Integrity)

This version is the official **v1.3.1 Stable Release** of medHist. It incorporates all critical stabilization fixes, clinical data integrity improvements, and UI/UX refinements gathered during the development lifecycle up to the Harmony branch.

---

## 🚀 Stable Feature Set

1.  **High Integrity Medication Engine (v1.3.1)**
    *   **No-Filter Restoration**: Every medication found in a report is added to the registry. De-duplication is handled by the user to ensure 100% data fidelity.
    *   **Salvage Mode Parser**: AI failures (chatty responses) trigger a Regex Scraper to extract medication names even from malformed JSON.

2.  **Integrated Identity Guard**
    *   **Contextual Warnings**: Name mismatch alerts are integrated directly into Timeline cards, allowing for single-click confirmation and auto-linking.
    *   **Fuzzy Matching**: Smarter name comparison that ignores common titles (Mr., Mrs., Dr.) for smoother verification.

3.  **Gold Master PDF Engine**
    *   **DPI Throttling**: Auto-detects mobile devices and caps canvas resolution to prevent browser memory crashes.
    *   **Registry Locking**: Dynamic worker synchronization to ensure matching API/Worker versions in all environments.

4.  **Clinical Dashboard & Timeline**
    *   **Family Board**: High-density management of multiple patient folders.
    *   **Timeline Toggles**: Switch between Compact and Standard views.
    *   **Search**: Global keyword search across all records.

5.  **Health Assistant**
    *   **Deep Linking**: AI responses provide direct clickable buttons to open clinical records.
    *   **Family Context**: Context-aware queries across all members.

---

## 💾 Technical Baseline
- **Supabase**: Auth, Storage (medical-reports), RLS enabled.
- **Gemini AI**: `gemini-3-flash-preview` with structured output.
- **PDF.js**: v4.8.69 (Dynamic alignment via unpkg).
- **Versioning**: NPM 1.3.1 / UI v1.3.1.

---
*medHist v1.3.1: Precision records for peace of mind.*
