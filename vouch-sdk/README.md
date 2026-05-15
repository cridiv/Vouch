# Vouch SDK (`vouch-sdk`)

The official TypeScript/JavaScript SDK for integrating the **Vouch Trust Engine** into client applications, gig marketplaces, and programmatic escrow platforms.

Vouch acts as an absolute trust layer, providing automated Identity Verification (KYC/KYB), AI-powered Fraud & VPN Detection, and Multi-Party Squad Escrow Management.

---

## Table of Contents
- [Installation](#installation)
- [Initialization](#initialization)
- [Module: Identity Verification (`vouch.identity`)](#module-identity-verification-vouchidentity)
- [Module: Fraud Intelligence (`vouch.fraud`)](#module-fraud-intelligence-vouchfraud)
- [Module: Escrow & Milestones (`vouch.escrow`)](#module-escrow--milestones-vouchescrow)
- [TypeScript Definitions](#typescript-definitions)
- [Error Handling](#error-handling)

---

## Installation

Install the package via your preferred package manager:

```bash
npm install vouch-sdk
# or
pnpm add vouch-sdk
# or
yarn add vouch-sdk
```

---

## Initialization

Import the default `Vouch` class and initialize it with your developer secret API key. In Node.js environments, you can optionally configure the target backend URL via the `VOUCH_API_URL` environment variable.

```typescript
import Vouch from 'vouch-sdk';

// Initialize with your secret API Key
const vouch = new Vouch('vouch_live_8f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c');
```

> **Security Note:** Keep your Vouch Secret API Key secure. Never expose it in client-side public browser code.

---

## Module: Identity Verification (`vouch.identity`)

Orchestrates automated document parsing, biometric selfie liveness verification, and identity matching against client platform profiles.

### `vouch.identity.verify(documentFile, selfieFile, externalUserId)`

Accepts file images (`File` or `Blob`) of a government-issued identity document and a live selfie, alongside the unique identifier of the user in your host platform.

```typescript
// Example usage
const verifyImage = document.querySelector('#id-input').files[0];
const selfieImage = document.querySelector('#selfie-input').files[0];

try {
  const verification = await vouch.identity.verify(
    verifyImage,
    selfieImage,
    'user_982347' // External ID on your platform
  );

  if (verification.data.identityVerified && verification.data.livenessPassed) {
    console.log(`Identity successfully verified! Score: ${verification.data.identityMatchScore}%`);
  }
} catch (error) {
  console.error('Verification failed:', error.response?.data?.message || error.message);
}
```

#### Response Interface
```typescript
interface IdentityVerifyResult {
  status: string;
  message: string;
  data: {
    id: string; // Vouch PlatformUser ID
    externalUserId: string;
    identityVerified: boolean;
    identityMatchScore?: number | null;
    livenessPassed: boolean;
    documentType?: string | null;
  };
}
```

---

## Module: Fraud Intelligence (`vouch.fraud`)

Evaluates real-time risk scores for transactions or user actions. Automatically captures client device fingerprints (`visitorId`) to detect impossible travel, device spoofing, and proxy/VPN networks.

### `vouch.fraud.assess(params)`

Performs a synchronous risk assessment, returning an actionable score and fraud flag (`GREEN`, `AMBER`, `RED`).

```typescript
const assessment = await vouch.fraud.assess({
  platformUserId: 'usr_abc123', // Internal Vouch PlatformUser ID
  agreementId: 'agr_xyz789',    // (Optional) Target agreement ID
  transactionAmount: 250000,    // Amount in base currency
  simulateVpn: false,           // Set to true in sandbox to simulate VPN usage
  simulateImpossibleTravel: false
});

switch (assessment.flag) {
  case 'GREEN':
    console.log('Low risk. Proceed immediately.');
    break;
  case 'AMBER':
    console.log('Medium risk requiring step-up verification.');
    break;
  case 'RED':
    console.warn(`Transaction blocked. Reason: ${assessment.triggeredSignals.join(', ')}`);
    break;
}
```

#### Response Interface
```typescript
interface FraudAssessResult {
  score: number; // 0-100
  flag: 'GREEN' | 'AMBER' | 'RED';
  category: string;
  triggeredSignals: string[];
  recommendation: string;
}
```

---

## Module: Escrow & Milestones (`vouch.escrow`)

Manages programmatic multi-party escrow contracts. Automatically provisions dynamic virtual bank accounts (via Squad API) upon passing pre-funding fraud checks, and orchestrates milestone-based disbursements.

### 1. Create Agreement (`vouch.escrow.create`)

Initializes a binding agreement between a buyer and a seller with defined payment milestones.

```typescript
const agreement = await vouch.escrow.create({
  buyerExternalId: 'client_buyer_123',
  sellerExternalId: 'client_seller_456',
  totalAmount: 500000,
  currency: 'NGN',
  buyerEmail: 'finance@acme.com',
  buyerName: 'Acme Holdings',
  milestones: [
    { title: 'Sprint 1: Architecture & Design', amount: 200000 },
    { title: 'Sprint 2: Backend Integration', amount: 300000 }
  ]
});

console.log(`Agreement created with ID: ${agreement.id}`);
```

### 2. Assess Funding Risk & Issue Virtual Account (`vouch.escrow.assess`)

Prior to depositing funds, evaluates the buyer for payment fraud. If the assessment flag is `GREEN`, a dedicated virtual bank account is issued to receive the escrow deposit. If the flag is `AMBER`, additional verification is required before payment can proceed. If `RED`, the escrow is frozen.

```typescript
const fundingCheck = await vouch.escrow.assess('agr_xyz789', {
  externalUserId: 'client_buyer_123',
  transactionAmount: 500000,
});

if (fundingCheck.flag !== 'RED' && fundingCheck.squadVirtualAccount) {
  console.log('Deposit Escrow Funds To:');
  console.log(`Bank: ${fundingCheck.squadVirtualAccount.bankCode}`);
  console.log(`Account No: ${fundingCheck.squadVirtualAccount.accountNumber}`);
  console.log(`Account Name: ${fundingCheck.squadVirtualAccount.accountName}`);
} else {
  console.error('Funding blocked due to severe fraud risk indicators.');
}
```

### 3. Confirm Milestone (`vouch.escrow.confirm`)

Registers confirmation from either party. Once both buyer and seller confirm a milestone, the Vouch Trust Engine automatically triggers disbursement to the seller's verified account.

```typescript
const confirmation = await vouch.escrow.confirm(
  'agr_xyz789',
  'milestone_1',
  'client_buyer_123' // ID of party confirming
);

console.log('Milestone confirmation state updated.');
```

### 4. Check Agreement Status (`vouch.escrow.status`)

Retrieves the real-time status of the escrow agreement and all child milestones.

```typescript
const status = await vouch.escrow.status('agr_xyz789');

console.log(`Current Agreement Status: ${status.status}`); // PENDING, FUNDED, IN_PROGRESS, COMPLETED
status.milestones.forEach((m) => {
  console.log(`- ${m.title}: ${m.status} (Buyer Confirmed: ${m.buyerConfirmed})`);
});
```

---

## TypeScript Definitions

The SDK provides full type definitions for all inputs and responses out of the box. You can import specific interfaces directly from the package:

```typescript
import { 
  IdentityVerifyResult, 
  FraudAssessParams, 
  FraudAssessResult, 
  CreateAgreementParams, 
  AgreementResponse 
} from 'vouch-sdk';
```

---

## Error Handling

All methods return standard Promises. Network errors or non-2xx HTTP responses throw an Axios error containing detailed backend validation payloads.

```typescript
try {
  await vouch.escrow.status('invalid_id');
} catch (error: any) {
  if (error.response) {
    // Backend returned a specific error status (e.g. 400, 404)
    console.error(`Status: ${error.response.status}`);
    console.error(`Message: ${error.response.data.message}`);
  } else {
    // Network connectivity issue
    console.error(`Network Error: ${error.message}`);
  }
}
```
