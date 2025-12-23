# medHist: Your Family's Medical Timeline (v0.6.1)

medHist is a secure, family-focused web application that allows families to upload medical reports (PDFs/images). It uses Google Gemini AI to automatically extract key details (diagnosis, doctor, date, medications, appointments) and creates a chronological clinical timeline for every family member.

## Project Status: v0.6.1 (Experimental Rendering Fix)
*   **Architecture**: Family Group Model (Multi-tenant).
*   **Latest Fixes**: Implemented **Resolution Throttling** (`devicePixelRatio={1}`) to solve memory crashes on High-DPI mobile screens (e.g., iPhone/Samsung OLEDs). This fixes the "Preview Unavailable" error for small PDFs.
*   **Status**: Experimental release for mobile verification.

## Features

### 📱 Mobile Experience
*   **Installable App**: Works as a native app on iOS and Android via PWA technology.
*   **Offline Ready**: Caches core assets so the app loads instantly, even with spotty connection.
*   **Home Screen Icon**: Dedicated app icon for quick access.
*   **Optimized Rendering**: Forced 1x resolution rendering for PDFs to maintain stability on low-RAM mobile devices.

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
