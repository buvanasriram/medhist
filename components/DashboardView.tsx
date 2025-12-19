
import React, { useState, useMemo, Suspense } from 'react';
import { Header } from './Header';
import { MemberCard } from './MemberCard';
import { MedicationManager } from './MedicationManager';
import { AddMemberModal } from './AddMemberModal';
import { EditMemberModal } from './EditMemberModal';
import { InviteSuccessModal } from './InviteSuccessModal';
import { PlusIcon } from './icons/PlusIcon';
import { KeyIcon } from './icons/KeyIcon';
import { UsersIcon } from './icons/UsersIcon';
import { UserIcon } from './icons/UserIcon';
import { BellIcon } from './icons/BellIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { HealthAssistant } from './HealthAssistant';
import type { User, FamilyMember, TimelineEntry, Medication, ReportFile } from '../types';
import * as supabaseService from '../services/supabaseService';

// Lazy load the heavy PDF viewer component
const ReportViewerModal = React.lazy(() => 
  import('./ReportViewerModal').then(module => ({ default: module.ReportViewerModal }))
);

interface DashboardViewProps {
    user: User;
    onLogout: () => void;
    familyMembers: FamilyMember[];
    timelineEntries: TimelineEntry[];
    medications: Medication[];
    familyInfo: { name: string, joinCode: string } | null;
    onSelectMember: (memberId: string) => void;
    onRefreshData: () => void;
    onOpenGuide?: () => void;
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

const getDaysUntil = (dateString: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateString);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `In ${diffDays} days`;
};

