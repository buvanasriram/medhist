# medHist v1.0: Feature Validation & Test Suite

This plan ensures the clinical integrity and UI stability of medHist.

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
| **AI-03** | **Mismatch Detection** | Uploading "John's" report to "Steve's" folder triggers the "Name Mismatch" alert. |
| **AI-04** | **Mismatch Override** | Clicking "Confirm Match" hides the warning and preserves the entry. |
| **AI-05** | **Follow-up Detection** | "Review in 3 weeks" is converted to a specific date and triggers a Dashboard Alert. |

## 🧪 Test Suite 4: Medication Management
| ID | Test Case | Expected Result |
| :--- | :--- | :--- |
| **MED-01** | **Auto-Population** | Extracted medications appear in the "Pharmacy Registry" automatically. |
| **MED-02** | **Discontinuation** | Stopping a med moves it to "History" and updates the Card count on the Board. |
| **MED-03** | **Manual Entry** | Manually added meds sync correctly to the database and card summary. |

## 🧪 Test Suite 5: Clinical Assistant (Chat)
| ID | Test Case | Expected Result |
| :--- | :--- | :--- |
| **CHAT-01** | **Context Retrieval** | Asking "What is my son's BP?" returns data from the son's specific timeline. |
| **CHAT-02** | **Deep Linking** | Response includes a `[VIEW:Report:ID]` button that opens the correct File Viewer. |
| **CHAT-03** | **Error Handling** | If Gemini is overloaded, the assistant shows a "System Busy" message rather than crashing. |

## 🧪 Test Suite 6: Mobile & PWA
| ID | Test Case | Expected Result |
| :--- | :--- | :--- |
| **MOB-01** | **Back-Button Stability** | Hitting the hardware back button on Android closes the Report Modal without reloading the app. |
| **MOB-02** | **DPI Throttling** | PDF renders clearly on iOS without triggering the "Preview Unavailable" memory crash. |
| **MOB-03** | **PWA Install** | Browser prompt appears on Android; "Add to Home Screen" instructions show on iOS. |