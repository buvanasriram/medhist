
import React, { useState } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { UserIcon } from './icons/UserIcon';
import { UsersIcon } from './icons/UsersIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (details: { name: string; relationship: string; dob: string; }) => Promise<void>;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, onAddMember }) => {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    if (isLoading) return;
    onClose();
    setName('');
    setRelationship('');
    setDob('');
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
        await onAddMember({ name, relationship, dob });
        handleClose();
    } catch (err: any) {
        console.error("Error in AddMemberModal:", err);
        setError(err.message || "Failed to add family member.");
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden border border-slate-100">
        <div className="p-6 border-b border-slate-50 text-left">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">New Family Member</h2>
              <p className="text-sm text-slate-500 mt-1">Add a folder for a child, parent, or spouse.</p>
            </div>
            <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 transition" disabled={isLoading}>
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 text-left">
          <div className="space-y-5">
            <div>
              <label htmlFor="memberName" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Legal Name</label>
              <div className="relative rounded-xl shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                   <UserIcon className="h-5 w-5 text-rose-700" />
                </div>
                <input type="text" id="memberName" value={name} onChange={(e) => setName(e.target.value)} className="block w-full rounded-xl border border-slate-200 py-3 pl-12 text-slate-700 font-medium focus:border-rose-500 focus:ring-rose-500" placeholder="Full name as on records" required disabled={isLoading} />
              </div>
            </div>

            <div>
              <label htmlFor="relationship" className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Relationship</label>
              <div className="relative rounded-xl shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                   <UsersIcon className="h-5 w-5 text-rose-700" />
                </div>
                <input type="text" id="relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} className="block w-full rounded-xl border border-slate-200 py-3 pl-12 text-slate-700 font-medium focus:border-rose-500 focus:ring-rose-500" placeholder="e.g., Daughter, Spouse" required disabled={isLoading} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="dob" className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Date of Birth</label>
              </div>
              <div className="relative rounded-xl shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                   <CalendarIcon className="h-5 w-5 text-rose-700" />
                </div>
                <input 
                    type="date" 
                    id="dob" 
                    value={dob} 
                    onChange={(e) => setDob(e.target.value)} 
                    max={new Date().toISOString().split('T')[0]}
                    className="block w-full rounded-xl border border-slate-200 py-3 pl-12 text-slate-700 font-medium focus:border-rose-500 focus:ring-rose-500" 
                    disabled={isLoading} 
                />
              </div>
            </div>
            
            {error && <p className="text-sm font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-rose-900 transition active:scale-95 flex items-center justify-center gap-2">
              {isLoading ? <><SpinnerIcon className="w-5 h-5 animate-spin" /> Saving...</> : 'Add New Member'}
            </button>
            <button type="button" onClick={handleClose} disabled={isLoading} className="w-full py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};
