import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { SquadWebhookController } from '../dist/squad/webhook/squad-webhook.controller.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

// Simple helper to sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('🚀 Bootstrapping NestJS Context for Squad Webhook Test...');
  const app = await NestFactory.createApplicationContext(AppModule);

  const controller = app.get(SquadWebhookController);
  const prisma = app.get(PrismaService);
  const eventEmitter = app.get(EventEmitter2);

  console.log('📦 Setting up test database records...');
  // Find or create a developer
  let dev = await prisma.developer.findFirst();
  if (!dev) {
    dev = await prisma.developer.create({
      data: {
        email: `webhook-dev-${Date.now()}@vouch.xyz`,
        supabaseUid: `sub-webhook-${Date.now()}`,
      }
    });
  }

  // Create a platform user
  const externalUserId = `ext-buyer-${Date.now()}`;
  const user = await prisma.platformUser.create({
    data: {
      externalUserId,
      developerId: dev.id,
      identityVerified: true,
    }
  });

  // Create an agreement
  const agreement = await prisma.agreement.create({
    data: {
      developerId: dev.id,
      buyerExternalId: externalUserId,
      sellerExternalId: `ext-seller-${Date.now()}`,
      totalAmount: 5000,
      status: 'PENDING',
    }
  });

  console.log(`Created test Agreement: ${agreement.id}`);

  // Setup event listener
  let receivedEvent = null;
  eventEmitter.on('payment.confirmed', (data) => {
    receivedEvent = data;
    console.log('🔔 EVENT RECEIVED: payment.confirmed emitted with payload:', data);
  });

  // Common webhook payload
  const transactionRef = `TX-SQUAD-TEST-${Date.now()}`;
  const webhookBody = {
    transaction_ref: transactionRef,
    payment_channel: 'card',
    card: { first_6digits: '506118' },
    customer: { name: 'Jane Doe' },
    transaction_amount: 5000,
    meta: { agreementId: agreement.id }
  };

  const secret = process.env.SQUAD_WEBHOOK_SECRET || 'your_squad_webhook_secret';

  // --- Test 1: Invalid Signature ---
  console.log('\n--- Test 1: Sending Webhook with Invalid Signature ---');
  const mockRes1 = {
    status: (code) => {
      console.log(`❌ Test 1 Unexpected: res.status called with ${code}`);
      return mockRes1;
    },
    send: (msg) => {
      console.log(`❌ Test 1 Unexpected: res.send called with ${msg}`);
      return mockRes1;
    }
  };

  const mockReq1 = {
    body: webhookBody,
    headers: {
      'x-squad-signature': 'wrong-signature-value-here-12345'
    }
  };

  try {
    await controller.handleWebhook(mockReq1, mockRes1);
    console.error('❌ Test 1 Failed: Handler accepted an invalid signature!');
  } catch (err) {
    if (err.status === 401 || err.message.includes('signature')) {
      console.log('✅ Test 1 Passed: Handler correctly threw 401 Unauthorized for invalid signature.');
    } else {
      console.error('❌ Test 1 Failed with unexpected error:', err);
    }
  }

  // --- Test 2: Valid Webhook ---
  console.log('\n--- Test 2: Sending Webhook with Valid Signature ---');
  let resStatus = null;
  let resSent = null;

  const validSignature = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(webhookBody))
    .digest('hex');

  const mockRes2 = {
    status: (code) => {
      resStatus = code;
      return mockRes2;
    },
    send: (msg) => {
      resSent = msg;
      return mockRes2;
    }
  };

  const mockReq2 = {
    body: webhookBody,
    headers: {
      'x-squad-signature': validSignature
    }
  };

  try {
    await controller.handleWebhook(mockReq2, mockRes2);
    console.log(`ℹ️ Response received immediately: Status ${resStatus}, Body: "${resSent}"`);
    
    if (resStatus === 200 && resSent === 'OK') {
      console.log('✅ Test 2 (Fast Response) Passed: Returned 200 OK immediately.');
    } else {
      console.error(`❌ Test 2 (Fast Response) Failed: Expected 200 OK, got Status ${resStatus}, Body: ${resSent}`);
    }

    console.log('\n⏳ Waiting 1 second for async processing (DB write & event emission)...');
    await sleep(1000);

    // Verify DB entry
    const savedSignal = await prisma.squadSignal.findFirst({
      where: { transactionRef: transactionRef }
    });

    if (savedSignal) {
      console.log('✅ Test 3 (DB Save) Passed: SquadSignal saved successfully in DB!');
      console.log(savedSignal);
    } else {
      console.error('❌ Test 3 (DB Save) Failed: SquadSignal record not found in database!');
    }

    // Verify Event Emission
    if (receivedEvent && receivedEvent.agreementId === agreement.id && receivedEvent.transactionRef === transactionRef) {
      console.log('✅ Test 4 (Event Emission) Passed: "payment.confirmed" event successfully captured!');
    } else {
      console.error('❌ Test 4 (Event Emission) Failed: Event not received or payload was incorrect!');
    }

  } catch (err) {
    console.error('❌ Test 2-4 Failed with unexpected error:', err);
  }

  // Clean up
  await app.close();
  console.log('\n✨ Squad Webhook E2E Tests Complete! ✨');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution crashed!');
  console.error(err);
  process.exit(1);
});
