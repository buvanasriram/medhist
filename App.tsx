
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { UpdatePasswordPage } from './components/auth/UpdatePasswordPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { TimelineView } from './components/TimelineView';
import { DashboardView } from './components/DashboardView';
import { GuideView } from './components/GuideView';
import { MockupPreview } from './components/MockupPreview';
import type { User, FamilyMember, TimelineEntry, Medication } from './types';
import * as supabaseService from './services/supabaseService';
import { SpinnerIcon } from './components/icons/SpinnerIcon';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [route, setRoute] = useState<string>(
    window.location.pathname === '/signup' ? '/signup' : '/login'
  );
  
  const [isMockupMode, setIsMockupMode] = useState<boolean>(false);
  const [showPublicGuide, setShowPublicGuide] = useState<boolean>(false);
  
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);

  // Loading States
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isSyncingData, setIsSyncingData] = useState<boolean>(false);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  
  // UI State - Hydrate from history if possible
  const [viewMode, setViewMode] = useState<'dashboard' | 'timeline' | 'guide'>(
      (window.history.state && window.history.state.view) || 'dashboard'
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(
      (window.history.state && window.history.state.memberId) || undefined
  );
  
  // Data State
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [familyInfo, setFamilyInfo] = useState<{name: string, joinCode: string} | null>(null);

  // Logic Refs
  const mountedRef = useRef<boolean>(true);
  const syncLock = useRef<string | null>(null);
  
  const clearLocalData = useCallback(() => {
    setFamilyMembers([]);
    setTimelineEntries([]);
    setMedications([]);
    setFamilyInfo(null);
    setDataLoadError(null);
    syncLock.current = null;
    setSession(null);
    setCurrentUser(null);
  }, []);

  // PRIMARY DATA LOADER
  const loadUserData = useCallback(async (userId: string) => {
      if (!mountedRef.current) return;
      
      if (syncLock.current === userId) return;
      
      syncLock.current = userId;
      setIsSyncingData(true);
      setDataLoadError(null);
      
      try {
          console.debug(`[medHist] Registry Sync: ${userId}`);
          const data = await supabaseService.getUserData(userId);
          
          if (mountedRef.current && syncLock.current === userId) {
              setFamilyMembers(data.familyMembers || []);
              setTimelineEntries(data.timelineEntries || []);
              setMedications(data.medications || []);
              setFamilyInfo(data.familyInfo || null);
          }
      } catch (e: any) {
          console.error("[medHist] Sync Failed:", e);
          if (mountedRef.current && syncLock.current === userId) {
              setDataLoadError(e.message || "Could not synchronize medical registry.");
          }
      } finally {
          if (mountedRef.current && syncLock.current === userId) {
              setIsSyncingData(false);
          }
      }
  }, []);

  // EFFECT 1: AUTHENTICATION LIFECYCLE
  useEffect(() => {
    mountedRef.current = true;

    const checkInitialSession = async () => {
        try {
            const currentSession = await supabaseService.getSession();
            if (currentSession?.user && mountedRef.current) {
                const user = { 
                    id: currentSession.user.id, 
                    name: currentSession.user.user_metadata?.full_name || currentSession.user.email,
                    email: currentSession.user.email || ''
                };
                setSession(currentSession);
                setCurrentUser(user);
            }
        } catch (e) {
            console.error("[medHist] Boot Error:", e);
        } finally {
            if (mountedRef.current) {
                setIsLoadingAuth(false);
            }
        }
    };

    checkInitialSession();

    // Cross-tab logout listener
    const handleStorageChange = (e: StorageEvent) => {
        // If a Supabase auth key is removed from another tab, trigger logout here
        if (e.key && e.key.startsWith('sb-') && !e.newValue) {
            console.log("[medHist] Logout detected in another tab. Resetting...");
            clearLocalData();
            setRoute('/login');
        }
    };
    window.addEventListener('storage', handleStorageChange);

    const { data: { subscription } } = supabaseService.onAuthStateChange(async (event, currentSession) => {
      if (!mountedRef.current) return;
      
      console.debug(`[medHist] Auth Event: ${event}`);

      if (event === 'SIGNED_OUT') {
          clearLocalData();
          setRoute('/login');
          setIsLoadingAuth(false);
          return;
      }

      if (currentSession?.user) {
        const user = { 
          id: currentSession.user.id, 
          name: currentSession.user.user_metadata?.full_name || currentSession.user.email, 
          email: currentSession.user.email || '' 
        };
        
        setSession(currentSession);
        setCurrentUser(user);
        
        if (event === 'PASSWORD_REFRESHED' || event === 'SIGNED_IN') {
            setIsLoadingAuth(false);
            setRoute('/');
        }

        if (event === 'PASSWORD_RECOVERY') {
            setIsRecoveryMode(true);
        }
      } else if (!currentSession && event !== 'INITIAL_SESSION') {
          // If session is lost unexpectedly
          clearLocalData();
          setRoute('/login');
          setIsLoadingAuth(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [clearLocalData]);

  // EFFECT 2: DATA SYNC TRIGGER
  useEffect(() => {
      if (currentUser?.id) {
          loadUserData(currentUser.id);
      }
  }, [currentUser?.id, loadUserData]);

  // EFFECT 3: BROWSER HISTORY SYNC
  useEffect(() => {
      const handlePopState = (e: PopStateEvent) => {
          if (!mountedRef.current) return;
          
          const state = e.state;
          if (state && state.view) {
              setViewMode(state.view);
              if (state.memberId) setSelectedMemberId(state.memberId);
          } else if (state && state.modalOpen) {
              return;
          } else if (!state) {
              setViewMode('dashboard');
              setShowPublicGuide(false);
          }
      };
      
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogout = async () => {
    setIsLoadingAuth(true);
    try {
        await supabaseService.signOut();
        // The onAuthStateChange SIGNED_OUT event will handle the rest
    } catch (e) {
        console.warn("Signout session aborted:", e);
        // Fallback for failed signout calls
        clearLocalData();
        setRoute('/login');
        setIsLoadingAuth(false);
    }
  };

  const handleLogin = async (email: string, password: string): Promise<string|null> => {
    setIsLoadingAuth(true);
    const error = await supabaseService.signIn(email, password);
    if (error) {
        setIsLoadingAuth(false);
        return error;
    }
    setRoute('/');
    return null;
  };

  const handleSignup = async (name: string, email: string, password: string, familyInput: { isJoin: boolean, value: string }): Promise<string|null> => {
    setIsLoadingAuth(true);
    const error = await supabaseService.signUp(name, email, password, familyInput);
    if (error) {
        setIsLoadingAuth(false);
        return error;
    }
    setRoute('/');
    return null;
  };

  const handleSelectMember = (id: string) => {
      setSelectedMemberId(id);
      setViewMode('timeline');
      window.history.pushState({ view: 'timeline', memberId: id }, '');
  };

  const handleBackToDashboard = () => {
      setViewMode('dashboard');
      window.history.pushState({ view: 'dashboard' }, '');
  };

  if (showPublicGuide) {
      return <GuideView user={{ name: 'Guest' }} onBack={() => setShowPublicGuide(false)} onLogout={() => {}} />;
  }

  if (isMockupMode) {
    return <MockupPreview onApprove={() => setIsMockupMode(false)} />;
  }

  if (isLoadingAuth) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center">
             <div className="relative mb-8">
                <SpinnerIcon className="w-12 h-12 text-rose-700 animate-spin" />
             </div>
             <p className="text-slate-900 font-black uppercase tracking-[0.4em] text-[10px]">Securing Vault</p>
             <p className="text-slate-300 font-bold uppercase tracking-[0.2em] text-[8px] mt-1">medHist Clinical Registry</p>
        </div>
      );
  }

  if (!session || !currentUser) {
    if (route === '/signup') return (
        <SignupPage 
            onSignup={handleSignup} 
            onNavigateToLogin={() => setRoute('/login')} 
            onOpenGuide={() => setShowPublicGuide(true)}
        />
    );
    if (route === '/forgot-password') return <ForgotPasswordPage onNavigateToLogin={() => setRoute('/login')} />;
    return (
        <LoginPage 
            onLogin={handleLogin} 
            onNavigateToSignup={() => setRoute('/signup')} 
            onNavigateToForgotPassword={() => setRoute('/forgot-password')} 
            onOpenGuide={() => setShowPublicGuide(true)}
        />
    );
  }
  
  if (dataLoadError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
             <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full border border-slate-100">
                 <div className="bg-rose-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 text-3xl">📡</div>
                 <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Registry Offset</h2>
                 <p className="text-xs text-slate-500 mb-10 leading-relaxed font-bold">{dataLoadError}</p>
                 <div className="flex flex-col gap-4">
                     <button onClick={() => { syncLock.current = null; loadUserData(currentUser.id); }} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition text-[11px] uppercase tracking-widest">Reconnect Registry</button>
                     <button onClick={handleLogout} className="w-full bg-slate-100 text-slate-600 font-black py-5 rounded-2xl active:bg-slate-200 transition text-[11px] uppercase tracking-widest">Sign Out</button>
                 </div>
             </div>
        </div>
      );
  }

  if (isRecoveryMode) return <UpdatePasswordPage onSuccess={() => { setIsRecoveryMode(false); setRoute('/'); }} />;

  if (viewMode === 'guide') return <GuideView user={currentUser} onBack={handleBackToDashboard} onLogout={handleLogout} />;

  if (viewMode === 'timeline') {
      return (
          <TimelineView 
            onLogout={handleLogout} 
            user={currentUser} 
            initialSelectedMemberId={selectedMemberId}
            onBackToDashboard={handleBackToDashboard}
            familyMembers={familyMembers}
            timelineEntries={timelineEntries}
            onRefreshData={() => { syncLock.current = null; loadUserData(currentUser.id); }}
            onOpenGuide={() => setViewMode('guide')}
            medications={medications}
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
        onSelectMember={handleSelectMember}
        onRefreshData={() => { syncLock.current = null; loadUserData(currentUser.id); }}
        onOpenGuide={() => setViewMode('guide')}
        isSyncing={isSyncingData}
    />
  );
};

export default App;
