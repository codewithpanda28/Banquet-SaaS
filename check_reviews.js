
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://syimbjztkwjdettdjybw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo';
const restaurantId = 'f1dde894-c027-4506-a55a-dfe65bb0449f';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkReviews() {
    console.log('Checking reviews for Restaurant ID:', restaurantId);

    const { data: reviews, error } = await supabase
        .from('review_logs')
        .select('*');

    if (error) {
        console.error('Error fetching reviews:', error);
        return;
    }

    console.log('Found', reviews.length, 'reviews');
    console.log(JSON.stringify(reviews, null, 2));

    const { data: customerReviews } = await supabase
        .from('customer_reviews')
        .select('*');
    if (customerReviews) {
        console.log('Found', customerReviews.length, 'reviews in old table');
    }
}

checkReviews();
