import React from 'react';
import { StethoscopeIcon } from './icons/StethoscopeIcon';
import { UserIcon } from './icons/UserIcon';

interface HeaderProps {
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-slate-200">
      <div className="container mx-auto px-4 md:px-8 max-w-5xl">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-brand-blue-600 p-2 rounded-lg">
              <StethoscopeIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-brand-blue-800 tracking-tight">
              medHist
            </span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-slate-600 hover:text-brand-blue-600 font-semibold text-sm transition"
          >
            <UserIcon className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
};
