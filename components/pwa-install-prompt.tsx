'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export const PwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if running on client-side
    if (typeof window === 'undefined') return;

    // Check if already installed or dismissed
    const isPwaInstalled = localStorage.getItem('pwaInstalled') === 'true';
    const isPwaDismissed = localStorage.getItem('pwaDismissed') === 'true';
    
    if (isPwaInstalled || isPwaDismissed) return;

    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default prompt
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Check if we should show our custom prompt
      const shouldShow = isMobile && !isPwaInstalled && !isPwaDismissed;
      setIsVisible(shouldShow);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Clean up event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('resize', checkMobile);
    };
  }, [isMobile]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the native install prompt
    await deferredPrompt.prompt();

    // Wait for the user's choice
    const choiceResult = await deferredPrompt.userChoice;

    // Update localStorage based on user choice
    if (choiceResult.outcome === 'accepted') {
      localStorage.setItem('pwaInstalled', 'true');
    } else {
      localStorage.setItem('pwaDismissed', 'true');
    }

    // Reset the deferredPrompt variable
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  // Handle close button click
  const handleCloseClick = () => {
    localStorage.setItem('pwaDismissed', 'true');
    setIsVisible(false);
  };

  // Only show on mobile and when the prompt is available
  if (!isVisible || !isMobile) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            padding: '1rem',
            backgroundColor: '#4f46e5',
            borderTopWidth: '1px',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
            borderTopLeftRadius: '0.5rem',
            borderTopRightRadius: '0.5rem',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <p className="text-base font-medium text-white">
                Pokémon Fusion App
              </p>
              <p className="text-sm text-white/80 mt-1">
                Create new amazing Pokémon fusions
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleInstallClick}
                className="px-5 py-2.5 bg-white text-primary text-sm font-medium rounded-md hover:bg-white/90 transition-colors"
              >
                Install
              </button>
              <button 
                onClick={handleCloseClick}
                className="p-1.5 rounded-full bg-transparent hover:bg-white/10 transition-colors text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 