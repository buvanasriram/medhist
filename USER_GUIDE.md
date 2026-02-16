
# medHist: Professional User Guide (v1.4.0)

## 🏥 Purpose
medHist is a private, family-centric clinical registry. It is designed to solve the "fragmented record" problem by using **Gemini AI** to transform messy hospital PDFs, prescriptions, and lab reports into a unified, searchable health history.

---

## 🚀 Core Features

### 1. The Family Board (Central Command)
Your dashboard acts as a "Medical Folder" for the entire family. 
- **Folders for Everyone**: Create unique folders for children, spouse, or elderly parents.
- **At-a-Glance Metrics**: See age, last checkup date, and active medication counts without opening a single file.
- **Clinical Aesthetics**: Color-coded member cards help you identify individuals instantly on mobile or desktop.

### 2. AI Intelligence Engine
When you upload a document, our Clinical AI performs three tasks:
- **Extraction**: Identifies Doctor, Date, Facility, and Patient name.
- **Synthesis**: Writes a 2-sentence "Clinical Brief" so you don't have to re-read a 10-page discharge summary.
- **Medication Mapping**: Automatically populates your pharmacy list. **Note:** In v1.4.0, we use "No-Filter Restoration"—every medication found is added to ensure nothing is missed. You can manually prune duplicates in the Meds manager.

### 3. Smart Pharmacy Registry
- **Active vs. Archive**: Track what your family is currently taking.
- **Protocol Start Dates**: Know exactly when a treatment started.
- **History View**: Review discontinued medications to help doctors understand past treatment failures.

### 4. Health Assistant (Chat)
Tap the stethoscope icon to talk to your records:
- "When was John's last blood test?"
- "What was the doctor's advice on the Apollo report?"
- "List all meds Patty is currently taking."
- **Deep Linking**: The assistant provides direct buttons to open the relevant reports.

### 5. Doctor's Brief (PDF Generation)
Before a specialist visit, click **"Download Brief"**. medHist generates a professional 1-page PDF containing:
- Patient demographics.
- Current active medication list.
- A summary of the last 15 clinical events.

---

## 👨‍👩‍👧‍👦 Getting Started

### Step 1: Create your Family
Sign up and choose **"Create New Family"**. This generates a unique **Invite Code**. Share this code with your spouse or siblings so they can see and contribute to the same registry.

### Step 2: Build the Folders
Add members for everyone in the family. We recommend adding "Date of Birth" to enable automatic age calculation—vital for pediatric and geriatric care.

### Step 3: The First Upload
Take a clear photo of a prescription or upload a lab PDF.
- **PDF Security**: If your hospital PDF is password-protected, enter the password in the upload modal. We process it securely and do not store the password.
- **Verification**: If the AI detects a name on the report that doesn't match the folder name, it will flag a **"Name Mismatch"**. You can confirm the match to link medications automatically.

### Step 4: Install for Mobile
medHist is a **Progressive Web App (PWA)**. 
- **iOS**: Tap 'Share' > 'Add to Home Screen'.
- **Android/Chrome**: Tap 'Install App' in the header.
This allows you to access records instantly at the doctor's office, even with poor connectivity.

---

## 🔒 Security & Privacy
- **Direct Storage**: Files are stored in your private Supabase bucket.
- **Encrypted Links**: "Share" buttons generate secure, temporary links.
- **Your Data**: We do not sell clinical data. The AI processing is ephemeral and used only for extraction.

**medHist: Better records, better care.**
