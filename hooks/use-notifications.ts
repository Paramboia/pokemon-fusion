"use client"

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'

declare global {
  interface Window {
    OneSignal: any
  }
}

export function useNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const { user } = useUser()

  useEffect(() => {
    if (typeof window !== 'undefined' && window.OneSignal) {
      initializeOneSignal()
    }
  }, [user])

  const initializeOneSignal = async () => {
    try {
      await window.OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        notifyButton: {
          enable: true,
        },
        allowLocalhostAsSecureOrigin: true,
      })

      window.OneSignal.showSlidedownPrompt()

      // Set external user id for notifications
      if (user) {
        window.OneSignal.setExternalUserId(user.id)
      }

      const state = await window.OneSignal.getNotificationPermission()
      setIsSubscribed(state === 'granted')

      // Listen for subscription changes
      window.OneSignal.on('subscriptionChange', function (isSubscribed: boolean) {
        setIsSubscribed(isSubscribed)
      })
    } catch (error) {
      console.error('Error initializing OneSignal:', error)
    }
  }

  const toggleNotifications = async () => {
    if (!window.OneSignal) return

    try {
      if (isSubscribed) {
        await window.OneSignal.setSubscription(false)
      } else {
        await window.OneSignal.setSubscription(true)
      }
    } catch (error) {
      console.error('Error toggling notifications:', error)
    }
  }

  return {
    isSubscribed,
    toggleNotifications
  }
} 