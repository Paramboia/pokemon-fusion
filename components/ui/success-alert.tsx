import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessAlertProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseTime?: number;
}

export function SuccessAlert({
  message,
  isVisible,
  onClose,
  autoClose = true,
  autoCloseTime = 5000,
}: SuccessAlertProps) {
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isVisible && autoClose) {
      timer = setTimeout(() => {
        onClose();
      }, autoCloseTime);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isVisible, autoClose, autoCloseTime, onClose]);

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed top-4 left-1/2 transform -translate-x-1/2 z-50",
      "max-w-md w-full bg-green-50 border border-green-200 rounded-lg shadow-md",
      "px-4 py-3 flex items-center justify-between",
      "animate-in fade-in slide-in-from-top-5 duration-300"
    )}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-green-800">{message}</p>
        </div>
      </div>
      <button
        type="button"
        className="inline-flex text-green-500 hover:text-green-700 focus:outline-none"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
} 