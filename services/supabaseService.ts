
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

    let userId = '';
    
    // 1. Attempt Sign Up
    const { data: authData, error: authError } = await supabase!.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
    });

    if (authError) {
        // Handle "User already registered" error gracefully
        if (authError.message.toLowerCase().includes("already registered")) {
            console.log('[medHist] User exists. Attempting to log in with provided password...');
            
            const { data: loginData, error: loginError } = await supabase!.auth.signInWithPassword({
                email,
                password
            });

            if (loginError) {
                 console.warn('[medHist] Auto-login failed:', loginError.message);
                 return "An account with this email already exists. Please log in.";
            }
            
            if (loginData.user) {
                userId = loginData.user.id;
                console.log('[medHist] Auto-login successful.');
            } else {
                return "Login failed after signup error.";
            }
        } else {
            console.error('[medHist] Auth Error:', authError);
            return authError.message;
        }
    } else {
        if (!authData.user) return "Signup failed: No user created.";
        userId = authData.user.id;
    }

    // 2. Check for Existing Profile (To avoid duplicate families)
    try {
        const { data: existingProfile } = await supabase!
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();
            
        if (existingProfile) {
            console.log('[medHist] User already has a profile. Login successful.');
            return null; // Return success, app will load existing data
        }

        // --- NEW USER SETUP ---
        let familyId = '';

        if (familyInput.isJoin) {
            const joinCode = familyInput.value.trim().toUpperCase();
            console.log('[medHist] Joining family with code:', joinCode);
            
            if (joinCode.length < 6) throw new Error("Join Code must be at least 6 characters.");

            const { data: family, error: findError } = await supabase!
                .from('families')
                .select('id')
                .eq('join_code', joinCode)
                .maybeSingle();
            
            if (findError) {
                throw new Error(`Database error looking up family: ${findError.message}`);
            }
            if (!family) {
                throw new Error(`Invalid Family Join Code '${joinCode}'. Please check and try again.`);
            }
            familyId = family.id;

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
                throw new Error(`Failed to create family group: ${createError.message}`);
            }
            familyId = newFamily.id;
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
            throw new Error(`Failed to create user profile: ${profileError.message}`);
        }

    } catch (err: any) {
        console.error("[medHist] Process Aborted:", err.message);
        await signOut();
        return err.message;
    }

    return null;
};

