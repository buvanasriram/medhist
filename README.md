# medHist: Family Medical Registry (v1.0.0 Harmony)

medHist is a secure, family-focused web application designed to solve the problem of fragmented medical records. It uses **Google Gemini AI** to automatically extract clinical details from PDFs and images, creating a chronological health timeline for every family member.

## 🚀 Key Features

*   **Family Board**: A high-density dashboard for managing spouse, children, and elderly parents.
*   **AI Clinical Engine**: Automatic extraction of diagnosis, medications, and follow-up dates.
*   **Pharmacy Registry**: Real-time tracking of active vs. archived medications.
*   **Health Assistant**: A context-aware chatbot that can "search" your family's records and provide direct links to reports.
*   **Doctor's Brief**: One-click generation of a professional PDF summary for specialist visits.
*   **PWA Optimized**: Fully installable on iOS and Android with offline-first asset caching.

## 🛠 Tech Stack

*   **Frontend**: React 19, TypeScript, Tailwind CSS
*   **AI**: Google Gemini 2.0 (`gemini-3-flash-preview`)
*   **Backend**: Supabase (Auth, Database, Storage)
*   **PDF Engine**: React-PDF + PDF.js (v4.8.69 Registry Locked)

## 📦 Deployment & Stability

*   **Mobile Memory Throttling**: Specialized DPI scaling for high-resolution mobile screens to prevent browser crashes.
*   **Registry Locking**: Dynamic PDF worker synchronization to ensure 100% version parity in production environments.
*   **Concurrency Guarding**: Robust auth-state locks to prevent race conditions during high-latency boot sequences.

## 🔒 Security

*   **Family Isolation**: Multi-tenant Row Level Security (RLS) ensures data never leaks between families.
*   **Ephemeral AI**: Clinical data is processed in-memory and never used for model training.
*   **Secure Hand-off**: Document sharing via 24-hour temporary signed URLs.

---
**medHist: Better records, better care.**