-- CORRECTED: Trigger function that properly gets clerk_id from users table
CREATE OR REPLACE FUNCTION notify_fusion_created()
RETURNS trigger AS $$
DECLARE
    user_clerk_id TEXT;
    response_status INTEGER;
    response_body TEXT;
    notification_payload JSONB;
BEGIN
    -- Get the clerk_id from the users table using the user_id from fusions
    SELECT clerk_id INTO user_clerk_id 
    FROM users 
    WHERE id = NEW.user_id;
    
    -- Log the trigger execution
    RAISE NOTICE 'Fusion created trigger fired for fusion ID: %', NEW.id;
    RAISE NOTICE 'User ID: %, Clerk ID from users table: %', NEW.user_id, user_clerk_id;
    RAISE NOTICE 'Pokemon: % + %', NEW.pokemon1_name, NEW.pokemon2_name;
    
    -- Only proceed if we found a clerk_id
    IF user_clerk_id IS NOT NULL THEN
        BEGIN
            -- Create the notification payload with the correct clerk_id
            notification_payload := jsonb_build_object(
                'type', 'INSERT',
                'table', 'fusions',
                'record', jsonb_build_object(
                    'id', NEW.id,
                    'user_id', NEW.user_id,
                    'clerk_user_id', user_clerk_id,  -- Use the clerk_id from users table
                    'pokemon1_name', NEW.pokemon1_name,
                    'pokemon2_name', NEW.pokemon2_name,
                    'image_url', NEW.image_url,
                    'created_at', NEW.created_at
                )
            );
            
            -- Make HTTP request to notification endpoint
            SELECT status, content INTO response_status, response_body
            FROM net.http_post(
                url := 'https://www.pokemon-fusion.com/api/notifications/fusion-created',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'x-supabase-webhook-secret', 'fusion-webhook-secret-2024'
                ),
                body := notification_payload,
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
    ELSE
        RAISE NOTICE 'No clerk_id found for user_id: %', NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql; 