export const joinExistingFamily = async (joinCode: string): Promise<void> => {
    if (isMock) {
        console.log("[Mock] Joined family with code:", joinCode);
        return;
    }

    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // 1. Validate Code & Get New Family ID
    const { data: newFamily, error: findError } = await supabase!
        .from('families')
        .select('id')
        .eq('join_code', joinCode.trim().toUpperCase())
        .maybeSingle();

    if (findError || !newFamily) throw new Error("Invalid Join Code.");

    // 2. Get Current Family ID to identify which members to move
    const { data: currentProfile } = await supabase!
        .from('profiles')
        .select('family_id')
        .eq('id', user.id)
        .single();
    
    if (!currentProfile) throw new Error("Profile not found.");
    
    // Prevent joining same family
    if (currentProfile.family_id === newFamily.id) {
        throw new Error("You are already a member of this family.");
    }

    // 3. Update Profile to new Family
    const { error: profileUpdateError } = await supabase!
        .from('profiles')
        .update({ family_id: newFamily.id })
        .eq('id', user.id);

    if (profileUpdateError) throw new Error(profileUpdateError.message);

    // 4. Move Members created in the old family to the new family
    const { error: memberUpdateError } = await supabase!
        .from('family_members')
        .update({ family_id: newFamily.id })
        .eq('family_id', currentProfile.family_id);

    if (memberUpdateError) {
        console.error("Partial migration error:", memberUpdateError);
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
    else await supabase!.auth.signOut();
};

export const sendPasswordResetEmail = async (email: string): Promise<string | null> => {
    if (isMock) return null;
    
    // Ensure the redirect URL is clean and valid.
    // If testing on localhost, this will be http://localhost:PORT
    // If on Vercel, this will be https://your-app.vercel.app
    let redirectTo = window.location.origin;
    if (redirectTo.endsWith('/')) {
        redirectTo = redirectTo.slice(0, -1);
    }

    console.log(`[medHist] Sending password reset for ${email} with redirect: ${redirectTo}`);

    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo, 
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

    // 1. Get Profile with Retry (Self-Healing)
    let profile = null;
    let attempts = 0;
    while (attempts < 5) {
        const { data, error } = await supabase!
            .from('profiles')
            .select('family_id, full_name')
            .eq('id', userId)
            .maybeSingle();
            
        if (data) {
            profile = data;
            break;
        }
        
        console.warn(`[medHist] Profile fetch attempt ${attempts + 1} failed/empty. Retrying...`);
        attempts++;
        await new Promise(r => setTimeout(r, 800)); // Wait 800ms
    }

    if (!profile) {
        console.error("[medHist] Profile missing after retries.");
        throw new Error("Could not load your profile. Please check your connection.");
    }

    const familyId = profile.family_id;
    console.log('[medHist] Found Family ID:', familyId);

    // 2. Fetch Family Details
    const { data: familyInfoData } = await supabase!
        .from('families')
        .select('name, join_code')
        .eq('id', familyId)
        .maybeSingle();

    // 3. Fetch Members with Smart Wait
    let familyMembers: FamilyMember[] = [];
    let memberAttempts = 0;
    
    while(memberAttempts < 5) {
         const { data, error } = await supabase!
            .from('family_members')
            .select('*')
            .eq('family_id', familyId);
            
         if(error) console.error("Member fetch error:", error);
         
         if(data && data.length > 0) {
             familyMembers = data;
             break;
         }
         
         console.log(`[medHist] No members found (Attempt ${memberAttempts+1}). Waiting for DB...`);
         memberAttempts++;
         await new Promise(r => setTimeout(r, 1000));
    }

    const memberIds = familyMembers.map(m => m.id);

    // 4. Fetch Entries & Medications
    let timelineEntries: TimelineEntry[] = [];
    let medications: Medication[] = [];

    if (memberIds.length > 0) {
        const { data: entriesData } = await supabase!
            .from('timeline_entries')
            .select('*')
            .in('family_member_id', memberIds)
            .order('date', { ascending: false });

        if (entriesData) timelineEntries = entriesData;

        const { data: medsData } = await supabase!
            .from('medications')
            .select('*')
            .in('family_member_id', memberIds);
            
        if (medsData) medications = medsData;
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
        .insert({ 
            ...entryData, 
            uploaded_by_user_id: user!.id,
            follow_up_date: entryData.follow_up_date || null 
        })
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
        const defaultStartDate = entryData.date || new Date().toISOString().split('T')[0];

        const medsToInsert = extractedMeds.map(m => ({
            family_member_id: entryData.family_member_id,
            timeline_entry_id: newEntry.id,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            purpose: m.purpose,
            start_date: m.startDate || defaultStartDate,
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

export const createShareLink = async (timelineEntryId: string): Promise<string | null> => {
    if (isMock) return "https://mock-share-link.com/file.pdf";
    
    const { data: fileMetadata } = await supabase!
        .from('files').select('file_path').eq('timeline_entry_id', timelineEntryId).maybeSingle();

    if (!fileMetadata?.file_path) return null;

    const { data } = await supabase!.storage
        .from('medical-reports')
        .createSignedUrl(fileMetadata.file_path, 86400);

    return data ? data.signedUrl : null;
};

export const ignoreMismatch = async (entryId: string) => {
     if (isMock) return { id: entryId, mismatch_ignored: true };
     const { data } = await supabase!.from('timeline_entries').update({ mismatch_ignored: true }).eq('id', entryId).select().single();
     return data;
};

export const addMedication = async (medData: { family_member_id: string, name: string, dosage?: string, frequency?: string, purpose?: string, start_date?: string }): Promise<Medication> => {
    if (isMock) return { id: 'mock-med', active: true, ...medData };
    
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
