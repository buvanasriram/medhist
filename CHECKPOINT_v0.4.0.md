# System Checkpoint: v0.4.0
**Date:** Current
**Status:** Stable / Released

This file serves as a reference point for the **medHist** application at version 0.4.0. Use this to restore the project state if future development introduces breaking changes.

---

## 🚀 Features at this Checkpoint

1.  **AI Health Assistant (MVP 3)**
    *   **Conversational Interface:** Ask questions about family health history ("What meds is Dad on?").
    *   **Context-Aware:** AI knows specific reports, medications, and patients.
    *   **Deep Linking:** Chat responses include clickable links to view source reports directly.

2.  **Doctor Visit Organizer (MVP 8)**
    *   **Visits Tab:** Specialized timeline view filtering for Prescriptions, Consultations, and Referrals.
    *   **Auto-Detection:** AI extracts `Follow-Up Date` from report text (e.g., "Review in 2 weeks").
    *   **Appointment Reminders:** Dashboard alert section showing upcoming visits with countdowns (e.g., "Tomorrow", "In 5 days").

3.  **Secure Sharing**
    *   **Doctor Links:** Generate temporary (24-hour) signed URLs for specific reports to share via SMS/Email.

4.  **Family Health Dashboard (MVP 2)**
    *   Grid view of all family members.
    *   "At-a-glance" metrics: Age, Last Checkup Date, Active Medication Count.

5.  **AI Medication Tracker**
    *   **Auto-Extraction:** Extracts Name, Dosage, Frequency, Purpose, and Start Date from reports.
    *   **AI Inference:** Infers medical *Purpose* (e.g., "Hypertension") using external knowledge.
    *   **Medication Manager:** Manual Add, Stop (Archive), and History View.

6.  **Medical Timeline**
    *   **Global Search:** Filter reports by Doctor, Type, Facility, or Summary keywords.
    *   **Collapsible Summaries:** Clean UI with "Show Summary" toggles.
    *   **File Viewer:** Support for PDFs and Images.

---

## 💾 Database Schema Snapshot

To restore the database to this state, run the following SQL in the Supabase SQL Editor:

```sql
-- medHist Schema v0.4.0

-- 1. CLEANUP & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLES
CREATE TABLE IF NOT EXISTS public.families (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    join_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL DEFAULT 'Member',
    dob DATE,
    linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.timeline_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE NOT NULL,
    uploaded_by_user_id UUID REFERENCES auth.users(id),
    date DATE NOT NULL,
    report_type TEXT NOT NULL,
    summary TEXT,
    doctor_name TEXT,
    facility_name TEXT,
    patient_name TEXT,
    follow_up_date DATE, -- Added in v0.4
    mismatch_ignored BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timeline_entry_id UUID REFERENCES public.timeline_entries(id) ON DELETE CASCADE NOT NULL,
    file_path TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.medications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
    timeline_entry_id UUID REFERENCES public.timeline_entries(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    purpose TEXT,
    active BOOLEAN DEFAULT true,
    start_date DATE,
    stopped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION public.create_self_family_member() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.family_members (family_id, name, relationship, linked_user_id, dob)
  VALUES (NEW.family_id, NEW.full_name, 'Self', NEW.id, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.create_self_family_member();

CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID AS $$
  SELECT family_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. RLS POLICIES (Summary)
-- Enabled on all tables.
-- Families: Insert (Auth), Select (Auth).
-- Profiles: Manage Own.
-- FamilyMembers, Timeline, Files, Medications: Access if family_id matches get_my_family_id().
```