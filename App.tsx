
import React, { useState, useEffect, useRef } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { UpdatePasswordPage } from './components/auth/UpdatePasswordPage';
import { TimelineView } from './components/TimelineView';
import type { User } from './types';
import * as supabaseService from './services/supabaseService';
import { SpinnerIcon } from './components/icons/SpinnerIcon';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [route, setRoute] = useState<string>('/login');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);
  
  // Prevents race conditions: Ensures we don't route to dashboard 
  // until the DB profile creation is fully complete.
  const isSigningUpRef = useRef<boolean>(false);

  useEffect(() => {
    const checkSession = async () => {
      const currentSession = await supabaseService.getSession();
      setSession(currentSession);
      if (currentSession?.user) {
        setCurrentUser({ 
          id: currentSession.user.id, 
          name: currentSession.user.user_metadata?.full_name || currentSession.user.email,
          email: currentSession.user.email || ''
        });
        
        // If logged in, go to dashboard (unless we are explicitly on signup page, maybe to create another account?)
        // Generally if logged in, we go to root.
        if (window.location.pathname !== '/signup') {
             setRoute('/');
        }
      } else {
        // Only redirect to login if we are NOT currently trying to sign up
        if (route !== '/signup') {
            setRoute('/login');
        }
      }
      setIsLoading(false);
    };
    checkSession();
    
    const { data: { subscription } } = supabaseService.onAuthStateChange((event, session) => {
      setSession(session);

      // Handle Password Recovery Event
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }

       if (session?.user) {
        setCurrentUser({ 
          id: session.user.id, 
          name: session.user.user_metadata?.full_name || session.user.email, 
          email: session.user.email || '' 
        });
        
        // ONLY route to dashboard if we are NOT in the middle of a signup process.
        // If we are signing up, handleSignup will manually route us when DB is ready.
        if (!isSigningUpRef.current && route !== '/signup') {
             setRoute('/');
        }
      } else {
        setCurrentUser(null);
        // Only redirect to login if we aren't doing something else specific (like recovering password or signing up)
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
    // Lock routing to prevent premature dashboard load
    isSigningUpRef.current = true;
    
    try {
        const error = await supabaseService.signUp(name, email, password, familyInput);
        if(error) {
            return error;
        }
        
        // Success! Database is ready. Now we can safely go to dashboard.
        setRoute('/');
        return null;
    } finally {
        // Unlock in all cases
        isSigningUpRef.current = false;
    }
  };

  const handleLogout = async () => {
    await supabaseService.signOut();
    setCurrentUser(null);
    setRoute('/login');
    setIsRecoveryMode(false);
  };
  
  if (isLoading) return null;

  // Priority 1: Recovery Mode (Updating Password)
  if (isRecoveryMode) {
    return (
      <UpdatePasswordPage 
        onSuccess={() => {
          setIsRecoveryMode(false);
          setRoute('/');
        }} 
      />
    );
  }

  if (!session) {
    if (route === '/signup') {
      return <SignupPage onSignup={handleSignup} onNavigateToLogin={() => setRoute('/login')} />;
    }
    
    // Default to Login
    return (
      <LoginPage 
        onLogin={handleLogin} 
        onNavigateToSignup={() => setRoute('/signup')} 
      />
    );
  }
  
  // RACE CONDITION FIX:
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

  return <TimelineView onLogout={handleLogout} user={currentUser} />;
};

export default App;
