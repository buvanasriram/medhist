
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import { CloseIcon } from './icons/CloseIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { WarningIcon } from './icons/WarningIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { PlusIcon } from './icons/PlusIcon';
import { MinusIcon } from './icons/MinusIcon';
import type { ReportFile } from '../types';

interface ReportViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: {
    url: string;
    file: ReportFile;
  };
}

export const ReportViewerModal: React.FC<ReportViewerModalProps> = ({ isOpen, onClose, report }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadTimeout, setLoadTimeout] = useState<boolean>(false);
  const [pageWidth, setPageWidth] = useState<number>(800);
  const [scale, setScale] = useState<number>(1.0);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Optimize PDF options to prevent re-renders
  const options = useMemo(() => ({
    cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
    cMapPacked: true,
  }), []);

  // Create a memoized file object that includes the password if it exists
  const fileObj = useMemo(() => ({
    url: report.url,
    password: report.file.password
  }), [report.url, report.file.password]);

  // Responsive width calculation
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setPageWidth(Math.min(width - 40, 800));
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [isOpen]);

  // Handle Reset on new report
  useEffect(() => {
    // Only reset if we actually have a report URL change
    setNumPages(null);
    setPageNumber(1);
    setIsLoading(true);
    setError(null);
    setLoadTimeout(false);
    setScale(1.0);

    // Safety timeout: if PDF doesn't load in 10 seconds, show fallback
    const timer = setTimeout(() => {
        setIsLoading(prev => {
            if (prev) setLoadTimeout(true);
            return false;
        });
    }, 10000);

    return () => clearTimeout(timer);
  }, [report.url]); 

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setIsLoading(false);
    setLoadTimeout(false);
    setError(null);
  }
  
  function onDocumentLoadError(err: Error): void {
    console.error("PDF Load Error:", err);
    // Suppress common insignificant errors like "Password required" if we're still handling it
    if (err.name === 'PasswordException') {
        setError("This file is password protected. Please re-upload with the correct password.");
    } else {
        setError(`Failed to load document: ${err.message}`);
    }
    setIsLoading(false);
  }
  
  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  if (!isOpen) return null;

  const isPdf = report.file.type === 'application/pdf';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center sm:p-4 animate-fadeIn">
      <div className="bg-white shadow-2xl w-full max-w-4xl h-full sm:h-[90vh] sm:rounded-2xl flex flex-col overflow-hidden">
        <header className="flex items-center justify-between p-4 border-b border-slate-100 flex-shrink-0 bg-white">
            <div className="flex flex-col min-w-0">
                <h2 className="text-sm font-bold text-slate-800 truncate pr-4" title={report.file.name}>
                    {report.file.name}
                </h2>
                {numPages && isPdf && (
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Document • {numPages} Pages
                    </span>
                )}
            </div>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        
        <main 
          ref={containerRef}
          className="flex-grow overflow-auto bg-slate-50 flex items-start justify-center relative p-4 scrollbar-hide"
        >
          {/* Loading Spinner */}
          {isLoading && !loadTimeout && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-50 bg-opacity-90">
              <SpinnerIcon className="w-10 h-10 text-brand-blue-600 animate-spin mb-3" />
              <p className="text-sm font-bold text-slate-500 tracking-wide uppercase">Preparing Preview...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center p-8 z-20 mt-10 max-w-sm">
               <div className="bg-red-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <WarningIcon className="w-8 h-8 text-red-500" />
               </div>
               <p className="font-bold text-slate-800 text-lg">Unable to Display</p>
               <p className="text-sm text-slate-500 mt-2 mb-6 leading-relaxed">{error}</p>
               <div className="flex flex-col gap-3">
                   <a 
                        href={report.url} 
                        download={report.file.name}
                        className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-brand-blue-600 text-white font-bold rounded-xl hover:bg-brand-blue-700 shadow-md transition"
                    >
                        Download File
                    </a>
                    <button onClick={onClose} className="text-sm text-slate-400 font-medium hover:text-slate-600">
                        Go Back
                    </button>
               </div>
            </div>
          )}

          {/* Timeout Fallback */}
          {loadTimeout && !numPages && !error && (
             <div className="text-center p-8 z-20 max-w-sm mt-10">
                <div className="bg-orange-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <WarningIcon className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Preview Timeout</h3>
                <p className="text-sm text-slate-500 mt-2 mb-6 leading-relaxed">
                    This file is taking longer than expected to render. You can still download it to your device.
                </p>
                <a 
                    href={report.url} 
                    download={report.file.name}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-brand-blue-600 text-white font-bold rounded-xl hover:bg-brand-blue-700 shadow-md transition"
                >
                    Download PDF
                </a>
             </div>
          )}
          
          {/* Content Rendering */}
          {isPdf ? (
            !error && !loadTimeout && (
                <div className="shadow-2xl transition-all duration-300 origin-top bg-white">
                    <Document
                        key={fileObj.url} 
                        file={fileObj}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={null} 
                        options={options}
                        className={isLoading ? 'opacity-0' : 'opacity-100'}
                    >
                        <Page 
                            pageNumber={pageNumber} 
                            width={pageWidth * scale}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            loading={<div className="h-[600px] w-full flex items-center justify-center bg-white"><SpinnerIcon className="w-8 h-8 animate-spin text-slate-200" /></div>}
                        />
                    </Document>
                </div>
            )
          ) : (
            <div className="shadow-2xl bg-white p-1 rounded-sm">
                <img 
                    src={report.url} 
                    alt={report.file.name} 
                    style={{ width: scale === 1 ? 'auto' : pageWidth * scale, maxWidth: scale === 1 ? '100%' : 'none' }}
                    className={`max-h-full object-contain ${isLoading ? 'hidden' : 'block'}`}
                    onLoad={() => setIsLoading(false)}
                    onError={() => { setIsLoading(false); setError("This image could not be loaded."); }}
                />
            </div>
          )}
        </main>

        {/* Improved Controls Footer */}
        {(!isLoading && !error && !loadTimeout) && (
            <footer className="p-4 border-t border-slate-100 flex-shrink-0 bg-white safe-area-bottom">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    
                    {/* Page Nav */}
                    {isPdf && numPages ? (
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                            <button 
                                onClick={goToPrevPage} 
                                disabled={pageNumber <= 1} 
                                className="p-2 text-slate-600 hover:bg-white rounded-lg disabled:opacity-20 transition shadow-sm"
                            >
                                <ArrowLeftIcon className="w-5 h-5" />
                            </button>
                            <span className="px-4 text-xs font-bold text-slate-700 min-w-[100px] text-center">
                                {pageNumber} / {numPages}
                            </span>
                            <button 
                                onClick={goToNextPage} 
                                disabled={pageNumber >= numPages} 
                                className="p-2 text-slate-600 hover:bg-white rounded-lg disabled:opacity-20 transition shadow-sm"
                            >
                                <ArrowRightIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ) : <div className="hidden sm:block w-32" />}
                    
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button 
                            onClick={handleZoomOut} 
                            disabled={scale <= 0.5}
                            className="p-2 text-slate-600 hover:bg-white rounded-lg disabled:opacity-20 transition"
                        >
                            <MinusIcon className="w-5 h-5" />
                        </button>
                        <span className="px-3 text-xs font-bold text-slate-700 min-w-[60px] text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <button 
                            onClick={handleZoomIn} 
                            disabled={scale >= 3.0}
                            className="p-2 text-slate-600 hover:bg-white rounded-lg disabled:opacity-20 transition"
                        >
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Action Button */}
                    <a 
                        href={report.url} 
                        download={report.file.name}
                        className="hidden sm:flex items-center gap-2 text-xs font-bold text-brand-blue-600 hover:bg-brand-blue-50 px-4 py-2 rounded-xl transition"
                    >
                        Save Copy
                    </a>
                </div>
            </footer>
        )}
      </div>
    </div>
  );
};
