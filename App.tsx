
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

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'timeline' | 'guide'>('dashboard');
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(undefined);
  
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [familyInfo, setFamilyInfo] = useState<{name: string, joinCode: string} | null>(null);

  // Persistence & Locking Refs
  const mountedRef = useRef<boolean>(true);
  const loadedForUserId = useRef<string | null>(null);
  const syncLock = useRef<boolean>(false);
  
  const forceResetUI = useCallback(() => {
    setIsSyncing(false);
    setIsLoading(false);
    setDataLoadError(null);
  }, []);

  const loadUserData = useCallback(async (userId: string) => {
      if (!mountedRef.current) return;
      
      // Prevent parallel syncs or redundant loads for the same user
      if (syncLock.current || loadedForUserId.current === userId) {
          setIsSyncing(false);
          return;
      }
      
      syncLock.current = true;
      setIsSyncing(true);
      setDataLoadError(null);
      
      try {
          console.debug(`[medHist] Synchronizing clinical records for: ${userId}`);
          const data = await supabaseService.getUserData(userId);
          
          if (mountedRef.current) {
              setFamilyMembers(data.familyMembers || []);
              setTimelineEntries(data.timelineEntries || []);
              setMedications(data.medications || []);
              setFamilyInfo(data.familyInfo || null);
              loadedForUserId.current = userId;
          }
      } catch (e: any) {
          console.error("[medHist] Registry Sync Warning:", e);
          // If it's a new user or network hiccup, we don't necessarily want to block the whole UI
          if (mountedRef.current && !loadedForUserId.current) {
              setDataLoadError(e.message || "Medical registry unreachable.");
          }
      } finally {
          if (mountedRef.current) {
              setIsSyncing(false);
              syncLock.current = false;
          }
      }
  }, []);

  // Application Lifecycle: Guaranteed Resolution Pattern
  useEffect(() => {
    mountedRef.current = true;

    // Safety fallback: if everything hangs, release the UI after 5s
    const safetyTimer = setTimeout(() => {
        if (mountedRef.current && isLoading) {
            console.warn("[medHist] Boot sequence timed out. Releasing UI.");
            setIsLoading(false);
        }
    }, 5000);

    const handlePopState = () => {
        if (!mountedRef.current) return;
        setViewMode(prev => (prev !== 'dashboard' ? 'dashboard' : prev));
        setShowPublicGuide(false);
    };
    window.addEventListener('popstate', handlePopState);

    // PRIORITY 1: Explicit Initial Session Check
    const startBoot = async () => {
        try {
            const initialSession = await supabaseService.getSession();
            if (!mountedRef.current) return;

            if (initialSession?.user) {
                const user = { 
                    id: initialSession.user.id, 
                    name: initialSession.user.user_metadata?.full_name || initialSession.user.email,
                    email: initialSession.user.email || ''
                };
                setSession(initialSession);
                setCurrentUser(user);
                await loadUserData(user.id);
            }
        } catch (e) {
            console.error("[medHist] Boot error:", e);
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
                clearTimeout(safetyTimer);
            }
        }
    };

    startBoot();

    // PRIORITY 2: Persistent Listener for future events
    const { data: { subscription } } = supabaseService.onAuthStateChange(async (event, currentSession) => {
      if (!mountedRef.current) return;
      
      console.debug(`[medHist] Auth Event: ${event}`);

      if (event === 'SIGNED_OUT') {
          setSession(null);
          setCurrentUser(null);
          loadedForUserId.current = null;
          if (mountedRef.current) {
              setRoute('/login');
              forceResetUI();
              setIsLoading(false);
          }
          return;
      }

      if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
      }

      if (currentSession?.user && event === 'SIGNED_IN') {
        const user = { 
          id: currentSession.user.id, 
          name: currentSession.user.user_metadata?.full_name || currentSession.user.email, 
          email: currentSession.user.email || '' 
        };
        
        setSession(currentSession);
        setCurrentUser(user);
        await loadUserData(user.id);
        
        if (mountedRef.current) {
            setIsLoading(false);
            if (window.location.pathname === '/login' || window.location.pathname === '/') {
                setRoute('/');
            }
        }
      }
    });

    return () => {
      mountedRef.current = false;
      window.removeEventListener('popstate', handlePopState);
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []); // Explicitly empty to act as a singleton controller

  const handleLogout = async () => {
    setIsLoading(true);
    try {
        await supabaseService.signOut();
    } catch (e) {
        console.warn("Signout aborted:", e);
    } finally {
        setSession(null);
        setCurrentUser(null);
        loadedForUserId.current = null;
        setRoute('/login');
        forceResetUI();
    }
  };

  const handleLogin = async (email: string, password: string): Promise<string|null> => {
    setIsLoading(true);
    const error = await supabaseService.signIn(email, password);
    if (error) {
        setIsLoading(false);
        return error;
    }
    // Session state will be picked up by the listener
    return null;
  };

  const handleSignup = async (name: string, email: string, password: string, familyInput: { isJoin: boolean, value: string }): Promise<string|null> => {
    setIsLoading(true);
    const error = await supabaseService.signUp(name, email, password, familyInput);
    if (error) {
        setIsLoading(false);
        return error;
    }
    return null;
  };

  const handleSelectMember = (id: string) => {
      setSelectedMemberId(id);
      setViewMode('timeline');
      window.history.pushState({ view: 'timeline', memberId: id }, '');
  };

  if (showPublicGuide) {
      return <GuideView user={{ name: 'Guest' }} onBack={() => setShowPublicGuide(false)} onLogout={() => {}} />;
  }

  if (isMockupMode) {
    return <MockupPreview onApprove={() => setIsMockupMode(false)} />;
  }

  // --- RENDERING STATES ---

  if (isLoading) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-600">
             <div className="relative mb-10">
                <SpinnerIcon className="w-14 h-14 text-rose-700 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-rose-700 rounded-full"></div>
                </div>
             </div>
             <div className="flex flex-col items-center">
                <p className="text-slate-900 font-black uppercase tracking-[0.4em] text-[10px] mb-2">Securing Connection</p>
                <div className="flex items-center gap-2 opacity-30">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[8px]">Identity Vault medHist</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                </div>
             </div>
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
                 <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Sync Delayed</h2>
                 <p className="text-xs text-slate-500 mb-10 leading-relaxed font-bold">{dataLoadError}</p>
                 <div className="flex flex-col gap-4">
                     <button onClick={() => { loadedForUserId.current = null; loadUserData(currentUser.id); }} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition text-[11px] uppercase tracking-widest">Retry Connection</button>
                     <button onClick={handleLogout} className="w-full bg-slate-100 text-slate-600 font-black py-5 rounded-2xl active:bg-slate-200 transition text-[11px] uppercase tracking-widest">Force Logout</button>
                 </div>
             </div>
        </div>
      );
  }

  if (isRecoveryMode) return <UpdatePasswordPage onSuccess={() => { setIsRecoveryMode(false); setRoute('/'); }} />;

  if (viewMode === 'guide') return <GuideView user={currentUser} onBack={() => setViewMode('dashboard')} onLogout={handleLogout} />;

  if (viewMode === 'timeline') {
      return (
          <TimelineView 
            onLogout={handleLogout} 
            user={currentUser} 
            initialSelectedMemberId={selectedMemberId}
            onBackToDashboard={() => setViewMode('dashboard')}
            familyMembers={familyMembers}
            timelineEntries={timelineEntries}
            onRefreshData={() => { loadedForUserId.current = null; loadUserData(currentUser.id); }}
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
        onRefreshData={() => { loadedForUserId.current = null; loadUserData(currentUser.id); }}
        onOpenGuide={() => setViewMode('guide')}
        isSyncing={isSyncing}
    />
  );
};

export default App;
