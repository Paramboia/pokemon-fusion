To run the stored procedure in Supabase, go to the SQL Editor in the Supabase dashboard and execute the following SQL:
`sql
-- Create a function to increment the likes count for a fusion
CREATE OR REPLACE FUNCTION increment_fusion_likes(fusion_id UUID) RETURNS void AS supabase_instructions.md BEGIN UPDATE fusions SET likes = likes + 1 WHERE id = fusion_id; END; supabase_instructions.md LANGUAGE plpgsql;
Note: Make sure to run this SQL in the Supabase SQL Editor to create the stored procedure for incrementing likes.
