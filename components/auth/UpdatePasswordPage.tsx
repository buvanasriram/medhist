
import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { LockIcon } from '../icons/LockIcon';
import * as supabaseService from '../../services/supabaseService';

interface UpdatePasswordPageProps {
  onSuccess: () => void;
}

export const UpdatePasswordPage: React.FC<UpdatePasswordPageProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const err = await supabaseService.updatePassword(password);
    
    if (err) {
      setError(err);
      setIsLoading(false);
    } else {
      // Password updated successfully
      onSuccess();
    }
  };

  return (
    <AuthLayout
      title="Set New Password"
      subtitle="Please enter your new password below."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            New Password
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
              minLength={6}
              disabled={isLoading}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-md text-sm bg-red-50 text-red-700">
            {error}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-blue-600 hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition disabled:bg-brand-blue-300"
          >
            {isLoading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};
