import axios from 'axios';

const BASE_URL = 'http://localhost:5000/v1';

async function runTests() {
  const uniqueId = Date.now();
  const testEmail = `test-dev-${uniqueId}@vouch.xyz`;
  const testSupabaseUid = `supabase-uid-${uniqueId}`;

  console.log('🚀 Starting end-to-end API and Guard tests...\n');

  // 1. Provision a brand new developer
  console.log(`Step 1: Provisioning developer (${testEmail})...`);
  const res1 = await axios.post(`${BASE_URL}/developer/provision`, {
    email: testEmail,
    supabaseUid: testSupabaseUid,
  });

  const devId = res1.data.developerId;
  const originalApiKey = res1.data.apiKey;

  console.log('✅ Response 1 (New Developer Created):', JSON.stringify(res1.data, null, 2));
  if (!devId || !originalApiKey || !originalApiKey.rawKey) {
    throw new Error('❌ Test failed: Missing developerId or rawKey in step 1.');
  }

  // 2. Provision again with same supabaseUid (idempotency check)
  console.log('\nStep 2: Provisioning again with the EXACT SAME supabaseUid...');
  const res2 = await axios.post(`${BASE_URL}/developer/provision`, {
    email: testEmail,
    supabaseUid: testSupabaseUid,
  });

  console.log('✅ Response 2 (Idempotency verified): apiKey is', res2.data.apiKey);
  if (res2.data.developerId !== devId || res2.data.apiKey !== null) {
    throw new Error('❌ Test failed: Idempotency check failed.');
  }

  // 3. Hit Guarded Route with VALID API Key
  console.log('\nStep 3: Hitting guarded route with VALID API key (POST /api-keys)...');
  const res3 = await axios.post(
    `${BASE_URL}/developer/api-keys`,
    { name: 'Additional Key' },
    {
      headers: {
        'x-api-key': originalApiKey.rawKey,
      },
    }
  );

  console.log('✅ Response 3 (Valid Key Authenticated):', JSON.stringify(res3.data, null, 2));
  if (!res3.data.prefix || !res3.data.rawKey) {
    throw new Error('❌ Test failed: Failed to generate key with valid API key.');
  }
  console.log('🎉 Confirmed: Developer is correctly attached to request by ApiKeyGuard!');

  // 4. Hit Guarded Route with INVALID API Key
  console.log('\nStep 4: Hitting guarded route with INVALID API key (POST /api-keys)...');
  try {
    await axios.post(
      `${BASE_URL}/developer/api-keys`,
      { name: 'Hacker Key' },
      {
        headers: {
          'x-api-key': 'vouch_wrongkey1234567890abcdef12345678',
        },
      }
    );
    throw new Error('❌ Test failed: Expected 401 Unauthorized for invalid API key, but request succeeded.');
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.log('✅ Response 4 (Invalid Key): Correctly blocked with 401 Unauthorized.');
      console.log('   Message:', err.response.data.message);
    } else {
      throw err;
    }
  }

  // 5. Hit Guarded Route with MISSING API Key
  console.log('\nStep 5: Hitting guarded route with MISSING API key (POST /api-keys)...');
  try {
    await axios.post(
      `${BASE_URL}/developer/api-keys`,
      { name: 'No Key' },
      {} // No header sent
    );
    throw new Error('❌ Test failed: Expected 401 Unauthorized for missing API key, but request succeeded.');
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.log('✅ Response 5 (Missing Key): Correctly blocked with 401 Unauthorized.');
      console.log('   Message:', err.response.data.message);
    } else {
      throw err;
    }
  }

  console.log('\n✨ All tests passed successfully! Guard verification complete. ✨');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed!');
  if (err.response) {
    console.error('Response Status:', err.response.status);
    console.error('Response Data:', JSON.stringify(err.response.data, null, 2));
  } else {
    console.error(err.message);
  }
});
