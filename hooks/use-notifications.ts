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

  // Helper function to wait for OneSignal to be available
  const waitForOneSignal = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false
    
    let attempts = 0
    const maxAttempts = 50
    
    while (!window.OneSignal && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    return !!window.OneSignal
  }

  // Check subscription status when OneSignal is available
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!isLoaded) return
      
      const isAvailable = await waitForOneSignal()
      if (isAvailable) {
        try {
          const subscribed = await window.OneSignal.isPushNotificationsEnabled()
          setIsSubscribed(subscribed)
        } catch (error) {
          console.error('Error checking OneSignal subscription status:', error)
        }
      }
    }

    // Check subscription status
    checkSubscriptionStatus()
  }, [isLoaded])

  const toggleNotifications = async () => {
    setIsLoading(true)

    try {
      const isAvailable = await waitForOneSignal()
      
      if (!isAvailable) {
        toast.error('Notifications are not available yet. Please try again in a moment.')
        return
      }

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