# Supabase Connection Setup and Testing

This document provides instructions on how to set up and test Supabase connections for the Pokemon Fusion application.

## Environment Variables

The following environment variables are required for Supabase connections:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

These should be added to your `.env.local` file in the root of the project.

## Supabase Client Structure

The application uses three main Supabase client configurations:

1. **Client-side Supabase client** (`lib/supabase-client.ts`):
   - Used for client-side operations
   - Uses the anonymous key
   - Disables Supabase Auth (we use Clerk for authentication)

2. **Server-side Supabase client** (`lib/supabase-server.ts`):
   - Used for server-side operations
   - Includes both anonymous key and service role key clients
   - Provides authenticated client functions

3. **Server Actions Supabase client** (`lib/supabase-server-actions.ts`):
   - Used for server actions
   - Uses the service role key to bypass RLS
   - Provides specific database operations

## Testing Supabase Connections

### Health Check API

The application includes a health check API endpoint that verifies all Supabase connections:

```
GET /api/supabase-health
```

This endpoint checks:
- Client-side connection
- Server-side connection
- Storage connection
- Environment variables

### Comprehensive Test Script

A comprehensive test script is available to test all aspects of Supabase connections:

```bash
node test-supabase-connections.js
```

This script tests:
1. Direct Supabase connection with anon key
2. Direct Supabase connection with service key
3. API health check endpoint
4. Storage access
5. Database tables (users, pokemon, fusions, favorites)

### API Endpoint Tests

The following scripts are available to test specific API endpoints:

- `node test-likes-api.js` - Tests the likes API endpoint
- `node test-favorites.js` - Tests the favorites functionality
- `node test-save-fusion-api.js` - Tests saving fusion data

## Troubleshooting

If you encounter connection issues:

1. **Check environment variables**:
   - Ensure all required variables are set in `.env.local`
   - Verify the values are correct (no typos, extra spaces, etc.)

2. **Verify Supabase project settings**:
   - Check that RLS policies are configured correctly
   - Ensure the required tables exist with the correct schema

3. **Check for CORS issues**:
   - Verify that your Supabase project allows requests from your application domain

4. **Run the health check**:
   - Use the health check API to identify specific connection issues
   - Check the server logs for detailed error messages

## Database Schema

The application uses the following tables:

1. **users**:
   - `id` (UUID, primary key)
   - `name` (text)
   - `email` (text)
   - `created_at` (timestamp)

2. **pokemon**:
   - `id` (integer, primary key)
   - `name` (text)
   - `image_url` (text, optional)
   - `created_at` (timestamp)

3. **fusions**:
   - `id` (UUID, primary key)
   - `user_id` (UUID, foreign key to users.id)
   - `pokemon_1_id` (integer, foreign key to pokemon.id)
   - `pokemon_2_id` (integer, foreign key to pokemon.id)
   - `fusion_name` (text)
   - `fusion_image` (text)
   - `likes` (integer)
   - `created_at` (timestamp)

4. **favorites**:
   - `id` (serial, primary key)
   - `user_id` (UUID, foreign key to users.id)
   - `fusion_id` (UUID, foreign key to fusions.id)
   - `created_at` (timestamp)

## Storage Buckets

The application uses the following storage bucket:

- `fusions` - Stores fusion images 