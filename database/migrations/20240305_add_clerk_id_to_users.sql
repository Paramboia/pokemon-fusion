-- Migration to add clerk_id column to users table
-- This migration adds a clerk_id column to the users table to properly map Clerk IDs to Supabase user IDs

-- First, check if the users table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'users'
    ) THEN
        -- Check if the clerk_id column already exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'clerk_id'
        ) THEN
            -- Add the clerk_id column
            ALTER TABLE public.users
            ADD COLUMN clerk_id TEXT UNIQUE;
            
            -- Add an index on clerk_id for faster lookups
            CREATE INDEX idx_users_clerk_id ON public.users(clerk_id);
            
            -- Add a comment to the column
            COMMENT ON COLUMN public.users.clerk_id IS 'Clerk user ID for authentication mapping';
            
            RAISE NOTICE 'Added clerk_id column to users table';
        ELSE
            RAISE NOTICE 'clerk_id column already exists in users table';
        END IF;
    ELSE
        RAISE NOTICE 'users table does not exist, creating it with clerk_id column';
        
        -- Create the users table with clerk_id column
        CREATE TABLE public.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            clerk_id TEXT UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Add an index on clerk_id for faster lookups
        CREATE INDEX idx_users_clerk_id ON public.users(clerk_id);
        
        -- Add a comment to the table
        COMMENT ON TABLE public.users IS 'Table to store user information';
        COMMENT ON COLUMN public.users.clerk_id IS 'Clerk user ID for authentication mapping';
    END IF;
END $$; 