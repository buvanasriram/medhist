# medHist: Your Family's Medical Timeline (v0.5.1)

medHist is a secure, family-focused web application that allows families to upload medical reports (PDFs/images). It uses Google Gemini AI to automatically extract key details (diagnosis, doctor, date, medications, appointments) and creates a chronological clinical timeline for every family member.

## Project Status: v0.5.1 (Stable)
*   **Architecture**: Family Group Model (Multi-tenant).
*   **Latest Fixes**: Resolved PDF version mismatch errors and enhanced Supabase storage path hunting logic for high reliability with special characters/spaces in filenames.
*   **Status**: Production-ready stable release.

## Features

### 📱 Mobile Experience
*   **Installable App**: Works as a native app on iOS and Android via PWA technology.
*   **Offline Ready**: Caches core assets so the app loads instantly, even with spotty connection.
*   **Home Screen Icon**: Dedicated app icon for quick access.

### 👤 Profile Management
*   **Edit Details**: Update names, relationships, and birth dates for any family member.
*   **Email Update**: Securely update your login email address (with confirmation flow).

### 🧠 AI & Automation
*   **AI Health Assistant**: A conversational chat interface that knows your family's medical history.
*   **Smart Report Extraction**: Automatic extraction of Summary, Doctor, Date, Medications, and Follow-up Appointments.
*   **Medication Intelligence**: Auto-detects dosage, frequency, and infers medical purpose.

### 🏥 Clinical Management
*   **Doctor Visit Organizer**: Dedicated "Visits" tab in timeline to track consultations.
*   **Appointment Reminders**: Dashboard alert section showing upcoming visits.
*   **Secure Sharing**: Generate 24-hour secure links to share specific reports.

### 🏠 Family Hub
*   **Family Health Board**: At-a-glance dashboard showing status, age, and active meds.
*   **Medication Manager**: Track active vs. stopped medications with history view.

## Technical Improvements in v0.5.1
*   **PDF.js Pinning**: Fixed `API version mismatch` errors by pinning `pdfjs-dist` to `4.8.69` across the worker and the main bundle.
*   **Storage Robustness**: Implemented a "multi-stage path hunting" logic in `supabaseService.ts` to handle URL encoding differences for files with spaces or special characters.
*   **Bucket Alignment**: Standardized all storage operations on the `medical-reports` bucket.

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