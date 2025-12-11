# medHist: Your Family's Medical Timeline (v0.4.0)

medHist is a secure, family-focused web application that allows families to upload medical reports (PDFs/images). It uses Google Gemini AI to automatically extract key details (diagnosis, doctor, date, medications, appointments) and creates a chronological clinical timeline for every family member.

## Project Status: v0.4.0
*   **Architecture**: Family Group Model (Multi-tenant).
*   **New Features**: AI Health Assistant, Doctor Visit Organizer, Secure Sharing.
*   **Status**: Stable release.

## Features

### 🧠 AI & Automation
*   **AI Health Assistant (New)**: A conversational chat interface that knows your family's medical history. Ask "What meds is Dad on?" or "Show me Mom's last blood test."
*   **Smart Report Extraction**: Automatic extraction of Summary, Doctor, Date, Medications, and **Follow-up Appointments**.
*   **Medication Intelligence**: Auto-detects dosage, frequency, start dates, and infers the medical purpose (e.g., "for Hypertension").

### 🏥 Clinical Management
*   **Doctor Visit Organizer (New)**: Dedicated "Visits" tab in timeline to track consultations and prescriptions.
*   **Appointment Reminders (New)**: Dashboard alerts for upcoming follow-up visits detected from reports.
*   **Secure Sharing (New)**: Generate 24-hour secure links to share specific reports with doctors via text/email.

### 🏠 Family Hub
*   **Family Health Board**: At-a-glance dashboard showing status, age, and active meds for all members.
*   **Medication Manager**: Track active vs. stopped medications with history view.
*   **Global Search**: Instantly find reports by keyword, doctor, or type.

## Environment Variables

To run this project, you need to set up the following environment variables.

**Local Development:**
You can put these in `credentials.ts` (for preview) or a `.env` file.

**Deployment (Netlify/Vercel):**
Add these in the project settings under "Environment Variables".

| Variable | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Public (Anon) Key |
| `API_KEY` | Your Google Gemini API Key |

## Development

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Start the development server:
    ```bash
    npm run dev
    ```

## Deployment on Netlify/Vercel

1.  Connect your GitHub repository.
2.  **Build Command:** `npm run build`
3.  **Publish Directory:** `dist`
4.  Add Environment Variables in site settings.
5.  Deploy!

## Tech Stack

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS
*   **AI**: Google Gemini API (`@google/genai`)
*   **Backend/Auth/Storage**: Supabase
*   **PDF Handling**: React-PDF, PDF.js