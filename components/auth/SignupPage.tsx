
import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { UserIcon } from '../icons/UserIcon';
import { MailIcon } from '../icons/MailIcon';
import { LockIcon } from '../icons/LockIcon';
import { KeyIcon } from '../icons/KeyIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { HelpCircleIcon } from '../icons/HelpCircleIcon';
// Added missing SpinnerIcon import
import { SpinnerIcon } from '../icons/SpinnerIcon';

interface SignupPageProps {
  onSignup: (name: string, email: string, password: string, familyInput: { isJoin: boolean, value: string }) => Promise<string | null>;
  onNavigateToLogin: () => void;
  onOpenGuide?: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSignup, onNavigateToLogin, onOpenGuide }) => {
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
  // VIEW 1: SELECTION SCREEN (Step 1)
  // ---------------------------------------------------------
  if (mode === null) {
      return (
        <AuthLayout
            title="Start Your Journey"
            subtitle="Choose a secure entry point to continue."
        >
            <div className="space-y-3 my-2">
                <button
                    onClick={() => setMode('create')}
                    className="w-full flex items-center p-4 border-2 border-slate-100 rounded-[1.5rem] hover:border-rose-200 hover:bg-rose-50 transition-all group text-left shadow-sm bg-white"
                >
                    <div className="bg-rose-50 p-3 rounded-xl group-hover:bg-rose-700 transition mr-4">
                        <UsersIcon className="w-6 h-6 text-rose-700 group-hover:text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 group-hover:text-rose-900 leading-tight">Create a New Family</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Setup your private registry</p>
                    </div>
                </button>

                <button
                    onClick={() => setMode('join')}
                    className="w-full flex items-center p-4 border-2 border-slate-100 rounded-[1.5rem] hover:border-rose-200 hover:bg-rose-50 transition-all group text-left shadow-sm bg-white"
                >
                    <div className="bg-rose-50 p-3 rounded-xl group-hover:bg-rose-700 transition mr-4">
                        <KeyIcon className="w-6 h-6 text-rose-700 group-hover:text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 group-hover:text-rose-900 leading-tight">Join Existing Family</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">I have a join code</p>
                    </div>
                </button>

                <div className="pt-4 mt-2 border-t border-slate-50 flex flex-col gap-2">
                    <button
                        onClick={onNavigateToLogin}
                        className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-rose-900 text-white px-8 py-3.5 rounded-2xl transition-all shadow-xl text-[9px] font-black uppercase tracking-[0.2em]"
                    >
                        Sign In to Account
                    </button>
                    
                    <button
                        onClick={onOpenGuide}
                        className="w-full flex items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 px-8 py-3.5 rounded-2xl transition-all text-[9px] font-black uppercase tracking-[0.2em]"
                    >
                        <HelpCircleIcon className="w-4 h-4" /> How medHist Works
                    </button>
                </div>
            </div>
        </AuthLayout>
      );
  }

  // ---------------------------------------------------------
  // VIEW 2: REGISTRATION FORM (Step 2)
  // ---------------------------------------------------------
  return (
    <AuthLayout
      title={mode === 'create' ? "Setup Family" : "Join Family"}
      subtitle={mode === 'create' ? "Enter a name for your private group." : "Enter your invite code below."}
    >
      <div className="mb-6 -mt-2">
          <button 
            onClick={() => { setMode(null); setError(null); }}
            className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-rose-700 transition"
          >
              <ArrowLeftIcon className="w-4 h-4 mr-2" /> Change Method
          </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100">
            {mode === 'create' ? (
                <div>
                    <label htmlFor="familyName" className="block text-[10px] font-black text-rose-700 uppercase tracking-widest mb-2">Group Identifier</label>
                    <div className="relative rounded-xl shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <UsersIcon className="h-5 w-5 text-rose-700" />
                        </div>
                        <input type="text" id="familyName" className="block w-full rounded-xl border border-rose-200/50 py-3.5 pl-12 text-sm font-bold text-slate-900 placeholder-rose-200 focus:outline-none focus:border-rose-500 transition shadow-sm bg-white" placeholder="e.g. Vance Family" value={familyName} onChange={(e) => setFamilyName(e.target.value)} disabled={isLoading} autoFocus />
                    </div>
                </div>
            ) : (
                <div>
                    <label htmlFor="joinCode" className="block text-[10px] font-black text-rose-700 uppercase tracking-widest mb-2">Invite Code</label>
                    <div className="relative rounded-xl shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <KeyIcon className="h-5 w-5 text-rose-700" />
                        </div>
                        <input type="text" id="joinCode" className="block w-full rounded-xl border border-rose-200/50 py-3.5 pl-12 text-sm font-black text-slate-900 placeholder-rose-200 uppercase tracking-[0.4em] focus:outline-none focus:border-rose-500 transition shadow-sm bg-white" placeholder="X792KS" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6} disabled={isLoading} autoFocus />
                    </div>
                </div>
            )}
        </div>

        <div className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Your Name</label>
                <div className="relative rounded-xl shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <UserIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input type="text" id="name" className="block w-full rounded-xl border border-slate-200 py-3.5 pl-12 text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-500 transition shadow-sm" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
                </div>
            </div>

            <div>
                <label htmlFor="email" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
                <div className="relative rounded-xl shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <MailIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input type="email" id="email" className="block w-full rounded-xl border border-slate-200 py-3.5 pl-12 text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-500 transition shadow-sm" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
                </div>
            </div>

            <div>
                <label htmlFor="password"className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Password</label>
                <div className="relative rounded-xl shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <LockIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input type="password" id="password" className="block w-full rounded-xl border border-slate-200 py-3.5 pl-12 text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-500 transition shadow-sm" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
                </div>
            </div>
        </div>
        
        {error && <div className="p-4 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-red-100 text-center">{error}</div>}

        <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-rose-900 transition active:scale-95 text-[10px] uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {isLoading ? <><SpinnerIcon className="w-4 h-4 animate-spin mr-3" /> Syncing...</> : 'Complete Registry'}
        </button>
      </form>
    </AuthLayout>
  );
};