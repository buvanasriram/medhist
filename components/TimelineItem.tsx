
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
  isCompact?: boolean;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ 
    entry, onViewReport, onDeleteReport, onIgnoreMismatch, selectedMemberName, isReadOnly = false, themeColor = '#be123c', isCompact = false 
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
        <div className={`flex flex-col sm:flex-row justify-between items-start ${isCompact ? 'sm:items-center' : 'sm:items-center'} gap-2 sm:gap-4`}>
            <div className="flex items-center gap-3 sm:gap-4 w-full min-w-0">
                {/* Folder Icon */}
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
                
                <div className="min-w-0 flex-grow">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <h4 className={`${isCompact ? 'text-[13px] sm:text-sm' : 'text-sm sm:text-base'} font-black text-slate-900 tracking-tight leading-tight truncate`}>
                            {entry.report_type}
                        </h4>
                        {fileCount > 1 && !isCompact && (
                            <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 tracking-[0.1em] shadow-sm">
                               {fileCount} Pages
                            </span>
                        )}
                        {isUpcoming && (
                            <span className={`${isCompact ? 'text-[6px] px-1' : 'text-[7px] px-1.5'} font-black uppercase py-0.5 rounded bg-rose-700 text-white tracking-[0.1em] shadow-sm`}>
                               Follow-up
                            </span>
                        )}
                    </div>
                    
                    {isCompact ? (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
                            <span className="text-slate-900">{formattedDate}</span>
                            {entry.doctor_name && (
                                <span className="flex items-center gap-1">
                                    <UserIcon className="w-2.5 h-2.5 text-slate-400"/> 
                                    <span className="truncate max-w-[80px]">DR. {entry.doctor_name}</span>
                                </span>
                            )}
                            {entry.facility_name && (
                                <span className="flex items-center gap-1">
                                    <BuildingIcon className="w-2.5 h-2.5 text-slate-400"/> 
                                    <span className="truncate max-w-[80px]">{entry.facility_name}</span>
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                            <span className="text-slate-900 font-black">{formattedDate}</span>
                            {entry.doctor_name && <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5 text-slate-900"/> DR. {entry.doctor_name}</span>}
                            {entry.facility_name && <span className="flex items-center gap-1"><BuildingIcon className="w-3.5 h-3.5 text-slate-900"/> {entry.facility_name}</span>}
                        </div>
                    )}

                    {/* Name Mismatch Warning Integrated in Card */}
                    {isMismatched && (
                        <div 
                            className={`mt-2 py-1 px-2 bg-amber-50 border border-amber-100 rounded-lg inline-flex items-center gap-1.5 animate-pulse shadow-sm ${isCompact ? 'scale-90 origin-left' : ''}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <WarningIcon className="w-3 h-3 text-amber-600" />
                            <span className="text-[7px] sm:text-[8px] font-black text-amber-700 uppercase tracking-widest whitespace-nowrap">
                                Name mismatch: {entry.patient_name}
                            </span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onIgnoreMismatch(entry); }} 
                                className="text-[7px] font-black uppercase tracking-widest bg-amber-600 text-white px-2 py-0.5 rounded shadow hover:bg-slate-900 transition-colors"
                            >
                                Confirm
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Tray */}
            <div className={`flex items-center gap-2 flex-shrink-0 ${isCompact ? 'ml-auto mt-0' : 'mt-1 sm:mt-0 ml-auto sm:ml-4'}`}>
                <button
                    onClick={handleToggleSummary}
                    className={`${isCompact ? 'p-1.5' : 'p-2.5'} bg-slate-50 text-slate-900 rounded-xl shadow-sm hover:bg-rose-900 hover:text-white transition-all duration-200 active:scale-90`}
                    title="Toggle Summary"
                    disabled={isReadOnly}
                >
                    {showSummary ? <ChevronUpIcon className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} /> : <ChevronDownIcon className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />}
                </button>
                
                <div className="relative">
                    <button
                        onClick={handleShare}
                        disabled={isSharing || isReadOnly}
                        className={`${isCompact ? 'p-1.5' : 'p-2.5'} bg-slate-50 text-slate-900 rounded-xl shadow-sm hover:bg-rose-900 hover:text-white transition-all duration-200 active:scale-90 disabled:opacity-50`}
                        title="Share Record"
                    >
                        <ShareIcon className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                    </button>
                    {shareFeedback && (
                        <div className="absolute right-0 bottom-full mb-2 bg-slate-900 text-white text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-xl whitespace-nowrap z-30">
                            {shareFeedback}
                        </div>
                    )}
                </div>

                {!isReadOnly && (
                    <button
                        onClick={handleDelete}
                        className={`${isCompact ? 'p-1.5' : 'p-2.5'} bg-slate-50 text-slate-900 rounded-xl shadow-sm hover:bg-red-700 hover:text-white transition-all duration-200 active:scale-90`}
                        title="Delete Record"
                    >
                        <TrashIcon className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                    </button>
                )}
            </div>
        </div>

        {/* AI Synthesis Summary */}
        {showSummary && (
            <div 
                className={`mt-3 p-4 rounded-2xl leading-relaxed shadow-inner border animate-fadeIn ${isCompact ? 'p-3 text-[9px]' : 'p-5 text-[10px] sm:text-[11px]'}`}
                style={{ 
                    backgroundColor: themeColor + '08', 
                    borderColor: themeColor + '15' 
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <p className={`font-black uppercase tracking-[0.2em] mb-2 leading-none ${isCompact ? 'text-[7px]' : 'text-[8px]'}`} style={{ color: themeColor }}>
                    AI Synthesis History
                </p>
                <div className="text-slate-900 font-bold whitespace-pre-wrap">
                    {entry.summary || "No clinical brief available."}
                </div>
                {formattedFollowUp && (
                    <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center gap-2">
                        <CalendarIcon className="w-3 h-3" style={{ color: themeColor }} />
                        <span className={`font-black uppercase tracking-widest ${isCompact ? 'text-[7.5px]' : 'text-[9px]'}`} style={{ color: themeColor }}>
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
