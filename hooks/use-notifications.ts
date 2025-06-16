"use client"

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { toast } from 'sonner'

declare global {
  interface Window {
    OneSignal: any
    OneSignalDeferred: any[]
  }
}

export function useNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user, isLoaded } = useUser()

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

  // Check subscription status when OneSignal is available
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

  const toggleNotifications = async () => {
    setIsLoading(true)

    try {
      if (isSubscribed) {
        // Unsubscribe using v16 pattern
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
      } else {
        // Subscribe using v16 pattern
        const success = await executeOneSignalCommand(async (OneSignal) => {
          if (typeof OneSignal.Notifications?.requestPermission === 'function') {
            const granted = await OneSignal.Notifications.requestPermission()
            
            // Set external user ID when user subscribes
            if (granted && user?.id && typeof OneSignal.login === 'function') {
              try {
                await OneSignal.login(user.id)
                console.log('User logged in with external ID:', user.id)
              } catch (loginError) {
                console.warn('Failed to set external user ID:', loginError)
              }
            }
            
            return granted
          } else if (typeof OneSignal.User?.PushSubscription?.optIn === 'function') {
            await OneSignal.User.PushSubscription.optIn()
            
            // Set external user ID when user subscribes
            if (user?.id && typeof OneSignal.login === 'function') {
              try {
                await OneSignal.login(user.id)
                console.log('User logged in with external ID:', user.id)
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
      }
    } catch (error) {
      console.error('Error toggling notifications:', error)
      toast.error('Failed to update notification settings. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isSubscribed,
    isLoading,
    toggleNotifications
  }
} 