
import React, { useState, useEffect, useRef } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { UpdatePasswordPage } from './components/auth/UpdatePasswordPage';
import { TimelineView } from './components/TimelineView';
import { DashboardView } from './components/DashboardView';
import type { User, FamilyMember, TimelineEntry, Medication } from './types';
import * as supabaseService from './services/supabaseService';
import { SpinnerIcon } from './components/icons/SpinnerIcon';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [route, setRoute] = useState<string>('/login');
  
  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);
  
  // Dashboard Data State
  const [viewMode, setViewMode] = useState<'dashboard' | 'timeline'>('dashboard');
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(undefined);
  
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [familyInfo, setFamilyInfo] = useState<{name: string, joinCode: string} | null>(null);

  const isSigningUpRef = useRef<boolean>(false);

  // Load User Data Logic
  const loadUserData = async (userId: string) => {
      setDataLoadError(null);
      try {
          const data = await supabaseService.getUserData(userId);
          
          // Safety check: If we have a user but no family members, something went wrong with the profile creation
          if (data.familyMembers.length === 0) {
             console.warn("User loaded but no family members found. Retrying might fix this.");
          }

          setFamilyMembers(data.familyMembers);
          setTimelineEntries(data.timelineEntries);
          setMedications(data.medications);
          setFamilyInfo(data.familyInfo);
      } catch (e: any) {
          console.error("Failed to load user data:", e);
          setDataLoadError(e.message || "Failed to load your profile.");
      }
  };

  useEffect(() => {
    const checkSession = async () => {
      const currentSession = await supabaseService.getSession();
      setSession(currentSession);
      if (currentSession?.user) {
        const user = { 
          id: currentSession.user.id, 
          name: currentSession.user.user_metadata?.full_name || currentSession.user.email,
          email: currentSession.user.email || ''
        };
        setCurrentUser(user);
        
        // Initial Data Load
        await loadUserData(user.id);

        if (window.location.pathname !== '/signup') {
             setRoute('/');
        }
      } else {
        if (route !== '/signup') {
            setRoute('/login');
        }
      }
      setIsLoading(false);
    };
    checkSession();
    
    const { data: { subscription } } = supabaseService.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') setIsRecoveryMode(true);

       if (session?.user) {
        const user = { 
          id: session.user.id, 
          name: session.user.user_metadata?.full_name || session.user.email, 
          email: session.user.email || '' 
        };
        setCurrentUser(user);
        
        // Reload data on login
        if (event === 'SIGNED_IN') {
            setIsLoading(true);
            await loadUserData(user.id);
            setIsLoading(false);
        }
        
        if (!isSigningUpRef.current && route !== '/signup') {
             setRoute('/');
        }
      } else {
        setCurrentUser(null);
        if (!isRecoveryMode && route !== '/signup') {
          setRoute('/login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [route, isRecoveryMode]);
  
  const handleLogin = async (email: string, password: string):Promise<string|null> => {
    setIsLoading(true);
    const error = await supabaseService.signIn(email, password);
    if(error) {
        setIsLoading(false);
        return error;
    }
    // Auth state change will handle the rest
    return null;
  };

  const handleSignup = async (name: string, email: string, password: string, familyInput: { isJoin: boolean, value: string }): Promise<string|null> => {
    isSigningUpRef.current = true;
    setIsLoading(true);
    try {
        const error = await supabaseService.signUp(name, email, password, familyInput);
        if(error) {
            setIsLoading(false);
            return error;
        }
        
        // SUCCESS! 
        // Force a small delay to allow DB triggers to finish creating the 'profiles' row.
        // This prevents the "Profile not found" race condition.
        await new Promise(resolve => setTimeout(resolve, 1500));

        setRoute('/');
        return null;
    } catch (e: any) {
        setIsLoading(false);
        return e.message;
    } finally {
        isSigningUpRef.current = false;
        // Do not set isLoading(false) here, allow the auth state change listener to handle the transition
    }
  };

  const handleLogout = async () => {
    await supabaseService.signOut();
    setCurrentUser(null);
    setRoute('/login');
    setIsRecoveryMode(false);
    setViewMode('dashboard');
  };

  // Error Screen (Connection Issue)
  if (dataLoadError && currentUser) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600 p-4 text-center">
             <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                 <div className="text-red-500 text-5xl mb-4">⚠️</div>
                 <h2 className="text-xl font-bold text-slate-800 mb-2">Connection Issue</h2>
                 <p className="text-slate-500 mb-6">{dataLoadError}</p>
                 <p className="text-sm text-slate-400 mb-6">The database is taking longer than expected to prepare your profile.</p>
                 
                 <div className="flex flex-col gap-3">
                     <button 
                        onClick={() => { setIsLoading(true); loadUserData(currentUser.id).then(() => setIsLoading(false)); }}
                        className="w-full bg-brand-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-brand-blue-700 transition"
                     >
                        Retry Connection
                     </button>
                     <button 
                        onClick={handleLogout}
                        className="w-full bg-slate-100 text-slate-600 font-semibold py-2 px-4 rounded-lg hover:bg-slate-200 transition"
                     >
                        Log Out
                     </button>
                 </div>
             </div>
        </div>
      );
  }

  // Loading Screen
  if (isLoading) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600">
             <SpinnerIcon className="w-10 h-10 text-brand-blue-600 animate-spin mb-4" />
             <p className="text-slate-400 font-medium">Connecting to medical records...</p>
        </div>
      );
  }

  if (isRecoveryMode) {
    return (
        <UpdatePasswordPage onSuccess={() => { setIsRecoveryMode(false); setRoute('/'); }} />
    );
  }

  if (!session) {
    if (route === '/signup') {
        return (
            <SignupPage onSignup={handleSignup} onNavigateToLogin={() => setRoute('/login')} />
        );
    }
    return (
        <LoginPage onLogin={handleLogin} onNavigateToSignup={() => setRoute('/signup')} />
    );
  }
  
  if (route === '/signup') {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600">
              <SpinnerIcon className="w-10 h-10 text-brand-blue-600 animate-spin mb-4" />
              <h2 className="text-xl font-semibold">Setting up your account...</h2>
              <p className="text-slate-400 mt-2">Creating your family space</p>
          </div>
      );
  }

  if (!currentUser) return null;

  // VIEW ROUTER
  if (viewMode === 'timeline') {
      return (
          <TimelineView 
            onLogout={handleLogout} 
            user={currentUser} 
            initialSelectedMemberId={selectedMemberId}
            onBackToDashboard={() => setViewMode('dashboard')}
            // Pass data props
            familyMembers={familyMembers}
            timelineEntries={timelineEntries}
            onRefreshData={() => loadUserData(currentUser.id)}
          />
      );
  }

  return (
    <DashboardView 
        user={currentUser}
        onLogout={handleLogout}
        familyMembers={familyMembers}
        timelineEntries={timelineEntries}
        medications={medications}
        familyInfo={familyInfo}
        onSelectMember={(id) => { setSelectedMemberId(id); setViewMode('timeline'); }}
        onRefreshData={() => loadUserData(currentUser.id)}
    />
  );
};

export default App;
