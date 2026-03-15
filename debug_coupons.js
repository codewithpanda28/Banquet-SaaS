
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://syimbjztkwjdettdjybw.supabase.co"; 
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo";

async function checkAllCoupons() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from('coupons')
    .select('*');
    
  if (data) {
    data.forEach(c => {
      console.log(`CODE: ${c.code} | RID: ${c.restaurant_id} | ACTIVE: ${c.is_active} | FROM: ${c.valid_from} | UNTIL: ${c.valid_until} | DESC: ${c.description}`);
    });
  }
}

checkAllCoupons();
