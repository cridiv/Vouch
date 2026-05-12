import { Injectable } from '@nestjs/common';
import { BehaviourService } from './behaviour.service.js';
import { DeviceService } from './device.service.js';
import { IpAnalysisService } from './ip-analysis.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FraudContextDto } from '../dto/fraud-context.dto.js';

export interface BuildContextParams {
  transactionId: string;
  platformUserId: string;
  ipAddress: string;
  deviceFingerprint: string;
  transactionAmount: number;
  agreementId?: string;
  simulateVpn?: boolean;
  simulateImpossibleTravel?: boolean;
}

@Injectable()
export class ContextBuilderService {
  constructor(
    private readonly behaviourService: BehaviourService,
    private readonly deviceService: DeviceService,
    private readonly ipAnalysisService: IpAnalysisService,
    private readonly prisma: PrismaService,
  ) {}

  async build(params: BuildContextParams): Promise<FraudContextDto> {
    const {
      transactionId,
      platformUserId,
      ipAddress,
      deviceFingerprint,
      transactionAmount,
      agreementId,
      simulateVpn,
      simulateImpossibleTravel,
    } = params;

    // Step 1: fetch PlatformUser
    const platformUser = await this.prisma.platformUser.findUnique({
      where: { id: platformUserId },
    });
    if (!platformUser) {
      throw new Error(`PlatformUser ${platformUserId} not found`);
    }

    // Step 2: run IpAnalysisService.analyze(ipAddress)
    const ipData = await this.ipAnalysisService.analyze(ipAddress);

    // Step 3: run BehaviourService.analyze
    const behaviourData = await this.behaviourService.analyze(
      platformUserId,
      ipData.geolocation,
      transactionAmount,
    );

    // Step 4: run DeviceService.analyze
    const deviceData = await this.deviceService.analyze(deviceFingerprint, platformUserId);

    // Step 5: query squadSignal table
    let latestSquadSignal: any = null;
    if (agreementId) {
      latestSquadSignal = await this.prisma.squadSignal.findFirst({
        where: { agreementId },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Step 6: assemble the complete FraudContextDto
    const context: FraudContextDto = {
      transaction_id: transactionId,
      platform_user_id: platformUserId,
      external_user_id: platformUser.externalUserId,
      ip_address: ipAddress,
      ip_reputation_score: ipData.ip_reputation_score,
      is_vpn: ipData.is_vpn,
      is_proxy: ipData.is_proxy,
      geolocation: ipData.geolocation,
      onboarding_location: platformUser.onboardingLocation as any,
      location_distance_km: behaviourData.location_distance_km,
      impossible_travel: behaviourData.impossible_travel,
      device_fingerprint: deviceFingerprint,
      device_seen_before: deviceData.device_seen_before,
      device_matches_onboarding: deviceData.device_matches_onboarding,
      account_age_days: behaviourData.account_age_days,
      previous_transactions: behaviourData.previous_transactions,
      transaction_amount: transactionAmount,
      time_since_last_tx_hrs: behaviourData.time_since_last_tx_hrs ?? -1,
      identity_verified: platformUser.identityVerified,
      identity_match_score: platformUser.identityMatchScore ?? 0,
      liveness_passed: platformUser.livenessPassed,
      // Squad signals
      squad_payment_channel: latestSquadSignal?.paymentChannel ?? undefined,
      squad_card_bin: latestSquadSignal?.cardBin ?? undefined,
      squad_payer_name: latestSquadSignal?.payerName ?? undefined,
      squad_amount_matches_agreement: latestSquadSignal?.amountMatchesAgreement ?? undefined,
      squad_transaction_ref: latestSquadSignal?.transactionRef ?? undefined,
    };

    // Step 7: apply simulation overrides
    if (process.env.NODE_ENV === 'development') {
      if (simulateVpn) {
        context.is_vpn = true;
        context.ip_reputation_score = 12;
      }
      if (simulateImpossibleTravel) {
        context.impossible_travel = true;
        context.location_distance_km = 9200;
      }
    }

    return context;
  }
}
