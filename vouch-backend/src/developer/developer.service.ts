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
      return {
        developer: existingDeveloper,
        apiKey: null, // Raw key is shown once only and not stored
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
}

