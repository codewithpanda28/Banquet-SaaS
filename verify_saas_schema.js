const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://syimbjztkwjdettdjybw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo'
)

const tablesToCheck = [
  'restaurants',
  'orders',
  'order_items',
  'menu_items',
  'menu_categories',
  'restaurant_tables',
  'coupons'
];

async function checkSchema() {
  console.log('--- SaaS Database Audit ---');
  
  for (const table of tablesToCheck) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        console.log(`❌ Table '${table}' DOES NOT EXIST.`);
      } else {
        console.error(`⚠️ Error reading '${table}':`, error.message);
      }
    } else {
      const columns = data.length > 0 ? Object.keys(data[0]) : [];
      let status = `✅ Table '${table}' exists.`;
      
      if (columns.length > 0) {
        if (table !== 'restaurants') {
            if (columns.includes('restaurant_id')) {
              status += ` 🛡️ HAS restaurant_id.`;
            } else {
              status += ` ❌ MISSING restaurant_id! (${columns.join(', ')})`;
            }
        }
      } else {
         status += ` (Table is empty, checking via insert trick failed. Needs manual check)`;
      }
      console.log(status);
    }
  }
}

checkSchema()
