
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
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md relative overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-50 text-left bg-white z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-rose-700 uppercase tracking-[0.3em] mb-1 leading-none">Family Registry</p>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">New Member</h2>
            </div>
            <button onClick={handleClose} className="p-2 text-slate-300 hover:text-slate-600 transition" disabled={isLoading}>
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-grow overflow-y-auto p-8 pt-6 pb-4 text-left">
          <form id="addMemberForm" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="memberName" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Legal Name</label>
              <div className="relative rounded-xl shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                   <UserIcon className="h-5 w-5 text-rose-700" />
                </div>
                <input type="text" id="memberName" value={name} onChange={(e) => setName(e.target.value)} className="block w-full rounded-xl border border-slate-200 py-3.5 pl-12 text-slate-900 font-bold text-sm focus:border-rose-500 focus:ring-rose-500 transition" placeholder="Full name as on records" required disabled={isLoading} />
              </div>
            </div>

            <div>
              <label htmlFor="relationship" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Relationship</label>
              <div className="relative rounded-xl shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                   <UsersIcon className="h-5 w-5 text-rose-700" />
                </div>
                <input type="text" id="relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} className="block w-full rounded-xl border border-slate-200 py-3.5 pl-12 text-slate-900 font-bold text-sm focus:border-rose-500 focus:ring-rose-500 transition" placeholder="e.g., Daughter, Spouse" required disabled={isLoading} />
              </div>
            </div>

            <div>
              <label htmlFor="dob" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Date of Birth</label>
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
                    className="block w-full rounded-xl border border-slate-200 py-3.5 pl-12 text-slate-900 font-bold text-sm focus:border-rose-500 focus:ring-rose-500 transition" 
                    disabled={isLoading} 
                />
              </div>
            </div>
            
            {error && <p className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>}
          </form>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 z-10 flex flex-col gap-3">
          <button 
            form="addMemberForm"
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-rose-900 transition active:scale-95 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {isLoading ? <><SpinnerIcon className="w-4 h-4 animate-spin" /> Syncing...</> : 'Create Folder'}
          </button>
          <button 
            type="button" 
            onClick={handleClose} 
            disabled={isLoading} 
            className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
