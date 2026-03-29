// Script to apply production RLS policies via Supabase REST API
// using the service role key from .env.local
// Run: node apply_rls.js <SERVICE_ROLE_KEY>

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://syimbjztkwjdettdjybw.supabase.co';
const SERVICE_KEY = process.argv[2];

if (!SERVICE_KEY || SERVICE_KEY === 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE') {
  console.error('❌ Usage: node apply_rls.js <YOUR_SERVICE_ROLE_KEY>');
  console.error('   Get it from: Supabase Dashboard → Settings → API → service_role');
  process.exit(1);
}

const sqlFile = path.join(__dirname, 'supabase', 'PRODUCTION_rls_policies.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

const payload = JSON.stringify({ query: sql });

const options = {
  hostname: 'syimbjztkwjdettdjybw.supabase.co',
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'apikey': SERVICE_KEY,
    'Content-Length': Buffer.byteLength(payload)
  }
};

// Use pg-based SQL execution via Supabase's management API
const pgPayload = JSON.stringify({ query: sql });

const mgmtOptions = {
  hostname: 'api.supabase.com',
  path: '/v1/projects/syimbjztkwjdettdjybw/database/query',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Length': Buffer.byteLength(pgPayload)
  }
};

console.log('🚀 Applying Production RLS Policies to Supabase...');

const req = https.request(mgmtOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ RLS Policies Applied Successfully!');
      console.log(data);
    } else {
      console.log(`⚠️  Status: ${res.statusCode}`);
      console.log(data);
      console.log('\n📋 Manual Step Required:');
      console.log('   Open Supabase SQL Editor and paste the contents of:');
      console.log('   supabase/PRODUCTION_rls_policies.sql');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Network error:', e.message);
});

req.write(pgPayload);
req.end();
