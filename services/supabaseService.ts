
import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { FamilyMember, TimelineEntry, ReportFile } from '../types';
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
        throw new Error("Missing credentials");
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

// --- MOCK DATA ---
const MOCK_USER_ID = 'mock-user-123';
const MOCK_FAMILY_ID = 'mock-family-999';
let mockSession: Session | null = null;

// --- AUTH FUNCTIONS ---

export const getSession = async (): Promise<Session | null> => {
    if (isMock) return mockSession;
    const { data } = await supabase!.auth.getSession();
    return data.session;
};

export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
    if (isMock) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase!.auth.onAuthStateChange(callback);
};

/**
 * Sign Up Logic:
 * 1. Create Auth User
 * 2. If inviteCode provided: Join existing family.
 * 3. If NO inviteCode: Create new Family.
 * 4. Create Profile linked to Family.
 */
export const signUp = async (name: string, email: string, password: string, familyInput: { isJoin: boolean, value: string }): Promise<string|null> => {
    if (isMock) {
        mockSession = {
            access_token: 'mock', refresh_token: 'mock', expires_in: 3600, token_type: 'bearer',
            user: { id: MOCK_USER_ID, email, user_metadata: { full_name: name } }
        } as any;
        return null;
    }

    // 1. Sign up the user in Auth
    const { data: authData, error: authError } = await supabase!.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
    });

    if (authError) return authError.message;
    if (!authData.user) return "Signup failed: No user created.";

    const userId = authData.user.id;
    let familyId = '';

    try {
        if (familyInput.isJoin) {
            // --- JOIN EXISTING FAMILY ---
            const joinCode = familyInput.value.toUpperCase();
            const { data: family, error: findError } = await supabase!
                .from('families')
                .select('id')
                .eq('join_code', joinCode)
                .single();
            
            if (findError || !family) throw new Error("Invalid Family Join Code. Please check and try again.");
            familyId = family.id;
        } else {
            // --- CREATE NEW FAMILY ---
            const familyName = familyInput.value;
            const newJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            const { data: newFamily, error: createError } = await supabase!
                .from('families')
                .insert({ name: familyName, join_code: newJoinCode })
                .select('id')
                .single();

            if (createError) throw new Error("Failed to create family group.");
            familyId = newFamily.id;
        }

        // 2. Create User Profile linked to Family
        const { error: profileError } = await supabase!
            .from('profiles')
            .insert({
                id: userId,
                family_id: familyId,
                full_name: name
            });

        if (profileError) throw new Error("Failed to create user profile.");

        // 3. (Optional) If creating new family, create a "Self" member for them automatically
        if (!familyInput.isJoin) {
             await supabase!.from('family_members').insert({
                 family_id: familyId,
                 name: name,
                 relationship: 'Self' // Can be edited later
             });
        }

    } catch (err: any) {
        // Cleanup: If profile creation failed, we might leave the auth user hanging, 
        // but for MVP we just return error.
        console.error("Signup Process Error:", err);
        return err.message;
    }

    return null;
};

export const signIn = async (email: string, password: string): Promise<string|null> => {
    if (isMock) {
        mockSession = { user: { id: MOCK_USER_ID, email } } as any;
        return null;
    }
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
};

export const signOut = async (): Promise<void> => {
    if (isMock) mockSession = null;
    else await supabase!.auth.signOut();
};

// --- DATA FUNCTIONS ---

