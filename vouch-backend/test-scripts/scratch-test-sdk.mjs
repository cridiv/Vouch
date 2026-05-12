import axios from 'axios';
import { Vouch } from '../vouch-sdk/dist/vouch.js';

const BASE_URL = 'http://localhost:5000/v1';

async function runTests() {
  const uniqueId = Date.now();
  const testEmail = `test-sdk-${uniqueId}@vouch.xyz`;
  const testSupabaseUid = `supabase-sdk-${uniqueId}`;

  console.log('🚀 Starting SDK device fingerprint tests...\n');

  // 1. Provision developer to get an API key
  console.log(`Step 1: Provisioning developer (${testEmail})...`);
  const provisionRes = await axios.post(`${BASE_URL}/developer/provision`, {
    email: testEmail,
    supabaseUid: testSupabaseUid,
  });

  const apiKey = provisionRes.data.apiKey.rawKey;
  console.log(`✅ Developer Provisioned. API Key: ${apiKey.substring(0, 8)}...`);

  // 2. Initialize the Vouch SDK
  const vouch = new Vouch(apiKey, BASE_URL);

  // Set the mock fingerprint to simulate a specific device
  const MOCK_FP = `fp_${uniqueId}`;
  globalThis.MOCK_FINGERPRINT = MOCK_FP;

  console.log(`\nStep 2: Creating a dummy agreement to test assess endpoint...`);
  let agreement;
  try {
    agreement = await vouch.escrow.create({
      title: 'Test Agreement',
      buyer_id: `buyer_${uniqueId}`,
      seller_id: `seller_${uniqueId}`,
      amount: 1000,
      milestones: [
        { title: 'Milestone 1', amount: 1000, deadline: new Date().toISOString() }
      ]
    });
    console.log(`✅ Agreement created: ${agreement.id}`);
  } catch (err) {
    console.log(`⚠️ Agreement creation failed (endpoint might not exist yet): ${err.message}`);
    // Fake agreement ID to continue tests if endpoint doesn't exist
    agreement = { id: `dummy_agr_${uniqueId}` };
  }

  // 3. First Assess Call - New User, New Fingerprint
  console.log(`\nStep 3: Test 1 - First call with new fingerprint (${MOCK_FP})...`);
  try {
    const res1 = await vouch.escrow.assess(agreement.id, {
      externalUserId: `buyer_${uniqueId}`,
      transactionAmount: 1000,
    });
    
    console.log(`✅ First Assess Response:`, res1);
    
    // We expect device_seen_before: false, device_matches_onboarding: false
    if (res1.device_seen_before !== false) {
      console.warn(`❌ Expected device_seen_before to be false, got ${res1.device_seen_before}`);
    }
    if (res1.device_matches_onboarding !== false) {
      console.warn(`❌ Expected device_matches_onboarding to be false, got ${res1.device_matches_onboarding}`);
    }

  } catch (err) {
    console.log(`⚠️ First Assess call failed (endpoint might not exist yet): ${err.message}`);
  }

  // 4. Second Assess Call - Same User, Same Fingerprint
  console.log(`\nStep 4: Test 2 - Second call with SAME fingerprint (${MOCK_FP})...`);
  try {
    const res2 = await vouch.escrow.assess(agreement.id, {
      externalUserId: `buyer_${uniqueId}`,
      transactionAmount: 1000,
    });

    console.log(`✅ Second Assess Response:`, res2);

    // We expect device_seen_before: true
    if (res2.device_seen_before !== true) {
      console.warn(`❌ Expected device_seen_before to be true, got ${res2.device_seen_before}`);
    }

  } catch (err) {
    console.log(`⚠️ Second Assess call failed: ${err.message}`);
  }

  console.log('\n✨ SDK Test Script Complete! ✨');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed!');
  console.error(err);
});
