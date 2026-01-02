
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
      className="rounded-[2rem] border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative group cursor-pointer overflow-hidden text-left"
      onClick={onSelect}
    >
      {/* Edit Profile (Pencil) - Persistent & High Contrast */}
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        className="absolute top-4 right-4 p-2 text-rose-700 bg-white border border-rose-100 rounded-xl transition-all shadow-md z-20 hover:bg-rose-900 hover:text-white hover:scale-110 active:scale-95"
        title="Edit Profile"
      >
        <PencilIcon className="w-4 h-4" />
      </button>

      <div className="p-4 flex-grow">
        <div className="flex items-start gap-3 mb-4">
           {/* Scaled Icon Box */}
           <div className="p-3 rounded-xl bg-white text-rose-700 shadow-sm group-hover:bg-rose-900 group-hover:text-white transition-all duration-300 border border-white flex-shrink-0">
              <UserIcon className="w-6 h-6" />
           </div>
           <div className="min-w-0 pt-0.5">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-rose-700/60 mb-0.5 leading-none">
                  {isMe ? "Owner" : member.relationship} {age !== null && `• ${age} YRS`}
              </p>
              <h3 className="font-black text-rose-900 text-lg tracking-tighter leading-tight truncate">
                  {member.name}
              </h3>
           </div>
        </div>
        
        {/* Compact Stats */}
        <div className="space-y-2 mb-1">
            <div className="flex items-center gap-2.5 text-rose-900/40">
                <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                <span className="text-[10px] font-bold tracking-tight truncate">
                    {lastCheckupDate 
                        ? `Last Record: ${new Date(lastCheckupDate).toLocaleDateString()}` 
                        : "No reports uploaded"}
                </span>
            </div>
            
            <div className="flex items-center gap-2.5 text-rose-900/40">
                <PillIcon className="w-4 h-4 flex-shrink-0" />
                <span className="text-[10px] font-bold tracking-tight">
                    {medications.length} Active Meds
                </span>
            </div>
        </div>
      </div>

      {/* Action Footer - High Visibility */}
      <div className="px-5 py-3.5 bg-white/40 border-t border-rose-900/5 flex justify-between items-center mt-auto">
         <div className="flex gap-5">
             <button 
                onClick={(e) => { e.stopPropagation(); onManageMeds(); }}
                className="text-[9px] font-black uppercase tracking-widest text-rose-700 hover:text-rose-900 transition-colors py-1 underline decoration-rose-200 underline-offset-4"
             >
                Meds
             </button>
             <button 
                onClick={(e) => { e.stopPropagation(); onDownloadBrief(); }}
                disabled={isGeneratingPdf}
                className="text-[9px] font-black uppercase tracking-widest text-rose-700 hover:text-rose-900 transition-colors flex items-center gap-2 py-1 underline decoration-rose-200 underline-offset-4 disabled:opacity-50"
             >
                {isGeneratingPdf ? <SpinnerIcon className="w-3.5 h-3.5 animate-spin"/> : <DownloadIcon className="w-3.5 h-3.5" />}
                History
             </button>
         </div>
         <div className="p-2 bg-white rounded-full shadow-sm border border-rose-50 group-hover:bg-rose-900 group-hover:text-white transition-all duration-300">
            <ArrowRightIcon className="w-4 h-4 text-rose-700 group-hover:text-white transition" />
         </div>
      </div>
    </div>
  );
};