export const getUserData = async (userId: string): Promise<{ 
    familyMembers: FamilyMember[], 
    timelineEntries: TimelineEntry[],
    familyInfo: { name: string, joinCode: string }
}> => {
    if (isMock) {
        return {
            familyMembers: [{ id: '1', family_id: MOCK_FAMILY_ID, name: 'Demo User', relationship: 'Self' }],
            timelineEntries: [],
            familyInfo: { name: "Demo Family", joinCode: "DEMO12" }
        };
    }

    // 1. Get User's Profile to find Family ID
    const { data: profile } = await supabase!
        .from('profiles')
        .select('family_id')
        .eq('id', userId)
        .single();

    if (!profile) {
        // Handle edge case where auth exists but profile missing (migration issue)
        return { familyMembers: [], timelineEntries: [], familyInfo: { name: 'Unknown', joinCode: '' } };
    }

    const familyId = profile.family_id;

    // 2. Fetch Family Details, Members, and Entries in parallel
    const [familyRes, membersRes, entriesRes] = await Promise.all([
        supabase!.from('families').select('name, join_code').eq('id', familyId).single(),
        supabase!.from('family_members').select('*').eq('family_id', familyId),
        supabase!.from('timeline_entries')
            .select('*, family_members!inner(family_id)') // Ensure we only get entries for this family
            .eq('family_members.family_id', familyId)
            .order('date', { ascending: false })
    ]);

    if (familyRes.error) throw new Error("Failed to fetch family info");

    return {
        familyMembers: membersRes.data || [],
        timelineEntries: entriesRes.data || [],
        familyInfo: {
            name: familyRes.data.name,
            joinCode: familyRes.data.join_code
        }
    };
};

export const addFamilyMember = async (details: { name: string, relationship: string, dob?: string }): Promise<FamilyMember> => {
    if (isMock) return { id: 'mock', family_id: MOCK_FAMILY_ID, ...details };

    // Get current user's family_id via profile
    const { data: { user } } = await supabase!.auth.getUser();
    const { data: profile } = await supabase!.from('profiles').select('family_id').eq('id', user!.id).single();

    const { data, error } = await supabase!
        .from('family_members')
        .insert({
            family_id: profile.family_id,
            name: details.name,
            relationship: details.relationship,
            dob: details.dob || null
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data as FamilyMember;
};

export const addTimelineEntry = async (entryData: any, fileData: any): Promise<TimelineEntry> => {
    if (isMock) return { id: 'mock-entry', ...entryData };

    const { data: { user } } = await supabase!.auth.getUser();
    
    // 1. Insert Metadata
    const { data: newEntry, error: entryError } = await supabase!
        .from('timeline_entries')
        .insert({ ...entryData, uploaded_by_user_id: user!.id })
        .select()
        .single();
    
    if (entryError) throw new Error(entryError.message);

    // 2. Upload File
    const filePath = `${entryData.family_member_id}/${newEntry.id}/${fileData.name}`;
    const blob = base64ToBlob(fileData.data, fileData.type);
    
    const { error: uploadError } = await supabase!.storage
        .from('medical-reports')
        .upload(filePath, blob, { contentType: fileData.type });

    if (uploadError) {
        await supabase!.from('timeline_entries').delete().eq('id', newEntry.id);
        throw new Error(uploadError.message);
    }

    // 3. File Metadata
    const { error: fileError } = await supabase!.from('files').insert({
        timeline_entry_id: newEntry.id,
        name: fileData.name, 
        type: fileData.type, 
        file_path: filePath,
        password: fileData.password,
    });

    if (fileError) throw new Error(fileError.message);

    return newEntry as TimelineEntry;
};

export const deleteTimelineEntry = async (entryId: string): Promise<void> => {
    if (isMock) return;

    const { data: fileMeta } = await supabase!
        .from('files').select('file_path').eq('timeline_entry_id', entryId).single();

    if (fileMeta?.file_path) {
        await supabase!.storage.from('medical-reports').remove([fileMeta.file_path]);
    }
    
    await supabase!.from('timeline_entries').delete().eq('id', entryId);
};

export const getFileForEntry = async (timelineEntryId: string): Promise<{ metadata: ReportFile, signedUrl: string } | null> => {
    if (isMock) return null;

    const { data: fileMetadata } = await supabase!
        .from('files').select('*').eq('timeline_entry_id', timelineEntryId).single();

    if (!fileMetadata?.file_path) return null;

    const { data: signedUrlData } = await supabase!.storage
        .from('medical-reports').createSignedUrl(fileMetadata.file_path, 300);

    if (!signedUrlData) return null;
    
    return { 
        metadata: { ...fileMetadata }, 
        signedUrl: signedUrlData.signedUrl 
    };
};

export const ignoreMismatch = async (entryId: string) => {
     const { data } = await supabase!.from('timeline_entries').update({ mismatch_ignored: true }).eq('id', entryId).select().single();
     return data;
};
