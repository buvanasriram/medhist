
import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
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
            console.warn("[medHist] Session invalid, clearing local state:", error.message);
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

export const signUp = async (name: string, email: string, password: string, familyInput: { isJoin: boolean, value: string }): Promise<string|null> => {
    console.log(`[medHist] Starting Signup for ${email}...`);
    
    if (isMock) {
        mockSession = {
            access_token: 'mock', refresh_token: 'mock', expires_in: 3600, token_type: 'bearer',
            user: { id: MOCK_USER_ID, email, user_metadata: { full_name: name } }
        } as any;
        return null;
    }

    const { data: authData, error: authError } = await supabase!.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
    });

    if (authError) {
        console.error('[medHist] Auth Error:', authError);
        await signOut(); 
        return authError.message;
    }
    
    if (!authData.user) return "Signup failed: No user created.";

    if (!authData.session) {
        console.warn('[medHist] No session returned. Email verification likely enabled.');
        return "Please disable 'Confirm email' in Supabase Dashboard -> Authentication -> Providers -> Email. This app requires instant login to create the family group.";
    }

    console.log('[medHist] Auth Successful. User ID:', authData.user.id);

    const { error: sessionError } = await supabase!.auth.setSession({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
    });
    if (sessionError) console.warn("[medHist] Failed to force set session:", sessionError);

    const userId = authData.user.id;
    let familyId = '';

    try {
        if (familyInput.isJoin) {
            const joinCode = familyInput.value.toUpperCase();
            console.log('[medHist] Joining family with code:', joinCode);
            
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
        redirectTo: window.location.origin, 
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
    medications: Medication[],
    familyInfo: { name: string, joinCode: string }
}> => {
    console.log('[medHist] Fetching User Data for:', userId);

    if (isMock) {
        return {
            familyMembers: [{ id: '1', family_id: MOCK_FAMILY_ID, name: 'Demo User', relationship: 'Self' }],
            timelineEntries: [],
            medications: [],
            familyInfo: { name: "Demo Family", joinCode: "DEMO12" }
        };
    }

    // 1. Get Profile to find Family ID
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
        return { familyMembers: [], timelineEntries: [], medications: [], familyInfo: { name: 'Loading...', joinCode: '' } };
    }

    const familyId = profile.family_id;

    // 2. Fetch Family Details
    const { data: familyInfoData, error: familyError } = await supabase!
        .from('families')
        .select('name, join_code')
        .eq('id', familyId)
        .maybeSingle();
    
    if (familyError) console.error('[medHist] Family fetch error:', familyError);

    // 3. Fetch Members (Two-Step Fetch Strategy)
    const { data: membersData, error: membersError } = await supabase!
        .from('family_members')
        .select('*')
        .eq('family_id', familyId);

    if (membersError) console.error('[medHist] Members fetch error:', membersError);
    
    const familyMembers = membersData || [];
    const memberIds = familyMembers.map(m => m.id);

    // 4. Fetch Entries & Medications using Member IDs
    let timelineEntries: TimelineEntry[] = [];
    let medications: Medication[] = [];

    if (memberIds.length > 0) {
        // Fetch Timeline Entries
        const { data: entriesData, error: entriesError } = await supabase!
            .from('timeline_entries')
            .select('*')
            .in('family_member_id', memberIds)
            .order('date', { ascending: false });

        if (entriesError) console.error('[medHist] Entries fetch error:', entriesError);
        else timelineEntries = entriesData || [];

        // Fetch ALL Medications
        const { data: medsData, error: medsError } = await supabase!
            .from('medications')
            .select('*')
            .in('family_member_id', memberIds);
            
        if (medsError) console.error('[medHist] Medications fetch error:', medsError);
        else medications = medsData || [];
    }

    return {
        familyMembers,
        timelineEntries,
        medications,
        familyInfo: {
            name: familyInfoData?.name || 'My Family',
            joinCode: familyInfoData?.join_code || '---'
        }
    };
};

export const addFamilyMember = async (details: { name: string, relationship: string, dob?: string }): Promise<FamilyMember> => {
    if (isMock) return { id: 'mock', family_id: MOCK_FAMILY_ID, ...details };

    const { data: { user } } = await supabase!.auth.getUser();
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

export const addTimelineEntry = async (entryData: any, fileData: any, extractedMeds: ExtractedMedication[] = []): Promise<TimelineEntry> => {
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

    // 4. Insert Extracted Medications (if any)
    if (extractedMeds && extractedMeds.length > 0) {
        // If the extraction didn't get a specific start date, use the Report Date as the default start date.
        const defaultStartDate = entryData.date || new Date().toISOString().split('T')[0];

        const medsToInsert = extractedMeds.map(m => ({
            family_member_id: entryData.family_member_id,
            timeline_entry_id: newEntry.id,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            purpose: m.purpose,
            start_date: m.startDate || defaultStartDate, // Use extracted or fallback to report date
            active: true
        }));
        
        const { error: medError } = await supabase!.from('medications').insert(medsToInsert);
        
        if (medError) {
             console.error("Failed to save medications:", JSON.stringify(medError, null, 2));
        }
    }

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

// --- MEDICATION FUNCTIONS ---

export const addMedication = async (medData: { family_member_id: string, name: string, dosage?: string, frequency?: string, purpose?: string, start_date?: string }): Promise<Medication> => {
    if (isMock) return { id: 'mock-med', active: true, ...medData };
    
    // Default to today if manual add didn't specify date
    const finalData = {
        ...medData,
        start_date: medData.start_date || new Date().toISOString().split('T')[0]
    };

    const { data, error } = await supabase!
        .from('medications')
        .insert(finalData)
        .select()
        .single();
    
    if (error) throw new Error(error.message);
    return data as Medication;
};

export const stopMedication = async (medId: string): Promise<void> => {
    if (isMock) return;
    const { error, data } = await supabase!
        .from('medications')
        .update({ 
            active: false,
            stopped_at: new Date().toISOString()
        })
        .eq('id', medId)
        .select()
        .single();

    if (error) {
        console.error("Stop Medication DB Error:", error);
        throw new Error(error.message || "Database refused to update medication.");
    }

    if (!data) {
        throw new Error("Medication not found or could not be updated.");
    }
};
