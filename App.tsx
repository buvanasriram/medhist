
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

  const loadedForUserId = useRef<string | null>(null);
  
  const forceResetUI = useCallback(() => {
    setIsSyncing(false);
    setIsLoading(false);
    setDataLoadError(null);
  }, []);

  const loadUserData = useCallback(async (userId: string) => {
      // Prevent redundant loading if already loaded for this user
      if (loadedForUserId.current === userId) return;
      
      setIsSyncing(true);
      setDataLoadError(null);
      
      try {
          const data = await supabaseService.getUserData(userId);
          setFamilyMembers(data.familyMembers || []);
          setTimelineEntries(data.timelineEntries || []);
          setMedications(data.medications || []);
          setFamilyInfo(data.familyInfo || null);
          loadedForUserId.current = userId;
      } catch (e: any) {
          console.error("[App] Data Load Error:", e);
          setDataLoadError(e.message || "Connection error. Please try refreshing.");
      } finally {
          setIsSyncing(false);
      }
  }, []); // Dependencies are now empty to keep the function stable

  // Effect 1: Navigation & Popstate (Back Button)
  useEffect(() => {
    const handlePopState = () => {
        // If we're not on the dashboard, the back button should return us there
        setViewMode(prev => {
            if (prev !== 'dashboard') return 'dashboard';
            return prev;
        });
        setShowPublicGuide(false);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Effect 2: Initial Session Check
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
        setIsRecoveryMode(true);
    }

    const checkSession = async () => {
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
          if (window.location.pathname === '/login' || window.location.pathname === '/') {
             setRoute('/');
          }
          await loadUserData(user.id);
        }
      } catch (e) {
        console.error("Auth init error", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, [loadUserData]);

  // Effect 3: Auth State Listener
  useEffect(() => {
    const { data: { subscription } } = supabaseService.onAuthStateChange(async (event, currentSession) => {
      if (event === 'SIGNED_OUT' && !currentSession) {
          setSession(null);
          setCurrentUser(null);
          setFamilyMembers([]);
          setTimelineEntries([]);
          setMedications([]);
          loadedForUserId.current = null;
          setRoute('/login');
          forceResetUI();
          return;
      }

      if (event === 'PASSWORD_RECOVERY') setIsRecoveryMode(true);

      if (currentSession?.user) {
        const user = { 
          id: currentSession.user.id, 
          name: currentSession.user.user_metadata?.full_name || currentSession.user.email, 
          email: currentSession.user.email || '' 
        };
        
        setSession(currentSession);
        setCurrentUser(user);
        
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            await loadUserData(user.id);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData, forceResetUI]);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
        await supabaseService.signOut();
    } catch (e) {
        console.warn("Signout issue:", e);
    } finally {
        setCurrentUser(null);
        setSession(null);
        setFamilyMembers([]);
        setTimelineEntries([]);
        setMedications([]);
        loadedForUserId.current = null;
        setRoute('/login');
        forceResetUI();
    }
  };

  const handleLogin = async (email: string, password: string):Promise<string|null> => {
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
    return <MockupPreview onApprove={(logoIdx) => {
        setIsMockupMode(false);
    }} />;
  }

  if (isLoading) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600">
             <SpinnerIcon className="w-10 h-10 text-rose-700 animate-spin mb-4" />
             <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Verifying Secure Session...</p>
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
             <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full border border-slate-100">
                 <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">📡</div>
                 <h2 className="text-xl font-bold text-slate-800 mb-2">Sync Error</h2>
                 <p className="text-sm text-slate-500 mb-8 leading-relaxed">{dataLoadError}</p>
                 <div className="flex flex-col gap-3">
                     <button onClick={() => { loadedForUserId.current = null; loadUserData(currentUser.id); }} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-md active:scale-95 transition">Retry Connection</button>
                     <button onClick={handleLogout} className="w-full bg-slate-100 text-slate-600 font-bold py-4 rounded-xl active:bg-slate-200 transition">Log Out</button>
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
            onBackToDashboard={() => { setViewMode('dashboard'); forceResetUI(); }}
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
        onSelectMember={(id) => { setSelectedMemberId(id); setViewMode('timeline'); forceResetUI(); }}
        onRefreshData={() => { loadedForUserId.current = null; loadUserData(currentUser.id); }}
        onOpenGuide={() => setViewMode('guide')}
        isSyncing={isSyncing}
    />
  );
};

export default App;
