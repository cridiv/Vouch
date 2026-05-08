# TrustLayer SDK — Team Brief
### Squad Hackathon 3.0 · Challenge 01: Proof of Life

> **One-line pitch:** A plug-and-play trust infrastructure for digital transactions — we verify identity before onboarding, score fraud risk before every payment, and only move money through Squad when our AI says it is safe.

---

## Table of Contents

1. [The Idea](#1-the-idea)
2. [How It Works](#2-how-it-works)
3. [Squad API Integration](#3-squad-api-integration--the-load-bearing-layer)
4. [The Fraud Signal Stack](#4-the-fraud-signal-stack)
5. [Role Definitions](#5-role-definitions)
6. [API Contract](#6-api-contract)
7. [Pitch Deck Guide](#7-pitch-deck-guide)
8. [Critical Path](#8-critical-path)

---

## 1. The Idea

### The Problem

Digital marketplaces in Nigeria — freelancing platforms, e-commerce, peer-to-peer trading — suffer from a fundamental trust gap.

> **Scenario A — The Ghost Vendor**
> A buyer pays ₦150,000 to a vendor on Instagram. The vendor disappears. No product. No refund. No recourse.

> **Scenario B — The Disappearing Buyer**
> A freelancer delivers a completed website. The client claims it does not meet requirements and refuses to pay. Three weeks of work, zero naira received.

The core issue is not payment infrastructure — Squad and others have solved the payment rails. **The core issue is that money moves before trust is established.** TrustLayer fixes this by making trust a first-class requirement before any payment is initiated.

---

### How This Maps to Challenge 01

Challenge 01 asks for an AI-powered verification system that addresses real, documented fraud. We map directly to the **Financial Services** domain: scoring the trustworthiness of individuals and transactions using behavioural signals, document verification, and network analysis.

| Challenge Requirement | Our Implementation |
|---|---|
| AI as the core verification engine | Fraud Detection Model scores every transaction before payment |
| Trust score or pass/fail output | 0–100 risk score mapped to GREEN / AMBER / RED |
| Document verification | Computer vision + face matching on government-issued ID |
| Edge cases: forged or incomplete data | Liveness detection, anomaly signals, incomplete data fallback |
| Squad API integration | Squad is the escrow vault — called only after AI clearance |

---

## 2. How It Works

### The Three Layers

| Layer | Name | What It Does |
|---|---|---|
| Layer 1 | Identity Verification | Who are you? Verify the person and document before they can join any agreement |
| Layer 2 | Fraud Detection Engine | Is this transaction safe? Score risk before Squad is ever called |
| Layer 3 | Escrow + Squad Rails | Squad virtual account holds funds. AI controls when they are released |

---

### The Full Transaction Flow

Every step has a verification gate. No step is optional.

```
STEP 1 — USER ONBOARDS (Identity Layer)
  → User uploads government-issued photo ID
  → Computer vision extracts face region and document fields
  → User takes live selfie — liveness check performed (blink / head turn)
  → Face match score computed — threshold 85% for PASS
  → identity_verified = true stored against user account
  → Cannot create or join an agreement without passing this step

STEP 2 — AGREEMENT CREATED (Escrow Layer)
  → Buyer and seller linked — both must have verified identities
  → Milestones defined: title, amount, deadline
  → Squad virtual account created for this agreement ← NEW
  → Virtual account number returned and stored against agreement
  → Escrow state: PENDING

STEP 3 — BUYER PAYS INTO SQUAD VIRTUAL ACCOUNT (Fraud Engine)
  → Fraud context assembled from all signals (see Section 4)
  → Context sent synchronously to Fraud Decision Model
  → Model returns: score, flag, triggered signals
  → GREEN (0–39)  → Squad virtual account details surfaced to buyer. Payment proceeds.
  → AMBER (40–69) → Additional verification step. Then proceed if cleared.
  → RED   (70+)   → Payment blocked. Escrow frozen. Squad never involved.
  → Buyer pays into the Squad virtual account (not to seller — to escrow)
  → Squad webhook fires → transaction metadata fed back into fraud engine signals
  → Escrow state: FUNDED

STEP 4 — WORK IN PROGRESS
  → Seller delivers
  → Escrow state: IN_PROGRESS

STEP 5 — DELIVERY CONFIRMED + DISBURSEMENT (Squad Rails)
  → Both parties confirm delivery
  → Fraud engine runs lighter check on seller side
  → Both confirmed + fraud clear → escrow state: COMPLETED
  → Squad payment link generated scoped to milestone amount ← NEW
  → Squad disbursement triggered to seller's account
  → Transaction logged with Squad transaction ID as audit reference
  → Escrow state: DISBURSED
```

---

## 3. Squad API Integration — The Load-Bearing Layer

This is the section that determines whether you score 10/20 or 20/20 on integration.

### The Problem With a Weak Integration

If Squad's only role is "payment button triggered after GREEN score" — a judge will see that as swappable. Remove Squad, replace with Paystack, nothing breaks. That scores 10–12/20.

**The test:** Would this product fundamentally break if you removed Squad? The answer must be **yes**.

---

### The Three Ways Squad Is Load-Bearing

#### 1. Squad Virtual Accounts as the Escrow Vault

Instead of initiating a payment to the seller, you create a **Squad virtual account per agreement**. The buyer pays *into* that account. Funds sit there, held in escrow. When the fraud engine clears delivery, you disburse *from* that account to the seller.

Squad is not the payment button. **Squad is the escrow vault.** Remove Squad and the entire escrow concept collapses — there is nowhere to hold the funds.

```
escrow.create(agreement)
  → calls Squad: POST /virtual-account/create
  → stores squad_virtual_account_id against agreement
  → buyer pays to this account number, not to seller
```

#### 2. Squad Webhook Data Fed Back into the Fraud Engine

Squad's payment webhook gives you transaction metadata: amount, timestamp, channel, card BIN, payer details. **Feed this back into your fraud context store as additional signals.**

Squad is not just outputting money. **Squad is inputting intelligence to your AI.** This directly ties Squad to the AI pillar of the judging criteria.

```
// New fraud signals from Squad webhook
"squad_payment_channel": "card",
"squad_card_bin": "539983",         // first 6 digits — issuing bank
"squad_payer_name": "John Doe",
"squad_payment_timestamp": "2026-05-08T14:32:00Z",
"squad_amount_matches_agreement": true,
"squad_transaction_ref": "SQD_abc123"
```

These signals feed into the next fraud assessment (e.g. on delivery confirmation). A card BIN from a known fraud-associated bank, or a payer name that does not match the verified identity, becomes an additional RED trigger.

#### 3. Squad Payment Links for Milestone Disbursement

When a milestone is approved, generate a **Squad payment link scoped to that specific milestone amount**. Every disbursement is a traceable Squad transaction with its own reference ID.

Your audit trail is Squad transaction IDs — not just your database records. Every naira released is verifiable on Squad's dashboard. This makes Squad central to your transparency and trust story.

```
escrow.confirm(agreementId, milestoneId)
  → fraud engine clears → escrow state: COMPLETED
  → calls Squad: POST /payment-link/create  { amount: milestone.amount }
  → calls Squad: POST /disburse  { reference: squad_payment_link_ref }
  → stores squad_transaction_id as immutable audit record
```

---

### Complete Squad API Touchpoint Map

| Squad API Call | When It Is Called | Why It Is Meaningful |
|---|---|---|
| `POST /virtual-account/create` | On `escrow.create()` | Creates the escrow vault per agreement |
| Buyer pays to virtual account | Buyer initiates payment | Funds held in Squad, not sent to seller |
| `POST /webhook` (inbound) | Squad fires on payment | Transaction metadata fed to fraud engine |
| `GET /transaction/verify` | After webhook received | Confirms payment before escrow → FUNDED |
| `POST /payment-link/create` | On milestone approval | Scoped disbursement with audit reference |
| `POST /disburse` | After milestone confirmed | Releases funds from escrow to seller |

### The Line You Say to Judges

> *"Squad is not our payment provider. Squad is our escrow infrastructure. Every agreement has a Squad virtual account. Every fraud signal we score includes Squad transaction data from Squad's webhooks. Every naira that moves does so through a Squad disbursement triggered by our AI — not by a human clicking a button."*

---

## 4. The Fraud Signal Stack

The backend assembles a context payload from four signal categories before every payment. This is the data contract between the backend dev and the ML engineer.

### Category A — Network & Location

| Signal | Description | Logic |
|---|---|---|
| `ip_address` | Raw IP of the request | Feed to IP reputation API |
| `ip_reputation_score` | 0–100 score | Low score = suspicious |
| `is_vpn` | Boolean | Instant AMBER trigger |
| `is_proxy` | Boolean | Instant AMBER trigger |
| `geolocation` | Derived from IP | Cross-check with onboarding location |
| `onboarding_location` | Stored at KYC time | Baseline for travel checks |
| `location_distance_km` | Distance now vs onboarding | High distance = elevated flag |
| `impossible_travel` | Physically impossible movement | Hard RED trigger |

### Category B — Device

| Signal | Description | Logic |
|---|---|---|
| `device_fingerprint` | Hash of browser/OS/screen/font | FingerprintJS OSS |
| `device_seen_before` | Has this fingerprint transacted? | New device = mild flag |
| `device_matches_onboarding` | Same device used at KYC? | Mismatch = elevated flag |

### Category C — Behavioural / Account

| Signal | Description | Logic |
|---|---|---|
| `account_age_days` | Days since account created | Very new = flagged |
| `previous_transactions` | Count of completed transactions | Zero history = new risk |
| `transaction_amount` | This payment's amount | Unusually large = flag |
| `time_since_last_tx_hrs` | Hours since previous transaction | Rapid velocity = flag |

### Category D — Identity (from ML Layer 1)

| Signal | Description | Source |
|---|---|---|
| `identity_verified` | Passed KYC onboarding? | ML engineer endpoint |
| `identity_match_score` | Face match score | ML engineer endpoint |
| `liveness_passed` | Liveness check passed? | ML engineer endpoint |

### Category E — Squad Transaction Signals (NEW)

| Signal | Description | Source |
|---|---|---|
| `squad_payment_channel` | card / bank transfer / USSD | Squad webhook |
| `squad_card_bin` | First 6 digits of card | Squad webhook |
| `squad_payer_name` | Name on payment | Squad webhook |
| `squad_amount_matches_agreement` | Amount paid = agreement amount? | Backend validation |
| `squad_transaction_ref` | Squad transaction ID | Squad webhook |

---

### The Full Context JSON

```json
POST /fraud/assess

{
  "transaction_id": "txn_abc123",
  "user_id": "usr_xyz",

  "ip_address": "197.210.84.1",
  "ip_reputation_score": 82,
  "is_vpn": false,
  "is_proxy": false,
  "geolocation": { "country": "NG", "city": "Lagos" },
  "onboarding_location": { "country": "NG", "city": "Abuja" },
  "location_distance_km": 530,
  "impossible_travel": false,

  "device_fingerprint": "fp_d3a9c1b2",
  "device_seen_before": true,
  "device_matches_onboarding": false,

  "account_age_days": 14,
  "previous_transactions": 3,
  "transaction_amount": 150000,
  "time_since_last_tx_hrs": 0.4,

  "identity_verified": true,
  "identity_match_score": 94.2,
  "liveness_passed": true,

  "squad_payment_channel": "card",
  "squad_card_bin": "539983",
  "squad_payer_name": "John Doe",
  "squad_amount_matches_agreement": true,
  "squad_transaction_ref": "SQD_abc123"
}
```

### The Fraud Score Response

```json
{
  "score": 61,
  "flag": "AMBER",
  "category": "Elevated Risk",
  "triggered_signals": [
    "device_does_not_match_onboarding",
    "location_distance_530km"
  ],
  "recommendation": "require_additional_verification",
  "processing_time_ms": 84
}
```

| Flag | Score Range | Action |
|---|---|---|
| GREEN | 0–39 | Squad virtual account surfaced to buyer. Payment proceeds. |
| AMBER | 40–69 | Additional verification step triggered. Proceed if cleared. |
| RED | 70–100 | Payment blocked. Escrow frozen. Squad never called. |

---

## 5. Role Definitions

### Backend Developer — Squad API + SDK + Context Engine

**You own:** fraud context assembler, escrow state machine, Squad API integration, SDK.

#### What You Build

- User and agreement management (CRUD)
- On `escrow.create()` → call Squad virtual account creation, store account ID against agreement
- Fraud context aggregator — collects all signals and assembles the JSON payload
- IP/VPN detection — `ipqualityscore.com` free tier or `ip-api.com`
- Device fingerprint capture endpoint — receives hash from frontend (FingerprintJS)
- Escrow state machine: `PENDING → FUNDED → IN_PROGRESS → COMPLETED → FROZEN → DISBURSED`
- Squad webhook handler — parse transaction metadata, append Squad signals to fraud store
- On `escrow.confirm()` → call Squad payment link creation + Squad disbursement API
- SDK: three clean public methods (see Section 6)

#### Your Interfaces

**You receive from ML engineer:**
- Identity result at onboarding: `{ verified, match_score, liveness_passed }`
- Fraud score at payment time: `{ score, flag, category, triggered_signals }`

**You send to ML engineer:**
- Fraud context JSON (full schema in Section 4)
- Document image + selfie at onboarding (base64)

**You call on Squad:**
- Virtual account creation on agreement creation
- Transaction verification after webhook received
- Payment link creation on milestone approval
- Disbursement on escrow completion

---

### ML Engineer — Identity Verification + Fraud Decision Model

**You own:** two HTTP endpoints. That is your entire surface area. Keep them stable.

#### Model 1 — Identity Verification (`POST /identity/verify`)

- Input: document image + selfie (base64), optional liveness frames
- Computer vision: extract face from document (OpenCV / DeepFace)
- Face comparison: DeepFace — free, runs locally, no API key needed
- Liveness: blink or head turn detection from frames
- Output: `{ verified, match_score, liveness_passed, document_type, rejection_reason }`

#### Model 2 — Fraud Decision Engine (`POST /fraud/assess`)

- Input: full context JSON from backend (Section 4)
- Model: XGBoost or weighted rule engine on synthetic/rule-seeded data
- Output: `{ score, flag, category, triggered_signals, recommendation }`
- **Must be synchronous** — backend waits for this response before proceeding

#### Demo Requirement

You must be able to show a score change live. When the frontend toggles VPN simulation (`is_vpn: true`, `impossible_travel: true`), your model must return a RED flag. This is the highlight moment of the demo — own it.

---

### Frontend Developer — Freelancing Demo Platform

**You own:** the platform that makes the SDK look real.

#### The Three Screens That Must Work

1. **Onboarding** — document upload + selfie → identity match score displayed
2. **Create Agreement** — milestone setup, Squad virtual account number shown to buyer
3. **Payment Screen** — fraud engine running visibly, score + flag displayed, then payment proceeds or blocks

#### SDK Calls in Your Code

```typescript
// Onboarding
const identity = await sdk.identity.verify(documentFile, selfieFile);
// → { verified: true, match_score: 94.2, flag: 'GREEN' }

// Before payment — show score to user
const fraud = await sdk.fraud.assess(transactionContext);
// → { score: 28, flag: 'GREEN', category: 'Low Risk' }

// Fund the escrow (buyer pays to Squad virtual account)
const escrow = await sdk.escrow.fund(agreementId);
// → { squad_virtual_account: '0123456789', bank: 'Squad MFB' }

// Confirm delivery (triggers Squad disbursement)
await sdk.escrow.confirm(agreementId, milestoneId);
```

#### The VPN Demo Toggle

Add a **"Simulate Suspicious Transaction"** toggle in the UI. When enabled, pass `is_vpn: true` and `impossible_travel: true` in the transaction context. Score jumps to RED. Payment blocked visibly. Run this live in front of judges — it is your best moment.

---

## 6. API Contract

> **Lock this in before anyone writes production code.**

### Contract 1 — Identity Verification

**Called by:** Backend · **Served by:** ML Engineer

```
POST /identity/verify
Content-Type: multipart/form-data

Fields:
  document_image   — base64 or file (JPEG/PNG)
  selfie_image     — base64 or file (JPEG/PNG)
  selfie_frames[]  — optional, 3–5 frames for liveness
  user_id          — string, for audit logging
```

```json
// Response
{
  "verified": true,
  "match_score": 94.2,
  "liveness_passed": true,
  "document_type": "drivers_license",
  "face_extracted": true,
  "rejection_reason": null,
  "processing_time_ms": 320
}

// Rejection reasons: face_not_found | liveness_failed | match_below_threshold | document_unreadable
```

---

### Contract 2 — Fraud Assessment

**Called by:** Backend · **Served by:** ML Engineer

```json
// Request
POST /fraud/assess

{
  "transaction_id": "txn_abc123",
  "user_id": "usr_xyz",
  "ip_address": "197.210.84.1",
  "ip_reputation_score": 82,
  "is_vpn": false,
  "is_proxy": false,
  "geolocation": { "country": "NG", "city": "Lagos" },
  "onboarding_location": { "country": "NG", "city": "Abuja" },
  "location_distance_km": 530,
  "impossible_travel": false,
  "device_fingerprint": "fp_d3a9c1b2",
  "device_seen_before": true,
  "device_matches_onboarding": false,
  "account_age_days": 14,
  "previous_transactions": 3,
  "transaction_amount": 150000,
  "time_since_last_tx_hrs": 0.4,
  "identity_verified": true,
  "identity_match_score": 94.2,
  "liveness_passed": true,
  "squad_payment_channel": "card",
  "squad_card_bin": "539983",
  "squad_payer_name": "John Doe",
  "squad_amount_matches_agreement": true,
  "squad_transaction_ref": "SQD_abc123"
}
```

```json
// Response
{
  "score": 61,
  "flag": "AMBER",
  "category": "Elevated Risk",
  "triggered_signals": [
    "device_does_not_match_onboarding",
    "location_distance_530km"
  ],
  "recommendation": "require_additional_verification",
  "processing_time_ms": 84
}
```

---

### Contract 3 — SDK Public Methods

**Exposed by:** Backend · **Consumed by:** Frontend

```typescript
// Identity
sdk.identity.verify(documentFile: File, selfieFile: File, frames?: File[])
// → Promise<{ verified: boolean, match_score: number, flag: 'GREEN'|'AMBER'|'RED' }>

// Fraud
sdk.fraud.assess(context: TransactionContext)
// → Promise<{ score: number, flag: string, category: string, triggered_signals: string[] }>

// Escrow
sdk.escrow.create(agreement: AgreementInput)
// → Promise<Agreement & { squad_virtual_account: string }>

sdk.escrow.fund(agreementId: string)
// → Promise<{ squad_virtual_account: string, bank: string, amount: number }>

sdk.escrow.confirm(agreementId: string, milestoneId: string)
// → Promise<{ status: EscrowStatus, squad_transaction_id: string, disbursed: boolean }>

sdk.escrow.status(agreementId: string)
// → Promise<Agreement & { milestones: Milestone[], squad_refs: string[] }>
```

---

### Contract 4 — Squad API Calls (Backend Responsibility)

| Squad Call | Trigger | What Is Stored |
|---|---|---|
| `POST /virtual-account/create` | `escrow.create()` | `squad_virtual_account_id` on agreement |
| Inbound webhook | Squad fires on payment | Squad signals appended to fraud store |
| `GET /transaction/verify` | After webhook received | Confirms before escrow → FUNDED |
| `POST /payment-link/create` | Milestone approved | Payment link ref stored |
| `POST /disburse` | `escrow.confirm()` | `squad_transaction_id` as audit record |

---

## 7. Pitch Deck Guide

### Slide-by-Slide

| Slide | Title | What Goes Here |
|---|---|---|
| 1 | The Problem | The two scenarios. Ghost vendor. Disappearing buyer. Make it feel real. |
| 2 | Target User | The freelancer who has been ghosted. The buyer who has been scammed. Name them. |
| 3 | Solution Overview | Three layers: identity, fraud engine, escrow. Diagram of the flow. |
| 4 | Squad API Integration | Virtual account per agreement. Webhook feeds AI. Disbursement is traceable. Use the judge line from Section 3. |
| 5 | AI / Data Intelligence | Four signal categories + Squad signals. The score. GREEN/AMBER/RED. Model does real work. |
| 6 | User Flow | Onboarding → identity verified → agreement + Squad virtual account → payment scored → blocked or proceeds → delivery → Squad disbursement. |
| 7 | Impact Potential | Every freelancing platform, marketplace, P2P app in Nigeria can plug in this SDK. |
| 8 | Scalability & Business Model | SDK licensing per transaction. Fraud model improves with every transaction. White-label option. |
| 9 | Research & Validation | Fraud statistics in Nigerian digital commerce. Document the ghost vendor / ghost worker problem. |
| 10 | The Team | Three people, three layers. Show the split matches the architecture. Previous Nerave work = proof. |

---

### The Five-Minute Demo Script

Practice this order. Do not deviate on the day.

1. Open the freelancing platform. Show the onboarding screen.
2. Upload a document + selfie. Show the identity match score appearing.
3. Create an agreement. Show milestones. **Show the Squad virtual account number generated.**
4. Initiate payment as the buyer. Fraud engine runs — score appears, GREEN, Squad virtual account surfaced for payment.
5. **Toggle VPN simulation.** Initiate payment again. Score jumps to RED. Payment blocked. Escrow frozen. Squad never called. This is your highlight moment.
6. Turn off VPN. Payment proceeds to Squad virtual account. Seller confirms delivery. Squad disbursement triggered. Squad transaction ID shown as audit record.

> **The moment judges remember:** Step 5. The RED block. Build this first.

---

## 8. Critical Path

### Day 1 — Do These Before Writing Any Feature Code

1. All three agree on the fraud context JSON schema (Section 4). Lock it. Do not start coding until done.
2. ML engineer: get DeepFace returning a match score locally. Even rough. You need a working endpoint.
3. Backend: get Squad sandbox credentials. Start this immediately — approval takes time.
4. Backend: scaffold escrow state machine before Squad integration.
5. Agree on base URLs for ML endpoints so backend can wire up HTTP calls.

### Dependency Risk Map

| Risk | What It Breaks |
|---|---|
| Context schema not agreed | Backend cannot build aggregator. ML cannot build model. Frontend has no data to display. |
| ML endpoint not stable | Backend cannot test fraud flow end-to-end. |
| Squad sandbox delayed | Virtual account creation, webhooks, and disbursement all blocked. |
| VPN detection library unreliable | Your best demo signal does not work. Test early. |
| Frontend cannot consume SDK | No live demo. Judges see slides only. |

### Recommended Stack

| Piece | Tool |
|---|---|
| Backend framework | NestJS + TypeScript |
| Database | PostgreSQL + Prisma |
| IP / VPN detection | `ipqualityscore.com` free tier or `ip-api.com` |
| Device fingerprinting | FingerprintJS open source (frontend, sends hash to backend) |
| Face matching | DeepFace (Python, local, no API key) |
| Fraud model | XGBoost or weighted rule engine in Python |
| SDK | TypeScript + Axios |
| Demo frontend | React + Vite |
| Payment rails | Squad API sandbox |

---

*TrustLayer SDK — because trust should be infrastructure, not an afterthought.*
