import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { DeveloperService } from '../developer.service.js';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly developerService: DeveloperService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('Missing API key in header x-api-key');
    }

    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const developer = await this.developerService.findByApiKeyHash(hash);

    if (!developer) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.developer = developer;
    return true;
  }
}
