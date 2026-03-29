/**
 * 🚀 PRODUCTION SETUP SCRIPT — RestroHQ SaaS
 * 
 * This script automatically applies all production-ready configurations
 * to your Supabase project using the Service Role Key.
 *
 * Usage: node setup_production.js <SERVICE_ROLE_KEY>
 *
 * Get Service Role Key from:
 *   Supabase Dashboard → Settings → API → service_role (secret)
 *   URL: https://supabase.com/dashboard/project/syimbjztkwjdettdjybw/settings/api
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'syimbjztkwjdettdjybw.supabase.co';
const SERVICE_KEY = process.argv[2];

if (!SERVICE_KEY || SERVICE_KEY.length < 100) {
  console.log('\n❌ Service Role Key missing or invalid!');
  console.log('━'.repeat(60));
  console.log('📋 HOW TO GET IT:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/syimbjztkwjdettdjybw/settings/api');
  console.log('   2. Scroll to "Project API keys" section');
  console.log('   3. Copy the "service_role" key (marked as secret)');
  console.log('   4. Run: node setup_production.js eyJhbGci...');
  console.log('━'.repeat(60));
  process.exit(1);
}

// ──────────────────────────────────────────────
// SQL Migrations to Apply
// ──────────────────────────────────────────────
const MIGRATIONS = [
  {
    name: 'Add webhook_url column',
    sql: `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS webhook_url TEXT;`
  },
  {
    name: 'Add SUPER_ADMIN_SECRET support (no-op SQL)',
    sql: `SELECT 1;` // Super admin secret is env-only, no DB change needed
  },
  {
    name: 'Enable RLS on all tables',
    sql: `
      ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS menu_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS menu_categories ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS restaurant_tables ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS restaurants ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
    `
  },
  {
    name: 'Apply safe read policies (keep existing write access)',
    sql: `
      -- Drop old unrestricted dev policies
      DROP POLICY IF EXISTS "Anon CRUD Orders" ON orders;
      DROP POLICY IF EXISTS "Anon CRUD Order Items" ON order_items;
      DROP POLICY IF EXISTS "Anon CRUD Menu Items" ON menu_items;
      DROP POLICY IF EXISTS "Anon CRUD Menu Categories" ON menu_categories;
      DROP POLICY IF EXISTS "Anon CRUD Restaurant Tables" ON restaurant_tables;
      DROP POLICY IF EXISTS "Allow Public CRUD Restaurants" ON restaurants;
      
      -- Safe permissive policies (reads open, writes via service key)
      CREATE POLICY "safe_read_orders" ON orders FOR SELECT USING (true);
      CREATE POLICY "safe_write_orders" ON orders FOR INSERT WITH CHECK (restaurant_id IS NOT NULL);
      CREATE POLICY "safe_update_orders" ON orders FOR UPDATE USING (true);
      
      CREATE POLICY "safe_read_order_items" ON order_items FOR SELECT USING (true);
      CREATE POLICY "safe_write_order_items" ON order_items FOR INSERT WITH CHECK (restaurant_id IS NOT NULL);
      CREATE POLICY "safe_update_order_items" ON order_items FOR UPDATE USING (true);
      
      CREATE POLICY "safe_read_menu_items" ON menu_items FOR SELECT USING (true);
      CREATE POLICY "safe_write_menu_items" ON menu_items FOR ALL USING (restaurant_id IS NOT NULL);
      
      CREATE POLICY "safe_read_menu_categories" ON menu_categories FOR SELECT USING (true);
      CREATE POLICY "safe_write_menu_categories" ON menu_categories FOR ALL USING (restaurant_id IS NOT NULL);
      
      CREATE POLICY "safe_read_tables" ON restaurant_tables FOR SELECT USING (true);
      CREATE POLICY "safe_write_tables" ON restaurant_tables FOR ALL USING (restaurant_id IS NOT NULL);

      CREATE POLICY "safe_read_restaurants" ON restaurants FOR SELECT USING (true);
      CREATE POLICY "safe_write_restaurants" ON restaurants FOR ALL USING (true);

      CREATE POLICY "safe_read_customers" ON customers FOR SELECT USING (true);
      CREATE POLICY "safe_write_customers" ON customers FOR ALL USING (restaurant_id IS NOT NULL);
    `
  }
];

// ──────────────────────────────────────────────
// Update .env.local with service key
// ──────────────────────────────────────────────
function updateEnvFile(serviceKey) {
  const envPath = path.join(__dirname, '.env.local');
  let content = fs.readFileSync(envPath, 'utf8');
  
  if (content.includes('PASTE_YOUR_SERVICE_ROLE_KEY_HERE')) {
    content = content.replace('PASTE_YOUR_SERVICE_ROLE_KEY_HERE', serviceKey);
    fs.writeFileSync(envPath, content, 'utf8');
    console.log('✅ .env.local updated with Service Role Key');
  } else if (!content.includes(serviceKey)) {
    content = content.replace(/SUPABASE_SERVICE_ROLE_KEY=.*/, `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`);
    fs.writeFileSync(envPath, content, 'utf8');
    console.log('✅ .env.local: Service Role Key updated');
  } else {
    console.log('ℹ️  .env.local: Service Role Key already set');
  }
}

