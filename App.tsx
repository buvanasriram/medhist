
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

  // Critical Ref Locks
  const loadedForUserId = useRef<string | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  
  const forceResetUI = useCallback(() => {
    setIsSyncing(false);
    setIsLoading(false);
    setDataLoadError(null);
  }, []);

  const loadUserData = useCallback(async (userId: string) => {
      if (!mountedRef.current) return;
      // 1. Hard Lock: Prevent any overlapping fetches
      if (isFetchingRef.current || loadedForUserId.current === userId) {
          console.log("[medHist] Load skipped: Already active or loaded.");
          return;
      }
      
      isFetchingRef.current = true;
      setIsSyncing(true);
      setDataLoadError(null);
      
      try {
          console.log(`[medHist] Fetching clinical data for: ${userId}`);
          const data = await supabaseService.getUserData(userId);
          
          if (!mountedRef.current) return;

          setFamilyMembers(data.familyMembers || []);
          setTimelineEntries(data.timelineEntries || []);
          setMedications(data.medications || []);
          setFamilyInfo(data.familyInfo || null);
          
          loadedForUserId.current = userId;
      } catch (e: any) {
          console.error("[App] Data Load Error:", e);
          if (mountedRef.current) {
              setDataLoadError(e.message || "Connection timed out. Please try again.");
          }
      } finally {
          if (mountedRef.current) {
              setIsSyncing(false);
              isFetchingRef.current = false;
          }
      }
  }, []);

  // Effect: Application Lifecycle & Auth Logic (Circuit Breaker)
  useEffect(() => {
    mountedRef.current = true;

    // 1. Safety Timeout: Don't spin forever if Supabase is unresponsive
    const bootTimeout = setTimeout(() => {
      if (isLoading && mountedRef.current) {
        console.warn("[medHist] Auth timeout reached. Checking state...");
        setIsLoading(false);
      }
    }, 8000);

    // 2. Navigation / Hash Handling
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
        setIsRecoveryMode(true);
    }

    const handlePopState = () => {
        if (!mountedRef.current) return;
        setViewMode(prev => (prev !== 'dashboard' ? 'dashboard' : prev));
        setShowPublicGuide(false);
    };
    window.addEventListener('popstate', handlePopState);

    // 3. Unified Auth Listener (Attached ONCE)
    const { data: { subscription } } = supabaseService.onAuthStateChange(async (event, currentSession) => {
      if (!mountedRef.current) return;
      
      console.log(`[medHist] Auth Event Handled: ${event}`);

      if (!currentSession?.user) {
          if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
              setSession(null);
              setCurrentUser(null);
              loadedForUserId.current = null;
              if (mountedRef.current) {
                  setRoute('/login');
                  setIsLoading(false);
                  forceResetUI();
              }
          }
          return;
      }

      if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
      }

      // Initialize User Session
      const user = { 
        id: currentSession.user.id, 
        name: currentSession.user.user_metadata?.full_name || currentSession.user.email, 
        email: currentSession.user.email || '' 
      };
      
      setSession(currentSession);
      setCurrentUser(user);
      
      // Update route if necessary
      if (window.location.pathname === '/login' || window.location.pathname === '/') {
          setRoute('/');
      }

      // Trigger data sync if not already loaded
      if (loadedForUserId.current !== user.id) {
          await loadUserData(user.id);
      }
      
      if (mountedRef.current) {
          setIsLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(bootTimeout);
      window.removeEventListener('popstate', handlePopState);
      subscription.unsubscribe();
    };
  }, []); // Truly empty dependency array - ensures one-time setup

  const handleLogout = async () => {
    setIsLoading(true);
    try {
        await supabaseService.signOut();
    } catch (e) {
        console.warn("Signout issue:", e);
    } finally {
        // Clear local state immediately for responsiveness
        loadedForUserId.current = null;
        setSession(null);
        setCurrentUser(null);
        forceResetUI();
    }
  };

  const handleLogin = async (email: string, password: string): Promise<string|null> => {
    return await supabaseService.signIn(email, password);
  };

  const handleSignup = async (name: string, email: string, password: string, familyInput: { isJoin: boolean, value: string }): Promise<string|null> => {
    try {
        return await supabaseService.signUp(name, email, password, familyInput);
    } catch (e: any) {
        return e.message;
    }
  };

  if (showPublicGuide) {
      return <GuideView user={{ name: 'Guest' }} onBack={() => setShowPublicGuide(false)} onLogout={() => {}} />;
  }

  if (isMockupMode) {
    return <MockupPreview onApprove={() => setIsMockupMode(false)} />;
  }

  // Initial Boot/Verification Spinner
  if (isLoading) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600">
             <SpinnerIcon className="w-10 h-10 text-rose-700 animate-spin mb-4" />
             <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Secure Identity Check...</p>
        </div>
      );
  }

  // Guest Views
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
  
  // Error View (Loop Breaker)
  if (dataLoadError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
             <div className="bg-white p-8 rounded-[3rem] shadow-2xl max-w-sm w-full border border-slate-100">
                 <div className="bg-rose-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 text-2xl">📡</div>
                 <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Sync Delayed</h2>
                 <p className="text-[11px] text-slate-500 mb-8 leading-relaxed font-bold">{dataLoadError}</p>
                 <div className="flex flex-col gap-3">
                     <button onClick={() => { loadedForUserId.current = null; loadUserData(currentUser.id); }} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition text-[10px] uppercase tracking-widest">Reconnect Registry</button>
                     <button onClick={handleLogout} className="w-full bg-slate-100 text-slate-600 font-black py-4 rounded-2xl active:bg-slate-200 transition text-[10px] uppercase tracking-widest">Force Logout</button>
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
        onSelectMember={(id) => { setSelectedMemberId(id); setViewMode('timeline'); }}
        onRefreshData={() => { loadedForUserId.current = null; loadUserData(currentUser.id); }}
        onOpenGuide={() => setViewMode('guide')}
        isSyncing={isSyncing}
    />
  );
};

export default App;
