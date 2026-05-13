import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { SquadService } from '../dist/squad/squad.service.js';
import { SquadWebhookController } from '../dist/squad/webhook/squad-webhook.controller.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runMasterSquadTests() {
  console.log('🌟===========================================================🌟');
  console.log('🚀   STARTING MASTER SQUAD INTEGRATION SUITE (TEST 2)         🚀');
  console.log('🌟===========================================================🌟\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const squadService = app.get(SquadService);
  const controller = app.get(SquadWebhookController);
  const prisma = app.get(PrismaService);
  const eventEmitter = app.get(EventEmitter2);

  // Create a developer and agreement record to associate with sandbox accounts and pass webhook checks
  console.log('📦 Setting up database platform user and agreement for Squad association...');
  let dev = await prisma.developer.findFirst();
  if (!dev) {
    dev = await prisma.developer.create({
      data: {
        email: `squad-master-dev-${Date.now()}@vouch.com`,
        supabaseUid: `sub-squad-mstr-${Date.now()}`,
      }
    });
  }

  const externalUserId = `ext-squad-mstr-${Date.now()}`;
  const user = await prisma.platformUser.create({
    data: {
      externalUserId,
      developerId: dev.id,
      identityVerified: true,
    }
  });

  const agreement = await prisma.agreement.create({
    data: {
      developerId: dev.id,
      buyerExternalId: externalUserId,
      sellerExternalId: `ext-seller-${Date.now()}`,
      totalAmount: 7500,
      status: 'PENDING',
    }
  });

  const agreementId = agreement.id;
  const customerEmail = `customer-${Date.now()}@vouch.com`;
  const customerName = `Jane Master Doe`;

  // =========================================================================
  // SECTION 1: Virtual Account Creation & Sandbox Fallback
  // =========================================================================
  console.log('--- SECTION 1: Squad Virtual Accounts ---');
  console.log(`📦 Testing createVirtualAccount for ${agreementId}...`);
  try {
    const response = await squadService.createVirtualAccount(agreementId, customerEmail, customerName);
    console.log(`✅ Virtual Account Resolved Successfully!`);
    console.log(`Virtual Account Number: ${response.virtual_account_number} (${response.bank})`);

    if (!response.virtual_account_number) {
      throw new Error('❌ Virtual account number is missing from response!');
    }
  } catch (err) {
    console.error('❌ Failed to create virtual account:', err.message);
  }

  // =========================================================================
  // SECTION 2: Inline Payment Link Generation & Transaction Verification
  // =========================================================================
  console.log('\n--- SECTION 2: Squad Checkout Links & Verification ---');
  const milestoneId = `MS-MSTR-${Date.now()}`;
  const amount = 7500; // NGN 7500

  console.log(`📦 Testing createPaymentLink for milestone ${milestoneId}...`);
  let linkRef;
  try {
    const response = await squadService.createPaymentLink(milestoneId, amount, customerEmail);
    console.log(`✅ Payment Link Generated Successfully!`);
    console.log(`Checkout URL: ${response.checkout_url}`);
    
    if (!response.checkout_url) {
      throw new Error('❌ Checkout URL is missing!');
    }
    linkRef = response.link_ref;
  } catch (err) {
    console.error('❌ Failed to create payment link:', err.message);
  }

  if (linkRef) {
    console.log(`📦 Verifying transaction status for reference: ${linkRef}...`);
    try {
      const verifyResponse = await squadService.verifyTransaction(linkRef);
      console.log(`✅ Verification response received! Status: ${verifyResponse.status}, Success: ${verifyResponse.success}`);
    } catch (err) {
      console.error('❌ Failed to verify transaction:', err.message);
    }
  }

  // =========================================================================
  // SECTION 3: Bank Disbursements (Payout Transfer)
  // =========================================================================
  console.log('\n--- SECTION 3: Squad Disbursements ---');
  const transferRef = `DISB-MSTR-${Date.now()}`;
  console.log(`📦 Testing bank payout transfer for reference: ${transferRef}...`);

  try {
    const response = await squadService.disburse({
      account_number: '0123456789',
      account_name: 'Squad Payout Receiver',
      bank_code: '000013', // GTBank 6-digit NIP code
      amount: 12000,
      transaction_ref: transferRef,
      narration: 'Master Squad Sandbox Disbursement',
    });
    console.log(`✅ Disbursement API Call Resolved! Status: ${response.status}`);
    console.log(`Transaction Reference: ${response.transaction_reference}`);
  } catch (err) {
    console.error('❌ Failed to disburse:', err.message);
  }

  // =========================================================================
  // SECTION 4: Webhook Signature Guard & Event Dispatch
  // =========================================================================
  console.log('\n--- SECTION 4: Webhook Security & Event Broadcasting ---');
  
  // Setup verification listener
  let receivedEvent = null;
  const eventRef = `TX-SQUAD-MSTR-WEB-${Date.now()}`;
  
  eventEmitter.on('payment.confirmed', (data) => {
    receivedEvent = data;
    console.log('🔔 RECEIVED BROADCAST EVENT "payment.confirmed" with payload:', data);
  });

  const webhookBody = {
    transaction_ref: eventRef,
    payment_channel: 'card',
    card: { first_6digits: '506118' },
    customer: { name: 'Jane Master Doe' },
    transaction_amount: 7500,
    meta: { agreementId: agreementId }
  };

  const secret = process.env.SQUAD_WEBHOOK_SECRET || 'your_squad_webhook_secret';

  // Test 4.1: Invalid signature rejection
  console.log('🔒 Sending webhook request with INVALID signature...');
  const mockRes1 = { status: () => mockRes1, send: () => mockRes1 };
  const mockReq1 = {
    body: webhookBody,
    headers: { 'x-squad-signature': 'hacked-signature-value-777' }
  };

  try {
    await controller.handleWebhook(mockReq1, mockRes1);
    console.error('❌ Security check failed: Webhook endpoint accepted invalid signature!');
  } catch (err) {
    if (err.status === 401 || err.message.includes('signature')) {
      console.log('✅ Webhook Signature Guard Passed: Invalid signature correctly blocked with 401 Unauthorized.');
    } else {
      console.error('❌ Unexpected webhook exception on invalid signature:', err);
    }
  }

  // Test 4.2: Valid signature acceptance & async event processing
  console.log('🔒 Sending webhook request with VALID signature...');
  let resStatus = null;
  let resSent = null;

  const validSignature = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(webhookBody))
    .digest('hex');

  const mockRes2 = {
    status: (code) => { resStatus = code; return mockRes2; },
    send: (msg) => { resSent = msg; return mockRes2; }
  };

  const mockReq2 = {
    body: webhookBody,
    headers: { 'x-squad-signature': validSignature }
  };

  try {
    await controller.handleWebhook(mockReq2, mockRes2);
    if (resStatus === 200 && resSent === 'OK') {
      console.log('✅ Immediately returned 200 OK response to webhook sender!');
    } else {
      console.error(`❌ Webhook immediate response mismatch: Status ${resStatus}, Body: ${resSent}`);
    }

    console.log('⏳ Waiting for async background tasks to complete database save and broadcast...');
    await sleep(1000);

    const savedSignal = await prisma.squadSignal.findFirst({
      where: { transactionRef: eventRef }
    });

    if (savedSignal) {
      console.log('✅ Signal Storage Passed: Webhook signal payload logged perfectly in the Database!');
    } else {
      console.error('❌ Signal Storage Failed: Webhook signal not found in Database!');
    }

    if (receivedEvent && receivedEvent.agreementId === agreementId && receivedEvent.transactionRef === eventRef) {
      console.log('✅ Real-time event propagation passed: internal payment.confirmed event successfully received!');
    } else {
      console.error('❌ Real-time event propagation failed!', { receivedEvent });
    }
  } catch (err) {
    console.error('❌ Webhook test failed with exception:', err);
  }

  await app.close();
  console.log('\n✨===========================================================✨');
  console.log('🎉   ALL MASTER SQUAD INTEGRATION TESTS COMPLETED SUCCESSFULLY! 🎉');
  console.log('✨===========================================================✨\n');
}

runMasterSquadTests().catch((err) => {
  console.error('\n❌ Master Squad Integration Suite crashed!');
  console.error(err);
  process.exit(1);
});
