
import React, { useState, useMemo, useCallback } from 'react';
import { Header } from './Header';
import { Timeline } from './Timeline';
import { UploadModal } from './UploadModal';
import { ConfirmationModal } from './ConfirmationModal';
import { EditTimelineEntryModal } from './EditTimelineEntryModal';
import { extractReportInfo } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { generateDoctorBrief } from '../utils/pdfGenerator';
import * as supabaseService from '../services/supabaseService';
import type { FamilyMember, TimelineEntry, User, ReportFile, Medication } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { StethoscopeIcon } from './icons/StethoscopeIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { DownloadIcon } from './icons/DownloadIcon'; 
import { SearchIcon } from './icons/SearchIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { GridIcon } from './icons/GridIcon';
import { FilterIcon } from './icons/FilterIcon';
import { HealthAssistant } from './HealthAssistant';
import { ReportViewerModal } from './ReportViewerModal';

interface TimelineViewProps {
  onLogout: () => void;
  user: User;
  initialSelectedMemberId?: string;
  onBackToDashboard: () => void;
  familyMembers: FamilyMember[];
  timelineEntries: TimelineEntry[];
  medications?: Medication[];
  onRefreshData: () => void;
  onOpenGuide?: () => void;
}

const MEMBER_COLORS = ['#be123c', '#0369a1', '#15803d', '#c2410c', '#6d28d9', '#0d9488', '#334155'];

