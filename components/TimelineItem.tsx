
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
import { PencilIcon } from './icons/PencilIcon';
import * as supabaseService from '../services/supabaseService';

interface TimelineItemProps {
  entry: TimelineEntry;
  onViewReport: (entry: TimelineEntry) => void;
  onEditReport: (entry: TimelineEntry) => void;
  onDeleteReport: (entry: TimelineEntry) => void;
  onIgnoreMismatch: (entry: TimelineEntry) => void;
  selectedMemberName?: string;
  isReadOnly?: boolean;
  themeColor?: string;
  isCompact?: boolean;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ 
    entry, onViewReport, onEditReport, onDeleteReport, onIgnoreMismatch, selectedMemberName, isReadOnly = false, themeColor = '#be123c', isCompact = false 
}) => {
  const [showSummary, setShowSummary] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const formattedDate = new Date(entry.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  const followUpDate = entry.follow_up_date ? new Date(entry.follow_up_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isUpcoming = followUpDate && followUpDate.getTime() >= today.getTime();

  const formattedFollowUp = followUpDate 
      ? followUpDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

  const isMismatched = !entry.mismatch_ignored &&
                       entry.patient_name && 
                       selectedMemberName && 
                       entry.patient_name.trim().toLowerCase() !== selectedMemberName.trim().toLowerCase();

  // Truncate long names to prevent internal hospital IDs from breaking the UI
  const cleanedPatientName = entry.patient_name && entry.patient_name.length > 25 
    ? entry.patient_name.substring(0, 25) + "..." 
    : entry.patient_name;

  const fileCount = (entry as any).files?.length || 1;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleToggleSummary = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isReadOnly) setShowSummary(!showSummary);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditReport(entry);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteReport(entry);
  };

  return (
    <div className={`${isCompact ? 'mb-2' : 'mb-4'} animate-fadeIn text-left transition-all duration-300 ${isReadOnly ? 'opacity-40 pointer-events-none' : ''}`}>
      <div 
        className={`bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/40 flex flex-col group cursor-pointer hover:border-slate-300 transition-all border-l-8 relative ${isCompact ? 'p-2.5 sm:p-3' : 'p-4'}`}
        style={{ borderLeftColor: themeColor }}
        onClick={() => !isReadOnly && onViewReport(entry)}
      >
        {/* Card Header: Layout refactored to ensure buttons are never hidden */}
        <div className="flex justify-between items-start gap-3 w-full">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-grow">
                <div 
                    className={`rounded-xl shadow-lg flex-shrink-0 transition-all duration-200 bg-slate-50 text-rose-700 group-hover:bg-rose-900 group-hover:text-white relative ${isCompact ? 'p-2' : 'p-3'}`}
                >
                    <DocumentIcon className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    {fileCount > 1 && (
                        <span className={`absolute -top-1 -right-1 bg-rose-700 text-white font-black flex items-center justify-center rounded-full border border-white ${isCompact ? 'w-3 h-3 text-[6px]' : 'w-4 h-4 text-[8px]'}`}>
                            {fileCount}
                        </span>
                    )}
                </div>
                
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <h4 className={`${isCompact ? 'text-[13px]' : 'text-sm sm:text-base'} font-black text-slate-900 tracking-tight leading-tight truncate max-w-[150px] sm:max-w-none`}>
                            {entry.report_type}
                        </h4>
                        {isUpcoming && (
                            <span className="text-[6px] sm:text-[7px] font-black uppercase px-1 py-0.5 rounded bg-rose-700 text-white tracking-[0.1em] shadow-sm">
                               Follow-up
                            </span>
                        )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight">
                        <span className="text-slate-900">{formattedDate}</span>
                        {entry.doctor_name && (
                            <span className="hidden sm:flex items-center gap-1">
                                <UserIcon className="w-2.5 h-2.5 text-slate-400"/> DR. {entry.doctor_name}
                            </span>
                        )}
                        {entry.facility_name && (
                            <span className="flex items-center gap-1 truncate max-w-[100px]">
                                <BuildingIcon className="w-2.5 h-2.5 text-slate-400"/> {entry.facility_name}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions: Always visible on the right */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 z-10">
                <button
                    onClick={handleToggleSummary}
                    className={`${isCompact ? 'p-1.5' : 'p-2'} bg-slate-50 text-slate-900 rounded-lg sm:rounded-xl border border-slate-100 shadow-sm hover:bg-rose-900 hover:text-white transition-all active:scale-90`}
                    title="Toggle Summary"
                    disabled={isReadOnly}
                >
                    {showSummary ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                </button>
                
                {!isReadOnly && (
                    <button
                        onClick={handleEdit}
                        className={`${isCompact ? 'p-1.5' : 'p-2'} bg-slate-50 text-slate-900 rounded-lg sm:rounded-xl border border-slate-100 shadow-sm hover:bg-rose-900 hover:text-white transition-all active:scale-90`}
                        title="Edit Record"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                )}

                {!isReadOnly && (
                    <button
                        onClick={handleDelete}
                        className={`${isCompact ? 'p-1.5' : 'p-2'} bg-slate-50 text-slate-300 hover:bg-red-700 hover:text-white rounded-lg sm:rounded-xl border border-slate-100 shadow-sm transition-all active:scale-90`}
                        title="Delete Record"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>

        {/* Mismatch Warning */}
        {isMismatched && (
            <div 
                className="mt-3 py-2 px-3 bg-amber-50 border border-amber-100 rounded-xl flex flex-wrap items-center justify-between gap-2 animate-fadeIn shadow-sm"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <WarningIcon className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span className="text-[7.5px] sm:text-[8.5px] font-black text-amber-800 uppercase tracking-widest leading-tight truncate">
                        Confirm Identity: {cleanedPatientName}
                    </span>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); onIgnoreMismatch(entry); }} 
                    className="text-[7px] font-black uppercase tracking-widest bg-amber-600 text-white px-2.5 py-1.5 rounded-lg shadow-md hover:bg-slate-900 transition-all active:scale-95"
                >
                    Link Meds
                </button>
            </div>
        )}

        {showSummary && (
            <div 
                className={`mt-4 p-4 rounded-2xl leading-relaxed shadow-inner border animate-fadeIn text-[10px] sm:text-[11px]`}
                style={{ 
                    backgroundColor: themeColor + '08', 
                    borderColor: themeColor + '15' 
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <p className="font-black uppercase tracking-[0.2em] mb-2 leading-none text-[8px]" style={{ color: themeColor }}>
                    AI Synthesis History
                </p>
                <div className="text-slate-900 font-bold whitespace-pre-wrap">
                    {entry.summary || "No clinical brief available."}
                </div>
                {formattedFollowUp && (
                    <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center gap-2">
                        <CalendarIcon className="w-3 h-3" style={{ color: themeColor }} />
                        <span className="font-black uppercase tracking-widest text-[9px]" style={{ color: themeColor }}>
                            {isUpcoming ? 'Scheduled Follow-up:' : 'Past Follow-up Date:'} {formattedFollowUp}
                        </span>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
