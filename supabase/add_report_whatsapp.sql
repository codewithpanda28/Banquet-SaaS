-- Run this in your Supabase SQL Editor
-- This adds a dedicated WhatsApp number for sending administrative reports
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS report_whatsapp_number TEXT;

-- Update description to clarify usage
COMMENT ON COLUMN restaurants.report_whatsapp_number IS 'WhatsApp number used for automated administrative reports distribution.';
