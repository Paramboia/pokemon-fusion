"use client"

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

declare global {
  interface Window {
    OneSignal: any
    OneSignalDeferred: any[]
    _oneSignalInitialized: boolean
    _oneSignalInitializing: boolean
  }
}

export function OneSignalInit() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    // Only initialize OneSignal in the browser
    if (typeof window === 'undefined') return
    
    // Prevent multiple initializations
    if (window._oneSignalInitialized || window._oneSignalInitializing) {
      console.log('OneSignal already initialized or initializing, skipping...')
      return
    }

    window._oneSignalInitializing = true
    
    // Load OneSignal SDK first
    const loadOneSignal = () => {
      if (!document.querySelector('script[src*="OneSignalSDK"]')) {
        const script = document.createElement('script')
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
        script.defer = true
        script.onload = initializeOneSignal
        script.onerror = () => {
          console.error('Failed to load OneSignal SDK')
          window._oneSignalInitializing = false
        }
        document.head.appendChild(script)
      } else {
        // Script already exists, try to initialize
        initializeOneSignal()
      }
    }

    // Helper function to wait for OneSignal methods to be ready
    const waitForOneSignalMethods = async (): Promise<boolean> => {
      let attempts = 0
      const maxAttempts = 100 // 10 seconds - increased timeout
      
      while (attempts < maxAttempts) {
        try {
          // First check if OneSignal object exists
          if (!window.OneSignal) {
            console.log(`Init - Attempt ${attempts + 1}: OneSignal object not found`)
            await new Promise(resolve => setTimeout(resolve, 100))
            attempts++
            continue
          }

          // Check if OneSignal is initialized
          if (!window.OneSignal.initialized) {
            console.log(`Init - Attempt ${attempts + 1}: OneSignal not initialized yet`)
            await new Promise(resolve => setTimeout(resolve, 100))
            attempts++
            continue
          }

          // Check for required methods
          const requiredMethods = [
            'isPushNotificationsEnabled',
            'requestPermission', 
            'setSubscription',
            'setExternalUserId',
            'getPlayerId',
            'on'
          ]

          const missingMethods = requiredMethods.filter(method => 
            typeof window.OneSignal[method] !== 'function'
          )

          if (missingMethods.length === 0) {
            console.log('Init - All OneSignal methods are now available!')
            return true
          } else {
            console.log(`Init - Attempt ${attempts + 1}: Missing methods:`, missingMethods)
          }
        } catch (e) {
          console.log(`Init - Attempt ${attempts + 1}: Error checking methods:`, e)
        }
        
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }
      
      console.warn('Init - OneSignal methods not ready after 10 seconds')
      return false
    }

    const initializeOneSignal = async () => {
      try {
        // Wait for OneSignal to be available
        let attempts = 0
        const maxAttempts = 50
        
        while (!window.OneSignal && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        
        if (!window.OneSignal) {
          console.error('OneSignal SDK failed to load after', maxAttempts * 100, 'ms')
          window._oneSignalInitializing = false
          return
        }

        // Check if OneSignal is already initialized
        if (window.OneSignal.initialized) {
          console.log('OneSignal already initialized, waiting for methods and setting up user linking...')
          window._oneSignalInitialized = true
          window._oneSignalInitializing = false
          
          // Wait for methods to be ready then set up user linking
          const methodsReady = await waitForOneSignalMethods()
          if (methodsReady) {
            await setupUserLinking()
            setupEventListeners()
          }
          return
        }

        console.log('Initializing OneSignal...')
        
        await window.OneSignal.init({
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
        window._oneSignalInitialized = true
        window._oneSignalInitializing = false

        // Wait for methods to be ready before setting up user linking and event listeners
        console.log('Waiting for OneSignal methods to be ready...')
        const methodsReady = await waitForOneSignalMethods()
        
        if (methodsReady) {
          await setupUserLinking()
          setupEventListeners()
        } else {
          console.error('OneSignal methods not ready, skipping user linking and event listeners')
        }

      } catch (error) {
        console.error('Error initializing OneSignal:', error)
        window._oneSignalInitializing = false
      }
    }

    const setupUserLinking = async () => {
      // Set external user ID when user is loaded and logged in
      if (isLoaded && user) {
        const externalUserId = user.id
        console.log('Setting OneSignal external user ID:', externalUserId)
        
        try {
          // Get current player ID for logging
          const playerId = await window.OneSignal.getPlayerId()
          console.log('Current OneSignal player ID:', playerId)
          
          // Set the external user ID to link this subscription to our user
          await window.OneSignal.setExternalUserId(externalUserId)
          console.log('OneSignal external user ID set successfully')

          // Also send this information to our backend for tracking
          try {
            await fetch('/api/notifications/link-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                clerkUserId: externalUserId,
                oneSignalPlayerId: playerId,
                userEmail: user.primaryEmailAddress?.emailAddress
              })
            })
            console.log('User linking info sent to backend')
          } catch (linkError) {
            console.warn('Failed to send user linking info to backend:', linkError)
            // Don't fail the whole process if backend linking fails
          }

          // Check if user is already subscribed
          const isSubscribed = await window.OneSignal.isPushNotificationsEnabled()
          console.log('User push notification status:', isSubscribed)

          // If not subscribed, we can show a prompt later
          if (!isSubscribed) {
            console.log('User is not subscribed to push notifications')
          }

        } catch (setExternalUserIdError) {
          console.error('Failed to set OneSignal external user ID:', setExternalUserIdError)
        }
      }
    }

    const setupEventListeners = () => {
      try {
        console.log('Setting up OneSignal event listeners...')
        
        // Listen for subscription changes
        window.OneSignal.on('subscriptionChange', function(isSubscribed: boolean) {
          console.log('OneSignal subscription changed:', isSubscribed)
          
          if (isSubscribed) {
            console.log('User subscribed to push notifications!')
            
            // If user is logged in, immediately set their external user ID
            if (user?.id) {
              window.OneSignal.setExternalUserId(user.id).then(() => {
                console.log('External user ID set after subscription change')
              }).catch((error: any) => {
                console.error('Failed to set external user ID after subscription:', error)
              })
            }
          } else {
            console.log('User unsubscribed from push notifications')
          }
        })

        // Listen for notification clicks
        window.OneSignal.on('notificationClick', function(event: any) {
          console.log('OneSignal notification clicked:', event)
          
          // Handle notification click based on the data
          if (event.data && event.data.type === 'daily_motivation') {
            // Navigate to the home page or show fusion generator
            window.location.href = '/'
          }
        })
        
        console.log('OneSignal event listeners set up successfully!')
        
      } catch (error) {
        console.error('Error setting up OneSignal event listeners:', error)
      }
    }

    // Start the loading process
    loadOneSignal()

    // Cleanup function
    return () => {
      // Don't reset the initialization flag on cleanup as OneSignal should persist
    }

  }, [isLoaded, user])

  return null // This component doesn't render anything
}

