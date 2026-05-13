import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContextBuilderService, BuildContextParams } from './context/context-builder.service.js';
import { DeveloperLogService } from '../common/services/developer-log.service.js';
import { FraudFlag } from '@prisma/client';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

export interface AssessFraudParams extends BuildContextParams {
  developerId: string;
}

export interface FraudResultDto {
  score: number;
  flag: FraudFlag;
  category: string;
  triggered_signals: string[];
  recommendation: 'proceed' | 'require_additional_verification' | 'block';
  processing_time_ms: number;
}

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contextBuilderService: ContextBuilderService,
    private readonly developerLogService: DeveloperLogService,
    private readonly httpService: HttpService,
  ) {}

  async assess(params: AssessFraudParams): Promise<FraudResultDto> {
    const startTime = Date.now();

    // 1. Build the full context
    const context = await this.contextBuilderService.build(params);

    // 2. Call ML Endpoint
    let result: FraudResultDto;
    try {
      const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8080';
      const response = await lastValueFrom(
        this.httpService.post(`${mlUrl}/fraud/assess`, context, { timeout: 30000 })
      );
      result = response.data;
    } catch (error) {
      this.logger.error(`CRITICAL: ML Service unavailable or failed for tx ${params.transactionId}`, error);
      // Default to AMBER if ML engine fails
      result = {
        score: 50,
        flag: 'AMBER',
        category: 'Service Unavailable - Elevated Risk Default',
        triggered_signals: ['ml_service_down'],
        recommendation: 'require_additional_verification',
        processing_time_ms: Date.now() - startTime,
      };
    }

    // 3. Save the FraudAssessment record to the database
    await this.prisma.fraudAssessment.create({
      data: {
        platformUserId: context.platform_user_id,
        agreementId: params.agreementId || null,
        score: result.score,
        flag: result.flag,
        category: result.category,
        triggeredSignals: result.triggered_signals,
        contextSnapshot: context as any,
      },
    });

    // 4. Log the audit event for the developer dashboard
    const eventType = result.flag === 'RED' ? 'FRAUD_BLOCKED' : 'FRAUD_ASSESSED';
    this.developerLogService.log({
      developerId: params.developerId,
      eventType: eventType,
      externalUserId: context.external_user_id,
      agreementId: params.agreementId || undefined,
      score: result.score,
      flag: result.flag,
      payload: { context, result },
    });

    // 5. Return the result
    return result;
  }
}
