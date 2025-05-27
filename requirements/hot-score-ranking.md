# Hot Score Ranking System

## Overview

The Hot Score Ranking System solves the "rich-get-richer" or "cold start" problem in content ranking by implementing a Reddit-style algorithm that balances popularity (likes) with content freshness (recency). This ensures newer content has a fair chance to compete with older, highly-liked content.

## Problem Statement

### The Rich-Get-Richer Problem
- **Issue**: Early content accumulates likes and dominates the popular page indefinitely
- **Impact**: New creators never get visibility to compete fairly
- **Result**: Stagnant popular page with the same old content always at the top

### Before Hot Score
```sql
-- Old ranking: Pure likes-based sorting
SELECT * FROM fusions ORDER BY likes DESC;
```
- A fusion with 50 likes from 6 months ago would always rank higher than a fusion with 5 likes from yesterday
- New content had no chance to be discovered

## Solution: Hot Score Algorithm

### Formula
```
hot_score = likes / (age_in_hours + 2)^gravity
```

**Parameters:**
- `likes`: Number of likes the fusion has received
- `age_in_hours`: Time elapsed since creation (in hours)
- `gravity`: Tunable parameter (default: 1.5) that controls the balance between popularity and freshness

### How It Works

1. **Recent Boost**: Newer content gets a significant boost in ranking
2. **Decay Over Time**: As content ages, its hot score naturally decreases
3. **Quality Still Matters**: Content with more likes still ranks higher among similar-aged content
4. **Fair Competition**: New creators can compete with established content

### Example Scenarios

| Fusion | Likes | Age (hours) | Hot Score | Ranking |
|--------|-------|-------------|-----------|---------|
| New Fusion A | 3 | 2 | 0.75 | #1 |
| Popular Old B | 20 | 168 (7 days) | 0.12 | #2 |
| Recent C | 1 | 24 | 0.04 | #3 |

## Implementation

### Database Function

```sql
CREATE OR REPLACE FUNCTION get_hot_score(
    likes INTEGER DEFAULT 0, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), 
    gravity FLOAT DEFAULT 1.5
)
RETURNS FLOAT AS $$
DECLARE
    age_in_hours FLOAT;
    hot_score FLOAT;
BEGIN
    -- Handle NULL inputs
    IF likes IS NULL THEN likes := 0; END IF;
    IF created_at IS NULL THEN created_at := NOW(); END IF;
    IF gravity IS NULL OR gravity <= 0 THEN gravity := 1.5; END IF;
    
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
        IF hot_score IS NULL OR hot_score = 'Infinity'::FLOAT OR 
           hot_score = '-Infinity'::FLOAT OR hot_score != hot_score THEN
            hot_score := 0.0;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        hot_score := 0.0;
    END;
    
    RETURN hot_score;
END;
$$ LANGUAGE plpgsql STABLE;
```

### Application Integration

#### Database Service (`lib/supabase-client.ts`)
```typescript
case 'hot':
  const { data: hotData, error: hotError } = await supabase
    .from('fusions')
    .select('*, get_hot_score(likes, created_at) as hot_score')
    .order('hot_score', { ascending: false })
    .limit(limit);
```

#### Popular Page (`app/popular/page.tsx`)
```typescript
// Uses hot score ranking by default
const fusions = await dbService.getPopularFusions(12, "hot");
```

## Features

### Error Handling & Fallback
- **Graceful Degradation**: If the hot score function fails, automatically falls back to likes-based sorting
- **Robust Function**: Handles NULL values, edge cases, and mathematical errors
- **Type Safety**: Proper timezone handling for `TIMESTAMP WITH TIME ZONE`

### Performance Optimization
- **Database Index**: Optimized index on `(likes, created_at)` for fast queries
- **Stable Function**: Marked as `STABLE` for PostgreSQL query optimization
- **Efficient Calculation**: Single database query with computed hot score

## Configuration

### Gravity Parameter
The `gravity` parameter controls the balance between popularity and freshness:

- **Lower gravity (1.0-1.2)**: More emphasis on freshness, newer content gets bigger boost
- **Default gravity (1.5)**: Balanced approach, good for most use cases  
- **Higher gravity (2.0+)**: More emphasis on popularity, similar to traditional ranking

### Tuning Examples
```sql
-- More aggressive freshness boost
SELECT get_hot_score(likes, created_at, 1.2) FROM fusions;

-- More conservative, popularity-focused
SELECT get_hot_score(likes, created_at, 2.0) FROM fusions;
```

## Benefits

### For Users
- ✅ **Fresh Content Discovery**: Always see new and trending content
- ✅ **Dynamic Popular Page**: Content changes regularly, not stagnant
- ✅ **Fair Representation**: All creators get visibility opportunities

### For Creators
- ✅ **Equal Opportunity**: New creators can compete with established ones
- ✅ **Immediate Feedback**: Good content gets discovered quickly
- ✅ **Motivation to Create**: Knowing new content has a fair chance

### For Platform
- ✅ **Increased Engagement**: Users return to see fresh content
- ✅ **Community Growth**: New creators stay engaged
- ✅ **Content Diversity**: Variety in popular content

## Monitoring & Analytics

### Key Metrics to Track
1. **Content Turnover Rate**: How often new content appears in popular
2. **Creator Diversity**: Number of different creators in popular rankings
3. **Engagement Patterns**: User interaction with newly-ranked content
4. **Time to Discovery**: How quickly good new content gets noticed

### Sample Queries
```sql
-- Check ranking distribution by age
SELECT 
    CASE 
        WHEN age_hours < 24 THEN 'Last 24h'
        WHEN age_hours < 168 THEN 'Last week'
        ELSE 'Older'
    END as age_group,
    COUNT(*) as count
FROM (
    SELECT 
        EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0 as age_hours
    FROM fusions
    ORDER BY get_hot_score(likes, created_at) DESC
    LIMIT 20
) ranked;
```

## Migration & Deployment

### Database Migration
1. Run the hot score function creation script in Supabase SQL Editor
2. Verify function works with test queries
3. Create the performance index

### Application Deployment
1. Deploy updated `lib/supabase-client.ts` with fallback logic
2. Deploy updated `app/popular/page.tsx` using hot score by default
3. Monitor logs for successful hot score usage vs fallback

### Rollback Plan
If issues arise, the system automatically falls back to likes-based sorting, ensuring the popular page always works.

## Conclusion

The Hot Score Ranking System successfully addresses the fundamental fairness issue in content discovery while maintaining the quality and relevance that users expect. By balancing popularity with freshness, it creates a more dynamic, engaging, and equitable platform for all users and creators. 