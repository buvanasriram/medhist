
import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
            <div className="flex items-center space-x-3 group">
              {/* BRAND LOGO: THE SHIELD OF CARE */}
              <div className="relative">
                <svg viewBox="0 0 100 100" className="w-14 h-14 drop-shadow-sm transition-transform group-hover:scale-105">
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
              <span className="text-3xl font-light text-slate-800 tracking-tight">
                med<span className="font-black text-rose-800">Hist</span>
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-6 tracking-tight">{title}</h1>
            <p className="text-slate-400 font-medium mt-1">{subtitle}</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
            {children}
        </div>
      </div>
    </div>
  );
};
