
import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { UserIcon } from '../icons/UserIcon';
import { MailIcon } from '../icons/MailIcon';
import { LockIcon } from '../icons/LockIcon';
import { KeyIcon } from '../icons/KeyIcon';
import { UsersIcon } from '../icons/UsersIcon';

interface SignupPageProps {
  onSignup: (name: string, email: string, password: string, familyInput: { isJoin: boolean, value: string }) => Promise<string | null>;
  onNavigateToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSignup, onNavigateToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Family Mode: 'create' or 'join'
  const [mode, setMode] = useState<'create' | 'join'>('create');
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

  return (
    <AuthLayout
      title="Create Your Account"
      subtitle="Join medHist to securely manage your family's health records."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Standard Fields */}
        <div className="space-y-4">
            <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">Full Name</label>
            <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <UserIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input type="text" id="name" className="block w-full rounded-md border border-slate-300 py-2 pl-10 sm:text-sm" placeholder="Eleanor Vance" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
            </div>
            </div>

            <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
            <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MailIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input type="email" id="email" className="block w-full rounded-md border border-slate-300 py-2 pl-10 sm:text-sm" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
            </div>
            </div>

            <div>
            <label htmlFor="password"className="block text-sm font-medium text-slate-700">Password</label>
            <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <LockIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input type="password" id="password" className="block w-full rounded-md border border-slate-300 py-2 pl-10 sm:text-sm" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
            </div>
            </div>
        </div>

        {/* Family Setup Section */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex gap-4 mb-4">
                <button 
                    type="button"
                    onClick={() => setMode('create')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md border ${mode === 'create' ? 'bg-white border-brand-blue-500 text-brand-blue-700 shadow-sm' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Create New Family
                </button>
                <button 
                    type="button"
                    onClick={() => setMode('join')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md border ${mode === 'join' ? 'bg-white border-brand-blue-500 text-brand-blue-700 shadow-sm' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Join Existing
                </button>
            </div>

            {mode === 'create' ? (
                <div>
                    <label htmlFor="familyName" className="block text-sm font-medium text-slate-700">Family Group Name</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <UsersIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <input type="text" id="familyName" className="block w-full rounded-md border border-slate-300 py-2 pl-10 sm:text-sm" placeholder="The Vance Family" value={familyName} onChange={(e) => setFamilyName(e.target.value)} disabled={isLoading} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">You'll get a code to invite others later.</p>
                </div>
            ) : (
                <div>
                    <label htmlFor="joinCode" className="block text-sm font-medium text-slate-700">Family Invite Code</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <KeyIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <input type="text" id="joinCode" className="block w-full rounded-md border border-slate-300 py-2 pl-10 sm:text-sm uppercase tracking-widest" placeholder="X792KS" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6} disabled={isLoading} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Ask a family member for their group code.</p>
                </div>
            )}
        </div>
        
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-blue-600 hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition disabled:bg-brand-blue-300"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
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
