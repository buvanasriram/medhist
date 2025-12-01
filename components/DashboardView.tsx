
import React, { useState } from 'react';
import { Header } from './Header';
import { MemberCard } from './MemberCard';
import { MedicationManager } from './MedicationManager';
import { AddMemberModal } from './AddMemberModal';
import { InviteSuccessModal } from './InviteSuccessModal';
import { PlusIcon } from './icons/PlusIcon';
import { KeyIcon } from './icons/KeyIcon';
import { UsersIcon } from './icons/UsersIcon';
import { UserIcon } from './icons/UserIcon';
import type { User, FamilyMember, TimelineEntry, Medication } from '../types';
import * as supabaseService from '../services/supabaseService';

interface DashboardViewProps {
    user: User;
    onLogout: () => void;
    familyMembers: FamilyMember[];
    timelineEntries: TimelineEntry[];
    medications: Medication[];
    familyInfo: { name: string, joinCode: string } | null;
    onSelectMember: (memberId: string) => void;
    onRefreshData: () => void;
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

export const DashboardView: React.FC<DashboardViewProps> = ({ 
    user, onLogout, familyMembers, timelineEntries, medications, familyInfo, onSelectMember, onRefreshData
}) => {
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [managingMedsMemberId, setManagingMedsMemberId] = useState<string | null>(null);

    const getLastCheckup = (memberId: string) => {
        const memberEntries = timelineEntries
            .filter(e => e.family_member_id === memberId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return memberEntries.length > 0 ? memberEntries[0].date : undefined;
    };

    // Dashboard only shows ACTIVE medications on the summary card
    const getActiveMemberMeds = (memberId: string) => 
        medications.filter(m => m.family_member_id === memberId && m.active);

    // Manager needs ALL medications to allow history view
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
            throw err; // Re-throw to be caught by MedicationManager
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
            <Header onLogout={onLogout} userName={user.name} />
            
            <main className="container mx-auto p-4 md:p-8 max-w-6xl flex-grow">
                {/* Family Header */}
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

                {/* Dashboard Grid */}
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
                                onSelect={() => onSelectMember(member.id)}
                                onManageMeds={() => setManagingMedsMemberId(member.id)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Modals */}
            {showAddMemberModal && (
                <AddMemberModal 
                    isOpen={showAddMemberModal} 
                    onClose={() => setShowAddMemberModal(false)} 
                    onAddMember={handleAddMember} 
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

            <footer className="py-6 text-center text-slate-400 text-sm border-t border-slate-200 mt-auto bg-white">
                <p>© {new Date().getFullYear()} medHist. v0.3.0</p>
            </footer>
        </div>
    );
};