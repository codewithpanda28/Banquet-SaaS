
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://syimbjztkwjdettdjybw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo";
const restaurantId = "f1dde894-c027-4506-a55a-dfe65bb0449f";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log('--- Checking Items & Rules ---');

    // 1. Get Ice Cream and Rasmalai IDs
    const { data: items } = await supabase
        .from('menu_items')
        .select('id, name')
        .eq('restaurant_id', restaurantId)
        .in('name', ['Ice Cream', 'Rasmalai', 'Ice cream', 'rasmalai']);

    console.log('Items found:', items);

    // 2. Get all rules
    const { data: rules } = await supabase
        .from('upsell_rules')
        .select(`
            id,
            trigger_item_id,
            suggest_item_id,
            message,
            trigger:menu_items!trigger_item_id (name),
            suggest:menu_items!suggest_item_id (name)
        `)
        .eq('restaurant_id', restaurantId);

    console.log('\nAll Rules in DB:');
    rules.forEach(r => {
        console.log(`[ID: ${r.id}] ${r.trigger?.name} (${r.trigger_item_id}) -> ${r.suggest?.name} (${r.suggest_item_id})`);
    });
}

check();
