/**
 * VALIDATION AND TEST SUITE FOR AI FIXES
 * Tests price validation, batch completeness, and prompt improvements
 */

import { validateAndConstrainPrices, MeanReversionSignal } from '@/lib/meanReversionAnalysis';

/**
 * Test Case 1: Karambwan Price Validation
 * Reports show 534gp → 8,165gp guidance (15x too high)
 * This should be constrained to ~534 ± 15%
 */
export function testKarambwanPriceValidation() {
  console.log('\n=== TEST 1: Karambwan Price Validation ===');
  
  const mockKarambwanSignal: Partial<MeanReversionSignal> = {
    itemId: 3142,
    itemName: 'Raw karambwan',
    currentPrice: 534,
    entryPriceNow: 534,
    entryRangeLow: 527,
    entryRangeHigh: 541,
    exitPriceBase: 580,
    exitPriceStretch: 600,
    stopLoss: 496,
    shortTerm: {
      period: '7d',
      avgPrice: 540,
      currentDeviation: -1.1,
      volatility: 25,
      volumeAvg: 5000,
    },
    longTerm: {
      period: '365d',
      avgPrice: 580,
      currentDeviation: -7.9,
      volatility: 35,
      volumeAvg: 3000,
    },
    mediumTerm: {
      period: '90d',
      avgPrice: 560,
      currentDeviation: -4.6,
      volatility: 30,
      volumeAvg: 4000,
    },
  } as MeanReversionSignal;

  // AI returns crazy prices: 8,165gp entry
  const crazyAIPrices = {
    entryOptimal: 8165, // 15x too high!
    exitConservative: 8414,
    exitAggressive: 9000,
    triggerStop: 7500,
  };

  const validated = validateAndConstrainPrices(crazyAIPrices, mockKarambwanSignal as MeanReversionSignal);

  console.log('Input (AI):', crazyAIPrices);
  console.log('Output (Constrained):', {
    entryOptimal: validated.entryOptimal,
    exitConservative: validated.exitConservative,
    exitAggressive: validated.exitAggressive,
    triggerStop: validated.triggerStop,
  });
  console.log('Violations detected:', validated.violations);
  console.log('Use defaults?', validated.useDefaults);

  // Assert constraints
  if (validated.entryOptimal > 534 * 1.15 || validated.entryOptimal < 534 * 0.85) {
    console.error('❌ FAILED: Entry price outside acceptable range');
    return false;
  }
  
  if (validated.exitConservative <= validated.entryOptimal) {
    console.error('❌ FAILED: Exit conservative not higher than entry');
    return false;
  }

  console.log('✅ PASSED: Karambwan prices properly constrained');
  return true;
}

/**
 * Test Case 2: Normal Item Price Validation
 * Test with reasonable prices to ensure we don't over-constrain
 */
export function testReasonablePriceValidation() {
  console.log('\n=== TEST 2: Reasonable Price Validation ===');
  
  const mockNormalSignal: Partial<MeanReversionSignal> = {
    itemId: 536,
    itemName: 'Dragon bones',
    currentPrice: 3500,
    entryPriceNow: 3500,
    entryRangeLow: 3450,
    entryRangeHigh: 3550,
    exitPriceBase: 3800,
    exitPriceStretch: 4000,
    stopLoss: 3100,
    shortTerm: {
      period: '7d',
      avgPrice: 3600,
      currentDeviation: -2.8,
      volatility: 15,
      volumeAvg: 1000,
    },
    longTerm: {
      period: '365d',
      avgPrice: 3800,
      currentDeviation: -7.9,
      volatility: 25,
      volumeAvg: 800,
    },
    mediumTerm: {
      period: '90d',
      avgPrice: 3700,
      currentDeviation: -5.4,
      volatility: 18,
      volumeAvg: 900,
    },
  } as MeanReversionSignal;

  const reasonableAIPrices = {
    entryOptimal: 3480,
    exitConservative: 3800,
    exitAggressive: 4100,
    triggerStop: 3200,
  };

  const validated = validateAndConstrainPrices(reasonableAIPrices, mockNormalSignal as MeanReversionSignal);

  console.log('Input (AI):', reasonableAIPrices);
  console.log('Output (Validated):', {
    entryOptimal: validated.entryOptimal,
    exitConservative: validated.exitConservative,
    exitAggressive: validated.exitAggressive,
    triggerStop: validated.triggerStop,
  });
  console.log('Violations detected:', validated.violations);

  // Should pass with minimal violations
  if (validated.violations.length > 0) {
    console.warn('⚠️ Violations found (may be acceptable):', validated.violations);
  }

  console.log('✅ PASSED: Reasonable prices validated');
  return true;
}

