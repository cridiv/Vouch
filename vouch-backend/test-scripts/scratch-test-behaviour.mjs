import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { BehaviourService } from '../dist/fraud/context/behaviour.service.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';

async function runTests() {
  console.log('🚀 Bootstrapping NestJS Application Context (from compiled build)...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const behaviourService = app.get(BehaviourService);
  const prismaService = app.get(PrismaService);

  console.log('📦 Resolving developer from database...');
  let dev = await prismaService.developer.findFirst();
  if (!dev) {
    dev = await prismaService.developer.create({
      data: {
        email: `behaviour-test-${Date.now()}@vouch.xyz`,
        supabaseUid: `sub-beh-uid-${Date.now()}`,
      },
    });
  }

  const uniqueId = Date.now();
  const testExternalUserId = `external-user-${uniqueId}`;

  // 1. Create a Platform User directly using Prisma with Onboarding Location (Lagos)
  console.log(`\nStep 1: Creating a fresh PlatformUser with onboarding in Lagos...`);
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

  // 2. Test New User Scenario
  console.log(`\nStep 2: Test 1 - New user transacting from Lagos...`);
  const result1 = await behaviourService.analyze(
    user.id,
    { country: 'NG', city: 'Lagos', lat: 6.5244, lng: 3.3792 },
    1000
  );
  console.log('✅ Result 1:', result1);
  if (result1.account_age_days !== 0 || result1.previous_transactions !== 0 || result1.impossible_travel !== false) {
    console.warn('❌ Expected new user metrics to be zero and impossible travel false.');
  }

  // 3. Create a past transaction in London (so we can test impossible travel)
  console.log(`\nStep 3: Creating a FraudAssessment (transaction) 1 hour ago...`);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  await prismaService.fraudAssessment.create({
    data: {
      platformUserId: user.id,
      score: 50,
      flag: 'AMBER',
      category: 'GENERAL',
      triggeredSignals: {},
      contextSnapshot: {},
      createdAt: oneHourAgo
    }
  });

  // 4. Test Impossible Travel Scenario
  console.log(`\nStep 4: Test 2 - Same user transacting from London 1 hour later...`);
  const result2 = await behaviourService.analyze(
    user.id,
    { country: 'UK', city: 'London', lat: 51.5, lng: -0.1 },
    1000
  );
  console.log('✅ Result 2:', result2);
  
  if (result2.impossible_travel !== true) {
    throw new Error('❌ Test failed: Expected impossible_travel to be true!');
  } else {
    console.log('🎉 Confirmed: Impossible travel detected correctly (Lagos -> London in 1hr)!');
  }

  await app.close();
  console.log('\n✨ BehaviourService tests passed successfully! ✨');
}

runTests().catch((err) => {
  console.error('\n❌ BehaviourService tests failed!');
  console.error(err);
  process.exit(1);
});
