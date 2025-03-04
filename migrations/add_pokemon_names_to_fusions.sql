-- Add pokemon_1_name and pokemon_2_name columns to the fusions table
ALTER TABLE fusions ADD COLUMN IF NOT EXISTS pokemon_1_name TEXT;
ALTER TABLE fusions ADD COLUMN IF NOT EXISTS pokemon_2_name TEXT;

-- Update existing records to set names based on IDs (if possible)
UPDATE fusions
SET 
  pokemon_1_name = COALESCE((SELECT name FROM pokemon WHERE id = fusions.pokemon_1_id), 'Unknown Pokemon'),
  pokemon_2_name = COALESCE((SELECT name FROM pokemon WHERE id = fusions.pokemon_2_id), 'Unknown Pokemon')
WHERE 
  pokemon_1_name IS NULL OR pokemon_2_name IS NULL;

-- Add a comment to explain the migration
COMMENT ON COLUMN fusions.pokemon_1_name IS 'Name of the first Pokemon in the fusion';
COMMENT ON COLUMN fusions.pokemon_2_name IS 'Name of the second Pokemon in the fusion'; 