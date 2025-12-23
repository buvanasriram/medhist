# System Checkpoint: v0.5.1
**Date:** 2024-05-20
**Status:** Stable Release

This checkpoint marks the stable release of medHist v0.5.1, featuring critical fixes for PDF rendering and cloud storage reliability.

---

## 🚀 Key Improvements in v0.5.1

1.  **PDF Rendering Stability**
    *   Pinned `pdfjs-dist` and `react-pdf` dependencies to exact versions (`4.8.69`) to eliminate the "Worker version mismatch" error.
    *   Forced identical versioning via ESM.sh dependency resolution.

2.  **Storage Reliability (The "Space" Fix)**
    *   **Multi-Stage Path Hunting:** Added logic to attempt multiple path variations when retrieving files from Supabase (Literal, Sanitized, Space-Encoded, and Segment-Encoded).
    *   Corrected the default storage bucket name to `medical-reports`.

3.  **PWA & Mobile**
    *   Full offline support with asset caching.
    *   Installable manifest with high-res iconography.

4.  **Security**
    *   Enhanced RLS policies for family-wide data isolation.
    *   Secure 24-hour signed URLs for medical report sharing.

---

## 💾 Database Schema Reference (v0.5.1)

```sql
-- Remains consistent with v0.4.0/v0.5.0 structure
-- Tables: families, profiles, family_members, timeline_entries, files, medications.

-- Key RLS check:
CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID AS $$
  SELECT family_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;
```

## 🛠 Dependency Map
- **React**: 19.0.0
- **Supabase JS**: 2.44.4
- **PDF.js**: 4.8.69 (Pinned)
- **Gemini SDK**: @google/genai (latest)
- **Vite**: 5.3.1
```