const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://syimbjztkwjdettdjybw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo'
)

async function checkTable() {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ Error reading coupons table:', error)
  } else {
    console.log('✅ Coupons table exists. Columns in first row:', Object.keys(data[0] || {}))
  }
}

checkTable()
