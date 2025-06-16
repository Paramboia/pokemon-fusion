"use client"

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, RefreshCw } from 'lucide-react'

declare global {
  interface Window {
    OneSignal: any
    OneSignalDeferred: any[]
  }
}

export default function TestNotificationsPage() {
  const { user, isLoaded } = useUser()
  const { supabaseUser } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)

  // Helper function to execute OneSignal commands
  const executeOneSignalCommand = (command: (OneSignal: any) => Promise<any>): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window not available'))
        return
      }

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

  const refreshDebugInfo = async () => {
    setIsLoading(true)
    
    try {
      const info = await executeOneSignalCommand(async (OneSignal) => {
        const debugData: any = {
          timestamp: new Date().toISOString(),
          browserPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unavailable',
          oneSignalAvailable: !!OneSignal,
          userInfo: {},
          pushSubscription: {},
          notifications: {}
        }

        // Get user info
        if (OneSignal.User) {
          debugData.userInfo = {
            available: true,
            pushSubscriptionAvailable: !!OneSignal.User.PushSubscription
          }

          // Get push subscription info
          if (OneSignal.User.PushSubscription) {
            debugData.pushSubscription = {
              id: OneSignal.User.PushSubscription.id || 'not_available',
              token: OneSignal.User.PushSubscription.token || 'not_available',
              optedIn: OneSignal.User.PushSubscription.optedIn,
              optedInRaw: typeof OneSignal.User.PushSubscription.optedIn
            }
          }
        }

        // Get notifications info
        if (OneSignal.Notifications) {
          debugData.notifications = {
            available: true,
            permission: OneSignal.Notifications.permission || 'not_available',
            permissionRaw: typeof OneSignal.Notifications.permission
          }
        }

        return debugData
      })

      // Add user context info
      info.userContext = {
        clerkUserId: user?.id || 'not_available',
        supabaseUserId: supabaseUser?.id || 'not_available',
        userEmail: user?.primaryEmailAddress?.emailAddress || 'not_available'
      }

      setDebugInfo(info)
    } catch (error) {
      console.error('Error getting debug info:', error)
      setDebugInfo({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testOptIn = async () => {
    try {
      await executeOneSignalCommand(async (OneSignal) => {
        if (typeof OneSignal.User?.PushSubscription?.optIn === 'function') {
          await OneSignal.User.PushSubscription.optIn()
          console.log('OptIn called successfully')
        } else {
          console.log('OptIn method not available')
        }
      })
      
      // Refresh debug info after opt-in
      setTimeout(() => refreshDebugInfo(), 1000)
    } catch (error) {
      console.error('Error testing opt-in:', error)
    }
  }

  const testOptOut = async () => {
    try {
      await executeOneSignalCommand(async (OneSignal) => {
        if (typeof OneSignal.User?.PushSubscription?.optOut === 'function') {
          await OneSignal.User.PushSubscription.optOut()
          console.log('OptOut called successfully')
        } else {
          console.log('OptOut method not available')
        }
      })
      
      // Refresh debug info after opt-out
      setTimeout(() => refreshDebugInfo(), 1000)
    } catch (error) {
      console.error('Error testing opt-out:', error)
    }
  }

  useEffect(() => {
    if (isLoaded) {
      // Initial load after a delay
      setTimeout(() => refreshDebugInfo(), 3000)
    }
  }, [isLoaded])

  if (!isLoaded || !user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Notification Debug</CardTitle>
            <CardDescription>Please sign in to test notifications</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            OneSignal Notification Debug
          </CardTitle>
          <CardDescription>
            Debug information for OneSignal push notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={refreshDebugInfo} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
            <Button onClick={testOptIn} variant="outline">
              <Bell className="h-4 w-4 mr-2" />
              Test Opt-In
            </Button>
            <Button onClick={testOptOut} variant="outline">
              <BellOff className="h-4 w-4 mr-2" />
              Test Opt-Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {debugInfo.error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{debugInfo.error}</p>
            <p className="text-sm text-gray-500 mt-2">Timestamp: {debugInfo.timestamp}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Browser Info */}
          <Card>
            <CardHeader>
              <CardTitle>Browser Permission</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Permission:</span>
                  <Badge variant={debugInfo.browserPermission === 'granted' ? 'default' : 'secondary'}>
                    {debugInfo.browserPermission || 'unknown'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* OneSignal Status */}
          <Card>
            <CardHeader>
              <CardTitle>OneSignal Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Available:</span>
                  <Badge variant={debugInfo.oneSignalAvailable ? 'default' : 'destructive'}>
                    {debugInfo.oneSignalAvailable ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>User API:</span>
                  <Badge variant={debugInfo.userInfo?.available ? 'default' : 'secondary'}>
                    {debugInfo.userInfo?.available ? 'Available' : 'Not Available'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Push Subscription */}
          <Card>
            <CardHeader>
              <CardTitle>Push Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Opted In:</span>
                  <Badge variant={debugInfo.pushSubscription?.optedIn ? 'default' : 'secondary'}>
                    {String(debugInfo.pushSubscription?.optedIn)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Player ID:</span>
                  <span className="text-sm font-mono">
                    {debugInfo.pushSubscription?.id === 'not_available' ? 'None' : 
                     debugInfo.pushSubscription?.id?.substring(0, 20) + '...' || 'None'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Context */}
          <Card>
            <CardHeader>
              <CardTitle>User Context</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Clerk ID:</span>
                  <span className="text-sm font-mono">
                    {debugInfo.userContext?.clerkUserId?.substring(0, 15) + '...' || 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Supabase ID:</span>
                  <span className="text-sm font-mono">
                    {debugInfo.userContext?.supabaseUserId?.substring(0, 15) + '...' || 'None'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Raw Debug Data */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Debug Data</CardTitle>
          <CardDescription>Complete debug information (for developers)</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
} 