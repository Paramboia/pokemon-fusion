# Monthly Rewards System for Pokémon Fusion

This document outlines the implementation of a monthly rewards system that recognizes and rewards the top 3 most popular Pokémon fusions at the end of each month.

## Overview

The Monthly Rewards System is designed to incentivize creativity and engagement within the Pokémon Fusion community by automatically awarding free credits to the creators of the top 3 most popular fusions each month. The system runs automatically via a CRON job at the end of each month and rewards winners based on their ranking on the Popular page.

## Reward Structure

At the end of each month, the top 3 fusions (ranked by hot score on the Popular page) receive the following rewards:

| Rank | Credits Awarded | Description |
|------|----------------|-------------|
| 🥇 1st Place | 3 credits | Best performing fusion of the month |
| 🥈 2nd Place | 2 credits | Second best performing fusion |
| 🥉 3rd Place | 1 credit | Third best performing fusion |

## How It Works

### Ranking System

The rewards are based on the **hot score ranking** used on the Popular page, which balances:
- **Popularity**: Number of likes received
- **Recency**: How recently the fusion was created

This ensures that newer fusions have a fair chance to compete with older, highly-liked content, providing an equitable system that rewards both quality and recent activity.

The hot score algorithm uses the formula:
```
hot_score = likes / (age_in_hours + 2)^gravity
```

Where `gravity` is a tunable parameter (default: 1.5) that controls how quickly the score decays with age.

### Monthly Execution

1. **Timing**: The CRON job runs on the 1st of each month at midnight (00:00 UTC)
   - **Cron Schedule**: `0 0 1 * *` (1st day of every month at 00:00 UTC)

2. **Process**:
   - Takes a snapshot of the top 3 fusions from the Popular page using the hot score ranking
   - Retrieves the user_id for each of the top 3 fusions
   - Checks if rewards have already been processed for the current period (prevents duplicates)
   - Creates credit transaction entries in the `credits_transactions` table
   - Updates the user's `credits_balance` in the `users` table

3. **Transaction Records**:
   - Each reward is recorded as a separate entry in `credits_transactions`
   - **Transaction Type**: `monthly_reward`
   - **Amount**: Positive integer (3, 2, or 1 credits depending on rank)
   - **Description**: Includes rank, period (YYYY-MM), and fusion name
     - Example: `"Monthly Reward - 1st Place (2024-01) - Fusion: Charizard-Blastoise"`

### Duplicate Prevention

The system prevents duplicate rewards by:
- Checking for existing transactions with `transaction_type = 'monthly_reward'` and matching period in the description
- If rewards for the current period already exist, the job exits without processing

## Implementation Details

### CRON Job Endpoint

**Location**: `app/api/rewards/monthly-cron/route.ts`

**Security**:
- Verifies that requests come from Vercel CRON (via user-agent check)
- In development, allows testing with `CRON_SECRET` environment variable
- Requires `SUPABASE_SERVICE_ROLE_KEY` for admin operations

**Functionality**:
1. Authenticates the request (Vercel CRON or secret)
2. Gets top 3 fusions using hot score ranking (same as Popular page)
3. Checks for duplicate rewards for the period
4. Awards credits to top 3 users:
   - Inserts transaction record
   - Updates user balance
5. Returns JSON response with results

**Example Response**:
```json
{
  "message": "Monthly rewards processed for 2024-01",
  "period": "2024-01",
  "top_fusions_count": 3,
  "rewards_given": 3,
  "results": [
    {
      "fusion_id": "uuid-1",
      "fusion_name": "Charizard-Blastoise",
      "user_id": "user-uuid-1",
      "rank": 1,
      "credits": 3,
      "success": true
    },
    {
      "fusion_id": "uuid-2",
      "fusion_name": "Pikachu-Eevee",
      "user_id": "user-uuid-2",
      "rank": 2,
      "credits": 2,
      "success": true
    },
    {
      "fusion_id": "uuid-3",
      "fusion_name": "Mewtwo-Lugia",
      "user_id": "user-uuid-3",
      "rank": 3,
      "credits": 1,
      "success": true
    }
  ]
}
```

### Vercel Configuration

**Location**: `vercel.json`

The CRON job is configured in the `crons` array:

