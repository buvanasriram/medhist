
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
    if (isMock) return null;
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
        if (!email || !password) return "Email and password are required.";
        return null;
    }
    const { data: authData, error: authError } = await supabase!.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
    });
    if (authError) return authError.message;
    const user = authData.user;
    if (!user) return "Signup failed.";
    try {
        let familyId = '';
        if (familyInput.isJoin) {
            const joinCode = familyInput.value.trim().toUpperCase();
            const { data: family } = await supabase!.from('families').select('id').eq('join_code', joinCode).maybeSingle();
            if (!family || !family.id) throw new Error(`Invalid Code '${joinCode}'.`);
            familyId = family.id;
        } else {
            const newJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const response = await supabase!.from('families').insert({ name: familyInput.value, join_code: newJoinCode }).select('id').single();
            if (response.error || !response.data) throw new Error("Family creation failed.");
            familyId = response.data.id;
        }
        await supabase!.from('profiles').upsert({ id: user.id, family_id: familyId, full_name: name });
        localStorage.removeItem('medhist-explicit-logout');
        return null;
    } catch (err: any) {
        return err.message;
    }
};

export const signIn = async (email: string, password: string): Promise<string|null> => {
    if (isMock) {
        if (!email || !password) return "Email and password are required.";
        return null;
    }
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (!error) localStorage.removeItem('medhist-explicit-logout');
    return error ? error.message : null;
};

export const signOut = async () => {
    if (isMock) return;
    await supabase!.auth.signOut();
    localStorage.setItem('medhist-explicit-logout', 'true');
};

export const hardReset = async () => {
    localStorage.clear();
    if (!isMock) await supabase!.auth.signOut();
    window.location.reload();
};

export const getUserData = async (userId: string) => {
    if (isMock) return { familyMembers: [], timelineEntries: [], medications: [], familyInfo: null };
    const { data: profile } = await supabase!.from('profiles').select('family_id').eq('id', userId).single();
    if (!profile) throw new Error("Profile not found.");
    const familyId = profile.family_id;
    const [familyInfoRes, membersRes] = await Promise.all([
        supabase!.from('families').select('name, join_code').eq('id', familyId).single(),
        supabase!.from('family_members').select('*').eq('family_id', familyId).order('name')
    ]);
    const members = membersRes.data || [];
    const memberIds = members.map(m => m.id);
    const [timelineRes, medsRes] = await Promise.all([
        supabase!.from('timeline_entries').select('*, files(*)').in('family_member_id', memberIds).order('date', { ascending: false }),
        supabase!.from('medications').select('*').in('family_member_id', memberIds).order('created_at', { ascending: false })
    ]);
    return {
        familyMembers: members,
        timelineEntries: timelineRes.data || [],
        medications: medsRes.data || [],
        familyInfo: familyInfoRes.data || null
    };
};

export const addFamilyMember = async (details: { name: string; relationship: string; dob: string; }) => {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data: profile } = await supabase!.from('profiles').select('family_id').eq('id', user.id).single();
    if (!profile) throw new Error("Family context missing.");
    const { error } = await supabase!.from('family_members').insert({ 
        name: details.name,
        relationship: details.relationship,
        dob: sanitizeDate(details.dob),
        family_id: profile.family_id 
    });
    if (error) throw error;
};

export const updateFamilyMember = async (id: string, updates: Partial<FamilyMember>) => {
    const { error } = await supabase!.from('family_members').update({
        ...updates,
        dob: updates.dob ? sanitizeDate(updates.dob) : undefined
    }).eq('id', id);
    if (error) throw error;
};

export const deleteFamilyMember = async (id: string) => {
    const { data: member, error: fetchError } = await supabase!
        .from('family_members')
        .select('linked_user_id, name')
        .eq('id', id)
        .single();
    
    if (fetchError) throw fetchError;
    
    if (member?.linked_user_id) {
        throw new Error(`Cannot delete ${member.name}'s folder because it is currently linked to your login. Switch your identity to another folder first.`);
    }

    const { error } = await supabase!.from('family_members').delete().eq('id', id);
    if (error) throw error;
};

