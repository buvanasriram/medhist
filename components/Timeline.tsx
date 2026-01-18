
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
  isShared?: boolean;
  isReadOnly?: boolean;
  themeColor?: string;
  isCompact?: boolean;
}

export const Timeline: React.FC<TimelineProps> = ({ 
    entries, onViewReport, onDeleteReport, onIgnoreMismatch, selectedMemberName, isShared, isReadOnly = false, themeColor, isCompact = false 
}) => {
  if (entries.length === 0) {
    return (
      <div className="text-center py-24 px-6 border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/30">
        <ClipboardIcon className="w-12 h-12 mx-auto text-slate-200 mb-6" />
        <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Records Found</h3>
        <p className="mt-2 text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">
          {isShared 
            ? "Shared archive is currently empty" 
            : "Upload clinical records to build this history"}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-${isCompact ? '2' : '4'}`}>
      {entries.map((entry) => (
        <TimelineItem 
          key={entry.id} 
          entry={entry} 
          onViewReport={onViewReport} 
          onDeleteReport={onDeleteReport}
          onIgnoreMismatch={onIgnoreMismatch}
          selectedMemberName={selectedMemberName}
          isReadOnly={isReadOnly}
          themeColor={themeColor}
          isCompact={isCompact}
        />
      ))}
    </div>
  );
};