```json
{
  "crons": [
    {
      "path": "/api/rewards/monthly-cron",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

**Schedule**: `0 0 1 * *` means:
- `0` - Minute 0
- `0` - Hour 0 (midnight)
- `1` - Day 1 of the month
- `*` - Any month
- `*` - Any day of week

This runs at 00:00 UTC on the 1st of every month.

## User Interface

### Reward Banner

**Location**: `components/reward-banner.tsx`

A prominent banner displayed below the header on every page that informs users about the monthly rewards system:

- **Text**: "Free Credits for the Top 3 Fusions 🏆"
- **Visibility**: Shown by default, can be dismissed by clicking the X button
- **Persistence**: Uses `localStorage` with key `reward_banner_dismissed` to remember user preference
- **Styling**: Gradient background (yellow/orange) with trophy emoji

**Integration**: 
- Added to `components/client-layout.tsx` below the `<Header />` component
- Appears on all pages automatically

### About Page Section

**Location**: `app/about/page.tsx`

A new section added below "Our Mission" that explains:

- The monthly rewards structure (3, 2, 1 credits for 1st, 2nd, 3rd place)
- How rankings are determined (hot score algorithm)
- When rewards are distributed (1st of each month)
- Encouragement for users to create fusions

## Database Schema

### Credits Transactions Table

The rewards are stored using the existing `credits_transactions` table with the following values:

- **transaction_type**: `'monthly_reward'`
- **amount**: Positive integer (3, 2, or 1)
- **description**: Format: `"Monthly Reward - {rank} Place ({period}) - Fusion: {fusion_name}"`
- **user_id**: UUID of the fusion creator
- **package_id**: NULL (not applicable for rewards)
- **payment_id**: NULL (not applicable for rewards)

**Example Transaction**:
```sql
INSERT INTO credits_transactions (
  user_id,
  amount,
  transaction_type,
  description
) VALUES (
  'user-uuid-1',
  3,
  'monthly_reward',
  'Monthly Reward - 1st Place (2024-01) - Fusion: Charizard-Blastoise'
);
```

### Users Table

The user's `credits_balance` is incremented by the reward amount:

```sql
UPDATE users
SET credits_balance = credits_balance + 3
WHERE id = 'user-uuid-1';
```

## Testing

### Manual Testing

You can test the CRON job manually by making a GET request with the secret:

```bash
# Development/Testing
curl "https://your-domain.com/api/rewards/monthly-cron?secret=YOUR_CRON_SECRET"

# Or with Authorization header
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     "https://your-domain.com/api/rewards/monthly-cron"
```

### Verification

To verify rewards were processed:

1. **Check Transactions**:
   ```sql
   SELECT * FROM credits_transactions 
   WHERE transaction_type = 'monthly_reward' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

2. **Check User Balances**:
   ```sql
   SELECT id, credits_balance 
   FROM users 
   WHERE id IN (
     SELECT DISTINCT user_id 
     FROM credits_transactions 
     WHERE transaction_type = 'monthly_reward' 
     AND created_at > NOW() - INTERVAL '1 month'
   );
   ```

3. **Check for Duplicates**:
   ```sql
   SELECT period, COUNT(*) 
   FROM (
     SELECT SUBSTRING(description FROM '\(([0-9]{4}-[0-9]{2})\)') as period
     FROM credits_transactions 
     WHERE transaction_type = 'monthly_reward'
   ) periods
   GROUP BY period
   HAVING COUNT(*) > 3;
   ```

## Environment Variables

The CRON job requires the following environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations (required for updating user balances)
- `CRON_SECRET`: Secret key for testing the CRON job in non-production environments (optional)

## Error Handling

The CRON job includes comprehensive error handling:

1. **Authentication Errors**: Returns 401 if request is not from Vercel CRON or missing secret
2. **Missing Configuration**: Returns 500 if Supabase credentials are missing
3. **No Fusions**: Returns 200 with message if no fusions are found (normal for early days)
4. **Duplicate Processing**: Returns 200 with message if rewards already processed for period
5. **Individual Failures**: Continues processing even if one user's reward fails, logs errors

All errors are logged to the console for debugging.

## Future Enhancements

Potential improvements for the monthly rewards system:

1. **Email Notifications**: Notify winners via email when rewards are distributed
2. **Leaderboard Page**: Display monthly leaderboards showing top performers
3. **Reward History**: Show users their past rewards in their profile
4. **Additional Ranks**: Extend rewards to top 5 or top 10
5. **Special Events**: Periodic bonus rewards for specific themes or challenges
6. **Badges/Achievements**: Visual badges for monthly winners in user profiles
7. **Statistics Dashboard**: Admin dashboard showing reward distribution over time

## Related Documentation

- **Hot Score Ranking**: See `requirements/hot-score-ranking.md` for details on the ranking algorithm
- **Credit System**: See `requirements/credit-based-system.md` for credit transaction structure
- **CRON Jobs**: See `requirements/onesignal_instructions.md` for similar CRON job implementation pattern

## Support

For questions or issues related to the monthly rewards system:

1. Check CRON job logs in Vercel dashboard
2. Verify Supabase credentials and permissions
3. Review transaction records in the database
4. Test manually using the CRON secret

---

**Last Updated**: 2024-01-XX  
**Status**: Active  
**Maintainer**: Development Team

