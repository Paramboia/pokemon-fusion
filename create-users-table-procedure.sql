-- Create a stored procedure to create the users table if it doesn't exist
CREATE OR REPLACE FUNCTION create_users_table_if_not_exists()
RETURNS void AS $$
BEGIN
    -- Check if the users table exists
    IF NOT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'users'
    ) THEN
        -- Create the users table
        CREATE TABLE public.users (
            id UUID PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Add a comment to the table
        COMMENT ON TABLE public.users IS 'Table to store user information';
    END IF;
END;
$$ LANGUAGE plpgsql; 