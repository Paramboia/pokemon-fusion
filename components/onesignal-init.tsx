"use client"

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

declare global {
  interface Window {
    OneSignal: any
    OneSignalDeferred: any[]
  }
}

export function OneSignalInit() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    // Only initialize OneSignal in the browser
    if (typeof window === 'undefined') return
    
    // Initialize OneSignal
    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      try {
        console.log('Initializing OneSignal...')
        
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'fc8aa10e-9c01-457a-8757-a6483474c38a',
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: {
            scope: '/'
          },
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          notificationClickHandlerMatch: 'origin',
          notificationClickHandlerAction: 'focus',
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: 'push',
                  autoPrompt: false, // We'll handle the prompt manually
                  text: {
                    actionMessage: 'Get notified about new Pokemon fusion challenges!',
                    acceptButton: 'Allow',
                    cancelButton: 'No Thanks'
                  }
                }
              ]
            }
          }
        })

        console.log('OneSignal initialized successfully!')

        // Set external user ID when user is loaded
        if (isLoaded && user) {
          const externalUserId = user.id
          console.log('Setting OneSignal external user ID:', externalUserId)
          
          await OneSignal.setExternalUserId(externalUserId)
          console.log('OneSignal external user ID set successfully')

          // Check if user is already subscribed
          const isSubscribed = await OneSignal.isPushNotificationsEnabled()
          console.log('User push notification status:', isSubscribed)

          // If not subscribed, we can show a prompt later
          if (!isSubscribed) {
            console.log('User is not subscribed to push notifications')
            // You can trigger a prompt here or store this state to show a custom prompt
          }
        }

        // Listen for subscription changes
        OneSignal.on('subscriptionChange', function(isSubscribed: boolean) {
          console.log('OneSignal subscription changed:', isSubscribed)
          
          if (isSubscribed) {
            console.log('User subscribed to push notifications!')
            // You can track this event or show a success message
          } else {
            console.log('User unsubscribed from push notifications')
          }
        })

        // Listen for notification clicks
        OneSignal.on('notificationClick', function(event: any) {
          console.log('OneSignal notification clicked:', event)
          
          // Handle notification click based on the data
          if (event.data && event.data.type === 'daily_motivation') {
            // Navigate to the home page or show fusion generator
            window.location.href = '/'
          }
        })

      } catch (error) {
        console.error('Error initializing OneSignal:', error)
      }
    })

    // Load OneSignal SDK
    if (!document.querySelector('script[src*="OneSignalSDK"]')) {
      const script = document.createElement('script')
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
      script.defer = true
      document.head.appendChild(script)
    }

  }, [isLoaded, user])

  return null // This component doesn't render anything
}

// Helper function to manually trigger notification prompt
export async function promptForNotifications() {
  if (typeof window !== 'undefined' && window.OneSignal) {
    try {
      const permission = await window.OneSignal.requestPermission()
      console.log('Notification permission result:', permission)
      return permission
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }
  return false
} 