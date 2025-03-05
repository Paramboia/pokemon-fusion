-- SQL script to fix the likes count in the fusions table

-- First, create a function to recalculate likes for a specific fusion
CREATE OR REPLACE FUNCTION recalculate_fusion_likes(fusion_id UUID) RETURNS void AS $$
BEGIN
  UPDATE fusions
  SET likes = (
    SELECT COUNT(*)
    FROM favorites
    WHERE fusion_id = recalculate_fusion_likes.fusion_id
  )
  WHERE id = fusion_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to recalculate likes for all fusions
CREATE OR REPLACE FUNCTION recalculate_all_fusion_likes() RETURNS void AS $$
BEGIN
  UPDATE fusions f
  SET likes = (
    SELECT COUNT(*)
    FROM favorites fav
    WHERE fav.fusion_id = f.id
  );
END;
$$ LANGUAGE plpgsql;

-- Execute the function to fix all likes counts
SELECT recalculate_all_fusion_likes();

-- Create trigger functions for automatically updating likes count
CREATE OR REPLACE FUNCTION update_fusion_likes_on_favorite_change() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment likes count when a favorite is added
    UPDATE fusions SET likes = likes + 1 WHERE id = NEW.fusion_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement likes count when a favorite is removed
    UPDATE fusions SET likes = GREATEST(0, likes - 1) WHERE id = OLD.fusion_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on the favorites table
DROP TRIGGER IF EXISTS update_fusion_likes_insert ON favorites;
CREATE TRIGGER update_fusion_likes_insert
AFTER INSERT ON favorites
FOR EACH ROW
EXECUTE FUNCTION update_fusion_likes_on_favorite_change();

DROP TRIGGER IF EXISTS update_fusion_likes_delete ON favorites;
CREATE TRIGGER update_fusion_likes_delete
AFTER DELETE ON favorites
FOR EACH ROW
EXECUTE FUNCTION update_fusion_likes_on_favorite_change();

-- Update the increment_fusion_likes function to be idempotent
-- This ensures it won't increment if the user already liked the fusion
CREATE OR REPLACE FUNCTION increment_fusion_likes(fusion_id UUID, user_id UUID) RETURNS void AS $$
DECLARE
  favorite_exists BOOLEAN;
BEGIN
  -- Check if the favorite already exists
  SELECT EXISTS (
    SELECT 1 FROM favorites 
    WHERE fusion_id = increment_fusion_likes.fusion_id 
    AND user_id = increment_fusion_likes.user_id
  ) INTO favorite_exists;
  
  -- Only increment if the favorite doesn't exist
  IF NOT favorite_exists THEN
    UPDATE fusions SET likes = likes + 1 WHERE id = fusion_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a function to decrement likes when a favorite is removed
CREATE OR REPLACE FUNCTION decrement_fusion_likes(fusion_id UUID) RETURNS void AS $$
BEGIN
  UPDATE fusions SET likes = GREATEST(0, likes - 1) WHERE id = fusion_id;
END;
$$ LANGUAGE plpgsql; 