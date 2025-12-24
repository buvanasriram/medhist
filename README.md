# medHist: Your Family's Medical Timeline (v0.6.3)

medHist is a secure, family-focused web application that allows families to upload medical reports (PDFs/images). It uses Google Gemini AI to automatically extract key details (diagnosis, doctor, date, medications, appointments) and creates a chronological clinical timeline for every family member.

## Project Status: v0.6.3 (Hard Stabilization)
*   **Architecture**: Family Group Model (Multi-tenant).
*   **Latest Fixes**: 
    *   **Loop Fix**: Resolved infinite re-renders in `App.tsx` by correcting `useEffect` dependencies.
    *   **DPI Fix**: Conditional DPI scaling for PDFs (throttled on mobile only) to maximize quality on laptop while preserving stability on mobile.
    *   **Worker Fix**: Exact pinning of PDF.js worker across all layers.
*   **Status**: Production-ready.

## Tech Stack
*   **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
*   **AI**: Google Gemini API (`gemini-3-flash-preview`)
*   **Backend**: Supabase (Auth, DB, Storage)
*   **PDF**: React-PDF + PDF.js (Pinned v4.8.69)
