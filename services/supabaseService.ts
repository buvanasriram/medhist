
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

// --- AUTH FUNCTIONS ---

export const getSession = async (): Promise<Session | null> => {
    if (isMock) return mockSession;
    try {
        const { data, error } = await supabase!.auth.getSession();
        if (error) return null;
        return data.session;
    } catch (e) {
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
    
    const user = authData.user;
    if (!user) return "Signup failed: User not created.";

    try {
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
            
            if (response.error || !response.data) {
                throw new Error(response.error?.message || "Failed to create family group.");
            }
            familyId = response.data.id;
        }

        await supabase!.from('profiles').insert({ id: user.id, family_id: familyId, full_name: name });
        await supabase!.from('family_members').insert({ 
            family_id: familyId, 
            name: name, 
            relationship: 'Self', 
            linked_user_id: user.id 
        });

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
    if (isMock) {
        mockSession = null;
    } else {
        try {
            await supabase!.auth.signOut();
        } catch (e) {
            console.error("SignOut error", e);
        }
    }
};

export const sendPasswordResetEmail = async (email: string): Promise<string|null> => {
    if (isMock) return null;
    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
    });
    return error ? error.message : null;
};

export const updatePassword = async (password: string): Promise<string|null> => {
    if (isMock) return null;
    const { error } = await supabase!.auth.updateUser({ password });
    return error ? error.message : null;
};

export const updateUserEmail = async (email: string): Promise<string|null> => {
    if (isMock) return null;
    const { error } = await supabase!.auth.updateUser({ email });
    return error ? error.message : null;
};

// --- DATA FUNCTIONS ---

