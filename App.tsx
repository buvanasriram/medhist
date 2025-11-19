
import React, { useState, useEffect} from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { TimelineView } from './components/TimelineView';
import type { User } from './types';
import * as supabaseService from './services/supabaseService';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [route, setRoute] = useState<string>('/login');
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
        setRoute('/');
      } else {
        setRoute('/login');
      }
      setIsLoading(false);
    };
    checkSession();
    
    const { data: { subscription } } = supabaseService.onAuthStateChange((_event, session) => {
      setSession(session);
       if (session?.user) {
        setCurrentUser({ 
          id: session.user.id, 
          name: session.user.user_metadata?.full_name || session.user.email, 
          email: session.user.email || '' 
        });
        setRoute('/');
      } else {
        setCurrentUser(null);
        setRoute('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  
  const handleLogin = async (email: string, password: string):Promise<string|null> => {
    const error = await supabaseService.signIn(email, password);
    if(error) return error;
    setRoute('/');
    return null;
  };

  const handleSignup = async (name: string, email: string, password: string, familyInput: { isJoin: boolean, value: string }): Promise<string|null> => {
    const error = await supabaseService.signUp(name, email, password, familyInput);
    if(error) return error;
    setRoute('/');
    return null;
  };

  const handleLogout = async () => {
    await supabaseService.signOut();
    setCurrentUser(null);
    setRoute('/login');
  };
  
  if (isLoading) return null;

  if (!session) {
    return route === '/signup' ? (
      <SignupPage onSignup={handleSignup} onNavigateToLogin={() => setRoute('/login')} />
    ) : (
      <LoginPage onLogin={handleLogin} onNavigateToSignup={() => setRoute('/signup')} />
    );
  }
  
  if (!currentUser) return null;

  return <TimelineView onLogout={handleLogout} user={currentUser} />;
};

export default App;
