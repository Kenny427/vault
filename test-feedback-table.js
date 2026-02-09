/**
 * Test if ai_feedback table exists and what data is in it
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '.env.local');
let SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      SUPABASE_URL = line.split('=')[1].trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      SUPABASE_ANON_KEY = line.split('=')[1].trim();
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      SUPABASE_SERVICE_KEY = line.split('=')[1].trim();
    }
  });
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

async function testFeedbackTable() {
  console.log('🔍 TESTING AI FEEDBACK TABLE\n');
  console.log('═'.repeat(80));

  // Try with anon key first
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  console.log('\n1️⃣  Testing with ANON key (respects RLS)...\n');
  
  const { data: anonData, error: anonError } = await anonClient
    .from('ai_feedback')
    .select('*')
    .limit(10);

  if (anonError) {
    console.log('❌ Anon query error:', anonError.message);
    console.log('   This is expected if no user is logged in (RLS blocks it)\n');
  } else {
    console.log(`✅ Anon query successful: ${anonData?.length || 0} rows`);
    if (anonData && anonData.length > 0) {
      console.log('   Sample:', JSON.stringify(anonData[0], null, 2));
    }
  }

  // Try with service key if available (bypasses RLS)
  if (SUPABASE_SERVICE_KEY) {
    console.log('\n2️⃣  Testing with SERVICE KEY (bypasses RLS)...\n');
    
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const { data: serviceData, error: serviceError } = await serviceClient
      .from('ai_feedback')
      .select('*')
      .limit(10);

    if (serviceError) {
      console.log('❌ Service query error:', serviceError.message);
      if (serviceError.message.includes('relation') || serviceError.message.includes('does not exist')) {
        console.log('\n⚠️  THE TABLE DOES NOT EXIST YET!\n');
        console.log('You need to run the AI_FEEDBACK_SCHEMA.sql file in Supabase first:\n');
        console.log('   1. Go to Supabase Dashboard → SQL Editor');
        console.log('   2. Paste the contents of supabase/AI_FEEDBACK_SCHEMA.sql');
        console.log('   3. Run the query');
        console.log('   4. Then feedback will start being saved\n');
      }
    } else {
      console.log(`✅ Service query successful: ${serviceData?.length || 0} rows\n`);
      if (serviceData && serviceData.length > 0) {
        console.log('Found feedback entries:');
        serviceData.forEach((f, i) => {
          console.log(`\n   ${i+1}. ${f.item_name} (${f.feedback_type})`);
          console.log(`      User: ${f.user_id.substring(0, 8)}...`);
          console.log(`      Date: ${new Date(f.created_at).toLocaleString()}`);
          console.log(`      Tags: ${(f.tags || []).join(', ') || 'none'}`);
        });
      } else {
        console.log('⚠️  Table exists but has NO DATA yet.');
        console.log('\nThis means users haven\'t given feedback yet, OR:');
        console.log('   - The feedback UI isn\'t saving to the database');
        console.log('   - Check the browser console for errors when clicking accept/decline\n');
      }
    }
  } else {
    console.log('\n2️⃣  No SERVICE_ROLE_KEY found in .env.local');
    console.log('   Can\'t bypass RLS to check for all feedback\n');
  }

  console.log('═'.repeat(80));
  console.log('\n📋 SUMMARY:\n');
  console.log('✅ If you see rows above: AI feedback IS working!');
  console.log('⚠️  If table doesn\'t exist: Run AI_FEEDBACK_SCHEMA.sql in Supabase');
  console.log('⚠️  If table empty: Check if UI is actually calling the /api/ai-feedback endpoint\n');
}

testFeedbackTable().catch(console.error);
