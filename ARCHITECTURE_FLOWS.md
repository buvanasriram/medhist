# medHist v1.3.1: Technical Sequence & Architecture

This document tracks the data lifecycle from user interaction to persistent clinical records, specifically detailing the "Zero-Latency" state management and the AI-driven extraction pipeline.

---

## 🔐 1. The Authentication & Hydration Flow
When a user logs in, the system performs a multi-stage hydration to build the "Family Context." This ensures that subsequent navigation (like clicking a member card) is instantaneous.

```mermaid
sequenceDiagram
    participant U as User (UI)
    participant SA as Supabase Auth
    participant SD as Supabase DB
    participant A as App State (React)

    U->>SA: Enter Email/Password
    SA-->>U: Return JWT (Session)
    SA->>A: Trigger onAuthStateChange
    A->>A: Set currentUser & Session
    A->>SD: loadUserData(userId)
    Note over SD: RLS Check: SELECT profile WHERE id = auth.uid()
    SD-->>A: Return family_id
    
    par Fetch Families
        A->>SD: SELECT * FROM families
    and Fetch Members
        A->>SD: SELECT * FROM family_members
    and Fetch Timeline
        A->>SD: SELECT * FROM timeline_entries
    and Fetch Medications
        A->>SD: SELECT * FROM medications
    end
    
    SD-->>A: Return All Data (Parallel Result)
    A->>A: Update Global State (React Context/State)
    A->>U: Render Dashboard (Board)
```

---

## ⚡ 2. Member Interaction Journeys

### A. Clicking a Member Card (Timeline Navigation)
*   **User Journey**: Dashboard -> Click Card (e.g., "Nilesh") -> View Timeline.
*   **API Calls**: **Zero**. Data is already in memory from hydration.
*   **Response**: Instantaneous UI transition (~16ms).

### B. Clicking "Meds" (Pharmacy Registry Management)
*   **User Journey**: Dashboard -> Click "Meds" -> `MedicationManager` Modal opens.
*   **API Calls**: **Zero** for opening (uses cached state).
*   **Response**: High-density list of active and archived medications.

### C. "Brief" Generation (Clinical Export)
*   **User Journey**: Dashboard/Timeline -> Click "Brief".
*   **API Calls**: **Zero** (Data is cached). **External CDN** (Loads jsPDF/AutoTable if not present).
*   **Execution**: Purely Client-Side. System assembles PDF from local state.
*   **Response**: Browser triggers `.pdf` download.

```mermaid
sequenceDiagram
    participant U as User (UI)
    participant C as CDN (jsPDF)
    participant P as Client PDF Engine
    participant S as App State

    U->>P: Trigger "Download Brief"
    P->>C: Check/Load jsPDF & AutoTable
    C-->>P: Libraries Active
    P->>S: Pull Member + Meds + Timeline
    S-->>P: Clinical JSON
    P->>P: Render Table Structures
    P->>U: Trigger File Save (Blob)
```

---

## 💊 3. Manual Registry Updates

### A. Adding/Stopping Medications
*   **User Journey**: Med Manager -> "Add" or "Stop Circle".
*   **DB Operation**: `INSERT` or `PATCH` on `medications` table.
*   **Logic**: Stopped meds are timestamped with `stopped_at` for historical accuracy.
*   **Response**: Optimistic UI update + `onRefreshData` callback.

```mermaid
sequenceDiagram
    participant U as User
    participant A as App Logic
    participant SD as Supabase DB

    U->>A: Click "Stop Medication"
    A->>SD: UPDATE medications SET active=false, stopped_at=now()
    SD-->>A: HTTP 204 Success
    A->>A: Re-fetch user data (Sync Registry)
    A->>U: Move med to "History" list
```

### B. Sharing a Record
*   **User Journey**: Timeline -> Click "Share" (Triple dot/Share icon).
*   **API Calls**: **Supabase Storage RPC** (createSignedUrl).
*   **DB**: None (uses file_path from existing state).
*   **Response**: 24-hour signed link copied to clipboard.

---

## 🤖 4. Core AI Interaction (The Extraction Pipeline)
The clinical intelligence engine combines client-side PDF processing with the Gemini LLM.

```mermaid
sequenceDiagram
    participant U as User
    participant P as PDF.js (Client)
    participant G as Gemini API (AI)
    participant S as Supabase (Storage/DB)

    U->>U: Select File (PDF/IMG)
    alt is PDF
        U->>P: extractTextFromPdf()
        P-->>U: Text Content (max 8k chars)
    else is Image
        U->>U: Convert to Base64
    end
    
    U->>G: generateContent(Prompt + Data)
    Note right of G: Using responseSchema (JSON Mode)
    G-->>U: Return Structured Clinical JSON
    
    U->>U: robustJsonParse() (Client Logic)
    U->>U: Identity Guard (Name Match Check)
    
    U->>S: Storage.upload(File)
    U->>S: DB.insert(Timeline Entry)
```

---

## 💾 5. Data Persistence & Cascading Logic
The system enforces high integrity for medical records.

```mermaid
sequenceDiagram
    participant U as User (UI)
    participant SD as Supabase DB
    participant ST as Supabase Storage

    U->>SD: INSERT timeline_entry
    Note right of SD: Checks for duplicate filename/date
    SD-->>U: Return entry_id
    U->>ST: UPLOAD file to path: {member_id}/{file_name}
    
    alt Identity Guard == Pass
        U->>SD: INSERT medications (Auto-link)
    else Identity Guard == Mismatch
        U->>SD: UPDATE timeline_entry (pending_medications JSONB)
    end
    
    Note over SD: Cascade Delete: Purging entry cleans Storage & Meds
```

---

## ⚠️ 6. Error & Fallback Paths

### Record Deletion (The Purge Flow)
*   **User Journey**: Timeline -> Trash Icon -> Confirm.
*   **API Calls**: **DELETE** to `timeline_entries`. **REMOVE** to Supabase Storage.
*   **Logic**: Critical cascading delete. We must remove physical files from storage to maintain privacy.
*   **Response**: Immediate removal from timeline UI.

```mermaid
sequenceDiagram
    participant U as User
    participant SD as Supabase DB
    participant ST as Supabase Storage

    U->>U: Confirm "Purge Record"
    par Database Cleanup
        U->>SD: DELETE FROM timeline_entries WHERE id = entry_id
        Note over SD: Trigger: Delete linked meds
    and Storage Cleanup
        U->>ST: remove([file_path_1, file_path_2])
    end
    SD-->>U: Success
    U->>U: UI Re-render (Zero Entry State)
```

---
*medHist Architectural Specs v1.3.1*
