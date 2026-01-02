
import React, { useState } from 'react';
import type { Medication } from '../types';
import { PillIcon } from './icons/PillIcon';
import { StopCircleIcon } from './icons/StopCircleIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CloseIcon } from './icons/CloseIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { ConfirmationModal } from './ConfirmationModal';
import { CalendarIcon } from './icons/CalendarIcon';

interface MedicationManagerProps {
  isOpen: boolean;
  onClose: () => void;
  medications: Medication[];
  onAdd: (data: { name: string, dosage: string, frequency: string, purpose: string, start_date: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  memberName: string;
}

export const MedicationManager: React.FC<MedicationManagerProps> = ({ isOpen, onClose, medications, onAdd, onDelete, memberName }) => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const [isAdding, setIsAdding] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isStoppingId, setIsStoppingId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [medToStop, setMedToStop] = useState<string | null>(null);
  const [optimisticStoppedIds, setOptimisticStoppedIds] = useState<Set<string>>(new Set());

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!name) return;
    setIsAdding(true);
    setError(null);
    try {
        await onAdd({ name, dosage, frequency, purpose, start_date: startDate });
        setName('');
        setDosage('');
        setFrequency('');
        setPurpose('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setIsAddFormOpen(false); 
    } catch (error) {
        console.error("Failed to add medication:", error);
        setError("Failed to add medication. Please try again.");
    } finally {
        setIsAdding(false);
    }
  };

