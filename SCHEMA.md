# medHist v1.3.1: Database Schema Specification

This document defines the relational structure of the medHist Clinical Registry.

## 🏗 Relationship Overview
The system uses a **Hierarchical Tenant Model**. All data belongs to a `Family`. Users (`Profiles`) are invited into a `Family` via a `Join Code`.

## 📋 Tables & Logic

### 1. `families`
The root of the multi-tenant tree.
- `id`: UUID (PK)
- `name`: TEXT (e.g., "The Vance Family")
- `join_code`: TEXT (Unique, 6-character alphanumeric)
- `created_at`: TIMESTAMP

### 2. `profiles`
Extended user data linked to Supabase Auth.
- `id`: UUID (PK, References `auth.users`)
- `family_id`: UUID (FK to `families`)
- `full_name`: TEXT
- `updated_at`: TIMESTAMP

### 3. `family_members`
Logical "Folders" for patients.
- `id`: UUID (PK)
- `family_id`: UUID (FK to `families`)
- `name`: TEXT (Patient's legal name)
- `relationship`: TEXT (e.g., "Self", "Father", "Child")
- `dob`: DATE (Used for age calculation)
- `linked_user_id`: UUID (Optional, FK to `profiles`) - *Logic: If set, this folder is 'claimed' by a specific user.*

### 4. `timeline_entries`
The chronological event log of medical reports.
- `id`: UUID (PK)
- `family_member_id`: UUID (FK to `family_members`)
- `date`: DATE (Consultation date)
- `report_type`: TEXT (e.g., "Lab Report")
- `summary`: TEXT (AI generated synthesis)
- `doctor_name`: TEXT
- `facility_name`: TEXT
- `patient_name`: TEXT (Extracted from report for Identity Guard check)
- `follow_up_date`: DATE
- `mismatch_ignored`: BOOLEAN (Default: FALSE)
- `pending_medications`: JSONB (Storage for extracted meds during name-mismatch limbo)

### 5. `files`
Metadata for attachments in Supabase Storage.
- `id`: UUID (PK)
- `timeline_entry_id`: UUID (FK to `timeline_entries`)
- `name`: TEXT (Original filename)
- `type`: TEXT (MIME type)
- `file_path`: TEXT (Storage bucket path)
- `password`: TEXT (Encrypted PDF password if provided)

### 6. `medications`
The active Pharmacy Registry.
- `id`: UUID (PK)
- `family_member_id`: UUID (FK to `family_members`)
- `timeline_entry_id`: UUID (Optional, FK to `timeline_entries`)
- `name`: TEXT
- `dosage`: TEXT
- `frequency`: TEXT
- `purpose`: TEXT (AI inferred or explicit)
- `start_date`: DATE
- `end_date`: DATE
- `active`: BOOLEAN
- `stopped_at`: TIMESTAMP (Set when `active` becomes FALSE)

---

## 🔒 Security Policy Logic (RLS)
The core logic for data isolation resides in the database.
1. **Selection**: A user can `SELECT` a record only if `profiles.family_id` for their `uid` matches the record's `family_id`.
2. **Cascading Delete**: Deleting a `timeline_entry` automatically deletes associated `files` metadata and links to `medications`.
