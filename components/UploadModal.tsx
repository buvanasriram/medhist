
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
    // When the modal opens, ensure its selected member is synced with the main view.
    if (isOpen) {
      setSelectedMemberId(initialSelectedMemberId);
    }
  }, [isOpen, initialSelectedMemberId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        if(selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Upload New Medical Report</h2>
              <p className="text-sm text-slate-500 mt-1">AI will automatically create a timeline entry.</p>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition" disabled={isLoading}>
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="familyMember" className="block text-sm font-medium text-slate-700 mb-1">
                Family Member
              </label>
              <select
                id="familyMember"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full bg-slate-100 border border-slate-300 rounded-md py-2 px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 transition"
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
                className="flex justify-center w-full h-48 px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md cursor-pointer hover:border-brand-blue-500 transition bg-slate-50"
              >
                <div className="space-y-1 text-center self-center">
                  <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                  <div className="flex text-sm text-slate-600">
                    <span className="relative font-semibold text-brand-blue-600">
                      Upload a file
                      <input 
                        ref={fileInputRef}
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        className="sr-only" 
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        disabled={isLoading} 
                      />
                    </span>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-slate-500">PDF, PNG, JPG up to 10MB</p>
                </div>
              </label>
            </div>

            {file && (
              <>
                <div className="border border-slate-200 p-3 rounded-md flex items-center justify-between bg-slate-100">
                  <div className="flex items-center gap-3">
                    <FileIcon className="w-6 h-6 text-brand-blue-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700 truncate">{file.name}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {setFile(null); if (fileInputRef.current) fileInputRef.current.value = '';}} 
                    className="text-slate-500 hover:text-slate-700"
                    disabled={isLoading}
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>

                {file.type === 'application/pdf' && (
                  <div>
                    <label htmlFor="report-password"className="block text-sm font-medium text-slate-700">
                      Password (optional)
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <LockIcon className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="password"
                        name="report-password"
                        id="report-password"
                        className="block w-full rounded-md border border-slate-300 py-2 pl-10 shadow-sm focus:border-brand-blue-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-500 sm:text-sm"
                        placeholder="Enter if file is password-protected"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
            
            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm">{error}</div>}

          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={!file || isLoading}
              className="w-full flex justify-center items-center gap-2 bg-brand-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:bg-brand-blue-700 disabled:bg-brand-blue-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-opacity-75 transition duration-200"
            >
              {isLoading ? (
                <>
                  <SpinnerIcon className="w-5 h-5 animate-spin" />
                  Analyzing Report...
                </>
              ) : (
                'Generate Timeline Entry'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};