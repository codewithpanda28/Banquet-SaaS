-- 🌟 ADDING AI REVIEW COLUMN TO ORDERS
-- This stores the AI-generated review so the admin can see it in the dashboard.

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS generated_review TEXT;
