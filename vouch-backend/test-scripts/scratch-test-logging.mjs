import { NestFactory } from '@nestjs/core';
import { AppModule } from './dist/app.module.js';
import { DeveloperLogService } from './dist/common/services/developer-log.service.js';
import { PrismaService } from './dist/prisma/prisma.service.js';

async function runTests() {
  console.log('🚀 Bootstrapping NestJS context for logging test...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const loggerService = app.get(DeveloperLogService);
  const prismaService = app.get(PrismaService);

  console.log('📦 Finding a developer to associate log with...');
  const dev = await prismaService.developer.findFirst();
  if (!dev) {
    throw new Error('❌ Test failed: No developer found in database to run log tests.');
  }

  const uniqueId = Date.now().toString();
  const testPayload = { testRunId: uniqueId, timestamp: new Date().toISOString() };

  console.log(`\nStep 1: Calling developerLogService.log() with testRunId: "${uniqueId}" (asynchronous, fire-and-forget)...`);
  loggerService.log({
    developerId: dev.id,
    eventType: 'IDENTITY_VERIFIED', // LogEvent enum
    payload: testPayload,
  });

  console.log('⏳ Waiting 500ms to allow asynchronous database write to complete...');
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log('\nStep 2: Querying the database to confirm the DeveloperLog was written...');
  const logs = await prismaService.developerLog.findMany({
    where: {
      developerId: dev.id,
      eventType: 'IDENTITY_VERIFIED',
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  });

  if (logs.length === 0) {
    throw new Error('❌ Test failed: No log record found in database.');
  }

  const writtenLog = logs[0];
  console.log('✅ Found record in DB:', JSON.stringify(writtenLog, null, 2));

  // Asserting payload equality
  if (writtenLog.payload.testRunId !== uniqueId) {
    throw new Error('❌ Test failed: Payload testRunId mismatch.');
  }

  console.log('\n🎉 Success: Logging test passed perfectly! Asynchronous fire-and-forget verified.');

  await app.close();
}

runTests().catch((err) => {
  console.error('\n❌ Logging test execution failed!');
  console.error(err);
  process.exit(1);
});
