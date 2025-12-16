
import React, { useState, useEffect } from 'react';
import { DownloadIcon } from './icons/DownloadIcon';

export const InstallAppButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Check for iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    
    if (isIosDevice && !isStandalone) {
        setIsIOS(true);
    }

    // Capture the install prompt for Android/Desktop
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
        setShowIOSPrompt(true);
        // Auto-hide after 8 seconds
        setTimeout(() => setShowIOSPrompt(false), 8000);
        return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  if (!deferredPrompt && !isIOS) return null;

  return (
    <div className="relative">
        <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 text-brand-blue-600 bg-brand-blue-50 hover:bg-brand-blue-100 px-3 py-1.5 rounded-lg transition text-xs font-bold border border-brand-blue-200"
            title="Install App"
        >
            <DownloadIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Install App</span>
        </button>
        
        {showIOSPrompt && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 text-white p-3 rounded-lg shadow-xl z-50 text-xs text-left animate-fadeIn">
                <div className="absolute top-0 right-4 -mt-1 w-2 h-2 bg-slate-800 transform rotate-45"></div>
                <p>To install medHist on iOS:</p>
                <ol className="list-decimal ml-4 mt-1 space-y-1 text-slate-300">
                    <li>Tap the <strong>Share</strong> button <span className="inline-block bg-slate-600 px-1 rounded">⎋</span></li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                </ol>
            </div>
        )}
    </div>
  );
};
