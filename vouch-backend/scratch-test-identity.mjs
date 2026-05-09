import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000/v1';

async function runTests() {
  const uniqueId = Date.now().toString();
  const testEmail = `dev-identity-${uniqueId}@vouch.xyz`;
  const testSupabaseUid = `sub-identity-${uniqueId}`;
  const testExternalUserId = `client-user-${uniqueId}`;

  console.log('🚀 Step 1: Provisioning a fresh developer for identity testing...');
  const provRes = await axios.post(`${BASE_URL}/developer/provision`, {
    email: testEmail,
    supabaseUid: testSupabaseUid,
  });

  const devId = provRes.data.developerId;
  const rawApiKey = provRes.data.apiKey.rawKey;
  console.log(`✅ Developer created (ID: ${devId}) with API KeyPrefix: ${provRes.data.apiKey.prefix}`);

  console.log('\n🚀 Step 2: Preparing multipart/form-data payload using native Node Blobs...');
  const formData = new FormData();
  formData.append('external_user_id', testExternalUserId);

  // Convert dummy binary buffers to standard Blobs natively supported in Node 20+
  const docBlob = new Blob([Buffer.from('fake-document-image-data-png')], { type: 'image/png' });
  const selfieBlob = new Blob([Buffer.from('fake-selfie-image-data-png')], { type: 'image/png' });

  formData.append('document_image', docBlob, 'document.png');
  formData.append('selfie_image', selfieBlob, 'selfie.png');

  console.log('🚀 Step 3: Sending verify request to POST /v1/identity/verify...');
  const verifyRes = await axios.post(`${BASE_URL}/identity/verify`, formData, {
    headers: {
      'x-api-key': rawApiKey,
    },
  });

  console.log('✅ Response Received:', JSON.stringify(verifyRes.data, null, 2));

  console.log('\n⏳ Waiting 500ms for async fire-and-forget logging to finalize...');
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log('\n🚀 Step 4: Verifying PlatformUser state in database...');
  const user = await prisma.platformUser.findUnique({
    where: {
      externalUserId_developerId: {
        externalUserId: testExternalUserId,
        developerId: devId,
      },
    },
  });

  if (!user) {
    throw new Error(`❌ Test failed: PlatformUser was not found in the DB!`);
  }
  console.log('✅ PlatformUser found in DB:', JSON.stringify(user, null, 2));

  if (user.identityVerified !== true) {
    throw new Error('❌ Test failed: PlatformUser identityVerified is not true.');
  }
  if (user.identityMatchScore !== 94.2) {
    throw new Error('❌ Test failed: PlatformUser identityMatchScore mismatch.');
  }
  console.log('🎉 DB verification success: PlatformUser matches identity result precisely!');

  console.log('\n🚀 Step 5: Verifying DeveloperLog audit entry...');
  const log = await prisma.developerLog.findFirst({
    where: {
      developerId: devId,
      eventType: 'IDENTITY_VERIFIED',
    },
  });

  if (!log) {
    throw new Error('❌ Test failed: DeveloperLog entry with IDENTITY_VERIFIED event was not written.');
  }
  console.log('✅ DeveloperLog audit entry found:', JSON.stringify(log, null, 2));
  console.log('🎉 DB verification success: DeveloperLog audit entry written correctly!');

  console.log('\n✨ All Identity Module integration tests passed with flying colors! ✨');
}

runTests()
  .catch((err) => {
    console.error('\n❌ Integration Test Failed!');
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err);
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
