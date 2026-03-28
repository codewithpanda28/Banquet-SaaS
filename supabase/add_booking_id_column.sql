-- 🌟 ADDING HUMAN-READABLE BOOKING ID
-- This allows restaurants to track bookings using the 'BK-XXXX' format from WhatsApp.

ALTER TABLE table_bookings 
ADD COLUMN IF NOT EXISTS booking_id TEXT;
