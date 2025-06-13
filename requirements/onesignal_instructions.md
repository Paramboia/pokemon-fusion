# OneSignal Push Notifications Implementation Guide

## Overview
This document provides complete instructions for implementing OneSignal push notifications in the Pokemon Fusion app, including daily automated notifications and user synchronization. **Updated with latest working implementation and security best practices.**

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
10. [Security Best Practices](#security-best-practices)

## OneSignal Setup

### 1. OneSignal Account Configuration
- **App ID**: `fc8aa10e-9c01-457a-8757-a6483474c38a`
- **REST API Key**: `your-onesignal-rest-api-key-here`
- **Platform**: Web Push (Chrome, Firefox, Safari)
- **Domain**: `https://www.pokemon-fusion.com`
- **Targeting**: Use "Total Subscriptions" segment for all users

### 2. Required Files
- `public/OneSignalSDKWorker.js` - Service worker for push notifications
- `components/onesignal-init.tsx` - Frontend initialization component

## Environment Variables

Add these to your Vercel environment variables:

```bash
# OneSignal Configuration
NEXT_PUBLIC_ONESIGNAL_APP_ID=fc8aa10e-9c01-457a-8757-a6483474c38a
ONESIGNAL_REST_API_KEY=your-onesignal-rest-api-key-here

# App Configuration
NEXT_PUBLIC_APP_URL=https://www.pokemon-fusion.com

# Cron Job Security (for testing only)
CRON_SECRET=pokemon-fusion-secret-2024

# Supabase (for user sync)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**IMPORTANT**: Do not hardcode secrets in `vercel.json` or other committed files.

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

## Backend Implementation

### 1. Direct OneSignal API Integration (Recommended)
**Important**: Use direct API calls instead of the OneSignal Node.js library for better reliability and edge runtime compatibility.

Key benefits of direct integration:
- **Edge Runtime Compatible**: Works with Vercel's edge functions
- **No External Dependencies**: Uses native `fetch()` API
- **Better Reliability**: Eliminates package-related issues
- **Smaller Bundle Size**: No additional packages to install

### 2. Proven Notification Payload
Based on successful implementation, use this exact structure:

```typescript
{
  app_id: appId,
  included_segments: ['Total Subscriptions'], // Target all subscribed users
  contents: { 
    en: 'Start creating new Pokémon fusions! Unlock unique species with AI—go catch them all!' 
  },
  headings: { 
    en: 'Pokemon-Fusion 🐉' 
  },
  url: appUrl,
  web_buttons: [
    {
      id: "generate-fusion",
      text: "Generate Fusion",
      icon: `${appUrl}/icon-192x192.png`,
      url: appUrl
    }
  ],
  ttl: 86400, // 24 hours
  isAnyWeb: true,
  target_channel: "push",
  channel_for_external_user_ids: "push",
  web_push_topic: "pokemon_fusion_daily",
  priority: 10 // High priority
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
**Security**: No hardcoded secrets in configuration files

### 2. Cron Endpoint (Latest Working Version)
Location: `app/api/notifications/cron/route.ts`

```typescript
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    // Add proper response headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Verify this is a legitimate Vercel cron request
    const userAgent = request.headers.get('user-agent') || '';
    const isVercelCron = userAgent.includes('vercel-cron') || userAgent.includes('Vercel');
    
    // In production, verify it's from Vercel cron
    // In development, allow requests with the cron secret for testing
    const url = new URL(request.url);
    const testSecret = url.searchParams.get('secret');
    const authHeader = request.headers.get('authorization');
    
    const isValidRequest = 
      isVercelCron || 
      (process.env.NODE_ENV !== 'production') ||
      (testSecret === process.env.CRON_SECRET) ||
      (authHeader === `Bearer ${process.env.CRON_SECRET}`);

    if (!isValidRequest) {
      console.error('Unauthorized cron request:', {
        userAgent,
        isVercelCron,
        environment: process.env.NODE_ENV,
        hasTestSecret: !!testSecret,
        hasAuthHeader: !!authHeader
      });
      return NextResponse.json(
        { error: 'Unauthorized - This endpoint is only accessible by Vercel cron jobs' },
        { status: 401, headers }
      );
    }

    // Check if required env vars are present
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.pokemon-fusion.com';

    if (!restApiKey || !appId) {
      throw new Error('Missing required OneSignal configuration');
    }

    // Send notification directly via OneSignal API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${restApiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        included_segments: ['Total Subscriptions'], // Target all subscribed users
        contents: { 
          en: 'Start creating new Pokémon fusions! Unlock unique species with AI—go catch them all!' 
        },
        headings: { 
          en: 'Pokemon-Fusion 🐉' 
        },
        url: appUrl, // Open the website when notification is clicked
        web_buttons: [
          {
            id: "generate-fusion",
            text: "Generate Fusion",
            icon: `${appUrl}/icon-192x192.png`,
            url: appUrl
          }
        ],
        ttl: 86400, // Expire after 24 hours if not delivered
        isAnyWeb: true,
        target_channel: "push",
        channel_for_external_user_ids: "push",
        web_push_topic: "pokemon_fusion_daily",
        priority: 10 // High priority to ensure delivery
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OneSignal API error:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      throw new Error(data.errors?.[0] || 'Failed to send notification');
    }

    console.log('Successfully sent daily Pokemon Fusion notification:', {
      notificationId: data.id,
      recipients: data.recipients,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        notification: data,
        timestamp: new Date().toISOString()
      }
    }, { headers });
  } catch (error) {
    console.error('Daily Pokemon Fusion notification error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send daily Pokemon Fusion notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Support OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

### 3. Key Features of Latest Implementation
- **Edge Runtime**: Better performance and global distribution
- **Direct API Integration**: No external dependencies, more reliable
- **Secure Authentication**: User-agent based verification for production
- **Proper CORS Headers**: Better compatibility across environments
- **Comprehensive Error Logging**: Easier debugging
- **24-hour TTL**: Ensures notifications don't stack up
- **High Priority**: Better delivery rates
- **Production Ready**: Tested and working in live environment

## User Synchronization - ⚠️ IMPORTANT LIMITATION

### ❌ Why Supabase to OneSignal Sync Doesn't Work for Push Notifications

**Critical Discovery**: Syncing users from Supabase to OneSignal creates **EMAIL subscribers**, not **PUSH notification subscribers**.

#### The Problem
1. **Email vs Push**: OneSignal treats synced users as email contacts (✉️ icon in dashboard)
2. **Browser Permission Required**: Push notifications require explicit user consent through browser
3. **No Push Tokens**: Synced users don't have valid browser push subscription tokens
4. **Wrong Channel**: Your notifications target push subscribers, but synced users are email subscribers

#### The Solution: Organic Push Subscriptions

**✅ Correct Approach for Push Notifications:**

1. **Frontend Integration**: OneSignal SDK initializes when users visit your website
2. **User Consent**: Users click notification permission prompt in their browser
3. **Automatic Registration**: OneSignal automatically creates push subscriber records
4. **Target All**: Use "Total Subscriptions" segment to reach all push subscribers

### 1. Notification Permission Component
Encourage users to opt-in through your website interface:

```tsx
// components/notification-button.tsx
export function NotificationButton() {
  const { isSubscribed, isLoading, toggleNotifications } = useNotifications()

  return (
    <Button onClick={toggleNotifications} disabled={isLoading}>
      {isSubscribed 
        ? <Bell className="h-5 w-5" /> 
        : <BellOff className="h-5 w-5" />
      }
      {isSubscribed ? 'Notifications On' : 'Enable Notifications'}
    </Button>
  )
}
```

### 2. Dashboard Verification
In OneSignal dashboard, legitimate push subscribers show:
- **🔔 Push icon** (not ✉️ email icon)
- **Valid subscription tokens**
- **Browser-generated Player IDs**

### 3. Clean Up Email Records (Optional)
If you want to remove the email records created by sync:
1. Go to OneSignal Dashboard → Audience → Users
2. Filter by channel: Email
3. Bulk delete email-only records
4. Keep only push notification subscribers

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

### 1. Manual Cron Test (Development)
```bash
curl "https://www.pokemon-fusion.com/api/notifications/cron?secret=pokemon-fusion-secret-2024"
```

### 2. Production Cron Test
The cron job runs automatically at 9:00 AM UTC (10:00 AM Madrid time). No manual intervention needed.

### 3. Check Logs
Monitor Vercel function logs to verify successful execution:
- Go to Vercel Dashboard → Project → Functions tab
- Look for `/api/notifications/cron` executions
- Check for success messages and error details

## Troubleshooting

### Common Issues & Solutions

#### 1. 401 Unauthorized Error in Production
**Cause**: Vercel cron authentication failing
**Solution**: Ensure user-agent detection is working properly. The endpoint should automatically detect `vercel-cron` in the user-agent.

#### 2. 405 Method Not Allowed
**Cause**: Clerk middleware blocking notification endpoints
**Solution**: Add `/api/notifications(.*)` to public routes in `middleware.ts`

#### 3. OneSignal 400 Bad Request
**Cause**: Invalid notification payload
**Solution**: Verify all required fields are present:
- `app_id`
- `included_segments: ['Total Subscriptions']`
- `contents` and `headings` objects

#### 4. No Users Receiving Notifications
**Cause**: No subscribed users or incorrect segment targeting
**Solution**: 
- Check OneSignal dashboard for active subscriptions
- Verify "Total Subscriptions" segment exists
- Run user sync if needed

#### 5. Edge Runtime Issues
**Cause**: Using Node.js-specific code in edge runtime
**Solution**: Use only Web APIs (fetch, Response, etc.) in edge functions

### 🚀 Key Lessons Learned (Production Tested)

#### What Works ✅
1. **User-Agent Authentication**: Vercel cron jobs can be authenticated by detecting `vercel-cron` in user-agent
2. **Edge Runtime**: Provides better performance and global distribution
3. **Direct API Integration**: More reliable than using OneSignal SDK packages
4. **Total Subscriptions Segment**: Targets all subscribed users effectively
5. **24-hour TTL**: Prevents notification stacking and improves delivery
6. **High Priority (10)**: Ensures better delivery rates

#### What Doesn't Work ❌
1. **Hardcoded Secrets in vercel.json**: Security risk and not necessary
2. **Bearer Token Authentication**: Vercel cron doesn't send authorization headers
3. **OneSignal Node SDK**: Can cause issues with edge runtime
4. **Missing Middleware Routes**: Clerk will block API requests with 405 errors
5. **🚨 Supabase User Sync**: Creates EMAIL subscribers (✉️), not PUSH subscribers (🔔)
6. **Bulk User Import**: Push notifications require individual browser permission

## Security Best Practices

### 1. Environment Variables
- ✅ Store all secrets in Vercel environment variables
- ❌ Never hardcode secrets in `vercel.json` or source code
- ✅ Use `NEXT_PUBLIC_` prefix only for client-side variables

### 2. Authentication
- ✅ Use user-agent detection for production cron jobs
- ✅ Allow manual testing with secret parameter in development
- ❌ Don't rely on hardcoded authorization headers

### 3. API Security
- ✅ Validate all incoming requests
- ✅ Use HTTPS for all endpoints
- ✅ Implement proper CORS headers
- ✅ Add comprehensive error logging

## Performance Considerations

### 1. Edge Runtime Benefits
- Global distribution for better performance
- Faster cold starts
- Better scalability

### 2. Direct API Integration
- Eliminates external package dependencies
- Reduces bundle size
- More reliable execution

### 3. Notification Optimization
- Use `ttl: 86400` to prevent notification stacking
- Set `priority: 10` for better delivery rates
- Target specific segments instead of individual users

## Monitoring

### Key Metrics to Track
1. **Cron Job Success Rate**: Monitor daily execution in Vercel logs
2. **Notification Delivery Rate**: Check OneSignal dashboard
3. **User Subscription Growth**: Track opt-in rates
4. **Engagement Rate**: Monitor click-through rates

### OneSignal Dashboard
Access at: https://dashboard.onesignal.com/apps/fc8aa10e-9c01-457a-8757-a6483474c38a
- View delivery statistics
- Monitor user subscriptions
- Track notification performance
- Manage segments

## Quick Reference

### Production Configuration
- **App ID**: `fc8aa10e-9c01-457a-8757-a6483474c38a`
- **Domain**: `https://www.pokemon-fusion.com`
- **Cron Schedule**: `0 9 * * *` (9 AM UTC = 10 AM Madrid)
- **Target Segment**: `Total Subscriptions`

### Key Files
- `app/api/notifications/cron/route.ts` - Daily cron job (LATEST VERSION)
- `components/onesignal-init.tsx` - Frontend initialization
- `middleware.ts` - Route protection (CRITICAL)
- `vercel.json` - Cron schedule configuration

### Environment Variables (Required)
- `NEXT_PUBLIC_ONESIGNAL_APP_ID=fc8aa10e-9c01-457a-8757-a6483474c38a`
- `ONESIGNAL_REST_API_KEY=your-key-here`
- `NEXT_PUBLIC_APP_URL=https://www.pokemon-fusion.com`
- `CRON_SECRET=pokemon-fusion-secret-2024` (testing only)

### Current Notification Content
- **Title**: "Pokemon-Fusion 🐉"
- **Message**: "Start creating new Pokémon fusions! Unlock unique species with AI—go catch them all!"
- **Button**: "Generate Fusion"
- **Timing**: Daily at 10:00 AM Madrid time

---

**Last Updated**: Based on successful production deployment with working cron jobs and secure authentication.

This implementation provides a complete, production-ready OneSignal push notification system for the Pokemon Fusion app with daily automated engagement notifications. 