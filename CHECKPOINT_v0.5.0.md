
# System Checkpoint: v0.5.0
**Date:** Current
**Status:** Stable / Released

This file serves as a reference point for the **medHist** application at version 0.5.0. Use this to restore the project state if future development introduces breaking changes.

---

## 🚀 Features at this Checkpoint

1.  **Progressive Web App (PWA) Support (New)**
    *   **Installability:** "Install App" button in header (desktop/Android) and iOS instructions.
    *   **Offline Caching:** Service worker configuration via `vite-plugin-pwa`.
    *   **Branding:** Custom `medhist-logo.svg` and manifest configuration (`theme_color`, `display: standalone`).

2.  **Profile & Settings Management (New)**
    *   **Edit Member:** Modal to update Name, Relationship, and DOB for any family member.
    *   **Email Update:** Secure workflow for logged-in users to update their email address via Supabase Auth.
    *   **Identity Protection:** Strict checks ensuring users can only edit their own email/login details.

3.  **AI Health Assistant (MVP 3)**
    *   **Conversational Interface:** Chat with family health history.
    *   **Deep Linking:** Chat responses include clickable links to view source reports.

4.  **Doctor Visit Organizer (MVP 8)**
    *   **Visits Tab:** Filter timeline for consultations.
    *   **Appointment Reminders:** Dashboard alerts for upcoming follow-ups.

5.  **Family Health Dashboard (MVP 2)**
    *   Grid view of all family members with "Edit" pencil icon.
    *   "At-a-glance" metrics: Age, Last Checkup Date, Active Medication Count.

6.  **Medical Timeline & AI Tracker**
    *   **Auto-Extraction:** AI extracts metadata + meds from PDFs/Images.
    *   **Secure Sharing:** 24-hour signed URLs.
    *   **Global Search:** Filter by text or date.

---

## 💾 Database Schema Snapshot

*Schema remains backward compatible with v0.4.0.*

```sql
-- medHist Schema v0.5.0

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
    follow_up_date DATE,
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
```
