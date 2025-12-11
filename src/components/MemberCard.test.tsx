
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemberCard } from './MemberCard';

describe('MemberCard Component', () => {
    const mockMember = {
        id: '1',
        family_id: 'fam1',
        name: 'John Doe',
        relationship: 'Father',
        dob: '1980-01-01'
    };

    const mockMeds = [
        { id: 'm1', name: 'Aspirin', active: true, family_member_id: '1' }
    ];

    it('renders member name and relationship correctly', () => {
        render(
            <MemberCard 
                member={mockMember} 
                age={43} 
                medications={[]} 
                isMe={false} 
                onSelect={() => {}} 
                onManageMeds={() => {}} 
            />
        );

        expect(screen.getByText('John Doe')).toBeDefined();
        expect(screen.getByText(/Father/)).toBeDefined();
        expect(screen.getByText(/43 yrs/)).toBeDefined();
    });

    it('shows active medication count', () => {
        render(
            <MemberCard 
                member={mockMember} 
                age={43} 
                medications={mockMeds as any} 
                isMe={false} 
                onSelect={() => {}} 
                onManageMeds={() => {}} 
            />
        );

        expect(screen.getByText(/1 Active Meds/)).toBeDefined();
        expect(screen.getByText(/Aspirin/)).toBeDefined();
    });

    it('calls onSelect when clicked', () => {
        const handleSelect = vi.fn();
        render(
            <MemberCard 
                member={mockMember} 
                age={43} 
                medications={[]} 
                isMe={false} 
                onSelect={handleSelect} 
                onManageMeds={() => {}} 
            />
        );

        const cardTitle = screen.getByText('John Doe');
        fireEvent.click(cardTitle);
        expect(handleSelect).toHaveBeenCalled();
    });
});
