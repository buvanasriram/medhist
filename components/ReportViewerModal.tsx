
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import { CloseIcon } from './icons/CloseIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { WarningIcon } from './icons/WarningIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { PlusIcon } from './icons/PlusIcon';
import { MinusIcon } from './icons/MinusIcon';
import { DownloadIcon } from './icons/DownloadIcon';
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

  const options = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  }), []);

  const fileObj = useMemo(() => ({
    url: report.url,
    password: report.file.password
  }), [report.url, report.file.password]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setPageWidth(Math.min(width - 32, 1200));
      }
    };

    if (isOpen) {
        updateWidth();
        const timeout = setTimeout(updateWidth, 100);
        window.addEventListener('resize', updateWidth);
        return () => {
            window.removeEventListener('resize', updateWidth);
            clearTimeout(timeout);
        };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
        setNumPages(null);
        setPageNumber(1);
        setIsLoading(true);
        setError(null);
        setLoadTimeout(false);
        setScale(1.0);

        // Mobile fallback timer: if nothing loads in 6s, show the manual link
        const timer = setTimeout(() => {
            if (isLoading) {
                setLoadTimeout(true);
            }
        }, 6000);

        return () => clearTimeout(timer);
    }
  }, [isOpen, report.url]); 

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setIsLoading(false);
    setLoadTimeout(false);
    setError(null);
  }
  
  function onDocumentLoadError(err: Error): void {
    console.error("PDF Load Error:", err);
    if (err.name === 'PasswordException') {
        setError("This file is password protected. Please re-upload with the correct password.");
    } else {
        setError(`Could not render PDF. Your browser might be blocking the worker.`);
    }
    setIsLoading(false);
  }
  
  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 4.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  if (!isOpen) return null;

  const isPdf = report.file.type === 'application/pdf';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex items-center justify-center sm:p-4 animate-fadeIn">
      <div className="bg-white shadow-2xl w-full max-w-5xl h-full sm:h-[95vh] sm:rounded-2xl flex flex-col overflow-hidden relative">
        
        <header className="flex items-center justify-between p-4 border-b border-slate-100 flex-shrink-0 bg-white z-20">
            <div className="flex flex-col min-w-0">
                <h2 className="text-sm font-bold text-slate-800 truncate pr-4" title={report.file.name}>
                    {report.file.name}
                </h2>
                {numPages && isPdf && (
                    <span className="text-[10px] text-brand-blue-600 font-bold uppercase tracking-wider">
                        Page {pageNumber} of {numPages}
                    </span>
                )}
            </div>
            <button 
                onClick={onClose} 
                className="p-3 -mr-2 text-slate-400 hover:text-slate-600 active:bg-slate-100 rounded-full transition"
                aria-label="Close"
            >
                <CloseIcon className="w-7 h-7" />
            </button>
        </header>
        
        <main 
          ref={containerRef}
          className="flex-grow overflow-auto bg-slate-200 flex items-start justify-center relative p-2 sm:p-6"
        >
          {/* Loading Overlay */}
          {isLoading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-200 p-6 text-center">
              <SpinnerIcon className="w-12 h-12 text-brand-blue-600 animate-spin mb-4" />
              <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-6">Rendering Document...</p>
              
              {loadTimeout && (
                  <div className="bg-white p-6 rounded-2xl shadow-xl max-w-xs animate-fadeIn">
                      <p className="text-sm text-slate-600 mb-4">Taking longer than usual on mobile...</p>
                      <a 
                        href={report.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-brand-blue-600 text-white font-bold rounded-xl shadow-md active:scale-95"
                      >
                         <DownloadIcon className="w-4 h-4" /> Open in Browser
                      </a>
                  </div>
              )}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center p-8 z-20 mt-10 max-w-sm bg-white rounded-2xl shadow-xl">
               <div className="bg-red-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <WarningIcon className="w-8 h-8 text-red-500" />
               </div>
               <p className="font-bold text-slate-800 text-lg">Display Error</p>
               <p className="text-sm text-slate-500 mt-2 mb-6 leading-relaxed">{error}</p>
               <div className="flex flex-col gap-3">
                   <a 
                        href={report.url} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-brand-blue-600 text-white font-bold rounded-xl hover:bg-brand-blue-700 shadow-md transition active:scale-95"
                    >
                        <DownloadIcon className="w-4 h-4" /> Open Native File
                    </a>
                    <button onClick={onClose} className="text-sm text-slate-400 font-bold hover:text-slate-600 p-2">
                        Close Preview
                    </button>
               </div>
            </div>
          )}
          
          {/* Main Content Area */}
          <div className={`transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
            {isPdf ? (
                !error && (
                    <div className="shadow-2xl bg-white origin-top-center">
                        <Document
                            key={fileObj.url} 
                            file={fileObj}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading={null} 
                            options={options}
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
                <div className="shadow-2xl bg-white p-1">
                    <img 
                        src={report.url} 
                        alt={report.file.name} 
                        style={{ width: pageWidth * scale, maxWidth: 'none' }}
                        className={`object-contain ${isLoading ? 'hidden' : 'block'}`}
                        onLoad={() => setIsLoading(false)}
                        onError={() => { setIsLoading(false); setError("This image could not be loaded."); }}
                    />
                </div>
            )}
          </div>
        </main>

        {(!isLoading && !error) && (
            <footer className="p-4 border-t border-slate-100 flex-shrink-0 bg-white safe-area-bottom z-20">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    
                    {/* Page Navigation */}
                    {isPdf && numPages ? (
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-full sm:w-auto justify-between sm:justify-start">
                            <button 
                                onClick={goToPrevPage} 
                                disabled={pageNumber <= 1} 
                                className="p-3 text-slate-600 active:bg-white active:shadow-sm rounded-xl disabled:opacity-20 transition"
                            >
                                <ArrowLeftIcon className="w-6 h-6" />
                            </button>
                            <span className="px-4 text-xs font-black text-slate-700 tracking-tighter">
                                {pageNumber} / {numPages}
                            </span>
                            <button 
                                onClick={goToNextPage} 
                                disabled={pageNumber >= numPages} 
                                className="p-3 text-slate-600 active:bg-white active:shadow-sm rounded-xl disabled:opacity-20 transition"
                            >
                                <ArrowRightIcon className="w-6 h-6" />
                            </button>
                        </div>
                    ) : <div className="hidden sm:block w-32" />}
                    
                    {/* Zoom & Actions */}
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl flex-grow sm:flex-grow-0 justify-between">
                            <button 
                                onClick={handleZoomOut} 
                                disabled={scale <= 0.5}
                                className="p-3 text-slate-600 active:bg-white rounded-xl disabled:opacity-20 transition"
                            >
                                <MinusIcon className="w-6 h-6" />
                            </button>
                            <span className="px-3 text-[10px] font-black text-slate-700 min-w-[50px] text-center">
                                {Math.round(scale * 100)}%
                            </span>
                            <button 
                                onClick={handleZoomIn} 
                                disabled={scale >= 4.0}
                                className="p-3 text-slate-600 active:bg-white rounded-xl disabled:opacity-20 transition"
                            >
                                <PlusIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <a 
                            href={report.url} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 bg-brand-blue-50 text-brand-blue-600 rounded-2xl hover:bg-brand-blue-100 transition sm:hidden"
                        >
                           <ArrowRightIcon className="w-6 h-6 rotate-90" />
                        </a>
                    </div>
                </div>
            </footer>
        )}
      </div>
    </div>
  );
};
