
import React, { useState, useEffect, useRef } from 'react';
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
  
  // Initialize route based on URL to prevent flashing wrong view on refresh
  const [route, setRoute] = useState<string>(
    window.location.pathname === '/signup' ? '/signup' : '/login'
  );
  
  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);
  
  // Dashboard Data State
  const [viewMode, setViewMode] = useState<'dashboard' | 'timeline' | 'guide'>('dashboard');
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(undefined);
  
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [familyInfo, setFamilyInfo] = useState<{name: string, joinCode: string} | null>(null);

  const isSigningUpRef = useRef<boolean>(false);
  const routeRef = useRef(route);
  
  // Lock to prevent overlapping data loads
  const isLoadingDataRef = useRef<boolean>(false);
  
  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  // Safety Timeout: Force stop loading after 8 seconds if something hangs
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        if (isLoading) {
           console.warn("[App] Safety Timeout triggered: Forcing isLoading to false.");
           setIsLoading(false);
           if (!currentUser && !session && route !== '/signup') {
               // If we timed out and have no user, probably safe to show login
               setRoute('/login');
           }
        }
      }, 8000); // 8 seconds max load time
      return () => clearTimeout(timer);
    }
  }, [isLoading, currentUser, session, route]);

  // Load User Data Logic
  const loadUserData = async (userId: string) => {
      if (isLoadingDataRef.current) {
          console.warn("[App] Data load skipped because one is already in progress.");
          return;
      }
      
      isLoadingDataRef.current = true;
      console.log("[App] loadUserData STARTED for:", userId);
      setDataLoadError(null);
      
      try {
          const data = await supabaseService.getUserData(userId);
          console.log("[App] Data received from service:", { 
              members: data.familyMembers.length, 
              entries: data.timelineEntries.length 
          });
          
          setFamilyMembers(data.familyMembers);
          setTimelineEntries(data.timelineEntries);
          setMedications(data.medications);
          setFamilyInfo(data.familyInfo);
      } catch (e: any) {
          console.error("[App] Failed to load user data:", e);
          setDataLoadError(e.message || "Failed to load your profile.");
      } finally {
          console.log("[App] loadUserData FINISHED");
          isLoadingDataRef.current = false;
      }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Explicit Hash Check for Recovery (Critical for Vercel/Prod)
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
        console.log("[App] Recovery mode detected via URL hash");
        setIsRecoveryMode(true);
    }

    const checkSession = async () => {
      console.log("[App] Checking Session...");
      try {
        const currentSession = await supabaseService.getSession();
        if (!mounted) return;

        setSession(currentSession);
        
        if (currentSession?.user) {
          console.log("[App] Session Valid:", currentSession.user.email);
          const user = { 
            id: currentSession.user.id, 
            name: currentSession.user.user_metadata?.full_name || currentSession.user.email,
            email: currentSession.user.email || ''
          };
          
          if(mounted) setCurrentUser(user);
          
          // Only attempt data load if not on signup page
          if(routeRef.current !== '/signup') {
             // We await this, but the safety timeout above protects us if it hangs
             await loadUserData(user.id);
          }

          if (mounted && window.location.pathname !== '/signup') {
               setRoute('/');
          }
        } else {
            console.log("[App] No session found");
            if (mounted && routeRef.current !== '/signup') {
                setRoute('/login');
            }
        }
      } catch (err) {
          console.error("Session check failed:", err);
      } finally {
          if (mounted) {
              console.log("[App] checkSession completed, setting isLoading=false");
              setIsLoading(false);
          }
      }
    };
    
    checkSession();
    
    const { data: { subscription } } = supabaseService.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log("[App] Auth State Change:", event);
      setSession(session);
      
      if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
      }

       if (session?.user) {
        const user = { 
          id: session.user.id, 
          name: session.user.user_metadata?.full_name || session.user.email, 
          email: session.user.email || '' 
        };
        setCurrentUser(user);
        
        // CRITICAL: Only auto-load data if we are NOT in the middle of a signup flow.
        if (event === 'SIGNED_IN' && !isSigningUpRef.current) {
            console.log("[App] Auto-loading data on SIGNED_IN event");
            await loadUserData(user.id);
        } else if (event === 'SIGNED_IN' && isSigningUpRef.current) {
            console.log("Skipping auto-load during signup to prevent race condition.");
        }
        
        if (!isSigningUpRef.current && routeRef.current !== '/signup') {
             setRoute('/');
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
  }, [isRecoveryMode]); 
  
  const handleLogin = async (email: string, password: string):Promise<string|null> => {
    // We do NOT set global isLoading here. 
    // This allows the LoginPage component to stay mounted and display errors if login fails.
    const error = await supabaseService.signIn(email, password);
    if(error) {
        return error;
    }
    return null;
  };

  const handleSignup = async (name: string, email: string, password: string, familyInput: { isJoin: boolean, value: string }): Promise<string|null> => {
    isSigningUpRef.current = true;
    // We do NOT set global isLoading here.
    try {
        const error = await supabaseService.signUp(name, email, password, familyInput);
        if(error) {
            return error;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const session = await supabaseService.getSession();
        if (session?.user) {
             const user = { 
                id: session.user.id, 
                name: session.user.user_metadata?.full_name || session.user.email,
                email: session.user.email || ''
             };
             setCurrentUser(user);
             await loadUserData(user.id);
        }

        setRoute('/');
        return null;
    } catch (e: any) {
        return e.message;
    } finally {
        isSigningUpRef.current = false;
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
        return <SignupPage onSignup={handleSignup} onNavigateToLogin={() => setRoute('/login')} />;
    }
    if (route === '/forgot-password') {
        return <ForgotPasswordPage onNavigateToLogin={() => setRoute('/login')} />;
    }
    return (
        <LoginPage 
            onLogin={handleLogin} 
            onNavigateToSignup={() => setRoute('/signup')} 
            onNavigateToForgotPassword={() => setRoute('/forgot-password')}
        />
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

  if (viewMode === 'guide') {
      return (
          <GuideView 
            user={currentUser} 
            onBack={() => setViewMode('dashboard')} 
            onLogout={handleLogout}
          />
      );
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
    />
  );
};

export default App;
