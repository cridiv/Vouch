import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { SquadService } from '../dist/squad/squad.service.js';

async function runTests() {
  console.log('🚀 Bootstrapping NestJS Context for SquadService...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const squadService = app.get(SquadService);

  const agreementId = `AGR-${Date.now()}`;
  const customerEmail = `customer-${Date.now()}@vouch.xyz`;
  const customerName = `John Doe`;

  console.log(`📦 Testing createVirtualAccount for ${agreementId}...`);

  try {
    const response = await squadService.createVirtualAccount(agreementId, customerEmail, customerName);
    console.log(`✅ Virtual Account Created Successfully!`);
    console.log(response);

    if (!response.virtual_account_number) {
        throw new Error('❌ Virtual account number is missing from response!');
    }
  } catch (err) {
    console.error('❌ Failed to create virtual account:', err.message);
  }

  await app.close();
  console.log('\n✨ Squad Virtual Account Test Complete! ✨');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed!');
  console.error(err);
  process.exit(1);
});
