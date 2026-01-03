
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

/**
 * Enhanced Get Session with Auth Recovery
 * Detects stale refresh tokens and forces local purge to prevent Auth Loops.
 */
export const getSession = async (): Promise<Session | null> => {
    if (localStorage.getItem('medhist-explicit-logout') === 'true') {
        return null;
    }

    if (isMock) return mockSession;
    
    try {
        const { data, error } = await supabase!.auth.getSession();
        
        if (error) {
            // If the refresh token is invalid/not found, the session is unrecoverable.
            if (error.message?.includes("Refresh Token") || error.status === 400 || error.status === 401) {
                console.warn("[medHist] Stale session detected. Forcing local purge.");
                await signOut();
                return null;
            }
            throw error;
        }
        
        return data.session;
    } catch (e) {
        console.error("[medHist] Session Recovery Failed:", e);
        // Fallback: if we can't even check the session, we shouldn't trust local state
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

        localStorage.removeItem('medhist-explicit-logout');
        return null;
    } catch (err: any) {
        await signOut();
        return err.message;
    }
};

export const signIn = async (email: string, password: string): Promise<string|null> => {
    if (isMock) {
        localStorage.removeItem('medhist-explicit-logout');
        mockSession = { user: { id: MOCK_USER_ID, email, user_metadata: { full_name: 'Demo User' } } } as any;
        return null;
    }
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (!error) {
        localStorage.removeItem('medhist-explicit-logout');
    }
    return error ? error.message : null;
};

/**
 * Resilient Sign Out
 * Purges local state even if the server rejects the request (e.g. 403 Forbidden).
 */
export const signOut = async (): Promise<void> => {
    localStorage.setItem('medhist-explicit-logout', 'true');

    if (isMock) {
        mockSession = null;
    } else if (supabase) {
        try {
            // Attempt server-side signout. 
            // We use a timeout to prevent hanging if the network is distressed.
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000));
            await Promise.race([supabase.auth.signOut({ scope: 'global' }), timeout]);
        } catch (e: any) {
            // 403 is expected if the token is already invalid; we just proceed with local purge.
            console.debug("[medHist] Server-side logout rejected (expected if session stale). Purging local state.");
        }
    }

    // LOCAL PURGE - This is the most important part for fixing the login loop
    const keysToPurge = Object.keys(localStorage).filter(k => k.startsWith('sb-') || k.startsWith('medhist-') && k !== 'medhist-explicit-logout');
    keysToPurge.forEach(k => localStorage.removeItem(k));
    
    Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith('sb-') || k.startsWith('medhist-')) sessionStorage.removeItem(k);
    });

    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.startsWith('sb-') || name.startsWith('medhist-')) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
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
    const MAX_RETRIES = 5; 
    
    while (!profile && retries < MAX_RETRIES) {
        const { data, error } = await supabase!
            .from('profiles')
            .select('family_id')
            .eq('id', userId)
            .maybeSingle();
        
        if (data && data.family_id) {
            profile = data;
        } else {
            retries++;
            if (retries < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }
    }
    
    if (!profile) throw new Error("Registry Initialization Pending. If this persists, please try logging out and back in.");

    const familyId = profile.family_id;

    const [familyInfoRes, membersRes] = await Promise.all([
        supabase!.from('families').select('name, join_code').eq('id', familyId).single(),
        supabase!.from('family_members').select('*').eq('family_id', familyId)
    ]);

    if (membersRes.error) throw membersRes.error;

    const familyMembers = membersRes.data || [];
    if (familyMembers.length === 0) {
        return { 
            familyMembers: [], 
            timelineEntries: [], 
            medications: [], 
            familyInfo: familyInfoRes.data ? { name: familyInfoRes.data.name, joinCode: familyInfoRes.data.join_code } : null 
        };
    }

    const memberIds = familyMembers.map(m => m.id);

    const [timelineRes, medsRes] = await Promise.all([
        supabase!
            .from('timeline_entries')
            .select('*, files(*)')
            .in('family_member_id', memberIds)
            .order('date', { ascending: false }),
        supabase!
            .from('medications')
            .select('*')
            .in('family_member_id', memberIds)
            .order('created_at', { ascending: false })
    ]);

    return {
        familyMembers: familyMembers,
        timelineEntries: (timelineRes.data || []).map(e => ({
            ...e,
            file: e.files?.[0] ? {
                id: e.files[0].id,
                name: e.files[0].name,
                type: e.files[0].type
            } : undefined
        })),
        medications: medsRes.data || [],
        familyInfo: familyInfoRes.data ? { name: familyInfoRes.data.name, joinCode: familyInfoRes.data.join_code } : null
    };
};

export const addFamilyMember = async (details: { name: string; relationship: string; dob: string; }) => {
    if (isMock) return;
    const session = await getSession();
    if (!session) throw new Error("Authentication Required: Please log in again.");

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

const sanitizePath = (path: string): string => {
    if (!path) return '';
    let clean = path.trim();
    try { clean = decodeURIComponent(clean); } catch (e) { }
    const bucketPrefixes = [`${STORAGE_BUCKET}/`, `/${STORAGE_BUCKET}/`, 'reports/', '/reports/'];
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
    if (!session) throw new Error("Session expired. Please sign out and sign in again.");

    // 1. Insert Timeline Entry
    const { data: entry, error: entryError } = await supabase!
        .from('timeline_entries')
        .insert({
            ...entryData,
            uploaded_by_user_id: session.user.id
        })
        .select()
        .single();

    if (entryError || !entry) {
        console.error("[medHist] DB Insert Error:", entryError);
        throw new Error(entryError?.message || "Failed to create timeline entry. Your session may be invalid.");
    }

    const { data: profile } = await supabase!.from('profiles').select('family_id').eq('id', session.user.id).single();
    const familyId = profile?.family_id || entry.family_member_id;
    const filePath = `${familyId}/${entry.id}/${fileData.name}`;
    
    const fileBlob = base64ToBlob(fileData.data, fileData.type);
    
    // 2. Upload to Storage
    const { error: uploadError } = await supabase!.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, fileBlob, { contentType: fileData.type, upsert: true });

    if (uploadError) {
        // Cleanup the record if upload fails
        await supabase!.from('timeline_entries').delete().eq('id', entry.id);
        throw new Error("File upload failed: " + uploadError.message);
    }

    // 3. Link File in DB
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

    // 4. Handle Medications
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
    return data || null;
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
