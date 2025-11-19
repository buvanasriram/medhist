
import { createClient } from '@supabase/supabase-js';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { FamilyMember, TimelineEntry, ReportFile } from '../types';
import { base64ToBlob } from '../utils/fileUtils';
import { CREDENTIALS } from '../credentials';

// Safely retrieve environment variables to avoid crashes
const getEnvVar = (key: string) => {
  // 1. Try import.meta.env (Vite standard)
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) { /* ignore */ }
  
  // 2. Try process.env (Node/Polyfill/Netlify)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) { /* ignore */ }

  return undefined;
};

// PRIORITY: 1. Environment Variables (Netlify/Deployment) -> 2. credentials.ts (Local/Preview)
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || CREDENTIALS.SUPABASE_URL;
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || CREDENTIALS.SUPABASE_ANON_KEY;

// Initialize Supabase Client Safely
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
        "%c[medHist] Supabase connection failed or credentials missing. Running in MOCK MODE.", 
        "background: #fff7ed; color: #ea580c; font-weight: bold; padding: 4px; border-radius: 4px; border: 1px solid #ea580c;"
    );
    console.log("Details:", error);
    isMockMode = true;
    supabaseClient = null;
}

export const isMock = isMockMode;
export const supabase = supabaseClient;

// --- MOCK DATA & STATE (Only used if isMock is true) ---
const MOCK_USER_ID = 'mock-user-123';
let mockSession: Session | null = null;
const mockFileStore = new Map<string, string>();

let mockFamilyMembers: FamilyMember[] = [
    { id: '1', user_id: MOCK_USER_ID, name: 'Demo User', relationship: 'Self', dob: '1985-06-15' },
    { id: '2', user_id: MOCK_USER_ID, name: 'Alice', relationship: 'Daughter', dob: '2019-03-10' },
    { id: '3', user_id: MOCK_USER_ID, name: 'Robert', relationship: 'Father', dob: '1955-11-22', invite_code: 'ABC123' },
];

let mockTimelineEntries: TimelineEntry[] = [
    {
        id: '101',
        user_id: MOCK_USER_ID,
        family_member_id: '1',
        date: '2023-10-15',
        report_type: 'Annual Physical',
        summary: 'Routine checkup results. Blood pressure is within normal range (120/80).',
        doctor_name: 'Sarah Smith',
        facility_name: 'Central City Clinic',
        patient_name: 'Demo User',
        mismatch_ignored: false
    }
];

// --- AUTH FUNCTIONS ---

export const getSession = async (): Promise<Session | null> => {
    if (isMock) return mockSession;
    const { data } = await supabase!.auth.getSession();
    return data.session;
};

export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
    if (isMock) {
        return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase!.auth.onAuthStateChange(callback);
};

export const signUp = async (name: string, email: string, password: string, inviteCode?: string): Promise<string|null> => {
    if (isMock) {
        mockSession = {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            token_type: 'bearer',
            user: {
                id: MOCK_USER_ID,
                aud: 'authenticated',
                role: 'authenticated',
                email: email,
                app_metadata: { provider: 'email' },
                user_metadata: { full_name: name, invite_code: inviteCode },
                created_at: new Date().toISOString(),
            }
        } as Session;
        return null;
    }
    const { error } = await supabase!.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
                invite_code: inviteCode, // Pass invite code to metadata
            }
        }
    });
    return error ? error.message : null;
};

export const signIn = async (email: string, password: string): Promise<string|null> => {
    if (isMock) {
        mockSession = {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            token_type: 'bearer',
            user: {
                id: MOCK_USER_ID,
                aud: 'authenticated',
                role: 'authenticated',
                email: email,
                app_metadata: { provider: 'email' },
                user_metadata: { full_name: 'Demo User' },
                created_at: new Date().toISOString(),
            }
        } as Session;
        return null;
    }
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
};

export const signOut = async (): Promise<void> => {
    if (isMock) {
        mockSession = null;
        return;
    }
    await supabase!.auth.signOut();
};


// --- DATABASE FUNCTIONS ---

