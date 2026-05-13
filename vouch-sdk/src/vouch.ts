import axios, { AxiosInstance } from 'axios';
import { getDeviceFingerprint } from './fingerprint.js';

export interface IdentityVerifyResult {
  status: string;
  message: string;
  data: {
    id: string;
    externalUserId: string;
    identityVerified: boolean;
    identityMatchScore?: number | null;
    livenessPassed: boolean;
    documentType?: string | null;
  };
}

export interface FraudAssessParams {
  platformUserId: string;
  agreementId?: string;
  transactionAmount: number;
  simulateVpn?: boolean;
  simulateImpossibleTravel?: boolean;
}

export interface FraudAssessResult {
  score: number;
  flag: 'GREEN' | 'AMBER' | 'RED';
  category: string;
  triggeredSignals: string[];
  recommendation: string;
}

export interface MilestoneInput {
  title: string;
  amount: number;
}

export interface CreateAgreementParams {
  buyerExternalId: string;
  sellerExternalId: string;
  totalAmount: number;
  currency?: string;
  milestones: MilestoneInput[];
  buyerEmail?: string;
  buyerName?: string;
}

export interface AgreementResponse {
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

export interface AssessPaymentParams {
  externalUserId: string;
  transactionAmount: number;
  simulateVpn?: boolean;
  simulateImpossibleTravel?: boolean;
}

export interface AssessPaymentResponse {
  score: number;
  flag: string;
  squadVirtualAccount?: {
    accountNumber: string;
    bankCode: string;
    accountName: string;
  };
}

export class Vouch {
  private readonly http: AxiosInstance;

  constructor(apiKey: string) {
    const baseURL = (typeof process !== 'undefined' && process.env?.VOUCH_API_URL) || 'http://localhost:5000/v1';
    this.http = axios.create({
      baseURL,
      headers: { 'x-api-key': apiKey },
    });
  }

  identity = {
    verify: async (
      documentFile: File | Blob,
      selfieFile: File | Blob,
      externalUserId: string
    ): Promise<IdentityVerifyResult> => {
      const deviceFingerprint = await getDeviceFingerprint();

      const formData = new FormData();
      formData.append('external_user_id', externalUserId);
      formData.append('device_fingerprint', deviceFingerprint);
      formData.append('document_image', documentFile, 'document.png');
      formData.append('selfie_image', selfieFile, 'selfie.png');

      const res = await this.http.post<IdentityVerifyResult>('/identity/verify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
  };

  fraud = {
    assess: async (params: FraudAssessParams): Promise<FraudAssessResult> => {
      const deviceFingerprint = await getDeviceFingerprint();
      const res = await this.http.post<FraudAssessResult>('/fraud/assess', {
        platformUserId: params.platformUserId,
        agreementId: params.agreementId,
        transactionAmount: params.transactionAmount,
        deviceFingerprint,
        simulateVpn: params.simulateVpn,
        simulateImpossibleTravel: params.simulateImpossibleTravel,
      });
      return res.data;
    },
  };

  escrow = {
    create: async (params: CreateAgreementParams): Promise<AgreementResponse> => {
      const res = await this.http.post<AgreementResponse>('/escrow/agreements', params);
      return res.data;
    },

    assess: async (
      agreementId: string,
      params: AssessPaymentParams
    ): Promise<AssessPaymentResponse> => {
      const deviceFingerprint = await getDeviceFingerprint();
      const res = await this.http.post<AssessPaymentResponse>(
        `/escrow/agreements/${agreementId}/assess`,
        {
          external_user_id: params.externalUserId,
          transaction_amount: params.transactionAmount,
          device_fingerprint: deviceFingerprint,
          simulate_vpn: params.simulateVpn,
          simulate_impossible_travel: params.simulateImpossibleTravel,
        }
      );
      return res.data;
    },

    confirm: async (
      agreementId: string,
      milestoneId: string,
      externalUserId: string
    ) => {
      const res = await this.http.post(
        `/escrow/agreements/${agreementId}/milestones/${milestoneId}/confirm`,
        { external_user_id: externalUserId }
      );
      return res.data;
    },

    status: async (agreementId: string): Promise<AgreementResponse> => {
      const res = await this.http.get<AgreementResponse>(`/escrow/agreements/${agreementId}`);
      return res.data;
    },
  };
}

export default Vouch;

// Helper
async function fileToBase64(file: File | Blob | any): Promise<string> {
  if (typeof FileReader === 'undefined') {
    // Node.js environment
    const buffer = await file.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
