
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
    <div className="min-h-screen bg-white text-slate-800 flex flex-col text-left">
      <Header onLogout={onLogout} userName={user.name} />
      
      <main className="container mx-auto p-4 sm:p-6 md:p-12 max-w-5xl flex-grow pb-24">
        <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-900 hover:text-rose-700 mb-12 transition font-black text-[10px] uppercase tracking-[0.3em]"
        >
            <ArrowLeftIcon className="w-5 h-5" /> Back to Entry
        </button>

        <div className="mb-16">
            <h1 className="text-xl font-light text-slate-800 tracking-tight flex items-center gap-2 flex-wrap">
              <span>med<span className="font-black text-rose-800">Hist</span></span>
              <span className="h-4 w-px bg-slate-200 mx-2 hidden sm:block"></span>
              <span className="text-slate-400 font-medium">AI Powered Clinical Intelligence Center</span>
            </h1>
            <div className="h-1 w-12 bg-rose-700 rounded-full mt-4"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            {[
                { 
                    title: 'AI OCR Extraction', 
                    desc: 'Converts complex PDFs, hospital discharge summaries, and hand-written blood reports into searchable clinical data points.', 
                    icon: <ClipboardIcon className="w-6 h-6" /> 
                },
                { 
                    title: 'Medication Logic', 
                    desc: 'Chronologically tracks every drug prescribed. AI infers the clinical purpose even when not explicitly stated in the notes.', 
                    icon: <PillIcon className="w-6 h-6" /> 
                },
                { 
                    title: 'Family Care Circles', 
                    desc: 'Securely link spouse, children, and elderly parents. Shared members can see upcoming follow-up directives on their own dashboard.', 
                    icon: <UsersIcon className="w-6 h-6" /> 
                },
                { 
                    title: 'Clinical History', 
                    desc: 'Generate a high-density professional summary for your next specialist visit. Syncs current meds and the last 15 reports.', 
                    icon: <ShareIcon className="w-6 h-6" /> 
                },
            ].map((item, i) => (
                <div key={i} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 flex items-start gap-6 group hover:bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
                     <div className="bg-slate-900 p-5 rounded-2xl text-white shadow-xl group-hover:bg-rose-700 transition-all flex-shrink-0">
                         {item.icon}
                     </div>
                     <div>
                         <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2 leading-none">{item.title}</h4>
                         <p className="text-[11px] text-slate-500 font-bold leading-relaxed">{item.desc}</p>
                     </div>
                </div>
            ))}
        </div>

        {/* High contrast section */}
        <section className="border-t-2 border-slate-900 pt-16">
            <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] mb-10 leading-none">Deployment Scenarios</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                <div className="space-y-4">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">The Caretaker</h3>
                    <p className="text-xs text-slate-600 font-bold leading-relaxed">
                        Manage elderly parents health collectively. Invite siblings via the <strong>Family Invite Code</strong>. When one sibling uploads a cardiology report, everyone sees the AI summary and the next appointment countdown.
                    </p>
                </div>
                <div className="space-y-4">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">The Chronic Patient</h3>
                    <p className="text-xs text-slate-600 font-bold leading-relaxed">
                        Ask the <strong>AI Health Assistant</strong> specific questions: "When was my last lisinopril adjustment?" The assistant finds the specific discharge memo and highlights the doctor's specific advice instantly.
                    </p>
                </div>
            </div>
        </section>

        <div className="mt-24 text-center">
            <button 
                onClick={onBack}
                className="inline-flex items-center gap-4 bg-slate-900 text-white font-black px-12 py-5 rounded-3xl shadow-2xl hover:bg-rose-700 transition active:scale-95 text-[11px] uppercase tracking-[0.3em]"
            >
                <StethoscopeIcon className="w-5 h-5" /> START USING medHIST
            </button>
        </div>
      </main>

      <footer className="py-16 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.5em] mt-auto">
          medHist Precision • v0.9.9
      </footer>
    </div>
  );
};
