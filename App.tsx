
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

  // Persistence Refs
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
      if (syncLock.current || loadedForUserId.current === userId) return;
      
      syncLock.current = true;
      setIsSyncing(true);
      setDataLoadError(null);
      
      try {
          console.debug(`[medHist] Loading data for: ${userId}`);
          const data = await supabaseService.getUserData(userId);
          
          if (mountedRef.current) {
              setFamilyMembers(data.familyMembers || []);
              setTimelineEntries(data.timelineEntries || []);
              setMedications(data.medications || []);
              setFamilyInfo(data.familyInfo || null);
              loadedForUserId.current = userId;
          }
      } catch (e: any) {
          console.error("[medHist] Data Sync Failed:", e);
          if (mountedRef.current) {
              setDataLoadError(e.message || "Unable to reach medical registry.");
          }
      } finally {
          if (mountedRef.current) {
              setIsSyncing(false);
              syncLock.current = false;
          }
      }
  }, []);

  // One-time initialization and event binding
  useEffect(() => {
    mountedRef.current = true;

    // Handle back button on mobile specifically
    const handlePopState = (e: PopStateEvent) => {
        if (!mountedRef.current) return;
        // If we are in timeline or guide, go back to dashboard
        setViewMode(prev => {
            if (prev !== 'dashboard') return 'dashboard';
            return prev;
        });
        setShowPublicGuide(false);
    };
    window.addEventListener('popstate', handlePopState);

    // Initial session check
    const initAuth = async () => {
        try {
            const currentSession = await supabaseService.getSession();
            if (currentSession?.user) {
                const user = { 
                    id: currentSession.user.id, 
                    name: currentSession.user.user_metadata?.full_name || currentSession.user.email,
                    email: currentSession.user.email || ''
                };
                setSession(currentSession);
                setCurrentUser(user);
                await loadUserData(user.id);
            }
        } catch (e) {
            console.error("[medHist] Init Auth Error:", e);
        } finally {
            if (mountedRef.current) setIsLoading(false);
        }
    };

    initAuth();

    // Listen for future auth changes
    const { data: { subscription } } = supabaseService.onAuthStateChange(async (event, currentSession) => {
      if (!mountedRef.current) return;
      
      console.debug(`[medHist] Auth Change: ${event}`);

      if (event === 'SIGNED_OUT') {
          setSession(null);
          setCurrentUser(null);
          loadedForUserId.current = null;
          setRoute('/login');
          forceResetUI();
          return;
      }

      if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
      }

      if (currentSession?.user) {
        const user = { 
          id: currentSession.user.id, 
          name: currentSession.user.user_metadata?.full_name || currentSession.user.email, 
          email: currentSession.user.email || '' 
        };
        
        setSession(currentSession);
        setCurrentUser(user);
        
        if (event === 'SIGNED_IN') {
            await loadUserData(user.id);
            setIsLoading(false);
        }
      }
    });

    return () => {
      mountedRef.current = false;
      window.removeEventListener('popstate', handlePopState);
      subscription.unsubscribe();
    };
  }, [loadUserData, forceResetUI]);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
        await supabaseService.signOut();
    } catch (e) {
        console.warn("Signout failed:", e);
    } finally {
        // Immediate local cleanup to prevent loops
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
      // Push state so back button works to return to dashboard
      window.history.pushState({ view: 'timeline', memberId: id }, '');
  };

  if (showPublicGuide) {
      return <GuideView user={{ name: 'Guest' }} onBack={() => setShowPublicGuide(false)} onLogout={() => {}} />;
  }

  if (isMockupMode) {
    return <MockupPreview onApprove={() => setIsMockupMode(false)} />;
  }

  if (isLoading) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-600">
             <SpinnerIcon className="w-12 h-12 text-rose-700 animate-spin mb-6" />
             <div className="flex flex-col items-center">
                <p className="text-slate-900 font-black uppercase tracking-[0.3em] text-[11px] mb-1">Authenticating</p>
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[9px]">Clinical Registry medHist</p>
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
                 <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Sync Conflict</h2>
                 <p className="text-xs text-slate-500 mb-10 leading-relaxed font-bold">{dataLoadError}</p>
                 <div className="flex flex-col gap-4">
                     <button onClick={() => { loadedForUserId.current = null; loadUserData(currentUser.id); }} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition text-[11px] uppercase tracking-widest">Retry Connection</button>
                     <button onClick={handleLogout} className="w-full bg-slate-100 text-slate-600 font-black py-5 rounded-2xl active:bg-slate-200 transition text-[11px] uppercase tracking-widest">Reset Session</button>
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
