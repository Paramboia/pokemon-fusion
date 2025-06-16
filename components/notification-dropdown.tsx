"use client"

import { useState, useRef, useEffect } from 'react'
import { Bell, BellOff, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/use-notifications'
import { useUser } from '@clerk/nextjs'

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { isSubscribed, isLoading, toggleNotifications } = useNotifications()
  const { user, isLoaded } = useUser()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleOptionClick = async (enable: boolean) => {
    if (enable !== isSubscribed) {
      await toggleNotifications()
    }
    setIsOpen(false)
  }

  // Don't show the component if user is not authenticated (same behavior as wallet icon)
  if (!isLoaded || !user) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notification settings"
        disabled={isLoading}
      >
        {isSubscribed ? (
          <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        ) : (
          <BellOff className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-1">
            <button
              onClick={() => handleOptionClick(true)}
              disabled={isLoading}
              className={cn(
                "flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                Receive Notifications
              </span>
              {isSubscribed && <Check className="h-4 w-4 text-green-500" />}
            </button>
            
            <button
              onClick={() => handleOptionClick(false)}
              disabled={isLoading}
              className={cn(
                "flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="flex items-center">
                <BellOff className="h-4 w-4 mr-2" />
                No Notifications
              </span>
              {!isSubscribed && <Check className="h-4 w-4 text-green-500" />}
            </button>
          </div>
          
          {/* Optional: Show current status */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Status: {isSubscribed ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 