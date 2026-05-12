import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SquadAuthHelper {
  constructor(private readonly configService: ConfigService) {}

  getHeaders() {
    return {
      Authorization: `Bearer ${this.configService.get<string>('SQUAD_API_KEY')}`,
      'Content-Type': 'application/json',
    };
  }
}
