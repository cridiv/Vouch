# Vouch SDK — Complete Developer Documentation

> **Version:** 1.1.0 · **License:** MIT · **Language:** TypeScript (ESM) · **Runtime:** Browser & Node.js

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation & Setup](#installation--setup)
4. [Initialization](#initialization)
5. [Authentication](#authentication)
6. [Module: Identity Verification](#module-identity-verification)
7. [Module: Fraud Assessment](#module-fraud-assessment)
8. [Module: Escrow Agreements](#module-escrow-agreements)
9. [Device Fingerprinting](#device-fingerprinting)
10. [TypeScript Interfaces Reference](#typescript-interfaces-reference)
11. [Error Handling](#error-handling)
12. [Environment Configuration](#environment-configuration)
13. [End-to-End Example](#end-to-end-example)
14. [Project Structure](#project-structure)

---

## Overview

The **Vouch SDK** (`vouch-sdk`) is a TypeScript client library for the Vouch Trust Platform. It provides a single, unified API surface that wraps three core trust infrastructure services:

| Module | Purpose |
|--------|---------|
| **`vouch.identity`** | AI-powered document parsing, biometric face matching (ArcFace), and liveness verification |
| **`vouch.fraud`** | Real-time transaction fraud risk assessment using ML models and rule engines |
| **`vouch.escrow`** | Milestone-based escrow agreement lifecycle management with integrated payment risk scoring |

The SDK handles all network communication, file uploads, authentication headers, and device fingerprint collection automatically. Developers interact with a clean, promise-based API.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Your Application                   │
│          (Browser / Next.js / Node.js)               │
└──────────────────────┬──────────────────────────────┘
                       │  import Vouch from 'vouch-sdk'
                       ▼
┌─────────────────────────────────────────────────────┐
│                    Vouch SDK                         │
│                                                     │
│  ┌─────────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  identity    │ │  fraud   │ │     escrow       │  │
│  │  .verify()   │ │  .assess │ │ .create()        │  │
│  │              │ │          │ │ .assess()        │  │
│  │              │ │          │ │ .confirm()       │  │
│  │              │ │          │ │ .status()        │  │
│  └──────┬───────┘ └────┬─────┘ └───────┬──────────┘  │
│         │              │               │             │
│  ┌──────┴──────────────┴───────────────┴──────────┐  │
│  │         Axios HTTP Client (x-api-key)          │  │
│  └──────────────────────┬─────────────────────────┘  │
│  ┌──────────────────────┴─────────────────────────┐  │
│  │      FingerprintJS (automatic collection)      │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │  HTTPS / x-api-key header
                       ▼
┌─────────────────────────────────────────────────────┐
│              Vouch Backend (NestJS)                   │
│                  /v1/* endpoints                     │
│                                                     │
│  Identity ──► ML Engine (FastAPI/ArcFace)            │
│  Fraud    ──► LightGBM + Rule Engine                 │
│  Escrow   ──► Prisma DB + Squad Payment Gateway      │
└─────────────────────────────────────────────────────┘
```

**Key design decisions:**
- **Axios-based HTTP client** — All API calls go through a shared `AxiosInstance` configured once with the developer's API key.
- **Automatic device fingerprinting** — The SDK silently collects a browser fingerprint via `@fingerprintjs/fingerprintjs` and attaches it to every identity and fraud request. In Node.js (server-side), it falls back to a static `'node-server-fingerprint'` string.
- **Isomorphic** — Works in browsers (via `File`/`Blob`) and Node.js environments.
- **ESM-only** — Ships as ES modules (`"type": "module"`) with full TypeScript declarations.

---

## Installation & Setup

### From npm (once published)

```bash
npm install vouch-sdk
```

### Local development (monorepo / pre-publish)

If `vouch-sdk` is a sibling directory in your monorepo, reference it directly:

```json
// package.json
{
  "dependencies": {
    "vouch-sdk": "file:../vouch-sdk"
  }
}
```

Then run `npm install` to symlink it.

### Build from source

```bash
cd vouch-sdk
npm install
npm run build    # Compiles TypeScript → dist/
```

This produces:
- `dist/index.js` — ESM entry point
- `dist/index.d.ts` — TypeScript declarations
- `dist/vouch.js` / `dist/vouch.d.ts` — Core class
- `dist/fingerprint.js` / `dist/fingerprint.d.ts` — Device fingerprint utility

---

## Initialization

```typescript
import Vouch from 'vouch-sdk';

const vouch = new Vouch('vouch_your_api_key_here');
```

### Constructor: `new Vouch(apiKey: string)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiKey` | `string` | ✅ | Your developer API key (begins with `vouch_`). Obtained from the Vouch dashboard or the `/v1/developer/provision` endpoint. |

The constructor creates an internal Axios instance configured with:
- **Base URL**: Read from `process.env.VOUCH_API_URL`, defaulting to `https://vouch-fmql.onrender.com/v1`
- **Auth header**: `x-api-key: <your key>` on every request

---

## Authentication

All SDK methods are authenticated via the `x-api-key` HTTP header, set automatically by the constructor. The backend validates the key by:

1. Computing `SHA-256(apiKey)`
2. Looking up the hash in the `ApiKey` database table
3. Resolving the associated `Developer` record

If the key is invalid or missing, the API returns `401 Unauthorized`.

> [!IMPORTANT]
> Never expose your API key in client-side code shipped to production. Use environment variables (`NEXT_PUBLIC_VOUCH_API_KEY`) and restrict key permissions via the dashboard.

---

## Module: Identity Verification

The `vouch.identity` module orchestrates document parsing, face extraction, biometric matching (ArcFace neural network), and liveness verification.

### `vouch.identity.verify(documentFile, selfieFile, externalUserId)`

Performs a full identity verification pipeline.

```typescript
const result = await vouch.identity.verify(
  documentFile,   // File | Blob — photo of government-issued ID
  selfieFile,     // File | Blob — live selfie photo
  externalUserId  // string — your platform's unique user identifier
);
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `documentFile` | `File \| Blob` | ✅ | Image of the identity document (passport, driver's licence, national ID). Accepted formats: JPEG, PNG. Max size: 5MB. |
| `selfieFile` | `File \| Blob` | ✅ | Live selfie image of the user. Accepted formats: JPEG, PNG. Max size: 5MB. |
| `externalUserId` | `string` | ✅ | A unique identifier for the user on **your** platform (e.g., database user ID, auth UID). Vouch uses this to create/resolve a `PlatformUser` record. |

#### What happens internally

1. The SDK collects a **device fingerprint** automatically via FingerprintJS
2. Constructs a `multipart/form-data` request with `document_image`, `selfie_image`, `external_user_id`, and `device_fingerprint`
3. Sends `POST /v1/identity/verify` to the backend
4. The backend forwards images to the **ML Engine** (FastAPI) which:
   - Assesses document image quality (brightness, contrast, blur)
   - Detects document type via aspect ratio analysis (passport, ID card, licence)
   - Extracts text fields via OCR (name, expiry date, document number)
   - Extracts face regions from both images using OpenCV Haar cascades
   - Runs **ArcFace** biometric face matching (cosine distance verification)
5. Results are stored on the `PlatformUser` record in the database
6. An audit log entry is written for the developer

#### Return Type: `IdentityVerifyResult`

```typescript
{
  status: "success" | "failed",
  message: "Identity verified successfully",
  data: {
    id: "usr_1715698234567",
    externalUserId: "user-abc-123",
    identityVerified: true,
    identityMatchScore: 92,       // 0–99, biometric match confidence
    livenessPassed: true,
    documentType: "passport"      // "passport" | "drivers_license" | "national_id"
  }
}
```

#### Match Score Interpretation

| Score Range | Meaning | `identityVerified` |
|-------------|---------|-------------------|
| **85 – 99** | Strong biometric match (same person) | `true` |
| **50 – 84** | Uncertain / poor image quality | `false` |
| **0 – 49** | Different person or no face detected | `false` |

#### Usage Example

```typescript
// Browser: from file inputs
const docInput = document.querySelector<HTMLInputElement>('#doc-upload');
const selfieInput = document.querySelector<HTMLInputElement>('#selfie-upload');

const result = await vouch.identity.verify(
  docInput.files[0],
  selfieInput.files[0],
  'user-12345'
);

if (result.data.identityVerified) {
  console.log(`✅ Verified with ${result.data.identityMatchScore}% confidence`);
} else {
  console.log('❌ Verification failed');
}
```

```typescript
// React / Next.js: from state
const [docFile, setDocFile] = useState<File | null>(null);
const [selfie, setSelfie] = useState<File | null>(null);

const handleVerify = async () => {
  if (!docFile || !selfie) return;
  try {
    const result = await vouch.identity.verify(docFile, selfie, currentUser.id);
    // result.data.identityVerified → boolean
  } catch (err) {
    console.error('Verification error:', err.response?.data || err.message);
  }
};
```

---

## Module: Fraud Assessment

The `vouch.fraud` module provides real-time transaction fraud risk scoring powered by a hybrid ML + rules engine.

### `vouch.fraud.assess(params)`

Evaluates fraud risk for a specific transaction or user action.

```typescript
const risk = await vouch.fraud.assess({
  platformUserId: 'user-12345',
  transactionAmount: 150000,
  agreementId: 'agr_abc123',         // optional
  simulateVpn: false,                // optional, for testing
  simulateImpossibleTravel: false,   // optional, for testing
});
```

#### Parameters: `FraudAssessParams`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platformUserId` | `string` | ✅ | The external user identifier on your platform |
| `transactionAmount` | `number` | ✅ | Transaction value (in smallest currency unit or whole units) |
| `agreementId` | `string` | ❌ | Link assessment to a specific escrow agreement |
| `simulateVpn` | `boolean` | ❌ | Force VPN detection signal for testing |
| `simulateImpossibleTravel` | `boolean` | ❌ | Force impossible travel signal for testing |

> [!NOTE]
> The SDK automatically collects and sends the `deviceFingerprint`. You do not need to provide it.

#### Return Type: `FraudAssessResult`

```typescript
{
  score: 23,                            // 0–100, higher = riskier
  flag: "GREEN",                        // "GREEN" | "AMBER" | "RED"
  category: "low_risk",
  triggeredSignals: [],                 // e.g. ["vpn_detected", "impossible_travel"]
  recommendation: "Transaction appears safe. Proceed normally."
}
```

#### Risk Flag Interpretation

| Flag | Score Range | Action |
|------|------------|--------|
| 🟢 **GREEN** | 0 – 39 | Auto-approve |
| 🟡 **AMBER** | 40 – 69 | Manual review recommended |
| 🔴 **RED** | 70 – 100 | Block or escalate |

#### Triggered Signals

The engine evaluates these fraud signals:

| Signal | Description |
|--------|-------------|
| `vpn_detected` | User is connecting through a VPN or proxy |
| `impossible_travel` | User's IP geolocation conflicts with recent activity |
| `device_mismatch` | Device fingerprint differs from onboarding fingerprint |
| `velocity_anomaly` | Unusual transaction frequency or amount patterns |
| `identity_not_verified` | User has not completed identity verification |

---

## Module: Escrow Agreements

The `vouch.escrow` module manages the full lifecycle of milestone-based escrow agreements between buyers and sellers.

### `vouch.escrow.create(params)`

Creates a new escrow agreement with defined milestones.

```typescript
const agreement = await vouch.escrow.create({
  buyerExternalId: 'buyer-001',
  sellerExternalId: 'seller-001',
  totalAmount: 250000,
  currency: 'NGN',
  buyerEmail: 'buyer@example.com',
  buyerName: 'John Doe',
  milestones: [
    { title: 'Phase 1 — Design', amount: 100000 },
    { title: 'Phase 2 — Development', amount: 150000 },
  ]
});
```

#### Parameters: `CreateAgreementParams`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `buyerExternalId` | `string` | ✅ | Buyer's unique ID on your platform |
| `sellerExternalId` | `string` | ✅ | Seller's unique ID on your platform |
| `totalAmount` | `number` | ✅ | Total agreement value |
| `currency` | `string` | ❌ | Currency code (default: `'NGN'`) |
| `milestones` | `MilestoneInput[]` | ✅ | Array of milestone definitions |
| `buyerEmail` | `string` | ❌ | Buyer's email for notifications |
| `buyerName` | `string` | ❌ | Buyer's display name |

#### `MilestoneInput`

```typescript
{ title: string; amount: number }
```

#### Return Type: `AgreementResponse`

```typescript
{
  id: "agr_clx8f7k2z000108l4...",
  developerId: "dev_abc123",
  buyerExternalId: "buyer-001",
  sellerExternalId: "seller-001",
  status: "ACTIVE",
  squadVirtualAccountId: "SQD_VA_123",
  squadVirtualAccountNo: "9988771122",
  totalAmount: 250000,
  currency: "NGN",
  createdAt: "2026-05-14T12:00:00.000Z",
  milestones: [
    {
      id: "ms_abc",
      title: "Phase 1 — Design",
      amount: 100000,
      buyerConfirmed: false,
      sellerConfirmed: false,
      status: "PENDING"
    },
    // ...
  ]
}
```

---

### `vouch.escrow.assess(agreementId, params)`

Runs a fraud risk assessment scoped to a specific escrow agreement before releasing funds.

```typescript
const risk = await vouch.escrow.assess('agr_abc123', {
  externalUserId: 'buyer-001',
  transactionAmount: 100000,
});
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agreementId` | `string` | ✅ | The escrow agreement ID |
| `params` | `AssessPaymentParams` | ✅ | See below |

#### `AssessPaymentParams`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `externalUserId` | `string` | ✅ | The user initiating the payment |
| `transactionAmount` | `number` | ✅ | Amount being transacted |
| `simulateVpn` | `boolean` | ❌ | Simulate VPN for testing |
| `simulateImpossibleTravel` | `boolean` | ❌ | Simulate impossible travel for testing |

#### Return Type: `AssessPaymentResponse`

```typescript
{
  score: 15,
  flag: "GREEN",
  squadVirtualAccount: {
    accountNumber: "9988771122",
    bankCode: "000017",
    accountName: "Vouch Escrow — John Doe"
  }
}
```

---

### `vouch.escrow.confirm(agreementId, milestoneId, externalUserId)`

Confirms milestone completion by either the buyer or seller. Both parties must confirm before the milestone status transitions.

```typescript
await vouch.escrow.confirm(
  'agr_abc123',      // agreement ID
  'ms_abc',          // milestone ID
  'buyer-001'        // confirming user's external ID
);
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agreementId` | `string` | ✅ | The escrow agreement ID |
| `milestoneId` | `string` | ✅ | The specific milestone ID |
| `externalUserId` | `string` | ✅ | The external ID of the user confirming |

---

### `vouch.escrow.status(agreementId)`

Fetches the current state of an escrow agreement, including all milestone statuses.

```typescript
const agreement = await vouch.escrow.status('agr_abc123');
console.log(agreement.status);          // "ACTIVE" | "COMPLETED" | "DISPUTED"
console.log(agreement.milestones[0]);   // { status: "CONFIRMED", ... }
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agreementId` | `string` | ✅ | The escrow agreement ID |

#### Return Type: `AgreementResponse` (same as `create`)

---

## Device Fingerprinting

The SDK includes a built-in device fingerprinting module powered by [`@fingerprintjs/fingerprintjs`](https://github.com/nicedayfor/fingerprintjs) v5.

### How it works

```typescript
import { getDeviceFingerprint } from 'vouch-sdk';

const fp = await getDeviceFingerprint();
// → "abc123def456..." (unique visitor ID)
```

### Behavior by environment

| Environment | Behavior |
|-------------|----------|
| **Browser** | Runs FingerprintJS to generate a stable `visitorId` based on canvas, fonts, WebGL, and other browser signals. Result is cached in memory for the session. |
| **Node.js** | Returns the static string `'node-server-fingerprint'`. |
| **Testing** | Set `globalThis.MOCK_FINGERPRINT = 'test-fp'` before calling any SDK method. |

### Automatic collection

You never need to call `getDeviceFingerprint()` manually. The SDK automatically collects and attaches the fingerprint to:
- `vouch.identity.verify()` — sent as `device_fingerprint` form field
- `vouch.fraud.assess()` — sent as `deviceFingerprint` JSON field
- `vouch.escrow.assess()` — sent as `device_fingerprint` JSON field

---

## TypeScript Interfaces Reference

### `IdentityVerifyResult`

```typescript
interface IdentityVerifyResult {
  status: string;           // "success" | "failed"
  message: string;          // Human-readable result message
  data: {
    id: string;                          // Internal verification ID
    externalUserId: string;              // Your platform's user ID (echo)
    identityVerified: boolean;           // Overall verification verdict
    identityMatchScore?: number | null;  // 0–99 biometric confidence
    livenessPassed: boolean;             // Liveness check result
    documentType?: string | null;        // Detected document type
  };
}
```

### `FraudAssessParams`

```typescript
interface FraudAssessParams {
  platformUserId: string;
  agreementId?: string;
  transactionAmount: number;
  simulateVpn?: boolean;
  simulateImpossibleTravel?: boolean;
}
```

### `FraudAssessResult`

```typescript
interface FraudAssessResult {
  score: number;                     // 0–100
  flag: 'GREEN' | 'AMBER' | 'RED';
  category: string;
  triggeredSignals: string[];
  recommendation: string;
}
```

### `MilestoneInput`

```typescript
interface MilestoneInput {
  title: string;
  amount: number;
}
```

### `CreateAgreementParams`

```typescript
interface CreateAgreementParams {
  buyerExternalId: string;
  sellerExternalId: string;
  totalAmount: number;
  currency?: string;
  milestones: MilestoneInput[];
  buyerEmail?: string;
  buyerName?: string;
}
```

### `AgreementResponse`

```typescript
interface AgreementResponse {
  id: string;
  developerId: string;
  buyerExternalId: string;
  sellerExternalId: string;
  status: string;
  squadVirtualAccountId?: string | null;
  squadVirtualAccountNo?: string | null;
  totalAmount: number;
  currency: string;
  createdAt: string;
  milestones: {
    id: string;
    title: string;
    amount: number;
    buyerConfirmed: boolean;
    sellerConfirmed: boolean;
    status: string;
  }[];
}
```

### `AssessPaymentParams`

```typescript
interface AssessPaymentParams {
  externalUserId: string;
  transactionAmount: number;
  simulateVpn?: boolean;
  simulateImpossibleTravel?: boolean;
}
```

### `AssessPaymentResponse`

```typescript
interface AssessPaymentResponse {
  score: number;
  flag: string;
  squadVirtualAccount?: {
    accountNumber: string;
    bankCode: string;
    accountName: string;
  };
}
```

---

## Error Handling

All SDK methods throw on HTTP errors. The error object contains the full Axios response.

```typescript
try {
  const result = await vouch.identity.verify(doc, selfie, userId);
} catch (error: any) {
  if (error.response) {
    // Server responded with an error status
    console.error('Status:', error.response.status);
    console.error('Message:', error.response.data?.message);
  } else if (error.request) {
    // Request was made but no response received
    console.error('Network error — is the backend running?');
  } else {
    // Something else went wrong
    console.error('Error:', error.message);
  }
}
```

### Common HTTP Error Codes

| Code | Cause | Resolution |
|------|-------|------------|
| `401` | Missing or invalid API key | Check your `apiKey` constructor parameter |
| `400` | Missing required fields or invalid file type | Ensure both `document_image` and `selfie_image` are JPEG/PNG under 5MB |
| `413` | File too large | Reduce image size below 5MB |
| `500` | Internal server error | Check backend and ML engine logs |
| `ECONNREFUSED` | Backend not running | Start the backend (`pnpm run start:dev`) |

---

## Environment Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `VOUCH_API_URL` | `https://vouch-fmql.onrender.com/v1` | Backend API base URL. Set to your production URL in deployment. |
| `NEXT_PUBLIC_VOUCH_API_KEY` | — | Your Vouch API key (for Next.js client-side usage) |

### Production configuration

```typescript
// Set VOUCH_API_URL in your environment
// e.g. VOUCH_API_URL=https://api.vouch.dev/v1

const vouch = new Vouch(process.env.NEXT_PUBLIC_VOUCH_API_KEY!);
// SDK automatically reads VOUCH_API_URL for the base URL
```

---

## End-to-End Example

A complete flow: provision a developer, verify both parties, create an escrow agreement, and confirm milestones.

```typescript
import Vouch from 'vouch-sdk';

const vouch = new Vouch('vouch_your_api_key');

async function completeTransaction() {
  // 1. Verify buyer identity
  const buyerResult = await vouch.identity.verify(
    buyerDocFile,
    buyerSelfie,
    'buyer-001'
  );
  console.log('Buyer verified:', buyerResult.data.identityVerified);

  // 2. Verify seller identity
  const sellerResult = await vouch.identity.verify(
    sellerDocFile,
    sellerSelfie,
    'seller-001'
  );
  console.log('Seller verified:', sellerResult.data.identityVerified);

  // 3. Create escrow agreement
  const agreement = await vouch.escrow.create({
    buyerExternalId: 'buyer-001',
    sellerExternalId: 'seller-001',
    totalAmount: 500000,
    currency: 'NGN',
    milestones: [
      { title: 'Design Delivery', amount: 200000 },
      { title: 'Final Delivery', amount: 300000 },
    ]
  });
  console.log('Agreement created:', agreement.id);

  // 4. Assess fraud risk before payment
  const risk = await vouch.escrow.assess(agreement.id, {
    externalUserId: 'buyer-001',
    transactionAmount: 200000,
  });
  console.log('Risk flag:', risk.flag); // GREEN → safe to proceed

  // 5. Confirm milestone (both parties must confirm)
  await vouch.escrow.confirm(agreement.id, agreement.milestones[0].id, 'seller-001');
  await vouch.escrow.confirm(agreement.id, agreement.milestones[0].id, 'buyer-001');

  // 6. Check final status
  const status = await vouch.escrow.status(agreement.id);
  console.log('Milestone 1 status:', status.milestones[0].status);
}
```

---

## Project Structure

```
vouch-sdk/
├── src/
│   ├── index.ts          # Public entry point — re-exports Vouch class and utilities
│   ├── vouch.ts          # Core Vouch class with identity, fraud, and escrow modules
│   └── fingerprint.ts    # Device fingerprinting via FingerprintJS (browser) with Node fallback
├── dist/                 # Compiled ESM output (generated by `npm run build`)
├── test.ts               # End-to-end integration test script
├── package.json          # Package metadata, dependencies, build scripts
└── tsconfig.json         # TypeScript compiler configuration (ES2022, ESNext modules)
```

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `axios` | `^1.16.1` | HTTP client for all API communication |
| `@fingerprintjs/fingerprintjs` | `^5.2.0` | Browser device fingerprinting |
| `typescript` | `^5.3.3` | (dev) TypeScript compiler |

## Appendix: Recent Implementation Updates (v1.2.0)

As of May 15, 2026, the following advanced features have been integrated into the Vouch Identity pipeline:

### 1. Multi-Frame Video Verification
- **Video Capture**: Transitioned from a single static selfie to a 15-frame automated video capture sequence.
- **Capture HUD**: Implemented a premium "blackout" mask with a centered oval guide to ensure optimal face positioning and biometric alignment.

### 2. Reducto AI Integration
- **High-Fidelity OCR**: Integrated Reducto for superior document parsing, layout analysis, and field extraction (Name, Expiry, Document Number).
- **Spatial Face Extraction**: Replaced standard OpenCV crops with Reducto's spatial-aware "photo" element extraction, significantly improving document-to-selfie match accuracy.

### 3. Advanced Liveness & Biometrics
- **Hybrid Liveness**: Implemented a dual-signal liveness check combining Reducto face presence detection with OpenCV-based motion analysis (pixel variance scoring).
- **Strict Security Threshold**: Established a production-grade **90% biometric match threshold**. Scores below 90% are automatically rejected to prevent spoofing.

### 4. Performance Optimizations
- **Adaptive Frame Sampling**: The AI Engine now samples every 3rd frame for biometric matching, reducing end-to-end processing time from ~48s to ~18s without sacrificing reliability.
- **Infrastructure Stability**: Increased the backend verification timeout to **90 seconds** to accommodate deep-learning model load times and high-resolution image processing.

### 5. Simplified User Experience
- **Outcome-First UI**: Refined the verification result screen to show a simple "VERIFICATION SECURE" or "CHECK FAILED" status, removing technical complexity (raw scores/checklists) for a cleaner user journey.

### 6. Zero-Click Identity Modal
- **Seamless Iframe Injection**: Developed a robust modal system that injects the verification flow directly into any web application via an iframe.
- **Automated Workflow**: Implemented "zero-click" submission, where the multi-frame payload is automatically verified and submitted to the backend as soon as the capture guide is completed.
- **Cross-Origin Sync**: Uses secure `postMessage` communication to notify the parent application of the verification result in real-time.
