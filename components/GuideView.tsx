
import React from 'react';
import { Header } from './Header';
import { StethoscopeIcon } from './icons/StethoscopeIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { PillIcon } from './icons/PillIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ShareIcon } from './icons/ShareIcon';

interface GuideViewProps {
  onBack: () => void;
  user: { name: string };
  onLogout: () => void;
}

export const GuideView: React.FC<GuideViewProps> = ({ onBack, user, onLogout }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <Header onLogout={onLogout} userName={user.name} />
      
      <main className="container mx-auto p-4 md:p-8 max-w-4xl flex-grow pb-24">
        <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-brand-blue-600 mb-6 transition font-medium text-sm"
        >
            <ArrowLeftIcon className="w-4 h-4" /> Back to App
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-brand-blue-600 p-8 text-white text-center">
             <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <StethoscopeIcon className="w-10 h-10" />
             </div>
             <h1 className="text-3xl font-bold">Welcome to medHist</h1>
             <p className="text-blue-100 mt-2 max-w-lg mx-auto">
               Your family's clinical history, organized by AI and accessible anywhere.
             </p>
          </div>

          <div className="p-8 space-y-12">
            {/* Feature Grid */}
            <section>
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 bg-brand-blue-100 text-brand-blue-600 rounded-full flex items-center justify-center text-sm">1</span>
                    Core Features
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="bg-white p-2 rounded-lg shadow-sm h-fit"><ClipboardIcon className="w-5 h-5 text-brand-blue-600"/></div>
                        <div>
                            <h3 className="font-bold text-slate-800">AI Extraction</h3>
                            <p className="text-sm text-slate-500">Upload a PDF or Photo. AI reads the dates, doctors, and results for you.</p>
                        </div>
                    </div>
                    <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="bg-white p-2 rounded-lg shadow-sm h-fit"><PillIcon className="w-5 h-5 text-brand-blue-600"/></div>
                        <div>
                            <h3 className="font-bold text-slate-800">Medication Manager</h3>
                            <p className="text-sm text-slate-500">Track active pills and history. AI explains the purpose of each medicine.</p>
                        </div>
                    </div>
                    <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="bg-white p-2 rounded-lg shadow-sm h-fit"><UsersIcon className="w-5 h-5 text-brand-blue-600"/></div>
                        <div>
                            <h3 className="font-bold text-slate-800">Family Groups</h3>
                            <p className="text-sm text-slate-500">Invite family members with a secure code to manage history together.</p>
                        </div>
                    </div>
                    <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="bg-white p-2 rounded-lg shadow-sm h-fit"><ShareIcon className="w-5 h-5 text-brand-blue-600"/></div>
                        <div>
                            <h3 className="font-bold text-slate-800">Secure Sharing</h3>
                            <p className="text-sm text-slate-500">Generate 24-hour links to show your doctor specific reports on the go.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* User Case Section */}
            <section className="border-t border-slate-100 pt-12">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 bg-brand-blue-100 text-brand-blue-600 rounded-full flex items-center justify-center text-sm">2</span>
                    How people use medHist
                </h2>
                <div className="space-y-6">
                    <div className="p-6 bg-brand-blue-50 rounded-2xl border border-brand-blue-100">
                        <h3 className="font-bold text-brand-blue-800 mb-2">The Caretaker's Journey</h3>
                        <p className="text-sm text-brand-blue-700 leading-relaxed">
                            "I manage my elderly father's health. My siblings and I use the <strong>Family Invite Code</strong> to stay synced. When Dad sees his cardiologist, I upload the report. My sister in London can see the summary and the <strong>upcoming follow-up date</strong> on her dashboard immediately."
                        </p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-2">The Busy Parent</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            "My daughter has chronic allergies. I have folders full of papers. I uploaded them all to medHist. Now, I just search 'Allergy' to see her history. Before we see her specialist, I click <strong>'Download Brief'</strong> to give the doctor a perfect 1-page summary."
                        </p>
                    </div>
                </div>
            </section>

            {/* Tester Checklist */}
            <section className="border-t border-slate-100 pt-12 text-center max-w-md mx-auto">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Help us test!</h2>
                <ul className="text-left space-y-3 mb-8">
                    <li className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex-shrink-0 flex items-center justify-center">✅</div>
                        Install the app to your Home Screen
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex-shrink-0 flex items-center justify-center">✅</div>
                        Upload a PDF or Photo report
                    </li>
                    <li className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex-shrink-0 flex items-center justify-center">✅</div>
                        Ask the AI Assistant a question
                    </li>
                </ul>
                <button 
                    onClick={onBack}
                    className="w-full bg-brand-blue-600 text-white font-bold py-3 rounded-xl hover:bg-brand-blue-700 shadow-lg transition"
                >
                    Start Using medHist
                </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
