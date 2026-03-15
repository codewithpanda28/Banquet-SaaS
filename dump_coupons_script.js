
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = "https://syimbjztkwjdettdjybw.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo";

async function dumpCoupons() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('coupons').select('*');
  fs.writeFileSync('coupons_dump.json', JSON.stringify(data, null, 2));
  console.log('Dumped', data.length, 'coupons');
}

dumpCoupons();
