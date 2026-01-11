
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FamilyMember, TimelineEntry, ReportFile, Medication, ExtractedMedication } from '../types';
import { base64ToBlob } from '../utils/fileUtils';
import { CREDENTIALS } from '../credentials';

const getEnvVar = (key: string) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) { /* ignore */ }
  
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) { /* ignore */ }

  return undefined;
};

const supabaseUrl = CREDENTIALS.SUPABASE_URL || getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = CREDENTIALS.SUPABASE_ANON_KEY || getEnvVar('VITE_SUPABASE_ANON_KEY');

let supabaseClient: SupabaseClient | null = null;
let isMockMode = true;

try {
    if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_url_here') {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        isMockMode = false;
        console.log("[medHist] Supabase Client Initialized");
    } else {
        isMockMode = true;
    }
} catch (error) {
    console.error("[medHist] Supabase Init Error:", error);
    isMockMode = true;
}

export const isMock = isMockMode;
export const supabase = supabaseClient;

export type Session = any;

const MOCK_USER_ID = 'mock-user-123';
let mockSession: Session | null = null;

const STORAGE_BUCKET = 'medical-reports';

const sanitizeDate = (val: any): string | null => {
    if (!val) return null;
    const str = String(val).trim();
    if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return null;
    const placeholders = ["not specified", "unknown", "n/a", "none", "tbd", "pending", "not recorded"];
    if (placeholders.some(p => str.toLowerCase().includes(p))) return null;
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (isoRegex.test(str)) {
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : str;
    }
    try {
        if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                    const d = new Date(year, month - 1, day);
                    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
                }
            }
        }
        const d = new Date(str);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0];
    } catch {
        return null;
    }
};

// --- AUTH FUNCTIONS ---

export const getSession = async (): Promise<Session | null> => {
    if (localStorage.getItem('medhist-explicit-logout') === 'true') return null;
    if (isMock) return mockSession;
    
    try {
        const { data, error } = await supabase!.auth.getSession();
        if (error) throw error;
        return data.session;
    } catch (e: any) {
        console.error("[medHist] Auth Handshake Failure:", e.message);
        return null;
    }
};

export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
    if (isMock) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase!.auth.onAuthStateChange(callback);
};

export const signUp = async (name: string, email: string, password: string, familyInput: { isJoin: boolean, value: string }): Promise<string|null> => {
    if (isMock) {
        localStorage.removeItem('medhist-explicit-logout');
        mockSession = { user: { id: MOCK_USER_ID, email, user_metadata: { full_name: name } } } as any;
        return null;
    }

    // 1. Create Auth Account
    const { data: authData, error: authError } = await supabase!.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
    });

    if (authError) return authError.message;
    const user = authData.user;
    if (!user) return "Signup failed: User not created.";

    try {
        // 2. Identify Target Family
        let familyId = '';
        if (familyInput.isJoin) {
            const joinCode = familyInput.value.trim().toUpperCase();
            const { data: family } = await supabase!.from('families').select('id').eq('join_code', joinCode).maybeSingle();
            if (!family || !family.id) throw new Error(`Invalid Family Invite Code '${joinCode}'.`);
            familyId = family.id;
        } else {
            const newJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const response = await supabase!
                .from('families')
                .insert({ name: familyInput.value, join_code: newJoinCode })
                .select('id')
                .single();
            if (response.error || !response.data) throw new Error(response.error?.message || "Failed to create family group.");
            familyId = response.data.id;
        }

        // 3. ARCHITECTURAL FIX: 
        // We ONLY insert into 'profiles'. 
        // The Database Trigger (create_self_family_member) will handle 'family_members' automatically.
        // This ensures the record creation is atomic and happens only once.
        const { error: profileError } = await supabase!.from('profiles').insert({ 
            id: user.id, 
            family_id: familyId, 
            full_name: name 
        });

        if (profileError) throw profileError;

        localStorage.removeItem('medhist-explicit-logout');
        return null;
    } catch (err: any) {
        console.error("[medHist] Registry Sync Error (Trigger will attempt recovery):", err.message);
        return null; 
    }
};

export const signIn = async (email: string, password: string): Promise<string|null> => {
    if (isMock) {
        localStorage.removeItem('medhist-explicit-logout');
        mockSession = { user: { id: MOCK_USER_ID, email, user_metadata: { full_name: 'Demo User' } } } as any;
        return null;
    }
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (!error) localStorage.removeItem('medhist-explicit-logout');
    return error ? error.message : null;
};

export const sendPasswordResetEmail = async (email: string): Promise<string | null> => {
    if (isMock) return null;
    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
    });
    return error ? error.message : null;
};