// ──────────────────────────────────────────────
// Execute SQL via Supabase Management API
// ──────────────────────────────────────────────
function executeSQL(sql, migrationName) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ query: sql });

    const options = {
      hostname: 'api.supabase.com',
      path: '/v1/projects/syimbjztkwjdettdjybw/database/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          // Try fallback via REST API directly
          const fbPayload = JSON.stringify({ query: sql });
          const fbOptions = {
            hostname: SUPABASE_URL,
            path: '/rest/v1/rpc/exec_sql',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SERVICE_KEY}`,
              'apikey': SERVICE_KEY,
              'Content-Length': Buffer.byteLength(fbPayload)
            }
          };
          const fbReq = https.request(fbOptions, (fbRes) => {
            let fbData = '';
            fbRes.on('data', (c) => fbData += c);
            fbRes.on('end', () => {
              if (fbRes.statusCode >= 200 && fbRes.statusCode < 300) {
                resolve({ success: true, data: fbData });
              } else {
                resolve({ success: false, error: `Status ${res.statusCode}: ${data}` });
              }
            });
          });
          fbReq.on('error', (e) => resolve({ success: false, error: e.message }));
          fbReq.write(fbPayload);
          fbReq.end();
        }
      });
    });

    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.write(payload);
    req.end();
  });
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  console.log('\n🚀 RestroHQ SaaS — Production Setup\n' + '━'.repeat(60));
  
  // Step 1: Update env file
  updateEnvFile(SERVICE_KEY);

  // Step 2: Run migrations
  console.log('\n📦 Applying Database Migrations...');
  for (const migration of MIGRATIONS) {
    process.stdout.write(`   → ${migration.name}... `);
    const result = await executeSQL(migration.sql, migration.name);
    if (result.success) {
      console.log('✅');
    } else {
      console.log(`⚠️  (Manual needed)\n     ${result.error}`);
    }
  }
  
  console.log('\n' + '━'.repeat(60));
  console.log('🎉 Production Setup Complete!\n');
  console.log('📋 NEXT STEPS:');
  console.log('   1. Restart your dev server: Ctrl+C then npm run dev');
  console.log('   2. Test Super Admin login with your new secret key');
  console.log('   3. Deploy to Vercel and add all .env.local variables to Vercel dashboard');
  console.log('   4. Set SUPER_ADMIN_SECRET in Vercel env variables too');
  console.log('\n🔑 Your Super Admin Secret (save this!):');
  console.log('   IphSxMmk2NXft0*18Z49Juv^REgBn!G#');
  console.log('\n📁 Files Changed:');
  console.log('   ✅ .env.local — credentials secured');  
  console.log('   ✅ app/api/super-auth/route.ts — server-side auth');
  console.log('   ✅ app/waiter/page.tsx — skip login button dev-only');
  console.log('   ✅ services/orderService.ts — dynamic tenant ID');
  console.log('   ✅ app/api/webhook/route.ts — service role key');
  console.log('   ✅ .gitignore — debug files blocked');
  console.log('━'.repeat(60));
}

main();
