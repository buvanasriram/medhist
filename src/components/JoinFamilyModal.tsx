
import React, { useState } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { KeyIcon } from './icons/KeyIcon';
import { WarningIcon } from './icons/WarningIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface JoinFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<void>;
}

export const JoinFamilyModal: React.FC<JoinFamilyModalProps> = ({ isOpen, onClose, onJoin }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code || code.length < 6) {
        setError("Please enter a valid 6-character code.");
        return;
    }
    
    setIsLoading(true);
    try {
        await onJoin(code.toUpperCase());
    } catch (err: any) {
        console.error("Join Error:", err);
        setError(err.message || "Failed to join family. Please check the code.");
        setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md relative">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Join Another Family</h2>
              <p className="text-sm text-slate-500 mt-1">Switch to a different family group.</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition" disabled={isLoading}>
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
             <WarningIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
             <div className="text-sm text-yellow-800">
                <p className="font-semibold">Your data will move with you.</p>
                <p>Your profile and any family members you created (along with their files) will be moved to the new family group.</p>
             </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <label htmlFor="joinCode" className="block text-sm font-medium text-slate-700 mb-1">Family Invite Code</label>
            <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <KeyIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                    type="text" 
                    id="joinCode" 
                    className="block w-full rounded-md border border-slate-300 py-2 pl-10 text-slate-800 uppercase tracking-widest font-mono focus:ring-brand-blue-500 focus:border-brand-blue-500" 
                    placeholder="X792KS" 
                    value={code} 
                    onChange={(e) => setCode(e.target.value.toUpperCase())} 
                    maxLength={6} 
                    disabled={isLoading}
                    autoFocus 
                />
            </div>
            
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
                <button 
                    type="button" 
                    onClick={onClose} 
                    disabled={isLoading} 
                    className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                    Cancel
                </button>
                <button 
                    type="submit" 
                    disabled={isLoading} 
                    className="bg-brand-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-brand-blue-700 transition flex items-center gap-2 disabled:bg-brand-blue-300"
                >
                    {isLoading ? <><SpinnerIcon className="w-4 h-4 animate-spin" /> Joining...</> : 'Join Family'}
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
