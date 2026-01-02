
import React, { useState } from 'react';
import type { TimelineEntry } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { UserIcon } from './icons/UserIcon';
import { BuildingIcon } from './icons/BuildingIcon';
import { TrashIcon } from './icons/TrashIcon';
import { WarningIcon } from './icons/WarningIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronUpIcon } from './icons/ChevronUpIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { ShareIcon } from './icons/ShareIcon';
import * as supabaseService from '../services/supabaseService';

interface TimelineItemProps {
  entry: TimelineEntry;
  onViewReport: (entry: TimelineEntry) => void;
  onDeleteReport: (entry: TimelineEntry) => void;
  onIgnoreMismatch: (entry: TimelineEntry) => void;
  selectedMemberName?: string;
  isReadOnly?: boolean;
  themeColor?: string;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ 
    entry, onViewReport, onDeleteReport, onIgnoreMismatch, selectedMemberName, isReadOnly = false, themeColor = '#be123c' 
}) => {
  const [showSummary, setShowSummary] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const formattedDate = new Date(entry.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  const formattedFollowUp = entry.follow_up_date 
      ? new Date(entry.follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

  const isMismatched = !entry.mismatch_ignored &&
                       entry.patient_name && 
                       selectedMemberName && 
                       entry.patient_name.trim().toLowerCase() !== selectedMemberName.trim().toLowerCase();

  const handleShare = async () => {
    setIsSharing(true);
    setShareFeedback(null);
    try {
        const link = await supabaseService.createShareLink(entry.id);
        if (link) {
            await navigator.clipboard.writeText(link);
            setShareFeedback("Secure link copied!");
            setTimeout(() => setShareFeedback(null), 3000);
        }
    } catch (error) {
        console.error(error);
        setShareFeedback("Error creating link.");
        setTimeout(() => setShareFeedback(null), 3000);
    } finally {
        setIsSharing(false);
    }
  };

  return (
    <div className="mb-4 animate-fadeIn text-left">
      <div 
        className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xl shadow-slate-200/40 flex flex-col sm:flex-row justify-between items-start sm:items-center group cursor-pointer hover:border-slate-300 transition-all border-l-8 relative"
        style={{ borderLeftColor: themeColor }}
        onClick={() => onViewReport(entry)}
      >
        <div className="flex items-center gap-4 w-full">
            {/* Folder Icon - Harmony v1.0 Dual Hover */}
            <div 
                className="p-3 rounded-xl shadow-lg flex-shrink-0 transition-all duration-200 bg-slate-50 text-rose-700 group-hover:bg-rose-900 group-hover:text-white"
            >
                <DocumentIcon className="w-5 h-5" />
            </div>
            
            <div className="min-w-0 flex-grow">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight truncate">
                        {entry.report_type}
                    </h4>
                    {formattedFollowUp && (
                        <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-700 text-white tracking-[0.1em] shadow-sm">
                           Follow-up
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    <span className="text-slate-900 font-black">{formattedDate}</span>
                    {entry.doctor_name && <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5 text-slate-900"/> DR. {entry.doctor_name}</span>}
                    {entry.facility_name && <span className="flex items-center gap-1"><BuildingIcon className="w-3.5 h-3.5 text-slate-900"/> {entry.facility_name}</span>}
                </div>
            </div>
        </div>

        {/* Action Tray - Rose High Contrast */}
        <div className="flex items-center gap-3 mt-4 sm:mt-0 ml-auto sm:ml-4 flex-shrink-0">
            <button
                onClick={(e) => { e.stopPropagation(); setShowSummary(!showSummary); }}
                className="p-2.5 bg-slate-50 text-slate-900 rounded-xl shadow-sm hover:bg-rose-900 hover:text-white transition-all duration-200 active:scale-90"
                title="Toggle Summary"
            >
                {showSummary ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            </button>
            
            <div className="relative">
                <button
                    onClick={(e) => { e.stopPropagation(); handleShare(); }}
                    disabled={isSharing}
                    className="p-2.5 bg-slate-50 text-slate-900 rounded-xl shadow-sm hover:bg-rose-900 hover:text-white transition-all duration-200 active:scale-90 disabled:opacity-50"
                    title="Share Record"
                >
                    <ShareIcon className="w-4 h-4" />
                </button>
                {shareFeedback && (
                    <div className="absolute right-0 bottom-full mb-2 bg-slate-900 text-white text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-xl whitespace-nowrap z-30">
                        {shareFeedback}
                    </div>
                )}
            </div>

            {!isReadOnly && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDeleteReport(entry); }}
                    className="p-2.5 bg-slate-50 text-slate-900 rounded-xl shadow-sm hover:bg-red-700 hover:text-white transition-all duration-200 active:scale-90"
                    title="Delete Record"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            )}
        </div>
      </div>

      {/* Expanded Pastel Area */}
      {(showSummary || isMismatched) && (
          <div className="mt-2 mx-3 space-y-2">
            {isMismatched && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 shadow-sm">
                    <WarningIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-0.5 leading-none">Identity Check</p>
                        <p className="text-[10px] font-black text-slate-900 leading-tight">
                            Patient <span className="underline">{entry.patient_name}</span> mismatch detected.
                        </p>
                        {!isReadOnly && (
                            <button 
                                onClick={() => onIgnoreMismatch(entry)} 
                                className="mt-1.5 text-[8px] font-black uppercase tracking-widest text-amber-900 hover:text-rose-700 underline underline-offset-2"
                            >
                                Validate
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            {showSummary && (
                <div 
                    className="p-5 rounded-2xl text-[10px] sm:text-[11px] leading-relaxed shadow-lg border-2"
                    style={{ 
                        backgroundColor: themeColor + '10', 
                        borderColor: themeColor + '30' 
                    }}
                >
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-2 leading-none" style={{ color: themeColor }}>
                        AI Synthesis History
                    </p>
                    <div className="text-slate-900 font-bold">
                        {entry.summary || "No clinical brief available."}
                    </div>
                    {formattedFollowUp && (
                        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2">
                            <CalendarIcon className="w-3.5 h-3.5" style={{ color: themeColor }} />
                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: themeColor }}>
                                Scheduled Follow-up: {formattedFollowUp}
                            </span>
                        </div>
                    )}
                </div>
            )}
          </div>
      )}
    </div>
  );
};
