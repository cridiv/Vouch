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
   * Utility to capture and save developer profile data from GitHub/Supabase Auth into the DB.
   */
  async captureDeveloperProfile(
    supabaseUid: string,
    profileData: { email: string; name?: string; avatarUrl?: string; metadata?: any },
  ) {
    const existingDeveloper = await this.prisma.developer.findUnique({
      where: { supabaseUid },
    });

    if (existingDeveloper) {
      return this.prisma.developer.update({
        where: { supabaseUid },
        data: {
          email: profileData.email,
          name: profileData.name || existingDeveloper.name,
          avatarUrl: profileData.avatarUrl || existingDeveloper.avatarUrl,
          metadata: profileData.metadata ? profileData.metadata : existingDeveloper.metadata,
        },
      });
    }

    const existingEmail = await this.prisma.developer.findUnique({
      where: { email: profileData.email },
    });
    if (existingEmail) {
      throw new ConflictException('A developer with this email address already exists.');
    }

    return this.prisma.developer.create({
      data: {
        supabaseUid,
        email: profileData.email,
        name: profileData.name,
        avatarUrl: profileData.avatarUrl,
        metadata: profileData.metadata || {},
      },
    });
  }

  /**
   * Provisions a developer. Updates or creates their profile data and API keys.
   */
  async provision(
    email: string,
    supabaseUid: string,
    name?: string,
    avatarUrl?: string,
    metadata?: any,
  ) {
    const existingBefore = await this.prisma.developer.findUnique({
      where: { supabaseUid },
      include: { apiKeys: true },
    });

    // 1. Capture and save developer profile data
    const developerRecord = await this.captureDeveloperProfile(supabaseUid, {
      email,
      name,
      avatarUrl,
      metadata,
    });

    // 2. Return existing keys if present
    if (existingBefore && existingBefore.apiKeys.length > 0) {
      const apiKey = await this.generateApiKey(developerRecord.id, 'Harness Key');
      return {
        developer: developerRecord,
        apiKey,
      };
    }

    // 3. Otherwise generate first API key
    const apiKey = await this.generateApiKey(developerRecord.id);
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerRecord.id },
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

