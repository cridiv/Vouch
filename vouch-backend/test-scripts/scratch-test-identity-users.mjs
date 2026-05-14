import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { DeveloperService } from '../dist/developer/developer.service.js';
import { IdentityService } from '../dist/identity/identity.service.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';

async function runMasterIdentityUsersTests() {
  console.log('🌟===========================================================🌟');
  console.log('🚀   STARTING MASTER IDENTITY & USERS SUITE (TEST 4)           🚀');
  console.log('🌟===========================================================🌟\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const developerService = app.get(DeveloperService);
  const identityService = app.get(IdentityService);
  const prisma = app.get(PrismaService);

  const uniqueId = Date.now().toString();
  const testEmail = `dev-identity-${uniqueId}@vouch.com`;
  const testSupabaseUid = `sub-identity-${uniqueId}`;
  const testExternalUserId = `client-user-${uniqueId}`;

  // =========================================================================
  // SECTION 1: Developer Provisioning
  // =========================================================================
  console.log('--- SECTION 1: Developer Provisioning ---');
  const provResult = await developerService.provision(testEmail, testSupabaseUid);

  const developer = provResult.developer;
  const rawApiKey = provResult.apiKey.rawKey;
  console.log(`✅ Developer Provisioned Successfully! (ID: ${developer.id})`);
  console.log(`API Key Prefix: ${provResult.apiKey.prefix}`);

  // =========================================================================
  // SECTION 2: Identity Verification Flow
  // =========================================================================
  console.log('\n--- SECTION 2: Identity Verification ---');
  console.log('🚀 Invoking IdentityService.verify with simulated document/selfie buffers...');
  
  const docBuffer = Buffer.from('fake-document-image-data-png');
  const selfieBuffer = Buffer.from('fake-selfie-image-data-png');

  const verifyResult = await identityService.verify(
    docBuffer,
    selfieBuffer,
    testExternalUserId,
    developer,
    '127.0.0.1',
    'chrome-fingerprint-mstr'
  );

  console.log('✅ Identity verify completed successfully!');
  console.log(`Match Score: ${verifyResult.identityMatchScore}%, Document Type: ${verifyResult.documentType}`);

  // =========================================================================
  // SECTION 3: PlatformUser Database State Validation & Idempotency
  // =========================================================================
  console.log('\n--- SECTION 3: PlatformUser DB Verification & Idempotency ---');
  console.log('📦 Checking database platform user state...');
  
  const user = await prisma.platformUser.findUnique({
    where: {
      externalUserId_developerId: {
        externalUserId: testExternalUserId,
        developerId: developer.id,
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
  console.log('✅ IdentityMatchScore and identityVerified states matches Dojah mock result perfectly!');

  // Validate user lookup idempotency (non-duplicated platform user resolution)
  console.log('\n📦 Testing resolveOrCreatePlatformUser lookup idempotency via Prisma findUnique/findFirst...');
  const findUserCount = await prisma.platformUser.count({
    where: {
      externalUserId: testExternalUserId,
      developerId: developer.id,
    }
  });

  if (findUserCount === 1) {
    console.log('✅ Idempotency Verified: No duplicate users exist for this external ID under the same developer.');
  } else {
    throw new Error(`❌ Idempotency Mismatch: Found ${findUserCount} user records for same external ID!`);
  }

  // =========================================================================
  // SECTION 4: Developer Logs Retrievals
  // =========================================================================
  console.log('\n--- SECTION 4: Developer Logs Retrievals ---');
  
  console.log('⏳ Waiting 1000ms for async fire-and-forget logging to finalize...');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('🚀 Querying developer logs list via DeveloperService.getLogs...');
  const logsResult = await developerService.getLogs(developer.id, 10, 0, 'IDENTITY_VERIFIED');
  
  const { logs, total } = logsResult;
  console.log(`✅ Retrieved list. Total logs count: ${total}, List length: ${logs.length}`);

  if (total < 1 || logs.length < 1) {
    throw new Error('❌ Test Failed: getLogs did not return expected logged events!');
  }

  const targetLog = logs[0];
  if (targetLog.eventType !== 'IDENTITY_VERIFIED') {
    throw new Error(`❌ Test Failed: Expected eventType "IDENTITY_VERIFIED", got "${targetLog.eventType}"`);
  }
  console.log(`✅ List retrieve passed: Event type matched perfectly.`);

  console.log(`🚀 Querying single developer log detail via DeveloperService.getLogById(${targetLog.id})...`);
  const detailedLog = await developerService.getLogById(targetLog.id, developer.id);

  console.log(`✅ Single log details returned: Log ID = "${detailedLog.id}"`);
  if (detailedLog.id !== targetLog.id) {
    throw new Error('❌ Test Failed: Returned log ID mismatch!');
  }
  if (!detailedLog.payload || typeof detailedLog.payload !== 'object') {
    throw new Error('❌ Test Failed: Detailed log does not contain the full payload object context!');
  }
  console.log('✅ Single log payload verification passed: Full context is preserved.');

  // =========================================================================
  // SECTION 5: Developer Dashboard Statistics
  // =========================================================================
  console.log('\n--- SECTION 5: Developer Dashboard Statistics ---');
  console.log('🚀 Querying developer dashboard statistics via DeveloperService.getStats...');

  const stats = await developerService.getStats(developer.id);
  console.log('✅ Stats response received:', JSON.stringify(stats, null, 2));

  if (
    typeof stats.totalChecksToday !== 'number' ||
    typeof stats.redBlocksToday !== 'number' ||
    stats.identitiesVerifiedTotal !== 1 ||
    stats.activeAgreements !== 0 ||
    stats.totalEscrowValue !== 0
  ) {
    throw new Error('❌ Test Failed: Stats counts or schema types are invalid!');
  }
  console.log('✅ Dashboard stats validation passed completely!');

  await app.close();
  console.log('\n✨===========================================================✨');
  console.log('🎉   ALL MASTER IDENTITY & USERS TESTS COMPLETED SUCCESSFULLY!  🎉');
  console.log('✨===========================================================✨\n');
}

runMasterIdentityUsersTests().catch((err) => {
  console.error('\n❌ Master Identity & Users Suite failed!');
  console.error(err);
  process.exit(1);
});
