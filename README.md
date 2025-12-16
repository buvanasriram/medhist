
# medHist: Your Family's Medical Timeline (v0.5.0)

medHist is a secure, family-focused web application that allows families to upload medical reports (PDFs/images). It uses Google Gemini AI to automatically extract key details (diagnosis, doctor, date, medications, appointments) and creates a chronological clinical timeline for every family member.

## Project Status: v0.5.0
*   **Architecture**: Family Group Model (Multi-tenant).
*   **New Features**: **Progressive Web App (PWA)**, Profile & Email Editing, AI Health Assistant.
*   **Status**: Stable release.

## Features

### 📱 Mobile Experience (New in v0.5.0)
*   **Installable App**: Works as a native app on iOS and Android via PWA technology.
*   **Offline Ready**: Caches core assets so the app loads instantly, even with spotty connection.
*   **Home Screen Icon**: Dedicated app icon for quick access.

### 👤 Profile Management (New in v0.5.0)
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

## Testing

We support two types of testing depending on your environment.

### 1. Unit Tests (Works in Cloud/AI Studio)
Use this if you are in the online editor. It tests the logic functions without needing a browser.
```bash
npm run test
```

### 2. End-to-End Tests (Requires Local Machine)
Use this if you have downloaded the code. It launches a real browser to test the full app experience.
```bash
# 1. Install Browsers (Run once)
npx playwright install

# 2. Generate Test PDF (Ensure 'npm run dev' is running)
npm run gen:pdf

# 3. Run Tests
npm run test:e2e
```

## Deployment on Netlify/Vercel

1.  Connect your GitHub repository.
2.  **Build Command:** `npm run build`
3.  **Publish Directory:** `dist`
4.  Add Environment Variables in site settings.
5.  Deploy!

## Tech Stack

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS
*   **Mobile/PWA**: Vite PWA Plugin, Service Workers
*   **AI**: Google Gemini API (`@google/genai`)
*   **Backend/Auth/Storage**: Supabase
*   **PDF Handling**: React-PDF, PDF.js
