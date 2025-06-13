"use client"

import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/use-notifications'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function NotificationButton() {
  const { isSubscribed, isLoading, toggleNotifications } = useNotifications()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleNotifications}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : isSubscribed ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isLoading 
          ? 'Updating notifications...' 
          : isSubscribed 
          ? 'Disable notifications' 
          : 'Enable notifications'
        }
      </TooltipContent>
    </Tooltip>
  )
} 