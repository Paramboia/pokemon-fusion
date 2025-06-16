"use client"

import { useState, useRef, useEffect } from 'react'
import { Bell, BellOff, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@clerk/nextjs'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { event as gaEvent } from '@/lib/gtag'

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

  // Helper function to refresh subscription status
  const refreshSubscriptionStatus = async () => {
    try {
      const subscribed = await executeOneSignalCommand(async (OneSignal) => {
        // Check OneSignal v16 subscription status
        if (typeof OneSignal.User?.PushSubscription?.optedIn === 'boolean') {
          console.log('Refreshed OneSignal subscription status (optedIn):', OneSignal.User.PushSubscription.optedIn)
          return OneSignal.User.PushSubscription.optedIn
        }
        
        // Fallback: Check browser permission and OneSignal permission
        let browserPermission = 'default'
        if (typeof OneSignal.Notifications?.permission === 'string') {
          browserPermission = OneSignal.Notifications.permission
        } else if (typeof Notification !== 'undefined') {
          browserPermission = Notification.permission
        }
        
        // If browser permission is denied, definitely not subscribed
        if (browserPermission === 'denied') {
          return false
        }
        
        // If browser permission is granted, check if OneSignal subscription is active
        if (browserPermission === 'granted') {
          // Try to get subscription ID to verify active subscription
          if (OneSignal.User?.PushSubscription?.id) {
            return true
          }
          return false
        }
        
        return false
      })
      
      console.log('Refreshed subscription status:', subscribed)
      setIsSubscribed(subscribed)
      return subscribed
    } catch (error) {
      console.error('Error refreshing subscription status:', error)
      return isSubscribed // Return current state if refresh fails
    }
  }

  // Check subscription status when component mounts
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!isLoaded) return
      
      try {
        const subscribed = await executeOneSignalCommand(async (OneSignal) => {
          // Check OneSignal v16 subscription status
          if (typeof OneSignal.User?.PushSubscription?.optedIn === 'boolean') {
            console.log('OneSignal subscription status (optedIn):', OneSignal.User.PushSubscription.optedIn)
            return OneSignal.User.PushSubscription.optedIn
          }
          
          // Fallback: Check browser permission and OneSignal permission
          let browserPermission = 'default'
          if (typeof OneSignal.Notifications?.permission === 'string') {
            browserPermission = OneSignal.Notifications.permission
            console.log('Browser notification permission:', browserPermission)
          } else if (typeof Notification !== 'undefined') {
            browserPermission = Notification.permission
            console.log('Native browser notification permission:', browserPermission)
          }
          
          // If browser permission is denied, definitely not subscribed
          if (browserPermission === 'denied') {
            return false
          }
          
          // If browser permission is granted, check if OneSignal subscription is active
          if (browserPermission === 'granted') {
            // Try to get subscription ID to verify active subscription
            if (OneSignal.User?.PushSubscription?.id) {
              console.log('OneSignal player ID exists:', OneSignal.User.PushSubscription.id)
              return true
            }
            
            // If we have permission but no subscription ID, might be opted out
            console.log('Browser permission granted but no OneSignal subscription ID')
            return false
          }
          
          // Default case: not subscribed
          return false
        })
        
        console.log('Final subscription status:', subscribed)
        setIsSubscribed(subscribed)
        
        // Track initial subscription status
        gaEvent({
          action: 'notification_status_checked',
          category: 'notifications',
          label: subscribed ? 'subscribed' : 'not_subscribed',
          value: undefined
        })
      } catch (error) {
        console.error('Error checking OneSignal subscription status:', error)
        
        // Fallback: Check browser permission directly
        try {
          if (typeof Notification !== 'undefined') {
            const browserPermission = Notification.permission
            console.log('Fallback: Browser permission is', browserPermission)
            setIsSubscribed(browserPermission === 'granted')
          } else {
            setIsSubscribed(false)
          }
        } catch (fallbackError) {
          console.error('Fallback permission check failed:', fallbackError)
          setIsSubscribed(false)
        }
      }
    }

    // Check subscription status after a delay to allow OneSignal to initialize
    const timer = setTimeout(() => {
      checkSubscriptionStatus()
    }, 3000)

    return () => clearTimeout(timer)
  }, [isLoaded])

  const handleBellClick = () => {
    // Track bell icon click
    gaEvent({
      action: 'notification_bell_clicked',
      category: 'notifications',
      label: isSubscribed ? 'subscribed_user' : 'unsubscribed_user',
      value: undefined
    })
    
    setIsOpen(!isOpen)
  }

  const handleOptionClick = async (enable: boolean) => {
    if (enable === isSubscribed) {
      setIsOpen(false)
      return
    }

    setIsLoading(true)

    // Track the attempt to change notification settings
    gaEvent({
      action: 'notification_setting_change_attempt',
      category: 'notifications',
      label: enable ? 'enable_attempt' : 'disable_attempt',
      value: undefined
    })

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
          // Refresh status after successful enable
          setTimeout(async () => {
            await refreshSubscriptionStatus()
          }, 1000)
          
          toast.success('Push notifications enabled! You\'ll get daily Pokemon fusion reminders.')
          
          // Track successful notification enable
          gaEvent({
            action: 'notifications_enabled',
            category: 'notifications',
            label: 'success',
            value: undefined
          })
        } else {
          toast.error('Permission denied. You can enable notifications in your browser settings.')
          
          // Track failed notification enable
          gaEvent({
            action: 'notifications_enable_failed',
            category: 'notifications',
            label: 'permission_denied',
            value: undefined
          })
        }
      } else {
        // Disable notifications using v16 pattern
        const success = await executeOneSignalCommand(async (OneSignal) => {
          console.log('Attempting to opt out from OneSignal notifications...')
          
          if (typeof OneSignal.User?.PushSubscription?.optOut === 'function') {
            await OneSignal.User.PushSubscription.optOut()
            console.log('OneSignal optOut called successfully')
            return true
          } else if (typeof OneSignal.Notifications?.setSubscription === 'function') {
            await OneSignal.Notifications.setSubscription(false)
            console.log('OneSignal setSubscription(false) called successfully')
            return true
          } else {
            console.warn('No OneSignal opt-out method available')
            return false
          }
        })
        
        if (success) {
          // Refresh status after successful disable
          setTimeout(async () => {
            await refreshSubscriptionStatus()
          }, 1000)
          
          toast.success('Push notifications disabled. You won\'t receive daily reminders anymore.')
          
          // Track successful notification disable
          gaEvent({
            action: 'notifications_disabled',
            category: 'notifications',
            label: 'success',
            value: undefined
          })
        } else {
          toast.error('Failed to disable notifications. Please try again or disable in your browser settings.')
          
          // Track failed notification disable
          gaEvent({
            action: 'notifications_disable_failed',
            category: 'notifications',
            label: 'api_error',
            value: undefined
          })
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error)
      toast.error('Failed to update notification settings. Please try again.')
      
      // Track error in notification settings change
      gaEvent({
        action: 'notification_setting_error',
        category: 'notifications',
        label: enable ? 'enable_error' : 'disable_error',
        value: undefined
      })
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
        onClick={handleBellClick}
        aria-label="Notification settings"
        disabled={isLoading}
        title="Your notifications"
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