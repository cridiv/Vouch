import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DeveloperService } from '../developer/developer.service.js';
import { DeveloperLogService } from '../common/services/developer-log.service.js';
import { Developer } from '@prisma/client';
import { IpAnalysisService } from '../fraud/context/ip-analysis.service.js';

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly developerService: DeveloperService,
    private readonly developerLogService: DeveloperLogService,
    private readonly ipAnalysisService: IpAnalysisService,
  ) {}

  /**
   * Verifies the identity of a platform user by matching their document image and selfie.
   * Resolves the platform user, processes image buffers into base64, stores results in the DB,
   * fires an audit log entry, and returns the verification details.
   */
  async verify(
    documentBuffer: Buffer,
    selfieBuffer: Buffer,
    externalUserId: string,
    developer: Developer,
    ipAddress: string,
    deviceFingerprint?: string,
  ) {
    // 1. Resolve or create the platform user under this developer
    const platformUser = await this.developerService.resolveOrCreatePlatformUser(
      externalUserId,
      developer.id,
    );

    // 2. Convert buffers to base64 strings
    const documentBase64 = documentBuffer.toString('base64');
    const selfieBase64 = selfieBuffer.toString('base64');

    // 3. STUB: return hardcoded result (TODO: REMOVE STUB — replace with real ML call)
    const result = {
      verified: true,
      match_score: 94.2,
      liveness_passed: true,
      document_type: 'drivers_license',
      rejection_reason: null as string | null,
    };

    // 4. Get IP location baseline
    const ipData = await this.ipAnalysisService.analyze(ipAddress);

    // 5. Store result on PlatformUser via prisma.platformUser.update()
    await this.prisma.platformUser.update({
      where: { id: platformUser.id },
      data: {
        identityVerified: result.verified,
        identityMatchScore: result.match_score,
        livenessPassed: result.liveness_passed,
        documentType: result.document_type,
        deviceFingerprintAtOnboarding: deviceFingerprint,
        onboardingLocation: {
          country: ipData.geolocation.country,
          city: ipData.geolocation.city,
          lat: ipData.geolocation.lat,
          lng: ipData.geolocation.lng,
        },
      },
    });

    // 5. Fire-and-forget audit log write (does not await)
    this.developerLogService.log({
      developerId: developer.id,
      eventType: result.verified ? 'IDENTITY_VERIFIED' : 'IDENTITY_FAILED',
      externalUserId: platformUser.externalUserId,
      score: Math.round(result.match_score),
      payload: {
        ...result,
        documentBase64Length: documentBase64.length,
        selfieBase64Length: selfieBase64.length,
      },
    });

    // 6. Return the result
    return result;
  }
}
