# medHist: Your Family's Medical Timeline (v0.3.0)

medHist is a secure, family-focused web application that allows families to upload medical reports (PDFs/images). It uses Google Gemini AI to automatically extract key details (diagnosis, doctor, date) and creates a chronological clinical timeline for every family member.

## Project Status: v0.3.0
*   **Architecture**: Family Group Model (Multi-tenant).
*   **Features**: Smart Dashboard, AI Medication Tracking, Timeline Search.
*   **Status**: Stable release.

## Features

*   **Family Health Dashboard**: At-a-glance view of all family members and their status.
*   **AI-Powered Extraction**: Upload a PDF or Image, and Gemini AI extracts the summary, doctor's name, date, and medication list automatically.
*   **Medication Tracker**: AI-extracted prescriptions with manual management options (Start/Stop/History).
*   **Family Management**: Create a family group and invite members via a simplified Join Code.
*   **Secure Storage**: Files are stored securely using Supabase Storage.
*   **Global Search**: Instantly find reports by type, doctor, or keyword.

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

## Deployment on Netlify

1.  Connect your GitHub repository to Netlify.
2.  **Build Command:** `npm run build`
3.  **Publish Directory:** `dist`
4.  Go to **Site Settings > Environment Variables** and add the keys listed above.
5.  Deploy!

## Tech Stack

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS
*   **AI**: Google Gemini API (`@google/genai`)
*   **Backend/Auth/Storage**: Supabase
*   **PDF Handling**: React-PDF, PDF.js