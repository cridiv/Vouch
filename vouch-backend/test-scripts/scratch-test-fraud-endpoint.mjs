import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

async function runTests() {
  console.log('🚀 Setting up e2e test for Fraud Assess Endpoint...');
  const prisma = new PrismaClient();
  
  try {
    console.log('📦 Provisioning developer and API key...');
    let dev = await prisma.developer.findFirst();
    if (!dev) {
      dev = await prisma.developer.create({
        data: {
          email: `e2e-fraud-${Date.now()}@vouch.xyz`,
          supabaseUid: `sub-e2e-${Date.now()}`,
        },
      });
    }

    // Generate API Key
    const apiKeyRaw = `vouch_test_${crypto.randomBytes(16).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(apiKeyRaw).digest('hex');

    await prisma.apiKey.create({
      data: {
        developerId: dev.id,
        keyHash: hashedKey,
        keyPrefix: apiKeyRaw.substring(0, 10),
        name: 'E2E Test Key',
      }
    });

    const uniqueId = Date.now();
    const testExternalUserId = `e2e-user-${uniqueId}`;

    const user = await prisma.platformUser.create({
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

    const basePayload = {
      transactionId: `tx-${uniqueId}`,
      platformUserId: user.id,
      deviceFingerprint: 'test-fingerprint',
      transactionAmount: 1500,
      ipAddress: '8.8.8.8',
    };

    console.log(`\n--- Test 1: Standard Assessment ---`);
    console.log(`Sending POST /v1/fraud/assess...`);
    
    // We will use native fetch
    const res1 = await fetch('http://localhost:5000/v1/fraud/assess', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeyRaw
      },
      body: JSON.stringify(basePayload)
    });

    const data1 = await res1.json();
    console.log('✅ Result 1:', data1);
    
    if (res1.status !== 201 && res1.status !== 200) {
      throw new Error(`Endpoint failed with status ${res1.status}: ${JSON.stringify(data1)}`);
    }

    // Confirm FraudAssessment saved in DB
    console.log(`🔍 Checking DB for FraudAssessment...`);
    const assessment = await prisma.fraudAssessment.findFirst({
      where: { platformUserId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    if (!assessment) throw new Error('❌ FraudAssessment not saved!');
    console.log(`✅ Found Assessment: Score ${assessment.score}, Flag ${assessment.flag}`);

    // Confirm DeveloperLog written
    console.log(`🔍 Checking DB for DeveloperLog...`);
    const log1 = await prisma.developerLog.findFirst({
      where: { developerId: dev.id, externalUserId: testExternalUserId },
      orderBy: { createdAt: 'desc' }
    });
    if (!log1) throw new Error('❌ DeveloperLog not saved!');
    console.log(`✅ Found DeveloperLog: Event ${log1.eventType}`);

    console.log(`\n--- Test 2: Simulate VPN (Should return RED/BLOCKED or AMBER if ML down) ---`);
    const res2 = await fetch('http://localhost:5000/v1/fraud/assess', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeyRaw
      },
      body: JSON.stringify({ ...basePayload, transactionId: `tx-vpn-${uniqueId}`, simulateVpn: true })
    });

    const data2 = await res2.json();
    console.log('✅ Result 2:', data2);
    
    // Wait for DB to settle
    await new Promise(r => setTimeout(r, 500));

    const log2 = await prisma.developerLog.findFirst({
      where: { developerId: dev.id, externalUserId: testExternalUserId },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`✅ Found DeveloperLog for VPN: Event ${log2?.eventType}`);

    console.log('\n✨ E2E Fraud Endpoint tests complete! ✨');
  } catch (err) {
    console.error('❌ Tests failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
