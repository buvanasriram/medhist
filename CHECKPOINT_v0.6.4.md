# System Checkpoint: v0.6.4
**Date:** 2024-05-25
**Status:** Version Parity Release

This checkpoint marks the **v0.6.4 Release**, fixing the PDF.js API vs Worker version mismatch.

---

## 🚀 Key Improvements in v0.6.4

1.  **PDF Version Parity**
    *   **The Problem:** Browsers were pulling the 5.x API from esm.sh but using the 4.x Worker from cdnjs, causing an `UnknownErrorException`.
    *   **The Fix:** Updated `index.html` import map to pin *everything* to `4.8.69` and updated `index.tsx` to pull the worker from the same `esm.sh` bundle.

2.  **Stable Dependencies**
    *   Pinned `pdfjs-dist` to an exact version in `package.json` (no caret).
    *   Aligned React versions across `index.html` and `package.json`.

3.  **App Resilience**
    *   Retained the loop protection and memory optimization (1x DPI for mobile) from v0.6.3.

---

## 💾 Version Strings Updated
- `package.json`: 0.6.4
- `README.md`: 0.6.4
- `DashboardView.tsx` Footer: v0.6.4
