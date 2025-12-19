
import React from 'react';
import { StethoscopeIcon } from './icons/StethoscopeIcon';
import { UserIcon } from './icons/UserIcon';
import { InstallAppButton } from './InstallAppButton';
import { HelpCircleIcon } from './icons/HelpCircleIcon';

interface HeaderProps {
  onLogout: () => void;
  userName: string;
  onOpenGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout, userName, onOpenGuide }) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-slate-200 safe-area-top">
      <div className="container mx-auto px-4 md:px-8 max-w-5xl">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={onOpenGuide}>
            <div className="bg-brand-blue-600 p-2 rounded-lg">
              <StethoscopeIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-brand-blue-800 tracking-tight">
              medHist
            </span>
          </div>
          
          <div className="flex items-center gap-1 md:gap-4">
             {/* Guide Link - Visible on mobile as icon, desktop as text */}
             <button 
                onClick={onOpenGuide}
                className="p-3 text-slate-400 hover:text-brand-blue-600 transition flex items-center gap-1 active:bg-slate-50 rounded-lg"
                title="How it works"
             >
                <HelpCircleIcon className="w-5 h-5" />
                <span className="hidden md:inline text-xs font-bold uppercase tracking-wider">How it works</span>
             </button>

             {/* Install Button appears here if available */}
             <InstallAppButton />

             <div className="h-6 w-px bg-slate-200 mx-1"></div>
             
             <button
                onClick={onLogout}
                className="flex items-center gap-2 text-slate-600 hover:text-brand-blue-600 font-semibold text-sm transition p-3 active:bg-slate-50 rounded-lg"
                aria-label="Log Out"
              >
                <UserIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
          </div>
        </div>
      </div>
    </header>
  );
};
