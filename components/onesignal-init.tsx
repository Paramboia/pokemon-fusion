"use client"

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useAuth } from '@/contexts/auth-context'
import { event as gaEvent } from '@/lib/gtag'

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
  const { supabaseUser } = useAuth() // Get Supabase user from auth context

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
          
          // Track OneSignal SDK load failure
          gaEvent({
            action: 'onesignal_sdk_load_failed',
            category: 'notifications',
            label: 'script_error',
            value: undefined
          })
        }
        document.head.appendChild(script)
      } else {
        // Script already exists, try to initialize
        initializeOneSignal()
      }
    }

    const initializeOneSignal = async () => {
      try {
        console.log('Initializing OneSignal using v16 pattern...')
        
        // Initialize OneSignalDeferred array
        window.OneSignalDeferred = window.OneSignalDeferred || []
        
        // Use the OneSignal v16 deferred initialization pattern
        window.OneSignalDeferred.push(async function(OneSignal: any) {
          try {
            await OneSignal.init({
              appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'fc8aa10e-9c01-457a-8757-a6483474c38a',
              allowLocalhostAsSecureOrigin: true,
              serviceWorkerParam: {
                scope: '/'
              },
              serviceWorkerPath: '/OneSignalSDKWorker.js',
              notificationClickHandlerMatch: 'origin',
              notificationClickHandlerAction: 'focus'
            })

            console.log('OneSignal initialized successfully!')
            window._oneSignalInitialized = true
            window._oneSignalInitializing = false

            // Track successful OneSignal initialization
            gaEvent({
              action: 'onesignal_initialized',
              category: 'notifications',
              label: 'success',
              value: undefined
            })

            // Set up user linking if user is logged in
            if (isLoaded && user) {
              await setupUserLinking(OneSignal, user, supabaseUser)
            }

            // Set up event listeners
            setupEventListeners(OneSignal, user, supabaseUser)

          } catch (error) {
            console.error('Error in OneSignal initialization:', error)
            window._oneSignalInitializing = false
            
            // Track OneSignal initialization failure
            gaEvent({
              action: 'onesignal_init_failed',
              category: 'notifications',
              label: error instanceof Error ? error.message : 'unknown_error',
              value: undefined
            })
          }
        })

      } catch (error) {
        console.error('Error setting up OneSignal initialization:', error)
        window._oneSignalInitializing = false
        
        // Track OneSignal setup failure
        gaEvent({
          action: 'onesignal_setup_failed',
          category: 'notifications',
          label: error instanceof Error ? error.message : 'unknown_error',
          value: undefined
        })
      }
    }

    const setupUserLinking = async (OneSignal: any, user: any, supabaseUser: any) => {
      try {
        // Prefer Supabase user ID over Clerk ID
        const externalUserId = supabaseUser?.id || user.id
        console.log('Setting up user linking for:', externalUserId, '(Supabase ID preferred)')
        
        // Use OneSignal v16 login method to set external user ID
        if (typeof OneSignal.login === 'function') {
          await OneSignal.login(externalUserId)
          console.log('OneSignal user logged in with external ID (Supabase):', externalUserId)
          
          // Track successful user linking
          gaEvent({
            action: 'onesignal_user_linked',
            category: 'notifications',
            label: supabaseUser?.id ? 'supabase_id' : 'clerk_id',
            value: undefined
          })
        } else {
          console.warn('OneSignal.login method not available')
          
          // Track user linking failure
          gaEvent({
            action: 'onesignal_user_link_failed',
            category: 'notifications',
            label: 'login_method_unavailable',
            value: undefined
          })
        }

        // Also send this information to our backend for tracking
        try {
          // Get player ID if available
          let playerId = null
          if (typeof OneSignal.User?.PushSubscription?.id === 'string') {
            playerId = OneSignal.User.PushSubscription.id
          }

          await fetch('/api/notifications/link-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clerkUserId: user.id,
              supabaseUserId: supabaseUser?.id,
              oneSignalPlayerId: playerId,
              userEmail: user.primaryEmailAddress?.emailAddress
            })
          })
          console.log('User linking info sent to backend with Supabase ID')
          
          // Track successful backend linking
          gaEvent({
            action: 'onesignal_backend_link_success',
            category: 'notifications',
            label: 'api_call_success',
            value: undefined
          })
        } catch (linkError) {
          console.warn('Failed to send user linking info to backend:', linkError)
          
          // Track backend linking failure
          gaEvent({
            action: 'onesignal_backend_link_failed',
            category: 'notifications',
            label: linkError instanceof Error ? linkError.message : 'unknown_error',
            value: undefined
          })
          // Don't fail the whole process if backend linking fails
        }

      } catch (error) {
        console.error('Failed to set up user linking:', error)
        
        // Track user linking setup failure
        gaEvent({
          action: 'onesignal_user_setup_failed',
          category: 'notifications',
          label: error instanceof Error ? error.message : 'unknown_error',
          value: undefined
        })
      }
    }

    const setupEventListeners = (OneSignal: any, user: any, supabaseUser: any) => {
      try {
        console.log('Setting up OneSignal event listeners...')
        
        // Listen for subscription changes using v16 pattern
        if (typeof OneSignal.User?.PushSubscription?.addEventListener === 'function') {
          OneSignal.User.PushSubscription.addEventListener('change', function(event: any) {
            console.log('OneSignal subscription changed:', event)
            
            // Track subscription change
            gaEvent({
              action: 'onesignal_subscription_changed',
              category: 'notifications',
              label: event.current?.optedIn ? 'subscribed' : 'unsubscribed',
              value: undefined
            })
            
            if (event.current.optedIn && (supabaseUser?.id || user?.id)) {
              // User subscribed, make sure they're logged in with the correct ID
              const externalUserId = supabaseUser?.id || user.id
              OneSignal.login(externalUserId).then(() => {
                console.log('External user ID set after subscription change (Supabase):', externalUserId)
                
                // Track successful re-linking after subscription
                gaEvent({
                  action: 'onesignal_relink_after_subscription',
                  category: 'notifications',
                  label: 'success',
                  value: undefined
                })
              }).catch((error: any) => {
                console.error('Failed to set external user ID after subscription:', error)
                
                // Track failed re-linking after subscription
                gaEvent({
                  action: 'onesignal_relink_failed',
                  category: 'notifications',
                  label: error.message || 'unknown_error',
                  value: undefined
                })
              })
            }
          })
        }

        // Listen for notification clicks using v16 pattern
        if (typeof OneSignal.Notifications?.addEventListener === 'function') {
          OneSignal.Notifications.addEventListener('click', function(event: any) {
            console.log('OneSignal notification clicked:', event)
            
            // Track notification click with details
            gaEvent({
              action: 'notification_clicked',
              category: 'notifications',
              label: event.notification?.data?.type || 'unknown_type',
              value: undefined
            })
            
            // Handle notification click based on the data
            if (event.notification?.data?.type === 'daily_motivation') {
              // Track specific daily motivation click
              gaEvent({
                action: 'daily_notification_clicked',
                category: 'engagement',
                label: 'daily_motivation',
                value: undefined
              })
              
              // Navigate to the home page or show fusion generator
              window.location.href = '/'
            }
          })
        }
        
        console.log('OneSignal event listeners set up successfully!')
        
        // Track successful event listener setup
        gaEvent({
          action: 'onesignal_listeners_setup',
          category: 'notifications',
          label: 'success',
          value: undefined
        })
        
      } catch (error) {
        console.error('Error setting up OneSignal event listeners:', error)
        
        // Track event listener setup failure
        gaEvent({
          action: 'onesignal_listeners_setup_failed',
          category: 'notifications',
          label: error instanceof Error ? error.message : 'unknown_error',
          value: undefined
        })
      }
    }

    // Start the loading process
    loadOneSignal()

    // Cleanup function
    return () => {
      // Don't reset the initialization flag on cleanup as OneSignal should persist
    }

  }, [isLoaded, user, supabaseUser]) // Added supabaseUser to dependencies

  return null // This component doesn't render anything
}

// Helper function to execute OneSignal commands using the deferred pattern
export async function executeOneSignalCommand(command: (OneSignal: any) => Promise<any>): Promise<any> {
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

// Helper function to manually trigger notification prompt using v16 pattern
export async function promptForNotifications() {
  try {
    return await executeOneSignalCommand(async (OneSignal) => {
      if (typeof OneSignal.Notifications?.requestPermission === 'function') {
        const permission = await OneSignal.Notifications.requestPermission()
        console.log('Notification permission result:', permission)
        return permission
      }
      return false
    })
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}

// Helper function to check current user subscription using v16 pattern
export async function checkCurrentUserSubscription() {
  try {
    return await executeOneSignalCommand(async (OneSignal) => {
      const result = {
        playerId: OneSignal.User?.PushSubscription?.id || null,
        optedIn: OneSignal.User?.PushSubscription?.optedIn || false,
        permission: OneSignal.Notifications?.permission || 'default'
      }
      
      console.log('Current subscription status:', result)
      return result
    })
  } catch (error) {
    console.error('Error checking current user subscription:', error)
    return null
  }
} 