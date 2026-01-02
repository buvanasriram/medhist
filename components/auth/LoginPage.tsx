
import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { MailIcon } from '../icons/MailIcon';
import { LockIcon } from '../icons/LockIcon';
import { HelpCircleIcon } from '../icons/HelpCircleIcon';
import { SpinnerIcon } from '../icons/SpinnerIcon';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onNavigateToSignup: () => void;
  onNavigateToForgotPassword: () => void;
  onOpenGuide?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigateToSignup, onNavigateToForgotPassword, onOpenGuide }) => {
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
      title="Secure Access"
      subtitle="Sign in to your private health timeline."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Email Identity
          </label>
          <div className="relative rounded-xl shadow-sm">
             <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
               <MailIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="email"
              name="email"
              id="email"
              className="block w-full rounded-xl border border-slate-200 py-3.5 pl-12 text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-500 transition shadow-sm"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password"className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Passcode
            </label>
            <button 
              type="button"
              onClick={onNavigateToForgotPassword}
              className="text-[10px] font-black uppercase tracking-widest text-rose-700 hover:text-rose-900"
              disabled={isLoading}
            >
              Recover?
            </button>
          </div>
          <div className="relative rounded-xl shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
               <LockIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="password"
              name="password"
              id="password"
              className="block w-full rounded-xl border border-slate-200 py-3.5 pl-12 text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-500 transition shadow-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-red-100 text-center">{error}</div>}

        <div className="space-y-3">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-3 py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-rose-900 transition disabled:opacity-50 active:scale-95"
          >
            {isLoading ? <><SpinnerIcon className="w-4 h-4 animate-spin" /> Verifying...</> : 'Enter Registry'}
          </button>
          
          <button
            type="button"
            onClick={onOpenGuide}
            className="w-full flex items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 px-8 py-3.5 rounded-2xl transition-all text-[9px] font-black uppercase tracking-[0.2em]"
          >
            <HelpCircleIcon className="w-4 h-4" /> How medHist Works
          </button>
        </div>
      </form>
       <div className="mt-8 pt-6 border-t border-slate-50 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            New to medHist?
        </p>
        <button 
            onClick={onNavigateToSignup} 
            className="mt-2 text-rose-700 hover:text-rose-900 font-black text-[11px] uppercase tracking-[0.2em] underline underline-offset-4 decoration-rose-200"
            disabled={isLoading}
        >
          Create Family Account
        </button>
      </div>
    </AuthLayout>
  );
};
