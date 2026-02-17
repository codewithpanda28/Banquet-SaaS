const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://syimbjztkwjdettdjybw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn() {
    console.log('Checking for is_active column...');
    const { data, error } = await supabase
        .from('menu_items')
        .select('is_active')
        .limit(1);

    if (error) {
        console.log('Result: Column Missing or Error');
        console.log('Error details:', error.message);
    } else {
        console.log('Result: Column Exists');
    }
}

checkColumn();
