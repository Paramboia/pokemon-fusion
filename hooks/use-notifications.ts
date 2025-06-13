"use client"

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { toast } from 'sonner'

declare global {
  interface Window {
    OneSignal: any
  }
}

export function useNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user, isLoaded } = useUser()

  // Check subscription status when OneSignal is available
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (typeof window !== 'undefined' && window.OneSignal && isLoaded) {
        try {
          const subscribed = await window.OneSignal.isPushNotificationsEnabled()
          setIsSubscribed(subscribed)
        } catch (error) {
          console.error('Error checking OneSignal subscription status:', error)
        }
      }
    }

    // Check immediately if OneSignal is already loaded
    checkSubscriptionStatus()

    // Also check periodically in case OneSignal loads later
    const interval = setInterval(checkSubscriptionStatus, 1000)
    
    // Clear interval after 10 seconds
    setTimeout(() => clearInterval(interval), 10000)

    return () => clearInterval(interval)
  }, [isLoaded])

  const toggleNotifications = async () => {
    if (!window.OneSignal) {
      toast.error('Notifications are not available yet. Please try again in a moment.')
      return
    }

    setIsLoading(true)

    try {
      if (isSubscribed) {
        // Unsubscribe
        await window.OneSignal.setSubscription(false)
        setIsSubscribed(false)
        toast.success('Push notifications disabled')
      } else {
        // Subscribe
        const permission = await window.OneSignal.requestPermission()
        
        if (permission) {
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