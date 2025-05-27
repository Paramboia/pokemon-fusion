-- Debug script for hot score function
-- Run this in your Supabase SQL Editor to diagnose the issue

-- 1. Check if the function exists
SELECT 
    routine_name, 
    routine_type, 
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_hot_score';

-- 2. Check function permissions
SELECT 
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_hot_score' AND n.nspname = 'public';

-- 3. Test the function directly with a simple call
SELECT get_hot_score(5, NOW() - INTERVAL '1 day');

-- 4. Test with actual data (if fusions exist)
SELECT 
    id,
    fusion_name,
    likes,
    created_at
FROM fusions 
LIMIT 3;

-- 5. Test the problematic query step by step
-- First, try without the function
SELECT id, fusion_name, likes, created_at
FROM fusions
ORDER BY likes DESC
LIMIT 3;

-- Then try with the function (this might fail)
-- SELECT 
--     id,
--     fusion_name, 
--     likes, 
--     created_at,
--     get_hot_score(likes, created_at) as hot_score
-- FROM fusions 
-- ORDER BY get_hot_score(likes, created_at) DESC 
-- LIMIT 3; 