
import React from 'react';
import type { FamilyMember, Medication } from '../types';
import { UserIcon } from './icons/UserIcon';
import { PillIcon } from './icons/PillIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

interface MemberCardProps {
  member: FamilyMember;
  age: number | null;
  lastCheckupDate?: string;
  medications: Medication[];
  isMe: boolean;
  onSelect: () => void;
  onManageMeds: () => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member, age, lastCheckupDate, medications, isMe, onSelect, onManageMeds }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition duration-200 flex flex-col h-full">
      <div className="p-5 flex-grow cursor-pointer" onClick={onSelect}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
             <div className={`p-3 rounded-full ${isMe ? 'bg-brand-blue-100 text-brand-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                <UserIcon className="w-6 h-6" />
             </div>
             <div>
                <h3 className="font-bold text-slate-800 text-lg leading-tight">{member.name}</h3>
                <p className="text-sm text-slate-500 font-medium">
                    {isMe ? "Me" : member.relationship} {age !== null && `• ${age} yrs`}
                </p>
             </div>
          </div>
        </div>
        
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                <span>
                    {lastCheckupDate 
                        ? `Last Update: ${new Date(lastCheckupDate).toLocaleDateString()}` 
                        : "No reports yet"}
                </span>
            </div>
            
            <div className="flex items-start gap-2 text-sm text-slate-600">
                <PillIcon className="w-4 h-4 text-slate-400 mt-0.5" />
                <span className="line-clamp-2">
                    {medications.length > 0 
                        ? `${medications.length} Active Meds: ${medications.map(m => m.name).join(', ')}`
                        : "No active medications"}
                </span>
            </div>
        </div>
      </div>

      <div className="border-t border-slate-100 p-3 bg-slate-50 rounded-b-xl flex justify-between items-center">
         <button 
            onClick={onManageMeds}
            className="text-xs font-semibold text-slate-500 hover:text-brand-blue-600 px-2 py-1 rounded transition"
         >
            Manage Meds
         </button>
         <button 
            onClick={onSelect}
            className="text-xs font-bold text-brand-blue-600 hover:text-brand-blue-800 flex items-center gap-1 px-2 py-1 rounded transition"
         >
            Timeline <ArrowRightIcon className="w-3 h-3" />
         </button>
      </div>
    </div>
  );
};
