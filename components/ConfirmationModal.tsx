
import React from 'react';
import { WarningIcon } from './icons/WarningIcon';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md relative overflow-hidden border border-slate-100" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 mb-6 border border-red-100">
              <WarningIcon className="h-7 w-7 text-red-600" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-black leading-6 text-slate-900 tracking-tight" id="modal-title">
              {title}
            </h3>
            <div className="mt-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 p-6 flex flex-col sm:flex-row-reverse gap-3 border-t border-slate-100">
          <button
            type="button"
            className="inline-flex w-full justify-center rounded-2xl bg-red-600 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:bg-red-700 sm:w-auto transition active:scale-95"
            onClick={onConfirm}
          >
            Confirm Action
          </button>
          <button
            type="button"
            className="inline-flex w-full justify-center rounded-2xl bg-white px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 shadow-sm border border-slate-200 hover:bg-slate-100 sm:w-auto transition"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
