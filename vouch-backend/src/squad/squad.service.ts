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
}