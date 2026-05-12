import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}
  async analyze(deviceFingerprint: string, platformUserId: string) {
    const user = await this.prisma.platformUser.findUnique({
      where: { id: platformUserId },
    });

    if (!user) {
      throw new Error(`Platform user ${platformUserId} not found`);
    }

    const device_matches_onboarding = user.deviceFingerprintAtOnboarding === deviceFingerprint;

    // Check if seen before in past fraud assessments
    // Since contextSnapshot is JSON, we'll fetch recent assessments and check in code, 
    // or just say if it matches onboarding, it's definitely seen before.
    let device_seen_before = device_matches_onboarding;

    if (!device_seen_before) {
      // Find any past assessment with this fingerprint
      // A raw query could work, but for simplicity we fetch the user's assessments
      const pastAssessments = await this.prisma.fraudAssessment.findMany({
        where: { platformUserId },
        select: { contextSnapshot: true },
      });

      for (const assessment of pastAssessments) {
        const snapshot = assessment.contextSnapshot as any;
        if (snapshot && snapshot.device_fingerprint === deviceFingerprint) {
          device_seen_before = true;
          break;
        }
      }
    }

    return {
      device_seen_before,
      device_matches_onboarding,
    };
  }
}
