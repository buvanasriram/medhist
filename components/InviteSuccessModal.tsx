
import React, { useState } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { KeyIcon } from './icons/KeyIcon';

interface InviteSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteData: {
    name: string;
    link: string;
    code: string;
  } | null;
}

export const InviteSuccessModal: React.FC<InviteSuccessModalProps> = ({ isOpen, onClose, inviteData }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  if (!isOpen || !inviteData) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteData.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleCopyFullInvite = async () => {
    try {
      const text = `Hi ${inviteData.name},\n\nI've added you to our family group on medHist.\n\nJoin here: ${inviteData.link}\nUse Invite Code: ${inviteData.code}`;
      await navigator.clipboard.writeText(text);
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md relative">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-brand-blue-800">Invitation Ready</h2>
              <p className="text-sm text-slate-500 mt-1">
                Member added successfully. Share this code with {inviteData.name}.
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Invite Code Display */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Secret Invite Code</p>
                <div className="flex items-center justify-center gap-3">
                    <KeyIcon className="w-6 h-6 text-brand-blue-500" />
                    <span className="text-3xl font-mono font-bold text-slate-800 tracking-widest">{inviteData.code}</span>
                </div>
                <button 
                    onClick={handleCopyCode}
                    className="mt-3 text-sm text-brand-blue-600 hover:text-brand-blue-800 font-medium flex items-center justify-center gap-1 w-full"
                >
                   {copiedCode ? "Copied!" : (
                       <>
                        <ClipboardIcon className="w-4 h-4" /> Copy Code Only
                       </>
                   )}
                </button>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                <p className="text-sm text-blue-800">
                    <strong>Next Step:</strong> Ask {inviteData.name} to sign up and enter this code.
                </p>
            </div>

            <button
              onClick={handleCopyFullInvite}
              className="w-full flex justify-center items-center gap-2 bg-brand-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-opacity-75 transition"
            >
              {copiedFull ? (
                  "Copied to Clipboard!"
              ) : (
                  <>
                    <ClipboardIcon className="w-5 h-5" />
                    Copy Full Invitation Message
                  </>
              )}
            </button>
            <p className="text-xs text-center text-slate-400">Paste into WhatsApp, SMS, or any chat app.</p>
          </div>
        </div>
      </div>
    </div>
  );
};