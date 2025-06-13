# Fusion Creation Push Notifications Setup

## Overview
This system sends personalized push notifications to users immediately when their Pokemon fusion is successfully created and inserted into the "fusions" table in Supabase.

## Notification Details
- **Title**: "Pokemon-Fusion 🐉✨"
- **Message**: "Trainer, congrats on your new Pokémon fusion! Your ${fusionName} is waiting for you."
- **CTA Button**: "See Pokémon"
- **Link**: `https://www.pokemon-fusion.com/gallery`
- **TTL**: 12 hours (time-sensitive)
- **Priority**: High (10)

## Implementation

### 1. API Endpoint Created
- **Path**: `/api/notifications/fusion-created`
- **Method**: POST
- **Runtime**: Edge
- **Purpose**: Receives Supabase webhook and sends OneSignal notification

### 2. Test Endpoint Created
- **Path**: `/api/notifications/test-fusion`
- **Method**: POST
- **Purpose**: Manual testing of fusion notifications

## Supabase Webhook Configuration

### Step 1: Create Database Function
Add this PostgreSQL function to your Supabase database:

```sql
-- Create function to call webhook when fusion is inserted
CREATE OR REPLACE FUNCTION notify_fusion_created()
RETURNS trigger AS $$
BEGIN
    -- Make HTTP request to your notification endpoint
    PERFORM
        net.http_post(
            url := 'https://www.pokemon-fusion.com/api/notifications/fusion-created',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'x-supabase-webhook-secret', 'fusion-webhook-secret-2024'
            ),
            body := jsonb_build_object(
                'type', 'INSERT',
                'table', 'fusions',
                'record', row_to_json(NEW)
            )
        );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Step 2: Create Trigger
Add this trigger to the "fusions" table:

```sql
-- Create trigger on fusions table
CREATE TRIGGER fusion_created_notification
    AFTER INSERT ON fusions
    FOR EACH ROW
    EXECUTE FUNCTION notify_fusion_created();
```

### Step 3: Enable HTTP Extension
Make sure the Supabase HTTP extension is enabled:

```sql
-- Enable the HTTP extension (run as admin)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
```

## Required Database Columns

The webhook expects these columns in the "fusions" table:
- `id` - Fusion ID
- `user_id` - User ID (fallback)
- `clerk_user_id` - Clerk User ID (primary)
- `pokemon1_name` - First Pokemon name
- `pokemon2_name` - Second Pokemon name

## Environment Variables

Add these to your Vercel environment variables (already configured):
- `ONESIGNAL_REST_API_KEY` - OneSignal API key
- `NEXT_PUBLIC_ONESIGNAL_APP_ID` - OneSignal App ID
- `NEXT_PUBLIC_APP_URL` - Your app URL

## Testing

### Manual Test
```bash
curl -X POST https://www.pokemon-fusion.com/api/notifications/test-fusion \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "pokemon-fusion-secret-2024",
    "user_id": "your-test-user-id",
    "clerk_user_id": "your-clerk-user-id",
    "pokemon1_name": "Pikachu",
    "pokemon2_name": "Charizard"
  }'
```

### Database Test
Insert a test fusion record:

```sql
INSERT INTO fusions (user_id, clerk_user_id, pokemon1_name, pokemon2_name, image_url, created_at)
VALUES (
    'test-user',
    'your-clerk-user-id',
    'Pikachu',
    'Charizard',
    'https://example.com/fusion.png',
    NOW()
);
```

## User Requirements

**Important**: Users must have push notifications enabled to receive these notifications.

### For Notifications to Work:
1. User must visit your website
2. User must grant browser notification permission
3. OneSignal SDK must initialize and register the user
4. User must be logged in with Clerk (for external_user_id matching)

### Notification Targeting
- Uses `include_external_user_ids` to target specific user
- Requires `clerk_user_id` to match OneSignal's `external_user_id`
- Falls back to `user_id` if `clerk_user_id` not available

## Monitoring

### Success Indicators
- Check Vercel function logs for successful webhook calls
- Monitor OneSignal dashboard for delivery statistics
- Look for console logs: "Successfully sent fusion creation notification"

### Common Issues
1. **User Not Found**: User hasn't enabled push notifications
2. **Invalid User ID**: `clerk_user_id` doesn't match OneSignal records
3. **Webhook Failed**: Supabase can't reach your endpoint
4. **Rate Limiting**: Too many notifications sent too quickly

## Notification Flow

```
1. User generates fusion → AI processes → Fusion created in background
2. Fusion inserted into Supabase "fusions" table
3. Supabase trigger fires → Calls webhook
4. Webhook receives fusion data → Validates user
5. OneSignal API called → Sends push notification
6. User receives notification → Clicks "See Pokémon"
7. User redirected to gallery page → Sees new fusion
```

## Security Considerations

1. **Webhook Secret**: Use `x-supabase-webhook-secret` header for verification
2. **Rate Limiting**: Implement rate limiting if needed
3. **User Validation**: Ensure user owns the fusion being notified about
4. **HTTPS Required**: OneSignal requires HTTPS for all webhooks

## Performance Notes

1. **Edge Runtime**: Fast response times globally
2. **12-hour TTL**: Prevents notification spam
3. **High Priority**: Ensures immediate delivery
4. **Async Processing**: Won't block fusion insertion

This system provides immediate user feedback when their fusion is ready, significantly improving the user experience! 