
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
  // Use the same version for cMaps as the worker to ensure compatibility
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
        // Subtract padding (32px approx) from container width
        const width = containerRef.current.clientWidth - 40;
        // Limit max width to avoid getting too massive on large screens, but allow zoom to expand it later
        setPageWidth(Math.min(width, 800));
      }
    };

    // Initial calculation
    updateWidth();

    // Listen for window resize
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [isOpen]);

  useEffect(() => {
    // Reset state when a new report is opened
    setNumPages(null);
    setPageNumber(1);
    setIsLoading(true);
    setError(null);
    setLoadTimeout(false);
    setScale(1.0); // Reset zoom

    // Safety timeout: if PDF doesn't load in 8 seconds, show fallback
    const timer = setTimeout(() => {
        // Only trigger timeout if we haven't loaded pages and haven't hit an error yet
        if (!numPages && !error) {
            setLoadTimeout(true);
            setIsLoading(false);
        }
    }, 8000);

    return () => clearTimeout(timer);
  }, [report.url, numPages, error]); 

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setIsLoading(false);
    setLoadTimeout(false);
  }
  
  function onDocumentLoadError(error: Error): void {
    console.error("PDF Load Error:", error);
    setError(`Failed to load PDF: ${error.message}`);
    setIsLoading(false);
  }
  
  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  if (!isOpen) return null;

  const isPdf = report.file.type === 'application/pdf';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
            <h2 className="text-lg font-bold text-slate-800 truncate" title={report.file.name}>
                {report.file.name}
            </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        
        <main 
          ref={containerRef}
          className="flex-grow overflow-auto bg-slate-100 flex items-start justify-center relative p-4"
        >
          {/* Loading Spinner */}
          {isLoading && !loadTimeout && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-100 bg-opacity-80">
              <SpinnerIcon className="w-8 h-8 text-brand-blue-600 animate-spin mx-auto" />
              <p className="mt-2 text-slate-500">Loading document...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center p-4 z-20 mt-10">
               <WarningIcon className="w-12 h-12 text-red-500 mx-auto" />
               <p className="mt-2 font-semibold text-red-700">Could not display file</p>
               <p className="text-sm text-slate-500 mt-1 mb-4">{error}</p>
               {error.includes('Password') && (
                 <p className="text-xs text-slate-400 mt-2 mb-4">The password provided might be incorrect.</p>
               )}
               <a 
                    href={report.url} 
                    download={report.file.name}
                    className="inline-flex items-center px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition"
                >
                    Download File Instead
                </a>
            </div>
          )}

          {/* Timeout / Fallback State */}
          {loadTimeout && !numPages && !error && (
             <div className="text-center p-6 z-20 max-w-md mt-10">
                <WarningIcon className="w-10 h-10 text-orange-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-800">Preview not available</h3>
                <p className="text-slate-600 mb-4">
                    The document took too long to load in the previewer. You can download it to view it locally.
                </p>
                <a 
                    href={report.url} 
                    download={report.file.name}
                    className="inline-flex items-center px-4 py-2 bg-brand-blue-600 text-white rounded-md hover:bg-brand-blue-700 transition"
                >
                    Download PDF
                </a>
             </div>
          )}
          
          {/* Content */}
          {isPdf ? (
            // We keep the Document component mounted to attempt loading,
            // but if it times out or errors, the UI above covers it.
            !error && !loadTimeout && (
                <div className="shadow-lg transition-transform duration-200 origin-top">
                    <Document
                        key={fileObj.url} // CRITICAL: Force remount on new file to clear previous PDF state
                        file={fileObj}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={null} 
                        options={options}
                        className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}
                    >
                        <Page 
                            pageNumber={pageNumber} 
                            width={pageWidth * scale}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            className="bg-white"
                        />
                    </Document>
                </div>
            )
          ) : (
            <img 
                src={report.url} 
                alt={report.file.name} 
                style={{ width: scale === 1 ? 'auto' : pageWidth * scale, maxWidth: scale === 1 ? '100%' : 'none' }}
                className={`max-h-full object-contain shadow-lg ${isLoading ? 'hidden' : 'block'}`}
                onLoad={() => setIsLoading(false)}
                onError={() => { setIsLoading(false); setError("Failed to load image."); }}
            />
          )}
        </main>

        {/* Footer with Controls */}
        {(!isLoading && !error && !loadTimeout) && (
            <footer className="p-3 border-t border-slate-200 flex-shrink-0 bg-white">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                    {/* Page Navigation (PDF Only) */}
                    {isPdf && numPages && (
                        <div className="flex items-center gap-4 order-2 sm:order-1">
                            <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition">
                                <ArrowLeftIcon className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-medium text-slate-600 whitespace-nowrap">
                                Page {pageNumber} of {numPages}
                            </span>
                            <button onClick={goToNextPage} disabled={pageNumber >= numPages} className="p-2 rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition">
                                <ArrowRightIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                    
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-3 order-1 sm:order-2 bg-slate-50 rounded-lg p-1">
                        <button 
                            onClick={handleZoomOut} 
                            disabled={scale <= 0.5}
                            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition"
                            title="Zoom Out"
                        >
                            <MinusIcon className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-semibold text-slate-600 w-10 text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <button 
                            onClick={handleZoomIn} 
                            disabled={scale >= 3.0}
                            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition"
                            title="Zoom In"
                        >
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </footer>
        )}
      </div>
    </div>
  );
};