  const confirmStop = async () => {
      const id = medToStop;
      if (!id) return;

      setMedToStop(null);
      setIsStoppingId(id);
      setError(null);
      setOptimisticStoppedIds(prev => new Set(prev).add(id));

      try {
          await onDelete(id);
      } catch (error) {
          setError("Failed to update medication status.");
          setOptimisticStoppedIds(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
          });
      } finally {
          setIsStoppingId(null);
      }
  }

  const displayedMeds = showHistory 
      ? medications 
      : medications.filter(m => m.active && !optimisticStoppedIds.has(m.id));

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg relative max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-start justify-between bg-white z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
              <div className="bg-rose-50 p-3 rounded-xl shadow-inner border border-rose-100">
                  <PillIcon className="w-6 h-6 text-rose-700" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-rose-700 uppercase tracking-[0.3em] mb-1 leading-none">Pharmacy Registry</p>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{memberName}</h2>
              </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-900 transition">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto p-8 pt-6 pb-6 scroll-smooth">
            {error && <div className="mb-6 p-4 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-red-100 text-left">{error}</div>}

            <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    {showHistory ? "Full Dispense History" : "Current Medication"}
                </h3>
                <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-[9px] font-black uppercase tracking-widest text-rose-700 hover:underline decoration-rose-200"
                >
                    {showHistory ? "Show Active Only" : "Show Full History"}
                </button>
            </div>

            <div className="space-y-4">
                {displayedMeds.length === 0 ? (
                    <div className="text-center py-16 text-slate-300 border-2 border-dashed border-slate-50 rounded-[2rem] bg-slate-50/50">
                        <PillIcon className="w-10 h-10 mx-auto mb-4 opacity-30" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">{showHistory ? "No records found." : "No active medication."}</p>
                    </div>
                ) : (
                    displayedMeds.map(med => {
                        const isStopped = !med.active;
                        const isOptimisticStop = optimisticStoppedIds.has(med.id);
                        
                        return (
                        <div key={med.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 text-left ${isStopped || isOptimisticStop ? 'bg-slate-50/50 border-slate-100 grayscale opacity-60' : 'bg-white border-slate-100 shadow-sm shadow-slate-200/40 hover:shadow-md'}`}>
                            <div className="min-w-0 pr-4">
                                <h4 className={`text-base font-black tracking-tight ${isStopped || isOptimisticStop ? 'text-slate-400' : 'text-slate-900'}`}>
                                    {med.name}
                                </h4>
                                <div className="text-[10px] text-slate-400 font-bold tracking-tight mt-0.5 space-y-1">
                                    <p className="uppercase tracking-widest">{med.dosage || '-'} • {med.frequency || '-'}</p>
                                    {med.purpose && <p className="text-rose-700 font-black uppercase tracking-wider">{med.purpose}</p>}
                                    <div className="flex items-center gap-2 mt-2 opacity-60">
                                        {med.start_date && (
                                            <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5"/> Start: {new Date(med.start_date).toLocaleDateString()}</span>
                                        )}
                                        {med.stopped_at && isStopped && (
                                            <span className="text-red-700 font-black ml-1">• Stopped: {new Date(med.stopped_at).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {!isStopped && !isOptimisticStop && (
                                <button 
                                    onClick={() => setMedToStop(med.id)}
                                    className="p-3 text-slate-200 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                                    title="Discontinue Medication"
                                    disabled={!!isStoppingId}
                                >
                                    {isStoppingId === med.id ? (
                                        <SpinnerIcon className="w-5 h-5 animate-spin text-rose-700" />
                                    ) : (
                                        <StopCircleIcon className="w-6 h-6" />
                                    )}
                                </button>
                            )}
                        </div>
                    )})
                )}
            </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-6 bg-white border-t border-slate-100 z-20 flex-shrink-0">
            {!isAddFormOpen ? (
                <button 
                    onClick={() => setIsAddFormOpen(true)}
                    className="w-full flex items-center justify-center gap-3 bg-slate-100 hover:bg-slate-900 text-slate-600 hover:text-white px-8 py-3.5 rounded-2xl transition-all shadow-sm text-[9px] font-black uppercase tracking-[0.2em]"
                >
                    <PlusIcon className="w-4 h-4" /> Add Manual Medication
                </button>
            ) : (
                <div className="bg-rose-50/80 p-6 rounded-[2rem] border border-rose-100/50 animate-fadeIn text-left">
                    <form id="addMedForm" onSubmit={handleAdd} className="space-y-3">
                        <div className="flex items-center justify-between mb-1">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-700">New Clinical Record</h4>
                            <button type="button" onClick={() => setIsAddFormOpen(false)} className="text-slate-300 hover:text-rose-700 transition"><CloseIcon className="w-4 h-4"/></button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            <input 
                                type="text" 
                                placeholder="Drug Name (e.g. Metformin)" 
                                className="w-full bg-white border border-rose-200/50 rounded-xl py-3 px-4 text-xs font-bold text-slate-900 placeholder-slate-300 focus:outline-none focus:border-rose-500 transition shadow-sm"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                disabled={isAdding}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input 
                                    type="text" 
                                    placeholder="Dosage (500mg)" 
                                    className="w-full bg-white border border-rose-200/50 rounded-xl py-3 px-4 text-xs font-bold text-slate-900 placeholder-slate-300 focus:outline-none focus:border-rose-500 transition shadow-sm"
                                    value={dosage}
                                    onChange={e => setDosage(e.target.value)}
                                    disabled={isAdding}
                                />
                                <input 
                                    type="text" 
                                    placeholder="Freq (2x Daily)" 
                                    className="w-full bg-white border border-rose-200/50 rounded-xl py-3 px-4 text-xs font-bold text-slate-900 placeholder-slate-300 focus:outline-none focus:border-rose-500 transition shadow-sm"
                                    value={frequency}
                                    onChange={e => setFrequency(e.target.value)}
                                    disabled={isAdding}
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <label className="text-[8px] font-black uppercase tracking-widest text-rose-400 pl-1">Protocol Start Date</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-white border border-rose-200/50 rounded-xl py-3 px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500 transition shadow-sm"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    disabled={isAdding}
                                    required
                                />
                            </div>
                        </div>
                        
                        <button 
                            type="submit" 
                            className="w-full bg-slate-900 hover:bg-rose-700 text-white font-black py-4 rounded-2xl shadow-xl transition active:scale-95 flex justify-center items-center gap-3 text-[10px] uppercase tracking-[0.2em] mt-2"
                            disabled={isAdding}
                        >
                            {isAdding ? <><SpinnerIcon className="w-4 h-4 animate-spin"/> Syncing...</> : 'Save to Registry'}
                        </button>
                    </form>
                </div>
            )}
        </div>
      </div>
    </div>
    
    <ConfirmationModal
        isOpen={!!medToStop}
        onClose={() => setMedToStop(null)}
        onConfirm={confirmStop}
        title="Discontinue Medication?"
        message="This will move the protocol to archive history. It remains searchable in the full timeline."
    />
    </>
  );
};
