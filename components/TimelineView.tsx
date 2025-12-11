
import React, { useState, useMemo, useCallback } from 'react';
import { Header } from './Header';
import { Timeline } from './Timeline';
import { UploadModal } from './UploadModal';
import { ConfirmationModal } from './ConfirmationModal';
import { ReportViewerModal } from './ReportViewerModal';
import { extractReportInfo } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import * as supabaseService from '../services/supabaseService';
import type { FamilyMember, TimelineEntry, User, ReportFile, Medication } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { FilterIcon } from './icons/FilterIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { SearchIcon } from './icons/SearchIcon';
import { StethoscopeIcon } from './icons/StethoscopeIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { HealthAssistant } from './HealthAssistant';

interface TimelineViewProps {
  onLogout: () => void;
  user: User;
  initialSelectedMemberId?: string;
  onBackToDashboard: () => void;
  // Data passed from App to avoid re-fetching
  familyMembers: FamilyMember[];
  timelineEntries: TimelineEntry[];
  medications?: Medication[];
  onRefreshData: () => void; // Callback to re-fetch if upload happens
}

const calculateAge = (dobString: string | undefined | null): number | null => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
};

export const TimelineView: React.FC<TimelineViewProps> = ({ 
    onLogout, user, initialSelectedMemberId, onBackToDashboard, familyMembers, timelineEntries, medications = [], onRefreshData 
}) => {
  // Logic to determine initial selection
  const defaultMemberId = useMemo(() => {
      if (initialSelectedMemberId) return initialSelectedMemberId;
      if (familyMembers.length > 0) {
           const me = familyMembers.find(m => m.linked_user_id === user.id);
           return me ? me.id : familyMembers[0].id;
      }
      return '';
  }, [initialSelectedMemberId, familyMembers, user.id]);

  const [selectedMemberId, setSelectedMemberId] = useState<string>(defaultMemberId);
  
  // View Toggle: 'all' or 'visits'
  const [activeTab, setActiveTab] = useState<'all' | 'visits'>('all');

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterReportType, setFilterReportType] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const [isUploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [isViewerOpen, setViewerOpen] = useState(false);
  const [reportToView, setReportToView] = useState<{ url: string, file: ReportFile } | null>(null);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [entryToDelete, setEntryToDelete] = useState<TimelineEntry | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
        follow_up_date: extractedData.followUpDate // Save the extracted follow up date
      };

      const fileData = {
          name: file.name,
          type: file.type,
          data: base64,
          ...(password && { password }),
      };
      
      // Pass extracted medications to be saved
      await supabaseService.addTimelineEntry(newEntryData, fileData, extractedData.medications);

      onRefreshData(); // Re-fetch everything to update timeline AND meds
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
            alert("Could not load the report file.");
            return;
        }
        const { signedUrl, metadata } = result;
        const response = await fetch(signedUrl);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setReportToView({ url: objectUrl, file: metadata });
        setViewerOpen(true);
    } catch (error) {
        console.error('Error viewing report', error);
        alert('Error loading file.');
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
      console.error("Deletion error:", err);
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
    const value = e.target.value;
    setSelectedMemberId(value);
    setSearchQuery('');
    setFilterReportType('');
    setFilterStartDate('');
    setFilterEndDate('');
  };
  
  const selectedMember = useMemo(() => familyMembers.find(m => m.id === selectedMemberId), [familyMembers, selectedMemberId]);
  
  const memberEntries = useMemo(() => {
    return timelineEntries.filter(entry => entry.family_member_id === selectedMemberId);
  }, [timelineEntries, selectedMemberId]);
  
  const uniqueReportTypes = useMemo(() => {
    const types = new Set(memberEntries.map(e => e.report_type));
    return Array.from(types).sort();
  }, [memberEntries]);

  const displayedEntries = useMemo(() => {
    return memberEntries.filter(entry => {
      // 0. Active Tab Filter (Visits Only)
      if (activeTab === 'visits') {
          // STRICTER FILTER:
          // Must match a visit-related keyword OR have a specific follow-up date.
          // Merely having a doctor's name is NOT enough, as lab reports also have doctor names.
          const isVisitType = /visit|consult|prescription|discharge|referral|letter|memo|opd|appointment/i.test(entry.report_type);
          
          if (!entry.follow_up_date && !isVisitType) {
              return false;
          }
      }

      // 1. Text Search Filter (Report Type, Summary, Doctor, Facility)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesType = entry.report_type.toLowerCase().includes(query);
        const matchesSummary = entry.summary?.toLowerCase().includes(query);
        const matchesDoctor = entry.doctor_name?.toLowerCase().includes(query);
        const matchesFacility = entry.facility_name?.toLowerCase().includes(query);
        
        if (!matchesType && !matchesSummary && !matchesDoctor && !matchesFacility) {
            return false;
        }
      }

      // 2. Dropdown Filter
      if (filterReportType && entry.report_type !== filterReportType) return false;

      // 3. Date Range Filter
      const entryDate = new Date(entry.date);
      if (filterStartDate && entryDate < new Date(filterStartDate)) return false;
      if (filterEndDate && entryDate > new Date(filterEndDate)) return false;
      return true;
    });
  }, [memberEntries, activeTab, searchQuery, filterReportType, filterStartDate, filterEndDate]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <Header onLogout={onLogout} userName={user.name} />
      <main className="container mx-auto p-4 md:p-8 max-w-5xl flex-grow pb-24">
        
        {/* Navigation Breadcrumb */}
        <button 
            onClick={onBackToDashboard}
            className="flex items-center gap-2 text-slate-500 hover:text-brand-blue-600 mb-6 transition font-medium text-sm"
        >
            <ArrowLeftIcon className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Timeline Controls */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
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
                      {familyMembers.map(member => {
                        const age = calculateAge(member.dob);
                        let label = member.relationship;
                        if (member.linked_user_id) {
                            label = member.linked_user_id === user.id ? "Me" : "Member";
                        }
                        return (
                            <option key={member.id} value={member.id}>
                              {member.name} ({label}{age !== null ? `, Age ${age}` : ''})
                            </option>
                        )
                      })}
                    </select>
                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                    </div>
                </div>

                <div className="w-px h-8 bg-slate-200 mx-1"></div>

                <button
                    onClick={() => setUploadModalOpen(true)}
                    className="flex-shrink-0 bg-brand-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-brand-blue-700 transition flex items-center gap-2"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Upload</span>
                </button>
             </div>
          </div>
          
          {/* View Toggle Tabs */}
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg mb-6 w-fit">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'all' ? 'bg-white text-brand-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  <ClipboardIcon className="w-4 h-4" />
                  All Records
              </button>
              <button
                onClick={() => setActiveTab('visits')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'visits' ? 'bg-white text-brand-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  <StethoscopeIcon className="w-4 h-4" />
                  Doctor Visits
              </button>
          </div>

          {/* Filter Section */}
          {memberEntries.length > 0 && (
            <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex flex-col gap-4">
                {/* Search Bar Row */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <input 
                            type="text"
                            placeholder="Search reports by type, doctor, or keyword..."
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-500 focus:ring-1 focus:ring-brand-blue-500 focus:border-brand-blue-500 sm:text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {(searchQuery || filterReportType || filterStartDate || filterEndDate) && (
                      <button 
                        onClick={() => { setSearchQuery(''); setFilterReportType(''); setFilterStartDate(''); setFilterEndDate(''); }} 
                        className="text-sm text-brand-blue-600 hover:text-brand-blue-800 font-medium underline px-2"
                      >
                        Clear All
                      </button>
                    )}
                </div>

                {/* Filters Row */}
                <div className="flex flex-col lg:flex-row items-start lg:items-end gap-4 pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-2 mb-2 lg:mb-0 lg:mr-2">
                    <FilterIcon className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Filters</span>
                    </div>
                    <div className="w-full lg:w-auto">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Report Type</label>
                    <select value={filterReportType} onChange={(e) => setFilterReportType(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md py-1.5 px-3 text-sm focus:ring-1 focus:ring-brand-blue-500">
                        <option value="">All Types</option>
                        {uniqueReportTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    </div>
                    <div className="w-full lg:w-auto">
                    <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
                    <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md py-1.5 px-3 text-sm focus:ring-1 focus:ring-brand-blue-500" />
                    </div>
                    <div className="w-full lg:w-auto">
                    <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
                    <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md py-1.5 px-3 text-sm focus:ring-1 focus:ring-brand-blue-500" />
                    </div>
                </div>
              </div>
            </div>
          )}

          <Timeline 
            entries={displayedEntries} 
            onViewReport={handleViewReport} 
            onDeleteReport={handleDeleteReport}
            onIgnoreMismatch={handleIgnoreMismatch}
            selectedMemberName={selectedMember?.name}
            isShared={false}
            isReadOnly={false}
          />
        </div>
      </main>
      
      {/* AI Assistant */}
      <HealthAssistant 
         familyMembers={familyMembers}
         timelineEntries={timelineEntries}
         medications={medications}
         userName={user.name}
         onViewReport={handleViewReport}
      />

      {isUploadModalOpen && (
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onUpload={handleUpload}
          familyMembers={familyMembers}
          initialSelectedMemberId={selectedMemberId}
          isLoading={isLoading}
          error={error}
          setError={setError}
        />
      )}

      {isViewerOpen && reportToView && (
        <ReportViewerModal isOpen={isViewerOpen} onClose={() => { setViewerOpen(false); setReportToView(null); }} report={reportToView} />
      )}
      
      {isConfirmModalOpen && (
        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => { setConfirmModalOpen(false); setEntryToDelete(null); }}
          onConfirm={handleConfirmDelete}
          title="Delete Report?"
          message="This will permanently delete this report for the entire family."
        />
      )}
    </div>
  );
};
