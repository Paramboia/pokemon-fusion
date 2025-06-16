"use client"

import { useState, useRef, useEffect } from 'react'
import { Bell, BellOff, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@clerk/nextjs'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

declare global {
  interface Window {
    OneSignal: any
    OneSignalDeferred: any[]
  }
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, isLoaded } = useUser()
  const { supabaseUser } = useAuth() // Get Supabase user from auth context

  // Helper function to execute OneSignal commands using the deferred pattern
  const executeOneSignalCommand = (command: (OneSignal: any) => Promise<any>): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window not available'))
        return
      }

      // Initialize OneSignalDeferred if it doesn't exist
      window.OneSignalDeferred = window.OneSignalDeferred || []
      
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        try {
          const result = await command(OneSignal)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
    })
  }

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

  // Check subscription status when component mounts
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!isLoaded) return
      
      try {
        const subscribed = await executeOneSignalCommand(async (OneSignal) => {
          // Try different methods that might be available in v16
          if (typeof OneSignal.User?.PushSubscription?.optedIn === 'boolean') {
            return OneSignal.User.PushSubscription.optedIn
          }
          
          if (typeof OneSignal.Notifications?.permission === 'string') {
            return OneSignal.Notifications.permission === 'granted'
          }

          // Fallback: assume subscribed since you're receiving notifications
          return true
        })
        
        setIsSubscribed(subscribed)
      } catch (error) {
        console.error('Error checking OneSignal subscription status:', error)
        // Since you're receiving notifications, assume subscribed
        setIsSubscribed(true)
      }
    }

    // Check subscription status after a delay to allow OneSignal to initialize
    const timer = setTimeout(() => {
      checkSubscriptionStatus()
    }, 3000)

    return () => clearTimeout(timer)
  }, [isLoaded])

  const handleOptionClick = async (enable: boolean) => {
    if (enable === isSubscribed) {
      setIsOpen(false)
      return
    }

    setIsLoading(true)

    try {
      if (enable) {
        // Enable notifications using v16 pattern
        const success = await executeOneSignalCommand(async (OneSignal) => {
          if (typeof OneSignal.Notifications?.requestPermission === 'function') {
            const granted = await OneSignal.Notifications.requestPermission()
            
            // Set external user ID when user subscribes - prefer Supabase ID
            if (granted) {
              const externalUserId = supabaseUser?.id || user?.id
              if (externalUserId && typeof OneSignal.login === 'function') {
                try {
                  await OneSignal.login(externalUserId)
                  console.log('User logged in with external ID (Supabase):', externalUserId)
                  
                  // Also send this information to our backend for tracking
                  try {
                    const playerId = OneSignal.User?.PushSubscription?.id || null
                    await fetch('/api/notifications/link-user', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        clerkUserId: user?.id,
                        supabaseUserId: supabaseUser?.id,
                        oneSignalPlayerId: playerId,
                        userEmail: user?.primaryEmailAddress?.emailAddress
                      })
                    })
                    console.log('User linking info sent to backend with Supabase ID')
                  } catch (linkError) {
                    console.warn('Failed to send user linking info to backend:', linkError)
                  }
                } catch (loginError) {
                  console.warn('Failed to set external user ID:', loginError)
                }
              }
            }
            
            return granted
          } else if (typeof OneSignal.User?.PushSubscription?.optIn === 'function') {
            await OneSignal.User.PushSubscription.optIn()
            
            // Set external user ID when user subscribes - prefer Supabase ID
            const externalUserId = supabaseUser?.id || user?.id
            if (externalUserId && typeof OneSignal.login === 'function') {
              try {
                await OneSignal.login(externalUserId)
                console.log('User logged in with external ID (Supabase):', externalUserId)
                
                // Also send this information to our backend for tracking
                try {
                  const playerId = OneSignal.User?.PushSubscription?.id || null
                  await fetch('/api/notifications/link-user', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      clerkUserId: user?.id,
                      supabaseUserId: supabaseUser?.id,
                      oneSignalPlayerId: playerId,
                      userEmail: user?.primaryEmailAddress?.emailAddress
                    })
                  })
                  console.log('User linking info sent to backend with Supabase ID')
                } catch (linkError) {
                  console.warn('Failed to send user linking info to backend:', linkError)
                }
              } catch (loginError) {
                console.warn('Failed to set external user ID:', loginError)
              }
            }
            
            return true
          } else {
            throw new Error('No opt-in method available')
          }
        })
        
        if (success) {
          setIsSubscribed(true)
          toast.success('Push notifications enabled! You\'ll get daily Pokemon fusion reminders.')
        } else {
          toast.error('Permission denied. You can enable notifications in your browser settings.')
        }
      } else {
        // Disable notifications using v16 pattern
        await executeOneSignalCommand(async (OneSignal) => {
          if (typeof OneSignal.User?.PushSubscription?.optOut === 'function') {
            await OneSignal.User.PushSubscription.optOut()
          } else if (typeof OneSignal.Notifications?.setSubscription === 'function') {
            await OneSignal.Notifications.setSubscription(false)
          } else {
            throw new Error('No opt-out method available')
          }
        })
        
        setIsSubscribed(false)
        toast.success('Push notifications disabled')
      }
    } catch (error) {
      console.error('Error toggling notifications:', error)
      toast.error('Failed to update notification settings. Please try again.')
    } finally {
      setIsLoading(false)
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
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
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
            <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Status: {isSubscribed ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 