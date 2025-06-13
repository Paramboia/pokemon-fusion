# OneSignal Push Notifications Implementation Guide

## Overview
This document provides complete instructions for implementing OneSignal push notifications in the Pokemon Fusion app, including daily automated notifications and user synchronization.

## Table of Contents
1. [OneSignal Setup](#onesignal-setup)
2. [Environment Variables](#environment-variables)
3. [Frontend Integration](#frontend-integration)
4. [Backend Implementation](#backend-implementation)
5. [Daily Cron Jobs](#daily-cron-jobs)
6. [User Synchronization](#user-synchronization)
7. [Middleware Configuration](#middleware-configuration)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

## OneSignal Setup

### 1. OneSignal Account Configuration
- **App ID**: `your-onesignal-app-id-here`
- **REST API Key**: `your-onesignal-rest-api-key-here`
- **Platform**: Web Push (Chrome, Firefox, Safari)
- **Domain**: `https://www.pokemon-fusion.com`

### 2. Required Files
- `public/OneSignalSDKWorker.js` - Service worker for push notifications
- `components/onesignal-init.tsx` - Frontend initialization component

## Environment Variables

Add these to your `.env.local` and Vercel environment:

```bash
# OneSignal Configuration
NEXT_PUBLIC_ONESIGNAL_APP_ID=your-onesignal-app-id-here
ONESIGNAL_REST_API_KEY=your-onesignal-rest-api-key-here

# Cron Job Security
CRON_SECRET=your-secure-cron-secret-here

# Supabase (for user sync)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Frontend Integration

### 1. OneSignal Initialization Component
Location: `components/onesignal-init.tsx`

```tsx
'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

declare global {
  interface Window {
    OneSignal: any
  }
}

export default function OneSignalInit() {
  const { user } = useUser()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.OneSignal = window.OneSignal || []
      
      window.OneSignal.push(function() {
        window.OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
          safari_web_id: "web.onesignal.auto.18c7e5d0-8f0f-4b0a-9f4a-2c5c5b5c5b5c",
          notifyButton: {
            enable: false,
          },
          allowLocalhostAsSecureOrigin: true,
        })

        // Set external user ID when user is logged in
        if (user?.id) {
          window.OneSignal.setExternalUserId(user.id)
        }
      })
    }
  }, [user])

  return null
}
```

### 2. Layout Integration
Add to your main layout file:

```tsx
import OneSignalInit from '@/components/onesignal-init'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <OneSignalInit />
        {children}
      </body>
    </html>
  )
}
```

### 3. Notification Permission Button
Example implementation for requesting permissions:

```tsx
const handleNotificationPermission = async () => {
  if (typeof window !== 'undefined' && window.OneSignal) {
    try {
      await window.OneSignal.showSlidedownPrompt()
    } catch (error) {
      console.error('Error requesting notification permission:', error)
    }
  }
}
```

## Backend Implementation

### 1. Notification Library
Location: `lib/notifications.ts`

```typescript
import * as OneSignal from '@onesignal/node-onesignal'

const configuration = OneSignal.createConfiguration({
  authMethods: {
    app_key: {
      tokenProvider: {
        getToken(): string {
          return process.env.ONESIGNAL_REST_API_KEY || ''
        }
      }
    }
  }
})

const client = new OneSignal.DefaultApi(configuration)

export async function sendDailyNotification() {
  const notification = new OneSignal.Notification()
  notification.app_id = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ''
  
  // Notification content
  notification.headings = { en: "Pokemon-Fusion 🐉" }
  notification.contents = { 
    en: "Start creating new Pokémon fusions! Unlock unique species with AI—go catch them all!" 
  }
  
  // Target all subscribed users
  notification.included_segments = ['Subscribed Users']
  
  // Custom action button
  notification.buttons = [
    {
      id: 'generate_fusion',
      text: 'Generate Fusion',
      icon: 'https://www.pokemon-fusion.com/icons/pokeball.png'
    }
  ]
  
  // Redirect URL
  notification.url = 'https://www.pokemon-fusion.com'
  
  // Send notification
  const result = await client.createNotification(notification)
  return result
}
```

### 2. Dependencies
Add to `package.json`:

```json
{
  "dependencies": {
    "@onesignal/node-onesignal": "^2.0.1"
  }
}
```

## Daily Cron Jobs

### 1. Vercel Configuration
Location: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/notifications/cron",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Schedule**: `0 9 * * *` = 9:00 AM UTC = 10:00 AM Madrid time

### 2. Cron Endpoint
Location: `app/api/notifications/cron/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { sendDailyNotification } from '@/lib/notifications'

export async function GET(request: Request) {
  try {
    // Verify Vercel Cron authorization
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await sendDailyNotification()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Daily notification sent successfully',
      notificationId: result.id,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in cron job:', error)
    return NextResponse.json(
      { error: 'Failed to send daily notification' },
      { status: 500 }
    )
  }
}

// Support POST for manual testing
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    if (body.secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await sendDailyNotification()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Daily notification sent successfully (manual trigger)',
      notificationId: result.id,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in manual trigger:', error)
    return NextResponse.json(
      { error: 'Failed to send daily notification' },
      { status: 500 }
    )
  }
}
```

## User Synchronization

### 1. Sync Endpoint
Location: `app/api/notifications/sync-users/route.ts`

Synchronizes Supabase users to OneSignal for targeted notifications.

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    if (body.secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get users from Supabase
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email, clerk_id')
      .limit(100)

    // Sync to OneSignal
    for (const user of users) {
      const playerData = {
        app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '',
        external_user_id: user.clerk_id || user.id,
        device_type: 11, // Web Push (required)
        identifier: user.email || undefined,
        tags: user.name ? { name: user.name } : undefined
      }

      await client.createPlayer(playerData as OneSignal.Player)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${users.length} users to OneSignal`,
      syncedCount: users.length
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to sync users' }, { status: 500 })
  }
}
```

### 2. Manual Sync Usage
```bash
curl -X POST https://www.pokemon-fusion.com/api/notifications/sync-users \
  -H "Content-Type: application/json" \
  -d '{"secret": "your-secure-cron-secret-here"}'
