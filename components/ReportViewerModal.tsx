import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { WarningIcon } from './icons/WarningIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { Document, Page } from 'react-pdf';
import type { ReportFile } from '../types';

interface ReportViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: {
    url: string;
    filePath?: string;
    file: ReportFile;
  };
}

export const ReportViewerModal: React.FC<ReportViewerModalProps> = ({ isOpen, onClose, report }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      setNumPages(null);
      setPageNumber(1);
    }
  }, [isOpen, report.url]);

  if (!isOpen) return null;

  const isPdf = report.file.type === 'application/pdf';

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
  }

  function onDocumentLoadError(err: Error) {
    console.error("PDF Load Error:", err);
    setError("Unable to render preview on this device.");
    setIsLoading(false);
  }

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
        const next = prevPageNumber + offset;
        return Math.min(Math.max(1, next), numPages || 1);
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white w-full max-w-4xl h-[90vh] sm:h-[85vh] flex flex-col rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden relative border border-slate-200">
        
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-white z-20">
          <div className="text-left min-w-0">
            <h2 className="text-sm font-bold text-slate-800 truncate">
              {report.file.name}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {isPdf ? 'Clinical PDF' : 'Medical Image'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition flex-shrink-0">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        
        <main className="flex-grow bg-slate-100 overflow-y-auto relative" ref={containerRef}>
          {isLoading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-30">
              <SpinnerIcon className="w-10 h-10 text-brand-blue-600 animate-spin mb-4" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Opening Secure Record...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center min-h-full p-8 text-center bg-white">
              <WarningIcon className="w-12 h-12 text-red-500 mb-4" />
              <p className="font-bold text-slate-800 text-lg">Preview Unavailable</p>
              <p className="text-sm text-slate-500 mt-2 mb-8">This file is too complex for in-browser viewing.</p>
              <a href={report.url} target="_blank" rel="noopener noreferrer" className="bg-brand-blue-600 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2">
                <DownloadIcon className="w-4 h-4" /> Open Original File
              </a>
            </div>
          )}
          
          <div className="flex flex-col items-center p-4 min-h-full justify-start">
            {isPdf ? (
              <div className="relative">
                 {isPageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 z-10 rounded-lg">
                        <SpinnerIcon className="w-8 h-8 text-brand-blue-600 animate-spin" />
                    </div>
                 )}
                 <Document
                    key={`doc_${report.url}`} // Force isolation
                    file={report.url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={null}
                    className="shadow-2xl border border-slate-200"
                  >
                    <Page 
                      key={`page_${pageNumber}_${report.url}`} // Force isolation
                      pageNumber={pageNumber} 
                      width={containerRef.current ? Math.min(containerRef.current.clientWidth - 32, 800) : 300}
                      // EXPERIMENTAL FIX: Resolution Throttling
                      // This prevents mobile browsers from over-rendering at 3x density and crashing.
                      devicePixelRatio={1}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      onLoadStart={() => setIsPageLoading(true)}
                      onLoadSuccess={() => setIsPageLoading(false)}
                      onRenderError={() => setError("Rendering failed on this device.")}
                      className="bg-white"
                    />
                  </Document>
              </div>
            ) : (
              <img 
                src={report.url} 
                className="max-w-full h-auto rounded-lg shadow-xl" 
                onLoad={() => setIsLoading(false)}
                onError={() => { setIsLoading(false); setError("Image failed to load."); }}
              />
            )}
          </div>
        </main>

        {isPdf && !isLoading && numPages && numPages > 1 && (
            <div className="bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-between z-20">
                <button 
                    disabled={pageNumber <= 1}
                    onClick={() => changePage(-1)}
                    className="p-2 text-brand-blue-600 disabled:text-slate-300 transition-colors"
                >
                    <div className="rotate-90"><ChevronDownIcon className="w-6 h-6" /></div>
                </button>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Page {pageNumber} of {numPages}
                </span>
                <button 
                    disabled={pageNumber >= numPages}
                    onClick={() => changePage(1)}
                    className="p-2 text-brand-blue-600 disabled:text-slate-300 transition-colors"
                >
                    <div className="-rotate-90"><ChevronDownIcon className="w-6 h-6" /></div>
                </button>
            </div>
        )}

        <footer className="p-4 bg-white border-t border-slate-100 flex gap-3 z-20">
          <a href={report.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 bg-slate-100 text-slate-700 font-bold rounded-xl sm:rounded-2xl text-xs sm:text-sm transition hover:bg-slate-200">
            <DownloadIcon className="w-4 h-4" /> {isPdf ? 'Download' : 'Full Size'}
          </a>
          <button onClick={onClose} className="flex-1 py-3 sm:py-4 bg-brand-blue-600 text-white font-bold rounded-xl sm:rounded-2xl text-xs sm:text-sm transition hover:bg-brand-blue-700 shadow-lg">
            Close Record
          </button>
        </footer>
      </div>
    </div>
  );
};
