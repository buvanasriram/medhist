import React from 'react';
import type { TimelineEntry } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { UserIcon } from './icons/UserIcon';
import { BuildingIcon } from './icons/BuildingIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { TrashIcon } from './icons/TrashIcon';
import { WarningIcon } from './icons/WarningIcon';

interface TimelineItemProps {
  entry: TimelineEntry;
  onViewReport: (entry: TimelineEntry) => void;
  onDeleteReport: (entry: TimelineEntry) => void;
  onIgnoreMismatch: (entry: TimelineEntry) => void;
  selectedMemberName?: string;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ entry, onViewReport, onDeleteReport, onIgnoreMismatch, selectedMemberName }) => {
  const formattedDate = new Date(entry.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isMismatched = !entry.mismatch_ignored &&
                       entry.patient_name && 
                       selectedMemberName && 
                       entry.patient_name.trim().toLowerCase() !== selectedMemberName.trim().toLowerCase();

  return (
    <div className="mb-10">
      <div className="absolute -left-5 bg-brand-blue-600 h-9 w-9 rounded-full flex items-center justify-center ring-8 ring-white">
        <DocumentIcon className="w-5 h-5 text-white" />
      </div>
      <div className="pl-4">
        <div className="mb-2">
          <h3 className="text-lg font-bold text-slate-800">{entry.report_type}</h3>
        </div>

        {isMismatched && (
            <div className="mb-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-md flex items-start gap-3">
                <WarningIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-grow">
                    <p className="font-semibold text-yellow-800">Potential Mismatch Detected</p>
                    <p className="text-sm text-yellow-700">
                        This report lists the patient as <span className="font-bold">{entry.patient_name}</span>, but it was uploaded to <span className="font-bold">{selectedMemberName}'s</span> timeline.
                    </p>
                    <div className="mt-2">
                      <button 
                        onClick={() => onIgnoreMismatch(entry)} 
                        className="text-sm font-semibold text-yellow-800 hover:text-yellow-900 underline focus:outline-none"
                      >
                        Ignore (name is correct)
                      </button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 mb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <time className="font-medium">{formattedDate}</time>
          </div>
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
        </div>

        <p className="text-slate-600 leading-relaxed mb-4">{entry.summary}</p>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => onViewReport(entry)}
            className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500 transition"
          >
            View Report
          </button>
          <button
            onClick={() => onDeleteReport(entry)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
            aria-label="Delete report"
          >
            <TrashIcon className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};