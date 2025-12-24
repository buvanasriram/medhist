# System Checkpoint: v0.6.3
**Date:** 2024-05-24
**Status:** Hard Stabilization Release

This checkpoint marks the **v0.6.3 Release**, resolving the infinite auth loop and PDF rendering crashes.

---

## 🚀 Key Improvements in v0.6.3

1.  **Infinite Loop Fixed**
    *   Identified root cause: `useEffect` dependency on `familyMembers.length` in `App.tsx`.
    *   Resolution: Removed the dependency and implemented `loadedForUserId` ref to prevent redundant API calls during auth state transitions.

2.  **PDF Worker Alignment**
    *   Centralized PDF worker to `cdnjs` for exact version pinning (`4.8.69`). This prevents "Worker Mismatch" errors common in hybrid local/CDN environments.

3.  **Smart DPI Scaling**
    *   Implemented `isTouchDevice` detection in `ReportViewerModal.tsx`.
    *   **Mobile/Tablet:** Forced to 1x DPI to prevent browser canvas memory overflows.
    *   **Laptop/Desktop:** Uses system default (2x+) for crisp, high-resolution viewing.

4.  **UI Feedback**
    *   Updated footer and version strings to `v0.6.3`.
    *   Enhanced "Sync Error" screen with a clear path to Log Out and retry.

---

## 💾 Version Strings Updated
- `package.json`: 0.6.3
- `README.md`: 0.6.3
- `DashboardView.tsx` Footer: v0.6.3
