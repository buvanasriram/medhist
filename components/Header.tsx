
import React, { useState, useRef, useEffect } from 'react';
import { HelpCircleIcon } from './icons/HelpCircleIcon';
import { InstallAppButton } from './InstallAppButton';

interface HeaderProps {
  onLogout: () => void;
  userName: string;
  onOpenGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout, userName, onOpenGuide }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userInitials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-slate-50 safe-area-top">
      <div className="container mx-auto px-6 h-16 max-w-5xl flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onOpenGuide}>
          <div className="flex items-center gap-2">
            {/* LOGO: THE SHIELD OF CARE (Approved Version) */}
            <div className="relative flex items-center">
              <svg viewBox="0 0 100 100" className="w-10 h-10 transition-transform group-hover:scale-110 drop-shadow-sm">
                <path 
                  d="M50 5 L85 15 V45 C85 75, 50 95, 50 95 C50 95, 15 75, 15 45 V15 L50 5" 
                  fill="none" 
                  stroke="#be123c" 
                  strokeWidth="3" 
                  strokeDasharray="4 4"
                  opacity="0.3"
                />
                <path 
                  d="M50 78 C 32 65, 22 52, 22 38 C 22 25, 38 22, 50 32 C 62 22, 78 25, 78 38 C 78 52, 68 65, 50 78" 
                  fill="#be123c"
                />
                <path 
                  d="M38 48 L45 48 L48 38 L52 58 L55 48 L62 48" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="4" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
                <text x="50" y="70" fontSize="10" fontWeight="900" fontFamily="sans-serif" textAnchor="middle" fill="white">mH</text>
              </svg>
            </div>
            <span className="text-xl font-light text-slate-800 tracking-tight ml-1">
              med<span className="font-black text-rose-800">Hist</span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
             <InstallAppButton />

             <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-rose-50 text-rose-700 border border-rose-100 font-black text-xs hover:bg-rose-100 transition shadow-sm"
                >
                    {userInitials}
                </button>

                {isMenuOpen && (
                    <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fadeIn">
                        <div className="px-4 py-2 mb-2 border-b border-slate-50 text-left">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Logged in as</p>
                            <p className="text-xs font-bold text-slate-800 truncate">{userName}</p>
                        </div>
                        <button 
                            onClick={() => { setIsMenuOpen(false); onOpenGuide?.(); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2 font-medium"
                        >
                            <HelpCircleIcon className="w-4 h-4" /> How it works
                        </button>
                        <button 
                            onClick={onLogout}
                            className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-slate-50 flex items-center gap-2 font-bold"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            Sign Out
                        </button>
                        <div className="mt-2 pt-2 border-t border-slate-50 px-4 pb-1">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] text-center">v1.4.0 Stable</p>
                        </div>
                    </div>
                )}
             </div>
          </div>
      </div>
    </header>
  );
};
