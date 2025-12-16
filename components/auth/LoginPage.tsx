
import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { MailIcon } from '../icons/MailIcon';
import { LockIcon } from '../icons/LockIcon';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onNavigateToSignup: () => void;
  onNavigateToForgotPassword: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigateToSignup, onNavigateToForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    if (email && password) {
      const authError = await onLogin(email, password);
      if (authError) {
        setError(authError);
      }
    }
    setIsLoading(false);
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Log in to access your family's medical timeline."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
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
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password"className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <button 
              type="button"
              onClick={onNavigateToForgotPassword}
              className="text-sm font-medium text-brand-blue-600 hover:text-brand-blue-500"
              disabled={isLoading}
            >
              Forgot password?
            </button>
          </div>
          <div className="relative rounded-md shadow-sm">
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

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-blue-600 hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition disabled:bg-brand-blue-300"
          >
            {isLoading ? 'Logging In...' : 'Log In'}
          </button>
        </div>
      </form>
       <p className="mt-6 text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <button onClick={onNavigateToSignup} className="font-semibold text-brand-blue-600 hover:text-brand-blue-500" disabled={isLoading}>
          Sign up
        </button>
      </p>
    </AuthLayout>
  );
};
