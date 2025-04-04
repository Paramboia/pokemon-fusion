-- Add clerk_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT;

-- Create index on clerk_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create a function to increment the likes count for a fusion
CREATE OR REPLACE FUNCTION increment_fusion_likes(fusion_id UUID) RETURNS void AS supabase_functions.sql BEGIN UPDATE fusions SET likes = likes + 1 WHERE id = fusion_id; END; supabase_functions.sql LANGUAGE plpgsql;
