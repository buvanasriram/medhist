# System Checkpoint: v0.6.6
**Date:** 2024-05-27
**Status:** Dynamic Parity Release

This checkpoint marks the **v0.6.6 Release**, resolving the hard-lock versioning issues that caused app failures on Vercel.

---

## 🚀 Key Improvements in v0.6.6

1.  **Dynamic PDF Worker Alignment**
    *   **The Problem:** Build environments (Vite/Vercel) were resolving the PDF.js API to v5.x, but the app was hardcoded to fetch the v4.x worker, causing an unrecoverable mismatch crash.
    *   **The Fix:** Updated `index.tsx` to read `pdfjs.version` at runtime and construct the worker URL dynamically.
    *   **The Result:** The worker will always match the API version, regardless of which version is bundled by the build system.

2.  **Auth Boot Stabilization**
    *   **The Problem:** Users reported the app "not opening." This was linked to a slow retry loop in `getUserData` that could hang the UI for 12+ seconds.
    *   **The Fix:** Refined the polling logic in `supabaseService.ts` to be more aggressive (500ms intervals) and capped it more effectively.

3.  **CDN Optimization**
    *   Standardized on `cdnjs` for production worker assets to minimize latency on Vercel deployments.

---

## 💾 Version Strings Updated
- `package.json`: 0.6.6
- `README.md`: 0.6.6
- `DashboardView.tsx` Footer: v0.6.6
