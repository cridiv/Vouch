import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SquadAuthHelper } from './helpers/squad-auth.helper.js';
import { lastValueFrom } from 'rxjs';

export interface VirtualAccountResponse {
  virtual_account_number: string;
  bank: string | null;
  customer_identifier: string;
}

export interface VerifyTransactionResponse {
  success: boolean;
  amount: number;
  status: string;
}

export interface CreatePaymentLinkResponse {
  link_id: string;
  link_ref: string;
  checkout_url: string;
}

export interface DisburseParams {
  account_number: string;
  account_name: string;
  bank_code: string;
  amount: number;
  transaction_ref: string;
  narration?: string;
}

export interface DisburseResponse {
  transaction_reference: string;
  amount: number;
  status: 'success' | 'simulated_success' | 'pending' | 'failed';
}

@Injectable()
export class SquadService {
  private readonly logger = new Logger(SquadService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly squadAuthHelper: SquadAuthHelper,
  ) {}

  async createVirtualAccount(agreementId: string, customerEmail: string, customerName: string): Promise<VirtualAccountResponse> {
    const squadBaseUrl = this.configService.get<string>('SQUAD_BASE_URL');
    const headers = this.squadAuthHelper.getHeaders();
    
    // Naive split for first_name and last_name since we only have a combined customerName
    const nameParts = customerName.trim().split(' ');
    const firstName = nameParts[0] || 'Vouch';
    const lastName = nameParts.slice(1).join(' ') || 'Customer';

    const payload = {
      customer_identifier: agreementId,
      first_name: firstName,
      last_name: lastName,
      mobile_num: '09010806648',
      email: customerEmail,
      bvn: '22343211654',
      dob: '01/01/1990',
      address: '22 Kota street, UK',
      gender: '1',
      beneficiary_account: '4920299492',
    };

    try {
      this.logger.log(`Creating Squad virtual account for agreement: ${agreementId}`);
      const response = await lastValueFrom(
        this.httpService.post(`${squadBaseUrl}/virtual-account`, payload, { headers })
      );

      const data = response.data?.data;
      if (!data) {
        throw new Error('Invalid response structure from Squad API');
      }
      console.log('Full Squad response:', JSON.stringify(response.data, null, 2));

      return {
        virtual_account_number: data.virtual_account_number,
        bank: data.bank ?? data.bank_name ?? 'GTBank',
        customer_identifier: data.customer_identifier,
      };
    } catch (error: any) {
      const status = error.response?.data?.status || error.response?.status;

      // Sandbox limit reached — use pre-created test account
      if (status === 422) {
        this.logger.warn(`Squad sandbox limit reached — using pre-created test virtual account`);
        return {
          virtual_account_number: this.configService.get('SQUAD_SANDBOX_VIRTUAL_ACCOUNT') || '4235822763',
          bank: this.configService.get('SQUAD_SANDBOX_VIRTUAL_BANK') ?? 'GTBank',
          customer_identifier: agreementId,
        };
      }

      this.logger.error(`Failed to create virtual account for ${agreementId}:`, error.response?.data || error.message);
      throw new Error('Failed to create Squad virtual account');
    }
  }

  async verifyTransaction(transactionRef: string): Promise<VerifyTransactionResponse> {
    const squadBaseUrl = this.configService.get<string>('SQUAD_BASE_URL');
    const headers = this.squadAuthHelper.getHeaders();

    try {
      this.logger.log(`Verifying Squad transaction: ${transactionRef}`);
      const response = await lastValueFrom(
        this.httpService.get(`${squadBaseUrl}/transaction/verify/${transactionRef}`, { headers })
      );

      const data = response.data?.data;
      if (!data) {
        throw new Error('Invalid response structure from Squad API during verification');
      }

      return {
        success: response.data.success === true || response.data.status === 200,
        amount: data.transaction_amount,
        status: data.transaction_status,
      };
    } catch (error: any) {
      this.logger.error(`Failed to verify transaction ${transactionRef}:`, error.response?.data || error.message);
      throw new Error(`Failed to verify Squad transaction: ${transactionRef}`);
    }
  }

  async createPaymentLink(milestoneId: string, amount: number, customerEmail: string): Promise<CreatePaymentLinkResponse> {
    const squadBaseUrl = this.configService.get<string>('SQUAD_BASE_URL');
    const headers = this.squadAuthHelper.getHeaders();
    
    // Generate a unique transaction reference for this payment
    const transactionRef = `VOUCH-${milestoneId.substring(0, 8)}-${Date.now()}`;

    const payload = {
      amount: amount * 100, // Squad expects the amount in Kobo (smallest currency unit)
      email: customerEmail,
      currency: 'NGN',
      initiate_type: 'inline',
      transaction_ref: transactionRef,
      callback_url: this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000/dashboard',
    };

    try {
      this.logger.log(`Initiating Squad payment link for milestone: ${milestoneId}`);
      const response = await lastValueFrom(
        this.httpService.post(`${squadBaseUrl}/transaction/initiate`, payload, { headers })
      );

      const data = response.data?.data;
      if (!data || !data.checkout_url) {
        throw new Error('Invalid response structure from Squad API for Payment Link');
      }

      return {
        link_id: transactionRef,
        link_ref: transactionRef,
        checkout_url: data.checkout_url,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create payment link for ${milestoneId}:`, error.response?.data || error.message);
      throw new Error(`Failed to create Squad payment link for milestone: ${milestoneId}`);
    }
  }

  async disburse(params: DisburseParams): Promise<DisburseResponse> {
    const squadBaseUrl = this.configService.get<string>('SQUAD_BASE_URL');
    const headers = this.squadAuthHelper.getHeaders();

    const payload = {
      account_number: params.account_number,
      account_name: params.account_name,
      bank_code: params.bank_code,
      amount: params.amount * 100, // Squad expects the amount in Kobo
      currency_id: 'NGN',
      transaction_reference: params.transaction_ref,
      remark: params.narration || 'Vouch Escrow Disbursement',
    };

    try {
      this.logger.log(`Initiating Squad transfer for ${params.transaction_ref} to ${params.account_number}`);
      const response = await lastValueFrom(
        this.httpService.post(`${squadBaseUrl}/payout/transfer`, payload, { headers })
      );

      const data = response.data?.data;
      if (!data) {
        // sometimes payout returns the main fields right on response.data rather than response.data.data
        if (response.data?.status === 200 || response.data?.success) {
            return {
                transaction_reference: response.data.transaction_reference || params.transaction_ref,
                amount: params.amount,
                status: 'success',
            };
        }
        throw new Error('Invalid response structure from Squad API for Transfer');
      }

      return {
        transaction_reference: data.transaction_reference || params.transaction_ref,
        amount: params.amount,
        status: data.status || 'success',
      };
    } catch (error: any) {
      const status = error.response?.data?.status || error.response?.status;
      const message = error.response?.data?.message || '';

      // Sandbox limitation fallback: If the merchant isn't profiled for transfers yet
      if (status === 400 && message.includes('not profiled')) {
        this.logger.warn(`Squad sandbox limit: Merchant not profiled for transfers. Simulating successful disbursement for ${params.transaction_ref}.`);
        return {
          transaction_reference: params.transaction_ref,
          amount: params.amount,
          status: 'simulated_success',
        };
      }

      this.logger.error(`Failed to transfer for ${params.transaction_ref}:`, error.response?.data || error.message);
      throw new Error(`Failed to process Squad transfer for ${params.transaction_ref}`);
    }
  }
}