```

## Middleware Configuration

### Critical: Clerk Middleware Setup
Location: `middleware.ts`

**IMPORTANT**: Add notification endpoints to public routes to allow cron jobs:

```typescript
const isPublicRoute = createRouteMatcher([
  // ... other routes
  '/api/notifications(.*)', // REQUIRED for cron jobs
  // ... other routes
])
```

Without this, Clerk will block all notification API requests with 405 errors.

## Testing

### 1. Manual Cron Test
```bash
curl -X POST https://www.pokemon-fusion.com/api/notifications/cron \
  -H "Content-Type: application/json" \
  -d '{"secret": "your-secure-cron-secret-here"}'
```

### 2. User Sync Test
```bash
curl -X POST https://www.pokemon-fusion.com/api/notifications/sync-users \
  -H "Content-Type: application/json" \
  -d '{"secret": "your-secure-cron-secret-here"}'
```

### 3. Health Check
```bash
curl https://www.pokemon-fusion.com/api/health
```

## Troubleshooting

### Common Issues

#### 1. 405 Method Not Allowed
**Cause**: Clerk middleware blocking notification endpoints
**Solution**: Add `/api/notifications(.*)` to public routes in `middleware.ts`

#### 2. OneSignal 400 Bad Request
**Cause**: Missing required fields in player creation
**Solution**: Ensure `device_type: 11` is included for web push

#### 3. Cron Job Not Running
**Cause**: Incorrect schedule format or missing authorization
**Solution**: 
- Verify schedule: `"0 9 * * *"` for 9 AM UTC
- Check `CRON_SECRET` environment variable

#### 4. Users Not Receiving Notifications
**Cause**: Users not subscribed or external_user_id mismatch
**Solution**: 
- Run user sync endpoint
- Verify OneSignal initialization in frontend
- Check browser notification permissions

### Debug Commands

```bash
# Check environment variables
node -e "console.log(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID)"

# Test notification endpoint
curl -X POST https://www.pokemon-fusion.com/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"secret": "your-secure-cron-secret-here"}'

# Check Vercel deployment logs
vercel logs
```

## Notification Content Customization

### Current Configuration
- **Title**: "Pokemon-Fusion 🐉"
- **Message**: "Start creating new Pokémon fusions! Unlock unique species with AI—go catch them all!"
- **Button**: "Generate Fusion"
- **URL**: https://www.pokemon-fusion.com
- **Schedule**: Daily at 10:00 AM Madrid time

### Customization Options
To modify notification content, edit `lib/notifications.ts`:

```typescript
// Change title
notification.headings = { en: "Your Custom Title 🎮" }

// Change message
notification.contents = { en: "Your custom message here!" }

// Change button text
notification.buttons = [
  {
    id: 'custom_action',
    text: 'Custom Button',
    icon: 'https://your-icon-url.com/icon.png'
  }
]

// Change schedule in vercel.json
"schedule": "0 8 * * *" // 8 AM UTC = 9 AM Madrid time
```

## Security Notes

1. **API Keys**: Never expose REST API key in frontend code
2. **Cron Secret**: Use strong, unique secret for cron job authentication
3. **HTTPS**: OneSignal requires HTTPS for web push notifications
4. **Service Worker**: Ensure `OneSignalSDKWorker.js` is accessible at domain root

## Performance Considerations

1. **Batch Size**: Limit user sync to 100 users per request to avoid timeouts
2. **Rate Limiting**: OneSignal has API rate limits - implement retry logic for large user bases
3. **Caching**: Consider caching notification results to avoid duplicate sends

## Monitoring

### Key Metrics to Track
1. **Notification Delivery Rate**: Check OneSignal dashboard
2. **User Subscription Rate**: Monitor opt-in percentages
3. **Click-Through Rate**: Track notification engagement
4. **Cron Job Success**: Monitor daily execution logs

### OneSignal Dashboard
Access at: https://dashboard.onesignal.com/
- View delivery statistics
- Monitor user segments
- Track notification performance
- Manage app settings

---

## Quick Reference

### Essential URLs
- **Production**: https://www.pokemon-fusion.com
- **Cron Endpoint**: `/api/notifications/cron`
- **Sync Endpoint**: `/api/notifications/sync-users`
- **Test Endpoint**: `/api/notifications/test`

### Key Files
- `components/onesignal-init.tsx` - Frontend initialization
- `lib/notifications.ts` - Notification logic
- `app/api/notifications/cron/route.ts` - Daily cron job
- `app/api/notifications/sync-users/route.ts` - User synchronization
- `middleware.ts` - Route protection (CRITICAL)
- `vercel.json` - Cron schedule configuration

### Environment Variables
- `NEXT_PUBLIC_ONESIGNAL_APP_ID` - Public app identifier
- `ONESIGNAL_REST_API_KEY` - Server-side API key
- `CRON_SECRET` - Cron job authentication

This implementation provides a complete, production-ready OneSignal push notification system for the Pokemon Fusion app with daily automated engagement notifications. 