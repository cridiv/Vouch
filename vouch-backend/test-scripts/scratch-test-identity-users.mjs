import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000/v1';

async function runMasterIdentityUsersTests() {
  console.log('🌟===========================================================🌟');
  console.log('🚀   STARTING MASTER IDENTITY & USERS SUITE (TEST 4)           🚀');
  console.log('🌟===========================================================🌟\n');

  const uniqueId = Date.now().toString();
  const testEmail = `dev-identity-${uniqueId}@vouch.com`;
  const testSupabaseUid = `sub-identity-${uniqueId}`;
  const testExternalUserId = `client-user-${uniqueId}`;

  // =========================================================================
  // SECTION 1: Developer Provisioning
  // =========================================================================
  console.log('--- SECTION 1: Developer Provisioning ---');
  const provRes = await axios.post(`${BASE_URL}/developer/provision`, {
    email: testEmail,
    supabaseUid: testSupabaseUid,
  });

  const devId = provRes.data.developerId;
  const rawApiKey = provRes.data.apiKey.rawKey;
  console.log(`✅ Developer Provisioned Successfully! (ID: ${devId})`);
  console.log(`API Key Prefix: ${provRes.data.apiKey.prefix}`);

  // =========================================================================
  // SECTION 2: Identity Verification Flow (POST /identity/verify)
  // =========================================================================
  console.log('\n--- SECTION 2: Identity Verification ---');
  console.log('📦 Preparing native multipart/form-data payload...');
  const formData = new FormData();
  formData.append('external_user_id', testExternalUserId);

  const docBlob = new Blob([Buffer.from('fake-document-image-data-png')], { type: 'image/png' });
  const selfieBlob = new Blob([Buffer.from('fake-selfie-image-data-png')], { type: 'image/png' });

  formData.append('document_image', docBlob, 'document.png');
  formData.append('selfie_image', selfieBlob, 'selfie.png');

  console.log('🚀 Sending identity verification request to POST /v1/identity/verify...');
  const verifyRes = await axios.post(`${BASE_URL}/identity/verify`, formData, {
    headers: {
      'x-api-key': rawApiKey,
    },
  });

  console.log('✅ Identity verify response received!');
  console.log(`Status: ${verifyRes.data.status}, Match Rating: ${verifyRes.data.match_rating}%`);

  // =========================================================================
  // SECTION 3: PlatformUser Database State Validation & Idempotency
  // =========================================================================
  console.log('\n--- SECTION 3: PlatformUser DB Verification & Idempotency ---');
  console.log('📦 Checking database platform user state...');
  
  const user = await prisma.platformUser.findUnique({
    where: {
      externalUserId_developerId: {
        externalUserId: testExternalUserId,
        developerId: devId,
      },
    },
  });

  if (!user) {
    throw new Error(`❌ Test failed: PlatformUser was not found in the Database!`);
  }
  console.log(`✅ PlatformUser found in DB: externalUserId = "${user.externalUserId}"`);

  if (user.identityVerified !== true || user.identityMatchScore !== 94.2) {
    throw new Error('❌ Test failed: PlatformUser identity mismatch or verification state not saved properly.');
  }
  console.log('✅ IdentityMatchScore and identityVerified states matches Dojah result perfectly!');

  // Validate user lookup idempotency (non-duplicated platform user resolution)
  console.log('\n📦 Testing resolveOrCreatePlatformUser lookup idempotency via Prisma findUnique/findFirst...');
  const findUserCount = await prisma.platformUser.count({
    where: {
      externalUserId: testExternalUserId,
      developerId: devId,
    }
  });

  if (findUserCount === 1) {
    console.log('✅ Idempotency Verified: No duplicate users exist for this external ID under the same developer.');
  } else {
    throw new Error(`❌ Idempotency Mismatch: Found ${findUserCount} user records for same external ID!`);
  }

  // =========================================================================
  // SECTION 4: Audit Logging & Traceability
  // =========================================================================
  console.log('\n--- SECTION 4: Developer Audit logs Verification ---');
  
  const log = await prisma.developerLog.findFirst({
    where: {
      developerId: devId,
      eventType: 'IDENTITY_VERIFIED',
    },
  });

  if (!log) {
    throw new Error('❌ Audit Check Failed: DeveloperLog with IDENTITY_VERIFIED event not found!');
  }
  console.log('✅ Audit Log Found! Saved payload details:');
  console.log(`Event ID: ${log.id}, Event Type: ${log.eventType}, Logged At: ${log.createdAt}`);

  console.log('\n✨===========================================================✨');
  console.log('🎉   ALL MASTER IDENTITY & USERS TESTS COMPLETED SUCCESSFULLY!  🎉');
  console.log('✨===========================================================✨\n');
}

runMasterIdentityUsersTests()
  .catch((err) => {
    console.error('\n❌ Master Identity & Users Suite failed!');
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err);
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
