# System Checkpoint: v0.6.0
**Date:** 2024-05-21
**Status:** Mobile Stability Baseline

This checkpoint marks the **v0.6.0 Mobile Stability Release**. Use this to restore the project state if rendering experiments fail.

---

## 🚀 Key Improvements in v0.6.0

1.  **Resolution Throttling (PDF Rendering)**
    *   **The Problem:** High-DPI screens (Retina/OLED) try to render canvases at 3x density, crashing mobile browsers on small 2-page PDFs.
    *   **The Fix:** Explicitly set `devicePixelRatio={1}` in the PDF Page component.
    *   **The Result:** Drastic reduction in memory usage; PDFs that previously triggered "Preview Unavailable" now load inline.

2.  **Instant Logout Workflow**
    *   **The Problem:** Mobile browsers often "hang" during distressed PDF rendering, blocking network responses and sticking the UI on "Syncing."
    *   **The Fix:** Implemented a local-first auth reset that clears memory and redirects instantly, while the server sign-out happens in the background.

3.  **Auth State Guard**
    *   Explicit `SIGNED_OUT` listener triggers that force `isLoading(false)`, preventing the infinite white-screen or syncing loop.

---

## 🛠 Stability Configuration
- **PDF Worker:** `unpkg.com` production CDN (v4.8.69).
- **React-PDF Resolution:** Fixed to 1.0 (Standard Definition).
- **Isolation:** Each PDF instance is isolated with unique URL keys.

## 💾 Version Strings Updated
- `package.json`: 0.6.0
- `README.md`: 0.6.0
- `DashboardView.tsx` Footer: v0.6.0
