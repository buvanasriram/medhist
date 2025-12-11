
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

export interface Medication {
  id: string;
  family_member_id: string;
  timeline_entry_id?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  purpose?: string; // e.g. "High Blood Pressure"
  start_date?: string; // Date medication started
  active: boolean;
  created_at?: string;
  stopped_at?: string; // Timestamp when medication was archived
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
  follow_up_date?: string; // ISO 8601 format
  mismatch_ignored?: boolean;
  file?: ReportFile;
}

export interface ExtractedMedication {
    name: string;
    dosage?: string;
    frequency?: string;
    purpose?: string;
    startDate?: string;
}

export interface ExtractedReportData {
    date: string;
    reportType: string;
    summary: string;
    doctorName?: string;
    facilityName?: string;
    patientName?: string;
    followUpDate?: string;
    medications?: ExtractedMedication[];
}
