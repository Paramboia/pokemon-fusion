-- Create a function to increment the likes count for a fusion
CREATE OR REPLACE FUNCTION increment_fusion_likes(fusion_id UUID) RETURNS void AS supabase_functions.sql BEGIN UPDATE fusions SET likes = likes + 1 WHERE id = fusion_id; END; supabase_functions.sql LANGUAGE plpgsql;