export const updatePassword = async (password: string): Promise<string | null> => {
    if (isMock) return null;
    const { error } = await supabase!.auth.updateUser({ password });
    return error ? error.message : null;
};

export const updateUserEmail = async (email: string): Promise<string | null> => {
    if (isMock) return null;
    const { error } = await supabase!.auth.updateUser({ email });
    return error ? error.message : null;
};

export const hardReset = async (): Promise<void> => {
    localStorage.clear();
    sessionStorage.clear();
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
    localStorage.setItem('medhist-explicit-logout', 'true');
    if (window.location.pathname !== '/login') {
        window.location.href = '/';
    }
};

export const signOut = async (): Promise<void> => {
    localStorage.setItem('medhist-explicit-logout', 'true');
    if (isMock) {
        mockSession = null;
    } else if (supabase) {
        try {
            await supabase.auth.signOut({ scope: 'global' }).catch(() => {});
        } catch (e) { /* ignore */ }
    }
    await hardReset();
};

export const getUserData = async (userId: string) => {
    if (isMock) return { familyMembers: [], timelineEntries: [], medications: [], familyInfo: { name: 'Demo Family', joinCode: 'MOCK12' } };

    // 1. ATOMIC REGISTRY WAIT
    // Poll for the profile (which should be created by signUp or Trigger)
    let profile = null;
    let attempts = 0;
    while (attempts < 10) {
        const { data } = await supabase!
            .from('profiles')
            .select('family_id, full_name')
            .eq('id', userId)
            .maybeSingle();
        
        if (data) {
            profile = data;
            break;
        }
        attempts++;
        await new Promise(r => setTimeout(r, 500)); // Wait 500ms between checks
    }

    if (!profile) {
        throw new Error("Registry Access Restricted. Account record missing.");
    }

    const familyId = profile.family_id;

    // 2. Parallel Fetch of all family data
    const [familyInfoRes, membersRes, timelineRes, medsRes] = await Promise.all([
        supabase!.from('families').select('name, join_code').eq('id', familyId).single(),
        supabase!.from('family_members').select('*').eq('family_id', familyId).order('name'),
        supabase!.from('timeline_entries').select('*, files(*)').order('date', { ascending: false }),
        supabase!.from('medications').select('*').order('created_at', { ascending: false })
    ]);

    if (membersRes.error) throw membersRes.error;
    
    const finalMembers = membersRes.data || [];
    const memberIds = finalMembers.map(m => m.id);

    return {
        familyMembers: finalMembers,
        timelineEntries: (timelineRes.data || [])
            .filter(e => memberIds.includes(e.family_member_id))
            .map((e: any) => ({
                ...e,
                file: e.files?.[0] ? { id: e.files[0].id, name: e.files[0].name, type: e.files[0].type } : undefined
            })),
        medications: (medsRes.data || []).filter(m => memberIds.includes(m.family_member_id)),
        familyInfo: familyInfoRes.data ? { name: familyInfoRes.data.name, joinCode: familyInfoRes.data.join_code } : null
    };
};

export const addFamilyMember = async (details: { name: string; relationship: string; dob: string; }) => {
    if (isMock) return;
    const session = await getSession();
    if (!session) throw new Error("Authentication Required.");
    const { data: profile } = await supabase!.from('profiles').select('family_id').eq('id', session.user.id).single();
    if (!profile) throw new Error("Profile not found");
    const { error } = await supabase!.from('family_members').insert({ family_id: profile.family_id, name: details.name, relationship: details.relationship, dob: sanitizeDate(details.dob) });
    if (error) throw error;
};

export const updateFamilyMember = async (id: string, updates: { name: string; relationship: string; dob: string; }) => {
    if (isMock) return;
    const { error } = await supabase!.from('family_members').update({ name: updates.name, relationship: updates.relationship, dob: sanitizeDate(updates.dob) }).eq('id', id);
    if (error) throw error;
};

export const addMedication = async (data: any) => {
    if (isMock) return;
    const { error } = await supabase!.from('medications').insert({ family_member_id: data.family_member_id, timeline_entry_id: data.timeline_entry_id, name: data.name, dosage: data.dosage, frequency: data.frequency, purpose: data.purpose, start_date: sanitizeDate(data.start_date), active: true });
    if (error) throw error;
};

