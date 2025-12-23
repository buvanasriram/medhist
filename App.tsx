
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { UpdatePasswordPage } from './components/auth/UpdatePasswordPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { TimelineView } from './components/TimelineView';
import { DashboardView } from './components/DashboardView';
import { GuideView } from './components/GuideView';
import type { User, FamilyMember, TimelineEntry, Medication } from './types';
import * as supabaseService from './services/supabaseService';
import { SpinnerIcon } from './components/icons/SpinnerIcon';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [route, setRoute] = useState<string>(
    window.location.pathname === '/signup' ? '/signup' : '/login'
  );
  
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

  const isSigningUpRef = useRef<boolean>(false);
  const routeRef = useRef(route);
  
  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  const loadUserData = useCallback(async (userId: string) => {
      setIsSyncing(true);
      setDataLoadError(null);
      
      try {
          // The service now handles the polling/waiting logic
          const data = await supabaseService.getUserData(userId);
          
          setFamilyMembers(data.familyMembers || []);
          setTimelineEntries(data.timelineEntries || []);
          setMedications(data.medications || []);
          setFamilyInfo(data.familyInfo || null);
          setIsSyncing(false);
          setIsLoading(false);
      } catch (e: any) {
          console.error("[App] Data Load Error:", e);
          setDataLoadError(e.message || "Connection error. Please try refreshing.");
          setIsSyncing(false);
          setIsLoading(false);
      }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (window.location.hash && window.location.hash.includes('type=recovery')) {
        setIsRecoveryMode(true);
    }

    const init = async () => {
      const currentSession = await supabaseService.getSession();
      if (!mounted) return;

      if (currentSession?.user) {
        setSession(currentSession);
        const user = { 
          id: currentSession.user.id, 
          name: currentSession.user.user_metadata?.full_name || currentSession.user.email,
          email: currentSession.user.email || ''
        };
        setCurrentUser(user);
        if (routeRef.current !== '/signup') {
            await loadUserData(user.id);
        } else {
            setIsLoading(false);
        }
      } else {
          setIsLoading(false);
      }
    };
    
    init();
    
    const { data: { subscription } } = supabaseService.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      setSession(session);
      
      if (event === 'PASSWORD_RECOVERY') setIsRecoveryMode(true);

       if (session?.user) {
        const user = { 
          id: session.user.id, 
          name: session.user.user_metadata?.full_name || session.user.email, 
          email: session.user.email || '' 
        };
        setCurrentUser(user);
        
        if (event === 'SIGNED_IN' && !isSigningUpRef.current) {
            await loadUserData(user.id);
        }
      } else {
        setCurrentUser(null);
        if (!isRecoveryMode && routeRef.current !== '/signup' && routeRef.current !== '/forgot-password') {
          setRoute('/login');
        }
      }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, [isRecoveryMode, loadUserData]); 
  
  const handleLogin = async (email: string, password: string):Promise<string|null> => {
    return await supabaseService.signIn(email, password);
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
        // getUserData will poll inside loadUserData
        return null;
    } catch (e: any) {
        setIsLoading(false);
        return e.message;
    } finally {
        isSigningUpRef.current = false;
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await supabaseService.signOut();
    setCurrentUser(null);
    setSession(null);
    setRoute('/login');
    setIsLoading(false);
  };

  if (isLoading) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600">
             <SpinnerIcon className="w-10 h-10 text-brand-blue-600 animate-spin mb-4" />
             <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing Timeline...</p>
        </div>
      );
  }

  if (dataLoadError && currentUser) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
             <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full border border-slate-100">
                 <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">📡</div>
                 <h2 className="text-xl font-bold text-slate-800 mb-2">Service Error</h2>
                 <p className="text-sm text-slate-500 mb-8 leading-relaxed">{dataLoadError}</p>
                 <div className="flex flex-col gap-3">
                     <button onClick={() => loadUserData(currentUser.id)} className="w-full bg-brand-blue-600 text-white font-bold py-4 rounded-xl shadow-md active:scale-95 transition">Retry Connection</button>
                     <button onClick={handleLogout} className="w-full bg-slate-100 text-slate-600 font-bold py-4 rounded-xl active:bg-slate-200 transition">Log Out</button>
                 </div>
             </div>
        </div>
      );
  }

  if (isRecoveryMode) return <UpdatePasswordPage onSuccess={() => { setIsRecoveryMode(false); setRoute('/'); }} />;

  if (!session) {
    if (route === '/signup') return <SignupPage onSignup={handleSignup} onNavigateToLogin={() => setRoute('/login')} />;
    if (route === '/forgot-password') return <ForgotPasswordPage onNavigateToLogin={() => setRoute('/login')} />;
    return <LoginPage onLogin={handleLogin} onNavigateToSignup={() => setRoute('/signup')} onNavigateToForgotPassword={() => setRoute('/forgot-password')} />;
  }
  
  if (!currentUser) return null;

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
            onRefreshData={() => loadUserData(currentUser.id)}
            onOpenGuide={() => setViewMode('guide')}
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
        onOpenGuide={() => setViewMode('guide')}
        isSyncing={isSyncing}
    />
  );
};

export default App;