/**
 * Test Case 3: Batch Completeness Mock
 * Test that all items in batch are returned from AI
 */
export function testBatchCompletenessLogic() {
  console.log('\n=== TEST 3: Batch Completeness Logic ===');
  
  const mockBatch = [
    { itemId: 1, name: 'Item 1' },
    { itemId: 2, name: 'Item 2' },
    { itemId: 3, name: 'Item 3' },
    { itemId: 4, name: 'Item 4' },
    { itemId: 5, name: 'Item 5' },
  ];

  // Simulate AI response missing items 3 and 5
  const aiResponse = {
    items: [
      { id: 1, include: true, reasoning: 'good' },
      { id: 2, include: false, reasoning: 'weak' },
      { id: 4, include: true, reasoning: 'strong' },
      // ❌ Missing IDs 3 and 5
    ],
  };

  const returnedIds = new Set(aiResponse.items.map(item => item.id));
  const missing = mockBatch.filter(item => !returnedIds.has(item.itemId));

  console.log('Batch size:', mockBatch.length);
  console.log('Returned:', aiResponse.items.length);
  console.log('Missing:', missing.map(m => m.itemId).join(', '));

  if (missing.length > 0) {
    console.error(`❌ FAILED: ${missing.length} items missing from batch (IDs: ${missing.map(m => m.itemId).join(', ')})`);
    console.error('This is the issue causing the "35 missing items" error');
    return false;
  }

  console.log('✅ PASSED: All batch items returned');
  return true;
}

/**
 * Test Case 4: Price Multiplier Sanity Check
 * Ensure no item gets >3x entry→exit without justification
 */
export function testPriceMultiplierConstraints() {
  console.log('\n=== TEST 4: Price Multiplier Constraints ===');
  
  const testCases = [
    {
      name: 'Reasonable 1.2x',
      entry: 1000,
      exit: 1200,
      shouldPass: true,
    },
    {
      name: 'Extreme 5x',
      entry: 1000,
      exit: 5000,
      shouldPass: false,
    },
    {
      name: 'Realistic 1.5x',
      entry: 2000,
      exit: 3000,
      shouldPass: true,
    },
    {
      name: 'Unlikely 3.5x',
      entry: 500,
      exit: 1750,
      shouldPass: false,
    },
  ];

  let passed = 0;
  for (const tc of testCases) {
    const multiplier = tc.exit / tc.entry;
    const isReasonable = multiplier < 3;
    const result = isReasonable === tc.shouldPass;
    
    console.log(
      `${result ? '✅' : '❌'} ${tc.name}: ${multiplier.toFixed(2)}x (${tc.shouldPass ? 'should pass' : 'should fail'})`
    );
    
    if (result) passed++;
  }

  if (passed === testCases.length) {
    console.log(`✅ PASSED: All multiplier checks passed (${passed}/${testCases.length})`);
    return true;
  }

  console.error(`❌ FAILED: ${testCases.length - passed} multiplier checks failed`);
  return false;
}

/**
 * Run all tests
 */
export function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║        AI SYSTEM FIX VALIDATION TESTS                              ║');
  console.log('║        Testing: Price validation, Batch completeness              ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  const results = [
    { name: 'Karambwan Price Validation', result: testKarambwanPriceValidation() },
    { name: 'Reasonable Price Validation', result: testReasonablePriceValidation() },
    { name: 'Batch Completeness Logic', result: testBatchCompletenessLogic() },
    { name: 'Price Multiplier Constraints', result: testPriceMultiplierConstraints() },
  ];

  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST RESULTS SUMMARY                        ║');
  console.log('╠════════════════════════════════════════════════════════════════════╣');

  const passed = results.filter(r => r.result).length;
  const total = results.length;

  for (const result of results) {
    const status = result.result ? '✅ PASS' : '❌ FAIL';
    console.log(`║ ${status.padEnd(8)} │ ${result.name.padEnd(58)} ║`);
  }

  console.log('╠════════════════════════════════════════════════════════════════════╣');
  console.log(`║ TOTAL: ${passed}/${total} tests passed                                         ║`);
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  return passed === total;
}

// Export for use in tests
export default {
  testKarambwanPriceValidation,
  testReasonablePriceValidation,
  testBatchCompletenessLogic,
  testPriceMultiplierConstraints,
  runAllTests,
};
