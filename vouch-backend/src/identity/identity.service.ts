import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DeveloperService } from '../developer/developer.service.js';
import { DeveloperLogService } from '../common/services/developer-log.service.js';
import { Developer } from '@prisma/client';
import { IpAnalysisService } from '../fraud/context/ip-analysis.service.js';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly developerService: DeveloperService,
    private readonly developerLogService: DeveloperLogService,
    private readonly ipAnalysisService: IpAnalysisService,
    private readonly httpService: HttpService,
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

    // 3. Call ML Engine
    const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8080';
    const formData = new FormData();
    formData.append('platform_user_id', platformUser.id);
    formData.append('document_image', new Blob([new Uint8Array(documentBuffer)], { type: 'image/png' }), 'document.png');
    formData.append('selfie_image', new Blob([new Uint8Array(selfieBuffer)], { type: 'image/png' }), 'selfie.png');

    let result: {
      verified: boolean;
      match_score: number;
      liveness_passed: boolean;
      document_type: string;
      rejection_reason: string | null;
      face_extracted?: boolean;
      processing_time_ms?: number;
    };

    try {
      this.logger.log(`Calling ML Engine at ${mlUrl}/identity/verify for user ${platformUser.id}`);
      const response = await lastValueFrom(
        this.httpService.post(`${mlUrl}/identity/verify`, formData, { timeout: 30000 })
      );
      result = response.data;
    } catch (error: any) {
      this.logger.error(`ML Engine verification failed for user ${platformUser.id}:`, error?.response?.data || error.message);
      result = {
        verified: false,
        match_score: 0,
        liveness_passed: false,
        document_type: 'unknown',
        rejection_reason: 'ml_service_error',
      };
    }

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

