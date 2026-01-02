
import React, { useState, useMemo } from 'react';
import { Header } from './Header';
import { MemberCard } from './MemberCard';
import { MedicationManager } from './MedicationManager';
import { AddMemberModal } from './AddMemberModal';
import { EditMemberModal } from './EditMemberModal';
import { InviteSuccessModal } from './InviteSuccessModal';
import { UsersIcon } from './icons/UsersIcon';
import { BellIcon } from './icons/BellIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
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

    const handleViewReport = async (entry: TimelineEntry) => {
        try {
            const result = await supabaseService.getFileForEntry(entry.id);
            if (!result) {
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
            
            <main className="container mx-auto p-4 sm:p-6 md:p-10 max-w-6xl flex-grow pb-24 z-10">
                
                {/* UPCOMING MILESTONES - Compact Directive */}
                {upcomingAppointments.length > 0 && (
                    <div className="mb-8 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 flex items-center justify-between p-5 border-l-4 border-l-amber-400">
                        <div className="flex items-center gap-4">
                            <div className="bg-amber-50 p-2.5 rounded-xl shadow-inner">
                                <BellIcon className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em] leading-none mb-1">Priority Directive</p>
                                <h2 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                                    Book follow-up with {upcomingAppointments[0].doctor_name || "Specialist"}
                                </h2>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                    Member: {upcomingAppointments[0].memberName} • {getDaysUntil(upcomingAppointments[0].follow_up_date!)}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => upcomingAppointments[0].memberId && onSelectMember(upcomingAppointments[0].memberId)}
                            className="bg-slate-50 p-2 rounded-full text-slate-300 hover:text-rose-700 hover:bg-rose-50 transition-all shadow-sm"
                        >
                            <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter leading-none mb-3">Family Board</h1>
                        <p className="text-rose-700/40 font-black text-[9px] flex items-center gap-2 uppercase tracking-[0.3em]">
                            <UsersIcon className="w-4 h-4 text-rose-700" /> {familyInfo?.name || "Family Hub"}
                        </p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button 
                            onClick={() => setShowInviteModal(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 bg-white border border-slate-100 px-6 py-3.5 rounded-xl transition hover:bg-slate-50 hover:text-rose-700 shadow-sm"
                        >
                            Invite
                        </button>
                        <button 
                            onClick={() => setShowAddMemberModal(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.1em] text-white bg-slate-900 px-8 py-3.5 rounded-xl transition shadow-xl hover:bg-rose-900 active:scale-95"
                        >
                            + New Member
                        </button>
                    </div>
                </div>

                {isSyncing ? (
                    <div className="py-24 flex flex-col items-center justify-center bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                        <SpinnerIcon className="w-10 h-10 text-rose-700 animate-spin mb-6" />
                        <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase tracking-[0.1em]">Syncing Precision Records...</h3>
                        <p className="text-rose-700/30 text-[9px] font-black uppercase tracking-[0.4em] mt-2 italic">Clinical Environment Secure</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 relative z-10">
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
                <ReportViewerModal 
                    isOpen={isViewerOpen} 
                    onClose={() => { setViewerOpen(false); setReportToView(null); }} 
                    report={reportToView} 
                />
            )}

            <footer className="py-16 text-center text-slate-300 text-[9px] font-black uppercase tracking-[0.5em] mt-auto">
                medHist Precision • v0.9.9
            </footer>
        </div>
    );
};
