
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
    try {
        const { data, error } = await supabase!.auth.getSession();
        
        if (error) {
            // Fix for "Invalid Refresh Token":
            // If the token in local storage is stale (e.g. user deleted from DB),
            // we must clear it so the user isn't stuck in a loop.
            console.warn("[medHist] Session invalid, clearing local state:", error.message);
            
            // Attempt to sign out to clear local storage. 
            // Wrap in try/catch because signOut might fail if the token is already garbage.
            try {
                await supabase!.auth.signOut();
            } catch (soError) {
                console.warn("[medHist] Force signOut failed (expected):", soError);
            }
            return null;
        }
        return data.session;
    } catch (e) {
        console.error("[medHist] Unexpected session error:", e);
        try { await supabase!.auth.signOut(); } catch {}
        return null;
    }
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
 * 5. (DB Trigger) Automatically creates 'Self' Family Member.
 */
export const signUp = async (name: string, email: string, password: string, familyInput: { isJoin: boolean, value: string }): Promise<string|null> => {
    console.log(`[medHist] Starting Signup for ${email}...`);
    
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

    if (authError) {
        console.error('[medHist] Auth Error:', authError);
        return authError.message;
    }
    
    if (!authData.user) return "Signup failed: No user created.";

    // CRITICAL CHECK: If email verification is enabled, session will be null.
    if (!authData.session) {
        console.warn('[medHist] No session returned. Email verification likely enabled.');
        return "Please disable 'Confirm email' in Supabase Dashboard -> Authentication -> Providers -> Email. This app requires instant login to create the family group.";
    }

    console.log('[medHist] Auth Successful. User ID:', authData.user.id);

    // Force set the session on the client to ensure subsequent DB calls use this user
    const { error: sessionError } = await supabase!.auth.setSession({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
    });
    if (sessionError) console.warn("[medHist] Failed to force set session:", sessionError);

    const userId = authData.user.id;
    let familyId = '';

    try {
        if (familyInput.isJoin) {
            // --- JOIN EXISTING FAMILY ---
            const joinCode = familyInput.value.toUpperCase();
            console.log('[medHist] Joining family with code:', joinCode);
            
            // Use maybeSingle to avoid 406/400 crashes
            const { data: family, error: findError } = await supabase!
                .from('families')
                .select('id')
                .eq('join_code', joinCode)
                .maybeSingle();
            
            if (findError) {
                console.error('[medHist] Family Lookup DB Error:', findError);
                throw new Error(`Database error looking up family: ${findError.message}`);
            }
            if (!family) {
                throw new Error("Invalid Family Join Code. Please check and try again.");
            }
            
            familyId = family.id;
            console.log('[medHist] Found Family:', familyId);

        } else {
            // --- CREATE NEW FAMILY ---
            const familyName = familyInput.value;
            const newJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            console.log('[medHist] Creating new family:', familyName);

            const { data: newFamily, error: createError } = await supabase!
                .from('families')
                .insert({ name: familyName, join_code: newJoinCode })
                .select('id')
                .single();

            if (createError) {
                console.error("[medHist] Family Creation Error:", createError);
                throw new Error(`Failed to create family group: ${createError.message} (Check RLS Policies)`);
            }
            familyId = newFamily.id;
            console.log('[medHist] Family Created:', familyId);
        }

        // 2. Create User Profile linked to Family
        // NOTE: The DB Trigger 'on_profile_created' will automatically create the 'Self' family member row.
        console.log('[medHist] Creating Profile for user:', userId);
        const { error: profileError } = await supabase!
            .from('profiles')
            .insert({
                id: userId,
                family_id: familyId,
                full_name: name
            });

        if (profileError) {
            console.error("[medHist] Profile Creation Error:", profileError);
            throw new Error(`Failed to create user profile: ${profileError.message}`);
        }
        console.log('[medHist] Profile Created. DB Trigger should have created Member row.');

    } catch (err: any) {
        console.error("[medHist] Process Aborted:", err);
        // CRITICAL: If any step fails after Auth Signup (e.g. duplicate family join code, profile creation error),
        // we MUST sign out the user, otherwise they are stuck in a zombie state (Logged in but no profile).
        await signOut();
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

export const sendPasswordResetEmail = async (email: string): Promise<string | null> => {
    if (isMock) return null;
    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, // Redirect back to this app
    });
    return error ? error.message : null;
};

