
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
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ entry, onViewReport, onDeleteReport, onIgnoreMismatch, selectedMemberName, isReadOnly = false }) => {
  const [showSummary, setShowSummary] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const formattedDate = new Date(entry.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const formattedFollowUp = entry.follow_up_date 
      ? new Date(entry.follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

  const isMismatched = !entry.mismatch_ignored &&
                       entry.patient_name && 
                       selectedMemberName && 
                       entry.patient_name.trim().toLowerCase() !== selectedMemberName.trim().toLowerCase();

  const summaryText = entry.summary || "No summary available for this report.";

  const handleShare = async () => {
    setIsSharing(true);
    setShareFeedback(null);
    try {
        const link = await supabaseService.createShareLink(entry.id);
        if (link) {
            await navigator.clipboard.writeText(link);
            setShareFeedback("Secure link copied to clipboard! Paste it in a message to share.");
            // Clear message after 4 seconds
            setTimeout(() => setShareFeedback(null), 4000);
        } else {
            setShareFeedback("Failed to generate link.");
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
    <div className="mb-10">
      <div className="absolute -left-5 bg-brand-blue-600 h-9 w-9 rounded-full flex items-center justify-center ring-8 ring-white">
        <DocumentIcon className="w-5 h-5 text-white" />
      </div>
      <div className="pl-4">
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <h3 className="text-lg font-bold text-slate-800">{entry.report_type}</h3>
          <span className="text-sm font-bold text-slate-800">{formattedDate}</span>
        </div>
        
        {/* Next Appointment Badge */}
        {formattedFollowUp && (
            <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 bg-brand-green-50 text-brand-green-700 rounded-full border border-brand-green-100 text-xs font-semibold">
                <CalendarIcon className="w-3.5 h-3.5" />
                Next Visit: {formattedFollowUp}
            </div>
        )}

        {isMismatched && (
            <div className="mb-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-md flex items-start gap-3">
                <WarningIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-grow">
                    <p className="font-semibold text-yellow-800">Potential Mismatch Detected</p>
                    <p className="text-sm text-yellow-700">
                        This report lists the patient as <span className="font-bold">{entry.patient_name}</span>, but it was uploaded to <span className="font-bold">{selectedMemberName}'s</span> timeline.
                    </p>
                    {!isReadOnly && (
                        <div className="mt-2">
                        <button 
                            onClick={() => onIgnoreMismatch(entry)} 
                            className="text-sm font-semibold text-yellow-800 hover:text-yellow-900 underline focus:outline-none"
                        >
                            Ignore (name is correct)
                        </button>
                        </div>
                    )}
                </div>
            </div>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 mb-3">
          {entry.patient_name && (
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-slate-400" />
              <span className="font-medium">{entry.patient_name}</span>
            </div>
          )}
          {entry.doctor_name && (
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-slate-400" />
              <span className="font-medium">Dr. {entry.doctor_name}</span>
            </div>
          )}
          {entry.facility_name && (
            <div className="flex items-center gap-2">
              <BuildingIcon className="w-4 h-4 text-slate-400" />
              <span className="font-medium">{entry.facility_name}</span>
            </div>
          )}

          <button
            onClick={() => setShowSummary(!showSummary)}
            className="flex items-center gap-1 font-medium text-brand-blue-600 hover:text-brand-blue-800 focus:outline-none transition-colors"
          >
            {showSummary ? (
                <>
                    Hide Summary <ChevronUpIcon className="w-4 h-4" />
                </>
            ) : (
                <>
                    Show Summary <ChevronDownIcon className="w-4 h-4" />
                </>
            )}
          </button>
        </div>

        {showSummary && (
             <div className="mb-4 p-3 bg-slate-50 rounded-md border border-slate-100 text-slate-600 text-sm leading-relaxed animate-fadeIn">
                 {summaryText}
             </div>
        )}
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => onViewReport(entry)}
            className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition"
          >
            View Report
          </button>
          
          <div className="relative">
            <button
                onClick={handleShare}
                disabled={isSharing}
                className={`inline-flex items-center gap-2 px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition disabled:opacity-50 ${
                    shareFeedback 
                    ? 'border-green-500 text-green-700 bg-green-50' 
                    : 'border-slate-300 text-brand-blue-700 bg-white hover:bg-brand-blue-50'
                }`}
                title="Create a 24-hour secure link for your doctor"
            >
                <ShareIcon className="w-4 h-4" />
                {isSharing ? "Link..." : shareFeedback ? "Copied!" : "Share"}
            </button>
            
            {shareFeedback && (
                <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-56 p-2 bg-slate-800 text-white text-xs text-center rounded shadow-lg z-10 animate-fadeIn">
                    {shareFeedback}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
            )}
          </div>

          {!isReadOnly && (
              <button
                onClick={() => onDeleteReport(entry)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
                aria-label="Delete report"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
          )}
        </div>
      </div>
    </div>
  );
};
