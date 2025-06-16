"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@clerk/nextjs'
import { Loader2, Bell, AlertCircle, CheckCircle } from 'lucide-react'

declare global {
  interface Window {
    OneSignal: any
  }
}

export function FixNotifications() {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'checking' | 'fixed' | 'error'>('idle')
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const { toast } = useToast()
  const { user } = useUser()

  const checkAndFixSubscription = async () => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please log in to fix your notification subscription.",
        variant: "destructive"
      })
      return
    }

    if (!window.OneSignal) {
      toast({
        title: "OneSignal not available",
        description: "OneSignal is not loaded yet. Please try again in a moment.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    setStatus('checking')

    try {
      // Get current OneSignal status
      const playerId = await window.OneSignal.getPlayerId()
      const isSubscribed = await window.OneSignal.isPushNotificationsEnabled()
      const externalUserId = await window.OneSignal.getExternalUserId()

      console.log('Current OneSignal status:', {
        playerId,
        isSubscribed,
        externalUserId,
        clerkUserId: user.id
      })

      setDebugInfo({
        playerId,
        isSubscribed,
        externalUserId,
        clerkUserId: user.id,
        needsFix: !externalUserId || externalUserId !== user.id
      })

      if (!playerId) {
        toast({
          title: "No subscription found",
          description: "You don't have an active push notification subscription. Please enable notifications first.",
          variant: "destructive"
        })
        setStatus('error')
        return
      }

      if (!isSubscribed) {
        toast({
          title: "Not subscribed",
          description: "You're not currently subscribed to push notifications. Please enable them first.",
          variant: "destructive"
        })
        setStatus('error')
        return
      }

      // Check if external user ID is already set correctly
      if (externalUserId === user.id) {
        toast({
          title: "Already linked",
          description: "Your subscription is already properly linked to your account.",
        })
        setStatus('fixed')
        return
      }

      // Try to fix the subscription by setting external user ID
      console.log('Setting external user ID:', user.id)
      await window.OneSignal.setExternalUserId(user.id)

      // Also call our backend endpoint to update the player record
      const response = await fetch('/api/notifications/fix-existing-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oneSignalPlayerId: playerId,
          forceUpdate: true
        })
      })

      const result = await response.json()

      if (response.ok) {
        console.log('Successfully fixed subscription:', result)
        
        toast({
          title: "Subscription fixed!",
          description: "Your push notification subscription has been successfully linked to your account.",
        })
        setStatus('fixed')
        
        // Update debug info
        setDebugInfo(prev => ({
          ...prev,
          fixed: true,
          fixedAt: new Date().toISOString(),
          serverResponse: result
        }))
      } else {
        throw new Error(result.error || 'Failed to fix subscription')
      }

    } catch (error) {
      console.error('Error fixing subscription:', error)
      toast({
        title: "Failed to fix subscription",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive"
      })
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-5 w-5 animate-spin" />
      case 'fixed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'fixed':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200'
      case 'checking':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      default:
        return ''
    }
  }

  return (
    <Card className={`w-full max-w-md ${getStatusColor()}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Fix Notifications
        </CardTitle>
        <CardDescription>
          If you're not receiving push notifications, this might help fix the connection between your account and your subscription.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={checkAndFixSubscription}
          disabled={isLoading || !user}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {status === 'checking' ? 'Checking...' : 'Fixing...'}
            </>
          ) : (
            'Check & Fix My Subscription'
          )}
        </Button>

        {debugInfo && (
          <div className="text-xs space-y-2 p-3 bg-gray-50 rounded-md">
            <div><strong>Status:</strong> {status}</div>
            <div><strong>Subscribed:</strong> {debugInfo.isSubscribed ? 'Yes' : 'No'}</div>
            <div><strong>Player ID:</strong> {debugInfo.playerId || 'None'}</div>
            <div><strong>External User ID:</strong> {debugInfo.externalUserId || 'None'}</div>
            <div><strong>Clerk User ID:</strong> {debugInfo.clerkUserId}</div>
            <div><strong>Needs Fix:</strong> {debugInfo.needsFix ? 'Yes' : 'No'}</div>
            {debugInfo.fixed && (
              <div className="text-green-600"><strong>✓ Fixed at:</strong> {new Date(debugInfo.fixedAt).toLocaleString()}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 