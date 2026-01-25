# medHist v1.3.1: System Manifest & Dependency Audit

This manifest serves as the technical source of truth and architectural map for the medHist project. Use this to trace the lifecycle of features from boot to clinical persistence.

---

## 🏗️ 1. Core Application & State
| File/Folder | Why it exists | What problem it solves | Entry Points | Coupling Points |
| :--- | :--- | :--- | :--- | :--- |
| `index.tsx` | App Bootstrapper | Prevents PDF.js Worker version mismatch crashes. | HTML Script Tag | `App.tsx`, `pdfjs-dist` |
| `App.tsx` | Global Router & State | Manages Auth sessions and triggers family data hydration. | `index.tsx` | `supabaseService`, Dashboard/Timeline Views |
| `types.ts` | Type Definition System | Ensures clinical data integrity across AI and Database. | Global Imports | Shared by all Components/Services |
| `credentials.ts` | Static Config | Provides reliable fallbacks for restricted environment keys. | Services | Hardcoded String Keys |

---

## 🧬 2. Services (Intelligence & Persistence)
| File/Folder | Why it exists | What problem it solves | Entry Points | Coupling Points |
| :--- | :--- | :--- | :--- | :--- |
| `supabaseService.ts` | Data Layer Wrapper | Abstracts RLS, Table CRUD, and Binary Storage uploads. | `App.tsx`, Views | `@supabase/supabase-js` |
| `geminiService.ts` | AI Extraction Engine | Transforms unstructured medical text/images into JSON. | UploadModal, Assistant | `@google/genai`, `pdfjs-dist` |

---

## 🖼️ 3. Primary UI Views
| File/Folder | Why it exists | What problem it solves | Entry Points | Coupling Points |
| :--- | :--- | :--- | :--- | :--- |
| `DashboardView.tsx` | Family Command Center | Provides high-density overview of multiple patients. | `App.tsx` | `MemberCard`, `MedicationManager` |
| `TimelineView.tsx` | Patient History Log | Chronological rendering of all extracted clinical events. | `App.tsx` | `Timeline`, `ReportViewerModal` |
| `GuideView.tsx` | Onboarding Hub | Explains privacy and AI logic to non-technical users. | LoginPage, Header | Tailwind Layouts |

---

## 🛠️ 4. Specialized Modals & Engines
| File/Folder | Why it exists | What problem it solves | Entry Points | Coupling Points |
| :--- | :--- | : :--- | :--- | :--- |
| `ReportViewerModal.tsx` | High-DPI Viewer | Renders large PDFs on mobile without memory crashes. | `TimelineView` | `react-pdf`, `supabaseService` |
| `MedicationManager.tsx` | Pharmacy Registry | Tracks active vs archived meds with 100% fidelity. | `DashboardView` | `supabaseService`, `ConfirmationModal` |
| `UploadModal.tsx` | Ingestion Pipeline | Orchestrates file picking and AI trigger sequence. | `TimelineView` | `geminiService`, `fileUtils` |
| `HealthAssistant.tsx` | Clinical Chatbot | Allows natural language querying of the medical vault. | Dashboard, Timeline | `geminiService`, `TimelineEntry` types |
| `AddMemberModal.tsx` | Registry Expansion | Allows users to create new patient sub-folders. | Dashboard | `supabaseService` |
| `EditMemberModal.tsx` | Profile Management | Handles identity claiming and personal record linking. | MemberCard | `supabaseService` |

---

## 🔧 5. Utilities & Helpers
| File/Folder | Why it exists | What problem it solves | Entry Points | Coupling Points |
| :--- | :--- | :--- | :--- | :--- |
| `utils/pdfGenerator.ts` | Brief Export Engine | Generates professional PDFs for specialist visits. | `TimelineView` | `jsPDF`, `jspdf-autotable` (CDN) |
| `utils/fileUtils.ts` | Binary Transcoder | Handles Base64/Blob conversions for AI processing. | `UploadModal` | Native FileReader API |
| `utils/dateUtils.ts` | Chronology Logic | Calculates patient age and follow-up countdowns. | Dashboard Cards | Native Date Objects |

---

## 📄 6. Documentation & Specifications
| File/Folder | Why it exists | What problem it solves | Entry Points | Coupling Points |
| :--- | :--- | :--- | :--- | :--- |
| `ARCHITECTURE_FLOWS.md` | Logic Blueprints | Documents parallel hydration and AI pipelines. | Developer Onboarding | Mermaid.js Logic |
| `SCHEMA.md` | Data Spec | Source of truth for Postgres table relationships. | Database Setup | Supabase SQL |
| `USER_GUIDE.md` | Patient Manual | Clear instructions for family health management. | Application Help | Feature Documentation |
| `TEST_PLAN.md` | Quality Assurance | Defines validation paths for clinical integrity. | PR Reviews | Functional Test Cases |

---
*medHist Architectural Manifest v1.3.1*
