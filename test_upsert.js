const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://syimbjztkwjdettdjybw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo'
)

const RESTAURANT_ID = '78590680-a619-4702-863a-446487e8346b' // Assuming this is correct from common pattern

async function testUpsert() {
  const validUntil = new Date()
  validUntil.setDate(validUntil.getDate() + 30)

  const { data, error } = await supabase
    .from('coupons')
    .upsert({
        restaurant_id: RESTAURANT_ID,
        code: 'LOYAL20',
        description: 'Test Loyal Coupon',
        discount_type: 'percentage',
        discount_value: 20,
        min_order_amount: 0,
        usage_limit: 100,
        is_active: true,
        valid_from: new Date().toISOString(),
        valid_until: validUntil.toISOString()
    }, { onConflict: 'restaurant_id,code' })

  if (error) {
    console.error('❌ Upsert Error:', error)
  } else {
    console.log('✅ Upsert Success:', data)
  }
}

testUpsert()
