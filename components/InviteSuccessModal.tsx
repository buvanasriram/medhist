import React, { useState } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { MailIcon } from './icons/MailIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { KeyIcon } from './icons/KeyIcon';

interface InviteSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteData: {
    name: string;
    email: string;
    link: string;
    code: string;
  } | null;
}

export const InviteSuccessModal: React.FC<InviteSuccessModalProps> = ({ isOpen, onClose, inviteData }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !inviteData) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent("Join our family medical timeline on medHist");
    const body = encodeURIComponent(`Hi ${inviteData.name},\n\nI've added you to our family group on medHist to share and manage medical records.\n\nYou can create an account and join here:\n${inviteData.link}\n\nYour Invite Code is: ${inviteData.code}\n\nPlease enter this code when you sign up to link your profile.\n\nBest regards`);
    window.location.href = `mailto:${inviteData.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md relative">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-brand-blue-800">Invitation Ready</h2>
              <p className="text-sm text-slate-500 mt-1">
                Member added successfully. Share the invite code with {inviteData.name} to let them join.
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Invite Code Display */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">One-Time Invite Code</p>
                <div className="flex items-center justify-center gap-3">
                    <KeyIcon className="w-6 h-6 text-brand-blue-500" />
                    <span className="text-3xl font-mono font-bold text-slate-800 tracking-widest">{inviteData.code}</span>
                </div>
                <button 
                    onClick={handleCopy}
                    className="mt-3 text-sm text-brand-blue-600 hover:text-brand-blue-800 font-medium flex items-center justify-center gap-1 w-full"
                >
                   {copied ? "Copied!" : (
                       <>
                        <ClipboardIcon className="w-4 h-4" /> Copy Code
                       </>
                   )}
                </button>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-800 mb-1">
                    <strong>Next Step:</strong> {inviteData.name} needs to sign up and enter this code.
                </p>
                <p className="text-xs text-blue-600">
                    Link: {inviteData.link}
                </p>
            </div>

            <button
              onClick={handleSendEmail}
              className="w-full flex justify-center items-center gap-2 bg-brand-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-opacity-75 transition"
            >
              <MailIcon className="w-5 h-5" />
              Open Email Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};