
import React, { useState, useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { UserIcon } from './icons/UserIcon';
import { BuildingIcon } from './icons/BuildingIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import type { TimelineEntry } from '../types';
import * as supabaseService from '../services/supabaseService';

interface EditTimelineEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: TimelineEntry;
  onUpdate: () => void;
}

export const EditTimelineEntryModal: React.FC<EditTimelineEntryModalProps> = ({ isOpen, onClose, entry, onUpdate }) => {
  const [date, setDate] = useState(entry.date);
  const [reportType, setReportType] = useState(entry.report_type);
  const [summary, setSummary] = useState(entry.summary || '');
  const [doctorName, setDoctorName] = useState(entry.doctor_name || '');
  const [facilityName, setFacilityName] = useState(entry.facility_name || '');
  const [patientName, setPatientName] = useState(entry.patient_name || '');
  const [followUpDate, setFollowUpDate] = useState(entry.follow_up_date || '');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDate(entry.date);
      setReportType(entry.report_type);
      setSummary(entry.summary || '');
      setDoctorName(entry.doctor_name || '');
      setFacilityName(entry.facility_name || '');
      setPatientName(entry.patient_name || '');
      setFollowUpDate(entry.follow_up_date || '');
      setError(null);
    }
  }, [isOpen, entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await supabaseService.updateTimelineEntry(entry.id, {
        date,
        report_type: reportType,
        summary,
        doctor_name: doctorName,
        facility_name: facilityName,
        patient_name: patientName,
        follow_up_date: followUpDate || null
      });
      onUpdate();
      onClose();
    } catch (err: any) {
      console.error("Update failed:", err);
      setError(err.message || "Failed to save changes.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative overflow-hidden border border-slate-100 flex flex-col max-h-[95vh]">
        
        <div className="p-6 border-b border-slate-100 bg-white z-10 text-left">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] font-black text-rose-700 uppercase tracking-[0.3em] mb-1 leading-none">Record Correction</p>
              <h2 className="text-xl font-black text-slate-900 tracking-tighter leading-none">Edit Clinical Entry</h2>
            </div>
            <button onClick={onClose} className="p-1 text-slate-300 hover:text-slate-900 transition" disabled={isLoading}>
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-6 pt-4 text-left">
          <form id="editEntryForm" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Clinical Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-700" />
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 font-bold text-xs focus:border-rose-500 outline-none transition"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Report Type</label>
                <input 
                  type="text" 
                  value={reportType} 
                  onChange={e => setReportType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4 text-slate-900 font-bold text-xs focus:border-rose-500 outline-none transition"
                  placeholder="e.g. Lab Report"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Clinical Summary</label>
              <textarea 
                value={summary} 
                onChange={e => setSummary(e.target.value)}
                rows={4}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4 text-slate-900 font-bold text-xs focus:border-rose-500 outline-none transition resize-none"
                placeholder="Briefly describe the findings..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Doctor Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-700" />
                  <input 
                    type="text" 
                    value={doctorName} 
                    onChange={e => setDoctorName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 font-bold text-xs focus:border-rose-500 outline-none transition"
                    placeholder="Dr. Name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Facility</label>
                <div className="relative">
                  <BuildingIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-700" />
                  <input 
                    type="text" 
                    value={facilityName} 
                    onChange={e => setFacilityName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 font-bold text-xs focus:border-rose-500 outline-none transition"
                    placeholder="Hospital/Lab"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Patient Name on File</label>
                <input 
                  type="text" 
                  value={patientName} 
                  onChange={e => setPatientName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4 text-slate-900 font-bold text-xs focus:border-rose-500 outline-none transition"
                  placeholder="Name as written"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Follow-up Date</label>
                <input 
                  type="date" 
                  value={followUpDate} 
                  onChange={e => setFollowUpDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4 text-slate-900 font-bold text-xs focus:border-rose-500 outline-none transition"
                />
              </div>
            </div>

            {error && <p className="text-[10px] font-black text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
          </form>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 z-10 flex gap-3">
          <button onClick={onClose} disabled={isLoading} className="flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition">
            Cancel
          </button>
          <button 
            form="editEntryForm" 
            type="submit" 
            disabled={isLoading} 
            className="flex-[2] bg-slate-900 text-white font-black py-3.5 rounded-2xl shadow-xl hover:bg-rose-900 transition active:scale-95 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {isLoading ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : 'Save Corrections'}
          </button>
        </div>
      </div>
    </div>
  );
};
