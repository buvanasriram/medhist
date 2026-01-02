
import React, { useState } from 'react';
import { UserIcon } from './icons/UserIcon';
import { UsersIcon } from './icons/UsersIcon';
import { PillIcon } from './icons/PillIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { BellIcon } from './icons/BellIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { StethoscopeIcon } from './icons/StethoscopeIcon';
import { SearchIcon } from './icons/SearchIcon';

const Logos = {
  ShieldOfCare: () => (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-sm">
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
      <div className="flex flex-col leading-none">
        <span className="text-xl font-light text-slate-800 tracking-tight">med<span className="font-black text-rose-800">Hist</span></span>
      </div>
    </div>
  )
};

export const MockupPreview: React.FC<{ onApprove: (logoIdx: number) => void }> = ({ onApprove }) => {
  const [currentView, setCurrentView] = useState<'board' | 'timeline' | 'guide'>('board');

  const members = [
    { name: 'Jaya', rel: 'Mom', palette: { bg: '#fff1f2', border: '#fda4af', text: '#be123c' } },
    { name: 'Nilesh', rel: 'Son', palette: { bg: '#f0f9ff', border: '#93c5fd', text: '#0369a1' } },
  ];

  const selectedMember = members[0];

  return (
    <div className="min-h-screen bg-white font-sans pb-32 text-left">
      {/* MOCKUP NAV OVERLAY */}
      <div className="bg-slate-900 text-white px-6 py-4 sticky top-0 z-[100] flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
              <h2 className="text-sm font-black tracking-tight uppercase tracking-widest text-rose-500">Proposal: Harmony v1.0</h2>
              <p className="text-slate-400 text-[10px] font-bold mt-0.5">Unified aesthetic across all application modules</p>
          </div>
          <div className="flex bg-white/10 p-1 rounded-2xl gap-1">
              {(['board', 'timeline', 'guide'] as const).map(view => (
                  <button 
                    key={view}
                    onClick={() => setCurrentView(view)}
                    className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentView === view ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                      {view === 'board' ? 'Board' : view === 'timeline' ? 'Timeline' : 'Guide'}
                  </button>
              ))}
          </div>
      </div>

      <header className="bg-white px-8 py-4 border-b border-slate-50 flex items-center justify-between sticky top-[92px] sm:top-[68px] z-50">
        <Logos.ShieldOfCare />
        <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center text-rose-700 font-black text-[10px] border border-rose-100">JD</div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-10">
        
        {/* VIEW: BOARD (Compact Dashboard) */}
        {currentView === 'board' && (
            <section className="animate-fadeIn">
                <div className="mb-10">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-3">Family Board</h2>
                    <p className="text-rose-700/40 text-[9px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
                        <UsersIcon className="w-4 h-4 text-rose-700" /> Vance Clinical Hub
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {members.map((m, i) => (
                        <div key={i} style={{ backgroundColor: m.palette.bg, borderColor: m.palette.border }} className="p-6 rounded-3xl border-2 flex flex-col gap-5 group cursor-pointer hover:shadow-xl transition-all duration-300">
                            <div className="flex items-start gap-4">
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-white">
                                    <UserIcon className="w-6 h-6 text-rose-700" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black text-rose-700/60 uppercase tracking-widest mb-1">{m.rel}</p>
                                    <h3 className="text-xl font-black text-rose-900 tracking-tight leading-tight">{m.name}</h3>
                                </div>
                            </div>
                            <div className="mt-2 pt-4 border-t border-rose-900/5 flex justify-between items-center">
                                <span className="text-[10px] font-black text-rose-700/30 uppercase tracking-widest">2 Meds • 4 Records</span>
                                <div className="p-1.5 bg-white/50 rounded-full group-hover:bg-white transition-colors">
                                    <ArrowRightIcon className="w-3.5 h-3.5 text-rose-700/20 group-hover:text-rose-700" />
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="border-2 border-dashed border-slate-200 p-6 rounded-3xl flex flex-col items-center justify-center gap-2 text-slate-300 hover:border-slate-300 transition-colors group cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                            <span className="text-2xl font-light">+</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">New Member</span>
                    </div>
                </div>
            </section>
        )}

        {/* VIEW: TIMELINE (Compact Record) */}
        {currentView === 'timeline' && (
            <section className="animate-fadeIn">
                <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-3">{selectedMember.name}'s History</h2>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Secure Chronological Record</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                         <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                         <input placeholder="Search medical history..." className="w-full bg-slate-50 border border-slate-100 py-3 pl-11 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all" />
                    </div>
                </div>

                <div className="space-y-4">
                    {[
                        { type: 'Cardiac Ultrasound', date: 'March 14, 2024', doctor: 'Dr. Hibbert', status: 'Follow-up' },
                        { type: 'Lipid Profile', date: 'Feb 28, 2024', doctor: 'City Lab', status: 'Normal' },
                        { type: 'General Consultation', date: 'Jan 10, 2024', doctor: 'Dr. Nick', status: 'Visit' },
                    ].map((entry, i) => (
                        <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between group cursor-pointer hover:shadow-lg transition-all border-l-4" style={{ borderLeftColor: i === 0 ? selectedMember.palette.text : '#f1f5f9' }}>
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-50 p-3 rounded-xl text-slate-300 group-hover:bg-rose-50 group-hover:text-rose-700 transition-colors">
                                    <DocumentIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h4 className="font-black text-slate-800 tracking-tight">{entry.type}</h4>
                                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-400 group-hover:bg-rose-100 group-hover:text-rose-800 tracking-widest">{entry.status}</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{entry.date} • {entry.doctor}</p>
                                </div>
                            </div>
                            <div className="pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="text-[9px] font-black uppercase tracking-widest text-rose-700">Open Record</button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        )}

        {/* VIEW: GUIDE (Compact Intelligence) */}
        {currentView === 'guide' && (
            <section className="animate-fadeIn">
                <div className="mb-14">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-3">Intelligence</h2>
                    <p className="text-rose-700/40 text-[9px] font-black uppercase tracking-[0.4em]">medHist Clinical Intelligence Center</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                        { title: 'AI OCR Extraction', desc: 'Converts complex PDFs & hand-written reports into searchable timeline data.', icon: <ClipboardIcon className="w-5 h-5" /> },
                        { title: 'Medication Logic', desc: 'Chronologically tracks every drug ever prescribed to any family member.', icon: <PillIcon className="w-5 h-5" /> },
                        { title: 'Family Sync', desc: 'Securely link spouse, children, and elderly parents to one unified board.', icon: <UsersIcon className="w-5 h-5" /> },
                        { title: 'Doctor Briefs', desc: 'Generate a 1-page professional summary for your next specialist visit.', icon: <StethoscopeIcon className="w-5 h-5" /> },
                    ].map((item, i) => (
                        <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-start gap-5 group hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                             <div className="bg-white p-4 rounded-2xl text-rose-700 shadow-sm border border-white group-hover:bg-rose-600 group-hover:text-white transition-all">
                                 {item.icon}
                             </div>
                             <div>
                                 <h4 className="text-lg font-black text-slate-900 tracking-tight mb-1">{item.title}</h4>
                                 <p className="text-[11px] text-slate-400 font-bold leading-relaxed">{item.desc}</p>
                             </div>
                        </div>
                    ))}
                </div>
            </section>
        )}
      </main>

      {/* FOOTER ACTION */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl text-white px-8 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-8 border border-white/10 animate-fadeIn z-[100]">
          <div className="border-r border-white/10 pr-8 hidden sm:block">
              <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 block mb-0.5">Design Strategy</span>
              <p className="text-xs font-bold">Harmony v1.0 • Stable</p>
          </div>
          <button 
            onClick={() => onApprove(1)} 
            className="bg-rose-600 hover:bg-rose-500 text-white font-black px-10 py-3.5 rounded-2xl text-[10px] uppercase tracking-[0.2em] transition shadow-lg shadow-rose-900/20 active:scale-95"
          >
              Apply Theme to App
          </button>
      </div>
    </div>
  );
};
