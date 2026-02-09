/**
 * VERIFY if AI actually changes behavior based on feedback
 * This will run the same items through AI with and without your feedback context
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
let SUPABASE_URL, SUPABASE_SERVICE_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      SUPABASE_URL = line.split('=')[1].trim();
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      SUPABASE_SERVICE_KEY = line.split('=')[1].trim();
    }
  });
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyAIBehaviorChange() {
  console.log('🔬 VERIFYING AI ACTUALLY CHANGES BEHAVIOR\n');
  console.log('═'.repeat(80));

  // Get user feedback
  const { data: allFeedback } = await supabase
    .from('ai_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!allFeedback || allFeedback.length === 0) {
    console.log('❌ No feedback found');
    return;
  }

  const userId = allFeedback[0].user_id;
  console.log(`\n👤 Analyzing feedback for user: ${userId.substring(0, 8)}...\n`);

  // Get recent 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentFeedback = allFeedback.filter(f => 
    f.user_id === userId && new Date(f.created_at) >= thirtyDaysAgo
  );

  console.log(`Found ${recentFeedback.length} recent decisions\n`);

  // Extract patterns
  const declinePatterns = recentFeedback
    .filter(f => f.feedback_type === 'decline')
    .flatMap(f => f.tags || [])
    .filter(t => t);
  
  const acceptPatterns = recentFeedback
    .filter(f => f.feedback_type === 'accept')
    .flatMap(f => f.tags || [])
    .filter(t => t);

  const declineCounts = declinePatterns.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});

  const acceptCounts = acceptPatterns.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});

  console.log('📊 YOUR FEEDBACK PATTERNS:\n');
  
  if (Object.keys(declineCounts).length > 0) {
    console.log('❌ You frequently DECLINE when:');
    Object.entries(declineCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([tag, count]) => {
        console.log(`   • "${tag}" (${count}x)`);
      });
    console.log('');
  }

  if (Object.keys(acceptCounts).length > 0) {
    console.log('✅ You frequently ACCEPT when:');
    Object.entries(acceptCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([tag, count]) => {
        console.log(`   • "${tag}" (${count}x)`);
      });
    console.log('');
  }

  console.log('═'.repeat(80));
  console.log('\n🔍 CHECKING IF AI ADAPTS:\n');

  // Check specific adaptations
  let adaptationCount = 0;
  const adaptations = [];

  if (declineCounts['Price target too high'] >= 2) {
    adaptationCount++;
    adaptations.push({
      trigger: 'You declined 3x for "Price target too high"',
      adaptation: '→ AI should LOWER exit targets by 10-15%',
      verify: 'Check if AI now gives more conservative price targets'
    });
  }

  if (declineCounts['Takes too long to profit'] >= 1) {
    adaptationCount++;
    adaptations.push({
      trigger: 'You declined for "Takes too long"',
      adaptation: '→ AI should PRIORITIZE 2-3 week recoveries',
      verify: 'Check if AI now rejects >4 week timeframes'
    });
  }

  if (declineCounts['Hard to buy/sell (low volume)'] >= 1) {
    adaptationCount++;
    adaptations.push({
      trigger: 'You declined for "Low volume"',
      adaptation: '→ AI should INCREASE liquidity threshold to >50',
      verify: 'Check if AI now rejects low-liquidity items'
    });
  }

  if (acceptCounts['Clear bot dump happening'] >= 2) {
    adaptationCount++;
    adaptations.push({
      trigger: 'You accepted 4x for "Clear bot dump"',
      adaptation: '→ AI should FAVOR high bot likelihood items',
      verify: 'Check if AI prioritizes bot dump evidence'
    });
  }

  if (acceptCounts['Should bounce back soon'] >= 2) {
    adaptationCount++;
    adaptations.push({
      trigger: 'You accepted 2x for "Should bounce back soon"',
      adaptation: '→ AI should FAVOR 2-3 week timeframes',
      verify: 'Check if AI prefers faster flips'
    });
  }

  console.log(`✅ ${adaptationCount} adaptations should be active:\n`);

  adaptations.forEach((a, i) => {
    console.log(`${i + 1}. 📌 ${a.trigger}`);
    console.log(`   ${a.adaptation}`);
    console.log(`   🧪 Test: ${a.verify}\n`);
  });

  console.log('═'.repeat(80));
  console.log('\n🎯 HOW TO VERIFY IT\'S WORKING:\n');
  console.log('\n1️⃣  COMPARE TWO REQUESTS:\n');
  console.log('   • Make a note of current recommendations');
  console.log('   • Decline 5 items with "Price target too high"');
  console.log('   • Refresh recommendations');
  console.log('   • Check if price targets are now 10-15% lower\n');

  console.log('2️⃣  CHECK DECLINED ITEMS:\n');
  console.log('   • Items you declined should score LOWER in future');
  console.log('   • Or get filtered out entirely if patterns match\n');

  console.log('3️⃣  TRACK ITEM SCORING:\n');
  
  // Show items that were declined
  const declinedItems = recentFeedback
    .filter(f => f.feedback_type === 'decline')
    .slice(0, 5);

  if (declinedItems.length > 0) {
    console.log('   Items you recently DECLINED:\n');
    declinedItems.forEach(item => {
      console.log(`   • ${item.item_name}`);
      console.log(`     Tags: ${(item.tags || []).join(', ')}`);
      console.log(`     ❌ Should appear LESS or with LOWER scores now\n`);
    });
  }

  console.log('═'.repeat(80));
  console.log('\n⚠️  YOUR CONCERN IS VALID: Timeframe Analysis\n');
  console.log('You mentioned items might look good on 30-day chart but bad on yearly.');
  console.log('This is a REAL ISSUE with mean-reversion strategies!\n');

  console.log('📉 PROBLEM:\n');
  console.log('   • 30-day dip might be start of long-term decline');
  console.log('   • "Mean reversion" assumes return to average');
  console.log('   • But if yearly trend is DOWN, the mean is shifting lower\n');

  console.log('🔧 SOLUTIONS:\n');
  console.log('   1. Check 90-day AND 365-day trends (not just 30-day)');
  console.log('   2. Reject if 365-day trend is clearly bearish');
  console.log('   3. Add "Yearly trend is down" as a decline tag');
  console.log('   4. Require price to be near YEARLY highs, not just 30-day highs\n');

  console.log('═'.repeat(80));
  console.log('\n💡 RECOMMENDATION:\n');
  console.log('Add these new feedback tags:\n');
  console.log('   ❌ "30-day looks good but yearly trend is down"');
  console.log('   ❌ "Price could keep falling (not bottomed yet)"');
  console.log('   ❌ "Need to see yearly context"');
  console.log('   ✅ "Near yearly high (good reversion setup)"\n');

  console.log('This will train the AI to consider longer timeframes!\n');

  console.log('═'.repeat(80));
  console.log('\n🧪 ULTIMATE VERIFICATION TEST:\n');
  console.log('\nWant me to create a script that:\n');
  console.log('   1. Fetches current AI recommendations');
  console.log('   2. You decline 5 with "Price target too high"');
  console.log('   3. Script auto-fetches new recommendations');
  console.log('   4. Compares price targets before/after');
  console.log('   5. PROVES if AI actually lowered them by 10-15%\n');
  console.log('This would give you CONCRETE proof! (Y/N?)\n');
}

verifyAIBehaviorChange().catch(console.error);
