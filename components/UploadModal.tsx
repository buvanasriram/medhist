
import React, { useState, useRef, useEffect } from 'react';
import type { FamilyMember } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { CloseIcon } from './icons/CloseIcon';
import { FileIcon } from './icons/FileIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { LockIcon } from './icons/LockIcon';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, memberId: string, password?: string) => void;
  familyMembers: FamilyMember[];
  initialSelectedMemberId: string;
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload, familyMembers, initialSelectedMemberId, isLoading, error, setError }) => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(initialSelectedMemberId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedMemberId(initialSelectedMemberId);
    }
  }, [isOpen, initialSelectedMemberId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        if(selectedFile.size > 10 * 1024 * 1024) {
            setError("File is too large. Please upload a file under 10MB.");
            setFile(null);
        } else {
            setFile(selectedFile);
        }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setError(null);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if(droppedFile.size > 10 * 1024 * 1024) {
          setError("File is too large. Please upload a file under 10MB.");
          setFile(null);
      } else {
          setFile(droppedFile);
          if (fileInputRef.current) {
            fileInputRef.current.files = e.dataTransfer.files;
          }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file && selectedMemberId && !isLoading) {
      onUpload(file, selectedMemberId, password);
    } else if (!file) {
      setError("Please select a file to upload.");
    }
  };
  
  const handleClose = () => {
    if (isLoading) return;
    onClose();
    setFile(null);
    setPassword('');
    setError(null);
  };

  if (!isOpen) return null;

  const isRetrying = error?.toLowerCase().includes("retrying") || error?.toLowerCase().includes("busy");

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative overflow-hidden border border-slate-100 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        
        {/* Header - Compacted */}
        <div className="p-4 px-6 border-b border-slate-100 bg-white z-10 text-left">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] font-black text-rose-700 uppercase tracking-[0.3em] mb-0.5 leading-none">Clinical Intelligence</p>
              <h2 className="text-lg font-black text-slate-900 tracking-tighter leading-none">Upload Report</h2>
            </div>
            <button onClick={handleClose} className="p-1 text-slate-300 hover:text-slate-900 transition" disabled={isLoading}>
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body - Tightened Spacing */}
        <div className="flex-grow overflow-y-auto p-5 pt-3 pb-3 text-left">
          <form id="uploadReportForm" onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="familyMember" className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Target Folder</label>
              <select
                id="familyMember"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4 text-slate-900 font-black text-[10px] uppercase tracking-widest focus:outline-none focus:border-rose-500 transition appearance-none cursor-pointer"
                disabled={isLoading}
              >
                {familyMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`flex justify-center w-full transition-all bg-slate-50 border-2 border-slate-200 border-dashed rounded-3xl cursor-pointer hover:border-rose-500 group overflow-hidden ${file ? 'h-20' : 'h-28'}`}
              >
                <div className="flex flex-col items-center justify-center text-center px-4 w-full">
                  {!file && <UploadIcon className="h-6 w-6 text-slate-300 group-hover:text-rose-700 transition mb-1" />}
                  <div className="flex flex-col text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span className="text-rose-700">{file ? 'Replace clinical file' : 'Select clinical file'}</span>
                    {!file && <span className="text-[8px] mt-0.5 opacity-60">or drag & drop</span>}
                  </div>
                  <input 
                    ref={fileInputRef}
                    id="file-upload" 
                    type="file" 
                    className="sr-only" 
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    disabled={isLoading} 
                  />
                </div>
              </label>
            </div>

            {file && (
              <div className="space-y-3 animate-fadeIn">
                <div className="border border-slate-100 p-3 rounded-2xl flex items-center justify-between bg-white shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-rose-50 rounded-lg flex-shrink-0">
                        <FileIcon className="w-4 h-4 text-rose-700" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[8px] font-black text-rose-700/40 uppercase tracking-widest leading-none mb-1">Selected File</p>
                        <span className="text-[10px] font-bold text-slate-700 truncate block leading-tight">{file.name}</span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {setFile(null); if (fileInputRef.current) fileInputRef.current.value = '';}} 
                    className="p-1.5 text-slate-300 hover:text-rose-700 transition"
                    disabled={isLoading}
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>

                {file.type === 'application/pdf' && (
                  <div className="animate-slideDown">
                    <label htmlFor="report-password" className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Secure PDF Password (If Encrypted)</label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <LockIcon className="h-4 w-4 text-rose-700" />
                      </div>
                      <input
                        type="password"
                        id="report-password"
                        className="block w-full rounded-xl border border-slate-100 py-2.5 pl-10 text-slate-900 font-bold text-xs focus:border-rose-500 focus:ring-0 transition"
                        placeholder="Enter password..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {error && (
                <div className={`p-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-left border ${
                    isRetrying ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                    {isRetrying && <SpinnerIcon className="inline w-3 h-3 animate-spin mr-2" />}
                    {error}
                </div>
            )}
          </form>
        </div>

        {/* Footer - Compacted */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 z-10">
            <button
              form="uploadReportForm"
              type="submit"
              disabled={!file || isLoading}
              className="w-full flex justify-center items-center gap-3 bg-slate-900 text-white font-black py-3.5 rounded-2xl shadow-xl hover:bg-rose-900 transition active:scale-95 text-[9px] uppercase tracking-[0.2em] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <SpinnerIcon className="w-4 h-4 animate-spin" />
                  {isRetrying ? 'System Busy, Retrying...' : 'Analyzing Report...'}
                </>
              ) : (
                'Generate History Entry'
              )}
            </button>
        </div>
      </div>
    </div>
  );
};