export const stopMedication = async (id: string) => {
    if (isMock) return;
    const { error } = await supabase!.from('medications').update({ active: false, stopped_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
};

const sanitizePath = (path: string): string => {
    if (!path) return '';
    let clean = path.trim();
    try { clean = decodeURIComponent(clean); } catch (e) { }
    const bucketPrefixes = [`${STORAGE_BUCKET}/`, `/${STORAGE_BUCKET}/`, 'reports/', '/reports/'];
    for (const prefix of bucketPrefixes) {
        if (clean.toLowerCase().startsWith(prefix.toLowerCase())) clean = clean.substring(prefix.length);
    }
    return clean.replace(/^\/+/, '');
};

export const addTimelineEntry = async (entryData: any, fileData: any, medications?: ExtractedMedication[]) => {
    if (isMock) return;
    const session = await getSession();
    if (!session) throw new Error("Session invalid.");
    const cleanDate = sanitizeDate(entryData.date) || new Date().toISOString().split('T')[0];
    const cleanFollowUp = sanitizeDate(entryData.follow_up_date);
    const insertPayload: any = { family_member_id: entryData.family_member_id, uploaded_by_user_id: session.user.id, date: cleanDate, report_type: entryData.report_type || "Medical Record", summary: entryData.summary || "", doctor_name: entryData.doctor_name || null, facility_name: entryData.facility_name || null, patient_name: entryData.patient_name || null, follow_up_date: cleanFollowUp };
    let { data: entry, error: entryError } = await supabase!.from('timeline_entries').insert(insertPayload).select().single();
    if (entryError || !entry) throw new Error(`Registry Sync Error: ${entryError?.message}`);
    const { data: profile } = await supabase!.from('profiles').select('family_id').eq('id', session.user.id).single();
    const filePath = `${profile?.family_id || entry.family_member_id}/${entry.id}/${fileData.name}`;
    const fileBlob = base64ToBlob(fileData.data, fileData.type);
    const { error: uploadError } = await supabase!.storage.from(STORAGE_BUCKET).upload(filePath, fileBlob, { contentType: fileData.type, upsert: true });
    if (uploadError) {
        await supabase!.from('timeline_entries').delete().eq('id', entry.id);
        throw new Error(`File Storage Failed: ${uploadError.message}`);
    }
    await supabase!.from('files').insert({ timeline_entry_id: entry.id, name: fileData.name, type: fileData.type, file_path: filePath, password: fileData.password });
    if (medications && medications.length > 0) {
        const medsToInsert = medications.map(m => ({ family_member_id: entry!.family_member_id, timeline_entry_id: entry!.id, name: m.name, dosage: m.dosage, frequency: m.frequency, purpose: m.purpose, start_date: sanitizeDate(m.startDate), active: true }));
        await supabase!.from('medications').insert(medsToInsert);
    }
    return entry;
};

export const deleteTimelineEntry = async (entryId: string) => {
    if (isMock) return;
    const { data: fileRecord } = await supabase!.from('files').select('file_path').eq('timeline_entry_id', entryId).maybeSingle();
    if (fileRecord?.file_path) {
        const cleanPath = sanitizePath(fileRecord.file_path);
        await supabase!.storage.from(STORAGE_BUCKET).remove([cleanPath]);
    }
    await supabase!.from('timeline_entries').delete().eq('id', entryId);
};

export const getFileForEntry = async (entryId: string) => {
    if (isMock) return null;
    const { data: fileMetadata, error: metaError } = await supabase!.from('files').select('*').eq('timeline_entry_id', entryId).maybeSingle();
    if (metaError || !fileMetadata) return null;
    const dbPath = fileMetadata.file_path || (fileMetadata as any).storage_path;
    if (!dbPath) return null;
    const cleanPath = sanitizePath(dbPath);
    const pathsToTry = [dbPath, cleanPath];
    let finalResult = null;
    for (const p of pathsToTry) {
        if (!p) continue;
        const result = await supabase!.storage.from(STORAGE_BUCKET).createSignedUrl(p, 3600);
        if (!result.error && result.data?.signedUrl) {
            finalResult = { signedUrl: result.data.signedUrl, path: p };
            break;
        }
    }
    if (!finalResult) return null;
    return { signedUrl: finalResult.signedUrl, filePath: finalResult.path, metadata: { id: fileMetadata.id, name: fileMetadata.name, type: fileMetadata.type, password: fileMetadata.password } };
};

export const ignoreMismatch = async (entryId: string) => {
    if (isMock) return;
    await supabase!.from('timeline_entries').update({ mismatch_ignored: true }).eq('id', entryId);
};

export const createShareLink = async (entryId: string): Promise<string | null> => {
    if (isMock) return "https://example.com/share/mock-link";
    const result = await getFileForEntry(entryId);
    return result?.signedUrl || null;
};
