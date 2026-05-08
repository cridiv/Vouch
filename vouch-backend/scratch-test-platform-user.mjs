import { NestFactory } from '@nestjs/core';
import { AppModule } from './dist/app.module.js';
import { DeveloperService } from './dist/developer/developer.service.js';
import { PrismaService } from './dist/prisma/prisma.service.js';

async function runTests() {
  console.log('🚀 Bootstrapping NestJS Application Context (from compiled build)...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const developerService = app.get(DeveloperService);
  const prismaService = app.get(PrismaService);

  console.log('📦 Resolving developer from database...');
  let dev = await prismaService.developer.findFirst();
  if (!dev) {
    dev = await prismaService.developer.create({
      data: {
        email: `platform-test-${Date.now()}@vouch.xyz`,
        supabaseUid: `sub-plat-uid-${Date.now()}`,
      },
    });
  }
  console.log(`Using developer: ${dev.email} (${dev.id})`);

  const uniqueId = Date.now();
  const testExternalUserId = `external-user-${uniqueId}`;

  console.log(`\nStep 1: Calling resolveOrCreatePlatformUser with new externalUserId: "${testExternalUserId}"...`);
  const user1 = await developerService.resolveOrCreatePlatformUser(testExternalUserId, dev.id);

  console.log('✅ User created successfully:', JSON.stringify(user1, null, 2));
  if (user1.externalUserId !== testExternalUserId || user1.developerId !== dev.id) {
    throw new Error('❌ Test failed: PlatformUser fields mismatched.');
  }

  console.log('\nStep 2: Calling again with the EXACT SAME externalUserId...');
  const user2 = await developerService.resolveOrCreatePlatformUser(testExternalUserId, dev.id);

  console.log('✅ Same user returned successfully:', JSON.stringify(user2, null, 2));
  if (user2.id !== user1.id) {
    throw new Error('❌ Test failed: Mismatched IDs. A duplicate record was created!');
  }
  
  console.log('\n🎉 Success: Idempotency verified. No duplicates created!');

  await app.close();
  console.log('\n✨ PlatformUser tests passed successfully! ✨');
}

runTests().catch((err) => {
  console.error('\n❌ PlatformUser tests failed!');
  console.error(err);
  process.exit(1);
});
