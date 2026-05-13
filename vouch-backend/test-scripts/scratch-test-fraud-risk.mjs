import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { IpAnalysisService } from '../dist/fraud/context/ip-analysis.service.js';
import { BehaviourService } from '../dist/fraud/context/behaviour.service.js';
import { ContextBuilderService } from '../dist/fraud/context/context-builder.service.js';
import { FraudService } from '../dist/fraud/fraud.service.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { ConfigService } from '@nestjs/config';

async function runMasterFraudTests() {
  console.log('🌟===========================================================🌟');
  console.log('🚀   STARTING MASTER FRAUD RISK INTEGRATION SUITE (TEST 3)     🚀');
  console.log('🌟===========================================================🌟\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const ipService = app.get(IpAnalysisService);
  const behaviourService = app.get(BehaviourService);
  const contextBuilder = app.get(ContextBuilderService);
  const fraudService = app.get(FraudService);
  const configService = app.get(ConfigService);

  // Setup platform pre-records
  console.log('📦 Creating database pre-records for fraud assessment...');
  let dev = await prisma.developer.findFirst();
  if (!dev) {
    dev = await prisma.developer.create({
      data: {
        email: `fraud-master-dev-${Date.now()}@vouch.com`,
        supabaseUid: `sub-fraud-mstr-${Date.now()}`,
      }
    });
  }

  const externalUserId = `ext-user-fraud-${Date.now()}`;
  const user = await prisma.platformUser.create({
    data: {
      externalUserId,
      developerId: dev.id,
      identityVerified: true,
      onboardingLocation: {
        country: 'NG',
        city: 'Lagos',
        lat: 6.5244,
        lng: 3.3792,
      },
      deviceFingerprintAtOnboarding: 'master-fingerprint',
    }
  });

  // =========================================================================
  // SECTION 1: ProxyCheck VPN/Proxy IP Reputation Verification
  // =========================================================================
  console.log('\n--- SECTION 1: ProxyCheck IP Analysis ---');
  const testIp = '8.8.8.8'; // Public DNS IP
  console.log(`📦 Testing IP analysis for ${testIp}...`);

  try {
    const ipResult = await ipService.analyze(testIp);
    console.log('✅ IP Analysis returned result successfully!');
    console.log(`IP: ${testIp}, Proxy: ${ipResult.is_proxy}, VPN: ${ipResult.is_vpn}, Is Cloud: ${ipResult.is_cloud}`);
  } catch (err) {
    console.error('❌ Failed to run IP Analysis:', err.message);
  }

  // =========================================================================
  // SECTION 2: Behavioral Impossible Travel checks (Lagos -> London in 1 hour)
  // =========================================================================
  console.log('\n--- SECTION 2: Behavioral Geolocation Travel Audit ---');
  
  // Test 2.1: Same city (Lagos) -> Should not trigger impossible travel
  console.log('🏃 Scenario A: User transacting in Lagos (no impossible travel)...');
  const resLagos = await behaviourService.analyze(
    user.id,
    { country: 'NG', city: 'Lagos', lat: 6.5244, lng: 3.3792 },
    5000
  );
  console.log(`Result: Impossible Travel = ${resLagos.impossible_travel}, Previous Tx = ${resLagos.previous_transactions}`);

  if (resLagos.impossible_travel !== false) {
    console.error('❌ Failed Scenario A: Erroneously flagged impossible travel!');
  } else {
    console.log('✅ Scenario A Passed!');
  }

  // Test 2.2: Teleporting to London (UK) in 1 hour
  console.log('🏃 Scenario B: User teleported to London (Impossible travel check)...');
  
  // Create a simulated past transaction 1 hour ago in Lagos
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  await prisma.fraudAssessment.create({
    data: {
      platformUserId: user.id,
      score: 10,
      flag: 'GREEN',
      category: 'PAYMENT',
      triggeredSignals: [],
      contextSnapshot: {
        meta: {
          client_ip: '102.89.23.4', // Lagos IP
          location: { country: 'NG', city: 'Lagos', lat: 6.5244, lng: 3.3792 }
        }
      },
      createdAt: oneHourAgo,
    }
  });

  const resLondon = await behaviourService.analyze(
    user.id,
    { country: 'UK', city: 'London', lat: 51.5074, lng: -0.1278 },
    15000
  );
  console.log(`Result: Impossible Travel = ${resLondon.impossible_travel}, Velocity Score = ${resLondon.velocity_score}`);

  if (resLondon.impossible_travel === true) {
    console.log('✅ Scenario B Passed: Successfully detected impossible travel (Lagos -> London in 1hr)!');
  } else {
    console.error('❌ Failed Scenario B: Failed to catch impossible travel!');
  }

  // =========================================================================
  // SECTION 3: Deep Payload Context Snapshot Building
  // =========================================================================
  console.log('\n--- SECTION 3: Context Snapshot Builder ---');
  console.log('📦 Generating structured snapshot context payload...');

  try {
    const context = await contextBuilder.build({
      developerId: dev.id,
      platformUserId: user.id,
      ipAddress: '102.89.23.4',
      deviceFingerprint: 'chrome-user-agent-string',
      transactionAmount: 15000,
    });
    
    console.log('✅ Context payload built successfully!');
    console.log(`Account Age Days: ${context.behaviour.account_age_days}`);
    console.log(`Device Fingerprint Match: ${context.device.fingerprint_matched}`);
    console.log(`IP ASN: ${context.ip.asn_organization}`);
  } catch (err) {
    console.error('❌ Failed to build snapshot context:', err.message);
  }

  // =========================================================================
  // SECTION 4: ML Scoring Engine Assessments
  // =========================================================================
  console.log('\n--- SECTION 4: ML Risk Engine Rating Assessment ---');
  console.log('📦 Calling ML scoring model evaluation...');

  try {
    const assessment = await fraudService.assess({
      developerId: dev.id,
      platformUserId: user.id,
      ipAddress: '102.89.23.4',
      deviceFingerprint: 'chrome-user-agent-string',
      transactionAmount: 250000, // Large amount triggers higher risk
      transactionId: `TX-ML-MSTR-${Date.now()}`,
    });

    console.log('✅ ML Risk assessment completed successfully!');
    console.log(`Risk Rating Flag: ${assessment.flag} (Score: ${assessment.score}/100)`);
    console.log(`Triggered Signals: ${JSON.stringify(assessment.triggered_signals)}`);
    console.log(`Recommendation Strategy: ${assessment.recommendation}`);
  } catch (err) {
    console.error('❌ Failed to run ML Risk assessment:', err.message);
  }

  await app.close();
  console.log('\n✨===========================================================✨');
  console.log('🎉   ALL MASTER FRAUD RISK INTEGRATION TESTS COMPLETED!       🎉');
  console.log('✨===========================================================✨\n');
}

runMasterFraudTests().catch((err) => {
  console.error('\n❌ Master Fraud Risk Integration Suite crashed!');
  console.error(err);
  process.exit(1);
});
