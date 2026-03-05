
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://syimbjztkwjdettdjybw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aW1ianp0a3dqZGV0dGRqeWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzIzNzQsImV4cCI6MjA4NjA0ODM3NH0.XLhYgjLHpKhfTrXn7475aaZoIz7g8OgFiKYkjSZFAoo";
const restaurantId = "f1dde894-c027-4506-a55a-dfe65bb0449f";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fix() {
    console.log('--- Fixing Upsell Rules ---');

    // 1. Force Activate all rules for this restaurant
    const { error: updateError } = await supabase
        .from('upsell_rules')
        .update({ is_active: true })
        .eq('restaurant_id', restaurantId);

    if (updateError) console.error('Update Error:', updateError);

    // 2. Fetch and Display
    const { data: rules } = await supabase
        .from('upsell_rules')
        .select(`
            id,
            is_active,
            trigger:menu_items!trigger_item_id (name),
            suggest:menu_items!suggest_item_id (name)
        `)
        .eq('restaurant_id', restaurantId);

    console.log('Results:');
    rules.forEach(r => {
        console.log(`[${r.is_active ? 'ACTIVE' : 'INACTIVE'}] ${r.trigger?.name} -> ${r.suggest?.name}`);
    });
}

fix();
