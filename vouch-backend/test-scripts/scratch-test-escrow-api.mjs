import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000/v1';

async function runTests() {
  const uniqueId = Date.now().toString();
  const testEmail = `dev-escrow-${uniqueId}@vouch.xyz`;
  const testSupabaseUid = `sub-escrow-${uniqueId}`;

  console.log('🚀 Step 1: Provisioning a fresh developer for escrow testing...');
  const provRes = await axios.post(`${BASE_URL}/developer/provision`, {
    email: testEmail,
    supabaseUid: testSupabaseUid,
  });

  const devId = provRes.data.developerId;
  const rawApiKey = provRes.data.apiKey.rawKey;
  console.log(`✅ Developer created (ID: ${devId}) with API KeyPrefix: ${provRes.data.apiKey.prefix}`);

  // Set up external user IDs
  const buyerId = `buyer-${uniqueId}`;
  const sellerId = `seller-${uniqueId}`;

  console.log('\n🚀 Step 2: Resolving buyer and seller in DB (default to unverified)...');
  await prisma.platformUser.create({
    data: {
      externalUserId: buyerId,
      developerId: devId,
      identityVerified: false,
    },
  });
  await prisma.platformUser.create({
    data: {
      externalUserId: sellerId,
      developerId: devId,
      identityVerified: false,
    },
  });

  // -------------------------------------------------------------
  // Test Case A: Create escrow when buyer is unverified
  // -------------------------------------------------------------
  console.log('\n🧪 Test Case A: Creating escrow with unverified buyer...');
  try {
    await axios.post(`${BASE_URL}/escrow/agreements`, {
      buyerExternalId: buyerId,
      sellerExternalId: sellerId,
      totalAmount: 150000,
      milestones: [
        { title: 'Milestone 1', amount: 50000 },
        { title: 'Milestone 2', amount: 100000 },
      ],
    }, {
      headers: { 'x-api-key': rawApiKey },
    });
    throw new Error('❌ Test Case A Failed: Call succeeded but should have thrown 400');
  } catch (err) {
    if (err.response && err.response.status === 400 && err.response.data.message === 'Buyer identity not verified') {
      console.log('✅ Test Case A Passed: Correctly threw 400 "Buyer identity not verified"');
    } else {
      throw err;
    }
  }

  // Verify buyer to true, keep seller unverified
  await prisma.platformUser.update({
    where: { externalUserId_developerId: { externalUserId: buyerId, developerId: devId } },
    data: { identityVerified: true },
  });

  // -------------------------------------------------------------
  // Test Case B: Create escrow when seller is unverified
  // -------------------------------------------------------------
  console.log('\n🧪 Test Case B: Creating escrow with unverified seller...');
  try {
    await axios.post(`${BASE_URL}/escrow/agreements`, {
      buyerExternalId: buyerId,
      sellerExternalId: sellerId,
      totalAmount: 150000,
      milestones: [
        { title: 'Milestone 1', amount: 50000 },
        { title: 'Milestone 2', amount: 100000 },
      ],
    }, {
      headers: { 'x-api-key': rawApiKey },
    });
    throw new Error('❌ Test Case B Failed: Call succeeded but should have thrown 400');
  } catch (err) {
    if (err.response && err.response.status === 400 && err.response.data.message === 'Seller identity not verified') {
      console.log('✅ Test Case B Passed: Correctly threw 400 "Seller identity not verified"');
    } else {
      throw err;
    }
  }

  // Verify seller to true
  await prisma.platformUser.update({
    where: { externalUserId_developerId: { externalUserId: sellerId, developerId: devId } },
    data: { identityVerified: true },
  });

  // -------------------------------------------------------------
  // Test Case C: Create escrow with mismatched milestone total
  // -------------------------------------------------------------
  console.log('\n🧪 Test Case C: Creating escrow with mismatched milestone total...');
  try {
    await axios.post(`${BASE_URL}/escrow/agreements`, {
      buyerExternalId: buyerId,
      sellerExternalId: sellerId,
      totalAmount: 150000,
      milestones: [
        { title: 'Milestone 1', amount: 50000 },
        { title: 'Milestone 2', amount: 50000 }, // Sum = 100k, totalAmount = 150k
      ],
    }, {
      headers: { 'x-api-key': rawApiKey },
    });
    throw new Error('❌ Test Case C Failed: Call succeeded but should have thrown 400');
  } catch (err) {
    if (err.response && err.response.status === 400 && err.response.data.message.includes('must equal totalAmount')) {
      console.log('✅ Test Case C Passed: Correctly threw 400 for mismatched total:', err.response.data.message);
    } else {
      throw err;
    }
  }

  // -------------------------------------------------------------
  // Test Case D: Successful escrow creation with valid users and matches
  // -------------------------------------------------------------
  console.log('\n🧪 Test Case D: Creating escrow with verified users and matching milestones...');
  const createRes = await axios.post(`${BASE_URL}/escrow/agreements`, {
    buyerExternalId: buyerId,
    sellerExternalId: sellerId,
    totalAmount: 150000,
    buyerEmail: 'buyer_test@vouch.xyz',
    buyerName: 'Buyer Test User',
    milestones: [
      { title: 'Design Phase', amount: 50000 },
      { title: 'Development Phase', amount: 100000 },
    ],
  }, {
    headers: { 'x-api-key': rawApiKey },
  });

  console.log('✅ Response Received:', JSON.stringify(createRes.data, null, 2));

  const agreementId = createRes.data.agreementId;
  if (!agreementId) {
    throw new Error('❌ Test Case D Failed: No agreementId returned!');
  }
  if (!createRes.data.squadVirtualAccountNo) {
    throw new Error('❌ Test Case D Failed: No squadVirtualAccountNo returned!');
  }
  console.log(`✅ Escrow agreement created successfully! Agreement ID: ${agreementId}`);

  // -------------------------------------------------------------
  // Test Case E: Verify Agreement and Milestones in DB
  // -------------------------------------------------------------
  console.log('\n🧪 Test Case E: Verifying Agreement and Milestones in DB...');
  const agreement = await prisma.agreement.findUnique({
    where: { id: agreementId },
    include: { milestones: true },
  });

  if (!agreement) {
    throw new Error(`❌ Test Case E Failed: Agreement not found in database!`);
  }
  console.log('✅ Agreement retrieved from DB:', JSON.stringify(agreement, null, 2));

  if (agreement.status !== 'PENDING') {
    throw new Error(`❌ Test Case E Failed: Expected status PENDING, got ${agreement.status}`);
  }
  if (agreement.milestones.length !== 2) {
    throw new Error(`❌ Test Case E Failed: Expected 2 milestones, got ${agreement.milestones.length}`);
  }
  console.log('✅ Milestones count matches and linked perfectly in DB!');

  // -------------------------------------------------------------
  // Test Case F: Verify DeveloperLog Event
  // -------------------------------------------------------------
  console.log('\n🧪 Test Case F: Verifying DeveloperLog audit entry...');
  // Wait 200ms for fire-and-forget logging to execute
  await new Promise((resolve) => setTimeout(resolve, 200));

  const log = await prisma.developerLog.findFirst({
    where: {
      developerId: devId,
      eventType: 'ESCROW_CREATED',
    },
  });

  if (!log) {
    throw new Error('❌ Test Case F Failed: DeveloperLog entry with ESCROW_CREATED event was not written.');
  }
  console.log('✅ DeveloperLog entry found:', JSON.stringify(log, null, 2));

  console.log('\n✨ All Escrow Creation API integration tests passed with flying colors! ✨');
}

runTests()
  .catch((err) => {
    console.error('\n❌ Integration Test Failed!');
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err);
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
