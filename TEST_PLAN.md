# medHist v1.3.1: Feature Validation & Test Suite

This plan ensures the clinical integrity and UI stability of medHist v1.3.1.

## 🧪 Test Suite 1: Authentication & Family Logic
| ID | Test Case | Expected Result |
| :--- | :--- | :--- |
| **AUTH-01** | **Join Existing Family** | Using a Join Code adds the user to the correct group with existing members visible. |
| **AUTH-02** | **Password Recovery** | Reset email is sent; reset link correctly routes to the `UpdatePasswordPage`. |
| **AUTH-03** | **Identity Guard** | User A cannot edit User B's email profile even if they are in the same family. |

## 🧪 Test Suite 2: The Family Board (Dashboard)
| ID | Test Case | Expected Result |
| :--- | :--- | :--- |
| **DASH-01** | **Folder Creation** | New member appears with calculated age and "No reports yet" status. |
| **DASH-02** | **Profile Edit** | Updating a member's DOB immediately updates the age on their dashboard card. |
| **DASH-03** | **Invite System** | "Invite" modal displays the correct alphanumeric family code. |

## 🧪 Test Suite 3: AI Extraction & Timeline
| ID | Test Case | Expected Result |
| :--- | :--- | :--- |
| **AI-01** | **OCR Extraction (PDF)** | AI identifies "Dr. Hibbert" and "Lipid Profile" from a text-based PDF. |
| **AI-02** | **OCR Extraction (Image)** | AI identifies text from a mobile photo of a handwritten prescription. |
| **AI-03** | **Identity Guard (UI)** | Mismatch triggers an amber warning *inside* the timeline card rather than a separate row. |
| **AI-04** | **Mismatch Override** | Clicking "Confirm & Link Meds" clears the warning and executes the medication sync. |
| **AI-05** | **Follow-up Detection** | "Review in 3 weeks" is converted to a specific date and triggers a Dashboard Alert. |

## 🧪 Test Suite 4: Medication & Pharmacy Registry
| ID | Test Case | Expected Result |
| :--- | :--- | :--- |
| **MED-01** | **Auto-Population** | Extracted medications appear in the "Pharmacy Registry" automatically if names match. |
| **MED-02** | **Discontinuation** | Stopping a med moves it to "History" and updates the Card count on the Board. |
| **MED-03** | **Manual Entry** | Manually added meds sync correctly to the database and card summary. |
| **MED-04** | **No-Filter Restoration** | (v1.3.1) If a report contains a med already in the list, it is added again. No data is silently skipped. |

## 🧪 Test Suite 5: Clinical Assistant (Chat)
| ID | Test Case | Expected Result |
| :--- | :--- | :--- |
| **CHAT-01** | **Context Retrieval** | Asking "What is my son's BP?" returns data from the son's specific timeline. |
| **CHAT-02** | **Deep Linking** | Response includes a `[VIEW:Report:ID]` button that opens the correct File Viewer. |
| **CHAT-03** | **Fuzzy ID Matching** | Assistant can open records even if the AI slightly truncates the UUID string. |

## 🧪 Test Suite 6: Mobile & Record Viewer
| ID | Test Case | Expected Result |
| :--- | :--- | :--- |
| **MOB-01** | **Back-Button Stability** | Hitting the hardware back button on Android closes the Report Modal without reloading the app. |
| **MOB-02** | **DPI Throttling** | PDF renders clearly on iOS without triggering the "Preview Unavailable" memory crash. |
| **VIEW-01** | **Multi-File Navigation** | User can use "Prev/Next" buttons to cycle through multiple attachments in one entry. |

---
*medHist v1.3.1 Stable*