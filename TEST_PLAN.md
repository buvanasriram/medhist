# medHist Manual Test Plan

This document outlines the manual testing strategy for **medHist**. Use this checklist to verify the application functionality before releasing or deploying updates.

## 🛠 Prerequisites

1.  **Environment**: Ensure you are running the app (`npm run dev`) locally or in your preview environment.
2.  **Credentials**: 
    *   **For Full Testing**: Ensure valid API keys are set in `credentials.ts` (Supabase + Google Gemini).
    *   **For UI Testing**: If keys are missing, the app will run in **Mock Mode** (simulated data).
3.  **Test Files**: Have a sample medical PDF and a generic image (JPG/PNG) ready.

---

## 🧪 Test Suite 1: Authentication & Onboarding

| ID | Test Case | Steps | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | **Sign Up (Create Family)** | 1. Go to `/signup`<br>2. Select "Create New Family"<br>3. Enter Name, Email, Password, Family Name<br>4. Submit | User is redirected to Dashboard. "Family Health Board" shows the Family Name. | [ ] |
| **AUTH-02** | **Sign Up (Join Family)** | 1. **Pre-req**: Get a Join Code from an existing family.<br>2. Go to `/signup`<br>3. Select "Join Existing"<br>4. Enter Invite Code<br>5. Submit | User is added to the existing family group. They can see existing members. | [ ] |
| **AUTH-03** | **Login** | 1. Go to `/login`<br>2. Enter valid credentials<br>3. Click Log In | Redirects to Dashboard. Profile data loads correctly. | [ ] |
| **AUTH-04** | **Logout** | 1. Click User Icon (Top Right)<br>2. Click "Log Out" | Redirects to Login screen. Session is cleared. | [ ] |

---

## 🧪 Test Suite 2: Dashboard & Members

| ID | Test Case | Steps | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **DASH-01** | **Add Family Member** | 1. Click "Add Member"<br>2. Enter Name (e.g., "Grandpa"), Rel (Grandfather), DOB<br>3. Save | New card appears in the grid. Age is calculated correctly. | [ ] |
| **DASH-02** | **Invite Member** | 1. Click "Invite"<br>2. Copy the Code<br>3. Close Modal | Code matches the database `join_code`. Copy button shows "Copied!". | [ ] |
| **DASH-03** | **View Member Details** | 1. Click on a Member Card | Navigates to the Timeline View for that specific member. | [ ] |

---

## 🧪 Test Suite 3: Medical Timeline & Uploads (Core)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **FILE-01** | **Upload PDF (AI Analysis)** | 1. Click "Upload"<br>2. Select a Medical PDF<br>3. Click "Generate Timeline Entry"<br>4. Wait for AI | Modal closes. New entry appears on timeline. **AI extracts**: Date, Doctor, Summary, and Report Type correctly. | [ ] |
| **FILE-02** | **Upload Image** | 1. Click "Upload"<br>2. Select a PNG/JPG<br>3. Submit | Image uploads successfully. AI analyzes text within the image (OCR). | [ ] |
| **FILE-03** | **View Report** | 1. Click "View Report" on a timeline item | Modal opens displaying the PDF or Image. | [ ] |
| **FILE-04** | **Delete Report** | 1. Click "Delete" on a timeline item<br>2. Confirm in modal | Entry disappears from timeline. File is removed from storage (check Supabase if possible). | [ ] |
| **FILE-05** | **Filter Timeline** | 1. Use the search bar to type "Blood"<br>2. Use the "Doctor Visits" tab | List filters down to show only matching items. | [ ] |

---

## 🧪 Test Suite 4: Medication Management

| ID | Test Case | Steps | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **MED-01** | **AI Auto-Extraction** | 1. Upload a report that lists medications (e.g., "Lisinopril")<br>2. Go to Dashboard -> Member Card | The medication appears under "Active Meds" on the card automatically. | [ ] |
| **MED-02** | **Manual Add** | 1. Click "Manage Meds" on a member card<br>2. Fill out form (Name, Dosage, etc.)<br>3. Click Add | New med appears in the list immediately. | [ ] |
| **MED-03** | **Stop Medication** | 1. Open "Manage Meds"<br>2. Click the Stop (Circle) icon<br>3. Confirm | Medication moves to "History" list (toggle "Show All History" to see it). | [ ] |

---

## 🧪 Test Suite 5: AI Assistant

| ID | Test Case | Steps | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **AI-01** | **Context Awareness** | 1. Open Chat (Bottom Right)<br>2. Ask: "What medications is [Member Name] taking?" | AI responds correctly based on the data in the Medication Manager. | [ ] |
| **AI-02** | **Report Linking** | 1. Ask: "Show me the last heart report"<br>2. Wait for response | AI provides a summary AND a clickable link `[View Report]` that opens the viewer. | [ ] |

---

## 🧪 Test Suite 6: Edge Cases

| ID | Test Case | Steps | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **EDGE-01** | **Invalid File** | 1. Try to upload a `.exe` or `.zip` file | App should reject it or showing an error message (Valid types: PDF, Images). | [ ] |
| **EDGE-02** | **Large File** | 1. Try to upload a file > 10MB | App shows "File too large" error. | [ ] |
| **EDGE-03** | **Empty State** | 1. Create a brand new family<br>2. View Timeline | Should show "No Reports Yet" empty state illustration. | [ ] |
