-- Add Webhook URL column to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- Update existing restaurants to have the default webhook pattern if they don't have one
UPDATE restaurants 
SET webhook_url = 'https://n8n.srv1114630.hstgr.cloud/webhook-test/restaurant?id=' || id
WHERE webhook_url IS NULL;
