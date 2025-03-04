-- Drop and recreate the fusions table to match the requirements
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS fusions;

-- Create the fusions table with the correct structure
CREATE TABLE fusions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    fusion_name TEXT NOT NULL,
    fusion_image TEXT NOT NULL,
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT now(),
    pokemon_1_name TEXT NOT NULL,
    pokemon_2_name TEXT NOT NULL
);

-- Recreate the favorites table
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    fusion_id UUID REFERENCES fusions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now()
); 