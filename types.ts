
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  dob?: string;
  invite_code?: string;
}

export interface ReportFile {
  id?: string; // Will have an ID once saved
  timeline_entry_id?: string;
  name: string;
  type: string;
  // The 'data' field has been removed as it was causing truncation issues.
  // File content is now handled as a Blob and streamed via Object URLs.
  password?: string;
}

export interface TimelineEntry {
  id: string;
  user_id: string;
  family_member_id: string;
  date: string; // ISO 8601 format
  report_type: string;
  summary: string;
  doctor_name?: string;
  facility_name?: string;
  patient_name?: string;
  mismatch_ignored?: boolean;
  file?: ReportFile; // File metadata might not be loaded initially
}

export interface ExtractedReportData {
    date: string;
    reportType: string;
    summary: string;
    doctorName?: string;
    facilityName?: string;
    patientName?: string;
}