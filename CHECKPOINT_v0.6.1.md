# System Checkpoint: v0.6.1
**Date:** 2024-05-22
**Status:** Experimental Mobile Rendering Fix

This checkpoint contains the **v0.6.1 Resolution Throttling** experimental fix.

---

## 🚀 Improvements in v0.6.1 (Experimental)

1.  **Fixed "Preview Unavailable" on High-DPI Mobiles**
    *   **Logic:** Added `devicePixelRatio={1}` to the PDF Page component.
    *   **Why:** High-resolution mobile screens (OLED/Retina) default to 3x canvas scaling, which quickly exceeds browser memory limits for even small PDFs. Forcing 1x scaling ensures the PDF renders successfully without crashing the browser's graphics layer.

2.  **Auth Baseline**
    *   Retains the "Instant Logout" and "Auth State Guard" from v0.6.0.

---

## 🛠 Revert Instructions
If this version causes blurry text or new rendering bugs, revert to **Baseline v0.6.0** by removing the `devicePixelRatio={1}` line from `ReportViewerModal.tsx`.
