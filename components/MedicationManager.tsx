
import React, { useState } from 'react';
import type { Medication } from '../types';
import { PillIcon } from './icons/PillIcon';
import { StopCircleIcon } from './icons/StopCircleIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CloseIcon } from './icons/CloseIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { ConfirmationModal } from './ConfirmationModal';
import { CalendarIcon } from './icons/CalendarIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronUpIcon } from './icons/ChevronUpIcon';

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
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Default to today

  const [isAdding, setIsAdding] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isStoppingId, setIsStoppingId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmation State
  const [medToStop, setMedToStop] = useState<string | null>(null);

  // Optimistic State
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
        // We keep the form open to allow rapid entry of multiple meds
    } catch (error) {
        console.error("Failed to add medication:", error);
        setError("Failed to add medication. Please try again.");
    } finally {
        setIsAdding(false);
    }
  };

  const requestStop = (id: string) => {
      setMedToStop(id);
  }

  const confirmStop = async () => {
      const id = medToStop;
      if (!id) return;

      setMedToStop(null); // Close modal
      setIsStoppingId(id);
      setError(null);

      // Optimistically hide it
      setOptimisticStoppedIds(prev => new Set(prev).add(id));

      try {
          await onDelete(id);
      } catch (error) {
          console.error("Failed to stop medication:", error);
          setError("Failed to update medication status. Please check your connection.");
          // Revert optimistic update
          setOptimisticStoppedIds(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
          });
      } finally {
          setIsStoppingId(null);
      }
  }

  // Filter out items that are optimistically stopped for the "Active" view
  // But keep them if showing history so they don't disappear entirely during transition
  const displayedMeds = showHistory 
      ? medications 
      : medications.filter(m => m.active && !optimisticStoppedIds.has(m.id));

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg relative max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
              <div className="bg-brand-blue-100 p-2 rounded-lg">
                  <PillIcon className="w-6 h-6 text-brand-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Medications</h2>
                <p className="text-sm text-slate-500">Managing for {memberName}</p>
              </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6">
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100">{error}</div>}

            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-700">
                    {showHistory ? "All Medications (Including Stopped)" : "Active Medications"}
                </h3>
                <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-xs text-brand-blue-600 hover:text-brand-blue-800 font-medium underline"
                >
                    {showHistory ? "Show Active Only" : "Show All History"}
                </button>
            </div>

            <div className="space-y-3">
                {displayedMeds.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                        <PillIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>{showHistory ? "No medications found." : "No active medications."}</p>
                    </div>
                ) : (
                    displayedMeds.map(med => {
                        const isStopped = !med.active;
                        const isOptimisticStop = optimisticStoppedIds.has(med.id);
                        
                        return (
                        <div key={med.id} className={`flex items-center justify-between p-3 rounded-lg border ${isStopped || isOptimisticStop ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div>
                                <h4 className={`font-semibold ${isStopped || isOptimisticStop ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                    {med.name}
                                </h4>
                                <div className="text-xs text-slate-500 space-y-0.5">
                                    <p>{med.dosage || 'No dosage'} • {med.frequency || 'As directed'}</p>
                                    {med.purpose && <p className="text-brand-blue-600 font-medium">{med.purpose}</p>}
                                    <div className="flex items-center gap-2 mt-1">
                                        {med.start_date && (
                                            <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> Started: {new Date(med.start_date).toLocaleDateString()}</span>
                                        )}
                                        {med.stopped_at && isStopped && (
                                            <span className="text-red-500 font-medium ml-1">• Stopped: {new Date(med.stopped_at).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {!isStopped && !isOptimisticStop && (
                                <button 
                                    onClick={() => requestStop(med.id)}
                                    className="text-slate-400 hover:text-red-500 p-2 transition"
                                    title="Stop taking this medication"
                                    disabled={!!isStoppingId}
                                >
                                    {isStoppingId === med.id ? (
                                        <SpinnerIcon className="w-5 h-5 animate-spin text-brand-blue-600" />
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

        <div className="bg-slate-50 border-t border-slate-200 transition-all duration-300">
            <button 
                onClick={() => setIsAddFormOpen(!isAddFormOpen)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100 transition focus:outline-none"
            >
                <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <PlusIcon className="w-4 h-4" /> Add Manual Medication
                </span>
                {isAddFormOpen ? (
                    <ChevronUpIcon className="w-4 h-4 text-slate-500" />
                ) : (
                    <ChevronDownIcon className="w-4 h-4 text-slate-500" />
                )}
            </button>
            
            {isAddFormOpen && (
                <div className="px-6 pb-6 animate-fadeIn">
                    <form onSubmit={handleAdd} className="space-y-3">
                        <div>
                            <input 
                                type="text" 
                                placeholder="Medication Name (e.g. Lisinopril)" 
                                className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-brand-blue-500 focus:ring-brand-blue-500 py-2 px-3 border"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                disabled={isAdding}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input 
                                type="text" 
                                placeholder="Dosage (e.g. 10mg)" 
                                className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-brand-blue-500 focus:ring-brand-blue-500 py-2 px-3 border"
                                value={dosage}
                                onChange={e => setDosage(e.target.value)}
                                disabled={isAdding}
                            />
                            <input 
                                type="text" 
                                placeholder="Frequency (e.g. Daily)" 
                                className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-brand-blue-500 focus:ring-brand-blue-500 py-2 px-3 border"
                                value={frequency}
                                onChange={e => setFrequency(e.target.value)}
                                disabled={isAdding}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input 
                                type="text" 
                                placeholder="Purpose (e.g. Hypertension)" 
                                className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-brand-blue-500 focus:ring-brand-blue-500 py-2 px-3 border"
                                value={purpose}
                                onChange={e => setPurpose(e.target.value)}
                                disabled={isAdding}
                            />
                            <div className="relative">
                                <input 
                                    type="date" 
                                    className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-brand-blue-500 focus:ring-brand-blue-500 py-2 px-3 border"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    disabled={isAdding}
                                    title="Start Date"
                                />
                            </div>
                        </div>
                        
                        <button 
                            type="submit" 
                            className="w-full bg-brand-blue-600 text-white font-semibold text-sm py-2 rounded-lg shadow hover:bg-brand-blue-700 transition disabled:bg-brand-blue-300 flex justify-center items-center gap-2"
                            disabled={isAdding}
                        >
                            {isAdding ? <><SpinnerIcon className="w-4 h-4 animate-spin"/> Adding...</> : 'Add Medication'}
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
        title="Stop Medication?"
        message="This will move the medication to history. You can still view it by toggling 'Show All History'."
    />
    </>
  );
};
