import React from 'react';
import { StethoscopeIcon } from '../icons/StethoscopeIcon';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="bg-brand-blue-600 p-3 rounded-xl">
                <StethoscopeIcon className="w-8 h-8 text-white" />
              </div>
              <span className="text-3xl font-bold text-brand-blue-800 tracking-tight">
                medHist
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-6">{title}</h1>
            <p className="text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200">
            {children}
        </div>
      </div>
    </div>
  );
};
