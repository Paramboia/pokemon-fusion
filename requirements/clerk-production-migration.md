# Clerk Production Migration Guide

This guide will help you migrate from Clerk development to production while preserving existing users.

## ✅ What You've Already Done

- [x] Created production Clerk instance
- [x] Updated environment variables in `.env.local`
- [x] Added production keys to Vercel

## 📋 Migration Checklist

### 1. Pre-Migration Preparation

#### A. Backup Your Data
```bash
# Create a backup of your Supabase users table
# In your Supabase dashboard, go to SQL Editor and run:
# SELECT * FROM users;
# Export the results as CSV for backup
```

#### B. Verify Environment Variables
Ensure these are set correctly in both `.env.local` and Vercel:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsucG9rZW1vbi1mdXNpb24uY29tJA
CLERK_SECRET_KEY=sk_live_0GpkSQTJ5P0361n0rPk7sCiYcNRgXRV1Qg3oqK6xdl
CLERK_WEBHOOK_SECRET=whsec_POkvCpgXyEWsD2JmJVONXITOfEs7X4qb
```

### 2. Configure Production Clerk Instance

#### A. Set Up OAuth Providers (if using social login)
For each social provider you want to enable:

1. **Google OAuth** (if used):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `https://your-domain.com/sso-callback/google`
     - `https://accounts.clerk.dev/oauth/callback/google` (for development)

2. **GitHub OAuth** (if used):
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create new OAuth App
   - Add redirect URI: `https://your-domain.com/sso-callback/github`

3. **Other providers**: Follow similar process for each provider

#### B. Configure Clerk Dashboard Settings
1. Navigate to Clerk Dashboard → Your Production App
2. Go to **SSO Connections**
3. Add your OAuth providers with custom credentials
4. Go to **Domains** and add your production domain
5. Configure **Email & SMS** settings if needed

### 3. Run the Migration

#### A. Test Migration (Dry Run)
First, test the migration script to see what will happen:

```bash
# Make sure your .env.local has the production keys
node scripts/migrate-clerk-production.js
```

This will show you:
- How many users can be matched
- Which users cannot be found in production Clerk
- No actual changes will be made yet

#### B. Execute Migration
If the dry run looks good, the script will automatically perform the migration.

Expected output:
```
🚀 Starting Clerk Production Migration...
📋 Fetching Supabase users without clerk_id...
📊 Found 25 Supabase users without clerk_id
👥 Fetching all users from production Clerk...
📊 Total production Clerk users found: 20

📊 Migration Analysis:
   ✅ Users to migrate: 18
   ❌ Users not found in Clerk: 7

🔄 Starting migration...
🔗 Linking John Doe (john@example.com) to Clerk ID user_abc...
   ✅ Success
...

📊 Migration Complete:
   ✅ Successfully migrated: 18 users
   ❌ Failed: 0 users
   ⚠️  Not found in Clerk: 7 users
```

### 4. Handle Unmatched Users

Users not found in production Clerk will need to sign up again. However:
- ✅ Their data (favorites, credits, fusions) will be preserved
- ✅ When they sign up with the same email, they'll automatically be linked
- ✅ No data loss occurs

### 5. Deploy and Test

#### A. Deploy to Production
```bash
# Deploy to Vercel
vercel --prod
```

#### B. Test User Flows
1. **Existing Users**: Have them sign in to verify their data is intact
2. **New Users**: Test new user registration
3. **Social Login**: Test OAuth providers if configured
4. **Webhook**: Verify new users are properly synced to Supabase

### 6. Configure Webhooks

Update your webhook endpoints in Clerk Dashboard:
1. Go to **Webhooks** in Clerk Dashboard
2. Update webhook URL to: `https://your-domain.com/api/webhooks/clerk`
3. Update webhook secret: `whsec_POkvCpgXyEWsD2JmJVONXITOfEs7X4qb`
4. Ensure these events are enabled:
   - `user.created`
   - `user.updated`

### 7. DNS Configuration (If Using Custom Domain)

If you want to use a custom domain like `auth.your-domain.com`:

1. **Add DNS Records** in your domain provider:
   ```
   Type: CNAME
   Name: auth (or your chosen subdomain)
   Value: accounts.clerk.dev
   ```

2. **Configure in Clerk Dashboard**:
   - Go to **Domains**
   - Add your custom domain
   - Wait for DNS propagation (up to 24 hours)
   - Click "Deploy certificates"

### 8. Security Hardening

#### A. Content Security Policy (CSP)
If using CSP, add these domains:
```
connect-src: *.clerk.accounts.com *.clerk.dev
script-src: *.clerk.accounts.com *.clerk.dev
```

#### B. Configure Authorized Parties
Update your middleware to include authorized parties:

```typescript
// middleware.ts
export default clerkMiddleware({
  authorizedParties: ['https://your-domain.com'],
});
```

## 🚨 Troubleshooting

### Issue: "No Clerk users found"
**Solution**: Verify your `CLERK_SECRET_KEY` is the production key (starts with `sk_live_`)

### Issue: "Supabase connection failed"
**Solution**: Check your `SUPABASE_SERVICE_ROLE_KEY` in environment variables

### Issue: "Users not syncing after signup"
**Solution**: 
1. Check webhook configuration in Clerk Dashboard
2. Verify webhook secret matches your environment variable
3. Check your app logs for webhook errors

### Issue: "OAuth redirect errors"
**Solution**: 
1. Verify redirect URIs in OAuth provider settings
2. Ensure production domain is configured correctly
3. Check that OAuth credentials are for production, not development

## 📈 Post-Migration Monitoring

### Monitor These Metrics:
1. **User Registration**: Are new users being created successfully?
2. **User Sync**: Are new users appearing in Supabase?
3. **Authentication**: Are existing users able to sign in?
4. **OAuth**: Are social logins working?

### Useful Debugging Endpoints:
- `GET /api/debug/user-mapping` - Check user mapping status
- `GET /api/health` - General health check

## 🎉 Migration Complete!

Once everything is working:
1. ✅ Existing users can sign in with their existing credentials
2. ✅ New users are properly synced to Supabase
3. ✅ OAuth providers work correctly
4. ✅ All user data is preserved
5. ✅ Webhooks are functioning

## 📞 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review application logs in Vercel
3. Check Supabase logs for database errors
4. Verify all environment variables are correctly set 