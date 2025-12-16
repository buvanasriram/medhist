
import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { UserIcon } from '../icons/UserIcon';
import { MailIcon } from '../icons/MailIcon';
import { LockIcon } from '../icons/LockIcon';
import { KeyIcon } from '../icons/KeyIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';

interface SignupPageProps {
  onSignup: (name: string, email: string, password: string, familyInput: { isJoin: boolean, value: string }) => Promise<string | null>;
  onNavigateToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSignup, onNavigateToLogin }) => {
  // Mode is null initially to show the "Selection Screen" first
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [familyName, setFamilyName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (mode === 'create' && !familyName) {
        setError("Please enter a Family Name.");
        setIsLoading(false);
        return;
    }
    if (mode === 'join' && !joinCode) {
        setError("Please enter the Family Invite Code.");
        setIsLoading(false);
        return;
    }

    if (name && email && password) {
      const familyInput = {
          isJoin: mode === 'join',
          value: mode === 'join' ? joinCode : familyName
      };
      
      const authError = await onSignup(name, email, password, familyInput);
       if (authError) {
        setError(authError);
      }
    }
    setIsLoading(false);
  };

  // ---------------------------------------------------------
  // VIEW 1: SELECTION SCREEN (The "Drastic Revamp")
  // ---------------------------------------------------------
  if (mode === null) {
      return (
        <AuthLayout
            title="Start Your Family Journey"
            subtitle="Choose how you want to set up your account."
        >
            <div className="space-y-4 my-2">
                <button
                    onClick={() => setMode('create')}
                    className="w-full flex items-center p-5 border-2 border-slate-200 rounded-xl hover:border-brand-blue-500 hover:bg-brand-blue-50 transition group text-left shadow-sm bg-white"
                >
                    <div className="bg-brand-blue-100 p-3 rounded-full group-hover:bg-brand-blue-200 transition mr-4">
                        <UsersIcon className="w-8 h-8 text-brand-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-brand-blue-700">Create a New Family</h3>
                        <p className="text-sm text-slate-500 mt-1">I am setting up a secure space for my family's records.</p>
                    </div>
                </button>

                <button
                    onClick={() => setMode('join')}
                    className="w-full flex items-center p-5 border-2 border-slate-200 rounded-xl hover:border-brand-blue-500 hover:bg-brand-blue-50 transition group text-left shadow-sm bg-white"
                >
                    <div className="bg-brand-blue-100 p-3 rounded-full group-hover:bg-brand-blue-200 transition mr-4">
                        <KeyIcon className="w-8 h-8 text-brand-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-brand-blue-700">Join Existing Family</h3>
                        <p className="text-sm text-slate-500 mt-1">I have an invite code from a family member.</p>
                    </div>
                </button>
            </div>

            <p className="mt-8 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <button onClick={onNavigateToLogin} className="font-semibold text-brand-blue-600 hover:text-brand-blue-500">
                Log in
                </button>
            </p>
        </AuthLayout>
      );
  }

  // ---------------------------------------------------------
  // VIEW 2: REGISTRATION FORM (Context Aware)
  // ---------------------------------------------------------
  return (
    <AuthLayout
      title={mode === 'create' ? "Setup New Family" : "Join Your Family"}
      subtitle={mode === 'create' ? "Create a secure space for your family's records." : "Enter your details and the code to join."}
    >
      <div className="mb-6 -mt-2">
          <button 
            onClick={() => { setMode(null); setError(null); }}
            className="flex items-center text-sm font-medium text-slate-400 hover:text-brand-blue-600 transition"
          >
              <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to Selection
          </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Dynamic Section based on Choice */}
        <div className="bg-brand-blue-50 p-5 rounded-lg border border-brand-blue-100">
            {mode === 'create' ? (
                <div>
                    <label htmlFor="familyName" className="block text-sm font-bold text-brand-blue-900 mb-1">Family Group Name</label>
                    <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <UsersIcon className="h-5 w-5 text-brand-blue-500" />
                        </div>
                        <input type="text" id="familyName" className="block w-full rounded-md border-brand-blue-300 py-2 pl-10 text-brand-blue-900 placeholder-brand-blue-300 focus:border-brand-blue-500 focus:ring-brand-blue-500 sm:text-sm" placeholder="e.g. The Vance Family" value={familyName} onChange={(e) => setFamilyName(e.target.value)} disabled={isLoading} autoFocus />
                    </div>
                    <p className="mt-2 text-xs text-brand-blue-600">You will be the admin of this group.</p>
                </div>
            ) : (
                <div>
                    <label htmlFor="joinCode" className="block text-sm font-bold text-brand-blue-900 mb-1">Enter Invite Code</label>
                    <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <KeyIcon className="h-5 w-5 text-brand-blue-500" />
                        </div>
                        <input type="text" id="joinCode" className="block w-full rounded-md border-brand-blue-300 py-2 pl-10 text-brand-blue-900 placeholder-brand-blue-300 uppercase tracking-widest font-mono font-bold focus:border-brand-blue-500 focus:ring-brand-blue-500 sm:text-sm" placeholder="X792KS" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6} disabled={isLoading} autoFocus />
                    </div>
                    <p className="mt-2 text-xs text-brand-blue-600">Ask a family member for their 6-character code.</p>
                </div>
            )}
        </div>

        {/* Standard Fields */}
        <div className="space-y-4">
            <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">Your Full Name</label>
            <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <UserIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input type="text" id="name" className="block w-full rounded-md border border-slate-300 py-2 pl-10 sm:text-sm focus:ring-brand-blue-500 focus:border-brand-blue-500" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
            </div>
            </div>

            <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
            <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MailIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input type="email" id="email" className="block w-full rounded-md border border-slate-300 py-2 pl-10 sm:text-sm focus:ring-brand-blue-500 focus:border-brand-blue-500" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
            </div>
            </div>

            <div>
            <label htmlFor="password"className="block text-sm font-medium text-slate-700">Password</label>
            <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <LockIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input type="password" id="password" className="block w-full rounded-md border border-slate-300 py-2 pl-10 sm:text-sm focus:ring-brand-blue-500 focus:border-brand-blue-500" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
            </div>
            </div>
        </div>
        
        {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100 text-center">{error}</div>}

        <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-blue-600 hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition disabled:bg-brand-blue-300"
          >
            {isLoading ? 'Creating Account...' : (mode === 'create' ? 'Create Family & Account' : 'Join Family & Account')}
        </button>
      </form>
       <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <button onClick={onNavigateToLogin} className="font-semibold text-brand-blue-600 hover:text-brand-blue-500" disabled={isLoading}>
          Log in
        </button>
      </p>
    </AuthLayout>
  );
};