export const DashboardView: React.FC<DashboardViewProps> = ({ 
    user, onLogout, familyMembers, timelineEntries, medications, familyInfo, onSelectMember, onRefreshData, onOpenGuide
}) => {
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [managingMedsMemberId, setManagingMedsMemberId] = useState<string | null>(null);
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    
    // Viewer State
    const [isViewerOpen, setViewerOpen] = useState(false);
    const [reportToView, setReportToView] = useState<{ url: string, file: ReportFile } | null>(null);
    
    // PDF Gen State
    const [generatingPdfMemberId, setGeneratingPdfMemberId] = useState<string | null>(null);

    const getLastCheckup = (memberId: string) => {
        const memberEntries = timelineEntries
            .filter(e => e.family_member_id === memberId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return memberEntries.length > 0 ? memberEntries[0].date : undefined;
    };

    // Calculate Upcoming Appointments
    const upcomingAppointments = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return timelineEntries
            .filter(entry => {
                if (!entry.follow_up_date) return false;
                const followUp = new Date(entry.follow_up_date);
                return followUp >= today;
            })
            .sort((a, b) => new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime())
            .map(entry => {
                const member = familyMembers.find(m => m.id === entry.family_member_id);
                return {
                    ...entry,
                    memberName: member?.name || 'Unknown Member',
                    memberId: member?.id
                };
            });
    }, [timelineEntries, familyMembers]);

    const getActiveMemberMeds = (memberId: string) => 
        medications.filter(m => m.family_member_id === memberId && m.active);

    const getAllMemberMeds = (memberId: string) => 
        medications.filter(m => m.family_member_id === memberId);

    const handleAddMember = async (details: { name: string; relationship: string; dob: string; }) => {
        await supabaseService.addFamilyMember(details);
        setShowAddMemberModal(false);
        onRefreshData();
    };

    const handleAddMedication = async (data: { name: string, dosage: string, frequency: string, purpose: string }) => {
        if(managingMedsMemberId) {
            await supabaseService.addMedication({ family_member_id: managingMedsMemberId, ...data });
            onRefreshData();
        }
    };

    const handleStopMedication = async (id: string) => {
        try {
            await supabaseService.stopMedication(id);
            onRefreshData();
        } catch (err) {
            console.error("Error stopping medication:", err);
            throw err;
        }
    };

    const handleViewReport = async (entry: TimelineEntry) => {
        try {
            const result = await supabaseService.getFileForEntry(entry.id);
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
    };

    const handleDownloadBrief = async (memberId: string) => {
        const member = familyMembers.find(m => m.id === memberId);
        if (!member) return;

        setGeneratingPdfMemberId(memberId);
        try {
            // Dynamic Import to completely isolate the PDF generator dependency
            const { generateDoctorBrief } = await import('../utils/pdfGenerator');
            
            const memberMeds = medications.filter(m => m.family_member_id === memberId);
            const memberEntries = timelineEntries.filter(e => e.family_member_id === memberId);
            
            await generateDoctorBrief(member, memberMeds, memberEntries);
        } catch (e) {
            console.error("Failed to load PDF generator:", e);
            alert("Failed to initialize PDF generator. Please try again.");
        } finally {
            setGeneratingPdfMemberId(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
            <Header onLogout={onLogout} userName={user.name} onOpenGuide={onOpenGuide} />
            
            <main className="container mx-auto p-4 md:p-8 max-w-6xl flex-grow pb-24">
                
                {upcomingAppointments.length > 0 && (
                    <div className="mb-8 bg-white rounded-xl shadow-sm border border-brand-blue-100 overflow-hidden">
                        <div className="bg-brand-blue-50 px-6 py-3 border-b border-brand-blue-100 flex items-center gap-2">
                            <BellIcon className="w-5 h-5 text-brand-blue-600" />
                            <h2 className="font-bold text-brand-blue-800">Upcoming Appointments</h2>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {upcomingAppointments.map(appt => (
                                <div key={appt.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between group">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 bg-brand-blue-100 text-brand-blue-700 w-16 h-16 rounded-lg flex flex-col items-center justify-center border border-brand-blue-200">
                                            <span className="text-xs font-bold uppercase">{new Date(appt.follow_up_date!).toLocaleString('default', { month: 'short' })}</span>
                                            <span className="text-2xl font-bold leading-none">{new Date(appt.follow_up_date!).getDate()}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                    {getDaysUntil(appt.follow_up_date!)}
                                                </span>
                                                <h3 className="font-bold text-slate-800">{appt.memberName}</h3>
                                            </div>
                                            <p className="text-sm text-slate-600 font-medium">
                                                {appt.doctor_name ? `Dr. ${appt.doctor_name}` : appt.report_type}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate max-w-md">
                                                {appt.facility_name ? `${appt.facility_name} • ` : ''}{appt.summary}
                                            </p>
                                        </div>
                                    </div>
                                    {appt.memberId && (
                                        <button 
                                            onClick={() => onSelectMember(appt.memberId!)}
                                            className="opacity-0 group-hover:opacity-100 text-brand-blue-600 hover:text-brand-blue-800 font-medium text-sm flex items-center gap-1 transition-opacity"
                                        >
                                            View Details <ArrowRightIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Family Health Board</h1>
                        <p className="text-slate-500 flex items-center gap-2 mt-1">
                            <UsersIcon className="w-4 h-4" /> {familyInfo?.name || "My Family"}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowInviteModal(true)}
                            className="flex items-center gap-2 text-sm font-medium text-brand-blue-600 bg-white border border-brand-blue-200 hover:bg-brand-blue-50 px-4 py-2 rounded-lg transition shadow-sm"
                        >
                            <KeyIcon className="w-4 h-4" /> Invite
                        </button>
                        <button 
                            onClick={() => setShowAddMemberModal(true)}
                            className="flex items-center gap-2 text-sm font-medium text-white bg-brand-blue-600 hover:bg-brand-blue-700 px-4 py-2 rounded-lg transition shadow-md"
                        >
                            <PlusIcon className="w-4 h-4" /> Add Member
                        </button>
                    </div>
                </div>

                {familyMembers.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-200">
                        <UserIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700">No Family Members Yet</h3>
                        <p className="text-slate-500 mb-6">Add yourself or a family member to get started.</p>
                        <button 
                            onClick={() => setShowAddMemberModal(true)}
                            className="inline-flex items-center gap-2 bg-brand-blue-600 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-brand-blue-700 transition"
                        >
                            <PlusIcon className="w-5 h-5" /> Add First Member
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {familyMembers.map(member => (
                            <MemberCard 
                                key={member.id}
                                member={member}
                                age={calculateAge(member.dob)}
                                lastCheckupDate={getLastCheckup(member.id)}
                                medications={getActiveMemberMeds(member.id)}
                                isMe={member.linked_user_id === user.id}
                                isGeneratingPdf={generatingPdfMemberId === member.id}
                                onSelect={() => onSelectMember(member.id)}
                                onManageMeds={() => setManagingMedsMemberId(member.id)}
                                onDownloadBrief={() => handleDownloadBrief(member.id)}
                                onEdit={() => setEditingMemberId(member.id)}
                            />
                        ))}
                    </div>
                )}
            </main>
            
            <HealthAssistant 
                familyMembers={familyMembers}
                timelineEntries={timelineEntries}
                medications={medications}
                userName={user.name}
                onViewReport={handleViewReport}
            />

            {showAddMemberModal && (
                <AddMemberModal 
                    isOpen={showAddMemberModal} 
                    onClose={() => setShowAddMemberModal(false)} 
                    onAddMember={handleAddMember} 
                />
            )}
            
            {editingMemberId && (
                <EditMemberModal
                    isOpen={!!editingMemberId}
                    onClose={() => setEditingMemberId(null)}
                    member={familyMembers.find(m => m.id === editingMemberId)!}
                    currentUser={user}
                    onUpdate={onRefreshData}
                />
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

            {managingMedsMemberId && (
                <MedicationManager 
                    isOpen={!!managingMedsMemberId}
                    onClose={() => setManagingMedsMemberId(null)}
                    memberName={familyMembers.find(m => m.id === managingMedsMemberId)?.name || 'Member'}
                    medications={getAllMemberMeds(managingMedsMemberId)}
                    onAdd={handleAddMedication}
                    onDelete={handleStopMedication}
                />
            )}

            {isViewerOpen && reportToView && (
              <Suspense fallback={
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                  <div className="bg-white p-4 rounded-lg flex items-center gap-3">
                     <SpinnerIcon className="w-6 h-6 animate-spin text-brand-blue-600" />
                     <span className="text-slate-700 font-medium">Loading Viewer...</span>
                  </div>
                </div>
              }>
                <ReportViewerModal 
                    isOpen={isViewerOpen} 
                    onClose={() => { setViewerOpen(false); setReportToView(null); }} 
                    report={reportToView} 
                />
              </Suspense>
            )}

            <footer className="py-6 text-center text-slate-400 text-sm border-t border-slate-200 mt-auto bg-white">
                <p>© {new Date().getFullYear()} medHist. v0.5.1</p>
            </footer>
        </div>
    );
};
