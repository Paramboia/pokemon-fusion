"use client"

import { useState } from 'react'
// import { useUser } from '@clerk/nextjs'

declare global {
  interface Window {
    OneSignal: any
  }
}

export function useNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  // const { user } = useUser()

  // Simplified version without Clerk authentication
  const toggleNotifications = async () => {
    // Mock function that just toggles the state
    setIsSubscribed(!isSubscribed)
  }

  return {
    isSubscribed,
    toggleNotifications
  }
} 