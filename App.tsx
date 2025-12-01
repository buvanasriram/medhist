
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);
  
  // Dashboard Data State (Lifted up to avoid re-fetching when switching views)
  const [viewMode, setViewMode] = useState<'dashboard' | 'timeline'>('dashboard');
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(undefined);
  
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [familyInfo, setFamilyInfo] = useState<{name: string, joinCode: string} | null>(null);

  const isSigningUpRef = useRef<boolean>(false);

  // Load User Data Logic
  const loadUserData = async (userId: string) => {
      try {
          const data = await supabaseService.getUserData(userId);
          setFamilyMembers(data.familyMembers);
          setTimelineEntries(data.timelineEntries);
          setMedications(data.medications);
          setFamilyInfo(data.familyInfo);
      } catch (e) {
          console.error("Failed to load user data:", e);
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
        loadUserData(user.id);

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
    
    const { data: { subscription } } = supabaseService.onAuthStateChange((event, session) => {
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
        loadUserData(user.id);
        
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
    const error = await supabaseService.signIn(email, password);
    if(error) return error;
    setRoute('/');
    return null;
  };

  const handleSignup = async (name: string, email: string, password: string, familyInput: { isJoin: boolean, value: string }): Promise<string|null> => {
    isSigningUpRef.current = true;
    try {
        const error = await supabaseService.signUp(name, email, password, familyInput);
        if(error) return error;
        setRoute('/');
        return null;
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
  
  if (isLoading) return null;

  if (isRecoveryMode) {
    return <UpdatePasswordPage onSuccess={() => { setIsRecoveryMode(false); setRoute('/'); }} />;
  }

  if (!session) {
    if (route === '/signup') return <SignupPage onSignup={handleSignup} onNavigateToLogin={() => setRoute('/login')} />;
    return <LoginPage onLogin={handleLogin} onNavigateToSignup={() => setRoute('/signup')} />;
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
