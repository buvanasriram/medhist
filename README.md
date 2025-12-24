
# medHist: Your Family's Medical Timeline (v0.7.0 Stable)

medHist is a secure, family-focused web application that allows families to upload medical reports (PDFs/images). It uses Google Gemini AI to automatically extract key details (diagnosis, doctor, date, medications, appointments) and creates a chronological clinical timeline for every family member.

## Project Status: v0.7.0 (Stable Gold)
*   **Architecture**: Family Group Model (Multi-tenant).
*   **Frozen Stability**: 
    *   **Dynamic Worker Sync**: Resolved 404 and version mismatch errors by syncing the PDF worker directly to the NPM registry via `unpkg`.
    *   **Mobile Memory Management**: Specialized DPI scaling for touch devices to prevent "Preview Unavailable" errors.
    *   **Loop Protection**: Robust auth and data-sync guarding to ensure fast, reliable booting on Vercel.
*   **Status**: Production-ready / Stable.

## Tech Stack
*   **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
*   **AI**: Google Gemini API (`gemini-3-flash-preview`)
*   **Backend**: Supabase (Auth, DB, Storage)
*   **PDF**: React-PDF + PDF.js (Dynamic Versioning)