export const claimFolder = async (memberId: string) => {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data: profile } = await supabase!.from('profiles').select('family_id').eq('id', user.id).single();
    if (profile) {
        await supabase!.from('family_members')
            .update({ linked_user_id: null, relationship: 'Member' })
            .eq('family_id', profile.family_id)
            .eq('linked_user_id', user.id);
    }
    const { error } = await supabase!.from('family_members')
        .update({ linked_user_id: user.id, relationship: 'Self' })
        .eq('id', memberId);
    if (error) throw error;
};

export const getFileForEntry = async (entryId: string) => {
    const { data: file } = await supabase!.from('files').select('*').eq('timeline_entry_id', entryId).single();
    if (!file) return null;
    const { data } = await supabase!.storage.from(STORAGE_BUCKET).createSignedUrl(file.file_path, 3600);
    return { signedUrl: data?.signedUrl, filePath: file.file_path, metadata: file };
};

export const addTimelineEntry = async (entryData: any, fileData: any, extractedMedications?: ExtractedMedication[]) => {
    const cleanEntry = {
        ...entryData,
        date: sanitizeDate(entryData.date) || new Date().toISOString().split('T')[0],
        follow_up_date: sanitizeDate(entryData.follow_up_date)
    };
    const { data: entry, error: entryError } = await supabase!.from('timeline_entries').insert(cleanEntry).select().single();
    if (entryError) throw entryError;

    if (fileData && fileData.data) {
        const blob = base64ToBlob(fileData.data, fileData.type);
        const fileName = `${Date.now()}_${fileData.name}`;
        const filePath = `${entryData.family_member_id}/${fileName}`;
        const { error: uploadError } = await supabase!.storage.from(STORAGE_BUCKET).upload(filePath, blob);
        if (uploadError) throw uploadError;
        await supabase!.from('files').insert({
            timeline_entry_id: entry.id,
            name: fileData.name,
            type: fileData.type,
            file_path: filePath,
            password: fileData.password
        });
    }

    if (extractedMedications && extractedMedications.length > 0) {
        const meds = extractedMedications.map(m => ({
            family_member_id: entryData.family_member_id,
            timeline_entry_id: entry.id,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            purpose: m.purpose,
            start_date: sanitizeDate(m.startDate) || cleanEntry.date,
            active: true
        }));
        await supabase!.from('medications').insert(meds);
    }
};

export const deleteTimelineEntry = async (id: string) => {
    const { data: file } = await supabase!.from('files').select('file_path').eq('timeline_entry_id', id).single();
    if (file) await supabase!.storage.from(STORAGE_BUCKET).remove([file.file_path]);
    await supabase!.from('timeline_entries').delete().eq('id', id);
};

export const ignoreMismatch = async (id: string) => {
    await supabase!.from('timeline_entries').update({ mismatch_ignored: true }).eq('id', id);
};

export const addMedication = async (data: any) => {
    await supabase!.from('medications').insert({ ...data, start_date: sanitizeDate(data.start_date), active: true });
};

export const stopMedication = async (id: string) => {
    await supabase!.from('medications').update({ active: false, stopped_at: new Date().toISOString() }).eq('id', id);
};

export const sendPasswordResetEmail = async (email: string) => {
    const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/update-password` });
    return error ? error.message : null;
};

export const updatePassword = async (password: string) => {
    const { error } = await supabase!.auth.updateUser({ password });
    return error ? error.message : null;
};

export const updateUserEmail = async (email: string) => {
    const { error } = await supabase!.auth.updateUser({ email });
    return error ? error.message : null;
};

export const createShareLink = async (entryId: string): Promise<string | null> => {
    const { data: file } = await supabase!.from('files').select('file_path').eq('timeline_entry_id', entryId).single();
    if (!file) return null;
    const { data, error } = await supabase!.storage.from(STORAGE_BUCKET).createSignedUrl(file.file_path, 86400);
    if (error) return null;
    return data.signedUrl;
};
