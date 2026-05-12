import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { ContextBuilderService } from '../dist/fraud/context/context-builder.service.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';

async function runTests() {
  console.log('🚀 Bootstrapping NestJS Context for Builder...');
  process.env.NODE_ENV = 'development'; // Ensure simulation overrides work
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const contextBuilder = app.get(ContextBuilderService);
  const prismaService = app.get(PrismaService);

  console.log('📦 Setting up test data...');
  let dev = await prismaService.developer.findFirst();
  if (!dev) {
    dev = await prismaService.developer.create({
      data: {
        email: `context-test-${Date.now()}@vouch.xyz`,
        supabaseUid: `sub-ctx-uid-${Date.now()}`,
      },
    });
  }

  const uniqueId = Date.now();
  const testExternalUserId = `external-ctx-${uniqueId}`;

  const user = await prismaService.platformUser.create({
    data: {
      externalUserId: testExternalUserId,
      developerId: dev.id,
      onboardingLocation: {
        country: 'NG',
        city: 'Lagos',
        lat: 6.5244,
        lng: 3.3792,
      },
      deviceFingerprintAtOnboarding: 'test-fingerprint',
      createdAt: new Date(),
    }
  });

  const baseParams = {
    transactionId: `tx-${uniqueId}`,
    platformUserId: user.id,
    ipAddress: '8.8.8.8',
    deviceFingerprint: 'test-fingerprint',
    transactionAmount: 1500,
  };

  console.log(`\n--- Test 1: Standard Context ---`);
  const ctx1 = await contextBuilder.build({ ...baseParams });
  console.log(ctx1);
  
  // Verify standard test
  if (ctx1.is_vpn === undefined || ctx1.impossible_travel === undefined) {
    throw new Error('❌ Test 1 failed: missing fields.');
  }

  console.log(`\n--- Test 2: Simulate VPN ---`);
  const ctx2 = await contextBuilder.build({ ...baseParams, simulateVpn: true });
  console.log('is_vpn:', ctx2.is_vpn, '| ip_reputation_score:', ctx2.ip_reputation_score);
  if (!ctx2.is_vpn || ctx2.ip_reputation_score !== 12) {
    throw new Error('❌ Test 2 failed: simulateVpn did not work.');
  }

  console.log(`\n--- Test 3: Simulate Impossible Travel ---`);
  const ctx3 = await contextBuilder.build({ ...baseParams, simulateImpossibleTravel: true });
  console.log('impossible_travel:', ctx3.impossible_travel, '| location_distance_km:', ctx3.location_distance_km);
  if (!ctx3.impossible_travel || ctx3.location_distance_km !== 9200) {
    throw new Error('❌ Test 3 failed: simulateImpossibleTravel did not work.');
  }

  console.log(`\n--- Test 4: Simulate Both ---`);
  const ctx4 = await contextBuilder.build({ ...baseParams, simulateVpn: true, simulateImpossibleTravel: true });
  if (!ctx4.is_vpn || !ctx4.impossible_travel) {
    throw new Error('❌ Test 4 failed: Both simulations did not apply.');
  }
  console.log('✅ Both simulations applied successfully.');

  await app.close();
  console.log('\n✨ All ContextBuilder tests passed successfully! ✨');
}

runTests().catch((err) => {
  console.error('\n❌ ContextBuilder tests failed!');
  console.error(err);
  process.exit(1);
});
