-- Enhanced trigger function with detailed logging for debugging
CREATE OR REPLACE FUNCTION notify_fusion_created()
RETURNS trigger AS $$
DECLARE
    response_status INTEGER;
    response_body TEXT;
BEGIN
    -- Log that the trigger fired
    RAISE NOTICE 'Fusion created trigger fired for fusion ID: %', NEW.id;
    RAISE NOTICE 'User ID: %, Clerk User ID: %', NEW.user_id, NEW.clerk_user_id;
    RAISE NOTICE 'Pokemon: % + %', NEW.pokemon1_name, NEW.pokemon2_name;
    
    BEGIN
        -- Make HTTP request to notification endpoint with detailed logging
        SELECT status, content INTO response_status, response_body
        FROM net.http_post(
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
            timeout_milliseconds := 5000
        );
        
        -- Log the response
        RAISE NOTICE 'Webhook response status: %', response_status;
        RAISE NOTICE 'Webhook response body: %', response_body;
        
    EXCEPTION 
        WHEN OTHERS THEN
            -- Log detailed error information
            RAISE NOTICE 'Notification webhook failed with error: %', SQLERRM;
            RAISE NOTICE 'Error detail: %', SQLSTATE;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql; 