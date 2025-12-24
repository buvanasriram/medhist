# medHist: Your Family's Medical Timeline (v0.6.5)

medHist is a secure, family-focused web application that allows families to upload medical reports (PDFs/images). It uses Google Gemini AI to automatically extract key details (diagnosis, doctor, date, medications, appointments) and creates a chronological clinical timeline for every family member.

## Project Status: v0.6.5 (Strict Version Lockdown)
*   **Architecture**: Family Group Model (Multi-tenant).
*   **Latest Fixes**: 
    *   **PDF Strict Parity**: Resolved persistent "API mismatch" by using `?external` resolution in the import map. This prevents the library from silently pulling a newer, incompatible version of PDF.js.
    *   **Diagnostic Logging**: Added console logging for PDF.js versions to assist in debugging future environment-specific issues.
*   **Status**: Production-ready.

## Tech Stack
*   **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
*   **AI**: Google Gemini API (`gemini-3-flash-preview`)
*   **Backend**: Supabase (Auth, DB, Storage)
*   **PDF**: React-PDF + PDF.js (Pinned v4.8.69)
