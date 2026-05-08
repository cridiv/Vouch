import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LogEvent } from '@prisma/client';

@Injectable()
export class DeveloperLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs a developer event to the database in a fire-and-forget fashion.
   * Does not block execution and handles its own errors safely.
   */
  log(params: {
    developerId: string;
    eventType: LogEvent;
    externalUserId?: string;
    agreementId?: string;
    score?: number;
    flag?: string;
    payload: object;
  }): void {
    this.prisma.developerLog.create({
      data: {
        developerId: params.developerId,
        eventType: params.eventType,
        externalUserId: params.externalUserId,
        agreementId: params.agreementId,
        score: params.score,
        flag: params.flag,
        payload: params.payload as any, // Cast object to compatible Prisma JSON type
      },
    }).catch((err) => {
      // Prevent unhandled promise rejections in fire-and-forget call
      console.error('[DeveloperLogService] Failed to write developer log:', err);
    });
  }
}