// Helper function to wait for OneSignal to be available with methods
async function waitForOneSignal(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  let attempts = 0
  const maxAttempts = 50
  
  while (!window.OneSignal && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  if (window.OneSignal) {
    // Also wait for methods to be available
    let methodsAttempts = 0
    const maxMethodsAttempts = 50 // Increased timeout
    
    while (methodsAttempts < maxMethodsAttempts) {
      try {
        if (typeof window.OneSignal.isPushNotificationsEnabled === 'function' &&
            typeof window.OneSignal.requestPermission === 'function' &&
            typeof window.OneSignal.setSubscription === 'function') {
          return true
        }
      } catch (e) {
        // Methods not ready
      }
      await new Promise(resolve => setTimeout(resolve, 100))
      methodsAttempts++
    }
  }
  
  return false
}

// Helper function to manually trigger notification prompt
export async function promptForNotifications() {
  const isAvailable = await waitForOneSignal()
  
  if (isAvailable) {
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

// Helper function to manually link user if they're already subscribed
export async function linkCurrentUser() {
  const isAvailable = await waitForOneSignal()
  
  if (isAvailable) {
    try {
      const playerId = await window.OneSignal.getPlayerId()
      const isSubscribed = await window.OneSignal.isPushNotificationsEnabled()
      
      console.log('Current subscription status:', { playerId, isSubscribed })
      
      return { playerId, isSubscribed }
    } catch (error) {
      console.error('Error checking current user subscription:', error)
      return null
    }
  }
  return null
} 