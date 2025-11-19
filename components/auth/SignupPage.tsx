import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { UserIcon } from '../icons/UserIcon';
import { MailIcon } from '../icons/MailIcon';
import { LockIcon } from '../icons/LockIcon';
import { KeyIcon } from '../icons/KeyIcon';

interface SignupPageProps {
  onSignup: (name: string, email: string, password: string, inviteCode?: string) => Promise<string | null>;
  onNavigateToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSignup, onNavigateToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    if (name && email && password) {
      const authError = await onSignup(name, email, password, inviteCode);
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
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Full Name
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
             <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
               <UserIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              name="name"
              id="name"
              className="block w-full rounded-md border border-slate-300 py-2 pl-10 shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 sm:text-sm"
              placeholder="Eleanor Vance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email Address
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
             <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
               <MailIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="email"
              name="email"
              id="email"
              className="block w-full rounded-md border border-slate-300 py-2 pl-10 shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 sm:text-sm"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password"className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
               <LockIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="password"
              name="password"
              id="password"
              className="block w-full rounded-md border border-slate-300 py-2 pl-10 shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 sm:text-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="inviteCode" className="block text-sm font-medium text-slate-700">
            Invite Code <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
               <KeyIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              name="inviteCode"
              id="inviteCode"
              className="block w-full rounded-md border border-slate-300 py-2 pl-10 shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 sm:text-sm uppercase tracking-widest"
              placeholder="X792KS"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={6}
              disabled={isLoading}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">Enter the 6-character code if a family member invited you.</p>
        </div>
        
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-blue-600 hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition disabled:bg-brand-blue-300"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </div>
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