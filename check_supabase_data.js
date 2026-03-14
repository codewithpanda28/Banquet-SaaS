
const { createClient } = require('@supabase/supabase-client');

const supabaseUrl = 'https://syimbjztkwjdettdjybw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo';
const restaurantId = 'f1dde894-c027-4506-a55a-dfe65bb0449f';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('--- Checking Restaurant Tables ---');
  const { data: tables, error: tableError } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('restaurant_id', restaurantId);

  if (tableError) {
    console.error('Error fetching tables:', tableError);
    return;
  }

  console.log(`Found ${tables.length} tables.`);
  const table7 = tables.find(t => t.table_number === 7);
  console.log('Table 7:', table7);

  console.log('\n--- Checking Today\'s Bookings ---');
  const today = new Date().toISOString().split('T')[0];
  console.log('Today is:', today);

  const { data: bookings, error: bookingError } = await supabase
    .from('table_bookings')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('booking_date', today);

  if (bookingError) {
    console.error('Error fetching bookings:', bookingError);
    return;
  }

  console.log(`Found ${bookings.length} bookings for today.`);
  bookings.forEach(b => {
    console.log(`Booking ID: ${b.id}, Table ID: ${b.table_id}, Customer: ${b.customer_name}, Status: ${b.status}, Time: ${b.booking_time}`);
  });

  if (table7) {
    const table7Bookings = bookings.filter(b => b.table_id === table7.id);
    console.log(`\nTable 7 Bookings today: ${table7Bookings.length}`);
  }
}

checkData();