export const TimelineView: React.FC<TimelineViewProps> = ({ 
    onLogout, user, initialSelectedMemberId, onBackToDashboard, familyMembers, timelineEntries, medications = [], onRefreshData, onOpenGuide 
}) => {
  const defaultMemberId = useMemo(() => {
      if (initialSelectedMemberId) return initialSelectedMemberId;
      if (familyMembers.length > 0) {
           const me = familyMembers.find(m => m.linked_user_id === user.id);
           return me ? me.id : familyMembers[0].id;
      }
      return '';
  }, [initialSelectedMemberId, familyMembers, user.id]);

  const [selectedMemberId, setSelectedMemberId] = useState<string>(defaultMemberId);
  const [activeTab, setActiveTab] = useState<'all' | 'visits'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCompact, setIsCompact] = useState<boolean>(false);
  
  const [isUploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [isViewerOpen, setViewerOpen] = useState(false);
  const [reportToViewRaw, setReportToViewRaw] = useState<{ url: string, filePath?: string, file: ReportFile, entryId?: string } | null>(null);
  
  const [isEditModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [entryToEdit, setEntryToEdit] = useState<TimelineEntry | null>(null);

  const [isConfirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [entryToDelete, setEntryToDelete] = useState<TimelineEntry | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMember = useMemo(() => familyMembers.find(m => m.id === selectedMemberId), [familyMembers, selectedMemberId]);

  const handleUpload = useCallback(async (file: File, memberId: string, password?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const extractedData = await extractReportInfo(base64, mimeType, password);
      const newEntryData = {
        family_member_id: memberId,
        date: extractedData.date,
        report_type: extractedData.reportType,
        summary: extractedData.summary,
        doctor_name: extractedData.doctorName,
        facility_name: extractedData.facilityName,
        patient_name: extractedData.patientName,
        follow_up_date: extractedData.followUpDate
      };
      const fileData = { name: file.name, type: file.type, data: base64, ...(password && { password }) };
      
      await supabaseService.addTimelineEntry(newEntryData, fileData, extractedData.medications, selectedMember?.name);
      
      onRefreshData();
      setUploadModalOpen(false);
    } catch (err: any) {
      console.error("[medHist] Upload failed:", err);
      const errorMsg = err?.message || "Registry Sync Failed.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [onRefreshData, selectedMember?.name]);

  const handleViewReport = useCallback(async (entryToView: TimelineEntry) => {
    if (isDeleting) return;
    try {
        const result = await supabaseService.getFileForEntry(entryToView.id);
        if (!result || !result.signedUrl) {
            alert("This record file could not be found.");
            return;
        }
        setReportToViewRaw({ 
            url: result.signedUrl, 
            filePath: result.filePath,
            file: result.metadata,
            entryId: entryToView.id
        });
        setViewerOpen(true);
    } catch (error) {
        console.error('Error viewing report', error);
        alert('Could not open record viewer.');
    }
  }, [isDeleting]);

  const handleEditReport = useCallback((entry: TimelineEntry) => {
    if (isDeleting) return;
    setEntryToEdit(entry);
    setEditModalOpen(true);
  }, [isDeleting]);
  
  const handleDeleteReport = useCallback((entry: TimelineEntry) => {
    if (isDeleting) return;
    setEntryToDelete(entry);
    setConfirmModalOpen(true);
  }, [isDeleting]);

  const handleConfirmDelete = async () => {
    if (!entryToDelete || isDeleting) return;
    
    const targetId = entryToDelete.id;
    setConfirmModalOpen(false);
    setEntryToDelete(null);
    setIsDeleting(true);

    try {
      await supabaseService.deleteTimelineEntry(targetId);
      onRefreshData();
    } catch (err) {
      alert(`Critical Deletion Error: Could not remove record.`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleIgnoreMismatch = async (entryToUpdate: TimelineEntry) => {
      if (isDeleting) return;
      try {
        await supabaseService.ignoreMismatch(entryToUpdate.id);
        onRefreshData();
      } catch (err) { console.error(err); }
  };

  const handleMemberSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMemberId(e.target.value);
    setSearchQuery('');
  };
  
  const memberEntries = useMemo(() => timelineEntries.filter(entry => entry.family_member_id === selectedMemberId), [timelineEntries, selectedMemberId]);
  
  const themeColor = useMemo(() => {
    const idx = familyMembers.findIndex(m => m.id === selectedMemberId);
    return idx === -1 ? MEMBER_COLORS[0] : MEMBER_COLORS[idx % MEMBER_COLORS.length];
  }, [selectedMemberId, familyMembers]);

  const handleDownloadBrief = async () => {
      if (!selectedMember || isDeleting) return;
      setIsGeneratingPdf(true);
      try {
        const memberMeds = medications.filter(m => m.family_member_id === selectedMemberId);
        await generateDoctorBrief(selectedMember, memberMeds, memberEntries);
      } catch (e) {
        console.error("History generation error", e);
        alert("Failed to generate PDF history.");
      } finally {
        setIsGeneratingPdf(false);
      }
  };

  const displayedEntries = useMemo(() => {
    return memberEntries.filter(entry => {
      if (activeTab === 'visits') {
          const isVisitType = /visit|consult|prescription|discharge|referral|letter|memo|opd|appointment/i.test(entry.report_type);
          if (!entry.follow_up_date && !isVisitType) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!entry.report_type.toLowerCase().includes(query) && !entry.summary?.toLowerCase().includes(query) && !entry.doctor_name?.toLowerCase().includes(query) && !entry.facility_name?.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [memberEntries, activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col text-left">
      <Header onLogout={onLogout} userName={user.name} onOpenGuide={onOpenGuide} />
      <main className="container mx-auto p-4 sm:p-6 md:p-10 max-w-5xl flex-grow pb-24">
        
        <button 
            onClick={onBackToDashboard} 
            disabled={isDeleting}
            className="flex items-center gap-2 text-slate-900 hover:text-rose-700 mb-8 transition font-black text-[10px] uppercase tracking-[0.3em] disabled:opacity-30"
        >
            <ArrowLeftIcon className="w-5 h-5" /> Back to Family Board
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
            <div className="min-w-0">
              <p style={{ color: themeColor }} className="text-[10px] font-black uppercase tracking-[0.4em] mb-1.5 leading-none">
                  Precision Medical History
              </p>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none truncate">
                {selectedMember ? `${selectedMember.name}'s History` : 'Timeline'}
              </h1>
            </div>
             <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                    <select
                      value={selectedMemberId}
                      onChange={handleMemberSelectionChange}
                      disabled={isDeleting}
                      className="w-full sm:w-auto bg-slate-50 border-2 border-slate-900 rounded-xl py-2.5 pl-4 pr-10 text-slate-900 font-black text-[10px] uppercase tracking-widest focus:outline-none transition appearance-none cursor-pointer shadow-lg disabled:opacity-50"
                    >
                      {familyMembers.map(member => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-900">
                         <ChevronDownIcon className="w-3.5 h-3.5" />
                    </div>
                </div>
                <button 
                    onClick={handleDownloadBrief} 
                    disabled={isGeneratingPdf || isDeleting} 
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 text-slate-900 border-2 border-slate-900 font-black py-2.5 px-5 rounded-xl shadow-md hover:bg-slate-200 transition disabled:opacity-50 text-[9px] uppercase tracking-widest"
                >
                    {isGeneratingPdf ? <SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> : <DownloadIcon className="w-3.5 h-3.5" />}
                    Brief
                </button>
                <button 
                    onClick={() => setUploadModalOpen(true)} 
                    disabled={isDeleting}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white font-black py-2.5 px-6 rounded-xl shadow-xl hover:bg-rose-900 transition active:scale-95 text-[9px] uppercase tracking-widest disabled:opacity-50"
                >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Upload
                </button>
             </div>
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex space-x-1 bg-slate-100 p-1.5 rounded-2xl w-full md:w-fit border border-slate-200">
                    <button 
                        onClick={() => setActiveTab('all')} 
                        disabled={isDeleting}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition shadow-sm disabled:opacity-50 ${activeTab === 'all' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}
                    >
                        <ClipboardIcon className="w-3.5 h-3.5" /> All
                    </button>
                    <button 
                        onClick={() => setActiveTab('visits')} 
                        disabled={isDeleting}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition shadow-sm disabled:opacity-50 ${activeTab === 'visits' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}
                    >
                        <StethoscopeIcon className="w-3.5 h-3.5" /> Visits
                    </button>
                </div>
                {/* View Density Toggle */}
                <button 
                    onClick={() => setIsCompact(!isCompact)}
                    className={`p-2.5 rounded-xl border border-slate-200 shadow-sm transition-all ${isCompact ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                    title={isCompact ? "Switch to Standard View" : "Switch to Compact View"}
                >
                    {isCompact ? <GridIcon className="w-4 h-4" /> : <FilterIcon className="w-4 h-4" />}
                </button>
            </div>

            <div className="relative w-full md:max-w-xs">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                    <SearchIcon className="w-4 h-4 text-slate-900" />
                </div>
                <input 
                    type="text" 
                    placeholder="Search clinical keywords..." 
                    disabled={isDeleting}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-xs font-black focus:ring-4 focus:ring-rose-500/5 focus:border-slate-900 transition shadow-sm outline-none placeholder-slate-400 disabled:opacity-50"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>

        {isDeleting && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl animate-pulse flex items-center justify-center gap-3">
                <SpinnerIcon className="w-4 h-4 text-red-700 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-red-700">Purging registry entry... Please wait.</span>
            </div>
        )}

        <Timeline 
            entries={displayedEntries} 
            onViewReport={handleViewReport} 
            onEditReport={handleEditReport}
            onDeleteReport={handleDeleteReport} 
            onIgnoreMismatch={handleIgnoreMismatch} 
            selectedMemberName={selectedMember?.name} 
            themeColor={themeColor}
            isReadOnly={isDeleting}
            isCompact={isCompact}
        />
      </main>
      
      <HealthAssistant 
        familyMembers={familyMembers} 
        timelineEntries={timelineEntries} 
        medications={medications} 
        userName={user.name} 
        userId={user.id}
        onViewReport={handleViewReport} 
      />

      {isUploadModalOpen && <UploadModal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} onUpload={handleUpload} familyMembers={familyMembers} initialSelectedMemberId={selectedMemberId} isLoading={isLoading} error={error} setError={setError} />}

      {isViewerOpen && reportToViewRaw && (
        <ReportViewerModal 
            isOpen={isViewerOpen} 
            onClose={() => { setViewerOpen(false); setReportToViewRaw(null); }} 
            report={reportToViewRaw} 
        />
      )}

      {isEditModalOpen && entryToEdit && (
        <EditTimelineEntryModal 
          isOpen={isEditModalOpen} 
          onClose={() => { setEditModalOpen(false); setEntryToEdit(null); }} 
          entry={entryToEdit} 
          onUpdate={onRefreshData} 
        />
      )}
      
      {isConfirmModalOpen && <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => { setConfirmModalOpen(false); setEntryToDelete(null); }} onConfirm={handleConfirmDelete} title="Purge Record?" message="This will permanently delete this clinical record from the secure timeline." />}
      
      <footer className="py-16 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.5em] mt-auto">
          medHist Precision • v1.3.1
      </footer>
    </div>
  );
};
