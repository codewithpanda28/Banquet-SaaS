-- 🌟 ADDING CUSTOM QR CODE SUPPORT TO RESTAURANTS
-- This allows restaurants to upload their own static QR code image (for PhonePe, etc.)

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
