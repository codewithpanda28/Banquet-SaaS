-- 🌟 ADDING GOOGLE REVIEW URL TO RESTAURANTS
-- This allows each 1000+ restaurant node to have its own unique review link.

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS google_review_url TEXT;

-- 📝 Update a default one for testing (Optional)
UPDATE restaurants 
SET google_review_url = 'https://g.page/review/TheGoldBiryani'
WHERE slug = 'goldbiryani';
