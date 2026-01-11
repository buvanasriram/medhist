
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
  
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isSyncingData, setIsSyncingData] = useState<boolean>(false);
  const [showRescue, setShowRescue] = useState<boolean>(false);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<'dashboard' | 'timeline' | 'guide'>('dashboard');
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(undefined);
  
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [familyInfo, setFamilyInfo] = useState<{name: string, joinCode: string} | null>(null);

  const mountedRef = useRef<boolean>(true);
  const bootCalledRef = useRef<boolean>(false);
  
  const clearLocalData = useCallback(() => {
    setFamilyMembers([]);
    setTimelineEntries([]);
    setMedications([]);
    setFamilyInfo(null);
    setDataLoadError(null);
    setSession(null);
    setCurrentUser(null);
  }, []);

  const loadUserData = useCallback(async (userId: string) => {
      if (!mountedRef.current) return;
      setIsSyncingData(true);
      setDataLoadError(null);
      try {
          const data = await supabaseService.getUserData(userId);
          if (mountedRef.current) {
              setFamilyMembers(data.familyMembers || []);
              setTimelineEntries(data.timelineEntries || []);
              setMedications(data.medications || []);
              setFamilyInfo(data.familyInfo || null);
          }
      } catch (e: any) {
          console.error("[medHist] Data Load Error:", e);
          if (mountedRef.current) setDataLoadError(e.message || "Registry Sync Failed.");
      } finally {
          if (mountedRef.current) setIsSyncingData(false);
      }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Show rescue link after 5 seconds
    const rescueTimer = setTimeout(() => {
        if (isLoadingAuth && mountedRef.current) setShowRescue(true);
    }, 5000);

    const boot = async () => {
        if (bootCalledRef.current) return;
        bootCalledRef.current = true;
        
        try {
            const currentSession = await supabaseService.getSession();
            if (currentSession?.user && mountedRef.current) {
                setSession(currentSession);
                setCurrentUser({ 
                    id: currentSession.user.id, 
                    name: currentSession.user.user_metadata?.full_name || currentSession.user.email,
                    email: currentSession.user.email || ''
                });
            }
        } catch (e) {
            console.error("[medHist] Critical Auth Crash:", e);
            await supabaseService.hardReset();
        } finally {
            if (mountedRef.current) {
                setIsLoadingAuth(false);
            }
        }
    };
    
    boot();

    const { data: { subscription } } = supabaseService.onAuthStateChange(async (event, currentSession) => {
      if (!mountedRef.current) return;
      
      if (event === 'SIGNED_OUT') {
          clearLocalData();
          setRoute('/login');
          setIsLoadingAuth(false);
          return;
      }
      
      if (currentSession?.user) {
        setSession(currentSession);
        setCurrentUser({ 
          id: currentSession.user.id, 
          name: currentSession.user.user_metadata?.full_name || currentSession.user.email, 
          email: currentSession.user.email || '' 
        });
        setIsLoadingAuth(false);
        setRoute('/');
      }
    });

    return () => { 
        mountedRef.current = false; 
        subscription.unsubscribe();
        clearTimeout(rescueTimer);
    };
  }, [clearLocalData, isLoadingAuth]);

  useEffect(() => { if (currentUser?.id) loadUserData(currentUser.id); }, [currentUser?.id, loadUserData]);

  const handleLogout = async () => {
    setIsLoadingAuth(true);
    await supabaseService.signOut();
    clearLocalData();
    setRoute('/login');
    setIsLoadingAuth(false);
  };

  const handleHardReset = async () => {
    setIsLoadingAuth(true);
    await supabaseService.hardReset();
    window.location.reload();
  };

  const handleLogin = async (email: string, password: string) => {
    setIsLoadingAuth(true);
    const error = await supabaseService.signIn(email, password);
    if (error) { setIsLoadingAuth(false); return error; }
    return null;
  };

  const handleSignup = async (name: string, email: string, password: string, familyInput: any) => {
    setIsLoadingAuth(true);
    const error = await supabaseService.signUp(name, email, password, familyInput);
    if (error) { setIsLoadingAuth(false); return error; }
    return null;
  };

  if (isLoadingAuth) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
             <div className="relative mb-8">
                <SpinnerIcon className="w-12 h-12 text-rose-700 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-rose-700 rounded-full animate-ping"></div>
                </div>
             </div>
             <h2 className="text-slate-900 font-black uppercase tracking-widest text-xs">Authenticating Vault...</h2>
             <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-2 animate-pulse">Establishing Secure Handshake</p>
             
             {showRescue && (
                 <div className="mt-12 animate-fadeIn">
                     <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mb-4">Taking too long?</p>
                     <button 
                        onClick={handleHardReset}
                        className="px-6 py-3 bg-slate-50 text-rose-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-rose-100 hover:bg-rose-700 hover:text-white transition-all shadow-sm"
                     >
                        Force Reset Session
                     </button>
                 </div>
             )}
        </div>
      );
  }

  if (!session || !currentUser) {
    if (route === '/signup') return <SignupPage onSignup={handleSignup} onNavigateToLogin={() => setRoute('/login')} />;
    if (route === '/forgot-password') return <ForgotPasswordPage onNavigateToLogin={() => setRoute('/login')} />;
    if (route === '/update-password') return <UpdatePasswordPage onSuccess={() => setRoute('/login')} />;
    return <LoginPage onLogin={handleLogin} onNavigateToSignup={() => setRoute('/signup')} onNavigateToForgotPassword={() => setRoute('/forgot-password')} />;
  }

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
        onRefreshData={() => loadUserData(currentUser.id)}
        isSyncing={isSyncingData}
    />
  );
};

export default App;
