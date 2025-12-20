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

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || CREDENTIALS.SUPABASE_URL;
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || CREDENTIALS.SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient | null = null;
let isMockMode = true;

try {
    if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_url_here') {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        isMockMode = false;
        console.log(
            `%c[medHist] Connecting to Supabase: ${supabaseUrl}`, 
            "color: #10b981; font-weight: bold;"
        );
    } else {
        console.warn("%c[medHist] Missing credentials. Running in MOCK MODE.", "color: #ea580c; font-weight: bold;");
        isMockMode = true;
        supabaseClient = null;
    }
} catch (error) {
    console.warn(
        "%c[medHist] Supabase connection failed. Running in MOCK MODE.", 
        "color: #ea580c; font-weight: bold;"
    );
    isMockMode = true;
    supabaseClient = null;
}

export const isMock = isMockMode;
export const supabase = supabaseClient;

export type Session = any;

const MOCK_USER_ID = 'mock-user-123';
let mockSession: Session | null = null;

// --- AUTH FUNCTIONS ---

export const getSession = async (): Promise<Session | null> => {
    if (isMock) return mockSession;
    try {
        const { data, error } = await supabase!.auth.getSession();
        if (error) return null;
        return data.session;
    } catch (e) {
        console.error("[medHist] Session check error:", e);
        return null;
    }
};

export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
    if (isMock) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase!.auth.onAuthStateChange(callback);
};

export const signUp = async (name: string, email: string, password: string, familyInput: { isJoin: boolean, value: string }): Promise<string|null> => {
    if (isMock) {
        mockSession = { user: { id: MOCK_USER_ID, email, user_metadata: { full_name: name } } } as any;
        return null;
    }

    const { data: authData, error: authError } = await supabase!.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
    });

    if (authError) return authError.message;
    const userId = authData.user?.id || authData.data?.user?.id;
    if (!userId) return "Signup failed: User not created.";

    try {
        let familyId = '';
        if (familyInput.isJoin) {
            const joinCode = familyInput.value.trim().toUpperCase();
            const { data: family } = await supabase!.from('families').select('id').eq('join_code', joinCode).maybeSingle();
            if (!family) throw new Error(`Invalid Family Invite Code '${joinCode}'.`);
            familyId = family.id;
        } else {
            const newJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { data: newFamily } = await supabase!.from('families').insert({ name: familyInput.value, join_code: newJoinCode }).select('id').single();
            familyId = newFamily.id;
        }

        await supabase!.from('profiles').insert({ id: userId, family_id: familyId, full_name: name });
        await supabase!.from('family_members').insert({ family_id: familyId, name: name, relationship: 'Self', linked_user_id: userId });
        return null;
    } catch (err: any) {
        await signOut();
        return err.message;
    }
};

export const signIn = async (email: string, password: string): Promise<string|null> => {
    if (isMock) {
        mockSession = { user: { id: MOCK_USER_ID, email, user_metadata: { full_name: 'Demo User' } } } as any;
        return null;
    }
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
};

export const signOut = async (): Promise<void> => {
    if (isMock) mockSession = null;
    else {
        try {
            await supabase!.auth.signOut();
        } catch (e) {
            console.error("SignOut error", e);
        }
    }
};

export const sendPasswordResetEmail = async (email: string): Promise<string | null> => {
    if (isMock) return null;
    const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    return error ? error.message : null;
};

export const updatePassword = async (newPassword: string): Promise<string | null> => {
    if (isMock) return null;
    const { error } = await supabase!.auth.updateUser({ password: newPassword });
    return error ? error.message : null;
};

export const updateUserEmail = async (newEmail: string): Promise<string | null> => {
    if (isMock) return null;
    const { error } = await supabase!.auth.updateUser({ email: newEmail });
    return error ? error.message : null;
};

// --- DATA FUNCTIONS ---

export const getUserData = async (userId: string) => {
    if (isMock) {
        return { familyMembers: [], timelineEntries: [], medications: [], familyInfo: { name: 'Demo Family', joinCode: 'MOCK12' } };
    }

    const { data: profile, error: profileErr } = await supabase!
        .from('profiles')
        .select('family_id, families(name, join_code)')
        .eq('id', userId)
        .single();
    
    if (profileErr || !profile) throw new Error("Could not find family profile.");

    const familyId = profile.family_id;
    const familyInfo = { 
        name: (profile.families as any).name, 
        joinCode: (profile.families as any).join_code 
    };

    const { data: familyMembers } = await supabase!
        .from('family_members')
        .select('*')
        .eq('family_id', familyId);
    
    const memberIds = familyMembers?.map(m => m.id) || [];
    
    const { data: timelineEntries } = await supabase!
        .from('timeline_entries')
        .select('*')
        .in('family_member_id', memberIds)
        .order('date', { ascending: false });

    const { data: medications } = await supabase!
        .from('medications')
        .select('*')
        .in('family_member_id', memberIds)
        .order('created_at', { ascending: false });

    return {
        familyMembers: familyMembers || [],
        timelineEntries: timelineEntries || [],
        medications: medications || [],
        familyInfo
    };
};

