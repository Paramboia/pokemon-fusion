-- Fixed version of the hot score function
-- This version handles edge cases better and should be more stable

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_hot_score(INTEGER, TIMESTAMP, FLOAT);

-- Create a more robust version
CREATE OR REPLACE FUNCTION get_hot_score(
    likes INTEGER DEFAULT 0, 
    created_at TIMESTAMP DEFAULT NOW(), 
    gravity FLOAT DEFAULT 1.5
)
RETURNS FLOAT AS $$
DECLARE
    age_in_hours FLOAT;
    hot_score FLOAT;
BEGIN
    -- Handle NULL inputs
    IF likes IS NULL THEN
        likes := 0;
    END IF;
    
    IF created_at IS NULL THEN
        created_at := NOW();
    END IF;
    
    IF gravity IS NULL OR gravity <= 0 THEN
        gravity := 1.5;
    END IF;
    
    -- Calculate age in hours, ensuring it's never negative
    age_in_hours := GREATEST(
        EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0,
        0.1
    );
    
    -- Ensure likes is not negative
    likes := GREATEST(likes, 0);
    
    -- Calculate hot score with safety checks
    BEGIN
        hot_score := likes::FLOAT / POWER(age_in_hours + 2, gravity);
        
        -- Handle potential infinity or NaN
        IF hot_score IS NULL OR hot_score = 'Infinity'::FLOAT OR hot_score = '-Infinity'::FLOAT OR hot_score != hot_score THEN
            hot_score := 0.0;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- If any error occurs in calculation, return 0
        hot_score := 0.0;
    END;
    
    RETURN hot_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_hot_score(INTEGER, TIMESTAMP, FLOAT) TO PUBLIC;

-- Test the function with various inputs
SELECT 'Test 1: Normal case' as test, get_hot_score(5, NOW() - INTERVAL '1 day');
SELECT 'Test 2: Zero likes' as test, get_hot_score(0, NOW() - INTERVAL '1 day');
SELECT 'Test 3: NULL likes' as test, get_hot_score(NULL, NOW() - INTERVAL '1 day');
SELECT 'Test 4: Very old content' as test, get_hot_score(10, NOW() - INTERVAL '365 days');
SELECT 'Test 5: Very new content' as test, get_hot_score(1, NOW() - INTERVAL '1 minute'); 