
import { describe, it, expect } from 'vitest';
import { calculateAge, getDaysUntil } from './dateUtils';

describe('Date Utilities', () => {
    describe('calculateAge', () => {
        it('should return null for missing DOB', () => {
            expect(calculateAge(null)).toBeNull();
            expect(calculateAge(undefined)).toBeNull();
        });

        it('should calculate age correctly', () => {
            const today = new Date();
            const year = today.getFullYear();
            
            // Born 20 years ago, birthday passed
            const dobPassed = `${year - 20}-01-01`; 
            expect(calculateAge(dobPassed)).toBe(20);

            // Born 20 years ago, birthday hasn't happened yet (set month to Dec)
            const dobFuture = `${year - 20}-12-31`;
            // If today is Dec 31, they are 20, else 19. 
            // To be safe in test, let's just pick a generic case or mock the date.
            // For simplicity, we assume we aren't running this on Dec 31st for the failure case.
            if (today.getMonth() !== 11 || today.getDate() !== 31) {
                expect(calculateAge(dobFuture)).toBe(19);
            }
        });
    });

    describe('getDaysUntil', () => {
        it('should return "Today" for current date', () => {
            const today = new Date().toISOString();
            expect(getDaysUntil(today)).toBe("Today");
        });

        it('should return "Tomorrow" for next day', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            expect(getDaysUntil(tomorrow.toISOString())).toBe("Tomorrow");
        });
    });
});
