# medHist: Your Family's Medical Timeline (v0.6.2)

medHist is a secure, family-focused web application that allows families to upload medical reports (PDFs/images). It uses Google Gemini AI to automatically extract key details (diagnosis, doctor, date, medications, appointments) and creates a chronological clinical timeline for every family member.

## Project Status: v0.6.2 (Stabilization Release)
*   **Architecture**: Family Group Model (Multi-tenant).
*   **Latest Fixes**: Resolved Auth race conditions (SIGNED_OUT/SIGNED_IN flip-flop) that caused mobile crashes. Fixed "Failed to fetch dynamically imported module" errors by stabilizing bundle imports and dependency resolution.
*   **Status**: Production-hardened release for mobile and web.

## Features

### 📱 Mobile Experience
*   **Installable App**: Works as a native app on iOS and Android via PWA technology.
*   **Offline Ready**: Caches core assets so the app loads instantly, even with spotty connection.
*   **Forced Stability**: Removed dynamic splitting for critical components to ensure offline reliability.

### 🧠 AI & Automation
*   **AI Health Assistant**: A conversational chat interface that knows your family's medical history.
*   **Smart Report Extraction**: Automatic extraction of Summary, Doctor, Date, Medications, and Follow-up Appointments.

### 🏥 Clinical Management
*   **Doctor Briefs**: Generate high-quality PDF summaries for visits.
*   **Secure Sharing**: Generate 24-hour secure links to share specific reports.
*   **Appointment Reminders**: Dashboard alert section showing upcoming visits.

## Environment Variables

| Variable | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Public (Anon) Key |
| `API_KEY` | Your Google Gemini API Key |

## Tech Stack
*   **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
*   **AI**: Google Gemini API (`gemini-3-flash-preview`)
*   **Backend**: Supabase (Auth, DB, Storage)
*   **PDF**: React-PDF + PDF.js (Pinned v4.8.69)
