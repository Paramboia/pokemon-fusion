'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
          className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t border-border shadow-lg rounded-t-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <p className="text-sm font-medium text-foreground">
                Install Pokémon Fusion on your device
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Get the best fusion experience with our app
              </p>
            </div>
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
            >
              Install
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 