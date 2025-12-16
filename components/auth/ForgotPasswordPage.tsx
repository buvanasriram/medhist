
import React, { useState, useEffect } from 'react';
import { AuthLayout } from './AuthLayout';
import { MailIcon } from '../icons/MailIcon';
import * as supabaseService from '../../services/supabaseService';

interface ForgotPasswordPageProps {
  onNavigateToLogin: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigateToLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [redirectUrl, setRedirectUrl] = useState('');

  useEffect(() => {
    // Show the user where the link will take them (localhost vs production)
    setRedirectUrl(window.location.origin);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const error = await supabaseService.sendPasswordResetEmail(email);
    
    setIsLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error });
    } else {
      // Success! Notify and navigate back to login immediately
      window.alert("Password reset link sent! Please check your email.");
      onNavigateToLogin();
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your email to receive a reset link."
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

        {/* Helper text for the user to understand redirect behavior */}
        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
           The secure link sent to your email will redirect you to: <br/>
           <span className="font-mono text-brand-blue-600 font-medium break-all">{redirectUrl}</span>
        </div>

        {message && (
          <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-blue-600 hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition disabled:bg-brand-blue-300"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </div>
      </form>
       <p className="mt-6 text-center text-sm text-slate-500">
        Remembered your password?{' '}
        <button onClick={onNavigateToLogin} className="font-semibold text-brand-blue-600 hover:text-brand-blue-500">
          Log in
        </button>
      </p>
    </AuthLayout>
  );
};
