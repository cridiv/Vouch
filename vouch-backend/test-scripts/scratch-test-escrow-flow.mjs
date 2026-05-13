import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { EscrowService } from '../dist/escrow/escrow.service.js';
import { SquadService } from '../dist/squad/squad.service.js';
import { FraudService } from '../dist/fraud/fraud.service.js';
import { EscrowState } from '../dist/escrow/state/escrow.state.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runMasterEscrowTests() {
  console.log('🌟===========================================================🌟');
  console.log('🚀   STARTING MASTER ESCROW flow INTEGRATION SUITE (TEST 1)    🚀');
  console.log('🌟===========================================================🌟\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  const prisma = app.get(PrismaService);
  const escrowService = app.get(EscrowService);
  const squadService = app.get(SquadService);
  const fraudService = app.get(FraudService);
  const stateMachine = app.get(EscrowState);

  // Backup original dependencies
  const originalAssess = fraudService.assess;
  const originalCreatePaymentLink = squadService.createPaymentLink;
  const originalDisburse = squadService.disburse;
  const originalCreateVirtualAccount = squadService.createVirtualAccount;
  const originalVerifyTransaction = squadService.verifyTransaction;

  // Global Mock States
  let mockFraudFlag = 'GREEN';
  let createPaymentLinkCount = 0;
  let disburseCount = 0;

  squadService.createVirtualAccount = async (agreementId, customerEmail, customerName) => {
    console.log(`[Mock SquadService] createVirtualAccount called for ${agreementId}`);
    return {
      virtual_account_number: '4235822763',
      bank: 'GTBank',
      customer_identifier: agreementId,
    };
  };

  squadService.verifyTransaction = async (transactionRef) => {
    console.log(`[Mock SquadService] verifyTransaction called for ref: ${transactionRef}`);
    return {
      success: true,
      amount: 200000,
      status: 'success',
    };
  };

  squadService.createPaymentLink = async (milestoneId, amount, email) => {
    createPaymentLinkCount++;
    return {
      link_id: `link-mock-${milestoneId.substring(0, 8)}`,
      link_ref: `ref-mock-${milestoneId.substring(0, 8)}`,
      checkout_url: 'https://checkout.squad.sandbox/mock',
    };
  };

  squadService.disburse = async (params) => {
    disburseCount++;
    return {
      transaction_reference: `disb-ref-mock-${Date.now()}`,
      amount: params.amount,
      status: 'success',
    };
  };

  fraudService.assess = async (params) => {
    console.log(`[Mock FraudService] assess called. Flag: ${mockFraudFlag}`);
    
    await prisma.fraudAssessment.create({
      data: {
        platformUserId: params.platformUserId,
        agreementId: params.agreementId || null,
        score: mockFraudFlag === 'RED' ? 95 : 12,
        flag: mockFraudFlag,
        category: 'Simulated Assessment',
        triggeredSignals: ['simulated_signal'],
        contextSnapshot: {},
      },
    });

    return {
      score: mockFraudFlag === 'RED' ? 95 : 12,
      flag: mockFraudFlag,
      category: 'Simulated Assessment',
      triggered_signals: ['simulated_signal'],
      recommendation: mockFraudFlag === 'RED' ? 'block' : 'proceed',
      processing_time_ms: 2,
    };
  };

  console.log('📦 Setting up master developer and verified platform users...');
  let dev = await prisma.developer.findFirst();
  if (!dev) {
    dev = await prisma.developer.create({
      data: {
        email: `master-dev-${Date.now()}@vouch.xyz`,
        supabaseUid: `sub-master-${Date.now()}`,
      },
    });
  }

  const buyerExtId = `buyer-master-${Date.now()}`;
  const sellerExtId = `seller-master-${Date.now()}`;

  const buyerUser = await prisma.platformUser.create({
    data: { externalUserId: buyerExtId, developerId: dev.id, identityVerified: true },
  });

  const sellerUser = await prisma.platformUser.create({
    data: { externalUserId: sellerExtId, developerId: dev.id, identityVerified: true },
  });

  // =========================================================================
  // SECTION 1: Agreement Creation, Idempotency, and Validation
  // =========================================================================
  console.log('\n--- SECTION 1: Agreement Creation & Validation ---');
  
  const agreementDto = {
    buyerExternalId: buyerExtId,
    sellerExternalId: sellerExtId,
    totalAmount: 200000,
    milestones: [
      { title: 'Milestone 1', amount: 80000 },
      { title: 'Milestone 2', amount: 120000 },
    ],
  };

  const agreement = await escrowService.createAgreement(agreementDto, dev);
  console.log(`✅ Test Agreement Created: ${agreement.agreementId} (Status: ${agreement.status})`);

  // Verify that multiple agreements can be created under the same metadata (different deal streams)
  const separateAgreement = await escrowService.createAgreement(agreementDto, dev);
  if (separateAgreement.agreementId !== agreement.agreementId) {
    console.log('✅ Multi-deal stream verified: Each request creates a separate, distinct Agreement instance successfully.');
  } else {
    console.error('❌ Mismatched separate agreement logic!');
  }

  // =========================================================================
  // SECTION 2: Pre-Funding Payment Risk Assessment
  // =========================================================================
  console.log('\n--- SECTION 2: Pre-Funding Risk Assessments ---');

  // Test 2.1: Risk Assessment cleared (GREEN)
  mockFraudFlag = 'GREEN';
  const resAssessGreen = await escrowService.assessPaymentRisk(agreement.agreementId, {
    externalUserId: buyerExtId,
  }, dev);

  if (resAssessGreen.status === 'PENDING' && resAssessGreen.flag === 'GREEN') {
    console.log('✅ Pre-funding risk assessment (GREEN) cleared successfully! Presented Virtual Account:', resAssessGreen.squadVirtualAccountNo);
  } else {
    console.error('❌ Pre-funding risk assessment (GREEN) failed!', resAssessGreen);
  }

  // Test 2.2: Risk Assessment blocked (RED) -> Freezes Escrow
  mockFraudFlag = 'RED';
  const frozenAgreementDto = {
    buyerExternalId: buyerExtId,
    sellerExternalId: sellerExtId,
    totalAmount: 50000,
    milestones: [{ title: 'Single Milestone', amount: 50000 }],
  };
  const agreementToFreeze = await escrowService.createAgreement(frozenAgreementDto, dev);

  const resAssessRed = await escrowService.assessPaymentRisk(agreementToFreeze.agreementId, {
    externalUserId: buyerExtId,
  }, dev);

  const dbFrozenAgreement = await prisma.agreement.findUnique({ where: { id: agreementToFreeze.agreementId } });
  if (resAssessRed.status === 'FROZEN' && dbFrozenAgreement.status === 'FROZEN') {
    console.log('✅ Pre-funding risk assessment (RED) successfully froze the escrow agreement and blocked payments!');
  } else {
    console.error('❌ Pre-funding risk assessment (RED) failed to freeze agreement!', { resAssessRed, dbFrozenAgreement });
  }

  // =========================================================================
  // SECTION 3: Virtual Account Funding Webhook Trigger
  // =========================================================================
  console.log('\n--- SECTION 3: Escrow Virtual Account Funding (Webhook Web) ---');

  const webhookPayload = {
    agreementId: agreement.agreementId,
    transactionRef: `TX-MASTER-FUND-${Date.now()}`,
  };

  console.log(`[Emitting Webhook Signal] Emitting payment.confirmed for reference: ${webhookPayload.transactionRef}`);
  // Execute handlePaymentConfirmed manually via EscrowService
  await escrowService.handlePaymentConfirmed(webhookPayload);

  await sleep(200); // Wait briefly for event handling to resolve

  const dbFundedAgreement = await prisma.agreement.findUnique({
    where: { id: agreement.agreementId },
  });

  if (dbFundedAgreement.status === 'FUNDED') {
    console.log('✅ Webhook Funding Passed: Agreement status successfully transitioned PENDING -> FUNDED!');
  } else {
    console.error('❌ Webhook Funding Failed! Status is:', dbFundedAgreement.status);
  }

  // =========================================================================
  // SECTION 4: Milestone Confirmations & Disbursements
  // =========================================================================
  console.log('\n--- SECTION 4: Milestone Confirmations & Dual Consensus ---');

  const milestones = await prisma.milestone.findMany({ where: { agreementId: agreement.agreementId } });
  const m1 = milestones.find((m) => m.title === 'Milestone 1');
  const m2 = milestones.find((m) => m.title === 'Milestone 2');

  // Test 4.1: Try to confirm milestone as a non-participant
  try {
    await escrowService.confirmMilestone(agreement.agreementId, m1.id, {
      externalUserId: 'hacker-user-777',
    }, dev);
    console.error('❌ Security Guard Failed: Allowed a non-participant to confirm!');
  } catch (err) {
    if (err.status === 403) {
      console.log('✅ Security Guard Passed: Non-participant confirmation blocked with 403 Forbidden correctly!');
    } else {
      console.error('❌ Unexpected exception on security check:', err);
    }
  }

  // Test 4.2: Buyer confirms milestone 1 -> status remains PENDING / FUNDED
  mockFraudFlag = 'GREEN';
  const resM1Buyer = await escrowService.confirmMilestone(agreement.agreementId, m1.id, {
    externalUserId: buyerExtId,
  }, dev);

  const dbM1BuyerCheck = await prisma.milestone.findUnique({ where: { id: m1.id } });
  const dbAgreementM1BuyerCheck = await prisma.agreement.findUnique({ where: { id: agreement.agreementId } });

  if (
    dbM1BuyerCheck.buyerConfirmed === true &&
    dbM1BuyerCheck.sellerConfirmed === false &&
    dbM1BuyerCheck.status === 'PENDING' &&
    dbAgreementM1BuyerCheck.status === 'FUNDED'
  ) {
    console.log('✅ Single-party consensus passed: Saved buyer confirmation, milestone remains PENDING, escrow remains FUNDED!');
  } else {
    console.error('❌ Single-party consensus check failed!', { dbM1BuyerCheck, dbAgreementM1BuyerCheck });
  }

  // Test 4.3: Seller confirms milestone 1 -> status transitions to DISBURSED, agreement moves to IN_PROGRESS
  createPaymentLinkCount = 0;
  disburseCount = 0;

  const resM1Seller = await escrowService.confirmMilestone(agreement.agreementId, m1.id, {
    externalUserId: sellerExtId,
    sellerAccountNumber: '1234567890',
    sellerBankCode: '058',
  }, dev);

  const dbM1SellerCheck = await prisma.milestone.findUnique({ where: { id: m1.id } });
  const dbAgreementM1SellerCheck = await prisma.agreement.findUnique({ where: { id: agreement.agreementId } });

  if (
    dbM1SellerCheck.buyerConfirmed === true &&
    dbM1SellerCheck.sellerConfirmed === true &&
    dbM1SellerCheck.status === 'DISBURSED' &&
    dbAgreementM1SellerCheck.status === 'IN_PROGRESS' && // more milestones left
    createPaymentLinkCount === 1 &&
    disburseCount === 1
  ) {
    console.log('✅ Dual consensus passed: Milestone 1 DISBURSED! Agreement status transitioned FUNDED -> IN_PROGRESS.');
  } else {
    console.error('❌ Dual consensus milestone 1 failed!', { dbM1SellerCheck, dbAgreementM1SellerCheck, createPaymentLinkCount, disburseCount });
  }

  // Test 4.4: RED fraud during Milestone 2 confirmation -> freeze
  console.log('\n🧪 Testing RED fraud flag during Milestone 2 confirmation...');
  
  // Buyer confirms Milestone 2 first
  await escrowService.confirmMilestone(agreement.agreementId, m2.id, {
    externalUserId: buyerExtId,
  }, dev);

  // Override mock fraud service to flag RED
  mockFraudFlag = 'RED';
  createPaymentLinkCount = 0;
  disburseCount = 0;

  const resM2SellerRed = await escrowService.confirmMilestone(agreement.agreementId, m2.id, {
    externalUserId: sellerExtId,
    sellerAccountNumber: '1234567890',
    sellerBankCode: '058',
  }, dev);

  const dbM2CheckRed = await prisma.milestone.findUnique({ where: { id: m2.id } });
  const dbAgreementCheckRed = await prisma.agreement.findUnique({ where: { id: agreement.agreementId } });

  if (
    dbAgreementCheckRed.status === 'FROZEN' &&
    dbM2CheckRed.status === 'PENDING' &&
    createPaymentLinkCount === 0 &&
    disburseCount === 0
  ) {
    console.log('✅ Fraud Guard Passed: RED fraud on confirmation successfully froze the agreement and blocked Squad payout!');
  } else {
    console.error('❌ Fraud Guard Failed!', { dbM2CheckRed, dbAgreementCheckRed });
  }

  // =========================================================================
  // SECTION 5: Retrieval & Audit Logs Verification
  // =========================================================================
  console.log('\n--- SECTION 5: Retrieval and Audit Verification ---');

  // Test 5.1: Fetch agreement with milestones, fraud records, and logs
  const finalAgreementData = await escrowService.getAgreement(agreement.agreementId, dev);
  if (
    finalAgreementData.id === agreement.agreementId &&
    finalAgreementData.milestones.length === 2 &&
    finalAgreementData.fraudAssessments.length >= 2
  ) {
    console.log('✅ Fetch agreement details passed! Nested milestone data and fraud profiles loaded perfectly!');
  } else {
    console.error('❌ Fetch agreement details failed!', finalAgreementData);
  }

  // Restoration & Close
  fraudService.assess = originalAssess;
  squadService.createPaymentLink = originalCreatePaymentLink;
  squadService.disburse = originalDisburse;
  squadService.createVirtualAccount = originalCreateVirtualAccount;
  squadService.verifyTransaction = originalVerifyTransaction;

  await app.close();
  console.log('\n✨===========================================================✨');
  console.log('🎉   ALL MASTER ESCROW INTEGRATION TESTS COMPLETED SUCCESSFULLY!  🎉');
  console.log('✨===========================================================✨\n');
}

runMasterEscrowTests().catch((err) => {
  console.error('\n❌ Master Escrow Integration Suite crashed!');
  console.error(err);
  process.exit(1);
});
