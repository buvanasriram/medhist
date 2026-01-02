
import React from 'react';
import type { FamilyMember, Medication } from '../types';
import { UserIcon } from './icons/UserIcon';
import { PillIcon } from './icons/PillIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { PencilIcon } from './icons/PencilIcon';

interface MemberCardProps {
  member: FamilyMember;
  age: number | null;
  lastCheckupDate?: string;
  medications: Medication[];
  isMe: boolean;
  isGeneratingPdf?: boolean;
  onSelect: () => void;
  onManageMeds: () => void;
  onDownloadBrief: () => void;
  onEdit: () => void;
  backgroundColor?: string;
  borderColor?: string;
}

export const MemberCard: React.FC<MemberCardProps> = ({ 
    member, age, lastCheckupDate, medications, isMe, isGeneratingPdf, 
    onSelect, onManageMeds, onDownloadBrief, onEdit,
    backgroundColor = '#f8fafc',
    borderColor = '#e2e8f0'
}) => {
  return (
    <div 
      style={{ backgroundColor, borderColor }}
      className="rounded-3xl border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative group cursor-pointer overflow-hidden text-left"
      onClick={onSelect}
    >
      {/* Edit Profile (Pencil) - Floating UI */}
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        className="absolute top-3 right-3 p-1.5 text-rose-700 bg-white/80 backdrop-blur-sm border border-rose-100 rounded-lg transition-all shadow-sm z-20 hover:bg-rose-900 hover:text-white hover:scale-110 active:scale-95"
        title="Edit Profile"
      >
        <PencilIcon className="w-3.5 h-3.5" />
      </button>

      <div className="p-3.5 flex-grow">
        <div className="flex items-start gap-3 mb-2.5">
           {/* Compact Icon Box */}
           <div className="p-2.5 rounded-xl bg-white text-rose-700 shadow-sm group-hover:bg-rose-900 group-hover:text-white transition-all duration-300 border border-white flex-shrink-0">
              <UserIcon className="w-5 h-5" />
           </div>
           <div className="min-w-0">
              <p className="text-[7px] font-black uppercase tracking-[0.2em] text-rose-700/60 mb-0 leading-none">
                  {isMe ? "Primary Owner" : member.relationship} {age !== null && `• ${age} Yrs`}
              </p>
              <h3 className="font-black text-rose-900 text-base tracking-tighter leading-tight truncate">
                  {member.name}
              </h3>
           </div>
        </div>
        
        {/* High Density Stats Row */}
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-rose-900/40">
                <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                <span className="text-[9px] font-bold tracking-tight truncate">
                    {lastCheckupDate 
                        ? `${new Date(lastCheckupDate).toLocaleDateString()}` 
                        : "No reports yet"}
                </span>
            </div>
            
            <div className="flex items-center gap-2 text-rose-900/40">
                <PillIcon className="w-3 h-3 flex-shrink-0" />
                <span className="text-[9px] font-bold tracking-tight">
                    {medications.length} Active Protocols
                </span>
            </div>
        </div>
      </div>

      {/* Compressed Action Footer */}
      <div className="px-4 py-2 bg-white/40 border-t border-rose-900/5 flex justify-between items-center mt-auto">
         <div className="flex gap-4">
             <button 
                onClick={(e) => { e.stopPropagation(); onManageMeds(); }}
                className="text-[8px] font-black uppercase tracking-widest text-rose-700 hover:text-rose-900 transition-colors underline decoration-rose-200 underline-offset-2"
             >
                Meds
             </button>
             <button 
                onClick={(e) => { e.stopPropagation(); onDownloadBrief(); }}
                disabled={isGeneratingPdf}
                className="text-[8px] font-black uppercase tracking-widest text-rose-700 hover:text-rose-900 transition-colors flex items-center gap-1.5 underline decoration-rose-200 underline-offset-2 disabled:opacity-50"
             >
                {isGeneratingPdf ? <SpinnerIcon className="w-3 h-3 animate-spin"/> : <DownloadIcon className="w-3 h-3" />}
                Brief
             </button>
         </div>
         <div className="p-1.5 bg-white rounded-full shadow-sm border border-rose-50 group-hover:bg-rose-900 group-hover:text-white transition-all duration-300">
            <ArrowRightIcon className="w-3 h-3 text-rose-700 group-hover:text-white transition" />
         </div>
      </div>
    </div>
  );
};
