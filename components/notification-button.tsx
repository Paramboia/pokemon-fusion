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
  const { isSubscribed, toggleNotifications } = useNotifications()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleNotifications}
        >
          {isSubscribed ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isSubscribed ? 'Disable notifications' : 'Enable notifications'}
      </TooltipContent>
    </Tooltip>
  )
} 