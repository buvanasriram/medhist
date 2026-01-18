
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { WarningIcon } from './icons/WarningIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { Document, Page, pdfjs } from 'react-pdf';
import type { ReportFile } from '../types';
import * as supabaseService from '../services/supabaseService';

interface ReportViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: {
    url: string;
    filePath?: string;
    file: ReportFile;
    entryId?: string;
  };
}

export const ReportViewerModal: React.FC<ReportViewerModalProps> = ({ isOpen, onClose, report }) => {
  const [allFiles, setAllFiles] = useState<any[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingTimeoutRef = useRef<number | null>(null);

  const activeFile = allFiles[currentFileIndex] || { 
      signedUrl: report.url, 
      metadata: report.file 
  };

  const isTouchDevice = useMemo(() => {
    return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      setNumPages(null);
      setPageNumber(1);
      
      const loadAllFiles = async () => {
          if (report.entryId) {
              try {
                  const files = await supabaseService.getFilesForEntry(report.entryId);
                  if (files) {
                      setAllFiles(files);
                      // Find index of the file that was clicked
                      const idx = files.findIndex(f => f.filePath === report.filePath);
                      if (idx !== -1) setCurrentFileIndex(idx);
                  }
              } catch (e) {
                  console.error("Failed to load multi-page attachments", e);
              }
          }
      };

      loadAllFiles();

      window.history.pushState({ modalOpen: true }, '');
      const handlePopState = () => onClose();
      window.addEventListener('popstate', handlePopState);

      loadingTimeoutRef.current = window.setTimeout(() => {
        if (isLoading) {
          setError("The document is taking too long to load. This can happen on low-memory mobile devices.");
          setIsLoading(false);
        }
      }, 15000);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        if (loadingTimeoutRef.current) window.clearTimeout(loadingTimeoutRef.current);
      };
    }
  }, [isOpen, report.entryId, report.filePath, onClose]);

  const isPdf = activeFile.metadata.type === 'application/pdf';

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    if (loadingTimeoutRef.current) window.clearTimeout(loadingTimeoutRef.current);
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
  }

  function onDocumentLoadError(err: Error) {
    console.error("PDF Load Error:", err);
    if (loadingTimeoutRef.current) window.clearTimeout(loadingTimeoutRef.current);
    setError("Unable to render preview. The secure link may have expired or the file is too complex for mobile RAM.");
    setIsLoading(false);
  }

  const changePage = (offset: number) => {
    setPageNumber(prev => Math.min(Math.max(1, prev + offset), numPages || 1));
  };

  const changeFile = (offset: number) => {
      const nextIdx = Math.min(Math.max(0, currentFileIndex + offset), allFiles.length - 1);
      if (nextIdx !== currentFileIndex) {
          setIsLoading(true);
          setNumPages(null);
          setPageNumber(1);
          setCurrentFileIndex(nextIdx);
      }
  };

  const handleClose = () => {
    if (window.history.state && window.history.state.modalOpen) {
        window.history.back();
    } else {
        onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white w-full max-w-4xl h-[90vh] sm:h-[85vh] flex flex-col rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden relative border border-slate-200">
        
        <header className="flex items-center justify-between px-6 sm:px-8 py-4 sm:py-5 border-b border-slate-100 bg-white z-20">
          <div className="text-left min-w-0">
            <p className="text-[10px] font-black text-rose-700 uppercase tracking-[0.3em] mb-1 leading-none">
              {allFiles.length > 1 ? `Attachment ${currentFileIndex + 1} of ${allFiles.length}` : (isPdf ? 'Clinical PDF' : 'Medical Image')}
            </p>
            <h2 className="text-sm font-black text-slate-800 tracking-tight truncate">
              {activeFile.metadata.name}
            </h2>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-900 transition flex-shrink-0">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        
        <main className="flex-grow bg-slate-100 overflow-y-auto relative" ref={containerRef}>
          {isLoading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-30">
              <SpinnerIcon className="w-10 h-10 text-rose-700 animate-spin mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Accessing Clinical Record...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center min-h-full p-8 text-center bg-white">
              <WarningIcon className="w-12 h-12 text-rose-700 mb-4" />
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Preview Unavailable</p>
              <p className="text-xs text-slate-500 mt-2 mb-8 leading-relaxed max-w-xs mx-auto font-medium">
                {error}
              </p>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <a href={activeFile.signedUrl} target="_blank" rel="noopener noreferrer" className="bg-rose-700 text-white font-black px-6 py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg text-[10px] uppercase tracking-widest">
                  <DownloadIcon className="w-4 h-4" /> Download This Page
                </a>
              </div>
            </div>
          )}
          
          <div className="flex flex-col items-center p-4 min-h-full justify-start">
            {isPdf ? (
              <div className="relative">
                 {isPageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 z-10 rounded-lg">
                        <SpinnerIcon className="w-8 h-8 text-rose-700 animate-spin" />
                    </div>
                 )}
                 <Document
                    key={`doc_${activeFile.signedUrl}`}
                    file={activeFile.signedUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={null}
                    className="shadow-2xl border border-slate-200"
                  >
                    <Page 
                      key={`page_${pageNumber}_${activeFile.signedUrl}`}
                      pageNumber={pageNumber} 
                      width={containerRef.current ? Math.min(containerRef.current.clientWidth - 32, 800) : 300}
                      devicePixelRatio={isTouchDevice ? 1 : undefined}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      onLoadStart={() => setIsPageLoading(true)}
                      onLoadSuccess={() => setIsPageLoading(false)}
                      className="bg-white"
                    />
                  </Document>
              </div>
            ) : (
              <img 
                src={activeFile.signedUrl} 
                className="max-w-full h-auto rounded-lg shadow-xl" 
                onLoad={() => setIsLoading(false)}
                onError={() => { setIsLoading(false); setError("Image failed to load."); }}
              />
            )}
          </div>
        </main>

        {/* Navigation Layer */}
        <div className="bg-white border-t border-slate-100 px-6 py-3 flex items-center justify-between z-20">
            {/* Multi-File Navigation */}
            {allFiles.length > 1 ? (
                <div className="flex items-center gap-4">
                    <button 
                        disabled={currentFileIndex === 0}
                        onClick={() => changeFile(-1)}
                        className="flex items-center gap-2 text-rose-700 disabled:text-slate-300 transition-colors text-[9px] font-black uppercase tracking-widest"
                    >
                        <ArrowLeftIcon className="w-4 h-4" /> Prev Attachment
                    </button>
                    <div className="h-4 w-px bg-slate-100"></div>
                    <button 
                        disabled={currentFileIndex === allFiles.length - 1}
                        onClick={() => changeFile(1)}
                        className="flex items-center gap-2 text-rose-700 disabled:text-slate-300 transition-colors text-[9px] font-black uppercase tracking-widest"
                    >
                        Next Attachment <ArrowRightIcon className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="flex-grow"></div>
            )}

            {/* PDF Page Navigation */}
            {isPdf && !isLoading && numPages && numPages > 1 && (
                <div className="flex items-center gap-6">
                    <button 
                        disabled={pageNumber <= 1}
                        onClick={() => changePage(-1)}
                        className="p-1 text-rose-700 disabled:text-slate-300 transition-colors"
                    >
                        <div className="rotate-90"><ChevronDownIcon className="w-6 h-6" /></div>
                    </button>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                        Page {pageNumber} of {numPages}
                    </span>
                    <button 
                        disabled={pageNumber >= numPages}
                        onClick={() => changePage(1)}
                        className="p-1 text-rose-700 disabled:text-slate-300 transition-colors"
                    >
                        <div className="-rotate-90"><ChevronDownIcon className="w-6 h-6" /></div>
                    </button>
                </div>
            )}
        </div>

        <footer className="p-6 bg-white border-t border-slate-100 flex gap-4 z-20">
          <a href={activeFile.signedUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-3 py-4 bg-slate-100 text-slate-700 font-black rounded-2xl text-[10px] uppercase tracking-widest transition hover:bg-slate-200">
            <DownloadIcon className="w-4 h-4" /> Download
          </a>
          <button onClick={handleClose} className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition hover:bg-rose-900 shadow-xl">
            Close Record
          </button>
        </footer>
      </div>
    </div>
  );
};

// Re-importing Arrow Icons for usage
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
