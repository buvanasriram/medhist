
import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { WarningIcon } from './icons/WarningIcon';
import { DownloadIcon } from './icons/DownloadIcon';
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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      setNumPages(null);
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
    setError("Browser security restricted the in-app preview.");
    setIsLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl h-[85vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden relative border border-slate-200">
        
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="text-left">
            <h2 className="text-sm font-bold text-slate-800 truncate max-w-[200px] sm:max-w-md">
              {report.file.name}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {isPdf ? 'Clinical PDF' : 'Medical Image'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        
        <main className="flex-grow bg-slate-50 overflow-y-auto relative" ref={containerRef}>
          {isLoading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
              <SpinnerIcon className="w-10 h-10 text-brand-blue-600 animate-spin mb-4" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Record...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center min-h-full p-8 text-center">
              <WarningIcon className="w-12 h-12 text-red-500 mb-4" />
              <p className="font-bold text-slate-800 text-lg">Unable to Preview</p>
              <p className="text-sm text-slate-500 mt-2 mb-8">This record is secure. Please open it in your device's native viewer.</p>
              <a href={report.url} target="_blank" rel="noopener noreferrer" className="bg-brand-blue-600 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2">
                <DownloadIcon className="w-4 h-4" /> Open Full Record
              </a>
            </div>
          )}
          
          <div className="flex flex-col items-center p-4">
            {isPdf ? (
              <Document
                file={report.url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={<SpinnerIcon className="w-10 h-10 animate-spin text-brand-blue-600 my-20" />}
              >
                {Array.from(new Array(numPages || 0), (_, index) => (
                  <div key={index} className="mb-6 shadow-xl border border-slate-200 bg-white">
                    <Page 
                      pageNumber={index + 1} 
                      width={containerRef.current ? Math.min(containerRef.current.clientWidth - 40, 800) : 300}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </div>
                ))}
              </Document>
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

        <footer className="p-4 bg-white border-t border-slate-100 flex gap-3">
          <a href={report.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl text-sm transition hover:bg-slate-200">
            <DownloadIcon className="w-4 h-4" /> Open Native
          </a>
          <button onClick={onClose} className="flex-1 py-4 bg-brand-blue-600 text-white font-bold rounded-2xl text-sm transition hover:bg-brand-blue-700 shadow-lg">
            Close Record
          </button>
        </footer>
      </div>
    </div>
  );
};
