# System Checkpoint: v0.6.5
**Date:** 2024-05-26
**Status:** Strict Version Lockdown

This checkpoint marks the **v0.6.5 Release**, addressing persistent version mismatch errors in the PDF rendering engine.

---

## 🚀 Key Improvements in v0.6.5

1.  **Strict Import Mapping**
    *   **The Problem:** The `importmap` was mapping `pdfjs-dist` correctly, but `react-pdf` was still resolving an internal dependency to v5.x via its own bundle.
    *   **The Fix:** Used `?external=pdfjs-dist` in the ESM.sh import for `react-pdf`. This forces the library to use the *exact* instance of PDF.js we define in the top-level import map.

2.  **Diagnostic Logging**
    *   Added `console.log` in `index.tsx` that prints the `pdfjs.version`. If you see anything other than `4.8.69`, we know the mapping failed.

3.  **Fallback CDN for Worker**
    *   Pointed `workerSrc` to `unpkg` as a high-reliability fallback to avoid any potential caching weirdness from `esm.sh` or local build artifacts.

---

## 💾 Version Strings Updated
- `package.json`: 0.6.5
- `README.md`: 0.6.5
- `DashboardView.tsx` Footer: v0.6.5
