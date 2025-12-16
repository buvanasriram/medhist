
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
  
  // For Self: Email editing
  const [email, setEmail] = useState(currentUser.email);
  const [emailChanged, setEmailChanged] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Correctly identify if this member card belongs to the logged-in user
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
        // 1. Update Member Details
        await supabaseService.updateFamilyMember(member.id, { 
            name, 
            relationship: isSelf ? 'Self' : relationship, 
            dob 
        });

        // 2. Update Email if Self and changed
        if (isSelf && email !== currentUser.email) {
            const err = await supabaseService.updateUserEmail(email);
            if (err) {
                 setError(`Profile updated, but email update failed: ${err}`);
                 setIsLoading(false);
                 onUpdate(); // Still refresh to show name change
                 return;
            } else {
                 setSuccessMsg("Profile updated! Please check your new email inbox to confirm the address change.");
                 setEmailChanged(true); // Prevent further edits until closed
                 setIsLoading(false);
                 onUpdate();
                 return; // Don't close automatically so they read the message
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
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md relative">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Edit Member</h2>
              <p className="text-sm text-slate-500 mt-1">Update details for {member.name}</p>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition" disabled={isLoading}>
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="editMemberName" className="block text-sm font-medium text-slate-700">Full Name</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                   <UserIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                    type="text" 
                    id="editMemberName" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="block w-full rounded-md border border-slate-300 py-2 pl-10 sm:text-sm focus:border-brand-blue-500 focus:ring-brand-blue-500" 
                    placeholder="e.g., John Doe" 
                    required 
                    disabled={isLoading || emailChanged} 
                />
              </div>
            </div>

            <div>
              <label htmlFor="editRelationship" className="block text-sm font-medium text-slate-700">Relationship</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                   <UsersIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                    type="text" 
                    id="editRelationship" 
                    value={relationship} 
                    onChange={(e) => setRelationship(e.target.value)} 
                    className="block w-full rounded-md border border-slate-300 py-2 pl-10 sm:text-sm focus:border-brand-blue-500 focus:ring-brand-blue-500 disabled:bg-slate-100 disabled:text-slate-500" 
                    placeholder="e.g., Daughter" 
                    required 
                    disabled={isLoading || isSelf || emailChanged} 
                    title={isSelf ? "You cannot change your relationship to yourself." : ""}
                />
              </div>
            </div>

            <div>
              <label htmlFor="editDob" className="block text-sm font-medium text-slate-700">Date of Birth</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                   <CalendarIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                    type="date" 
                    id="editDob" 
                    value={dob} 
                    onChange={(e) => setDob(e.target.value)} 
                    className="block w-full rounded-md border border-slate-300 py-2 pl-10 sm:text-sm focus:border-brand-blue-500 focus:ring-brand-blue-500" 
                    disabled={isLoading || emailChanged} 
                />
              </div>
            </div>

            {isSelf && (
                 <div className="pt-2 border-t border-slate-100 mt-2">
                    <label htmlFor="editEmail" className="block text-sm font-medium text-slate-700">Email Address</label>
                    <p className="text-xs text-slate-500 mb-2">Changing this will send a confirmation link to the new address.</p>
                    <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MailIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <input 
                            type="email" 
                            id="editEmail" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            className="block w-full rounded-md border border-slate-300 py-2 pl-10 sm:text-sm focus:border-brand-blue-500 focus:ring-brand-blue-500" 
                            disabled={isLoading || emailChanged} 
                        />
                    </div>
                 </div>
            )}
            
            {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">{error}</p>}
            {successMsg && <p className="text-sm text-green-700 bg-green-50 p-2 rounded border border-green-100">{successMsg}</p>}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button 
                type="button" 
                onClick={handleClose} 
                disabled={isLoading} 
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
                {successMsg ? "Close" : "Cancel"}
            </button>
            {!successMsg && (
                <button 
                    type="submit" 
                    disabled={isLoading} 
                    className="bg-brand-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-brand-blue-700 transition flex items-center gap-2 disabled:bg-brand-blue-300"
                >
                {isLoading ? <><SpinnerIcon className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
                </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
