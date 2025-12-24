# FINAL STABLE CHECKPOINT: v0.7.0 (Gold)

**Date:** 2024-05-29
**Status:** Frozen Stable Release

This version represents the "Gold Master" of the medHist application, specifically optimized for production deployment on Vercel with full mobile and desktop compatibility.

---

## 🏗 Frozen Architecture

1.  **Bulletproof PDF Engine**
    *   **Dynamic Resolution:** Detects runtime PDF.js API version and fetches 1:1 matching worker from `unpkg` (the NPM registry mirror).
    *   **Memory Throttling:** Detects `isTouchDevice` (mobile/tablet) and forces `devicePixelRatio={1}` to prevent canvas memory overflows.
    *   **Unified Imports:** Strict dependency pinning in `package.json` and `index.html` to prevent esm.sh version fragmentation.

2.  **Auth & Sync Resilience**
    *   **Infinite Loop Guard:** `App.tsx` uses `loadedForUserId` ref to prevent redundant sync calls during auth state transitions.
    *   **Aggressive Boot:** Supabase profile polling is capped and optimized (500ms intervals) for fast dashboard loading.

3.  **Cross-Platform PWA**
    *   Service worker auto-update enabled.
    *   Immediate cache-busting for assets to prevent "stale version" crashes.
    *   High-res SVG iconography for iOS/Android home screen.

---

## 💾 Version Strings
- **NPM Package:** 0.7.0
- **App Footer:** v0.7.0
- **PDF Engine:** Dynamic (Synced to unpkg)
