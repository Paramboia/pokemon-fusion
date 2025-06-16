"use client"

import { useState, useEffect } from 'react'
import { Bell, BellOff, ChevronDown } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import { toast } from 'sonner'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

declare global {
  interface Window {
    OneSignal: any
  }
}

export function NotificationDropdown() {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null) // null = unknown/loading
  const [isLoading, setIsLoading] = useState(false)
  const { user, isLoaded } = useUser()

  // Helper function to wait for OneSignal methods to be available
  const waitForOneSignalMethods = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false
    
    let attempts = 0
    const maxAttempts = 50 // 5 seconds
    
    while (attempts < maxAttempts) {
      try {
        if (window.OneSignal && 
            typeof window.OneSignal.isPushNotificationsEnabled === 'function' &&
            typeof window.OneSignal.requestPermission === 'function' &&
            typeof window.OneSignal.setSubscription === 'function' &&
            typeof window.OneSignal.setExternalUserId === 'function') {
          return true
        }
      } catch (e) {
        // Methods not ready
      }
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    return false
  }

  // Check current notification status
  const checkNotificationStatus = async () => {
    try {
      const methodsAvailable = await waitForOneSignalMethods()
      if (!methodsAvailable) {
        console.warn('OneSignal methods not available for status check')
        return
      }

      const enabled = await window.OneSignal.isPushNotificationsEnabled()
      console.log('Current notification status:', enabled)
      setIsEnabled(enabled)
    } catch (error) {
      console.error('Error checking notification status:', error)
      setIsEnabled(false)
    }
  }

  // Check status when component mounts and when user changes
  useEffect(() => {
    if (isLoaded && user) {
      // Add a small delay to ensure OneSignal has had time to initialize
      const timer = setTimeout(() => {
        checkNotificationStatus()
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [isLoaded, user])

  // Also check status when window gains focus (in case user changed permissions in another tab)
  useEffect(() => {
    const handleFocus = () => {
      if (isLoaded && user) {
        checkNotificationStatus()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [isLoaded, user])

  const handleToggleNotifications = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    
    try {
      const methodsAvailable = await waitForOneSignalMethods()
      if (!methodsAvailable) {
        throw new Error('OneSignal is not ready yet. Please try again in a moment.')
      }

      const currentStatus = await window.OneSignal.isPushNotificationsEnabled()
      console.log('Current status before toggle:', currentStatus)
      
      if (currentStatus) {
        // Currently enabled, disable notifications
        await window.OneSignal.setSubscription(false)
        setIsEnabled(false)
        toast.success('Notifications disabled')
      } else {
        // Currently disabled, enable notifications
        const permission = await window.OneSignal.requestPermission()
        
        if (permission) {
          // Set external user ID when user subscribes
          if (user?.id) {
            try {
              await window.OneSignal.setExternalUserId(user.id)
              console.log('External user ID set during subscription')
              
              // Also notify our backend
              await fetch('/api/notifications/link-user', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  clerkUserId: user.id,
                  oneSignalPlayerId: await window.OneSignal.getPlayerId(),
                  userEmail: user.primaryEmailAddress?.emailAddress
                })
              })
            } catch (linkError) {
              console.warn('Failed to link user after subscription:', linkError)
            }
          }
          
          setIsEnabled(true)
          toast.success('Notifications enabled!')
        } else {
          toast.error('Permission denied. Please enable notifications in your browser settings.')
        }
      }
      
      // Double-check the final status
      setTimeout(async () => {
        try {
          const finalStatus = await window.OneSignal.isPushNotificationsEnabled()
          setIsEnabled(finalStatus)
        } catch (e) {
          console.warn('Could not verify final notification status')
        }
      }, 500)
      
    } catch (error) {
      console.error('Error toggling notifications:', error)
      toast.error('Failed to update notification settings')
    } finally {
      setIsLoading(false)
    }
  }

  // Only show for authenticated users
  if (!isLoaded || !user) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {isEnabled === null ? (
            // Loading state
            <Bell className="h-4 w-4 animate-pulse" />
          ) : isEnabled ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={handleToggleNotifications}
          disabled={isLoading || isEnabled === null}
          className="cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span>
              {isEnabled === null 
                ? 'Checking...' 
                : isEnabled 
                  ? 'Disable Notifications' 
                  : 'Enable Notifications'
              }
            </span>
            {isLoading && <div className="w-4 h-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />}
            {!isLoading && isEnabled !== null && (
              <Badge variant={isEnabled ? "default" : "secondary"} className="ml-2">
                {isEnabled ? "On" : "Off"}
              </Badge>
            )}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          {isEnabled === null 
            ? 'Loading status...'
            : isEnabled 
              ? 'Daily Pokemon fusion reminders' 
              : 'Get notified about new fusions'
          }
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 