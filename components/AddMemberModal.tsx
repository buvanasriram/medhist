
import React, { useState } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { UserIcon } from './icons/UserIcon';
import { UsersIcon } from './icons/UsersIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { KeyIcon } from './icons/KeyIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (details: { name: string; relationship: string; sendInvite: boolean; dob: string; }) => Promise<void>;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, onAddMember }) => {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [dob, setDob] = useState('');
  const [sendInvite, setSendInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    if (isLoading) return;
    onClose();
    setName('');
    setRelationship('');
    setDob('');
    setSendInvite(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !relationship.trim()) {
      setError('Please fill out the name and relationship.');
      return;
    }
    
    setIsLoading(true);
    try {
        await onAddMember({ name, relationship, sendInvite, dob });
        // Reset form on success before closing
        setName('');
        setRelationship('');
        setDob('');
        setSendInvite(false);
        onClose();
    } catch (err: any) {
        console.error("Error in AddMemberModal:", err);
        setError(err.message || "Failed to add family member.");
    } finally {
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
              <h2 className="text-xl font-bold text-slate-800">Add Family Member</h2>
              <p className="text-sm text-slate-500 mt-1">Create a profile to manage their records.</p>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition" disabled={isLoading}>
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="memberName" className="block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                   <UserIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="memberName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-md border border-slate-300 py-2 pl-10 shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 sm:text-sm"
                  placeholder="e.g., John Doe"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="relationship" className="block text-sm font-medium text-slate-700">
                Relationship
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                   <UsersIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="relationship"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="block w-full rounded-md border border-slate-300 py-2 pl-10 shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 sm:text-sm"
                  placeholder="e.g., Father, Son"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-slate-700">
                Date of Birth
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                   <CalendarIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="date"
                  id="dob"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="block w-full rounded-md border border-slate-300 py-2 pl-10 shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 sm:text-sm"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="relative flex items-start bg-slate-50 p-3 rounded-md border border-slate-200">
                <div className="flex h-5 items-center">
                    <input
                    id="sendInvite"
                    name="sendInvite"
                    type="checkbox"
                    checked={sendInvite}
                    onChange={(e) => setSendInvite(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-blue-600 focus:ring-brand-blue-500"
                    disabled={isLoading}
                    />
                </div>
                <div className="ml-3 text-sm">
                    <label htmlFor="sendInvite" className="font-medium text-slate-700 flex items-center gap-2">
                      <KeyIcon className="w-4 h-4 text-brand-blue-500" />
                      Generate Invite Code
                    </label>
                    <p className="text-slate-500 mt-0.5">Generates a secret code so this member can create their own account and access the timeline.</p>
                </div>
            </div>
            
            {error && <p className="text-sm text-red-600">{error}</p>}

          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-brand-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-opacity-75 transition flex items-center gap-2 disabled:bg-brand-blue-300"
            >
              {isLoading ? (
                <>
                  <SpinnerIcon className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                sendInvite ? 'Add & Generate Code' : 'Add Member'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};