export const addFamilyMember = async (details: { name: string; relationship: string; dob: string; }): Promise<void> => {
    if (isMock) return;
    const userRes = await supabase!.auth.getUser();
    const userId = userRes.data.user?.id;
    if (!userId) throw new Error("Authentication required.");

    const { data: profile } = await supabase!.from('profiles').select('family_id').eq('id', userId).single();
    if (!profile) throw new Error("Family profile not found.");

    const { error } = await supabase!.from('family_members').insert({
        family_id: profile.family_id,
        name: details.name,
        relationship: details.relationship,
        dob: details.dob || null
    });

    if (error) throw error;
};

export const updateFamilyMember = async (
    memberId: string, 
    updates: { name: string, relationship: string, dob?: string }
): Promise<void> => {
    if (isMock) return;
    const { error } = await supabase!
        .from('family_members')
        .update({
            name: updates.name,
            relationship: updates.relationship,
            dob: updates.dob || null
        })
        .eq('id', memberId);

    if (error) throw error;
};

export const addTimelineEntry = async (
    newEntryData: any, 
    fileData: { name: string, type: string, data: string, password?: string },
    medications?: ExtractedMedication[]
): Promise<void> => {
    if (isMock) return;

    // 1. Upload File
    const blob = base64ToBlob(fileData.data, fileData.type);
    const filePath = `reports/${Date.now()}_${fileData.name}`;
    const { error: uploadError } = await supabase!.storage.from('reports').upload(filePath, blob);
    if (uploadError) throw uploadError;

    // 2. Insert Timeline Entry
    const { data: entry, error: entryError } = await supabase!.from('timeline_entries').insert({
        ...newEntryData,
        file_path: filePath,
        file_name: fileData.name,
        file_type: fileData.type,
        file_password: fileData.password || null
    }).select('id').single();

    if (entryError) throw entryError;

    // 3. Handle Medications
    if (medications && medications.length > 0) {
        const medsToInsert = medications.map(m => ({
            family_member_id: newEntryData.family_member_id,
            timeline_entry_id: entry.id,
            name: m.name,
            dosage: m.dosage || null,
            frequency: m.frequency || null,
            purpose: m.purpose || null,
            start_date: m.startDate || newEntryData.date,
            active: true
        }));
        await supabase!.from('medications').insert(medsToInsert);
    }
};

export const getFileForEntry = async (entryId: string) => {
    if (isMock) return null;
    const { data: entry, error } = await supabase!
        .from('timeline_entries')
        .select('file_path, file_name, file_type, file_password')
        .eq('id', entryId)
        .single();
    
    if (error || !entry) return null;

    const { data } = await supabase!.storage.from('reports').createSignedUrl(entry.file_path, 3600);
    return {
        signedUrl: data?.signedUrl || '',
        metadata: {
            name: entry.file_name,
            type: entry.file_type,
            password: entry.file_password
        }
    };
};

export const deleteTimelineEntry = async (entryId: string): Promise<void> => {
    if (isMock) return;
    const { data: entry } = await supabase!.from('timeline_entries').select('file_path').eq('id', entryId).single();
    if (entry?.file_path) {
        await supabase!.storage.from('reports').remove([entry.file_path]);
    }
    await supabase!.from('timeline_entries').delete().eq('id', entryId);
};

export const ignoreMismatch = async (entryId: string): Promise<void> => {
    if (isMock) return;
    await supabase!.from('timeline_entries').update({ mismatch_ignored: true }).eq('id', entryId);
};

export const addMedication = async (data: { family_member_id: string, name: string, dosage?: string, frequency?: string, purpose?: string, start_date?: string }): Promise<void> => {
    if (isMock) return;
    await supabase!.from('medications').insert({
        family_member_id: data.family_member_id,
        name: data.name,
        dosage: data.dosage,
        frequency: data.frequency,
        purpose: data.purpose,
        start_date: data.start_date || new Date().toISOString().split('T')[0],
        active: true
    });
};

export const stopMedication = async (id: string): Promise<void> => {
    if (isMock) return;
    await supabase!.from('medications').update({
        active: false,
        stopped_at: new Date().toISOString()
    }).eq('id', id);
};

export const createShareLink = async (entryId: string): Promise<string | null> => {
    if (isMock) return "https://mock-medhist-share.link/r/" + entryId;
    const result = await getFileForEntry(entryId);
    return result?.signedUrl || null;
};