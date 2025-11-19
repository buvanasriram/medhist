import React, { useState } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { MailIcon } from './icons/MailIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface InviteSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteData: {
    name: string;
    email: string;
    link: string;
  } | null;
}

export const InviteSuccessModal: React.FC<InviteSuccessModalProps> = ({ isOpen, onClose, inviteData }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !inviteData) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteData.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent("Join our family medical timeline on medHist");
    const body = encodeURIComponent(`Hi ${inviteData.name},\n\nI've added you to our family group on medHist to share and manage medical records.\n\nYou can create an account and join here:\n${inviteData.link}\n\nBest regards`);
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
                Member added successfully. Share this link with {inviteData.name} to let them join.
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Invite Link
              </label>
              <div className="flex rounded-md shadow-sm">
                <input
                  type="text"
                  readOnly
                  value={inviteData.link}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-slate-300 bg-slate-50 text-sm text-slate-600 focus:ring-brand-blue-500 focus:border-brand-blue-500"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center px-3 py-2 border border-l-0 border-slate-300 rounded-r-md bg-slate-100 text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 text-sm font-medium transition"
                >
                  {copied ? (
                    <span className="text-green-600">Copied!</span>
                  ) : (
                    <ClipboardIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-800 mb-3">
                    <strong>Note:</strong> This link will point to your current app URL.
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