// Core types for the test harness

export interface SavedState {
  apiKey: string | null;
  developerId: string | null;
  buyerId: string | null;
  sellerId: string | null;
  agreementId: string | null;
  backendUrl: string;
}

export interface IdentityResult {
  verified: boolean;
  match_score: number;
  liveness_passed: boolean;
  document_type: string;
  rejection_reason: string | null;
}

export interface FraudResult {
  score: number;
  flag: 'GREEN' | 'AMBER' | 'RED';
  category: string;
  triggered_signals: string[];
  recommendation: string;
}

export interface Agreement {
  agreementId: string;
  status: string;
  squadVirtualAccountNo: string;
  squadBank: string;
  totalAmount: number;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  amount: number;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  status: string;
  squadTransactionId?: string;
}

export interface DeveloperLog {
  id: string;
  eventType: string;
  externalUserId?: string;
  agreementId?: string;
  score?: number;
  flag?: string;
  payload: any;
  createdAt: string;
}

export interface DeveloperStats {
  totalChecksToday: number;
  redBlocksToday: number;
  identitiesVerifiedTotal: number;
  activeAgreements: number;
  totalEscrowValue: number;
}