export const updatePassword = async (newPassword: string): Promise<string | null> => {
    if (isMock) return null;
    const { error } = await supabase!.auth.updateUser({ password: newPassword });
    return error ? error.message : null;
};

// --- DATA FUNCTIONS ---

export const getUserData = async (userId: string): Promise<{ 
    familyMembers: FamilyMember[], 
    timelineEntries: TimelineEntry[],
    familyInfo: { name: string, joinCode: string }
}> => {
    console.log('[medHist] Fetching User Data for:', userId);

    if (isMock) {
        return {
            familyMembers: [{ id: '1', family_id: MOCK_FAMILY_ID, name: 'Demo User', relationship: 'Self' }],
            timelineEntries: [],
            familyInfo: { name: "Demo Family", joinCode: "DEMO12" }
        };
    }

    // 1. Get User's Profile to find Family ID
    // Fix: Use maybeSingle() to prevent 406 Not Acceptable errors if RLS hides the row
    const { data: profile, error: profileError } = await supabase!
        .from('profiles')
        .select('family_id, full_name')
        .eq('id', userId)
        .maybeSingle();

    if (profileError) {
        console.error('[medHist] Profile fetch error:', profileError);
        throw new Error("Could not load your profile. Please try logging out and back in.");
    }

    if (!profile) {
        console.warn('[medHist] Profile not found (returned null). RLS might be blocking access or creation failed.');
        // If auth exists but profile missing, return empty state rather than crashing
        return { familyMembers: [], timelineEntries: [], familyInfo: { name: 'Loading...', joinCode: '' } };
    }

    const familyId = profile.family_id;
    console.log('[medHist] Found Family ID:', familyId);

    // 2. Fetch Family Details, Members, and Entries
    const [familyRes, membersRes, entriesRes] = await Promise.all([
        supabase!.from('families').select('name, join_code').eq('id', familyId).maybeSingle(),
        supabase!.from('family_members').select('*').eq('family_id', familyId),
        supabase!.from('timeline_entries')
            .select('*, family_members!inner(family_id)') 
            .eq('family_members.family_id', familyId)
            .order('date', { ascending: false })
    ]);

    if (familyRes.error) console.error('[medHist] Family fetch error:', familyRes.error);
    if (membersRes.error) console.error('[medHist] Members fetch error:', membersRes.error);
    
    // No Self-Healing logic needed. The DB Trigger guarantees consistency.

    return {
        familyMembers: membersRes.data || [],
        timelineEntries: entriesRes.data || [],
        familyInfo: {
            name: familyRes.data?.name || 'My Family',
            joinCode: familyRes.data?.join_code || '---'
        }
    };
};

export const addFamilyMember = async (details: { name: string, relationship: string, dob?: string }): Promise<FamilyMember> => {
    if (isMock) return { id: 'mock', family_id: MOCK_FAMILY_ID, ...details };

    const { data: { user } } = await supabase!.auth.getUser();
    // Use maybeSingle for safety
    const { data: profile } = await supabase!.from('profiles').select('family_id').eq('id', user!.id).maybeSingle();

    if (!profile) throw new Error("Profile not found. Cannot add member.");

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
        .from('files').select('file_path').eq('timeline_entry_id', entryId).maybeSingle();

    if (fileMeta?.file_path) {
        await supabase!.storage.from('medical-reports').remove([fileMeta.file_path]);
    }
    
    await supabase!.from('timeline_entries').delete().eq('id', entryId);
};

export const getFileForEntry = async (timelineEntryId: string): Promise<{ metadata: ReportFile, signedUrl: string } | null> => {
    if (isMock) return null;

    const { data: fileMetadata } = await supabase!
        .from('files').select('*').eq('timeline_entry_id', timelineEntryId).maybeSingle();

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
