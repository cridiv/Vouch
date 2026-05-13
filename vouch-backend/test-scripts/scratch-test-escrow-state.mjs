import { EscrowState } from '../dist/escrow/state/escrow.state.js';

function runTests() {
  console.log('🚀 Running EscrowState Transition Tests...');
  const escrowState = new EscrowState();

  let passed = 0;
  let failed = 0;

  // Test 1: PENDING → FROZEN (valid)
  try {
    escrowState.transition('PENDING', 'FROZEN');
    console.log('✅ Test 1 Passed: PENDING → FROZEN is valid and did not throw.');
    passed++;
  } catch (err) {
    console.error('❌ Test 1 Failed: PENDING → FROZEN threw unexpected error:', err.message);
    failed++;
  }

  // Test 2: PENDING → DISBURSED (invalid)
  try {
    escrowState.transition('PENDING', 'DISBURSED');
    console.error('❌ Test 2 Failed: PENDING → DISBURSED succeeded but should have thrown!');
    failed++;
  } catch (err) {
    if (err.message.includes('Invalid escrow transition')) {
      console.log('✅ Test 2 Passed: PENDING → DISBURSED threw correct BadRequestException:', err.message);
      passed++;
    } else {
      console.error('❌ Test 2 Failed with unexpected error:', err.message);
      failed++;
    }
  }

  // Test 3: FROZEN → FUNDED (invalid - frozen is terminal)
  try {
    escrowState.transition('FROZEN', 'FUNDED');
    console.error('❌ Test 3 Failed: FROZEN → FUNDED succeeded but should have thrown!');
    failed++;
  } catch (err) {
    if (err.message.includes('Invalid escrow transition')) {
      console.log('✅ Test 3 Passed: FROZEN → FUNDED threw correct BadRequestException:', err.message);
      passed++;
    } else {
      console.error('❌ Test 3 Failed with unexpected error:', err.message);
      failed++;
    }
  }

  // Test 4: DISBURSED → anything (invalid - disbursed is terminal)
  const allStatuses = ['PENDING', 'FUNDED', 'IN_PROGRESS', 'COMPLETED', 'DISBURSED', 'FROZEN'];
  console.log('🧪 Running Test 4: DISBURSED → anything...');
  for (const status of allStatuses) {
    try {
      escrowState.transition('DISBURSED', status);
      console.error(`❌ Test 4 Failed: DISBURSED → ${status} succeeded but should have thrown!`);
      failed++;
    } catch (err) {
      if (err.message.includes('Invalid escrow transition')) {
        console.log(`✅ Test 4 Sub-test Passed: DISBURSED → ${status} threw correct BadRequestException.`);
        passed++;
      } else {
        console.error(`❌ Test 4 Sub-test Failed with unexpected error for ${status}:`, err.message);
        failed++;
      }
    }
  }

  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

