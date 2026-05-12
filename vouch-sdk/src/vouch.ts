import { getDeviceFingerprint } from './fingerprint.js';

export interface MilestoneInput {
  title: string;
  amount: number;
  deadline: string;
}

export interface CreateAgreementParams {
  title: string;
  description?: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  milestones: MilestoneInput[];
}

export interface AssessParams {
  externalUserId: string;
  transactionAmount: number;
  simulateVpn?: boolean;
  simulateImpossibleTravel?: boolean;
}

export class Vouch {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl = 'http://localhost:5000/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async post(path: string, body: object) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`Vouch SDK HTTP Error: ${res.status} - ${text}`);
    }

    return res.json();
  }

  identity = {
    verify: async (
      documentFile: File | Blob,
      selfieFile: File | Blob,
      externalUserId: string
    ) => {
      // Silently capture fingerprint
      const deviceFingerprint = await getDeviceFingerprint();

      // Convert files to base64
      const documentBase64 = await fileToBase64(documentFile);
      const selfieBase64 = await fileToBase64(selfieFile);

      return this.post('/identity/verify', {
        external_user_id: externalUserId,
        document_image: documentBase64,
        selfie_image: selfieBase64,
        device_fingerprint: deviceFingerprint,  // ← invisible to the dev
      });
    }
  };

  escrow = {
    create: async (params: CreateAgreementParams) => {
      return this.post('/escrow/agreements', params);
    },

    assess: async (agreementId: string, params: AssessParams) => {
      // Silently capture fingerprint
      const deviceFingerprint = await getDeviceFingerprint();

      return this.post(`/escrow/agreements/${agreementId}/assess`, {
        external_user_id: params.externalUserId,
        transaction_amount: params.transactionAmount,
        device_fingerprint: deviceFingerprint,  // ← invisible to the dev
        simulate_vpn: params.simulateVpn,
        simulate_impossible_travel: params.simulateImpossibleTravel,
      });
    },

    confirm: async (
      agreementId: string,
      milestoneId: string,
      externalUserId: string
    ) => {
      return this.post(
        `/escrow/agreements/${agreementId}/milestones/${milestoneId}/confirm`,
        { external_user_id: externalUserId }
      );
    },

    status: async (agreementId: string) => {
      const res = await fetch(
        `${this.baseUrl}/escrow/agreements/${agreementId}`,
        { headers: { 'x-api-key': this.apiKey } }
      );

      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        throw new Error(`Vouch SDK HTTP Error: ${res.status} - ${text}`);
      }

      return res.json();
    }
  };
}

// Helper
function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract only the raw base64 data, removing the data-URL prefix
      resolve(result.split(',')[1] || result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
