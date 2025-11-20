
export interface User {
  id: string;
  name: string;
  email: string;
  familyId?: string;
  familyName?: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  name: string;
  relationship: string; // 'Self', 'Father', 'Child', etc.
  dob?: string;
  linked_user_id?: string; // Links this member folder to a login user
}

export interface ReportFile {
  id?: string;
  timeline_entry_id?: string;
  name: string;
  type: string;
  password?: string;
}

export interface TimelineEntry {
  id: string;
  family_member_id: string;
  uploaded_by_user_id?: string;
  date: string; // ISO 8601 format
  report_type: string;
  summary: string;
  doctor_name?: string;
  facility_name?: string;
  patient_name?: string;
  mismatch_ignored?: boolean;
  file?: ReportFile;
}

export interface ExtractedReportData {
    date: string;
    reportType: string;
    summary: string;
    doctorName?: string;
    facilityName?: string;
    patientName?: string;
}
