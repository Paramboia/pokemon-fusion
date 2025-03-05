# Deployment Guide for Pokémon Fusion

This guide provides instructions for deploying the Pokémon Fusion application to Vercel.

## Environment Variables

The application requires several environment variables to function correctly. Make sure to add these to your Vercel project settings before deploying.

### Required Environment Variables

#### Application URL
- `NEXT_PUBLIC_APP_URL`: The URL of your deployed application (e.g., `https://pokemon-fusion.vercel.app`)

#### Clerk Authentication
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key
- `CLERK_SECRET_KEY`: Your Clerk secret key
- `CLERK_WEBHOOK_SECRET`: Your Clerk webhook secret

#### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

#### Stripe
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret
- `STRIPE_PRICE_ID_5_CREDITS`: Stripe price ID for the 5 credits package
- `STRIPE_PRICE_ID_20_CREDITS`: Stripe price ID for the 20 credits package
- `STRIPE_PRICE_ID_50_CREDITS`: Stripe price ID for the 50 credits package

#### Replicate (for image generation)
- `REPLICATE_API_TOKEN`: Your Replicate API token

#### OneSignal (optional, for notifications)
- `NEXT_PUBLIC_ONESIGNAL_APP_ID`: Your OneSignal app ID
- `ONESIGNAL_REST_API_KEY`: Your OneSignal REST API key

## Deployment Steps

1. **Push your code to GitHub**:
   Make sure your code is pushed to a GitHub repository.

2. **Create a new project in Vercel**:
   - Go to [Vercel](https://vercel.com) and sign in
   - Click "Add New" > "Project"
   - Import your GitHub repository
   - Configure the project settings

3. **Add Environment Variables**:
   - In your Vercel project settings, go to the "Environment Variables" tab
   - Add all the required environment variables listed above
   - Make sure to use the correct values for your production environment

4. **Deploy**:
   - Click "Deploy" to start the deployment process
   - Vercel will build and deploy your application

5. **Set up Webhooks**:
   - Configure your Clerk webhook to point to `https://your-domain.com/api/webhooks/clerk`
   - Configure your Stripe webhook to point to `https://your-domain.com/api/webhooks/stripe`
   - Make sure to use the correct webhook secrets

## Troubleshooting

### Stripe Initialization Error

If you encounter an error like "Failed to initialize Stripe. API key missing" during deployment, make sure:

1. You've added the `STRIPE_SECRET_KEY` environment variable to your Vercel project
2. The key is correctly formatted and valid
3. You've deployed the application after adding the environment variable

### Database Connection Issues

If you encounter database connection issues:

1. Make sure your Supabase project is active
2. Verify that the Supabase environment variables are correctly set
3. Check that your IP is not blocked by Supabase's security settings

## Support

If you encounter any issues during deployment, please contact the development team for assistance. 