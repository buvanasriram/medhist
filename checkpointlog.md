
# medHist: Universal Development Ledger (v0.3.0 - v1.4.0)

This log contains the complete chronological history of architectural decisions, feature releases, and clinical logic patches.

---

## CHECKPOINT: v1.4.0 - Mobile Integrity & Null Data Patch
**Status:** Stable Release

### Accomplishments
- **Mobile Edit Fix**: Refactored `TimelineItem` layout to prevent the Edit/Trash buttons from being hidden on narrow mobile viewports.
- **Date Nullification Logic**: Fixed a bug where erasing the `follow_up_date` wouldn't persist to the database.
- **Global Versioning**: Synchronized version identifiers across all UI layers and documentation to facilitate user debugging.

### Technical Notes
- Refactored `updateTimelineEntry` in `supabaseService.ts` to use explicit existence checks for keys, allowing `null` values to pass through to Supabase correctly.
- Enhanced Flexbox layout in `TimelineItem` with pinned action container.

---

## BASELINE: v1.3.1 - High Integrity Logic
**Status:** Baseline

### Accomplishments
- Refined Pharmacy Registry with "No-Filter Restoration."
- Hardened PDF.js version locking.
- Optimized mobile DPI throttling for high-resolution screens.

---
... (Previous checkpoints omitted for brevity)
