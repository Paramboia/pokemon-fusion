-- Add hot score ranking function to solve the "rich-get-richer" problem
-- This implements a Reddit-style algorithm that balances likes with recency

CREATE OR REPLACE FUNCTION get_hot_score(likes INTEGER, created_at TIMESTAMP, gravity FLOAT DEFAULT 1.5)
RETURNS FLOAT AS $$
DECLARE
    age_in_hours FLOAT;
    hot_score FLOAT;
BEGIN
    -- Calculate age in hours
    age_in_hours := EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0;
    
    -- Prevent division by zero and ensure minimum age
    IF age_in_hours < 0.1 THEN
        age_in_hours := 0.1;
    END IF;
    
    -- Calculate hot score: likes / (age_in_hours + 2)^gravity
    -- The +2 prevents very new content from having infinite scores
    hot_score := likes::FLOAT / POWER(age_in_hours + 2, gravity);
    
    RETURN hot_score;
END;
$$ LANGUAGE plpgsql;

-- Create an index to optimize hot score queries
CREATE INDEX IF NOT EXISTS idx_fusions_hot_score ON fusions (likes, created_at);

-- Add a comment explaining the function
COMMENT ON FUNCTION get_hot_score(INTEGER, TIMESTAMP, FLOAT) IS 
'Calculates a hot score for content ranking that balances popularity (likes) with recency. 
Higher gravity values favor older, highly-liked content more. Lower values give newer content more opportunity.'; 