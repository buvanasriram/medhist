
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { WarningIcon } from './icons/WarningIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { Document, Page, pdfjs } from 'react-pdf';
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
  const loadingTimeoutRef = useRef<number | null>(null);

  const isTouchDevice = useMemo(() => {
    return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      setNumPages(null);
      setPageNumber(1);

      // Mobile Back-Button Integration:
      // Push a new state so the hardware back button closes the modal
      window.history.pushState({ modalOpen: true }, '');

      const handlePopState = (e: PopStateEvent) => {
          // If we are popping back from the modalOpen state, close the modal
          onClose();
      };
      
      window.addEventListener('popstate', handlePopState);

      // Defensive timeout
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
  }, [isOpen, report.url, onClose]);

  if (!isOpen) return null;

  const isPdf = report.file.type === 'application/pdf';

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
    setPageNumber(prevPageNumber => {
        const next = prevPageNumber + offset;
        return Math.min(Math.max(1, next), numPages || 1);
    });
  };

  const handleClose = () => {
    // If we're closing via the button, trigger a history back to keep the stack clean
    if (window.history.state && window.history.state.modalOpen) {
        window.history.back();
    } else {
        onClose();
    }
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white w-full max-w-4xl h-[90vh] sm:h-[85vh] flex flex-col rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden relative border border-slate-200">
        
        <header className="flex items-center justify-between px-6 sm:px-8 py-4 sm:py-5 border-b border-slate-100 bg-white z-20">
          <div className="text-left min-w-0">
            <p className="text-[10px] font-black text-rose-700 uppercase tracking-[0.3em] mb-1 leading-none">
              {isPdf ? 'Clinical PDF' : 'Medical Image'}
            </p>
            <h2 className="text-sm font-black text-slate-800 tracking-tight truncate">
              {report.file.name}
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
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Opening Secure Record...</p>
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
                <button onClick={handleRetry} className="bg-slate-100 text-slate-700 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition">
                   Refresh Viewer
                </button>
                <a href={report.url} target="_blank" rel="noopener noreferrer" className="bg-rose-700 text-white font-black px-6 py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg text-[10px] uppercase tracking-widest">
                  <DownloadIcon className="w-4 h-4" /> Download Report
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
                    key={`doc_${report.url}`}
                    file={report.url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={null}
                    className="shadow-2xl border border-slate-200"
                  >
                    <Page 
                      key={`page_${pageNumber}_${report.url}`}
                      pageNumber={pageNumber} 
                      width={containerRef.current ? Math.min(containerRef.current.clientWidth - 32, 800) : 300}
                      devicePixelRatio={isTouchDevice ? 1 : undefined}
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
            <div className="bg-white border-t border-slate-100 px-6 py-3 flex items-center justify-between z-20">
                <button 
                    disabled={pageNumber <= 1}
                    onClick={() => changePage(-1)}
                    className="p-2 text-rose-700 disabled:text-slate-300 transition-colors"
                >
                    <div className="rotate-90"><ChevronDownIcon className="w-6 h-6" /></div>
                </button>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                    Page {pageNumber} of {numPages}
                </span>
                <button 
                    disabled={pageNumber >= numPages}
                    onClick={() => changePage(1)}
                    className="p-2 text-rose-700 disabled:text-slate-300 transition-colors"
                >
                    <div className="-rotate-90"><ChevronDownIcon className="w-6 h-6" /></div>
                </button>
            </div>
        )}

        <footer className="p-6 bg-white border-t border-slate-100 flex gap-4 z-20">
          <a href={report.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-3 py-4 bg-slate-100 text-slate-700 font-black rounded-2xl text-[10px] uppercase tracking-widest transition hover:bg-slate-200">
            <DownloadIcon className="w-4 h-4" /> Download Report
          </a>
          <button onClick={handleClose} className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition hover:bg-rose-900 shadow-xl">
            Close Record
          </button>
        </footer>
      </div>
    </div>
  );
};