export const getUserData = async (userId: string, userName:string): Promise<{ familyMembers: FamilyMember[], timelineEntries: TimelineEntry[] }> => {
    if (isMock) {
        const selfIndex = mockFamilyMembers.findIndex(m => m.relationship === 'Self');
        if (selfIndex >= 0) {
             mockFamilyMembers[selfIndex].name = userName;
        } else {
             mockFamilyMembers.unshift({ id: 'new-self', user_id: userId, name: userName, relationship: 'Self' });
        }
        await new Promise(resolve => setTimeout(resolve, 600));
        return {
            familyMembers: [...mockFamilyMembers],
            timelineEntries: [...mockTimelineEntries]
        };
    }

    // Fetch data in parallel.
    const [familyMembersRes, timelineEntriesRes] = await Promise.all([
        supabase!.from('family_members').select('*'),
        supabase!.from('timeline_entries').select('*').order('date', { ascending: false }),
    ]);

    if (familyMembersRes.error) {
        // Handle case where empty array returned as null or error
        if (familyMembersRes.error.code === 'PGRST116') {
             // no rows, that's fine
        } else {
             throw new Error(`Error fetching members: ${familyMembersRes.error.message}`);
        }
    }
    
    if (timelineEntriesRes.error) {
         if (timelineEntriesRes.error.code === 'PGRST116') {
             // no rows
        } else {
            throw new Error(`Error fetching timeline: ${timelineEntriesRes.error.message}`);
        }
    }
    
    let familyMembers = (familyMembersRes.data as FamilyMember[]) || [];

    // Ensure a 'Self' profile exists for the logged-in user.
    const selfExists = familyMembers.some(member => member.relationship === 'Self' && member.user_id === userId);
    if (!selfExists) {
        try {
            const { data: newSelf, error } = await supabase!
                .from('family_members')
                .insert({ user_id: userId, name: userName, relationship: 'Self' })
                .select()
                .single();
            if (!error && newSelf) {
                familyMembers.unshift(newSelf as FamilyMember);
            }
        } catch (err) {
             console.error("Error creating self profile:", err);
        }
    }
    
    return {
        familyMembers,
        timelineEntries: (timelineEntriesRes.data as TimelineEntry[]) || [],
    };
};

export const addFamilyMember = async (member: { name: string, relationship: string, dob?: string, sendInvite?: boolean }): Promise<FamilyMember> => {
    const inviteCode = member.sendInvite ? Math.random().toString(36).substring(2, 8).toUpperCase() : null;

    if (isMock) {
        const newMember: FamilyMember = {
            id: `mock-fam-${Date.now()}`,
            user_id: MOCK_USER_ID,
            name: member.name,
            relationship: member.relationship,
            dob: member.dob,
            invite_code: inviteCode || undefined
        };
        mockFamilyMembers.push(newMember);
        return newMember;
    }

    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const memberToInsert = {
        user_id: user.id,
        name: member.name,
        relationship: member.relationship,
        dob: member.dob || null, 
        invite_code: inviteCode || null
    };
    
    const { data, error } = await supabase!
        .from('family_members')
        .insert(memberToInsert)
        .select()
        .single();
        
    if (error) throw new Error(error.message);
    return data as FamilyMember;
};

