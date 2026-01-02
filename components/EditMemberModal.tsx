
import React, { useState, useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { UserIcon } from './icons/UserIcon';
import { UsersIcon } from './icons/UsersIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { MailIcon } from './icons/MailIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import type { FamilyMember, User } from '../types';
import * as supabaseService from '../services/supabaseService';

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: FamilyMember;
  currentUser: User;
  onUpdate: () => void;
}

export const EditMemberModal: React.FC<EditMemberModalProps> = ({ isOpen, onClose, member, currentUser, onUpdate }) => {
  const [name, setName] = useState(member.name);
  const [relationship, setRelationship] = useState(member.relationship);
  const [dob, setDob] = useState(member.dob || '');
  
  const [email, setEmail] = useState(currentUser.email);
  const [emailChanged, setEmailChanged] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isSelf = member.linked_user_id === currentUser.id;

  useEffect(() => {
    if (isOpen) {
        setName(member.name);
        setRelationship(member.relationship);
        setDob(member.dob || '');
        setEmail(currentUser.email);
        setEmailChanged(false);
        setError(null);
        setSuccessMsg(null);
    }
  }, [isOpen, member, currentUser]);

  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    
    setIsLoading(true);
    try {
        await supabaseService.updateFamilyMember(member.id, { 
            name, 
            relationship: isSelf ? 'Self' : relationship, 
            dob 
        });

        if (isSelf && email !== currentUser.email) {
            const err = await supabaseService.updateUserEmail(email);
            if (err) {
                 setError(`Profile updated, but email update failed: ${err}`);
                 setIsLoading(false);
                 onUpdate();
                 return;
            } else {
                 setSuccessMsg("Check your new email inbox to confirm change.");
                 setEmailChanged(true);
                 setIsLoading(false);
                 onUpdate();
                 return;
            }
        }

        onUpdate();
        handleClose();
    } catch (err: any) {
        console.error("Error updating member:", err);
        setError(err.message || "Failed to update member.");
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md relative overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Static Header */}
        <div className="p-8 border-b border-slate-50 text-left bg-white z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-rose-700 uppercase tracking-[0.3em] mb-1 leading-none">Profile Registry</p>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">Edit Member</h2>
            </div>
            <button onClick={handleClose} className="p-2 text-slate-300 hover:text-slate-900 transition" disabled={isLoading}>
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-grow overflow-y-auto p-8 pt-6 pb-4 text-left">
          <form id="editMemberForm" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="editMemberName" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Legal Name</label>
              <div className="relative rounded-xl shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                   <UserIcon className="h-5 w-5 text-rose-700" />
                </div>
                <input 
                    type="text" 
                    id="editMemberName" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="block w-full rounded-xl border border-slate-200 py-3.5 pl-12 text-slate-900 font-bold text-sm focus:border-rose-500 focus:ring-rose-500 transition" 
                    placeholder="Full name" 
                    required 
                    disabled={isLoading || emailChanged} 
                />
              </div>
            </div>

            <div>
              <label htmlFor="editRelationship" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Relationship</label>
              <div className="relative rounded-xl shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                   <UsersIcon className="h-5 w-5 text-rose-700" />
                </div>
                <input 
                    type="text" 
                    id="editRelationship" 
                    value={relationship} 
                    onChange={(e) => setRelationship(e.target.value)} 
                    className="block w-full rounded-xl border border-slate-200 py-3.5 pl-12 text-slate-900 font-bold text-sm focus:border-rose-500 focus:ring-rose-500 disabled:bg-slate-50 disabled:text-slate-400 transition" 
                    placeholder="e.g. Daughter" 
                    required 
                    disabled={isLoading || isSelf || emailChanged} 
                />
              </div>
            </div>

            <div>
              <label htmlFor="editDob" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Date of Birth</label>
              <div className="relative rounded-xl shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                   <CalendarIcon className="h-5 w-5 text-rose-700" />
                </div>
                <input 
                    type="date" 
                    id="editDob" 
                    value={dob} 
                    onChange={(e) => setDob(e.target.value)} 
                    className="block w-full rounded-xl border border-slate-200 py-3.5 pl-12 text-slate-900 font-bold text-sm focus:border-rose-500 focus:ring-rose-500 transition" 
                    disabled={isLoading || emailChanged} 
                />
              </div>
            </div>

            {isSelf && (
                 <div className="pt-4 border-t border-slate-50 mt-2">
                    <label htmlFor="editEmail" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Login Email</label>
                    <div className="relative rounded-xl shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <MailIcon className="h-5 w-5 text-rose-700" />
                        </div>
                        <input 
                            type="email" 
                            id="editEmail" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            className="block w-full rounded-xl border border-slate-200 py-3.5 pl-12 text-slate-900 font-bold text-sm focus:border-rose-500 focus:ring-rose-500 transition" 
                            disabled={isLoading || emailChanged} 
                        />
                    </div>
                 </div>
            )}
            
            {error && <p className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>}
            {successMsg && <p className="text-[10px] font-black uppercase tracking-widest text-green-700 bg-green-50 p-4 rounded-xl border border-green-100">{successMsg}</p>}
          </form>
        </div>

        {/* Sticky Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 z-10 flex flex-col gap-3">
          {!successMsg && (
              <button 
                  form="editMemberForm"
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-rose-900 transition active:scale-95 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em] disabled:opacity-50"
              >
                  {isLoading ? <><SpinnerIcon className="w-4 h-4 animate-spin" /> Syncing...</> : 'Save Changes'}
              </button>
          )}
          <button 
              type="button" 
              onClick={handleClose} 
              disabled={isLoading} 
              className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition"
          >
              {successMsg ? "Close Registry" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
};
