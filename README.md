# Vouch SDK — AI-Powered Trust Infrastructure for Digital Transactions

> **Plug-and-play verification and escrow for marketplaces, freelancing platforms, and P2P applications.**

Vouch is a B2B SDK that solves the fundamental trust gap in digital commerce: **money moves before trust is established.** We verify identity before onboarding, score fraud risk before every payment, and only release funds when both our AI and both parties confirm delivery.

**Built for Squad Hackathon 3.0 · Challenge 01: Proof of Life**

---

## Table of Contents

1. [The Problem](#the-problem)
2. [How Vouch Works](#how-vouch-works)
3. [Architecture](#architecture)
4. [Quick Start](#quick-start)
5. [SDK Reference](#sdk-reference)
6. [API Documentation](#api-documentation)
7. [Integration Guide](#integration-guide)
8. [Demo Application](#demo-application)
9. [Deployment](#deployment)
10. [Tech Stack](#tech-stack)
11. [Contributing](#contributing)
12. [License](#license)

---

## The Problem

Digital marketplaces in Nigeria face two recurring fraud scenarios:

### Scenario A — Ghost Vendor
A buyer pays ₦150,000 to an Instagram vendor. The vendor disappears. No product. No refund. No recourse.

### Scenario B — Disappearing Buyer
A freelancer delivers a completed website. The client claims it doesn't meet requirements and refuses to pay. Three weeks of work, zero naira received.

**The root cause:** Money moves before trust is established. Payment infrastructure exists (Squad, Paystack, Flutterwave), but **trust verification infrastructure** does not.

---

## How Vouch Works

Vouch provides three layers of protection:

### Layer 1: Identity Verification
- Upload government-issued ID (NIN, Driver's License, Passport, Voter's Card)
- Live selfie capture with 3-second video recording
- AI-powered face matching (DeepFace + Facenet512)
- Liveness detection from video frames
- **Threshold:** 85% match score required to pass

### Layer 2: Fraud Detection Engine
- Real-time risk scoring (0–100) before every payment
- **Signal categories:**
  - Network & Location (IP reputation, VPN/proxy detection, impossible travel)
  - Device fingerprinting (browser, OS, screen dimensions)
  - Behavioral patterns (account age, transaction velocity)
  - Identity verification scores
  - Squad payment metadata (card BIN, payment channel, payer name)
- **Output:** GREEN (0–39) | AMBER (40–69) | RED (70–100)
- **Action:** GREEN → proceed | AMBER → additional verification | RED → block payment

### Layer 3: Escrow + Squad Integration
- Squad virtual account created per agreement
- Buyer pays **into escrow** (not directly to seller)
- Funds held until both parties confirm delivery
- AI runs final fraud check before disbursement
- Squad disbursement triggered with traceable transaction ID

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client Application                         │
│              (Freelancing Platform, Marketplace, etc.)          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Vouch SDK (TypeScript)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    Vouch Backend (NestJS)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Identity   │  │    Fraud     │  │    Escrow    │         │
│  │    Module    │  │    Module    │  │    Module    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                 │
│         │                  │                  │                 │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │                  │                  │
┌─────────▼──────────┐ ┌─────▼──────────┐ ┌───▼──────────────┐
│  ML Service        │ │  PostgreSQL    │ │  Squad API       │
│  (FastAPI/Python)  │ │  + Prisma      │ │  (Sandbox/Live)  │
│                    │ │                │ │                  │
│  • DeepFace        │ │  • Users       │ │  • Virtual Acct  │
│  • Face matching   │ │  • Agreements  │ │  • Webhooks      │
│  • Liveness check  │ │  • Fraud logs  │ │  • Disbursement  │
│  • XGBoost model   │ │  • Squad refs  │ │                  │
└────────────────────┘ └────────────────┘ └──────────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Python 3.9+ (for ML service)
- Squad API sandbox credentials ([Get them here](https://sandbox.squadco.com))

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/vouch-sdk.git
cd vouch-sdk
```

### 2. Backend Setup

```bash
cd vouch-api
npm install

# Create .env file
cp .env.example .env

# Configure environment variables
DATABASE_URL="postgresql://user:password@localhost:5432/vouch"
SQUAD_API_KEY="your_squad_sandbox_key"
SQUAD_WEBHOOK_SECRET="your_squad_webhook_secret"
AI_ENGINE_URL="http://localhost:8080"
IP_QUALITY_SCORE_KEY="your_ipqualityscore_key" # Optional, free tier

# Run migrations
npx prisma migrate dev

# Start backend
npm run start:dev
```

Backend runs on `http://localhost:5000`

### 3. ML Service Setup

```bash
cd vouch-ai-engine
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

pip install -r requirements.txt

# Start ML service
uvicorn app:app --host 0.0.0.0 --port 8080 --reload
```

ML service runs on `http://localhost:8080`

### 4. Install Vouch SDK in Your App

```bash
npm install vouch-sdk
```

### 5. Initialize SDK

```typescript
import Vouch from 'vouch-sdk';

const vouch = new Vouch('your_api_key', {
  apiUrl: 'http://localhost:5000/v1',
  verifyUrl: 'http://localhost:3000', // Your hosted verification UI
});
```

---

## SDK Reference

### Identity Verification

```typescript
// Launch modal for identity verification
const result = await vouch.identity.verify('external_user_id_123');

// Result
{
  status: "success",
  data: {
    id: "platform_user_uuid",
    externalUserId: "external_user_id_123",
    identityVerified: true,
    identityMatchScore: 94.2,
    livenessPassed: true,
    documentType: "drivers_license"
  }
}
```

### Fraud Assessment

```typescript
const assessment = await vouch.fraud.assess({
  platformUserId: 'user_uuid',
  agreementId: 'agreement_uuid',
  transactionAmount: 150000,
  simulateVpn: false, // Testing only
  simulateImpossibleTravel: false, // Testing only
});

// Result
{
  score: 28,
  flag: "GREEN",
  category: "Low Risk",
  triggeredSignals: [],
  recommendation: "proceed"
}
```

### Escrow Management

```typescript
// Create agreement with Squad virtual account
const agreement = await vouch.escrow.create({
  buyerExternalId: 'buyer_123',
  sellerExternalId: 'seller_456',
  totalAmount: 150000,
  currency: 'NGN',
  milestones: [
    { title: 'Design Phase', amount: 50000 },
    { title: 'Development Phase', amount: 100000 },
  ],
});

// Result
{
  id: "agreement_uuid",
  status: "PENDING",
  squadVirtualAccountNo: "0123456789",
  squadBank: "Squad MFB",
  totalAmount: 150000,
  milestones: [...]
}

// Assess payment risk before buyer pays
const riskCheck = await vouch.escrow.assess('agreement_uuid', {
  externalUserId: 'buyer_123',
  transactionAmount: 150000,
});

// If GREEN: buyer transfers to squadVirtualAccountNo
// Vouch receives Squad webhook → escrow state: FUNDED

// Both parties confirm milestone
await vouch.escrow.confirm('agreement_uuid', 'milestone_uuid', 'buyer_123');
await vouch.escrow.confirm('agreement_uuid', 'milestone_uuid', 'seller_456');

// Squad disbursement triggered automatically
```

---

## API Documentation

### Base URL

**Sandbox:** `http://localhost:3000`  
**Production:** `https://vouch.xyz`

### Authentication

All requests require an API key in the header:

```
x-api-key: sk_test_your_api_key_here
```

### Endpoints

#### `POST /developer/provision`

Create a developer account and generate API key.

**Request:**
```json
{
  "email": "dev@example.com",
  "supabaseUid": "supabase_auth_uid"
}
```

**Response:**
```json
{
  "developer": {
    "id": "dev_uuid",
    "email": "dev@example.com"
  },
  "apiKey": {
    "prefix": "sk_test_abc123",
    "rawKey": "sk_test_abc123def456..." // Shown once
  }
}
```

---

#### `POST /identity/verify`

Verify user identity with document and selfie.

**Content-Type:** `multipart/form-data`

**Fields:**
- `external_user_id` — Your system's user ID
- `device_fingerprint` — Browser fingerprint hash
- `document_image` — File (JPEG/PNG)
- `selfie_images` — Files[] (15 frames from 3-second video)

**Response:**
```json
{
  "status": "success",
  "message": "Identity verified",
  "data": {
    "id": "platform_user_uuid",
    "externalUserId": "user_123",
    "identityVerified": true,
    "identityMatchScore": 94.2,
    "livenessPassed": true,
    "documentType": "drivers_license"
  }
}
```

**Rejection Reasons:**
- `face_not_found` — No face detected in document or selfie
- `liveness_failed` — Liveness detection failed
- `match_below_threshold` — Face match score < 85%
- `document_unreadable` — Document quality too low

---

#### `POST /fraud/assess`

Score fraud risk for a transaction.

**Request:**
```json
{
  "platformUserId": "user_uuid",
  "agreementId": "agreement_uuid",
  "transactionAmount": 150000,
  "deviceFingerprint": "fp_hash",
  "simulateVpn": false,
  "simulateImpossibleTravel": false
}
```

**Response:**
```json
{
  "score": 61,
  "flag": "AMBER",
  "category": "Elevated Risk",
  "triggeredSignals": [
    "device_does_not_match_onboarding",
    "location_distance_530km"
  ],
  "recommendation": "require_additional_verification"
}
```

---

#### `POST /escrow/agreements`

Create escrow agreement with Squad virtual account.

**Request:**
```json
{
  "buyerExternalId": "buyer_123",
  "sellerExternalId": "seller_456",
  "totalAmount": 150000,
  "currency": "NGN",
  "milestones": [
    { "title": "Design Phase", "amount": 50000 },
    { "title": "Development", "amount": 100000 }
  ]
}
```

**Response:**
```json
{
  "id": "agreement_uuid",
  "status": "PENDING",
  "squadVirtualAccountNo": "0123456789",
  "squadBank": "Squad MFB",
  "totalAmount": 150000,
  "milestones": [
    {
      "id": "milestone_uuid",
      "title": "Design Phase",
      "amount": 50000,
      "status": "PENDING"
    }
  ]
}
```

---

#### `POST /escrow/agreements/:id/assess`

Pre-payment fraud assessment.

**Request:**
```json
{
  "external_user_id": "buyer_123",
  "transaction_amount": 150000,
  "device_fingerprint": "fp_hash"
}
```

**Response (GREEN):**
```json
{
  "score": 28,
  "flag": "GREEN",
  "squadVirtualAccountNo": "0123456789",
  "squadBank": "Squad MFB",
  "amount": 150000
}
```

**Response (RED):**
```json
{
  "score": 87,
  "flag": "RED",
  "status": "FROZEN",
  "message": "Transaction blocked due to high fraud risk"
}
```

---

#### `POST /escrow/agreements/:agreementId/milestones/:milestoneId/confirm`

Confirm milestone completion.

**Request:**
```json
{
  "external_user_id": "buyer_123"
}
```

**Response (Both Confirmed → Disbursement Triggered):**
```json
{
  "id": "milestone_uuid",
  "title": "Design Phase",
  "amount": 50000,
  "buyerConfirmed": true,
  "sellerConfirmed": true,
  "status": "DISBURSED",
  "squadTransactionId": "SQD_abc123",
  "disbursedAt": "2026-05-16T14:32:00Z"
}
```

---

#### `GET /developer/logs`

Retrieve developer event logs.

**Query Params:**
- `limit` — Max results (default: 50)
- `offset` — Pagination offset (default: 0)
- `eventType` — Filter by event (e.g., `FRAUD_BLOCKED`)

**Response:**
```json
{
  "logs": [
    {
      "id": "log_uuid",
      "eventType": "FRAUD_BLOCKED",
      "externalUserId": "buyer_123",
      "agreementId": "agreement_uuid",
      "score": 87,
      "flag": "RED",
      "payload": { ... },
      "createdAt": "2026-05-16T14:32:00Z"
    }
  ],
  "total": 156
}
```

---

#### `GET /developer/stats`

Retrieve developer dashboard stats.

**Response:**
```json
{
  "totalChecksToday": 42,
  "redBlocksToday": 3,
  "identitiesVerifiedTotal": 128,
  "activeAgreements": 15,
  "totalEscrowValue": 2450000
}
```

---

## Integration Guide

### Step 1: Developer Onboarding

```typescript
// Your backend calls Vouch after Supabase sign-in
const response = await fetch('https://api.vouch.ai/v1/developer/provision', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: user.email,
    supabaseUid: user.id,
  }),
});

const { developer, apiKey } = await response.json();

// Store apiKey.rawKey securely — shown only once
// Use it to initialize Vouch SDK in your app
```

---

### Step 2: User Identity Verification

```typescript
import Vouch from 'vouch-sdk';

const vouch = new Vouch(process.env.VOUCH_API_KEY);

// Launch Vouch modal
const result = await vouch.identity.verify(yourUserId);

if (result.data.identityVerified) {
  // User passed KYC — allow them to create/join agreements
  await markUserAsVerified(yourUserId);
} else {
  // Show error: identity verification failed
}
```

---

### Step 3: Create Agreement

```typescript
const agreement = await vouch.escrow.create({
  buyerExternalId: yourBuyerId,
  sellerExternalId: yourSellerId,
  totalAmount: 150000,
  milestones: [
    { title: 'Design mockups', amount: 50000 },
    { title: 'Final delivery', amount: 100000 },
  ],
});

// Show buyer the Squad virtual account number
console.log(`Pay to: ${agreement.squadVirtualAccountNo}`);
console.log(`Bank: ${agreement.squadBank}`);
```

---

### Step 4: Pre-Payment Fraud Check

```typescript
const riskCheck = await vouch.escrow.assess(agreement.id, {
  externalUserId: yourBuyerId,
  transactionAmount: 150000,
});

if (riskCheck.flag === 'RED') {
  alert('Payment blocked due to fraud risk');
  // Escrow is now FROZEN
} else if (riskCheck.flag === 'AMBER') {
  // Show additional verification step
  await requestAdditionalVerification();
} else {
  // GREEN — show Squad virtual account for payment
  showPaymentInstructions(riskCheck.squadVirtualAccountNo);
}
```

---

### Step 5: Milestone Confirmation

```typescript
// Buyer confirms work delivered
await vouch.escrow.confirm(agreementId, milestoneId, buyerId);

// Seller confirms delivery
await vouch.escrow.confirm(agreementId, milestoneId, sellerId);

// Both confirmed → Squad disbursement triggered automatically
// Seller receives payment to their bank account
```

---

## Demo Application

A full working demo is included in the `demo/` directory.

### Running the Demo

```bash
cd demo
npm install
npm run dev
```

Open `http://localhost:3000`

### Demo Features

- Developer account provisioning
- Identity verification with live camera
- Agreement creation
- Fraud risk simulation (VPN toggle)
- Milestone confirmation
- Live event dashboard

---

## Deployment

### Backend (NestJS)

**Railway / Render / Heroku:**

```bash
# Set environment variables
DATABASE_URL=postgresql://...
SQUAD_API_KEY=sk_live_...
SQUAD_WEBHOOK_SECRET=...
ML_SERVICE_URL=https://ml.vouch.ai

# Deploy
git push heroku main
```

**Recommended:** Use Railway for auto-deploy from GitHub.

---

### ML Service (FastAPI)

**Railway / Render:**

```bash
# requirements.txt must include:
fastapi
uvicorn
deepface
opencv-python-headless
numpy
pillow

# Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

### Database

Use **Supabase** (free tier) or **Railway Postgres**.

Run migrations:
```bash
npx prisma migrate deploy
```

---

### Squad Webhook Setup

1. Log in to Squad dashboard
2. Go to **Settings → Webhooks**
3. Add webhook URL: `https://api.vouch.ai/v1/squad/webhook`
4. Select events: `payment.success`
5. Save webhook secret to `.env`

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend Framework** | NestJS + TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **ML Service** | FastAPI (Python) |
| **Face Matching** | DeepFace + Facenet512 |
| **Fraud Model** | XGBoost + Rule Engine |
| **SDK** | TypeScript + Axios |
| **Identity UI** | React + face-api.js |
| **Payment Rails** | Squad API |
| **IP Analysis** | IPQualityScore (free tier) |
| **Device Fingerprinting** | FingerprintJS (open source) |

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

### Code Style

- **Backend:** ESLint + Prettier (run `npm run lint`)
- **AI Engine:** Black + isort (run `black .`)

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Support

- **Documentation:** [docs.vouch.ai](https://vouch.xyz/docs)
- **Squad Hackathon:** Team Rave

---

## Acknowledgments

Built for **Squad Hackathon 3.0 · Challenge 01: Proof of Life** by:
- **Backend Engineer:** [Aderemi Ademola]
- **ML Engineer:** [Olaniyi Ezekiel]
- **Frontend Engineer:** [Joshua Peters]

Powered by:
- Squad API for payment infrastructure
- DeepFace for face matching
- Anthropic Claude for development assistance

---

**Vouch SDK — Trust as infrastructure, not an afterthought.**
