import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { SquadService } from '../dist/squad/squad.service.js';

async function runTests() {
  console.log('🚀 Bootstrapping NestJS Context for SquadService...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const squadService = app.get(SquadService);

  const milestoneId = `MS-${Date.now()}`;
  const customerEmail = `buyer-${Date.now()}@vouch.xyz`;
  const amount = 5000; // NGN 5000

  console.log(`\n--- Test 1: Create Payment Link ---`);
  console.log(`📦 Testing createPaymentLink for ${milestoneId}...`);

  let linkRef;

  try {
    const response = await squadService.createPaymentLink(milestoneId, amount, customerEmail);
    console.log(`✅ Payment Link Created Successfully!`);
    console.log(response);

    if (!response.checkout_url) {
        throw new Error('❌ Checkout URL is missing from response!');
    }
    
    linkRef = response.link_ref;
  } catch (err) {
    console.error('❌ Failed to create payment link:', err.message);
  }

  if (linkRef) {
    console.log(`\n--- Test 2: Verify Transaction ---`);
    console.log(`📦 Testing verifyTransaction for ${linkRef}...`);
    console.log(`Note: Since we just created this link and haven't paid, we expect the status to be Pending or Failed.\n`);
    
    try {
      const verifyResponse = await squadService.verifyTransaction(linkRef);
      console.log(`✅ Verification response received!`);
      console.log(verifyResponse);
    } catch (err) {
      console.error('❌ Failed to verify transaction:', err.message);
    }
  }

  await app.close();
  console.log('\n✨ Squad Payment Link & Verify Test Complete! ✨');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed!');
  console.error(err);
  process.exit(1);
});