export const addTimelineEntry = async (
    entry: { 
        family_member_id: string, 
        date: string, 
        report_type: string, 
        summary: string,
        doctor_name?: string,
        facility_name?: string,
        patient_name?: string,
    },
    file: { name: string, type: string, data: string, password?: string }
): Promise<TimelineEntry> => {
    if (isMock) {
        const newId = `mock-entry-${Date.now()}`;
        const newEntry: TimelineEntry = {
            id: newId,
            user_id: MOCK_USER_ID,
            family_member_id: entry.family_member_id,
            date: entry.date,
            report_type: entry.report_type,
            summary: entry.summary,
            doctor_name: entry.doctor_name,
            facility_name: entry.facility_name,
            patient_name: entry.patient_name,
            file: {
                name: file.name,
                type: file.type,
                password: file.password
            }
        };
        mockTimelineEntries.unshift(newEntry);
        const dataUri = `data:${file.type};base64,${file.data}`;
        mockFileStore.set(newId, dataUri);
        return newEntry;
    }

    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // 1. Insert Metadata
    const { data: newEntry, error: entryError } = await supabase!
        .from('timeline_entries')
        .insert({ ...entry, user_id: user.id })
        .select()
        .single();
    
    if (entryError) throw new Error(`Failed to create timeline entry: ${entryError.message}`);
    if (!newEntry) throw new Error("Failed to get ID for new timeline entry.");

    // 2. Upload File
    const filePath = `${user.id}/${newEntry.id}/${file.name}`;
    const blob = base64ToBlob(file.data, file.type);
    
    const { error: uploadError } = await supabase!.storage
        .from('medical-reports')
        .upload(filePath, blob, { contentType: file.type });

    if (uploadError) {
        // Cleanup entry if upload fails
        await supabase!.from('timeline_entries').delete().eq('id', newEntry.id);
        throw new Error(`Failed to upload file to storage: ${uploadError.message}`);
    }

    // 3. Record File Metadata
    const fileMetadata = {
        user_id: user.id,
        timeline_entry_id: newEntry.id,
        name: file.name, 
        type: file.type, 
        file_path: filePath,
        password: file.password,
    };

    const { error: fileError } = await supabase!.from('files').insert(fileMetadata);

    if (fileError) {
        // Cleanup if metadata insert fails
        await supabase!.storage.from('medical-reports').remove([filePath]);
        await supabase!.from('timeline_entries').delete().eq('id', newEntry.id);
        throw new Error(`Failed to save file metadata: ${fileError.message}`);
    }

    return newEntry as TimelineEntry;
};

export const deleteTimelineEntry = async (entryId: string): Promise<void> => {
    if (isMock) {
        mockTimelineEntries = mockTimelineEntries.filter(e => e.id !== entryId);
        mockFileStore.delete(entryId);
        return;
    }

    const { data: fileMeta } = await supabase!
        .from('files')
        .select('file_path')
        .eq('timeline_entry_id', entryId)
        .single();

    if (fileMeta && fileMeta.file_path) {
        await supabase!.storage
            .from('medical-reports')
            .remove([fileMeta.file_path]);
    }
    
    const { error: deleteError } = await supabase!
        .from('timeline_entries')
        .delete()
        .eq('id', entryId);

    if (deleteError) {
        throw new Error(`Failed to delete timeline entry: ${deleteError.message}`);
    }
};

export const getFileForEntry = async (timelineEntryId: string): Promise<{ metadata: ReportFile, signedUrl: string } | null> => {
    if (isMock) {
        const entry = mockTimelineEntries.find(e => e.id === timelineEntryId);
        if (!entry) return null;
        
        if (mockFileStore.has(timelineEntryId)) {
             return {
                metadata: entry.file!,
                signedUrl: mockFileStore.get(timelineEntryId)!
            };
        }
        return {
            metadata: entry.file || { name: 'mock_report.png', type: 'image/png' },
            signedUrl: 'https://via.placeholder.com/800x1100.png?text=Mock+Report+File+Preview' 
        };
    }

    const { data: fileMetadata } = await supabase!
        .from('files')
        .select('*')
        .eq('timeline_entry_id', timelineEntryId)
        .single();

    if (!fileMetadata || !fileMetadata.file_path) return null;

    const { data: signedUrlData, error: signedUrlError } = await supabase!.storage
        .from('medical-reports')
        .createSignedUrl(fileMetadata.file_path, 300); // Valid for 5 minutes

    if (signedUrlError || !signedUrlData?.signedUrl) return null;
    
    const metadata: ReportFile = {
        id: fileMetadata.id,
        timeline_entry_id: fileMetadata.timeline_entry_id,
        name: fileMetadata.name,
        type: fileMetadata.type,
        password: fileMetadata.password,
    };
    
    return { metadata, signedUrl: signedUrlData.signedUrl };
};

export const ignoreMismatch = async (entryId: string): Promise<TimelineEntry> => {
    if (isMock) {
        const entry = mockTimelineEntries.find(e => e.id === entryId);
        if (entry) {
            entry.mismatch_ignored = true;
            return { ...entry };
        }
        throw new Error("Entry not found");
    }

    const { data, error } = await supabase!
        .from('timeline_entries')
        .update({ mismatch_ignored: true })
        .eq('id', entryId)
        .select()
        .single();
    
    if (error) throw new Error(error.message);
    return data as TimelineEntry;
};