
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
    <div className={`mb-4 animate-fadeIn text-left transition-all duration-300 ${isReadOnly ? 'opacity-40 pointer-events-none' : ''}`}>
      <div 
        className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xl shadow-slate-200/40 flex flex-col group cursor-pointer hover:border-slate-300 transition-all border-l-8 relative"
        style={{ borderLeftColor: themeColor }}
        onClick={() => !isReadOnly && onViewReport(entry)}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 w-full">
                {/* Folder Icon */}
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

                    {/* Name Mismatch Warning Integrated in Card */}
                    {isMismatched && (
                        <div 
                            className="mt-3 py-1.5 px-3 bg-amber-50 border border-amber-100 rounded-lg inline-flex items-center gap-2 animate-pulse shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <WarningIcon className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">
                                Name Mismatch: <span className="underline decoration-amber-300">{entry.patient_name}</span>
                            </span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onIgnoreMismatch(entry); }} 
                                className="ml-2 text-[8px] font-black uppercase tracking-widest bg-amber-600 text-white px-3 py-1 rounded shadow hover:bg-slate-900 transition-colors"
                            >
                                Folder is Correct
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Tray */}
            <div className="flex items-center gap-3 mt-2 sm:mt-0 ml-auto sm:ml-4 flex-shrink-0">
                <button
                    onClick={(e) => { e.stopPropagation(); !isReadOnly && setShowSummary(!showSummary); }}
                    className="p-2.5 bg-slate-50 text-slate-900 rounded-xl shadow-sm hover:bg-rose-900 hover:text-white transition-all duration-200 active:scale-90"
                    title="Toggle Summary"
                    disabled={isReadOnly}
                >
                    {showSummary ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                </button>
                
                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); !isReadOnly && handleShare(); }}
                        disabled={isSharing || isReadOnly}
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

        {/* AI Synthesis Summary */}
        {showSummary && (
            <div 
                className="mt-4 p-5 rounded-2xl text-[10px] sm:text-[11px] leading-relaxed shadow-inner border"
                style={{ 
                    backgroundColor: themeColor + '08', 
                    borderColor: themeColor + '15' 
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-2 leading-none" style={{ color: themeColor }}>
                    AI Synthesis History
                </p>
                <div className="text-slate-900 font-bold">
                    {entry.summary || "No clinical brief available."}
                </div>
                {formattedFollowUp && (
                    <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5" style={{ color: themeColor }} />
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: themeColor }}>
                            Scheduled Follow-up: {formattedFollowUp}
                        </span>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
