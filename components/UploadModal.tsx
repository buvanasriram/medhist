
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
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg relative overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 bg-white z-10 text-left">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-rose-700 uppercase tracking-[0.3em] mb-1 leading-none">Clinical Intelligence</p>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">Upload Report</h2>
            </div>
            <button onClick={handleClose} className="p-2 text-slate-300 hover:text-slate-900 transition" disabled={isLoading}>
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-grow overflow-y-auto p-8 pt-6 pb-4 text-left">
          <form id="uploadReportForm" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="familyMember" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Target Folder</label>
              <select
                id="familyMember"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3.5 px-4 text-slate-900 font-black text-[10px] uppercase tracking-widest focus:outline-none focus:border-rose-500 transition appearance-none cursor-pointer"
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
                className="flex justify-center w-full h-48 px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-3xl cursor-pointer hover:border-rose-500 transition-all bg-slate-50 group"
              >
                <div className="space-y-2 text-center self-center">
                  <UploadIcon className="mx-auto h-10 w-10 text-slate-300 group-hover:text-rose-700 transition" />
                  <div className="flex flex-col text-xs font-black uppercase tracking-widest text-slate-400">
                    <span className="text-rose-700">Select clinical file</span>
                    <span className="text-[10px] mt-1">or drag & drop</span>
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
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">PDF, PNG, JPG (10MB MAX)</p>
                </div>
              </label>
            </div>

            {file && (
              <div className="space-y-4 animate-fadeIn">
                <div className="border border-slate-100 p-4 rounded-2xl flex items-center justify-between bg-white shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-rose-50 rounded-lg">
                        <FileIcon className="w-5 h-5 text-rose-700" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 truncate">{file.name}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {setFile(null); if (fileInputRef.current) fileInputRef.current.value = '';}} 
                    className="p-2 text-slate-300 hover:text-rose-700 transition"
                    disabled={isLoading}
                  >
                    <CloseIcon className="w-5 h-5" />
                  </button>
                </div>

                {file.type === 'application/pdf' && (
                  <div>
                    <label htmlFor="report-password" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Secure PDF Password (If Encrypted)</label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <LockIcon className="h-5 w-5 text-rose-700" />
                      </div>
                      <input
                        type="password"
                        id="report-password"
                        className="block w-full rounded-xl border border-slate-200 py-3.5 pl-12 text-slate-900 font-bold text-sm focus:border-rose-500 focus:ring-rose-500 transition"
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
                <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-left border ${
                    isRetrying ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                    {isRetrying && <SpinnerIcon className="inline w-3 h-3 animate-spin mr-2" />}
                    {error}
                </div>
            )}
          </form>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 z-10">
            <button
              form="uploadReportForm"
              type="submit"
              disabled={!file || isLoading}
              className="w-full flex justify-center items-center gap-3 bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-rose-900 transition active:scale-95 text-[10px] uppercase tracking-[0.2em] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <SpinnerIcon className="w-5 h-5 animate-spin" />
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
