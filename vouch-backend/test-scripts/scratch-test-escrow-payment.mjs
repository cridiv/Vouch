import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { SquadService } from '../dist/squad/squad.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('🚀 Bootstrapping NestJS Context for Escrow Payment Confirmed Test...');
  const app = await NestFactory.createApplicationContext(AppModule);

  const prisma = app.get(PrismaService);
  const squadService = app.get(SquadService);
  const eventEmitter = app.get(EventEmitter2);

  // Backup original verifyTransaction method
  const originalVerifyTransaction = squadService.verifyTransaction;

  console.log('\n📦 Setting up initial test database records...');
  // Ensure a developer exists
  let dev = await prisma.developer.findFirst();
  if (!dev) {
    dev = await prisma.developer.create({
      data: {
        email: `payment-dev-${Date.now()}@vouch.xyz`,
        supabaseUid: `sub-payment-${Date.now()}`,
      },
    });
  }

  // Create an unverified/verified PlatformUser
  const buyerId = `buyer-pay-${Date.now()}`;
  const user = await prisma.platformUser.create({
    data: {
      externalUserId: buyerId,
      developerId: dev.id,
      identityVerified: true,
    },
  });

  // Create a PENDING agreement for Test 1
  const agreement = await prisma.agreement.create({
    data: {
      developerId: dev.id,
      buyerExternalId: buyerId,
      sellerExternalId: `seller-pay-${Date.now()}`,
      totalAmount: 150000,
      status: 'PENDING',
    },
  });
  console.log(`✅ Test Agreement 1 created: ${agreement.id} (status: ${agreement.status})`);

  // =========================================================================
  // Test 1: Valid payment.confirmed event → transitions to FUNDED
  // =========================================================================
  console.log('\n🧪 Test 1: Emitting valid payment.confirmed event...');
  const transactionRef1 = `TX-PAY-VALID-${Date.now()}`;

  // Mock Squad verification to succeed
  squadService.verifyTransaction = async (ref) => {
    console.log(`[Mock SquadService] verifyTransaction called for: ${ref}`);
    return {
      success: true,
      amount: 150000,
      status: 'success',
    };
  };

  // Emit event
  eventEmitter.emit('payment.confirmed', {
    agreementId: agreement.id,
    transactionRef: transactionRef1,
  });

  console.log('⏳ Waiting 500ms for event handling and async logging to complete...');
  await sleep(500);

  // Verify status updated in DB
  const updatedAgreement1 = await prisma.agreement.findUnique({
    where: { id: agreement.id },
  });

  if (updatedAgreement1.status === 'FUNDED') {
    console.log('✅ Test 1 Passed: Agreement successfully transitioned to FUNDED!');
  } else {
    console.error(`❌ Test 1 Failed: Agreement status is still ${updatedAgreement1.status}`);
  }

  // =========================================================================
  // Test 4: Verify DeveloperLog record written with ESCROW_FUNDED
  // =========================================================================
  console.log('\n🧪 Test 4: Verifying DeveloperLog contains ESCROW_FUNDED event...');
  const log = await prisma.developerLog.findFirst({
    where: {
      agreementId: agreement.id,
      eventType: 'ESCROW_FUNDED',
    },
  });

  if (log) {
    console.log('✅ Test 4 Passed: DeveloperLog audit record found!');
    console.log(JSON.stringify(log, null, 2));
  } else {
    console.error('❌ Test 4 Failed: No ESCROW_FUNDED developer log was written!');
  }

  // =========================================================================
  // Test 2: Duplicate payment.confirmed event → should be ignored safely
  // =========================================================================
  console.log('\n🧪 Test 2: Emitting duplicate payment.confirmed event...');
  // Emit same event again
  eventEmitter.emit('payment.confirmed', {
    agreementId: agreement.id,
    transactionRef: transactionRef1,
  });

  console.log('⏳ Waiting 500ms...');
  await sleep(500);

  const updatedAgreement2 = await prisma.agreement.findUnique({
    where: { id: agreement.id },
  });

  if (updatedAgreement2.status === 'FUNDED') {
    console.log('✅ Test 2 Passed: Duplicate event handled safely, status remains FUNDED.');
  } else {
    console.error(`❌ Test 2 Failed: Status unexpectedly changed to ${updatedAgreement2.status}`);
  }

  // =========================================================================
  // Test 3: Non-existent agreementId → logs warning, no crash
  // =========================================================================
  console.log('\n🧪 Test 3: Emitting event with non-existent agreementId...');
  const fakeAgreementId = 'non-existent-agreement-id-123';
  
  try {
    eventEmitter.emit('payment.confirmed', {
      agreementId: fakeAgreementId,
      transactionRef: `TX-PAY-FAKE-${Date.now()}`,
    });
    console.log('⏳ Waiting 500ms...');
    await sleep(500);
    console.log('✅ Test 3 Passed: Non-existent agreement ID handled safely without crashing!');
  } catch (err) {
    console.error('❌ Test 3 Failed: Process crashed!', err);
  }

  // =========================================================================
  // Test 5: Squad verification fails or throws → logs warning, remains PENDING, no crash
  // =========================================================================
  console.log('\n🧪 Test 5: Simulating Squad verification failure/throw...');
  
  // Create another PENDING agreement
  const agreement2 = await prisma.agreement.create({
    data: {
      developerId: dev.id,
      buyerExternalId: buyerId,
      sellerExternalId: `seller-pay-${Date.now()}`,
      totalAmount: 50000,
      status: 'PENDING',
    },
  });
  console.log(`Test Agreement 2 created: ${agreement2.id} (status: ${agreement2.status})`);

  // Case A: Verification returns success = false
  console.log('\n🧪 Test 5.1: Squad returns success = false...');
  squadService.verifyTransaction = async (ref) => {
    console.log(`[Mock SquadService] verifyTransaction returning success=false for: ${ref}`);
    return {
      success: false,
      amount: 0,
      status: 'failed',
    };
  };

  eventEmitter.emit('payment.confirmed', {
    agreementId: agreement2.id,
    transactionRef: `TX-PAY-FAIL-${Date.now()}`,
  });

  console.log('⏳ Waiting 500ms...');
  await sleep(500);

  const checkAgreement2A = await prisma.agreement.findUnique({
    where: { id: agreement2.id },
  });

  if (checkAgreement2A.status === 'PENDING') {
    console.log('✅ Test 5.1 Passed: Agreement correctly remained PENDING on failed verification.');
  } else {
    console.error(`❌ Test 5.1 Failed: Agreement transitioned to ${checkAgreement2A.status} despite failed verification!`);
  }

  // Case B: Verification throws an error (API Timeout or down)
  console.log('\n🧪 Test 5.2: Squad API throws an error (Simulated network exception)...');
  squadService.verifyTransaction = async (ref) => {
    console.log(`[Mock SquadService] verifyTransaction throwing simulated error for: ${ref}`);
    throw new Error('Squad API is temporarily unavailable (Simulated Exception)');
  };

  eventEmitter.emit('payment.confirmed', {
    agreementId: agreement2.id,
    transactionRef: `TX-PAY-ERROR-${Date.now()}`,
  });

  console.log('⏳ Waiting 500ms...');
  await sleep(500);

  const checkAgreement2B = await prisma.agreement.findUnique({
    where: { id: agreement2.id },
  });

  if (checkAgreement2B.status === 'PENDING') {
    console.log('✅ Test 5.2 Passed: Agreement remained PENDING and error handled gracefully without crashing!');
  } else {
    console.error(`❌ Test 5.2 Failed: Agreement transitioned to ${checkAgreement2B.status} despite Squad exception!`);
  }

  // Restore original method
  squadService.verifyTransaction = originalVerifyTransaction;

  await app.close();
  console.log('\n✨ All Escrow Payment Webhook Listener Integration Tests Complete! ✨');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution crashed!');
  console.error(err);
  process.exit(1);
});
