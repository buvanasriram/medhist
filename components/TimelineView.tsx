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
import { UsersIcon } from './icons/UsersIcon';
import { UserIcon } from './icons/UserIcon';

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
  const [familyInfo, setFamilyInfo] = useState<{name: string, joinCode: string} | null>(null);

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
  
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await supabaseService.getUserData(user.id);
        if (isMounted.current) {
          setFamilyMembers(data.familyMembers);
          setTimelineEntries(data.timelineEntries);
          setFamilyInfo(data.familyInfo);
          
          // Select Default Member Logic:
          // 1. Look for member linked to this user (Me)
          // 2. Look for relationship 'Self' (Legacy/Fallback)
          // 3. Fallback to first member
          if (data.familyMembers.length > 0) {
              const me = data.familyMembers.find(m => m.linked_user_id === user.id);
              const selfFallback = data.familyMembers.find(m => m.relationship === 'Self' || m.relationship === 'Admin');
              
              if (me) {
                  setSelectedMemberId(me.id);
              } else if (selfFallback) {
                  setSelectedMemberId(selfFallback.id);
              } else {
                  setSelectedMemberId(data.familyMembers[0].id);
              }
          }
        }
      } catch (e) {
        console.error("Failed to load family data", e);
      } finally {
        if (isMounted.current) setPageLoading(false);
      }
    };
    loadData();

    return () => { isMounted.current = false; };
  }, [user.id]);
  
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
      console.error("Upload failed:", err);
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

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
  
  const handleCloseViewer = () => {
    if (reportToView) URL.revokeObjectURL(reportToView.url);
    setViewerOpen(false);
    setReportToView(null);
  };

  const handleDeleteReport = (entry: TimelineEntry) => {
    setEntryToDelete(entry);
    setConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      await supabaseService.deleteTimelineEntry(entryToDelete.id);
      setTimelineEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryToDelete.id));
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
        const updatedEntry = await supabaseService.ignoreMismatch(entryToUpdate.id);
        setTimelineEntries(prevEntries => 
          prevEntries.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry)
        );
      } catch (err) { console.error(err); }
  };

  const handleAddMember = async (details: { name: string; relationship: string; dob: string; }) => {
    try {
        const newMember = await supabaseService.addFamilyMember({
            name: details.name,
            relationship: details.relationship,
            dob: details.dob
        });
        setFamilyMembers(prev => [...prev, newMember]);
        setSelectedMemberId(newMember.id);
    } catch (error) {
        throw error;
    }
  };

  const handleMemberSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedMemberId(value);
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
      if (filterReportType && entry.report_type !== filterReportType) return false;
      const entryDate = new Date(entry.date);
      if (filterStartDate && entryDate < new Date(filterStartDate)) return false;
      if (filterEndDate && entryDate > new Date(filterEndDate)) return false;
      return true;
    });
  }, [memberEntries, filterReportType, filterStartDate, filterEndDate]);

  if (isPageLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <SpinnerIcon className="w-10 h-10 text-brand-blue-600 animate-spin" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <Header onLogout={onLogout} userName={user.name} />
      <main className="container mx-auto p-4 md:p-8 max-w-5xl flex-grow">
        
        {/* Family Header Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 mb-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-brand-blue-100 p-2 rounded-lg">
                        <UsersIcon className="w-6 h-6 text-brand-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">{familyInfo?.name || "My Family"}</h1>
                        <p className="text-sm text-slate-500">{familyMembers.length} Members</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 text-sm font-medium text-brand-blue-600 hover:bg-brand-blue-50 px-3 py-2 rounded-md transition"
                >
                    <KeyIcon className="w-4 h-4" />
                    <span>Invite Family</span>
                </button>
            </div>
        </div>

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
                      disabled={familyMembers.length === 0}
                    >
                      {familyMembers.length === 0 && <option>No members yet</option>}
                      {familyMembers.map(member => {
                        const age = calculateAge(member.dob);
                        let label = member.relationship;
                        
                        // SMART LABEL LOGIC
                        if (member.linked_user_id) {
                            // If this is the CURRENT logged-in user
                            if (member.linked_user_id === user.id) {
                                label = "Me";
                            } else {
                                // If this is ANOTHER user in the family (e.g. Wife, Husband)
                                // Display 'Member' instead of 'Self'/'Admin'
                                label = "Member";
                            }
                        }

                        return (
                            <option key={member.id} value={member.id}>
                              {member.name} ({label}{age !== null ? `, Age ${age}` : ''})
                            </option>
                        )
                      })}
                    </select>
                    {/* Chevron for better custom styling feel */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                    </div>
                </div>

                <button
                    onClick={() => setAddMemberModalOpen(true)}
                    className="flex-shrink-0 p-2.5 bg-white border border-slate-300 rounded-lg text-slate-600 hover:text-brand-blue-600 hover:border-brand-blue-500 hover:bg-brand-blue-50 transition shadow-sm"
                    title="Add New Family Member"
                >
                    <div className="flex items-center gap-1">
                         <UserIcon className="w-5 h-5" />
                         <PlusIcon className="w-3 h-3 -ml-2 -mt-2 bg-white rounded-full" />
                    </div>
                </button>
                
                <div className="w-px h-8 bg-slate-200 mx-1"></div>

                <button
                    onClick={() => setUploadModalOpen(true)}
                    disabled={familyMembers.length === 0}
                    className="flex-shrink-0 bg-brand-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-brand-blue-700 transition flex items-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Upload</span>
                </button>
             </div>
          </div>

          {/* Filter Section */}
          {memberEntries.length > 0 && (
            <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex flex-col lg:flex-row items-start lg:items-end gap-4">
                <div className="flex items-center gap-2 mb-2 lg:mb-0 lg:mr-2">
                   <FilterIcon className="w-5 h-5 text-slate-500" />
                   <span className="text-sm font-semibold text-slate-700">Filter:</span>
                </div>
                <div className="w-full lg:w-auto">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Report Type</label>
                  <select value={filterReportType} onChange={(e) => setFilterReportType(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md py-1.5 px-3 text-sm">
                    <option value="">All Types</option>
                    {uniqueReportTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className="w-full lg:w-auto">
                  <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
                  <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md py-1.5 px-3 text-sm" />
                </div>
                <div className="w-full lg:w-auto">
                  <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
                  <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full bg-white border border-slate-300 rounded-md py-1.5 px-3 text-sm" />
                </div>
                {(filterReportType || filterStartDate || filterEndDate) && (
                  <button onClick={() => { setFilterReportType(''); setFilterStartDate(''); setFilterEndDate(''); }} className="text-sm text-brand-blue-600 hover:text-brand-blue-800 font-medium underline mt-2 lg:mt-0 lg:mb-2 ml-1">Clear</button>
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
            isShared={false} // Everyone is an admin in this model
            isReadOnly={false}
          />
        </div>
      </main>

      <footer className="py-6 text-center text-slate-400 text-sm border-t border-slate-200 mt-8">
        <p>© {new Date().getFullYear()} medHist. v0.2 (Family Group)</p>
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
        <ReportViewerModal isOpen={isViewerOpen} onClose={handleCloseViewer} report={reportToView} />
      )}
      
      {showInviteModal && familyInfo && (
        <InviteSuccessModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          inviteData={{
              familyName: familyInfo.name,
              link: window.location.origin,
              code: familyInfo.joinCode
          }}
        />
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