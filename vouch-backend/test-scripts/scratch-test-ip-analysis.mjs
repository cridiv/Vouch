import { NestFactory } from '@nestjs/core';
import { AppModule } from './dist/app.module.js';
import { IpAnalysisService } from './dist/fraud/context/ip-analysis.service.js';
import { ConfigService } from '@nestjs/config';
import ProxyCheck from 'proxycheck-ts';

async function getPublicIp() {
  const res = await fetch('https://api.ipify.org?format=json');
  const data = await res.json();
  return data.ip;
}

async function runTests() {
  console.log('🚀 Bootstrapping NestJS context...\n');
  const app = await NestFactory.createApplicationContext(AppModule);
  const ipService = app.get(IpAnalysisService);
  const configService = app.get(ConfigService);

  // Step 1: Detect real public IP
  console.log('🌐 Detecting your real public IP address...');
  const publicIp = await getPublicIp();
  console.log(`📍 Your public IP: ${publicIp}\n`);

  // Step 2: Get RAW ProxyCheck response (bypass our service to debug)
  console.log('━'.repeat(60));
  console.log('RAW ProxyCheck.io API Response (for debugging):');
  console.log('━'.repeat(60));

  const apiKey = configService.get('PROXYCHECK_API_KEY');
  const rawClient = new ProxyCheck({ api_key: apiKey });
  const rawResult = await rawClient.checkIP(publicIp, { vpn: 3, asn: 1 });

  console.log(JSON.stringify(rawResult, null, 2));

  // Step 3: Now run through our service
  console.log('\n' + '━'.repeat(60));
  console.log('Our IpAnalysisService.analyze() result:');
  console.log('━'.repeat(60));

  const result = await ipService.analyze(publicIp);
  console.log(JSON.stringify(result, null, 2));

  console.log('\n' + '━'.repeat(60));
  if (result.is_vpn || result.is_proxy) {
    console.log('🔴 VPN / PROXY DETECTED');
  } else {
    console.log('🟢 Clean connection — no VPN or proxy detected');
  }
  console.log('━'.repeat(60));

  await app.close();
}

runTests().catch((err) => {
  console.error('\n❌ Script failed:', err.message ?? err);
  process.exit(1);
});
