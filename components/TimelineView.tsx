
import React, { useState, useMemo, useCallback } from 'react';
import { Header } from './Header';
import { Timeline } from './Timeline';
import { UploadModal } from './UploadModal';
import { ConfirmationModal } from './ConfirmationModal';
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
  const [filterReportType, setFilterReportType] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const [isUploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [isViewerOpen, setViewerOpen] = useState(false);
  const [reportToViewRaw, setReportToViewRaw] = useState<{ url: string, filePath?: string, file: ReportFile } | null>(null);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [entryToDelete, setEntryToDelete] = useState<TimelineEntry | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      await supabaseService.addTimelineEntry(newEntryData, fileData, extractedData.medications);
      onRefreshData();
      setUploadModalOpen(false);
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsLoading(false);
    }
  }, [onRefreshData]);

  const handleViewReport = useCallback(async (entryToView: TimelineEntry) => {
    try {
        const result = await supabaseService.getFileForEntry(entryToView.id);
        if (!result) {
            alert("This record file could not be found.");
            return;
        }
        setReportToViewRaw({ 
            url: result.signedUrl, 
            filePath: result.filePath,
            file: result.metadata 
        });
        setViewerOpen(true);
    } catch (error) {
        console.error('Error viewing report', error);
        alert('Could not open record viewer.');
    }
  }, []);
  
  const handleDeleteReport = (entry: TimelineEntry) => {
    setEntryToDelete(entry);
    setConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      await supabaseService.deleteTimelineEntry(entryToDelete.id);
      onRefreshData();
    } catch (err) {
      alert(`Deletion failed.`);
    } finally {
      setConfirmModalOpen(false);
      setEntryToDelete(null);
    }
  };

  const handleIgnoreMismatch = async (entryToUpdate: TimelineEntry) => {
      try {
        await supabaseService.ignoreMismatch(entryToUpdate.id);
        onRefreshData();
      } catch (err) { console.error(err); }
  };

  const handleMemberSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMemberId(e.target.value);
    setSearchQuery('');
    setFilterReportType('');
    setFilterStartDate('');
    setFilterEndDate('');
  };
  
  const selectedMember = useMemo(() => familyMembers.find(m => m.id === selectedMemberId), [familyMembers, selectedMemberId]);
  const memberEntries = useMemo(() => timelineEntries.filter(entry => entry.family_member_id === selectedMemberId), [timelineEntries, selectedMemberId]);
  
  const handleDownloadBrief = async () => {
      if (!selectedMember) return;
      setIsGeneratingPdf(true);
      try {
        const memberMeds = medications.filter(m => m.family_member_id === selectedMemberId);
        await generateDoctorBrief(selectedMember, memberMeds, memberEntries);
      } catch (e) {
        console.error("Brief generation error", e);
        alert("Failed to generate PDF summary.");
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
      if (filterReportType && entry.report_type !== filterReportType) return false;
      const entryDate = new Date(entry.date);
      if (filterStartDate && entryDate < new Date(filterStartDate)) return false;
      if (filterEndDate && entryDate > new Date(filterEndDate)) return false;
      return true;
    });
  }, [memberEntries, activeTab, searchQuery, filterReportType, filterStartDate, filterEndDate]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <Header onLogout={onLogout} userName={user.name} onOpenGuide={onOpenGuide} />
      <main className="container mx-auto p-4 md:p-8 max-w-5xl flex-grow pb-24">
        <button onClick={onBackToDashboard} className="flex items-center gap-2 text-slate-500 hover:text-brand-blue-600 mb-6 transition font-medium text-sm">
            <ArrowLeftIcon className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="text-left">
              <h2 className="text-2xl font-bold text-brand-blue-800">
                {selectedMember ? `${selectedMember.name}'s Timeline` : 'Select a Member'}
              </h2>
              <p className="text-slate-500 mt-1">Medical history & reports.</p>
            </div>
             <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                    <select
                      value={selectedMemberId}
                      onChange={handleMemberSelectionChange}
                      className="w-full sm:w-auto bg-slate-100 border border-slate-300 rounded-md py-2 pl-3 pr-8 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition appearance-none"
                    >
                      {familyMembers.map(member => (
                            <option key={member.id} value={member.id}>
                              {member.name} ({member.relationship})
                            </option>
                      ))}
                    </select>
                </div>
                <button onClick={handleDownloadBrief} disabled={isGeneratingPdf} className="flex-shrink-0 bg-white text-slate-700 border border-slate-300 font-semibold py-2 px-3 rounded-lg shadow-sm hover:bg-slate-50 transition flex items-center gap-2 disabled:opacity-50">
                    {isGeneratingPdf ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <DownloadIcon className="w-5 h-5" />}
                    <span className="hidden sm:inline">Brief</span>
                </button>
                <button onClick={() => setUploadModalOpen(true)} className="flex-shrink-0 bg-brand-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-brand-blue-700 transition flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Upload</span>
                </button>
             </div>
          </div>
          
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg mb-6 w-fit">
              <button onClick={() => setActiveTab('all')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'all' ? 'bg-white text-brand-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <ClipboardIcon className="w-4 h-4" /> All Records
              </button>
              <button onClick={() => setActiveTab('visits')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'visits' ? 'bg-white text-brand-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <StethoscopeIcon className="w-4 h-4" /> Doctor Visits
              </button>
          </div>

          <Timeline entries={displayedEntries} onViewReport={handleViewReport} onDeleteReport={handleDeleteReport} onIgnoreMismatch={handleIgnoreMismatch} selectedMemberName={selectedMember?.name} />
        </div>
      </main>
      
      <HealthAssistant familyMembers={familyMembers} timelineEntries={timelineEntries} medications={medications} userName={user.name} onViewReport={handleViewReport} />

      {isUploadModalOpen && <UploadModal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} onUpload={handleUpload} familyMembers={familyMembers} initialSelectedMemberId={selectedMemberId} isLoading={isLoading} error={error} setError={setError} />}

      {isViewerOpen && reportToViewRaw && (
        <ReportViewerModal 
            isOpen={isViewerOpen} 
            onClose={() => { setViewerOpen(false); setReportToViewRaw(null); }} 
            report={reportToViewRaw} 
        />
      )}
      
      {isConfirmModalOpen && <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => { setConfirmModalOpen(false); setEntryToDelete(null); }} onConfirm={handleConfirmDelete} title="Delete Report?" message="This will permanently delete this report." />}
    </div>
  );
};
