-- URGENT FIX: Update the trigger function to handle errors gracefully
-- This prevents the notification from blocking fusion insertions

CREATE OR REPLACE FUNCTION notify_fusion_created()
RETURNS trigger AS $$
BEGIN
    -- Always return NEW first to ensure the INSERT succeeds
    -- Then try to send notification in a non-blocking way
    
    BEGIN
        -- Make HTTP request to notification endpoint
        -- Wrapped in nested BEGIN/END to catch and ignore errors
        PERFORM
            net.http_post(
                url := 'https://www.pokemon-fusion.com/api/notifications/fusion-created',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'x-supabase-webhook-secret', 'fusion-webhook-secret-2024'
                ),
                body := jsonb_build_object(
                    'type', 'INSERT',
                    'table', 'fusions',
                    'record', row_to_json(NEW)
                ),
                timeout_milliseconds := 5000  -- 5 second timeout
            );
    EXCEPTION 
        WHEN OTHERS THEN
            -- Log the error but don't fail the trigger
            -- This ensures fusion insertion always succeeds
            RAISE NOTICE 'Notification webhook failed: %', SQLERRM;
    END;
    
    -- Always return NEW to complete the INSERT
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Alternative: If the above still causes issues, use this simpler version
-- that completely separates the notification from the insertion

-- Uncomment these lines if you want to disable notifications temporarily:
-- DROP TRIGGER IF EXISTS fusion_created_notification ON fusions;
-- This will stop notifications but ensure fusions are saved properly 