import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class DeveloperService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a secure API key for a developer.
   * Stores the SHA-256 hash and a prefix for display, returning the raw key only once.
   */
  async generateApiKey(developerId: string, name = 'Default Key') {
    // Generate raw key: 'vouch_' + crypto.randomBytes(24).toString('hex')
    const rawKey = 'vouch_' + crypto.randomBytes(24).toString('hex');
    const keyPrefix = rawKey.slice(0, 16);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.create({
      data: {
        keyHash,
        keyPrefix,
        developerId,
        name,
      },
    });

    return {
      prefix: apiKey.keyPrefix,
      rawKey,
    };
  }

  /**
   * Provisions a developer. If the developer already exists (by supabaseUid),
   * returns the existing record along with their current API keys.
   * If new, creates a new Developer record, generates their first API key,
   * and returns both (with the raw key).
   */
  async provision(email: string, supabaseUid: string) {
    // 1. Check if developer already exists by supabaseUid
    const existingDeveloper = await this.prisma.developer.findUnique({
      where: { supabaseUid },
      include: { apiKeys: true },
    });

    if (existingDeveloper) {
      const apiKey = await this.generateApiKey(existingDeveloper.id, 'Harness Key');
      return {
        developer: existingDeveloper,
        apiKey,
      };
    }

    // 2. Prevent unique constraint violation on email if same email is used with different supabaseUid
    const existingEmail = await this.prisma.developer.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('A developer with this email address already exists.');
    }

    // 3. Create the Developer record
    const newDeveloper = await this.prisma.developer.create({
      data: {
        email,
        supabaseUid,
      },
    });

    // 4. Generate first API key
    const apiKey = await this.generateApiKey(newDeveloper.id);

    // 5. Retrieve developer with their API keys list
    const developer = await this.prisma.developer.findUnique({
      where: { id: newDeveloper.id },
      include: { apiKeys: true },
    });

    if (!developer) {
      throw new Error('Internal Server Error: Failed to retrieve provisioned developer.');
    }

    return {
      developer,
      apiKey,
    };
  }

  /**
   * Looks up an ApiKey by its hash, updates its last used timestamp,
   * and returns the associated Developer record.
   */
  async findByApiKeyHash(hash: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash: hash },
      include: { developer: true },
    });

    if (!apiKey) {
      return null;
    }

    // Update lastUsedAt on the key asynchronously/synchronously
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey.developer;
  }

  /**
   * Looks up a PlatformUser by externalUserId and developerId.
   * If not found, creates a new PlatformUser record.
   */
  async resolveOrCreatePlatformUser(externalUserId: string, developerId: string) {
    const existingUser = await this.prisma.platformUser.findUnique({
      where: {
        externalUserId_developerId: {
          externalUserId,
          developerId,
        },
      },
    });

    if (existingUser) {
      return existingUser;
    }

    return this.prisma.platformUser.create({
      data: {
        externalUserId,
        developerId,
      },
    });
  }

  /**
   * Retrieves a paginated list of DeveloperLog records, optionally filtered by eventType.
   */
  async getLogs(
    developerId: string,
    limit = 50,
    offset = 0,
    eventType?: string,
  ) {
    const where: any = { developerId };
    if (eventType) {
      where.eventType = eventType;
    }

    const [logs, total] = await Promise.all([
      this.prisma.developerLog.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.developerLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Retrieves a single DeveloperLog record.
   */
  async getLogById(id: string, developerId: string) {
    return this.prisma.developerLog.findFirst({
      where: {
        id,
        developerId,
      },
    });
  }

  /**
   * Retrieves dashboard statistics for a developer.
   */
  async getStats(developerId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalChecksToday,
      redBlocksToday,
      identitiesVerifiedTotal,
      activeAgreements,
      escrowSum,
    ] = await Promise.all([
      this.prisma.fraudAssessment.count({
        where: {
          platformUser: { developerId },
          createdAt: { gte: startOfToday },
        },
      }),
      this.prisma.fraudAssessment.count({
        where: {
          platformUser: { developerId },
          flag: 'RED',
          createdAt: { gte: startOfToday },
        },
      }),
      this.prisma.platformUser.count({
        where: {
          developerId,
          identityVerified: true,
        },
      }),
      this.prisma.agreement.count({
        where: {
          developerId,
          status: { in: ['FUNDED', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.agreement.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          developerId,
          status: { in: ['FUNDED', 'IN_PROGRESS'] },
        },
      }),
    ]);

    return {
      totalChecksToday,
      redBlocksToday,
      identitiesVerifiedTotal,
      activeAgreements,
      totalEscrowValue: escrowSum._sum.totalAmount || 0,
    };
  }
}

