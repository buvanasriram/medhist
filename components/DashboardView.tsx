
import React, { useState, useMemo } from 'react';
import { Header } from './Header';
import { MemberCard } from './MemberCard';
import { MedicationManager } from './MedicationManager';
import { AddMemberModal } from './AddMemberModal';
import { EditMemberModal } from './EditMemberModal';
import { InviteSuccessModal } from './InviteSuccessModal';
import { UsersIcon } from './icons/UsersIcon';
import { BellIcon } from './icons/BellIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { HealthAssistant } from './HealthAssistant';
import { ReportViewerModal } from './ReportViewerModal';
import { generateDoctorBrief } from '../utils/pdfGenerator';
import type { User, FamilyMember, TimelineEntry, Medication, ReportFile } from '../types';
import * as supabaseService from '../services/supabaseService';
import { getDaysUntil, calculateAge } from '../utils/dateUtils';

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
    isSyncing?: boolean;
}

const CLINICAL_PALETTE = [
    { bg: '#fff1f2', border: '#fda4af' }, // 0. Soft Rose
    { bg: '#f0f9ff', border: '#93c5fd' }, // 1. Soft Sky
    { bg: '#f0fdf4', border: '#86efac' }, // 2. Soft Sage
    { bg: '#fff7ed', border: '#fdba74' }, // 3. Soft Amber
    { bg: '#faf5ff', border: '#d8b4fe' }, // 4. Soft Violet
    { bg: '#f0fdfa', border: '#99f6e4' }, // 5. Soft Mint
    { bg: '#f8fafc', border: '#cbd5e1' }, // 6. Soft Slate
    { bg: '#fefce8', border: '#fde047' }, // 7. Soft Lemon
    { bg: '#f5f3ff', border: '#c4b5fd' }, // 8. Soft Indigo
    { bg: '#fafaf9', border: '#d6d3d1' }, // 9. Soft Stone
];

