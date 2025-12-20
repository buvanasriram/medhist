
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
import { HelpCircleIcon } from './icons/HelpCircleIcon';
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
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [isViewerOpen, setViewerOpen] = useState(false);
    const [reportToView, setReportToView] = useState<{ url: string, file: ReportFile } | null>(null);
    const [generatingPdfMemberId, setGeneratingPdfMemberId] = useState<string | null>(null);

    const handleSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            await onRefreshData();
        } catch (e) {
            console.error("Sync failed:", e);
        } finally {
            setTimeout(() => setIsSyncing(false), 1200);
        }
    };

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
            const { generateDoctorBrief } = await import('../utils/pdfGenerator');
            const memberMeds = medications.filter(m => m.family_member_id === memberId);
            const memberEntries = timelineEntries.filter(e => e.family_member_id === memberId);
            await generateDoctorBrief(member, memberMeds, memberEntries);
        } catch (e) {
            console.error("Failed to load PDF generator:", e);
        } finally {
            setGeneratingPdfMemberId(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col relative">
            <Header onLogout={onLogout} userName={user.name} onOpenGuide={onOpenGuide} />
            
            <main className="container mx-auto p-4 md:p-8 max-w-6xl flex-grow pb-24 z-10">
                
                {upcomingAppointments.length > 0 && (
                    <div className="mb-8 bg-white rounded-xl shadow-sm border border-brand-blue-100 overflow-hidden text-left">
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
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                                                    {getDaysUntil(appt.follow_up_date!)}
                                                </span>
                                                <h3 className="font-bold text-slate-800 truncate">{appt.memberName}</h3>
                                            </div>
                                            <p className="text-sm text-slate-600 font-medium truncate">
                                                {appt.doctor_name ? `Dr. ${appt.doctor_name}` : appt.report_type}
                                            </p>
                                        </div>
                                    </div>
                                    {appt.memberId && (
                                        <button 
                                            onClick={() => onSelectMember(appt.memberId!)}
                                            className="p-3 text-brand-blue-600 active:bg-brand-blue-50 rounded-full transition"
                                        >
                                            <ArrowRightIcon className="w-6 h-6" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 text-left">
                    <div className="z-10">
                        <h1 className="text-2xl font-bold text-slate-900">Family Health Board</h1>
                        <p className="text-slate-500 flex items-center gap-2 mt-1">
                            <UsersIcon className="w-4 h-4" /> {familyInfo?.name || "My Family"}
                        </p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto z-20">
                        <button 
                            onClick={() => setShowInviteModal(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-bold text-brand-blue-600 bg-white border border-brand-blue-200 hover:bg-brand-blue-50 px-5 py-3.5 rounded-xl transition shadow-sm active:scale-95 pointer-events-auto"
                        >
                            <KeyIcon className="w-4 h-4" /> Invite
                        </button>
                        <button 
                            onClick={() => setShowAddMemberModal(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-bold text-white bg-brand-blue-600 hover:bg-brand-blue-700 px-5 py-3.5 rounded-xl transition shadow-md active:scale-95 pointer-events-auto"
                        >
                            <PlusIcon className="w-4 h-4" /> Add
                        </button>
                    </div>
                </div>

                {familyMembers.length === 0 ? (
                    <div className="text-center py-12 md:py-20 bg-white rounded-2xl shadow-lg border border-slate-100 p-8 flex flex-col items-center z-30 relative">
                        <div className="bg-slate-50 p-6 rounded-full mb-6">
                           <UserIcon className="w-16 h-16 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Your Dashboard is Empty</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
                            Log in again or try a manual sync if you're expecting family data here.
                        </p>
                        
                        <div className="flex flex-col gap-4 w-full max-w-xs relative z-40">
                            <button 
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="w-full inline-flex items-center justify-center gap-3 bg-brand-blue-600 text-white font-bold px-6 py-4.5 rounded-2xl hover:bg-brand-blue-700 transition active:scale-95 pointer-events-auto shadow-lg touch-manipulation"
                            >
                                {isSyncing ? <SpinnerIcon className="w-6 h-6 animate-spin" /> : <UsersIcon className="w-6 h-6" />}
                                Sync Data Now
                            </button>

                            <button 
                                onClick={onLogout}
                                className="w-full inline-flex items-center justify-center gap-3 text-red-500 bg-red-50 border border-red-100 font-bold px-6 py-4.5 rounded-2xl hover:bg-red-100 transition active:scale-95 pointer-events-auto touch-manipulation"
                                aria-label="Log Out"
                            >
                                <UserIcon className="w-6 h-6" /> Log Out
                            </button>

                            <button 
                                onClick={onOpenGuide}
                                className="inline-flex items-center justify-center gap-2 text-slate-400 font-bold px-5 py-3 hover:text-brand-blue-600 transition text-xs pointer-events-auto"
                            >
                                <HelpCircleIcon className="w-4 h-4" /> Need help? View Guide
                            </button>
                        </div>
                        
                        <div className="mt-10 text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-60">
                           {user.email}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left relative z-10">
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
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-60">
                  <div className="bg-white p-6 rounded-2xl flex items-center gap-4 shadow-2xl">
                     <SpinnerIcon className="w-8 h-8 animate-spin text-brand-blue-600" />
                     <span className="text-slate-700 font-bold">Opening...</span>
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

            <footer className="py-8 text-center text-slate-400 text-[10px] font-bold border-t border-slate-100 mt-auto bg-white uppercase tracking-widest relative z-0">
                <p>© {new Date().getFullYear()} medHist. v0.5.1</p>
            </footer>
        </div>
    );
};
