import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { SquadService } from '../dist/squad/squad.service.js';

async function runTests() {
  console.log('🚀 Bootstrapping NestJS Context for SquadService...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const squadService = app.get(SquadService);

  const transactionRef = `DISB-${Date.now()}`;
  const amount = 5000; // NGN 5000

  console.log(`\n--- Test: Squad Disbursement ---`);
  console.log(`📦 Testing disburse for ${transactionRef}...`);

  try {
    const params = {
      account_number: '0123456789', // Sandbox dummy account
      account_name: 'Test User',
      bank_code: '000013', 
      amount: amount,
      transaction_ref: transactionRef,
      narration: 'Test Sandbox Disbursement',
    };

    const response = await squadService.disburse(params);
    console.log(`✅ Disbursement Initiated Successfully!`);
    console.log(response);

  } catch (err) {
    console.error('❌ Failed to disburse:', err.message);
  }

  await app.close();
  console.log('\n✨ Squad Disbursement Test Complete! ✨');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed!');
  console.error(err);
  process.exit(1);
});