export const DashboardView: React.FC<DashboardViewProps> = ({ 
    user, onLogout, familyMembers, timelineEntries, medications, familyInfo, onSelectMember, onRefreshData, onOpenGuide, isSyncing = false
}) => {
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [managingMedsMemberId, setManagingMedsMemberId] = useState<string | null>(null);
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    
    const [isViewerOpen, setViewerOpen] = useState(false);
    const [reportToView, setReportToView] = useState<{ url: string, filePath?: string, file: ReportFile } | null>(null);
    const [generatingPdfMemberId, setGeneratingPdfMemberId] = useState<string | null>(null);

    const getLastCheckup = (memberId: string) => {
        const memberEntries = timelineEntries
            .filter(e => e.family_member_id === memberId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return memberEntries.length > 0 ? memberEntries[0].date : undefined;
    };

    const upcomingAppointments = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return timelineEntries
            .filter(entry => {
                if (!entry.follow_up_date) return false;
                const followUp = new Date(entry.follow_up_date);
                // ONLY future appointments show on dashboard
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

    const handleAddMedication = async (data: { name: string, dosage: string, frequency: string, purpose: string, start_date: string }) => {
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

    const handleReactivateMedication = async (id: string) => {
        try {
            await supabaseService.reactivateMedication(id);
            onRefreshData();
        } catch (err) {
            console.error("Error reactivating medication:", err);
            throw err;
        }
    };

    const handleHardDeleteMedication = async (id: string) => {
        try {
            await supabaseService.deleteMedication(id);
            onRefreshData();
        } catch (err) {
            console.error("Error deleting medication:", err);
            throw err;
        }
    };

    const handleViewReport = async (entry: TimelineEntry) => {
        try {
            const result = await supabaseService.getFileForEntry(entry.id);
            if (!result || !result.signedUrl) {
                alert("Could not load report link.");
                return;
            }
            setReportToView({ url: result.signedUrl, filePath: result.filePath, file: result.metadata });
            setViewerOpen(true);
        } catch (error) {
            console.error('Error viewing report', error);
            alert('Error connecting to storage.');
        }
    };

    const handleDownloadBrief = async (memberId: string) => {
        const member = familyMembers.find(m => m.id === memberId);
        if (!member) return;

        setGeneratingPdfMemberId(memberId);
        try {
            const memberMeds = medications.filter(m => m.family_member_id === memberId);
            const memberEntries = timelineEntries.filter(e => e.family_member_id === memberId);
            await generateDoctorBrief(member, memberMeds, memberEntries);
        } catch (e) {
            console.error("Failed to generate PDF:", e);
            alert("Error generating PDF brief. Please try again.");
        } finally {
            setGeneratingPdfMemberId(null);
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-800 flex flex-col relative text-left">
            <Header onLogout={onLogout} userName={user.name} onOpenGuide={onOpenGuide} />
            
            <main className="container mx-auto p-3 sm:p-6 md:p-10 max-w-6xl flex-grow pb-24 z-10">
                
                {/* UPCOMING MILESTONES - List View */}
                {upcomingAppointments.length > 0 && (
                    <div className="mb-6 sm:mb-8 space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                        {upcomingAppointments.map((appt) => (
                            <div 
                                key={appt.id}
                                onClick={() => appt.memberId && onSelectMember(appt.memberId)}
                                className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 flex items-center justify-between p-4 sm:p-5 border-l-4 border-l-rose-700 overflow-hidden cursor-pointer hover:border-slate-300 transition-all active:scale-[0.99] animate-fadeIn"
                            >
                                <div className="flex items-center gap-4 sm:gap-6 flex-grow min-w-0">
                                    <div className="bg-rose-50 p-2.5 sm:p-3.5 rounded-2xl shadow-inner flex-shrink-0 border border-rose-100">
                                        <BellIcon className="w-5 h-5 sm:w-6 sm:h-6 text-rose-700" />
                                    </div>
                                    <div className="min-w-0 flex flex-col gap-1 sm:gap-1.5">
                                        <h2 className="text-sm sm:text-base font-black text-rose-700 tracking-tight leading-tight whitespace-normal">
                                            Review with {appt.doctor_name || "Specialist"}
                                        </h2>
                                        <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight uppercase whitespace-normal">
                                            {appt.memberName} • Appointment {getDaysUntil(appt.follow_up_date!)}
                                        </h2>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 sm:mb-8 gap-3 sm:gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-none mb-1.5 sm:mb-2.5">Family Board</h1>
                        <p className="text-rose-700/40 font-black text-[7px] sm:text-[8px] flex items-center gap-1.5 sm:gap-2 uppercase tracking-[0.3em]">
                            <UsersIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-rose-700" /> {familyInfo?.name || "Family Registry"}
                        </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                            onClick={() => setShowInviteModal(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-[7px] sm:text-[8px] font-black uppercase tracking-[0.1em] text-slate-400 bg-white border border-slate-100 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl transition hover:bg-slate-50 hover:text-rose-700 shadow-sm"
                        >
                            Invite
                        </button>
                        <button 
                            onClick={() => setShowAddMemberModal(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-[7px] sm:text-[8px] font-black uppercase tracking-[0.1em] text-white bg-slate-900 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition shadow-xl hover:bg-rose-900 active:scale-95"
                        >
                            + New Folder
                        </button>
                    </div>
                </div>

                {isSyncing ? (
                    <div className="py-20 flex flex-col items-center justify-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                        <SpinnerIcon className="w-8 h-8 text-rose-700 animate-spin mb-4" />
                        <h3 className="text-lg font-black text-slate-900 tracking-tighter uppercase tracking-[0.1em]">Syncing Records...</h3>
                        <p className="text-rose-700/30 text-[8px] font-black uppercase tracking-[0.4em] mt-2">Precision Security Active</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 relative z-10">
                        {familyMembers.map((member, index) => {
                            const color = CLINICAL_PALETTE[index % CLINICAL_PALETTE.length];
                            return (
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
                                    backgroundColor={color.bg}
                                    borderColor={color.border}
                                />
                            );
                        })}
                        {/* Compact 'New Member' card */}
                        <div 
                            onClick={() => setShowAddMemberModal(true)}
                            className="border-2 border-dashed border-slate-200 p-3 sm:p-4 rounded-3xl flex flex-col items-center justify-center gap-1.5 sm:gap-2 text-slate-300 hover:border-slate-300 hover:bg-slate-50 transition-all group cursor-pointer min-h-[110px] sm:min-h-[140px]"
                        >
                            <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors border border-slate-100">
                                <span className="text-lg sm:text-xl font-light text-slate-400">+</span>
                            </div>
                            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] group-hover:text-slate-600 transition-colors">Add Folder</span>
                        </div>
                    </div>
                )}
            </main>
            
            <HealthAssistant 
                familyMembers={familyMembers}
                timelineEntries={timelineEntries}
                medications={medications}
                userName={user.name}
                userId={user.id}
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
                    onStop={handleStopMedication}
                    onReactivate={handleReactivateMedication}
                    onHardDelete={handleHardDeleteMedication}
                />
            )}

            {isViewerOpen && reportToView && (
                <ReportViewerModal 
                    isOpen={isViewerOpen} 
                    onClose={() => { setViewerOpen(false); setReportToView(null); }} 
                    report={reportToView} 
                />
            )}

            <footer className="py-8 sm:py-12 text-center text-slate-300 text-[8px] font-black uppercase tracking-[0.5em] mt-auto">
                medHist Precision • v1.4.0
            </footer>
        </div>
    );
};