export const getUserData = async (userId: string) => {
    if (isMock) {
        return { familyMembers: [], timelineEntries: [], medications: [], familyInfo: { name: 'Demo Family', joinCode: 'MOCK12' } };
    }

    let profile = null;
    let retries = 0;
    // Faster polling for better UI responsiveness
    while (!profile && retries < 20) {
        const { data } = await supabase!
            .from('profiles')
            .select('family_id')
            .eq('id', userId)
            .maybeSingle();
        
        if (data && data.family_id) {
            profile = data;
        } else {
            retries++;
            // Poll every 500ms instead of 800ms
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    if (!profile) throw new Error("Synchronization in progress. Please refresh in a moment.");

    const familyId = profile.family_id;

    const { data: familyInfo } = await supabase!
        .from('families')
        .select('name, join_code')
        .eq('id', familyId)
        .single();

    const { data: familyMembers } = await supabase!
        .from('family_members')
        .select('*')
        .eq('family_id', familyId);

    const memberIds = familyMembers?.map(m => m.id) || [];

    const { data: timelineEntries } = await supabase!
        .from('timeline_entries')
        .select('*, files(*)')
        .in('family_member_id', memberIds)
        .order('date', { ascending: false });

    const { data: medications } = await supabase!
        .from('medications')
        .select('*')
        .in('family_member_id', memberIds)
        .order('created_at', { ascending: false });

    return {
        familyMembers: familyMembers || [],
        timelineEntries: (timelineEntries || []).map(e => ({
            ...e,
            file: e.files?.[0] ? {
                id: e.files[0].id,
                name: e.files[0].name,
                type: e.files[0].type
            } : undefined
        })),
        medications: medications || [],
        familyInfo: familyInfo ? { name: familyInfo.name, joinCode: familyInfo.join_code } : null
    };
};

export const addFamilyMember = async (details: { name: string; relationship: string; dob: string; }) => {
    if (isMock) return;
    const session = await getSession();
    if (!session) throw new Error("No session");

    const { data: profile } = await supabase!
        .from('profiles')
        .select('family_id')
        .eq('id', session.user.id)
        .single();

    if (!profile) throw new Error("Profile not found");

    const { error } = await supabase!
        .from('family_members')
        .insert({
            family_id: profile.family_id,
            name: details.name,
            relationship: details.relationship,
            dob: details.dob || null
        });

    if (error) throw error;
};

export const updateFamilyMember = async (id: string, updates: { name: string; relationship: string; dob: string; }) => {
    if (isMock) return;
    const { error } = await supabase!
        .from('family_members')
        .update({
            name: updates.name,
            relationship: updates.relationship,
            dob: updates.dob || null
        })
        .eq('id', id);
    if (error) throw error;
};

export const addMedication = async (data: any) => {
    if (isMock) return;
    const { error } = await supabase!
        .from('medications')
        .insert({
            family_member_id: data.family_member_id,
            timeline_entry_id: data.timeline_entry_id,
            name: data.name,
            dosage: data.dosage,
            frequency: data.frequency,
            purpose: data.purpose,
            start_date: data.start_date,
            active: true
        });
    if (error) throw error;
};

export const stopMedication = async (id: string) => {
    if (isMock) return;
    const { error } = await supabase!
        .from('medications')
        .update({
            active: false,
            stopped_at: new Date().toISOString()
        })
        .eq('id', id);
    if (error) throw error;
};

/**
 * Robust path cleaner for Supabase Storage.
 */
const sanitizePath = (path: string): string => {
    if (!path) return '';
    let clean = path.trim();
    
    try { clean = decodeURIComponent(clean); } catch (e) { /* ignore */ }
    
    const bucketPrefixes = [
        `${STORAGE_BUCKET}/`, 
        `/${STORAGE_BUCKET}/`, 
        'reports/', 
        '/reports/', 
        'medical_reports/', 
        '/medical_reports/',
        'medical-reports/',
        '/medical-reports/'
    ];
    for (const prefix of bucketPrefixes) {
        if (clean.toLowerCase().startsWith(prefix.toLowerCase())) {
            clean = clean.substring(prefix.length);
        }
    }
    
    return clean.replace(/^\/+/, '');
};

export const addTimelineEntry = async (entryData: any, fileData: any, medications?: ExtractedMedication[]) => {
    if (isMock) return;
    const session = await getSession();
    if (!session) throw new Error("No session");

    const response = await supabase!
        .from('timeline_entries')
        .insert({
            ...entryData,
            uploaded_by_user_id: session.user.id
        })
        .select()
        .single();

    if (response.error || !response.data) throw response.error || new Error("Failed to create timeline entry.");
    const entry = response.data;

    const { data: profile } = await supabase!.from('profiles').select('family_id').eq('id', session.user.id).single();
    const familyId = profile?.family_id || entry.family_member_id;
    const filePath = `${familyId}/${entry.id}/${fileData.name}`;
    
    const fileBlob = base64ToBlob(fileData.data, fileData.type);
    const { error: uploadError } = await supabase!.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, fileBlob, { contentType: fileData.type, upsert: true });

    if (uploadError) throw uploadError;

    const { error: fileError } = await supabase!
        .from('files')
        .insert({
            timeline_entry_id: entry.id,
            name: fileData.name,
            type: fileData.type,
            file_path: filePath,
            password: fileData.password
        });

    if (fileError) throw fileError;

    if (medications && medications.length > 0) {
        const medsToInsert = medications.map(m => ({
            family_member_id: entry.family_member_id,
            timeline_entry_id: entry.id,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            purpose: m.purpose,
            start_date: m.startDate,
            active: true
        }));
        await supabase!.from('medications').insert(medsToInsert);
    }

    return entry;
};

export const deleteTimelineEntry = async (entryId: string) => {
    if (isMock) return;

    const { data: fileRecord } = await supabase!
        .from('files')
        .select('file_path')
        .eq('timeline_entry_id', entryId)
        .maybeSingle();

    if (fileRecord?.file_path) {
        const cleanPath = sanitizePath(fileRecord.file_path);
        await supabase!.storage.from(STORAGE_BUCKET).remove([cleanPath]);
    }

    await supabase!.from('timeline_entries').delete().eq('id', entryId);
};

export const getFileForEntry = async (entryId: string) => {
    if (isMock) return null;

    const { data: fileMetadata, error: metaError } = await supabase!
        .from('files')
        .select('*')
        .eq('timeline_entry_id', entryId)
        .maybeSingle();

    if (metaError || !fileMetadata) return null;

    const dbPath = fileMetadata.file_path || (fileMetadata as any).storage_path;
    if (!dbPath) return null;

    const cleanPath = sanitizePath(dbPath);

    // Multi-stage path hunting to handle various encoding scenarios
    const pathsToTry = [
        dbPath,                                        // 1. Exact DB path
        cleanPath,                                     // 2. Sanity-cleaned path
        dbPath.replace(/ /g, '%20'),                   // 3. Simple space encoding
        encodeURIComponent(dbPath).replace(/%2F/g, '/') // 4. Segment-wise encoding
    ];

    let finalResult = null;
    for (const p of pathsToTry) {
        if (!p) continue;
        const result = await supabase!.storage.from(STORAGE_BUCKET).createSignedUrl(p, 3600);
        if (!result.error && result.data?.signedUrl) {
            finalResult = { signedUrl: result.data.signedUrl, path: p };
            break;
        }
    }

    if (!finalResult) {
        console.error(`[Supabase] Storage Error for ID ${entryId}: Not found in '${STORAGE_BUCKET}' at:`, pathsToTry);
        return null;
    }

    return {
        signedUrl: finalResult.signedUrl,
        filePath: finalResult.path,
        metadata: {
            id: fileMetadata.id,
            name: fileMetadata.name,
            type: fileMetadata.type,
            password: fileMetadata.password
        }
    };
};

export const downloadFile = async (path: string): Promise<Blob | null> => {
    if (isMock) return null;
    const cleanPath = sanitizePath(path);
    const { data, error } = await supabase!.storage.from(STORAGE_BUCKET).download(cleanPath);
    if (error) {
        const { data: fallbackData } = await supabase!.storage.from(STORAGE_BUCKET).download(path);
        return fallbackData || null;
    }
    return data;
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
