
import React from 'react';
import { TimelineItem } from './TimelineItem';
import type { TimelineEntry } from '../types';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface TimelineProps {
  entries: TimelineEntry[];
  onViewReport: (entry: TimelineEntry) => void;
  onDeleteReport: (entry: TimelineEntry) => void;
  onIgnoreMismatch: (entry: TimelineEntry) => void;
  selectedMemberName?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ entries, onViewReport, onDeleteReport, onIgnoreMismatch, selectedMemberName }) => {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 px-6 border-2 border-dashed border-slate-200 rounded-lg">
        <ClipboardIcon className="w-12 h-12 mx-auto text-slate-400" />
        <h3 className="mt-4 text-lg font-semibold text-slate-600">No Reports Yet</h3>
        <p className="mt-1 text-slate-500">Upload a medical report to start building this timeline.</p>
      </div>
    );
  }

  return (
    <div className="relative border-l-2 border-slate-200 ml-4 pl-8 md:ml-6 md:pl-12 py-4">
      {entries.map((entry) => (
        <TimelineItem 
          key={entry.id} 
          entry={entry} 
          onViewReport={onViewReport} 
          onDeleteReport={onDeleteReport}
          onIgnoreMismatch={onIgnoreMismatch}
          selectedMemberName={selectedMemberName}
        />
      ))}
    </div>
  );
};