"use client"

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
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
    OneSignalDeferred: any[]
  }
}

export function NotificationDropdown() {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null) // null = unknown/loading
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

  // Check current notification status using OneSignal v16 pattern
  const checkNotificationStatus = async () => {
    try {
      console.log('Checking notification status using OneSignal v16 pattern...')
      
      const isSubscribed = await executeOneSignalCommand(async (OneSignal) => {
        // Try different methods that might be available in v16
        if (typeof OneSignal.Notifications?.permission === 'string') {
          const permission = OneSignal.Notifications.permission
          console.log('Permission from OneSignal.Notifications.permission:', permission)
          return permission === 'granted'
        }
        
        if (typeof OneSignal.User?.PushSubscription?.optedIn === 'boolean') {
          const optedIn = OneSignal.User.PushSubscription.optedIn
          console.log('Status from OneSignal.User.PushSubscription.optedIn:', optedIn)
          return optedIn
        }

        // Fallback: check if we can get notification permission
        if (typeof OneSignal.Notifications?.getPermissionAsync === 'function') {
          const permission = await OneSignal.Notifications.getPermissionAsync()
          console.log('Permission from getPermissionAsync:', permission)
          return permission === 'granted'
        }

        // If no methods work, assume subscribed since you're receiving notifications
        console.log('No status methods available, assuming subscribed since notifications are working')
        return true
      })

      setIsEnabled(isSubscribed)
      console.log('Final notification status set to:', isSubscribed)
      
    } catch (error) {
      console.error('Error checking notification status:', error)
      // Since you're receiving notifications, assume subscribed
      setIsEnabled(true)
    }
  }

  // Check status when component mounts and when user changes
  useEffect(() => {
    if (isLoaded && user) {
      // Wait a bit for OneSignal to initialize, then check once
      const timer = setTimeout(() => {
        checkNotificationStatus()
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [isLoaded, user])

  const handleToggleNotifications = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    
    try {
      console.log('Attempting to toggle notifications using OneSignal v16 pattern...')
      
      // Try to get current status first
      let currentStatus = isEnabled
      if (currentStatus === null) {
        // Try to check status if we don't know it
        try {
          currentStatus = await executeOneSignalCommand(async (OneSignal) => {
            if (typeof OneSignal.User?.PushSubscription?.optedIn === 'boolean') {
              return OneSignal.User.PushSubscription.optedIn
            }
            return true // Assume subscribed
          })
        } catch (e) {
          currentStatus = true // Assume subscribed
        }
      }

      console.log('Current status before toggle:', currentStatus)
      
      if (currentStatus) {
        // Currently enabled, try to disable notifications
        try {
          await executeOneSignalCommand(async (OneSignal) => {
            // Try OneSignal v16 methods for opting out
            if (typeof OneSignal.User?.PushSubscription?.optOut === 'function') {
              await OneSignal.User.PushSubscription.optOut()
              return
            }
            
            if (typeof OneSignal.Notifications?.setSubscription === 'function') {
              await OneSignal.Notifications.setSubscription(false)
              return
            }

            throw new Error('No opt-out method available')
          })
          
          setIsEnabled(false)
          toast.success('Notifications disabled')
        } catch (disableError) {
          console.error('Error disabling notifications:', disableError)
          toast.error('Cannot disable notifications - method not available')
        }
      } else {
        // Currently disabled, try to enable notifications
        try {
          const success = await executeOneSignalCommand(async (OneSignal) => {
            // Try OneSignal v16 methods for requesting permission
            if (typeof OneSignal.Notifications?.requestPermission === 'function') {
              const granted = await OneSignal.Notifications.requestPermission()
              return granted
            }
            
            if (typeof OneSignal.User?.PushSubscription?.optIn === 'function') {
              await OneSignal.User.PushSubscription.optIn()
              return true
            }

            throw new Error('No opt-in method available')
          })
          
          if (success) {
            // Set external user ID when user subscribes (OneSignal v16 pattern)
            if (user?.id) {
              try {
                await executeOneSignalCommand(async (OneSignal) => {
                  if (typeof OneSignal.login === 'function') {
                    await OneSignal.login(user.id)
                    console.log('User logged in with external ID:', user.id)
                  }
                })
              } catch (loginError) {
                console.warn('Failed to set external user ID:', loginError)
              }
            }
            
            setIsEnabled(true)
            toast.success('Notifications enabled!')
          } else {
            toast.error('Permission denied')
          }
        } catch (enableError) {
          console.error('Error enabling notifications:', enableError)
          toast.error('Cannot enable notifications - method not available')
        }
      }
      
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
            // Loading state - still clickable
            <Bell className="h-4 w-4 animate-pulse" />
          ) : isEnabled ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={handleToggleNotifications}
          disabled={isLoading}
          className="cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span>
              {isEnabled === null 
                ? 'Check Status' 
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
            ? 'Click to check notification status'
            : isEnabled 
              ? 'Daily Pokemon fusion reminders' 
              : 'Get notified about new fusions'
          }
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 