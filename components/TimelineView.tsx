
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Header } from './Header';
import { Timeline } from './Timeline';
import { UploadModal } from './UploadModal';
import { AddMemberModal } from './AddMemberModal';
import { ConfirmationModal } from './ConfirmationModal';
import { ReportViewerModal } from './ReportViewerModal';
import { InviteSuccessModal } from './InviteSuccessModal';
import { extractReportInfo } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import * as supabaseService from '../services/supabaseService';
import type { FamilyMember, TimelineEntry, User, ReportFile } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { KeyIcon } from './icons/KeyIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { FilterIcon } from './icons/FilterIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface TimelineViewProps {
  onLogout: () => void;
  user: User;
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

export const TimelineView: React.FC<TimelineViewProps> = ({ onLogout, user }) => {
  const [isPageLoading, setPageLoading] = useState<boolean>(true);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);

  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  
  // Filter States
  const [filterReportType, setFilterReportType] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const [isUploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [isAddMemberModalOpen, setAddMemberModalOpen] = useState<boolean>(false);
  const [isViewerOpen, setViewerOpen] = useState(false);
  const [reportToView, setReportToView] = useState<{ url: string, file: ReportFile } | null>(null);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [entryToDelete, setEntryToDelete] = useState<TimelineEntry | null>(null);
  
  // Invite Modal State
  const [inviteSuccessData, setInviteSuccessData] = useState<{name: string, link: string, code: string} | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  // Fetch initial data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await supabaseService.getUserData(user.id, user.name);
        if (isMounted.current) {
          setFamilyMembers(data.familyMembers);
          setTimelineEntries(data.timelineEntries);
          
          const self = data.familyMembers.find(m => m.relationship === 'Self');
          setSelectedMemberId(self ? self.id : (data.familyMembers[0]?.id || ''));
        }
      } catch (e) {
        console.error("Failed to load user data from Supabase", e);
      } finally {
        if (isMounted.current) {
          setPageLoading(false);
        }
      }
    };
    loadData();

    return () => {
      isMounted.current = false;
    };
  }, [user.id, user.name]);
  
  const handleUpload = useCallback(async (file: File, memberId: string, password?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      
      // Pass the password to Gemini service. 
      // If it's a PDF and has a password, the service will decrypt locally and send text.
      const extractedData = await extractReportInfo(base64, mimeType, password);

      const newEntryData = {
        family_member_id: memberId,
        date: extractedData.date,
        report_type: extractedData.reportType,
        summary: extractedData.summary,
        doctor_name: extractedData.doctorName,
        facility_name: extractedData.facilityName,
        patient_name: extractedData.patientName,
      };

      const fileData = {
          name: file.name,
          type: file.type,
          data: base64,
          ...(password && { password }),
      };
      
      const newEntry = await supabaseService.addTimelineEntry(newEntryData, fileData);

      if (!isMounted.current) return;
      setTimelineEntries(prevEntries => [...prevEntries, newEntry].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setUploadModalOpen(false);
    } catch (err) {
      console.error("Upload and processing failed:", err);
      if (!isMounted.current) return;
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during upload.";
      setError(errorMessage);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleViewReport = useCallback(async (entryToView: TimelineEntry) => {
    try {
        const result = await supabaseService.getFileForEntry(entryToView.id);
        if (!result) {
            alert("Could not load the report file. It may have been deleted or there was a network issue.");
            return;
        }

        const { signedUrl, metadata } = result;
        
        // Fetch the file from the secure URL and create a local blob URL
        const response = await fetch(signedUrl);
        if (!response.ok) {
            throw new Error(`Failed to download report: ${response.statusText}`);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        setReportToView({ url: objectUrl, file: metadata });
        setViewerOpen(true);

    } catch (error) {
        console.error('[medHist Debug] handleViewReport: An unexpected error occurred.', error);
        alert('An error occurred while trying to view the report. Please check the console for details.');
    }
  }, []);
  
  const handleCloseViewer = () => {
    // IMPORTANT: Revoke the object URL to prevent memory leaks
    if (reportToView) {
      URL.revokeObjectURL(reportToView.url);
    }
    setViewerOpen(false);
    setReportToView(null);
  };

  const handleDeleteReport = (entry: TimelineEntry) => {
    setEntryToDelete(entry);
    setConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;

    console.log(
      `%c[medHist Debug] Attempting to delete timeline entry with ID: ${entryToDelete.id}`,
      'color: blue; font-weight: bold;'
    );
    try {
      await supabaseService.deleteTimelineEntry(entryToDelete.id);
      setTimelineEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryToDelete.id));
      console.log(
        `%c[medHist Debug] Successfully deleted timeline entry with ID: ${entryToDelete.id}`,
        'color: green; font-weight: bold;'
      );
    } catch (err) {
      console.error("--- [medHist Debug] DETAILED DELETION ERROR ---");
      console.error("[medHist Debug] Raw error object:", err);
      console.error("---------------------------------");

      alert(`Deletion failed. Please check the developer console (press F12) for detailed logs and share the error message.`);
    } finally {
      setConfirmModalOpen(false);
      setEntryToDelete(null);
    }
  };


  const handleIgnoreMismatch = async (entryToUpdate: TimelineEntry) => {
      try {
        const updatedEntry = await supabaseService.ignoreMismatch(entryToUpdate.id);
        setTimelineEntries(prevEntries => 
          prevEntries.map(entry => 
            entry.id === updatedEntry.id ? updatedEntry : entry
          )
        );
      } catch (err) {
        console.error("Failed to ignore mismatch:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        alert(`Failed to update report: ${errorMessage}`);
      }
  };

  const handleAddMember = async (details: { name: string; relationship: string; sendInvite: boolean; dob: string; }) => {
    try {
        const newMember = await supabaseService.addFamilyMember({
            name: details.name,
            relationship: details.relationship,
            dob: details.dob,
            sendInvite: details.sendInvite
        });

        setFamilyMembers(prev => [...prev, newMember]);
        
        // Automatically select the new member
        setSelectedMemberId(newMember.id);
        
        if (details.sendInvite && newMember.invite_code) {
            // GENERATE INVITE LINK & SHOW MODAL
            let appUrl = window.location.origin;
            try {
                // Safely attempt to read from environment variable
                // @ts-ignore
                if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APP_URL) {
                     // @ts-ignore
                    appUrl = import.meta.env.VITE_APP_URL;
                }
            } catch (e) {
                console.warn("Could not determine VITE_APP_URL, defaulting to window.location.origin");
            }
            
            setInviteSuccessData({
                name: details.name,
                link: appUrl,
                code: newMember.invite_code
            });
        }
    } catch (error) {
        // Re-throw the error so the modal can catch it and display it
        throw error;
    }
  };

  const handleMemberSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'add-new-member') {
      setAddMemberModalOpen(true);
    } else {
      setSelectedMemberId(value);
      // Clear filters when switching members for better UX
      setFilterReportType('');
      setFilterStartDate('');
      setFilterEndDate('');
    }
  };
  
  const selectedMember = useMemo(() => familyMembers.find(m => m.id === selectedMemberId), [familyMembers, selectedMemberId]);
  
  // Check if the selected member is shared (not owned by current user)
  const isSelectedMemberShared = useMemo(() => {
      return selectedMember && selectedMember.user_id !== user.id;
  }, [selectedMember, user.id]);

  // 1. First, get entries for the selected member
  const memberEntries = useMemo(() => {
    return timelineEntries.filter(entry => entry.family_member_id === selectedMemberId);
  }, [timelineEntries, selectedMemberId]);
  
  // Derive pending invites from family members who have an invite code
  const pendingInvites = useMemo(() => {
      return familyMembers.filter(m => m.invite_code);
  }, [familyMembers]);

  // 2. Compute unique report types for the dropdown based on memberEntries
  const uniqueReportTypes = useMemo(() => {
    const types = new Set(memberEntries.map(e => e.report_type));
    return Array.from(types).sort();
  }, [memberEntries]);

  // 3. Filter entries based on UI controls
  const displayedEntries = useMemo(() => {
    return memberEntries.filter(entry => {
      // Filter by Report Type
      if (filterReportType && entry.report_type !== filterReportType) {
        return false;
      }

      // Filter by Date Range
      const entryDate = new Date(entry.date);
      
      if (filterStartDate) {
        const startDate = new Date(filterStartDate);
        if (entryDate < startDate) return false;
      }

      if (filterEndDate) {
        const endDate = new Date(filterEndDate);
        if (entryDate > endDate) return false;
      }

      return true;
    });
  }, [memberEntries, filterReportType, filterStartDate, filterEndDate]);

  const clearFilters = () => {
    setFilterReportType('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const hasActiveFilters = filterReportType || filterStartDate || filterEndDate;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert(`Invite code ${code} copied to clipboard!`);
  };

  if (isPageLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="text-center">
                <SpinnerIcon className="w-10 h-10 text-brand-blue-600 animate-spin mx-auto" />
                <p className="mt-4 text-slate-500 font-semibold">Loading your timeline...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <Header onLogout={onLogout} />
      <main className="container mx-auto p-4 md:p-8 max-w-5xl flex-grow">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-brand-blue-800">
                {selectedMember ? `${selectedMember.name}'s Timeline` : 'Medical Timeline'}
              </h1>
              <p className="text-slate-500 mt-1">A chronological history of medical reports.</p>
            </div>
             <div className="flex items-center gap-4 w-full sm:w-auto">
                <select
                  value={selectedMemberId}
                  onChange={handleMemberSelectionChange}
                  className="w-full sm:w-auto bg-slate-100 border border-slate-300 rounded-md py-2 px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition"
                >
                  {familyMembers.map(member => {
                    const age = calculateAge(member.dob);
                    const isShared = member.user_id !== user.id;
                    return (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.relationship}{age !== null ? `, Age ${age}` : ''}) {isShared ? '(Shared)' : ''}
                        </option>
                    )
                  })}
                  <option value="add-new-member" className="font-semibold text-brand-blue-600">
                    + Add New Member...
                  </option>
                </select>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="flex-shrink-0 bg-brand-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-brand-blue-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-opacity-75 transition duration-200 flex items-center gap-2"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Upload Report</span>
                </button>
             </div>
          </div>

          {/* Filter Section - Updated for better horizontal responsiveness */}
          {memberEntries.length > 0 && (
            <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex flex-col lg:flex-row items-start lg:items-end gap-4">
                
                <div className="flex items-center gap-2 mb-2 lg:mb-0 lg:mr-2">
                   <FilterIcon className="w-5 h-5 text-slate-500" />
                   <span className="text-sm font-semibold text-slate-700">Filter:</span>
                </div>

                {/* Report Type Filter */}
                <div className="w-full lg:w-auto">
                  <label htmlFor="filterType" className="block text-xs font-medium text-slate-500 mb-1">
                    Report Type
                  </label>
                  <select
                    id="filterType"
                    value={filterReportType}
                    onChange={(e) => setFilterReportType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md py-1.5 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
                  >
                    <option value="">All Types</option>
                    {uniqueReportTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Date From */}
                <div className="w-full lg:w-auto">
                  <label htmlFor="dateFrom" className="block text-xs font-medium text-slate-500 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    id="dateFrom"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md py-1.5 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
                  />
                </div>

                {/* Date To */}
                <div className="w-full lg:w-auto">
                  <label htmlFor="dateTo" className="block text-xs font-medium text-slate-500 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    id="dateTo"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md py-1.5 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
                  />
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-brand-blue-600 hover:text-brand-blue-800 font-medium underline mt-2 lg:mt-0 lg:mb-2 ml-1"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          )}

          <Timeline 
            entries={displayedEntries} 
            onViewReport={handleViewReport} 
            onDeleteReport={handleDeleteReport}
            onIgnoreMismatch={handleIgnoreMismatch}
            selectedMemberName={selectedMember?.name}
            isShared={isSelectedMemberShared}
          />
        </div>
        
        {pendingInvites.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-3">
              <KeyIcon className="w-6 h-6 text-brand-blue-600" />
              <h2 className="text-xl font-bold text-brand-blue-800">Active Invite Codes</h2>
            </div>
            <p className="text-slate-500 mt-1 mb-4">
                Share these codes with family members. They can use them during signup to access these timelines.
            </p>
            <ul className="space-y-3">
              {pendingInvites.map(member => (
                <li key={member.id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center border border-slate-200">
                  <div>
                    <span className="font-semibold text-slate-700">{member.name}</span>
                    <span className="text-slate-500 text-sm"> ({member.relationship})</span>
                  </div>
                  <div className="text-right flex items-center gap-3">
                     <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-slate-200">
                        <span className="text-xs text-slate-500 font-medium uppercase">Code:</span>
                        <span className="text-sm font-mono font-bold text-slate-800 tracking-wider">{member.invite_code}</span>
                     </div>
                     <button 
                        onClick={() => copyCode(member.invite_code || '')}
                        className="text-slate-400 hover:text-brand-blue-600 transition"
                        title="Copy Code"
                     >
                         <ClipboardIcon className="w-5 h-5" />
                     </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* Footer to indicate version change */}
      <footer className="py-6 text-center text-slate-400 text-sm border-t border-slate-200 mt-8">
        <p>© {new Date().getFullYear()} medHist. All rights reserved. v0.2.0 (Shared Views)</p>
      </footer>

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
      
      {isAddMemberModalOpen && (
        <AddMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={() => setAddMemberModalOpen(false)}
          onAddMember={handleAddMember}
        />
      )}

      {isViewerOpen && reportToView && (
        <ReportViewerModal 
            isOpen={isViewerOpen}
            onClose={handleCloseViewer}
            report={reportToView}
        />
      )}
      
      {/* New Invite Modal */}
      {inviteSuccessData && (
        <InviteSuccessModal
          isOpen={!!inviteSuccessData}
          onClose={() => setInviteSuccessData(null)}
          inviteData={inviteSuccessData}
        />
      )}

      {isConfirmModalOpen && (
        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => {
            setConfirmModalOpen(false);
            setEntryToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Confirm Deletion"
          message="Are you sure you want to permanently delete this report? This action cannot be undone."
        />
      )}
    </div>
  );
};
